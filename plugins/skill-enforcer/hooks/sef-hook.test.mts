import {describe, expect, test} from 'vite-plus/test';
import hooksJson from './hooks.json' with {type: 'json'};
import {ACTIONS, reply, serialize} from './sef-hook.mts';

const REMINDERS = [
	['prompt', 'UserPromptSubmit', 'USER-PROMPT'],
	['read', 'PostToolUse', 'EVALUATION'],
	['write', 'PostToolUse', 'PHASE-CHANGE'],
	['skill', 'PostToolUse', 'SKILL-LOAD'],
] as const;
const SILENT = 'Act on this rule. Do not quote this reminder or report the check in your reply.';

function contextOf(action: string): {readonly event: string; readonly context: string} {
	const answer = reply(action);
	if (!('context' in answer)) {
		throw new Error(`${action} replies without a context`);
	}
	return answer;
}

const ruleOf = (action: string): string => contextOf(action).context.split('\n')[1] ?? '';

describe('reminders', () => {
	test.each(REMINDERS)('%s answers %s with the %s reminder', (action, event, phase) => {
		const answer = contextOf(action);

		expect(answer.event).toBe(event);
		expect(answer.context.startsWith(`<SEF phase="${phase}">\n`)).toBe(true);
	});

	test.each(REMINDERS)('%s ends its reminder with the silence clause', (action) => {
		expect(contextOf(action).context.endsWith(`\n\n${SILENT}\n</SEF>`)).toBe(true);
	});

	test.each(REMINDERS)('%s carries the rule the session-start framework lists for it', (action, _event, phase) => {
		const rule = ruleOf(action);
		const framework = contextOf('session-start').context;

		expect(rule).toMatch(/\S/);
		expect(framework).toMatch(new RegExp(`^- ${RegExp.escape(phase)} \\(when [^)]+\\): ${RegExp.escape(rule)}$`, 'm'));
	});
});

test('session-start injects the framework into SessionStart', () => {
	const answer = contextOf('session-start');

	expect(answer.event).toBe('SessionStart');
	expect(answer.context.startsWith('<SEF>\n')).toBe(true);
	expect(answer.context.endsWith('\n</SEF>')).toBe(true);
});

test.each(ACTIONS)('%s injects no template for the model to fill in', (action) => {
	expect(serialize(reply(action))).not.toMatch(/<thinking>|<sef-eval/);
});

test.each(['bogus', 'constructor', '__proto__', 'toString', undefined])('treats %s as an unknown action', (action) => {
	expect(reply(action)).toStrictEqual({
		error: `SEF hook error: Unknown action "${String(action)}". Valid: ${ACTIONS.join(', ')}`,
	});
});

test('hooks.json wires every action the hook answers, and no other', () => {
	const wired = Object.values(hooksJson.hooks)
		.flat()
		.flatMap((group) => group.hooks)
		.map((hook) => hook.args.at(-1));

	expect(wired).toHaveLength(ACTIONS.length);
	expect(new Set(wired)).toStrictEqual(new Set(ACTIONS));
});

describe('serialize', () => {
	test('writes instructions as plain text, the only output Claude Code reads for PreCompact', () => {
		const text = serialize(reply('pre-compact'));

		expect(text.startsWith('<sef-compaction>\n')).toBe(true);
		expect(() => JSON.parse(text) as unknown).toThrow(SyntaxError);
	});

	test('writes a context as one hookSpecificOutput line', () => {
		const parsed: unknown = JSON.parse(serialize({event: 'PostToolUse', context: 'ctx'}));

		expect(parsed).toStrictEqual({hookSpecificOutput: {hookEventName: 'PostToolUse', additionalContext: 'ctx'}});
	});

	test('writes an error as a system message that lets the session continue', () => {
		const text = serialize({error: 'broken'});

		expect(text.endsWith('\n')).toBe(true);
		expect(JSON.parse(text) as unknown).toStrictEqual({continue: true, systemMessage: 'broken'});
	});
});
