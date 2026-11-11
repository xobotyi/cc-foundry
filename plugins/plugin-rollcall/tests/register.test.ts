import type {
	On,
	ProcessRunResult,
	SessionCompactInput,
	SessionCompactResult,
	SessionEndInput,
	SessionMessage,
	SessionStartInput,
	TurnCompleteInput,
} from 'claude-code';
import type {Engine} from 'claude-code/testing';
import {describe, expect, mock, test} from 'claude-code/testing';

const ROOT = '/repo';

const INTERACTIVE: SessionStartInput = {surface: 'terminal', isInteractive: true, cwd: ROOT};
const HEADLESS: SessionStartInput = {surface: null, isInteractive: false, cwd: ROOT};

const CLEAR: SessionEndInput = {reason: 'clear', sessionId: 's1', resume: {id: 's1'}};
const RESUME: SessionEndInput = {reason: 'resume', sessionId: 's1', resume: {id: 's1'}};
const EXIT: SessionEndInput = {reason: 'prompt_input_exit', sessionId: 's1', resume: {id: 's1'}};

const SUMMARY: SessionMessage = {role: 'user', text: 'the summary', toolUses: []};

const AUTO_COMPACT: SessionCompactInput = {trigger: 'auto', messages: [SUMMARY]};

const ENDED: TurnCompleteInput = {answer: '', durationMs: 1, isAborted: true, turnId: 't1', reason: 'aborted'};
const ANSWERED: TurnCompleteInput = {answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer'};

type Machine = {
	readonly enabledPlugins: Readonly<Record<string, boolean>>;
	readonly knownMarketplaces?: string;
	readonly installedPlugins?: string;
	readonly reload?: Promise<void>;
	readonly configDir?: string;
	readonly compaction?: SessionCompactResult;
	readonly listedPlugins?: readonly string[];
	readonly listedAfterReload?: readonly string[];
	readonly isAbortRefused?: boolean;
	readonly install?: Promise<ProcessRunResult>;
	readonly env?: Readonly<Record<string, string>>;
};

type Observed = {
	readonly commands: string[];
	readonly lines: string[];
	readonly processes: string[];
	readonly aborts: string[];
	readonly prompts: string[];
};

const INSTALL_MODE = {options: {install: true}};

const INSTALLED: ProcessRunResult = {
	exitCode: 0,
	stdout: '',
	stderr: '',
	isStdoutTruncated: false,
	isStderrTruncated: false,
};

function machineOf(on: On, machine: Machine): Observed {
	const commands: string[] = [];
	const lines: string[] = [];
	const processes: string[] = [];
	const aborts: string[] = [];
	const prompts: string[] = [];
	let listedPlugins = machine.listedPlugins ?? [];
	const pluginsDir = `${machine.configDir ?? '/home/u/.claude'}/plugins`;
	const files = new Map<string, string>();
	if (machine.knownMarketplaces !== undefined) {
		files.set(`${pluginsDir}/known_marketplaces.json`, machine.knownMarketplaces);
	}
	if (machine.installedPlugins !== undefined) {
		files.set(`${pluginsDir}/installed_plugins.json`, machine.installedPlugins);
	}

	const env: Record<string, string> = {HOME: '/home/u', ...machine.env};
	if (machine.configDir !== undefined) env.CLAUDE_CONFIG_DIR = machine.configDir;

	mock.env(on, env);
	on('session.start', ($, e) => ({cwd: e.cwd}));
	on('session.end', ($, e) => ({sessionId: e.sessionId}));
	on('session.compact', () => machine.compaction ?? {messages: [SUMMARY]});
	on('session.root', () => ({value: ROOT}));
	on('command.list', () => ({
		value: listedPlugins.map((plugin) => ({
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
		listedPlugins = machine.listedAfterReload ?? listedPlugins;

		return {text: 'Reloaded'};
	});
	on('turn.step', async function* ($, e) {
		return {turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null};
	});
	on('turn.complete', ($, e) => ({text: e.answer}));
	on('turn.abort', ($, e) => {
		aborts.push(e.turnId);
		if (machine.isAbortRefused === true) throw new Error('not the running turn');

		return {value: undefined};
	});
	on('prompt.submit', ($, e) => {
		prompts.push(e.text);

		return {text: e.text};
	});
	on('process.run', async ($, e) => {
		processes.push(`${e.init?.cwd}: ${e.argv.join(' ')}`);

		return {value: await (machine.install ?? INSTALLED)};
	});
	on('ui.log', ($, e) => {
		lines.push(e.text);

		return {value: undefined};
	});

	return {commands, lines, processes, aborts, prompts};
}

async function stepOf($: Engine, agentId?: string): Promise<void> {
	const step = $.turn.step({turnId: 't1', index: 1, model: 'claude', messageCount: 3, agentId});
	for await (const chunk of step) void chunk;
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

const CODER_ENDING_NOTE =
	'plugin-rollcall: Claude Code lists no skill or command of the the-coder@foundry plugin, ' +
	'so plugin-rollcall ends this turn and reloads the plugins.';

const CODER_CONTINUE =
	'plugin-rollcall ended your last turn after the-coder:coding failed as unknown, and reloaded the plugins. ' +
	'Call the-coder:coding again, then continue the task you were working on.';

const SUBAGENT = 'a1';

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

	test('does not reload or install a plugin with a managed record', INSTALL_MODE, async ($, on) => {
		const observed = machineOf(on, {
			enabledPlugins: {'the-coder@foundry': true},
			knownMarketplaces: FOUNDRY,
			installedPlugins: recordsOf({'the-coder@foundry': [{scope: 'managed', projectPath: null}]}),
		});
		const clock = mock.clock(on);

		await $.session.start(INTERACTIVE);
		await clock.settle();

		expect(observed.commands).toEqual([]);
		expect(observed.processes).toEqual([]);
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

	test('ends the turn after a skill of an unloaded plugin fails, reloads, and asks to continue', async ($, on) => {
		const observed = machineOf(on, {...CODER_RECORDED, listedAfterReload: ['the-coder']});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		const call = await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await stepOf($);

		expect(call.context).toEqual([CODER_ENDING_NOTE]);
		expect(observed.aborts).toEqual(['t1']);
		expect(observed.commands).toEqual([]);

		await $.turn.complete(ENDED);
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.lines).toEqual(['reloaded plugins after the-coder:coding failed: the-coder@foundry']);
		expect(observed.prompts).toEqual([CODER_CONTINUE]);
	});

	test('ends the turn once for skills of several unloaded plugins', async ($, on) => {
		const observed = machineOf(on, {
			enabledPlugins: {'the-coder@foundry': true, 'git-commit@foundry': true},
			knownMarketplaces: FOUNDRY,
			installedPlugins: recordsOf({'the-coder@foundry': [{scope: 'user'}], 'git-commit@foundry': [{scope: 'user'}]}),
			listedAfterReload: ['the-coder', 'git-commit'],
		});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await $.tool.call({tool: 'Skill', skill: 'git-commit:commit'});
		await stepOf($);
		await $.turn.complete(ENDED);
		await clock.settle();

		expect(observed.aborts).toEqual(['t1']);
		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.lines).toEqual([
			'reloaded plugins after the-coder:coding, git-commit:commit failed: the-coder@foundry, git-commit@foundry',
		]);
		expect(observed.prompts).toEqual([
			'plugin-rollcall ended your last turn after the-coder:coding, git-commit:commit failed as unknown, ' +
				'and reloaded the plugins. ' +
				'Call the-coder:coding, git-commit:commit again, then continue the task you were working on.',
		]);
	});

	test('reloads without asking to continue when the turn ends before its next step', async ($, on) => {
		const observed = machineOf(on, {...CODER_RECORDED, listedAfterReload: ['the-coder']});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await $.turn.complete(ENDED);
		await clock.settle();

		expect(observed.aborts).toEqual([]);
		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.prompts).toEqual([]);
	});

	test('reloads without asking to continue when the turn cannot be ended', async ($, on) => {
		const observed = machineOf(on, {...CODER_RECORDED, listedAfterReload: ['the-coder'], isAbortRefused: true});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await stepOf($);
		await stepOf($);
		await $.turn.complete(ANSWERED);
		await clock.settle();

		expect(observed.aborts).toEqual(['t1']);
		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.prompts).toEqual([]);
		expect(observed.lines).toHaveLength(2);
		expect(observed.lines[0]?.startsWith('roll call failed: ')).toBe(true);
		expect(observed.lines[1]).toBe('reloaded plugins after the-coder:coding failed: the-coder@foundry');
	});

	test('tells the model what the reload did not load, and ends no later turn for it', async ($, on) => {
		const observed = machineOf(on, CODER_RECORDED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await stepOf($);
		await $.turn.complete(ENDED);
		await clock.settle();

		expect(observed.prompts).toEqual([
			'plugin-rollcall ended your last turn after the-coder:coding failed as unknown, and reloaded the plugins. ' +
				'The reload did not load these plugins, so their skills stay unavailable: the-coder@foundry. ' +
				'Continue the task you were working on.',
		]);

		const call = await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await stepOf($);
		await $.turn.complete(ANSWERED);
		await clock.settle();

		expect(call.context).toBeUndefined();
		expect(observed.aborts).toEqual(['t1']);
		expect(observed.commands).toEqual(['reload-plugins']);
	});

	test('reloads after a skill of a subagent fails, and tells the model', async ($, on) => {
		const observed = machineOf(on, CODER_RECORDED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		const call = await $.tool.call({tool: 'Skill', skill: 'the-coder:coding', agentId: SUBAGENT});
		await stepOf($, SUBAGENT);
		await stepOf($);

		expect(call.context).toEqual([CODER_NOTE]);
		expect(observed.aborts).toEqual([]);
		expect(observed.commands).toEqual([]);

		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.lines).toEqual(['reloaded plugins after the-coder:coding failed: the-coder@foundry']);
		expect(observed.prompts).toEqual([]);
	});

	test('does not reload when the plugin of a failed skill lists commands', async ($, on) => {
		const observed = machineOf(on, {...CODER_RECORDED, listedPlugins: ['the-coder']});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		const call = await $.tool.call({tool: 'Skill', skill: 'the-coder:nonexistent'});
		await stepOf($);
		await $.turn.complete(ANSWERED);
		await clock.settle();

		expect(call.context).toBeUndefined();
		expect(observed.aborts).toEqual([]);
		expect(observed.commands).toEqual([]);
	});

	test('does not reload for a failed skill of no enabled marketplace plugin', async ($, on) => {
		const observed = machineOf(on, CODER_RECORDED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.tool.call({tool: 'Skill', skill: 'golang:golang'});
		await $.tool.call({tool: 'Skill', skill: 'the-coder'});
		await stepOf($);
		await $.turn.complete(ANSWERED);
		await clock.settle();

		expect(observed.aborts).toEqual([]);
		expect(observed.commands).toEqual([]);
	});

	test('does not act on a failed skill in a non-interactive session', async ($, on) => {
		const observed = machineOf(on, CODER_RECORDED);
		const clock = mock.clock(on);
		await $.session.start(HEADLESS);

		const call = await $.tool.call({tool: 'Skill', skill: 'the-coder:coding'});
		await stepOf($);
		await $.turn.complete(ANSWERED);
		await clock.settle();

		expect(call.context).toBeUndefined();
		expect(observed.aborts).toEqual([]);
		expect(observed.commands).toEqual([]);
	});

	test('reloads a plugin confirmed by a failed skill in a reload it shares', async ($, on) => {
		const observed = machineOf(on, CODER_RECORDED);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.end(CLEAR);
		await $.tool.call({tool: 'Skill', skill: 'the-coder:coding', agentId: SUBAGENT});
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

		await $.tool.call({tool: 'Skill', skill: 'the-coder:coding', agentId: SUBAGENT});
		await clock.settle();

		const unreadable = 'roll call failed: Error: installed_plugins.json: a the-coder@foundry record has no scope';
		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.lines).toEqual([
			unreadable,
			unreadable,
			'reloaded plugins after the-coder:coding failed: the-coder@foundry',
		]);
	});

	test('installs each plugin without a record at local scope in install mode', INSTALL_MODE, async ($, on) => {
		const observed = machineOf(on, {...CODER_SKIPPED});
		const clock = mock.clock(on);

		await $.session.start(INTERACTIVE);
		await clock.settle();

		expect(observed.processes).toEqual([`${ROOT}: claude plugin install the-coder@foundry --scope local`]);
		expect(observed.lines).toEqual([
			'reloaded plugins skipped at startup: the-coder@foundry',
			'installed plugins at local scope: the-coder@foundry',
		]);
	});

	test('does not install by default, whatever FOUNDRY_PLUGIN_ROLLCALL_INSTALL holds', async ($, on) => {
		const observed = machineOf(on, {...CODER_SKIPPED, env: {FOUNDRY_PLUGIN_ROLLCALL_INSTALL: '1'}});
		const clock = mock.clock(on);

		await $.session.start(INTERACTIVE);
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.processes).toEqual([]);
	});

	test('does not install a plugin that has a record', INSTALL_MODE, async ($, on) => {
		const observed = machineOf(on, {...CODER_RECORDED});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.tool.call({tool: 'Skill', skill: 'the-coder:coding', agentId: SUBAGENT});
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins']);
		expect(observed.processes).toEqual([]);
	});

	test('does not hold the session start for the install', INSTALL_MODE, async ($, on) => {
		const observed = machineOf(on, {...CODER_SKIPPED, install: new Promise(() => {})});
		const clock = mock.clock(on);

		await $.session.start(INTERACTIVE);
		await clock.settle();

		expect(observed.processes).toHaveLength(1);
		expect(observed.lines).toEqual(['reloaded plugins skipped at startup: the-coder@foundry']);
	});

	test('does not start an install while another runs', INSTALL_MODE, async ($, on) => {
		const observed = machineOf(on, {...CODER_SKIPPED, install: new Promise(() => {})});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.session.end(CLEAR);
		await clock.settle();

		expect(observed.commands).toEqual(['reload-plugins', 'reload-plugins']);
		expect(observed.processes).toHaveLength(1);
	});

	test('reports an install that fails', INSTALL_MODE, async ($, on) => {
		const failed = Promise.resolve({...INSTALLED, exitCode: 1, stderr: 'Plugin not found\nmore detail'});
		const observed = machineOf(on, {...CODER_SKIPPED, install: failed});
		const clock = mock.clock(on);

		await $.session.start(INTERACTIVE);
		await clock.settle();

		expect(observed.lines.at(-1)).toBe(
			'roll call failed: claude plugin install the-coder@foundry --scope local exited 1: Plugin not found',
		);
	});
});
