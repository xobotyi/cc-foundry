import type {
	On,
	PromptSubmitInput,
	SessionCompactInput,
	SessionCompactResult,
	SessionEndInput,
	SessionMessage,
	ToolCallResult,
} from 'claude-code';
import {describe, expect, test} from 'claude-code/testing';
import type {Engine} from 'claude-code/testing';

const SILENT = 'Act on this rule. Do not quote this reminder or report the check in your reply.';

const SUMMARY: SessionMessage = {role: 'user', text: 'the summary', toolUses: []};

const CLEAR: SessionEndInput = {reason: 'clear', sessionId: 's1', resume: {id: 's1'}};
const RESUME: SessionEndInput = {reason: 'resume', sessionId: 's1', resume: {id: 's1'}};
const EXIT: SessionEndInput = {reason: 'prompt_input_exit', sessionId: 's1', resume: {id: 's1'}};

const AUTO_COMPACT: SessionCompactInput = {trigger: 'auto', messages: [SUMMARY]};
const SUBAGENT_COMPACT: SessionCompactInput = {trigger: 'auto', agentId: 'a1', messages: [SUMMARY]};

const TYPED: PromptSubmitInput = {text: 'fix the bug', wait: false, origin: {kind: 'sdk'}};

const CHECKPOINT_CALLS = [
	['EVALUATION', {tool: 'Read', file_path: '/repo/a.ts'}],
	['PHASE-CHANGE', {tool: 'Edit', file_path: '/repo/a.ts', old_string: 'a', new_string: 'b'}],
	['PHASE-CHANGE', {tool: 'Write', file_path: '/repo/a.ts', content: 'a'}],
	['SKILL-LOAD', {tool: 'Skill', skill: 'the-coder:coding'}],
] as const;

type Transition = ($: Engine) => Promise<unknown>;

const RENEWALS: readonly (readonly [string, Transition])[] = [
	['/clear', async ($) => $.session.end(CLEAR)],
	['a resume', async ($) => $.session.end(RESUME)],
	['a compaction of the main conversation', async ($) => $.session.compact(AUTO_COMPACT)],
];

const NON_RENEWALS: readonly (readonly [string, Transition, Machine])[] = [
	['the session exits', async ($) => $.session.end(EXIT), {}],
	["a compaction of a subagent's conversation", async ($) => $.session.compact(SUBAGENT_COMPACT), {}],
	['a skipped compaction', async ($) => $.session.compact(AUTO_COMPACT), {compaction: {skip: 'off'}}],
];

type Machine = {
	readonly toolResult?: ToolCallResult;
	readonly compaction?: SessionCompactResult;
	readonly dropped?: readonly string[];
};

type Observed = {
	readonly instructions: (string | undefined)[];
};

function machineOf(on: On, machine: Machine = {}): Observed {
	const instructions: (string | undefined)[] = [];

	on('prompt.submit', ($, e) =>
		machine.dropped?.includes(e.text) === true ? {drop: 'refused'} : {text: e.text, context: e.context},
	);
	on('tool.call', () => machine.toolResult ?? {result: undefined, text: 'done'});
	on('session.compact', ($, e) => {
		instructions.push(e.instructions);

		return machine.compaction ?? {messages: [SUMMARY]};
	});
	on('session.end', ($, e) => ({sessionId: e.sessionId}));

	return {instructions};
}

async function contextOf($: Engine, text: string): Promise<readonly string[]> {
	const submitted = await $.prompt.submit({...TYPED, text});

	return submitted.context ?? [];
}

const isFramework = (block: string | undefined): boolean =>
	block?.startsWith('<SEF>\n') === true && block.endsWith('\n</SEF>');

const isReminderOf = (block: string | undefined, phase: string): boolean =>
	block?.startsWith(`<SEF phase="${phase}">\n`) === true && block.endsWith(`\n\n${SILENT}\n</SEF>`);

describe('prompt.submit', () => {
	test('the first prompt enters with the framework, then the USER-PROMPT reminder', async ($, on) => {
		machineOf(on);

		const context = await contextOf($, 'fix the bug');

		expect(context).toHaveLength(2);
		expect(isFramework(context[0])).toBe(true);
		expect(isReminderOf(context[1], 'USER-PROMPT')).toBe(true);
	});

	test('a later prompt enters with the reminder alone', async ($, on) => {
		machineOf(on);
		const [, reminder] = await contextOf($, 'fix the bug');

		expect(await contextOf($, 'now test it')).toEqual([reminder]);
	});

	test('a dropped prompt leaves the framework for the next one', async ($, on) => {
		machineOf(on, {dropped: ['refused text']});
		await $.prompt.submit({...TYPED, text: 'refused text'});

		const context = await contextOf($, 'fix the bug');

		expect(isFramework(context[0])).toBe(true);
	});

	for (const [occasion, transition] of RENEWALS) {
		test(`the framework enters again after ${occasion}`, async ($, on) => {
			machineOf(on);
			await contextOf($, 'fix the bug');

			await transition($);
			const context = await contextOf($, 'now test it');

			expect(context).toHaveLength(2);
			expect(isFramework(context[0])).toBe(true);
		});
	}

	for (const [occasion, transition, machine] of NON_RENEWALS) {
		test(`the framework does not enter again after ${occasion}`, async ($, on) => {
			machineOf(on, machine);
			await contextOf($, 'fix the bug');

			await transition($);
			const context = await contextOf($, 'now test it');

			expect(context).toHaveLength(1);
			expect(isReminderOf(context[0], 'USER-PROMPT')).toBe(true);
		});
	}
});

describe('tool.call', () => {
	for (const [phase, input] of CHECKPOINT_CALLS) {
		test(`a ${input.tool} call returns with the ${phase} reminder`, async ($, on) => {
			machineOf(on);

			const call = await $.tool.call(input);

			expect(call.context).toHaveLength(1);
			expect(isReminderOf(call.context?.[0], phase)).toBe(true);
		});

		test(`the ${phase} reminder of ${input.tool} carries the rule the framework lists for it`, async ($, on) => {
			machineOf(on);
			const [framework] = await contextOf($, 'fix the bug');

			const call = await $.tool.call(input);
			const rule = call.context?.[0]?.split('\n')[1] ?? '';

			expect(rule).not.toBe('');
			expect(
				framework?.split('\n').some((line) => line.startsWith(`- ${phase} (when `) && line.endsWith(`): ${rule}`)),
			).toBe(true);
		});
	}

	test('a call of another tool returns with no reminder', async ($, on) => {
		machineOf(on);

		const call = await $.tool.call({tool: 'Bash', command: 'ls'});

		expect(call.context).toBeUndefined();
	});

	test('a failed call returns with no reminder', async ($, on) => {
		machineOf(on, {toolResult: {result: undefined, text: 'File does not exist.', isError: true}});

		const call = await $.tool.call({tool: 'Read', file_path: '/repo/missing.ts'});

		expect(call.context).toBeUndefined();
	});

	test('a denied call returns with no reminder', async ($, on) => {
		machineOf(on, {toolResult: {deny: 'refused'}});

		const call = await $.tool.call({tool: 'Read', file_path: '/repo/a.ts'});

		expect(call.deny).toBe('refused');
		expect(call.context).toBeUndefined();
	});

	test('a subagent call returns with the reminder', async ($, on) => {
		machineOf(on);

		const call = await $.tool.call({tool: 'Read', file_path: '/repo/a.ts', agentId: 'a1'});

		expect(isReminderOf(call.context?.[0], 'EVALUATION')).toBe(true);
	});
});

describe('session.compact', () => {
	test('a compaction with no instructions gets the SEF compaction instructions', async ($, on) => {
		const observed = machineOf(on);

		await $.session.compact(AUTO_COMPACT);

		expect(observed.instructions).toHaveLength(1);
		expect(observed.instructions[0]?.startsWith('<sef-compaction>\n')).toBe(true);
		expect(observed.instructions[0]?.endsWith('\n</sef-compaction>')).toBe(true);
	});

	test('the SEF compaction instructions follow the instructions a compaction already has', async ($, on) => {
		const observed = machineOf(on);

		await $.session.compact({...AUTO_COMPACT, trigger: 'manual', instructions: 'Keep the test names.'});

		expect(observed.instructions[0]?.startsWith('Keep the test names.\n\n<sef-compaction>\n')).toBe(true);
	});
});

test('nothing the mod injects holds a template for the model to fill in', async ($, on) => {
	const observed = machineOf(on);
	const prompt = await contextOf($, 'fix the bug');
	const calls = await Promise.all(CHECKPOINT_CALLS.map(async ([, input]) => $.tool.call(input)));
	await $.session.compact(AUTO_COMPACT);

	const injected = [...prompt, ...calls.flatMap((call) => call.context ?? []), ...observed.instructions];

	expect(injected).toHaveLength(prompt.length + CHECKPOINT_CALLS.length + 1);
	expect(injected.join('\n')).not.toMatch(/<thinking>|<sef-eval/);
});

describe('prompt.submit of a prompt nobody typed', () => {
	test('a task notification enters with no context and leaves the framework for the next typed prompt', async ($, on) => {
		machineOf(on);

		const notified = await $.prompt.submit({
			...TYPED,
			text: '<task-notification>',
			isMeta: true,
			origin: {kind: 'task-notification'},
		});
		const context = await contextOf($, 'fix the bug');

		expect(notified.context).toBeUndefined();
		expect(isFramework(context[0])).toBe(true);
	});

	test('a task notification that is not marked isMeta enters with no context', async ($, on) => {
		machineOf(on);

		const notified = await $.prompt.submit({
			...TYPED,
			text: '<task-notification>',
			origin: {kind: 'task-notification'},
		});

		expect(notified.context).toBeUndefined();
	});

	test("a typed prompt keeps the context it already carries ahead of the mod's", async ($, on) => {
		machineOf(on);

		const submitted = await $.prompt.submit({...TYPED, context: ['from above']});

		expect(submitted.context?.[0]).toBe('from above');
		expect(submitted.context).toHaveLength(3);
	});
});
