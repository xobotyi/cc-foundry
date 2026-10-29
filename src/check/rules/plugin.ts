import fs from 'node:fs/promises';
import path from 'node:path';
import type {Finding} from '../finding.ts';
import {isErrnoCode, isObject} from '../repo.ts';
import type {JsonObject, Plugin, Repo} from '../repo.ts';
import {lineOf} from '../text.ts';

/** The GitHub repository users add the marketplace from, as the root CLAUDE.md install commands name it. */
const MARKETPLACE_SOURCE = 'xobotyi/cc-foundry';

/** Each component key and the location Claude Code reads it from when the manifest names none. */
const DEFAULT_LOCATIONS: ReadonlyArray<{key: readonly string[]; location: string}> = [
	{key: ['skills'], location: 'skills'},
	{key: ['commands'], location: 'commands'},
	{key: ['agents'], location: 'agents'},
	{key: ['hooks'], location: 'hooks/hooks.json'},
	{key: ['mcpServers'], location: '.mcp.json'},
	{key: ['lspServers'], location: '.lsp.json'},
	{key: ['outputStyles'], location: 'output-styles'},
	{key: ['workflows'], location: 'workflows'},
	{key: ['experimental', 'themes'], location: 'themes'},
	{key: ['experimental', 'monitors'], location: 'monitors/monitors.json'},
];

const PATH_PLACEHOLDER = /\$\{CLAUDE_PLUGIN_(ROOT|DATA)\}/;

/** Each plugin carries an identical copy of the root LICENSE. */
export async function licenseCopy(repo: Repo): Promise<Finding[]> {
	const root = await fs.readFile(path.join(repo.root, 'LICENSE'), 'utf8');
	const findings = await Promise.all(
		repo.plugins.map(async (plugin): Promise<Finding[]> => {
			const file = `${plugin.path}/LICENSE`;
			const copy = await readTextOrNull(path.join(repo.root, file));
			if (copy === null) return [pluginError('license', file, 'the plugin has no LICENSE; copy the root LICENSE')];
			if (copy !== root) return [pluginError('license', file, 'LICENSE differs from the root LICENSE')];
			return [];
		}),
	);
	return findings.flat();
}

/** Each README gives the one-step install command. */
export async function readmeInstall(repo: Repo): Promise<Finding[]> {
	const findings = await Promise.all(
		repo.plugins.map(async (plugin): Promise<Finding[]> => {
			const file = `${plugin.path}/README.md`;
			const readme = await readTextOrNull(path.join(repo.root, file));
			if (readme === null) return [pluginError('readme-install', file, 'the plugin has no README.md')];
			const line = `/plugin install ${plugin.dir} --marketplace ${MARKETPLACE_SOURCE}`;
			if (readme.split('\n').some((l) => l.trim() === line)) return [];
			return [pluginError('readme-install', file, `the README has no line \`${line}\``)];
		}),
	);
	return findings.flat();
}

/** No manifest key points at the location Claude Code reads by default. */
export async function defaultLocations(repo: Repo): Promise<Finding[]> {
	const findings = await Promise.all(
		repo.plugins.map(async (plugin) => {
			const file = `${plugin.path}/.claude-plugin/plugin.json`;
			const text = await fs.readFile(path.join(repo.root, file), 'utf8');
			return keysNamingDefaults(plugin.manifest.raw).map(({key, location}) => {
				const message = `"${key.join('.')}" names its default location ./${location}`;
				return pluginError('default-paths', file, message, lineOf(text, `"${key.at(-1)}"`));
			});
		}),
	);
	return findings.flat();
}

/** The component keys of a manifest that name the location Claude Code reads without them. */
export function keysNamingDefaults(manifest: JsonObject): Array<{key: readonly string[]; location: string}> {
	return DEFAULT_LOCATIONS.filter(({key, location}) => {
		const value = valueAt(manifest, key);
		const paths = asList(value);
		return paths.length > 0 && paths.every((p) => typeof p === 'string' && normalize(p) === location);
	});
}

/** A hook command that names a plugin path placeholder runs in exec form: `command` plus `args`, with no shell. */
export async function hookExecForm(repo: Repo): Promise<Finding[]> {
	const findings = await Promise.all(repo.plugins.map(async (plugin) => hookExecFormIn(repo.root, plugin)));
	return findings.flat();
}

async function hookExecFormIn(root: string, plugin: Plugin): Promise<Finding[]> {
	const file = `${plugin.path}/hooks/hooks.json`;
	const source = await readTextOrNull(path.join(root, file));
	if (source === null) return [];
	let config: unknown;
	try {
		config = JSON.parse(source);
	} catch {
		// claude plugin validate reports a hooks file that is not JSON
		return [];
	}
	if (!isObject(config) || !isObject(config.hooks)) return [];
	return Object.values(config.hooks)
		.flatMap((groups) => asList(groups).filter((group) => isObject(group)))
		.flatMap((group) => asList(group.hooks).filter((handler) => isObject(handler)))
		.flatMap((handler): Finding[] => {
			if (handler.type !== 'command' || typeof handler.command !== 'string') return [];
			if (handler.args !== undefined || !PATH_PLACEHOLDER.test(handler.command)) return [];
			const message = `\`${handler.command}\` runs through a shell; split it into command and args`;
			const line = lineOf(source, JSON.stringify(handler.command));
			return [pluginError('hook-exec-form', file, message, line)];
		});
}

function valueAt(object: JsonObject, key: readonly string[]): unknown {
	let value: unknown = object;
	for (const part of key) {
		if (!isObject(value)) return undefined;
		value = value[part];
	}
	return value;
}

function normalize(location: string): string {
	return location.replace(/^\.\//, '').replace(/\/+$/, '');
}

/** A string as a one-item list, an array as itself, and anything else as an empty list. */
function asList(value: unknown): readonly unknown[] {
	if (typeof value === 'string') return [value];
	return Array.isArray(value) ? value : [];
}

async function readTextOrNull(file: string): Promise<string | null> {
	try {
		return await fs.readFile(file, 'utf8');
	} catch (error) {
		if (isErrnoCode(error, 'ENOENT')) return null;
		throw error;
	}
}

function pluginError(rule: string, file: string, message: string, line?: number): Finding {
	return line === undefined ? {rule, severity: 'error', file, message} : {rule, severity: 'error', file, line, message};
}
