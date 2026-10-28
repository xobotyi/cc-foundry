import {access, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, onTestFinished, test} from 'vite-plus/test';
import {configDir, sync} from './sync-statusline.mts';

const PLUGIN_ROOT = path.join(import.meta.dirname, '..');

async function tempDir(): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), 'statusline-sync-'));
	onTestFinished(async () => {
		await rm(dir, {recursive: true, force: true});
	});
	return dir;
}

const readJson = async (file: string): Promise<unknown> => JSON.parse(await readFile(file, 'utf8')) as unknown;
async function exists(file: string): Promise<boolean> {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}

describe('configDir', () => {
	test('takes CLAUDE_CONFIG_DIR when it is set', () => {
		expect(configDir('/etc/claude', '/home/dev')).toBe('/etc/claude');
	});

	test.each([undefined, ''])('falls back to ~/.claude for %j', (env) => {
		expect(configDir(env, '/home/dev')).toBe(path.join('/home/dev', '.claude'));
	});
});

describe('sync', () => {
	test('installs the renderer and points a fresh settings file at it', async () => {
		const dir = path.join(await tempDir(), 'nested', '.claude');

		sync(dir, PLUGIN_ROOT);

		expect(await readFile(path.join(dir, 'statusline.mts'), 'utf8')).toBe(
			await readFile(path.join(PLUGIN_ROOT, 'statusline.mts'), 'utf8'),
		);
		expect(await readJson(path.join(dir, 'settings.json'))).toStrictEqual({
			statusLine: {refreshInterval: 10, type: 'command', command: `node "${path.join(dir, 'statusline.mts')}"`},
		});
	});

	test('keeps every other key, the user refresh interval, and the padding', async () => {
		const dir = await tempDir();
		const settings = {theme: 'dark', statusLine: {type: 'command', command: 'other', refreshInterval: 3, padding: 2}};
		await writeFile(path.join(dir, 'settings.json'), JSON.stringify(settings));

		sync(dir, PLUGIN_ROOT);

		expect(await readJson(path.join(dir, 'settings.json'))).toStrictEqual({
			theme: 'dark',
			statusLine: {
				refreshInterval: 3,
				type: 'command',
				command: `node "${path.join(dir, 'statusline.mts')}"`,
				padding: 2,
			},
		});
	});

	test('leaves settings that already point at the renderer untouched', async () => {
		const dir = await tempDir();
		const command = `node "${path.join(dir, 'statusline.mts')}"`;
		const text = JSON.stringify({statusLine: {type: 'command', command, refreshInterval: 5}});
		await writeFile(path.join(dir, 'settings.json'), text);

		sync(dir, PLUGIN_ROOT);

		expect(await readFile(path.join(dir, 'settings.json'), 'utf8')).toBe(text);
	});

	test('adds the default refresh interval to settings that lack one', async () => {
		const dir = await tempDir();
		const command = `node "${path.join(dir, 'statusline.mts')}"`;
		await writeFile(path.join(dir, 'settings.json'), JSON.stringify({statusLine: {type: 'command', command}}));

		sync(dir, PLUGIN_ROOT);

		expect(await readJson(path.join(dir, 'settings.json'))).toStrictEqual({
			statusLine: {refreshInterval: 10, type: 'command', command},
		});
	});

	test('deletes the JavaScript renderer an earlier release installed', async () => {
		const dir = await tempDir();
		const legacy = path.join(dir, 'statusline.js');
		await writeFile(legacy, '// old renderer\n');
		await writeFile(
			path.join(dir, 'settings.json'),
			JSON.stringify({statusLine: {type: 'command', command: `node "${legacy}"`}}),
		);

		sync(dir, PLUGIN_ROOT);

		expect(await exists(legacy)).toBe(false);
	});

	test('keeps a statusline.js that the settings do not name', async () => {
		const dir = await tempDir();
		const mine = path.join(dir, 'statusline.js');
		await writeFile(mine, '// my own script\n');
		await writeFile(path.join(dir, 'settings.json'), JSON.stringify({statusLine: {type: 'command', command: 'other'}}));

		sync(dir, PLUGIN_ROOT);

		expect(await exists(mine)).toBe(true);
	});

	test.each([
		['malformed JSON', '{oops', SyntaxError],
		['a JSON array', '[]', TypeError],
	])('refuses settings holding %s', async (_name, text, error) => {
		const dir = await tempDir();
		await writeFile(path.join(dir, 'settings.json'), text);

		expect(() => {
			sync(dir, PLUGIN_ROOT);
		}).toThrow(error);
		expect(await readFile(path.join(dir, 'settings.json'), 'utf8')).toBe(text);
	});
});
