import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {exec} from '../check/exec.ts';
import type {ExecOptions, ExecResult} from '../check/exec.ts';
import {git} from '../check/git.ts';
import {isErrnoCode, isObject} from '../check/repo.ts';
import type {JsonObject} from '../check/repo.ts';

/** The directory of a xerj checkout that holds the reference-corpus manifests. */
export const HUB_DIR = 'tools/xerj-code/hub';

const REPO_URL = /^https:\/\/github\.com\/xobotyi\/cc-foundry(?:\.git)?\/?$/i;
const FULL_SHA = /^[0-9a-f]{40}$/;
const NO_LICENCE = 'NONE-FOUND';

/** What `xerj corpus add --from` measured for a manifest at its pin. */
export type Build = {
	readonly files: number;
	readonly bytes: number;
	readonly licence: string;
	readonly clonedAt: string;
};

/** Measures a manifest at the pin it names. */
export type Builder = (manifest: JsonObject) => Promise<Build>;

export type RefreshOptions = {
	/** The cc-foundry checkout that holds the pinned commits. */
	readonly root: string;
	/** The xerj checkout whose manifests move. */
	readonly hub: string;
	/** The full SHA the manifests move to. */
	readonly sha: string;
	readonly plugins: readonly string[];
	/** The review date written into each moved manifest, as YYYY-MM-DD. */
	readonly date: string;
	readonly build: Builder;
};

/** One manifest moved to a new pin. */
export type Refreshed = {
	readonly corpus: string;
	readonly from: string;
	readonly to: string;
	readonly files: number;
	readonly bytes: number;
};

type Corpus = {
	readonly file: string;
	readonly name: string;
	readonly manifest: JsonObject;
	readonly repo: JsonObject;
	readonly sha: string;
	readonly paths: readonly string[];
	readonly endsWithNewline: boolean;
};

/**
 * Moves every cc-foundry manifest in the hub whose paths lie inside one of `plugins` to `sha`, rewriting its file and
 * byte counts, its detected licence, and its review. A manifest already at `sha` stays as it is. Rejects with every
 * file unchanged when a plugin is missing from `root`, when a build fails, or when the LICENSE at `sha` differs from
 * the one at a manifest's current pin, since a changed licence needs a human review.
 */
export async function refreshCorpora(options: RefreshOptions): Promise<Refreshed[]> {
	const {root, hub, sha, plugins, date, build} = options;
	if (!FULL_SHA.test(sha)) throw new Error(`the pin must be a full 40-character SHA, got "${sha}"`);
	await Promise.all(plugins.map(async (plugin) => assertPlugin(root, plugin)));

	const corpora = await readCorpora(path.join(hub, HUB_DIR));
	const moving = corpora.filter((c) => c.sha !== sha && plugins.some((plugin) => isInside(c, plugin)));
	if (moving.length === 0) return [];

	const licence = await licenceBlob(root, sha);
	const pinnedLicences = await Promise.all(moving.map(async (c) => licenceBlob(root, c.sha)));
	const changed = moving.filter((_, i) => pinnedLicences[i] !== licence);
	if (changed.length > 0) {
		const pins = changed.map((c) => `${c.name} at ${c.sha.slice(0, 12)}`).join(', ');
		throw new Error(`LICENSE at ${sha.slice(0, 12)} differs from the one at ${pins}; review the licence by hand`);
	}

	const log = await git(root, ['log', '-1', '--format=%s', sha]);
	const subject = log.trim();
	const copyright = copyrightLine(await git(root, ['show', `${sha}:LICENSE`]));
	const updates = await Promise.all(
		moving.map(async (corpus) => {
			const built = await build({...corpus.manifest, repos: [{...corpus.repo, sha}]});
			const review = reviewOf(corpus);
			const note =
				`First-party code by the commit author. The repository LICENSE at pin ${sha.slice(0, 12)} is ` +
				`byte-identical to the one reviewed at pin ${corpus.sha.slice(0, 12)} (${stringField(review, 'spdx', corpus)}, ` +
				`${copyright}), and each plugin directory carries an identical copy. The xerj detector reports ` +
				`${detectorReport(built.licence)}. Pinned commit ${sha.slice(0, 12)}: "${subject}".`;
			const repo = {
				...corpus.repo,
				licence: built.licence,
				sha,
				files: built.files,
				bytes: built.bytes,
				review: {...review, at: date, note},
			};
			const manifest = {...corpus.manifest, cloned_at: built.clonedAt, repos: [repo]};
			const refreshed: Refreshed = {
				corpus: corpus.name,
				from: corpus.sha,
				to: sha,
				files: built.files,
				bytes: built.bytes,
			};
			return {
				file: corpus.file,
				text: JSON.stringify(manifest, null, 2) + (corpus.endsWithNewline ? '\n' : ''),
				refreshed,
			};
		}),
	);
	await Promise.all(updates.map(async ({file, text}) => fs.writeFile(file, text)));
	return updates.map((u) => u.refreshed).toSorted((a, b) => a.corpus.localeCompare(b.corpus));
}

/**
 * Measures a manifest with `xerj corpus add --from` in a throwaway XERJ_CODE_HOME. Rejects with an install hint when
 * `xerj` is not on PATH, and with xerj's output when it fails.
 */
export async function buildWithXerj(manifest: JsonObject): Promise<Build> {
	const corpus = manifest.corpus;
	if (typeof corpus !== 'string') throw new TypeError('the manifest has no "corpus" name');
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xerj-hub-refresh-'));
	try {
		const seed = path.join(dir, 'corpus.json');
		const home = path.join(dir, 'home');
		await fs.writeFile(seed, JSON.stringify(manifest));
		const result = await xerj(['corpus', 'add', '--from', seed], {
			cwd: dir,
			env: {XERJ_CODE_HOME: home, XERJ_DISABLE_FEEDBACK: 'true'},
		});
		if (result.code !== 0) {
			const output = (result.stderr.trim() || result.stdout.trim()).slice(-2000);
			throw new Error(`xerj corpus add for ${corpus} exited with ${String(result.code)}: ${output}`);
		}
		const built: unknown = JSON.parse(await fs.readFile(path.join(home, 'corpora', corpus, 'corpus.json'), 'utf8'));
		return parseBuild(built, corpus);
	} finally {
		await fs.rm(dir, {recursive: true, force: true});
	}
}

async function xerj(args: readonly string[], options: ExecOptions): Promise<ExecResult> {
	try {
		return await exec('xerj', args, options);
	} catch (error) {
		if (isErrnoCode(error, 'ENOENT')) {
			throw new Error('xerj is not on PATH; install it with `curl -fsSL https://xerj.org/get | sh`', {cause: error});
		}
		throw error;
	}
}

function parseBuild(value: unknown, corpus: string): Build {
	const repos: unknown = isObject(value) ? value.repos : undefined;
	const repo: unknown = Array.isArray(repos) ? repos[0] : undefined;
	if (!isObject(value) || typeof value.cloned_at !== 'string' || !isObject(repo)) {
		throw new TypeError(`xerj wrote no readable manifest for ${corpus}`);
	}
	const {files, bytes, licence} = repo;
	if (typeof files !== 'number' || typeof bytes !== 'number' || typeof licence !== 'string') {
		throw new TypeError(`xerj's manifest for ${corpus} lacks files, bytes, or licence`);
	}
	return {files, bytes, licence, clonedAt: value.cloned_at};
}

async function assertPlugin(root: string, plugin: string): Promise<void> {
	const stat = await fs.stat(path.join(root, 'plugins', plugin)).catch(() => null);
	if (stat?.isDirectory() !== true) throw new Error(`no plugin "${plugin}" in ${path.join(root, 'plugins')}`);
}

/** The cc-foundry manifests in the hub directory; manifests of other repositories are skipped. */
async function readCorpora(dir: string): Promise<Corpus[]> {
	const entries = await fs.readdir(dir);
	const names = entries.filter((name) => name.endsWith('.json')).toSorted();
	const corpora = await Promise.all(names.map(async (name) => readCorpus(path.join(dir, name))));
	return corpora.filter((c) => c !== null);
}

async function readCorpus(file: string): Promise<Corpus | null> {
	const text = await fs.readFile(file, 'utf8');
	const manifest: unknown = JSON.parse(text);
	if (!isObject(manifest) || !Array.isArray(manifest.repos) || manifest.repos.length !== 1) return null;
	const repo: unknown = manifest.repos[0];
	if (!isObject(repo) || typeof repo.url !== 'string' || !REPO_URL.test(repo.url)) return null;
	const {sha, paths} = repo;
	if (typeof sha !== 'string' || !FULL_SHA.test(sha)) throw new TypeError(`${file}: repos[0].sha is not a full SHA`);
	const name = typeof manifest.corpus === 'string' ? manifest.corpus : path.basename(file, '.json');
	const pathList = Array.isArray(paths) ? paths.filter((p) => typeof p === 'string') : [];
	return {file, name, manifest, repo, sha, paths: pathList, endsWithNewline: text.endsWith('\n')};
}

function isInside(corpus: Corpus, plugin: string): boolean {
	const dir = `plugins/${plugin}`;
	return corpus.paths.length > 0 && corpus.paths.every((p) => p === dir || p.startsWith(`${dir}/`));
}

async function licenceBlob(root: string, sha: string): Promise<string> {
	const blob = await git(root, ['rev-parse', `${sha}:LICENSE`]);
	return blob.trim();
}

function copyrightLine(licence: string): string {
	const line = /^Copyright .+$/m.exec(licence)?.[0];
	if (line === undefined) throw new Error('the LICENSE at the new pin has no Copyright line');
	return line;
}

function reviewOf(corpus: Corpus): JsonObject {
	const {review} = corpus.repo;
	if (!isObject(review)) throw new TypeError(`${corpus.file}: repos[0] has no review block`);
	return review;
}

function stringField(object: JsonObject, key: string, corpus: Corpus): string {
	const value = object[key];
	if (typeof value !== 'string') throw new TypeError(`${corpus.file}: review.${key} is not a string`);
	return value;
}

function detectorReport(licence: string): string {
	return licence === NO_LICENCE ? `${NO_LICENCE} because no licence file sits inside the harvested paths` : licence;
}
