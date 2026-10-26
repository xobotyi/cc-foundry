import fs from 'node:fs/promises';
import path from 'node:path';
import type {Finding} from '../finding.ts';
import {formatted} from '../format.ts';
import {git} from '../git.ts';
import {isErrnoCode, isObject} from '../repo.ts';
import type {JsonObject, Plugin, Repo} from '../repo.ts';
import {keysNamingDefaults} from './plugin.ts';
import type {RuleContext} from './rule.ts';

/** The ref a pre-push run compares against: what the remote already has. */
const PUSH_BASE = 'origin/master';
const MANIFEST = '.claude-plugin/plugin.json';
/** Manifest keys that change what a listing shows, not what an installed plugin does. */
const DISPLAY_KEYS: ReadonlySet<string> = new Set([
	'version',
	'description',
	'keywords',
	'displayName',
	'author',
	'homepage',
	'repository',
	'license',
]);
/** Paths under a plugin that a change can touch without changing what users install. */
const UNSHIPPED: readonly RegExp[] = [
	/^CLAUDE\.md$/,
	/^README\.md$/,
	/^LICENSE$/,
	/(^|\/)\.dev\//,
	/^tests\//,
	/\.test\./,
];

type Version = readonly [number, number, number];

/** A plugin's version is never below its latest `<plugin>-v<X.Y.Z>` release tag. */
export async function releaseVersion(repo: Repo): Promise<Finding[]> {
	const findings = await Promise.all(
		repo.plugins.map(async (plugin): Promise<Finding[]> => {
			const latest = await latestRelease(repo.root, plugin.dir);
			const version = parseVersion(plugin.manifest.version);
			if (latest === null || version === null || compare(version, latest.version) >= 0) return [];
			const message = `version ${plugin.manifest.version} is below the latest release ${latest.tag}`;
			return [{rule: 'release-version', severity: 'error', file: `${plugin.path}/${MANIFEST}`, message}];
		}),
	);
	return findings.flat();
}

/**
 * A change to what a plugin ships comes with a version bump; without one, installs never receive it.
 * A normal run compares against the latest release tag and warns; a pre-push run compares against what the
 * remote has and fails.
 */
export async function unbumpedChanges(repo: Repo, ctx: RuleContext): Promise<Finding[]> {
	const findings = await Promise.all(
		repo.plugins.map(async (plugin): Promise<Finding[]> => {
			const base = ctx.prePush ? PUSH_BASE : (await latestRelease(repo.root, plugin.dir))?.tag;
			if (base === undefined) return [];
			const before = await manifestAt(repo.root, base, plugin.path);
			if (before === null) return [];
			const after = ctx.prePush ? await manifestAt(repo.root, 'HEAD', plugin.path) : plugin.manifest.raw;
			if (after === null || before.version !== after.version) return [];
			const shipped = await shippedChanges(repo.root, plugin, base, ctx.prePush);
			if (behavior(before) !== behavior(after)) shipped.unshift(MANIFEST);
			if (shipped.length === 0) return [];
			const more = shipped.length - 3;
			const listed = more > 0 ? `${shipped.slice(0, 3).join(', ')}, and ${more} more` : shipped.join(', ');
			const range = ctx.prePush ? `${PUSH_BASE}..HEAD` : `since ${base}`;
			return [
				{
					rule: 'unbumped-change',
					severity: ctx.prePush ? 'error' : 'warning',
					file: `${plugin.path}/${MANIFEST}`,
					message: `${listed} changed ${range}, and the version is still ${String(after.version)}`,
				},
			];
		}),
	);
	return findings.flat();
}

async function shippedChanges(root: string, plugin: Plugin, base: string, prePush: boolean): Promise<string[]> {
	const range = prePush ? [base, 'HEAD'] : [base];
	const out = await git(root, ['diff', '--name-only', ...range, '--', plugin.path]);
	const candidates = out
		.split('\n')
		.filter(Boolean)
		.map((file) => file.slice(plugin.path.length + 1))
		.filter((file) => file !== MANIFEST && !UNSHIPPED.some((pattern) => pattern.test(file)));
	const reformatted = await Promise.all(
		candidates.map((file) => formattingOnly(root, `${plugin.path}/${file}`, base, prePush)),
	);
	return candidates.filter((_, i) => !reformatted[i]);
}

/** Whether the file differs from `base` only in what the formatter rewrites, which needs no release. */
async function formattingOnly(root: string, file: string, base: string, prePush: boolean): Promise<boolean> {
	const [before, after] = await Promise.all([
		contentAt(root, base, file),
		prePush ? contentAt(root, 'HEAD', file) : workingContent(root, file),
	]);
	if (before === null || after === null) return false;
	const [formattedBefore, formattedAfter] = await Promise.all([
		formatted(root, file, before),
		formatted(root, file, after),
	]);
	return formattedBefore !== null && formattedBefore === formattedAfter;
}

/** The file's content in the working tree, or null when the change deleted it. */
async function workingContent(root: string, file: string): Promise<string | null> {
	try {
		return await fs.readFile(path.join(root, file), 'utf-8');
	} catch (err) {
		if (isErrnoCode(err, 'ENOENT')) return null;
		throw err;
	}
}

/** The file's content at `ref`, or null when the ref has no such file. */
async function contentAt(root: string, ref: string, file: string): Promise<string | null> {
	try {
		return await git(root, ['show', `${ref}:${file}`]);
	} catch {
		// git show fails when the ref holds no such file, which is the case this function reports as null
		return null;
	}
}

async function latestRelease(root: string, dir: string): Promise<{tag: string; version: Version} | null> {
	const tags = (await git(root, ['tag', '--list', `${dir}-v*`])).split('\n').filter(Boolean);
	let latest: {tag: string; version: Version} | null = null;
	for (const tag of tags) {
		const version = parseVersion(tag.slice(`${dir}-v`.length));
		if (version !== null && (latest === null || compare(version, latest.version) > 0)) latest = {tag, version};
	}
	return latest;
}

/** The plugin's manifest at `ref`, or null when the ref has none: the plugin is new since that ref. */
async function manifestAt(root: string, ref: string, pluginPath: string): Promise<JsonObject | null> {
	let data: unknown;
	try {
		data = JSON.parse(await git(root, ['show', `${ref}:${pluginPath}/${MANIFEST}`]));
	} catch {
		// git show fails when the ref holds no such file, which is the case this function reports as null
		return null;
	}
	return isObject(data) ? data : null;
}

/**
 * The manifest as JSON without the display keys and the keys that name a default location, with object keys
 * sorted: two manifests whose installs behave the same give the same string.
 */
function behavior(manifest: JsonObject): string {
	const ignored = new Set([...DISPLAY_KEYS, ...keysNamingDefaults(manifest).map((d) => d.key.join('.'))]);
	return JSON.stringify(without(manifest, ignored, ''));
}

/** `value` with the dotted key paths in `ignored` left out and every object's keys sorted. */
function without(value: unknown, ignored: ReadonlySet<string>, at: string): unknown {
	if (Array.isArray(value)) return value.map((item) => without(item, ignored, at));
	if (!isObject(value)) return value;
	const pathOf = (key: string) => (at === '' ? key : `${at}.${key}`);
	return Object.fromEntries(
		Object.entries(value)
			.filter(([key]) => !ignored.has(pathOf(key)))
			.toSorted(([a], [b]) => a.localeCompare(b))
			.map(([key, item]) => [key, without(item, ignored, pathOf(key))]),
	);
}

function parseVersion(value: string | null): Version | null {
	const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value ?? '');
	if (match === null) return null;
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compare(a: Version, b: Version): number {
	return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
