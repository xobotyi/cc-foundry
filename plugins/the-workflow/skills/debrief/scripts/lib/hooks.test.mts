import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vite-plus/test';
import {checkCalls, type HookCall, hookCallOf, hookPayload, type HookRun, verdictOf} from './hooks.mts';
import {parseJson} from './json.mts';

const run = (code: number | null, stdout = '', stderr = '', timedOut = false): HookRun => ({
	code,
	stdout,
	stderr,
	timedOut,
});
const decide = (permissionDecision: string): string =>
	JSON.stringify({
		hookSpecificOutput: {hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason: 'r'},
	});

describe('verdictOf', () => {
	test.each([
		[
			'exit 2 as a denial with the first stderr line',
			run(2, '', '\nno push without review\nmore'),
			'deny',
			'no push without review',
		],
		['exit 2 as a denial whatever the JSON says', run(2, decide('allow'), 'blocked'), 'deny', 'blocked'],
		['a JSON denial', run(0, decide('deny')), 'deny', 'r'],
		['a JSON ask', run(0, decide('ask')), 'ask', 'r'],
		['a JSON allow', run(0, decide('allow')), 'allow', 'r'],
		['a JSON decision on an exit other than 0 and 2', run(1, decide('deny')), 'deny', 'r'],
		['continue false as a stop', run(0, JSON.stringify({continue: false, stopReason: 'halt'})), 'stop', 'halt'],
		[
			'the legacy block decision as a denial',
			run(0, JSON.stringify({decision: 'block', reason: 'old'})),
			'deny',
			'old',
		],
		['JSON with no decision as a pass', run(0, JSON.stringify({suppressOutput: true})), 'pass', ''],
		['plain output on exit 0 as a pass', run(0, 'checked'), 'pass', ''],
		['nothing on exit 0 as a pass', run(0), 'pass', ''],
		['another exit code as an error', run(1, '', 'boom'), 'error', 'boom'],
		['invalid JSON as an error', run(0, '{nope'), 'error', 'invalid JSON: {nope'],
		['a timeout as an error', run(null, '', '', true), 'error', 'timed out'],
	])('reads %s', (_name, hookRun, decision, reason) => {
		expect(verdictOf(hookRun)).toStrictEqual({decision, reason});
	});
});

describe('hookCallOf and hookPayload', () => {
	const dumped: HookCall = {
		id: 't1',
		session: 's1',
		cwd: '/w/pkg',
		project: '/w',
		transcript: '/p/s1.jsonl',
		tool: 'Bash',
		input: {command: 'git push'},
	};

	test('read a dumped call', () => {
		const line = JSON.stringify({...dumped, at: '2026-10-01T10:00:00Z', outcome: 'rejected'});

		expect(hookCallOf(parseJson(line))).toStrictEqual(dumped);
	});

	test('build the input a PreToolUse hook receives', () => {
		expect(hookPayload(dumped, '/w/pkg')).toStrictEqual({
			session_id: 's1',
			transcript_path: '/p/s1.jsonl',
			cwd: '/w/pkg',
			permission_mode: 'default',
			hook_event_name: 'PreToolUse',
			tool_name: 'Bash',
			tool_input: {command: 'git push'},
			tool_use_id: 't1',
		});
	});

	test('read no call from a line without an id and a tool', () => {
		expect(hookCallOf({id: 't1'})).toBeUndefined();
		expect(hookCallOf(['t1', 'Bash'])).toBeUndefined();
	});
});

describe('checkCalls', () => {
	let dir = '';
	let pushGuard = '';
	let silent = '';

	const call = (id: string, command: string): HookCall => ({
		id,
		session: 's1',
		cwd: dir,
		project: dir,
		transcript: undefined,
		tool: 'Bash',
		input: {command},
	});

	beforeAll(async () => {
		dir = await mkdtemp(path.join(tmpdir(), 'debrief-hooks-'));
		pushGuard = path.join(dir, 'push-guard.mjs');
		silent = path.join(dir, 'silent.mjs');
		await writeFile(
			pushGuard,
			[
				"let input = '';",
				"process.stdin.on('data', (chunk) => { input += chunk; });",
				"process.stdin.on('end', () => {",
				'\tconst {tool_input: toolInput, cwd} = JSON.parse(input);',
				"\tif (cwd !== process.env.CLAUDE_PROJECT_DIR) { process.stderr.write('wrong project'); process.exit(1); }",
				"\tif (/git push --force/.test(toolInput.command)) { process.stderr.write('no force push'); process.exit(2); }",
				'});',
			].join('\n'),
		);
		await writeFile(silent, 'process.exit(0);\n');
	});

	afterAll(async () => {
		await rm(dir, {recursive: true, force: true});
	});

	test('reads the verdict on each call against the calls named as violating', async () => {
		const results = await checkCalls(
			`node ${pushGuard}`,
			[call('a', 'git push --force'), call('b', 'git push'), call('c', 'git push --force-with-lease')],
			{violating: new Set(['a']), timeoutMs: 10_000},
		);

		expect(results.map(({id, decision, expected, ok}) => [id, decision, expected, ok])).toStrictEqual([
			['a', 'deny', 'catch', true],
			['b', 'pass', 'pass', true],
			['c', 'deny', 'pass', false],
		]);
		expect(results[0]?.reason).toBe('no force push');
	});

	test('reads a deferral as no catch, because an interactive session ignores it', async () => {
		const results = await checkCalls(`echo '${decide('defer')}'`, [call('a', 'git push --force')], {
			violating: new Set(['a']),
			timeoutMs: 10_000,
		});

		expect(results.map(({decision, ok}) => [decision, ok])).toStrictEqual([['defer', false]]);
	});

	test('passes every call through a hook that never reads its input', async () => {
		const results = await checkCalls(`node ${silent}`, [call('a', 'ls')], {violating: undefined, timeoutMs: 10_000});

		expect(results).toStrictEqual([
			{id: 'a', tool: 'Bash', decision: 'pass', reason: '', expected: undefined, ok: true},
		]);
	});

	test.each([
		['outlives its timeout', 'sleep 10'],
		['leaves a command running past its timeout', 'sleep 10; exit 0'],
		['ignores the timeout signal', `node -e "process.on('SIGTERM', () => {}); setTimeout(() => {}, 10000)"; exit 0`],
	])('reads a hook that %s as an error', async (_name, command) => {
		const results = await checkCalls(command, [call('a', 'ls')], {violating: undefined, timeoutMs: 200});

		expect(results).toStrictEqual([
			{id: 'a', tool: 'Bash', decision: 'error', reason: 'timed out', expected: undefined, ok: false},
		]);
	});
});
