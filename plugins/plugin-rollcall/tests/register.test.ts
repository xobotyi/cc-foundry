import type {On, SessionStartInput} from 'claude-code';
import {describe, expect, mock, test} from 'claude-code/testing';

const ROOT = '/repo';

const INTERACTIVE: SessionStartInput = {surface: 'terminal', isInteractive: true, cwd: ROOT};
const HEADLESS: SessionStartInput = {surface: null, isInteractive: false, cwd: ROOT};

type Machine = {
	readonly enabledPlugins: Readonly<Record<string, boolean>>;
	readonly knownMarketplaces?: string;
	readonly installedPlugins?: string;
	readonly reload?: Promise<void>;
	readonly configDir?: string;
};

type Observed = {
	readonly commands: string[];
	readonly lines: string[];
};

function machineOf(on: On, machine: Machine): Observed {
	const commands: string[] = [];
	const lines: string[] = [];
	const pluginsDir = `${machine.configDir ?? '/home/u/.claude'}/plugins`;
	const files = new Map<string, string>();
	if (machine.knownMarketplaces !== undefined) {
		files.set(`${pluginsDir}/known_marketplaces.json`, machine.knownMarketplaces);
	}
	if (machine.installedPlugins !== undefined) {
		files.set(`${pluginsDir}/installed_plugins.json`, machine.installedPlugins);
	}

	const env: Record<string, string> = {HOME: '/home/u'};
	if (machine.configDir !== undefined) env.CLAUDE_CONFIG_DIR = machine.configDir;

	mock.env(on, env);
	on('session.start', ($, e) => ({cwd: e.cwd}));
	on('session.root', () => ({value: ROOT}));
	on('settings.read', () => ({value: {enabledPlugins: machine.enabledPlugins}}));
	on('fs.exists', ($, e) => ({value: files.has(e.path)}));
	on('fs.read', ($, e) => ({value: files.get(e.path) ?? ''}));
	on('command.run', async ($, e) => {
		commands.push(e.command);
		await machine.reload;

		return {text: 'Reloaded'};
	});
	on('ui.log', ($, e) => {
		lines.push(e.text);

		return {value: undefined};
	});

	return {commands, lines};
}

function recordsOf(plugins: Readonly<Record<string, readonly object[]>>): string {
	return JSON.stringify({version: 2, plugins});
}

const FOUNDRY = JSON.stringify({foundry: {source: {source: 'github', repo: 'xobotyi/cc-foundry'}}});

describe('register', () => {
	test('reloads when an enabled plugin has records only for other projects', async ($, on) => {
		const observed = machineOf(on, {
			enabledPlugins: {'the-coder@foundry': true},
			knownMarketplaces: FOUNDRY,
			installedPlugins: recordsOf({'the-coder@foundry': [{scope: 'local', projectPath: '/elsewhere'}]}),
		});

		await $.session.start(INTERACTIVE);

		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.lines).toEqual(['reloaded plugins skipped at startup: the-coder@foundry']);
	});

	test('holds the session start until the reload completes', async ($, on) => {
		let release = (): void => {};
		const reload = new Promise<void>((resolve) => {
			release = resolve;
		});
		const observed = machineOf(on, {
			enabledPlugins: {'the-coder@foundry': true},
			knownMarketplaces: FOUNDRY,
			reload,
		});
		const clock = mock.clock(on);
		let isStarted = false;

		const started = $.session.start(INTERACTIVE).then(() => {
			isStarted = true;
		});
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
		expect(isStarted).toBe(false);

		release();
		await started;

		expect(isStarted).toBe(true);
	});

	test('reads the plugin state under CLAUDE_CONFIG_DIR when it is set', async ($, on) => {
		const observed = machineOf(on, {
			enabledPlugins: {'the-coder@foundry': true},
			knownMarketplaces: FOUNDRY,
			installedPlugins: recordsOf({'the-coder@foundry': [{scope: 'local', projectPath: '/elsewhere'}]}),
			configDir: '/work/claude',
		});

		await $.session.start(INTERACTIVE);

		expect(observed.commands).toEqual(['reload-plugins']);
	});

	test('reloads on a machine with no install records yet', async ($, on) => {
		const observed = machineOf(on, {enabledPlugins: {'the-coder@foundry': true}, knownMarketplaces: FOUNDRY});

		await $.session.start(INTERACTIVE);

		expect(observed.commands).toEqual(['reload-plugins']);
	});

	test('does not reload when each enabled plugin has a user record or one for this project', async ($, on) => {
		const observed = machineOf(on, {
			enabledPlugins: {'the-coder@foundry': true, 'git-commit@foundry': true},
			knownMarketplaces: FOUNDRY,
			installedPlugins: recordsOf({
				'the-coder@foundry': [{scope: 'user'}],
				'git-commit@foundry': [{scope: 'project', projectPath: ROOT}],
			}),
		});

		await $.session.start(INTERACTIVE);

		expect(observed.commands).toEqual([]);
		expect(observed.lines).toEqual([]);
	});

	test('ignores disabled plugins and plugins outside a known marketplace', async ($, on) => {
		const observed = machineOf(on, {
			enabledPlugins: {'the-coder@foundry': false, 'telemetry@builtin': true},
			knownMarketplaces: FOUNDRY,
			installedPlugins: recordsOf({}),
		});

		await $.session.start(INTERACTIVE);

		expect(observed.commands).toEqual([]);
	});

	test('does nothing in a non-interactive session', async ($, on) => {
		const observed = machineOf(on, {enabledPlugins: {'the-coder@foundry': true}, knownMarketplaces: FOUNDRY});

		await $.session.start(HEADLESS);

		expect(observed.commands).toEqual([]);
		expect(observed.lines).toEqual([]);
	});

	test('reports install records it cannot read, and does not reload', async ($, on) => {
		const observed = machineOf(on, {
			enabledPlugins: {'the-coder@foundry': true},
			knownMarketplaces: FOUNDRY,
			installedPlugins: recordsOf({'the-coder@foundry': [{projectPath: ROOT}]}),
		});

		await $.session.start(INTERACTIVE);

		expect(observed.commands).toEqual([]);
		expect(observed.lines).toEqual([
			'roll call failed: Error: installed_plugins.json: a the-coder@foundry record has no scope',
		]);
	});
});
