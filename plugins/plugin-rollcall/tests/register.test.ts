import type {
	On,
	SessionCompactInput,
	SessionCompactResult,
	SessionEndInput,
	SessionMessage,
	SessionStartInput,
} from 'claude-code';
import {describe, expect, mock, test} from 'claude-code/testing';

const ROOT = '/repo';

const INTERACTIVE: SessionStartInput = {surface: 'terminal', isInteractive: true, cwd: ROOT};
const HEADLESS: SessionStartInput = {surface: null, isInteractive: false, cwd: ROOT};

const CLEAR: SessionEndInput = {reason: 'clear', sessionId: 's1', resume: {id: 's1'}};
const RESUME: SessionEndInput = {reason: 'resume', sessionId: 's1', resume: {id: 's1'}};
const EXIT: SessionEndInput = {reason: 'prompt_input_exit', sessionId: 's1', resume: {id: 's1'}};

const SUMMARY: SessionMessage = {role: 'user', text: 'the summary', toolUses: []};

const AUTO_COMPACT: SessionCompactInput = {trigger: 'auto', messages: [SUMMARY]};

type Machine = {
	readonly enabledPlugins: Readonly<Record<string, boolean>>;
	readonly knownMarketplaces?: string;
	readonly installedPlugins?: string;
	readonly reload?: Promise<void>;
	readonly configDir?: string;
	readonly compaction?: SessionCompactResult;
	readonly listedPlugins?: readonly string[];
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
	on('session.end', ($, e) => ({sessionId: e.sessionId}));
	on('session.compact', () => machine.compaction ?? {messages: [SUMMARY]});
	on('session.root', () => ({value: ROOT}));
	on('command.list', () => ({
		value: (machine.listedPlugins ?? []).map((plugin) => ({
			name: `${plugin}:skill`,
			description: '',
			source: 'plugin' as const,
			plugin,
		})),
	}));
	on('tool.call', ($, e) => ({
		isError: true,
		result: undefined,
		text: `<tool_use_error>Unknown skill: ${e.tool === 'Skill' ? e.skill : e.tool}</tool_use_error>`,
	}));
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

const CODER_SKIPPED: Machine = {enabledPlugins: {'the-coder@foundry': true}, knownMarketplaces: FOUNDRY};

const CODER_RECORDED: Machine = {
	...CODER_SKIPPED,
	installedPlugins: recordsOf({'the-coder@foundry': [{scope: 'user'}]}),
};

const CODER_NOTE =
	'plugin-rollcall: Claude Code lists no skill or command of the the-coder@foundry plugin, ' +
	'so plugin-rollcall tries to reload it when this turn ends.';

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

	test('reloads after /clear once the clear has finished', async ($, on) => {
		const observed = machineOf(on, CODER_SKIPPED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.end(CLEAR);

		expect(observed.commands).toEqual(['reload-plugins']);

		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins', 'reload-plugins']);
		expect(observed.lines).toEqual([
			'reloaded plugins skipped at startup: the-coder@foundry',
			'reloaded plugins after /clear: the-coder@foundry',
		]);
	});

	test('reloads after a resume', async ($, on) => {
		const observed = machineOf(on, CODER_SKIPPED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.end(RESUME);
		await clock.settle();

		expect(observed.lines.at(-1)).toBe('reloaded plugins after a resume: the-coder@foundry');
	});

	test('reloads after a compaction of the main conversation', async ($, on) => {
		const observed = machineOf(on, CODER_SKIPPED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.compact(AUTO_COMPACT);
		await clock.settle();

		expect(observed.lines.at(-1)).toBe('reloaded plugins after compaction: the-coder@foundry');
	});

	test('does not reload after a subagent compaction or a precomputed one', async ($, on) => {
		const observed = machineOf(on, CODER_SKIPPED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.compact({...AUTO_COMPACT, agentId: 'a1'});
		await $.session.compact({...AUTO_COMPACT, trigger: 'precompute'});
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
	});

	test('does not reload after a compaction that was skipped', async ($, on) => {
		const observed = machineOf(on, {...CODER_SKIPPED, compaction: {skip: 'nothing to compact'}});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.compact(AUTO_COMPACT);
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
	});

	test('does not reload when a session ends for another reason', async ($, on) => {
		const observed = machineOf(on, CODER_SKIPPED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.end(EXIT);
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
	});

	test('runs one reload for the transitions that come before it', async ($, on) => {
		const observed = machineOf(on, CODER_SKIPPED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.end(CLEAR);
		await $.session.compact(AUTO_COMPACT);
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins', 'reload-plugins']);
		expect(observed.lines.at(-1)).toBe('reloaded plugins after /clear: the-coder@foundry');
	});

	test('does not reload after a compaction in a non-interactive session', async ($, on) => {
		const observed = machineOf(on, CODER_SKIPPED);
		const clock = mock.clock(on);
		await $.session.start(HEADLESS);

		await $.session.compact(AUTO_COMPACT);
		await clock.settle();

		expect(observed.commands).toEqual([]);
	});

	test('reloads after a skill of an unloaded plugin fails, and tells the model', async ($, on) => {
		const observed = machineOf(on, CODER_RECORDED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		const call = await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});

		expect(call.context).toEqual([CODER_NOTE]);
		expect(observed.commands).toEqual([]);

		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.lines).toEqual(['reloaded plugins after the-coder:coding failed: the-coder@foundry']);
	});

	test('does not reload when the plugin of a failed skill lists commands', async ($, on) => {
		const observed = machineOf(on, {...CODER_RECORDED, listedPlugins: ['the-coder']});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		const call = await $.tool.call({tool: 'Skill', skill: 'the-coder:nonexistent'});
		await clock.settle();

		expect(call.context).toBeUndefined();
		expect(observed.commands).toEqual([]);
	});

	test('does not reload for a failed skill of no enabled marketplace plugin', async ($, on) => {
		const observed = machineOf(on, CODER_RECORDED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.tool.call({tool: 'Skill', skill: 'golang:golang'});
		await $.tool.call({tool: 'Skill', skill: 'the-coder'});
		await clock.settle();

		expect(observed.commands).toEqual([]);
	});

	test('does not act on a failed skill in a non-interactive session', async ($, on) => {
		const observed = machineOf(on, CODER_RECORDED);
		const clock = mock.clock(on);
		await $.session.start(HEADLESS);

		const call = await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await clock.settle();

		expect(call.context).toBeUndefined();
		expect(observed.commands).toEqual([]);
	});

	test('reloads a plugin confirmed by a failed skill in a reload it shares', async ($, on) => {
		const observed = machineOf(on, CODER_RECORDED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.end(CLEAR);
		await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.lines).toEqual(['reloaded plugins after /clear: the-coder@foundry']);
	});

	test('reloads a plugin confirmed by a failed skill when the install records cannot be read', async ($, on) => {
		const observed = machineOf(on, {
			...CODER_SKIPPED,
			installedPlugins: recordsOf({'the-coder@foundry': [{projectPath: ROOT}]}),
		});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await clock.settle();

		const unreadable = 'roll call failed: Error: installed_plugins.json: a the-coder@foundry record has no scope';
		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.lines).toEqual([
			unreadable,
			unreadable,
			'reloaded plugins after the-coder:coding failed: the-coder@foundry',
		]);
	});
});
