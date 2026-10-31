import type {EngineInterface, On} from 'claude-code';

type SessionState = {
	isInteractive: boolean;
	isRollCallScheduled: boolean;
};

/**
 * Registers the roll call: in an interactive session where a plugin the settings enable is missing, it runs
 * `/reload-plugins`. A plugin is missing when it comes from a known marketplace and has no install record for the user
 * or for this project, so Claude Code skipped it at startup.
 *
 * At session start the reload holds the first prompt until it completes. After `/clear`, a resume, or a compaction of
 * the main conversation, the reload runs once that transition finishes, and transitions that come before it share it.
 *
 * @param on the engine's registrar
 */
export function register(on: On): void {
	const session: SessionState = {isInteractive: false, isRollCallScheduled: false};

	on('session.start', async ($, e, next) => {
		session.isInteractive = e.isInteractive;
		if (e.isInteractive) await rollCall($, 'skipped at startup');

		return next(e);
	});

	on('session.end', async ($, e, next) => {
		if (e.reason === 'clear') scheduleRollCall($, session, 'after /clear');
		if (e.reason === 'resume') scheduleRollCall($, session, 'after a resume');

		return next(e);
	});

	on('session.compact', async ($, e, next) => {
		const compaction = await next(e);
		if (e.agentId === undefined && e.trigger !== 'precompute' && compaction.skip === undefined) {
			scheduleRollCall($, session, 'after compaction');
		}

		return compaction;
	});
}

function scheduleRollCall($: EngineInterface, session: SessionState, occasion: string): void {
	if (!session.isInteractive || session.isRollCallScheduled) return;

	session.isRollCallScheduled = true;
	// constraint: Claude Code refuses `$.command.run` from a hook that the turn or a command waits on; a timer runs it after
	$.clock.after(0, () => {
		session.isRollCallScheduled = false;
		void rollCall($, occasion);
	});
}

async function rollCall($: EngineInterface, occasion: string): Promise<void> {
	await reloadMissing($, occasion).catch((err: unknown) => $.ui.log(`roll call failed: ${String(err)}`));
}

async function reloadMissing($: EngineInterface, occasion: string): Promise<void> {
	const missing = await missingPluginsOf($);
	if (missing.length === 0) return;

	await $.command.run({command: 'reload-plugins'});
	$.ui.log(`reloaded plugins ${occasion}: ${missing.join(', ')}`);
}

async function missingPluginsOf($: EngineInterface): Promise<string[]> {
	const enabled = await marketplacePluginsOf($);
	if (enabled.length === 0) return [];

	// constraint: installed_plugins.json is Claude Code's internal plugin state, and its shape is undocumented
	const [recordsFile, root] = await Promise.all([
		readJson($, `${await pluginsDirOf($)}/installed_plugins.json`),
		$.session.root(),
	]);
	const recorded = recordedIdsOf(recordsFile, root);

	return enabled.filter((id) => !recorded.has(id));
}

async function marketplacePluginsOf($: EngineInterface): Promise<string[]> {
	const settings = await $.settings.read();
	const enabled = enabledIdsOf(settings.enabledPlugins);
	if (enabled.length === 0) return [];

	// constraint: known_marketplaces.json is Claude Code's internal plugin state, and its shape is undocumented
	const marketplacesFile = await readJson($, `${await pluginsDirOf($)}/known_marketplaces.json`);
	const marketplaces = Object.keys(objectOf('known_marketplaces.json', marketplacesFile));

	return enabled.filter((id) => marketplaces.includes(id.slice(id.lastIndexOf('@') + 1)));
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
