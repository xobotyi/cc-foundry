import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {expect, test, vi} from 'vite-plus/test';
import {createFixture} from '../check/fixture.ts';
import type {Fixture} from '../check/fixture.ts';
import {isObject} from '../check/repo.ts';
import type {JsonObject} from '../check/repo.ts';
import {HUB_DIR, refreshCorpora} from './refresh.ts';
import type {Build, Builder} from './refresh.ts';

const BUILT: Build = {files: 7, bytes: 700, licence: 'NONE-FOUND', clonedAt: '2026-11-01T10:00:00Z'};
const DATE = '2026-11-01';

type Hub = {
	readonly root: string;
	write(name: string, manifest: JsonObject): Promise<void>;
	read(name: string): Promise<JsonObject>;
} & AsyncDisposable;

async function createHub(): Promise<Hub> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hub-fixture-'));
	const dir = path.join(root, HUB_DIR);
	await fs.mkdir(dir, {recursive: true});
	return {
		root,
		write: async (name, manifest) => fs.writeFile(path.join(dir, `${name}.json`), JSON.stringify(manifest, null, 2)),
		async read(name) {
			const text = await fs.readFile(path.join(dir, `${name}.json`), 'utf8');
			const manifest: unknown = JSON.parse(text);
			if (!isObject(manifest)) throw new TypeError(`${name}.json holds no JSON object`);
			return manifest;
		},
		[Symbol.asyncDispose]: async () => fs.rm(root, {recursive: true, force: true}),
	};
}

function manifestOf(
	corpus: string,
	sha: string,
	paths: readonly string[],
	url = 'https://github.com/xobotyi/cc-foundry.git',
) {
	return {
		corpus,
		cloned_at: '2026-10-31T11:48:19Z',
		own: true,
		repos: [
			{
				repo: 'cc-foundry',
				url,
				licence: 'NONE-FOUND',
				sha,
				files: 1,
				bytes: 100,
				paths,
				review: {spdx: 'MIT', use: 'adapt-with-attribution', by: '@xobotyi', at: '2026-10-31', note: 'reviewed'},
			},
		],
	};
}

async function head(fixture: Fixture): Promise<string> {
	const sha = await fixture.git('rev-parse', 'HEAD');
	return sha.trim();
}

/** Commits a change to the alpha plugin, so a manifest pinned before it can move to it. */
async function advance(fixture: Fixture): Promise<{from: string; to: string}> {
	const from = await head(fixture);
	await fixture.write('plugins/alpha/skills/one/SKILL.md', '---\nname: one\ndescription: Changed.\n---\n');
	await fixture.commit('[alpha] change one');
	return {from, to: await head(fixture)};
}

test('moves every corpus inside a released plugin and leaves the rest alone', async () => {
	await using fixture = await createFixture();
	const {from, to} = await advance(fixture);
	await using hub = await createHub();
	const beta = manifestOf('xobotyi--cc-foundry-beta', from, ['plugins/beta/skills']);
	const foreign = manifestOf('someone--alpha', from, ['plugins/alpha/skills'], 'https://github.com/someone/alpha');
	await hub.write('xobotyi--cc-foundry-alpha', manifestOf('xobotyi--cc-foundry-alpha', from, ['plugins/alpha/skills']));
	await hub.write(
		'xobotyi--cc-foundry-alpha-one',
		manifestOf('xobotyi--cc-foundry-alpha-one', from, ['plugins/alpha/skills/one']),
	);
	await hub.write('xobotyi--cc-foundry-beta', beta);
	await hub.write('someone--alpha', foreign);
	const build = vi.fn<Builder>().mockResolvedValue(BUILT);

	const refreshed = await refreshCorpora({
		root: fixture.root,
		hub: hub.root,
		sha: to,
		plugins: ['alpha'],
		date: DATE,
		build,
	});

	expect(refreshed.map((r) => r.corpus)).toStrictEqual(['xobotyi--cc-foundry-alpha', 'xobotyi--cc-foundry-alpha-one']);
	expect(build).toHaveBeenCalledTimes(2);
	expect(build).toHaveBeenNthCalledWith(1, expect.objectContaining({repos: [expect.objectContaining({sha: to})]}));
	expect(build).toHaveBeenNthCalledWith(2, expect.objectContaining({repos: [expect.objectContaining({sha: to})]}));
	expect(await hub.read('xobotyi--cc-foundry-alpha')).toStrictEqual({
		corpus: 'xobotyi--cc-foundry-alpha',
		cloned_at: BUILT.clonedAt,
		own: true,
		repos: [
			{
				repo: 'cc-foundry',
				url: 'https://github.com/xobotyi/cc-foundry.git',
				licence: 'NONE-FOUND',
				sha: to,
				files: 7,
				bytes: 700,
				paths: ['plugins/alpha/skills'],
				review: {
					spdx: 'MIT',
					use: 'adapt-with-attribution',
					by: '@xobotyi',
					at: DATE,
					note:
						`First-party code by the commit author. The repository LICENSE at pin ${to.slice(0, 12)} is ` +
						`byte-identical to the one reviewed at pin ${from.slice(0, 12)} (MIT, Copyright (c) fixture), and ` +
						'each plugin directory carries an identical copy. The xerj detector reports NONE-FOUND because no ' +
						`licence file sits inside the harvested paths. Pinned commit ${to.slice(0, 12)}: "[alpha] change one".`,
				},
			},
		],
	});
	expect(await hub.read('xobotyi--cc-foundry-beta')).toStrictEqual(beta);
	expect(await hub.read('someone--alpha')).toStrictEqual(foreign);
});

test('leaves a corpus already at the pin alone', async () => {
	await using fixture = await createFixture();
	const {to} = await advance(fixture);
	await using hub = await createHub();
	await hub.write('xobotyi--cc-foundry-alpha', manifestOf('xobotyi--cc-foundry-alpha', to, ['plugins/alpha/skills']));
	const build = vi.fn<Builder>().mockResolvedValue(BUILT);

	expect(
		await refreshCorpora({root: fixture.root, hub: hub.root, sha: to, plugins: ['alpha'], date: DATE, build}),
	).toStrictEqual([]);
	expect(build).not.toHaveBeenCalled();
});

test('writes no manifest when one build fails', async () => {
	await using fixture = await createFixture();
	const {from, to} = await advance(fixture);
	await using hub = await createHub();
	const alpha = manifestOf('xobotyi--cc-foundry-alpha', from, ['plugins/alpha/skills']);
	const alphaOne = manifestOf('xobotyi--cc-foundry-alpha-one', from, ['plugins/alpha/skills/one']);
	await hub.write('xobotyi--cc-foundry-alpha', alpha);
	await hub.write('xobotyi--cc-foundry-alpha-one', alphaOne);
	const build = vi.fn<Builder>().mockResolvedValueOnce(BUILT).mockRejectedValueOnce(new Error('xerj failed'));

	await expect(
		refreshCorpora({root: fixture.root, hub: hub.root, sha: to, plugins: ['alpha'], date: DATE, build}),
	).rejects.toThrow('xerj failed');
	expect(await hub.read('xobotyi--cc-foundry-alpha')).toStrictEqual(alpha);
	expect(await hub.read('xobotyi--cc-foundry-alpha-one')).toStrictEqual(alphaOne);
});

test('refuses to move a pin across a LICENSE change', async () => {
	await using fixture = await createFixture();
	const from = await head(fixture);
	await fixture.write('LICENSE', 'MIT License\n\nCopyright (c) someone else\n');
	await fixture.commit('relicense');
	const to = await head(fixture);
	await using hub = await createHub();
	const alpha = manifestOf('xobotyi--cc-foundry-alpha', from, ['plugins/alpha/skills']);
	await hub.write('xobotyi--cc-foundry-alpha', alpha);
	const build = vi.fn<Builder>().mockResolvedValue(BUILT);

	await expect(
		refreshCorpora({root: fixture.root, hub: hub.root, sha: to, plugins: ['alpha'], date: DATE, build}),
	).rejects.toThrow(
		`LICENSE at ${to.slice(0, 12)} differs from the one at xobotyi--cc-foundry-alpha at ${from.slice(0, 12)}`,
	);
	expect(build).not.toHaveBeenCalled();
	expect(await hub.read('xobotyi--cc-foundry-alpha')).toStrictEqual(alpha);
});

test('rejects a plugin the repository does not have', async () => {
	await using fixture = await createFixture();
	const {to} = await advance(fixture);
	await using hub = await createHub();
	const build = vi.fn<Builder>().mockResolvedValue(BUILT);

	await expect(
		refreshCorpora({root: fixture.root, hub: hub.root, sha: to, plugins: ['gamma'], date: DATE, build}),
	).rejects.toThrow('no plugin "gamma"');
});

test('rejects an abbreviated pin', async () => {
	await using fixture = await createFixture();
	const {to} = await advance(fixture);
	await using hub = await createHub();
	const build = vi.fn<Builder>().mockResolvedValue(BUILT);

	await expect(
		refreshCorpora({root: fixture.root, hub: hub.root, sha: to.slice(0, 12), plugins: ['alpha'], date: DATE, build}),
	).rejects.toThrow('full 40-character SHA');
});
