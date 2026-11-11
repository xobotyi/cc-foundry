import type {
	On,
	PromptSubmitInput,
	SessionCompactInput,
	SessionCompactResult,
	SessionEndInput,
	SessionMessage,
	SessionStartInput,
	ToolCallResult,
	TurnCompleteInput,
	TurnStartInput,
} from 'claude-code';
import {describe, expect, mock, test} from 'claude-code/testing';
import type {Engine, MockClock} from 'claude-code/testing';

const NOW = Date.parse('2026-10-28T19:00:05Z');
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const LEGEND =
	'The latest <wall-clock> is now; earlier ones are history. Run `date +%Y-%m-%dT%H:%M:%S%z` when a turn needs precision.';
const COMPACT_NOTE =
	'When compacting, drop every <wall-clock .../> block and its legend. They are re-injected automatically.';

const TICK =
	/^<wall-clock at="(?<day>\w{3}) (?<ymd>\d{4}-\d\d-\d\d) (?<time>\d\d:\d\d:\d\d)(?<zone>[+-]\d\d:\d\d)"(?: (?<elapsed>(?:away|turn)="[^"]+"))?\/>(?:\n(?<legend>[^\n]+))?$/;

const SUMMARY: SessionMessage = {role: 'user', text: 'the summary', toolUses: []};

const TYPED: PromptSubmitInput = {text: 'fix the bug', wait: false, origin: {kind: 'sdk'}};
const BASH = {tool: 'Bash', command: 'ls'} as const;

const STARTED: TurnStartInput = {text: 'fix the bug', turnId: 't1'};
const ANSWERED: TurnCompleteInput = {answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer'};

const STARTUP: SessionStartInput = {cwd: '/repo', surface: null, isInteractive: false};

const CLEAR: SessionEndInput = {reason: 'clear', sessionId: 's1', resume: {id: 's1'}};
const RESUME: SessionEndInput = {reason: 'resume', sessionId: 's1', resume: {id: 's1'}};
const EXIT: SessionEndInput = {reason: 'prompt_input_exit', sessionId: 's1', resume: {id: 's1'}};

const AUTO_COMPACT: SessionCompactInput = {trigger: 'auto', messages: [SUMMARY]};
const SUBAGENT_COMPACT: SessionCompactInput = {trigger: 'auto', agentId: 'a1', messages: [SUMMARY]};

type Machine = {
	readonly toolResult?: ToolCallResult;
	readonly compaction?: SessionCompactResult;
	readonly dropped?: readonly string[];
	readonly turnEnds?: Readonly<Record<string, number>>;
};

type Observed = {
	readonly clock: MockClock;
	readonly instructions: (string | undefined)[];
	readonly enterSession: (sessionId: string) => void;
};

type Tick = {
	readonly at: number;
	readonly day: string;
	readonly elapsed: string | undefined;
	readonly hasLegend: boolean;
};

function machineOf(on: On, machine: Machine = {}): Observed {
	const instructions: (string | undefined)[] = [];
	const clock = mock.clock(on, {now: NOW});
	let sessionId = 's1';

	mock.store(
		on,
		Object.fromEntries(Object.entries(machine.turnEnds ?? {}).map(([id, at]) => [`turnEndedAt:${id}`, at])),
	);
	on('session.id', () => ({value: sessionId}));
	on('session.start', ($, e) => ({cwd: e.cwd}));
	on('prompt.submit', ($, e) =>
		machine.dropped?.includes(e.text) === true ? {drop: 'refused'} : {text: e.text, context: e.context},
	);
	on('tool.call', () => machine.toolResult ?? {result: undefined, text: 'done'});
	on('turn.start', ($, e) => ({turnId: e.turnId}));
	on('turn.complete', ($, e) => ({text: e.answer}));
	on('session.compact', ($, e) => {
		instructions.push(e.instructions);

		return machine.compaction ?? {messages: [SUMMARY]};
	});
	on('session.end', ($, e) => ({sessionId: e.sessionId}));

	return {
		clock,
		instructions,
		enterSession: (id) => {
			sessionId = id;
		},
	};
}

/** Reads the one tick a context holds; fails the test when the context is not exactly one tick. */
function tickOf(context: readonly string[] | undefined): Tick {
	expect(context).toHaveLength(1);
	const groups = TICK.exec(context?.[0] ?? '')?.groups;
	if (groups === undefined) throw new Error(`not a tick: ${String(context?.[0])}`);
	if (groups.legend !== undefined) expect(groups.legend).toBe(LEGEND);

	return {
		at: Date.parse(`${groups.ymd ?? ''}T${groups.time ?? ''}${groups.zone ?? ''}`),
		day: groups.day ?? '',
		elapsed: groups.elapsed,
		hasLegend: groups.legend !== undefined,
	};
}

async function promptTick($: Engine, input: Partial<PromptSubmitInput> = {}): Promise<Tick> {
	const submitted = await $.prompt.submit({...TYPED, ...input});

	return tickOf(submitted.context);
}

async function toolTick($: Engine, agentId?: string): Promise<Tick> {
	const call = await $.tool.call(agentId === undefined ? BASH : {...BASH, agentId});

	return tickOf(call.context);
}

async function toolContext($: Engine, agentId?: string): Promise<readonly string[] | undefined> {
	const call = await $.tool.call(agentId === undefined ? BASH : {...BASH, agentId});

	return call.context;
}

describe('prompt.submit', () => {
	test('the first prompt carries the local time and the legend, with no elapsed figure', async ($, on) => {
		machineOf(on);

		const tick = await promptTick($);

		expect(tick).toEqual({at: NOW, day: new Date(NOW).toString().slice(0, 3), elapsed: undefined, hasLegend: true});
	});

	test('a later prompt carries the time since the last turn ended, with no legend', async ($, on) => {
		const {clock} = machineOf(on);
		await promptTick($);
		await $.turn.start(STARTED);
		await clock.advance(2 * MINUTE);
		await $.turn.complete(ANSWERED);
		await clock.advance(5 * MINUTE);

		const tick = await promptTick($);

		expect(tick).toEqual({...tick, at: NOW + 7 * MINUTE, elapsed: 'away="5m00s"', hasLegend: false});
	});

	for (const [ms, formatted] of [
		[0, '0s'],
		[59_400, '59s'],
		[59_600, '1m00s'],
		[61_000, '1m01s'],
		[3_599_000, '59m59s'],
		[3_600_000, '1h00m'],
		[7_325_000, '2h02m'],
	] as const) {
		test(`${ms} ms away reads ${formatted}`, async ($, on) => {
			const {clock} = machineOf(on);
			await $.turn.complete(ANSWERED);
			await clock.advance(ms);

			expect((await promptTick($)).elapsed).toBe(`away="${formatted}"`);
		});
	}

	test("a prompt keeps the context it already carries ahead of the mod's", async ($, on) => {
		machineOf(on);

		const submitted = await $.prompt.submit({...TYPED, context: ['from above']});

		expect(submitted.context?.[0]).toBe('from above');
		expect(tickOf(submitted.context?.slice(1)).hasLegend).toBe(true);
	});

	test('a dropped prompt leaves the legend and the period to the next tick', async ($, on) => {
		machineOf(on, {dropped: ['refused text']});
		await $.prompt.submit({...TYPED, text: 'refused text'});

		expect((await toolTick($)).hasLegend).toBe(true);
	});

	test('a prompt submitted while a turn runs gets no tick, and the next tool result carries one', async ($, on) => {
		const {clock} = machineOf(on);
		await promptTick($);
		await $.turn.start(STARTED);
		await clock.advance(10 * SECOND);

		const submitted = await $.prompt.submit({...TYPED, text: 'also this', turnId: 't1'});
		const tick = await toolTick($);

		expect(submitted.context).toBeUndefined();
		expect(tick.elapsed).toBe('turn="10s"');
	});
});

describe('tool.call', () => {
	test('a tool result carries the time since the turn started', async ($, on) => {
		const {clock} = machineOf(on);
		await $.turn.start(STARTED);
		await clock.advance(400 * SECOND);

		const tick = await toolTick($);

		expect(tick).toEqual({...tick, at: NOW + 400 * SECOND, elapsed: 'turn="6m40s"', hasLegend: true});
	});

	test('a tool result carries the time alone when no turn start was heard', async ($, on) => {
		machineOf(on);

		expect((await toolTick($)).elapsed).toBeUndefined();
	});

	test('a tool result within the period after a prompt tick carries none', async ($, on) => {
		const {clock} = machineOf(on);
		await promptTick($);
		await clock.advance(MINUTE - 1);

		expect(await toolContext($)).toBeUndefined();
	});

	test('a tool result within the period after a tool tick carries none', async ($, on) => {
		const {clock} = machineOf(on);
		await toolTick($);
		await clock.advance(MINUTE - 1);

		expect(await toolContext($)).toBeUndefined();
	});

	test('a tool result carries a tick again once the period has passed, with no legend', async ($, on) => {
		const {clock} = machineOf(on);
		await promptTick($);
		await $.turn.start(STARTED);
		await clock.advance(MINUTE);

		const tick = await toolTick($);

		expect(tick).toEqual({...tick, elapsed: 'turn="1m00s"', hasLegend: false});
	});

	test('every tool result carries a tick when the period is zero', {options: {tickSeconds: 0}}, async ($, on) => {
		machineOf(on);
		await toolTick($);

		expect((await toolTick($)).hasLegend).toBe(false);
	});

	test('a longer period holds the tick back', {options: {tickSeconds: 300}}, async ($, on) => {
		const {clock} = machineOf(on);
		await toolTick($);
		await clock.advance(299 * SECOND);

		expect(await toolContext($)).toBeUndefined();

		await clock.advance(SECOND);

		expect((await toolTick($)).at).toBe(NOW + 300 * SECOND);
	});

	test('a negative period reads as the default', {options: {tickSeconds: -5}}, async ($, on) => {
		const {clock} = machineOf(on);
		await toolTick($);
		await clock.advance(MINUTE - 1);

		expect(await toolContext($)).toBeUndefined();
	});

	test('a failed call carries a tick', async ($, on) => {
		machineOf(on, {toolResult: {result: undefined, text: 'No such file.', isError: true}});

		expect((await toolTick($)).hasLegend).toBe(true);
	});

	test('a denied call carries none', async ($, on) => {
		machineOf(on, {toolResult: {deny: 'refused'}});

		const call = await $.tool.call(BASH);

		expect(call.deny).toBe('refused');
		expect(call.context).toBeUndefined();
	});

	test("a subagent's tool result counts from its own turn and its own last tick", async ($, on) => {
		const {clock} = machineOf(on);
		await $.turn.start(STARTED);
		await clock.advance(5 * MINUTE);
		await $.turn.start({text: 'explore', turnId: 't2', agentId: 'a1'});
		await clock.advance(20 * SECOND);
		await toolTick($);

		const tick = await toolTick($, 'a1');

		expect(tick).toEqual({...tick, elapsed: 'turn="20s"', hasLegend: true});
		expect(await toolContext($, 'a1')).toBeUndefined();
	});
});

describe('session.compact', () => {
	test('a compaction with no instructions gets the compaction note', async ($, on) => {
		const observed = machineOf(on);

		await $.session.compact(AUTO_COMPACT);

		expect(observed.instructions).toEqual([COMPACT_NOTE]);
	});

	test('the compaction note follows the instructions a compaction already has', async ($, on) => {
		const observed = machineOf(on);

		await $.session.compact({...AUTO_COMPACT, trigger: 'manual', instructions: 'Keep the test names.'});

		expect(observed.instructions).toEqual([`Keep the test names.\n\n${COMPACT_NOTE}`]);
	});

	test('the legend enters again after a compaction of the main conversation', async ($, on) => {
		machineOf(on);
		await promptTick($);

		await $.session.compact(AUTO_COMPACT);

		expect((await promptTick($)).hasLegend).toBe(true);
	});

	test('the legend does not enter again after a skipped compaction', async ($, on) => {
		machineOf(on, {compaction: {skip: 'off'}});
		await promptTick($);

		await $.session.compact(AUTO_COMPACT);

		expect((await promptTick($)).hasLegend).toBe(false);
	});

	test("a compaction of a subagent's conversation renews the legend there alone", async ($, on) => {
		const {clock} = machineOf(on);
		await promptTick($);
		await toolTick($, 'a1');

		await $.session.compact(SUBAGENT_COMPACT);
		await clock.advance(MINUTE);

		expect((await promptTick($)).hasLegend).toBe(false);
		expect((await toolTick($, 'a1')).hasLegend).toBe(true);
	});
});

describe('the stored turn end', () => {
	test('the first prompt of a process carries away when the session ended a turn before', async ($, on) => {
		machineOf(on, {turnEnds: {s1: NOW - 3 * HOUR}});

		const tick = await promptTick($);

		expect(tick).toEqual({...tick, elapsed: 'away="3h00m"', hasLegend: true});
	});

	test("another session's turn end gives no away", async ($, on) => {
		machineOf(on, {turnEnds: {s0: NOW - HOUR}});

		expect((await promptTick($)).elapsed).toBeUndefined();
	});

	test("a subagent's turn end gives no away", async ($, on) => {
		const {clock} = machineOf(on);
		await $.turn.complete({...ANSWERED, agentId: 'a1'});
		await clock.advance(MINUTE);

		expect((await promptTick($)).elapsed).toBeUndefined();
	});

	test('a session start drops a turn end older than 30 days', async ($, on) => {
		machineOf(on, {turnEnds: {s1: NOW - 30 * DAY - 1}});

		await $.session.start(STARTUP);

		expect((await promptTick($)).elapsed).toBeUndefined();
	});

	test('a session start keeps a turn end younger than 30 days', async ($, on) => {
		machineOf(on, {turnEnds: {s1: NOW - 29 * DAY}});

		await $.session.start(STARTUP);

		expect((await promptTick($)).elapsed).toBe('away="696h00m"');
	});
});

describe('session.end', () => {
	test('the first prompt after /clear carries the legend and no away', async ($, on) => {
		const {clock, enterSession} = machineOf(on);
		await promptTick($);
		await $.turn.complete(ANSWERED);
		await clock.advance(MINUTE);

		enterSession('s2');
		await $.session.end(CLEAR);
		const tick = await promptTick($);

		expect(tick).toEqual({...tick, elapsed: undefined, hasLegend: true});
	});

	test('the first prompt after a resume carries the legend and the away of the session resumed', async ($, on) => {
		const {clock, enterSession} = machineOf(on, {turnEnds: {s2: NOW - HOUR}});
		await promptTick($);
		await $.turn.complete(ANSWERED);
		await clock.advance(MINUTE);

		enterSession('s2');
		await $.session.end(RESUME);
		const tick = await promptTick($);

		expect(tick).toEqual({...tick, elapsed: 'away="1h01m"', hasLegend: true});
	});

	test('a prompt after the session exits carries away and no legend', async ($, on) => {
		const {clock} = machineOf(on);
		await promptTick($);
		await $.turn.complete(ANSWERED);
		await clock.advance(MINUTE);

		await $.session.end(EXIT);
		const tick = await promptTick($);

		expect(tick).toEqual({...tick, elapsed: 'away="1m00s"', hasLegend: false});
	});
});
