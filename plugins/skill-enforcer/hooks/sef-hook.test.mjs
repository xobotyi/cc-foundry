import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vite-plus/test';
import {respond} from './sef-hook.js';

const REMINDERS = [
	['prompt', 'UserPromptSubmit', 'USER-PROMPT'],
	['read', 'PostToolUse', 'EVALUATION'],
	['write', 'PostToolUse', 'PHASE-CHANGE'],
	['skill', 'PostToolUse', 'SKILL-LOAD'],
];
const SILENT = 'Act on this rule. Do not quote this reminder or report the check in your reply.';

const hookOutput = (action) => JSON.parse(respond(action)).hookSpecificOutput;

/** @returns {string[]} the action argument of every hook the plugin registers */
function wiredActions() {
	const {hooks} = JSON.parse(readFileSync(path.join(import.meta.dirname, 'hooks.json'), 'utf8'));
	return Object.values(hooks)
		.flat()
		.flatMap((group) => group.hooks)
		.map((hook) => hook.args.at(-1));
}

describe('reminders', () => {
	test.each(REMINDERS)('%s answers %s with the %s reminder', (action, event, phase) => {
		const {hookEventName, additionalContext} = hookOutput(action);

		expect(hookEventName).toBe(event);
		expect(additionalContext.startsWith(`<SEF phase="${phase}">\n`)).toBe(true);
	});

	test.each(REMINDERS)('%s ends its reminder with the silence clause', (action) => {
		expect(hookOutput(action).additionalContext.endsWith(`\n\n${SILENT}\n</SEF>`)).toBe(true);
	});

	test.each(REMINDERS)('%s carries the rule the session-start framework lists for it', (action, _event, phase) => {
		const rule = hookOutput(action).additionalContext.split('\n')[1];
		const framework = hookOutput('session-start').additionalContext;

		expect(rule).toMatch(/\S/);
		expect(framework).toContain(`- ${phase} (when `);
		expect(framework).toContain(`): ${rule}\n`);
	});
});

test('session-start injects the framework into SessionStart', () => {
	const {hookEventName, additionalContext} = hookOutput('session-start');

	expect(hookEventName).toBe('SessionStart');
	expect(additionalContext.startsWith('<SEF>\n')).toBe(true);
	expect(additionalContext.endsWith('\n</SEF>')).toBe(true);
});

test('pre-compact writes its instructions as plain text, the only output Claude Code reads for PreCompact', () => {
	const text = respond('pre-compact');

	expect(text.startsWith('<sef-compaction>\n')).toBe(true);
	expect(() => JSON.parse(text)).toThrow(SyntaxError);
});

test.each(['session-start', 'pre-compact', ...REMINDERS.map(([action]) => action)])(
	'%s injects no template for the model to fill in',
	(action) => {
		expect(respond(action)).not.toMatch(/<thinking>|<sef-eval/);
	},
);

test.each(['bogus', 'constructor', '__proto__', 'toString', undefined])(
	'answers the unknown action %s with an error that lets the session continue',
	(action) => {
		const reply = JSON.parse(respond(action));

		expect(reply.continue).toBe(true);
		expect(reply.systemMessage).toBe(
			`SEF hook error: Unknown action "${action}". Valid: session-start, pre-compact, prompt, read, write, skill`,
		);
	},
);

test('hooks.json wires every action the response table defines, and no other', () => {
	const known = JSON.parse(respond('bogus')).systemMessage.split('Valid: ')[1].split(', ');

	expect(wiredActions().toSorted()).toStrictEqual(known.toSorted());
});
