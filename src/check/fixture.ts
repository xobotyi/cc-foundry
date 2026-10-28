import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {git} from './git.ts';
import {MARKETPLACE_FILE} from './repo.ts';

export type EntryJson = {
	readonly name: string;
	readonly source: string;
	readonly [key: string]: unknown;
};

export type MarketplaceJson = {
	readonly name: string;
	readonly owner: {readonly name: string};
	readonly plugins: readonly EntryJson[];
	readonly renames?: Readonly<Record<string, string | null>>;
	readonly [key: string]: unknown;
};

export type ManifestJson = {
	readonly name: string;
	readonly version: string;
	readonly dependencies?: ReadonlyArray<string | {readonly name: string; readonly marketplace?: string}>;
	readonly [key: string]: unknown;
};

export type FixturePlugin = {
	readonly name: string;
	readonly skills?: readonly string[];
};

/** A throwaway repository in a temp directory that passes every rule until a test breaks one thing. */
export type Fixture = {
	readonly root: string;
	write(rel: string, content: string): Promise<void>;
	read(rel: string): Promise<string>;
	remove(rel: string): Promise<void>;
	/** Replaces the marketplace with what `edit` returns for the current one, and writes it. */
	editMarketplace(edit: (m: MarketplaceJson) => MarketplaceJson): Promise<void>;
	/** Replaces a plugin's manifest with what `edit` returns for the current one, and writes it. */
	editManifest(plugin: string, edit: (m: ManifestJson) => ManifestJson): Promise<void>;
	/** Stages every change and commits it. */
	commit(message: string): Promise<void>;
	git(...args: readonly string[]): Promise<string>;
} & AsyncDisposable;

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
	const writeJson = async (rel: string, json: unknown): Promise<void> =>
		write(rel, JSON.stringify(json, null, 2) + '\n');
	const runGit = async (...args: readonly string[]): Promise<string> => git(root, args);

	let marketplace: MarketplaceJson = {
		name: 'foundry',
		owner: {name: 'fixture'},
		metadata: {description: 'A fixture marketplace'},
		plugins: plugins.map((p) => ({name: p.name, source: `./plugins/${p.name}`, category: 'development', tags: []})),
	};
	const manifests = new Map(plugins.map((p) => [p.name, manifestOf(p)]));
	await Promise.all([
		writeJson(MARKETPLACE_FILE, marketplace),
		write('LICENSE', LICENSE),
		write('package.json', JSON.stringify({name: 'fixture', private: true}) + '\n'),
		write('CLAUDE.md', `# fixture\n\n## Plugins\n\n${plugins.map((p) => `- \`plugins/${p.name}/\``).join('\n')}\n`),
		write('README.md', `# fixture\n\n${plugins.map((p) => `### ${p.name}\n`).join('\n')}`),
		...plugins.map(async (p) => writePlugin(write, p)),
	]);

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
		read: async (rel) => fs.readFile(path.join(root, rel), 'utf8'),
		remove: async (rel) => fs.rm(path.join(root, rel), {recursive: true, force: true}),
		async editMarketplace(edit) {
			marketplace = edit(marketplace);
			await writeJson(MARKETPLACE_FILE, marketplace);
		},
		async editManifest(plugin, edit) {
			const manifest = manifests.get(plugin);
			if (manifest === undefined) throw new Error(`the fixture has no plugin "${plugin}"`);
			const edited = edit(manifest);
			manifests.set(plugin, edited);
			await writeJson(`plugins/${plugin}/.claude-plugin/plugin.json`, edited);
		},
		commit,
		git: runGit,
		[Symbol.asyncDispose]: async () => fs.rm(root, {recursive: true, force: true}),
	};
}

function manifestOf(plugin: FixturePlugin): ManifestJson {
	return {name: plugin.name, version: '1.0.0', description: `The ${plugin.name} plugin`, author: {name: 'fixture'}};
}

async function writePlugin(
	write: (rel: string, content: string) => Promise<void>,
	plugin: FixturePlugin,
): Promise<void> {
	const dir = `plugins/${plugin.name}`;
	const readme = [
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
	].join('\n');
	await Promise.all([
		write(`${dir}/.claude-plugin/plugin.json`, JSON.stringify(manifestOf(plugin), null, 2) + '\n'),
		write(`${dir}/LICENSE`, LICENSE),
		write(`${dir}/README.md`, readme),
		...(plugin.skills ?? []).map(async (skill) =>
			write(
				`${dir}/skills/${skill}/SKILL.md`,
				`---\nname: ${skill}\ndescription: The ${skill} skill. Invoke when testing.\n---\n\nThe ${skill} skill.\n`,
			),
		),
	]);
}
