import type {EngineInterface, On} from 'claude-code';

/**
 * Registers a `session.start` hook that, in an interactive session where a plugin the settings enable is missing,
 * runs `/reload-plugins` and holds the first prompt until the reload completes. A plugin is missing when it comes from
 * a known marketplace and has no install record for the user or for this project, so Claude Code skipped it at startup.
 *
 * @param on the engine's registrar
 */
export function register(on: On): void {
	on('session.start', async ($, e, next) => {
		if (e.isInteractive) {
			await reloadMissing($).catch((err: unknown) => $.ui.log(`roll call failed: ${String(err)}`));
		}

		return next(e);
	});
}

async function reloadMissing($: EngineInterface): Promise<void> {
	const missing = await missingPluginsOf($);
	if (missing.length === 0) return;

	await $.command.run({command: 'reload-plugins'});
	$.ui.log(`reloaded plugins skipped at startup: ${missing.join(', ')}`);
}

async function missingPluginsOf($: EngineInterface): Promise<string[]> {
	const settings = await $.settings.read();
	const enabled = enabledIdsOf(settings.enabledPlugins);
	if (enabled.length === 0) return [];

	const pluginsDir = await pluginsDirOf($);
	// constraint: both files are Claude Code's internal plugin state, and their shape is undocumented
	const [marketplacesFile, recordsFile, root] = await Promise.all([
		readJson($, `${pluginsDir}/known_marketplaces.json`),
		readJson($, `${pluginsDir}/installed_plugins.json`),
		$.session.root(),
	]);
	const marketplaces = Object.keys(objectOf('known_marketplaces.json', marketplacesFile));
	const recorded = recordedIdsOf(recordsFile, root);

	return enabled.filter((id) => marketplaces.includes(id.slice(id.lastIndexOf('@') + 1)) && !recorded.has(id));
}

async function pluginsDirOf($: EngineInterface): Promise<string> {
	const configDir = await $.env.get('CLAUDE_CONFIG_DIR');
	if (configDir !== undefined) return `${configDir}/plugins`;

	const home = await $.env.get('HOME');
	if (home === undefined) throw new Error('neither CLAUDE_CONFIG_DIR nor HOME is set');

	return `${home}/.claude/plugins`;
}

async function readJson($: EngineInterface, path: string): Promise<unknown> {
	if (!(await $.fs.exists(path))) return {};

	return JSON.parse(await $.fs.read(path));
}

function enabledIdsOf(enabledPlugins: unknown): string[] {
	if (enabledPlugins === undefined) return [];

	return Object.entries(objectOf('enabledPlugins', enabledPlugins))
		.filter(([, isEnabled]) => isEnabled === true)
		.map(([id]) => id);
}

function recordedIdsOf(file: unknown, root: string): Set<string> {
	const {plugins = {}} = objectOf('installed_plugins.json', file);
	const recorded = new Set<string>();

	for (const [id, records] of Object.entries(objectOf('installed_plugins.json plugins', plugins))) {
		if (!Array.isArray(records)) throw new Error(`installed_plugins.json: ${id} holds no list of records`);

		for (const record of records) {
			const {scope, projectPath} = objectOf(`installed_plugins.json ${id} record`, record);
			if (typeof scope !== 'string') throw new Error(`installed_plugins.json: a ${id} record has no scope`);
			if (scope === 'user' || projectPath === root) recorded.add(id);
		}
	}

	return recorded;
}

function objectOf(what: string, value: unknown): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error(`${what} is not an object`);
	}

	// SAFETY: a non-null, non-array object, checked above
	return value as Record<string, unknown>;
}
