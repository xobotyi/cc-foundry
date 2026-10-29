import {readdir, readFile, stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {exists, readJson} from './files.mts';
import {isObject, type Json} from './json.mts';
import {TEXT_LIMIT, truncate} from './text.mts';

const MEMORY_INDEX = 'MEMORY.md';
const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;
const MANAGED_SETTINGS_BY_PLATFORM: Readonly<Record<string, string>> = {
	darwin: '/Library/Application Support/ClaudeCode/managed-settings.json',
	win32: 'C:\\Program Files\\ClaudeCode\\managed-settings.json',
};
const MANAGED_SETTINGS = MANAGED_SETTINGS_BY_PLATFORM[process.platform] ?? '/etc/claude-code/managed-settings.json';

/** Where auto memory is looked up: the config directory, the transcript directory, and the environment switch. */
export type MemoryLookup = {
	readonly configDir: string;
	readonly projectsDir: string;
	/** CLAUDE_CODE_DISABLE_AUTO_MEMORY: `1` turns auto memory off, `0` overrides the settings. */
	readonly disableAutoMemory: string | undefined;
};

/** One auto memory written in the window. */
export type MemoryRecord = {
	readonly id: string;
	readonly project: string;
	readonly at: string;
	readonly signal: 'memory';
	readonly type: string | undefined;
	readonly file: string;
	readonly text: string;
};

async function setting(project: string, configDir: string, key: string): Promise<Json | undefined> {
	const layers = [
		MANAGED_SETTINGS,
		path.join(project, '.claude', 'settings.local.json'),
		path.join(project, '.claude', 'settings.json'),
		path.join(configDir, 'settings.json'),
	];
	const values = await Promise.all(
		layers.map(async (file) => {
			const settings = await readJson(file);
			return isObject(settings) ? settings[key] : undefined;
		}),
	);
	return values.find((value) => value !== undefined);
}

/** Returns the auto-memory directory of a repository, or undefined when auto memory is off or the directory is absent. */
export async function memoryDir(
	project: string,
	{configDir, projectsDir, disableAutoMemory}: MemoryLookup,
): Promise<string | undefined> {
	if (disableAutoMemory === '1') {
		return undefined;
	}

	if (disableAutoMemory !== '0' && (await setting(project, configDir, 'autoMemoryEnabled')) === false) {
		return undefined;
	}

	const custom = await setting(project, configDir, 'autoMemoryDirectory');
	if (typeof custom === 'string') {
		return custom.startsWith('~/') ? path.join(homedir(), custom.slice(2)) : custom;
	}

	const dir = path.join(projectsDir, project.replaceAll(/[^a-zA-Z0-9]/g, '-'), 'memory');
	return (await exists(dir)) ? dir : undefined;
}

/** Reads a frontmatter value, folding a block scalar or a continued line into one line and dropping quotes. */
export function frontmatterValue(head: string, key: string): string | undefined {
	const match = new RegExp(String.raw`^${key}:[ \t]*(.*)((?:\n[ \t]+.*)*)`, 'm').exec(head);
	if (match === null) {
		return undefined;
	}

	const [, first = '', rest = ''] = match;
	const folded = /^[>|][-+]?$/.test(first.trim()) ? rest : `${first}${rest}`;
	return folded
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
		.join(' ')
		.replace(/^"(.*)"$/, '$1');
}

/** Reads the memories of a memory directory written since `since`, oldest first, the index excluded. */
export async function memoryRecords(project: string, dir: string, since: number): Promise<MemoryRecord[]> {
	const listed = await readdir(dir);
	const names = listed.filter((name) => name.endsWith('.md') && name !== MEMORY_INDEX);
	const records = await Promise.all(
		names.map(async (name): Promise<MemoryRecord | undefined> => {
			const file = path.join(dir, name);
			const {mtimeMs} = await stat(file);
			if (mtimeMs < since) {
				return undefined;
			}

			const text = await readFile(file, 'utf8');
			const frontmatter = FRONTMATTER.exec(text);
			const head = frontmatter?.[1] ?? '';
			const description = frontmatterValue(head, 'description');
			const body = (frontmatter === null ? text : text.slice(frontmatter[0].length)).trim();
			return {
				id: `memory:${file}`,
				project,
				at: new Date(mtimeMs).toISOString(),
				signal: 'memory',
				type: /^\s*type:\s*(\S+)/m.exec(head)?.[1],
				file,
				text: truncate(
					[description, body].filter((part) => part !== undefined && part !== '').join('\n\n'),
					TEXT_LIMIT,
				),
			};
		}),
	);
	return records.filter((record) => record !== undefined).toSorted((a, b) => a.at.localeCompare(b.at));
}
