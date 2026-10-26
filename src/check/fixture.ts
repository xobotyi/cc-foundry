import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {git} from './git.ts';
import {MARKETPLACE_FILE} from './repo.ts';

export interface EntryJson {
	name: string;
	source: string;
	[key: string]: unknown;
}

export interface MarketplaceJson {
	name: string;
	owner: {name: string};
	plugins: EntryJson[];
	renames?: Record<string, string | null>;
	[key: string]: unknown;
}

export interface ManifestJson {
	name: string;
	version: string;
	dependencies?: (string | {name: string; marketplace?: string})[];
	[key: string]: unknown;
}

export interface FixturePlugin {
	name: string;
	skills?: string[];
}

/** A throwaway repository in a temp directory that passes every rule until a test breaks one thing. */
export interface Fixture extends AsyncDisposable {
	root: string;
	write(rel: string, content: string): Promise<void>;
	read(rel: string): Promise<string>;
	remove(rel: string): Promise<void>;
	editMarketplace(edit: (m: MarketplaceJson) => void): Promise<void>;
	editManifest(plugin: string, edit: (m: ManifestJson) => void): Promise<void>;
	/** Stages every change and commits it. */
	commit(message: string): Promise<void>;
	git(...args: string[]): Promise<string>;
}

const LICENSE = 'MIT License\n\nCopyright (c) fixture\n';

const DEFAULT_PLUGINS: readonly FixturePlugin[] = [
	{name: 'alpha', skills: ['one']},
	{name: 'beta', skills: ['two']},
];

/** Builds the repository, commits it, and returns helpers that edit it. */
export async function createFixture(plugins: readonly FixturePlugin[] = DEFAULT_PLUGINS): Promise<Fixture> {
	// constraint: the validator and git report real paths, and macOS reaches the temp directory through a symlink
	const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'check-fixture-')));
	const write = async (rel: string, content: string): Promise<void> => {
		const file = path.join(root, rel);
		await fs.mkdir(path.dirname(file), {recursive: true});
		await fs.writeFile(file, content);
	};
	const read = (rel: string): Promise<string> => fs.readFile(path.join(root, rel), 'utf-8');
	const editJson = async <T>(rel: string, edit: (json: T) => void): Promise<void> => {
		// SAFETY: the fixture wrote this file from a T, and tests edit it only through these helpers
		const json = JSON.parse(await read(rel)) as T;
		edit(json);
		await write(rel, JSON.stringify(json, null, 2) + '\n');
	};
	const runGit = (...args: string[]): Promise<string> => git(root, args);

	const marketplace: MarketplaceJson = {
		name: 'foundry',
		owner: {name: 'fixture'},
		metadata: {description: 'A fixture marketplace'},
		plugins: plugins.map((p) => ({name: p.name, source: `./plugins/${p.name}`, category: 'development', tags: []})),
	};
	await write(MARKETPLACE_FILE, JSON.stringify(marketplace, null, 2) + '\n');
	await write('LICENSE', LICENSE);
	await write('package.json', JSON.stringify({name: 'fixture', private: true}) + '\n');
	await write('CLAUDE.md', `# fixture\n\n## Plugins\n\n${plugins.map((p) => `- \`plugins/${p.name}/\``).join('\n')}\n`);
	await write('README.md', `# fixture\n\n${plugins.map((p) => `### ${p.name}\n`).join('\n')}`);
	for (const plugin of plugins) {
		await writePlugin(write, plugin);
	}

	await runGit('init', '--quiet', '--initial-branch=master');
	await runGit('config', 'user.email', 'fixture@example.com');
	await runGit('config', 'user.name', 'fixture');
	await runGit('config', 'commit.gpgsign', 'false');
	await runGit('config', 'tag.gpgsign', 'false');
	const commit = async (message: string): Promise<void> => {
		await runGit('add', '--all');
		await runGit('commit', '--quiet', '--allow-empty', '--message', message);
	};
	await commit('initial');

	return {
		root,
		write,
		read,
		remove: (rel) => fs.rm(path.join(root, rel), {recursive: true, force: true}),
		editMarketplace: (edit) => editJson(MARKETPLACE_FILE, edit),
		editManifest: (plugin, edit) => editJson(`plugins/${plugin}/.claude-plugin/plugin.json`, edit),
		commit,
		git: runGit,
		[Symbol.asyncDispose]: () => fs.rm(root, {recursive: true, force: true}),
	};
}

async function writePlugin(write: (rel: string, content: string) => Promise<void>, plugin: FixturePlugin) {
	const dir = `plugins/${plugin.name}`;
	const manifest: ManifestJson = {
		name: plugin.name,
		version: '1.0.0',
		description: `The ${plugin.name} plugin`,
		author: {name: 'fixture'},
	};
	await write(`${dir}/.claude-plugin/plugin.json`, JSON.stringify(manifest, null, 2) + '\n');
	await write(`${dir}/LICENSE`, LICENSE);
	await write(
		`${dir}/README.md`,
		[
			`# ${plugin.name}`,
			'',
			'```',
			`/plugin install ${plugin.name} --marketplace xobotyi/cc-foundry`,
			'```',
			'',
			'```',
			'/plugin marketplace add xobotyi/cc-foundry',
			`/plugin install ${plugin.name}@foundry`,
			'```',
			'',
		].join('\n'),
	);
	for (const skill of plugin.skills ?? []) {
		await write(
			`${dir}/skills/${skill}/SKILL.md`,
			`---\nname: ${skill}\ndescription: The ${skill} skill. Invoke when testing.\n---\n\nThe ${skill} skill.\n`,
		);
	}
}
