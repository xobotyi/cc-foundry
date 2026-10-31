import type {EngineInterface, On, PluginOptions} from 'claude-code';

type ScheduledRollCall = {
	readonly occasion: string;
	readonly unloaded: Set<string>;
};

type SessionState = {
	readonly isInstallMode: boolean;
	isInteractive: boolean;
	isInstalling: boolean;
	scheduled?: ScheduledRollCall;
};

const INSTALL_TIMEOUT_MS = 120_000;

// constraint: Claude Code names a skill it cannot find in the error text alone, as `Unknown skill: <plugin>:<skill>`
const UNKNOWN_PLUGIN_SKILL = /Unknown skill: ([^\s:<]+):/;

/**
 * Registers the roll call: in an interactive session where a plugin the settings enable is missing, it runs
 * `/reload-plugins`. A plugin is missing when it comes from a known marketplace and has no install record for the user
 * or for this project, so Claude Code skipped it at startup. A plugin is also missing when a call to one of its skills
 * fails as unknown while no command of it is listed, install records aside.
 *
 * At session start the reload holds the first prompt until it completes. After `/clear`, a resume, a compaction of the
 * main conversation, or a failed skill call, the reload runs once that transition or turn finishes, and the occasions
 * that come before it share it. A failed skill call tells the model that the mod tries to reload its plugin when the
 * turn ends, and its reload runs even when the install records cannot be read.
 *
 * With the `install` option on, a reload also starts `claude plugin install <id> --scope local` in the background for
 * each plugin without an install record, which writes the record and enables the plugin in the project's
 * `.claude/settings.local.json`, so later sessions load it at startup.
 *
 * @param on the engine's registrar
 * @param options the plugin's `userConfig` values: `install`, a boolean that defaults to false
 */
export function register(on: On, options: PluginOptions): void {
	const session: SessionState = {isInstallMode: options.install === true, isInteractive: false, isInstalling: false};

	on('session.start', async ($, e, next) => {
		session.isInteractive = e.isInteractive;
		if (e.isInteractive) await rollCall($, session, 'skipped at startup');

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

	on('tool.call', async ($, e, next) => {
		const call = await next(e);
		if (!session.isInteractive || e.tool !== 'Skill' || call.isError !== true) return call;

		const unloaded = await unloadedPluginOf($, call.text ?? '').catch((err: unknown) => {
			$.ui.log(`roll call failed: ${String(err)}`);

			return undefined;
		});
		if (unloaded === undefined) return call;

		scheduleRollCall($, session, `after ${e.skill} failed`, [unloaded]);
		const note =
			`plugin-rollcall: Claude Code lists no skill or command of the ${unloaded} plugin, ` +
			'so plugin-rollcall tries to reload it when this turn ends.';

		return {...call, context: [...(call.context ?? []), note]};
	});
}

function scheduleRollCall(
	$: EngineInterface,
	session: SessionState,
	occasion: string,
	unloaded: readonly string[] = [],
): void {
	if (!session.isInteractive) return;

	if (session.scheduled !== undefined) {
		for (const id of unloaded) session.scheduled.unloaded.add(id);
		return;
	}

	const scheduled: ScheduledRollCall = {occasion, unloaded: new Set(unloaded)};
	session.scheduled = scheduled;
	// constraint: Claude Code refuses `$.command.run` from a hook that the turn or a command waits on; a timer runs it after
	$.clock.after(0, () => {
		session.scheduled = undefined;
		void rollCall($, session, scheduled.occasion, [...scheduled.unloaded]);
	});
}

async function rollCall(
	$: EngineInterface,
	session: SessionState,
	occasion: string,
	unloaded: readonly string[] = [],
): Promise<void> {
	await reloadMissing($, session, occasion, unloaded).catch((err: unknown) =>
		$.ui.log(`roll call failed: ${String(err)}`),
	);
}

async function reloadMissing(
	$: EngineInterface,
	session: SessionState,
	occasion: string,
	unloaded: readonly string[],
): Promise<void> {
	const unrecorded = await missingPluginsOf($).catch((err: unknown) => {
		$.ui.log(`roll call failed: ${String(err)}`);

		return [];
	});
	const missing = [...new Set([...unloaded, ...unrecorded])];
	if (missing.length > 0) {
		await $.command.run({command: 'reload-plugins'});
		$.ui.log(`reloaded plugins ${occasion}: ${missing.join(', ')}`);
	}

	if (!session.isInstallMode || unrecorded.length === 0 || session.isInstalling) return;

	session.isInstalling = true;
	void installLocally($, unrecorded)
		.catch((err: unknown) => $.ui.log(`roll call failed: ${String(err)}`))
		.finally(() => {
			session.isInstalling = false;
		});
}

async function installLocally($: EngineInterface, ids: readonly string[]): Promise<void> {
	const root = await $.session.root();
	const installed: string[] = [];

	// constraint: each install rewrites installed_plugins.json and .claude/settings.local.json, so one runs at a time
	for (const id of ids) {
		const argv = ['claude', 'plugin', 'install', id, '--scope', 'local'];
		const run = await $.process.run(argv, {cwd: root, timeoutMs: INSTALL_TIMEOUT_MS});
		if (run.exitCode === 0) {
			installed.push(id);
		} else {
			const reason = (run.stderr.trim() || run.stdout.trim()).split('\n')[0];
			$.ui.log(`roll call failed: ${argv.join(' ')} exited ${run.exitCode}: ${reason}`);
		}
	}

	if (installed.length > 0) $.ui.log(`installed plugins at local scope: ${installed.join(', ')}`);
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

async function unloadedPluginOf($: EngineInterface, error: string): Promise<string | undefined> {
	const name = UNKNOWN_PLUGIN_SKILL.exec(error)?.[1];
	if (name === undefined) return undefined;

	const plugins = await marketplacePluginsOf($);
	const id = plugins.find((candidate) => candidate.slice(0, candidate.lastIndexOf('@')) === name);
	if (id === undefined) return undefined;

	const commands = await $.command.list();

	return commands.some((command) => command.plugin === name) ? undefined : id;
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
