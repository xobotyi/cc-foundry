import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vite-plus/test';
import {callStep, recurringProcedures, type SessionSteps, sessionSteps} from './procedures.mts';
import type {ToolUse} from './transcript.mts';

const bash = (command: string): ToolUse => ({type: 'tool_use', id: 't', name: 'Bash', input: {command}});

describe('callStep', () => {
	test.each([
		[
			'a git subcommand, its global options and a leading cd dropped',
			'cd /w && git -C /w/x commit -m "x"',
			'git commit',
		],
		[
			'a script by its file name, an environment prefix dropped',
			'FOO=1 node ./scripts/validate.mts --file a',
			'node validate.mts',
		],
		['a program by its name', '/usr/local/bin/kensai-local review --kind full', 'kensai-local'],
		['a tool with no subcommand', 'git --version', 'git'],
	])('reads %s', (_name, command, step) => {
		expect(callStep(bash(command))).toBe(step);
	});

	test.each([
		['shell plumbing', 'rg -n foo src'],
		['an inline script', "python3 - <<'EOF'\nprint(1)\nEOF"],
		['an empty command', ''],
	])('reads no step from %s', (_name, command) => {
		expect(callStep(bash(command))).toBeUndefined();
	});

	test('reads a skill call by its skill and another tool by its name, and no step from a lookup', () => {
		expect(callStep({type: 'tool_use', id: 't', name: 'Skill', input: {skill: 'git-commit:commit'}})).toBe(
			'Skill git-commit:commit',
		);
		expect(callStep({type: 'tool_use', id: 't', name: 'mcp__gerrit__get_change', input: {}})).toBe(
			'mcp__gerrit__get_change',
		);
		expect(callStep({type: 'tool_use', id: 't', name: 'Read', input: {file_path: '/a'}})).toBeUndefined();
	});
});

describe('sessionSteps', () => {
	let dir = '';

	beforeAll(async () => {
		dir = await mkdtemp(path.join(tmpdir(), 'debrief-steps-'));
	});

	afterAll(async () => {
		await rm(dir, {recursive: true, force: true});
	});

	const step = (at: string, command: string, fields: Readonly<Record<string, unknown>> = {}): string =>
		JSON.stringify({
			type: 'assistant',
			sessionId: 's1',
			timestamp: `2026-10-01T10:00:${at}Z`,
			message: {content: [{type: 'tool_use', id: at, name: 'Bash', input: {command}}]},
			...fields,
		});

	test('reads the main-thread steps in the window, a repeat collapsed, with the skills loaded at each', async () => {
		const file = path.join(dir, 'a.jsonl');
		await writeFile(
			file,
			[
				step('00', 'git status'),
				step('01', 'git add a'),
				JSON.stringify({type: 'user', message: {content: '<command-name>/git-commit:commit</command-name>'}}),
				JSON.stringify({type: 'user', isMeta: true, message: {content: 'Base directory for this skill: /s'}}),
				step('02', 'git add b'),
				step('03', 'git push', {isSidechain: true}),
				step('04', 'git commit -m x'),
				step('05', 'git status', {timestamp: undefined}),
			].join('\n'),
		);

		expect(await sessionSteps(file, Date.parse('2026-10-01T10:00:01Z'), '/w')).toStrictEqual({
			session: 's1',
			project: '/w',
			at: '2026-10-01T10:00:04Z',
			steps: ['git add', 'git commit'],
			skills: [[], ['git-commit:commit']],
			loaded: ['git-commit:commit'],
		});
	});

	test('reads nothing from an SDK session', async () => {
		const file = path.join(dir, 'sdk.jsonl');
		await writeFile(file, step('00', 'git status', {entrypoint: 'sdk-ts'}));

		expect(await sessionSteps(file, 0, '/w')).toBeUndefined();
	});
});

describe('recurringProcedures', () => {
	const session = (id: string, steps: readonly string[], skills: readonly string[] = []): SessionSteps => ({
		session: id,
		project: '/w',
		at: '2026-10-01T00:00:00Z',
		steps,
		skills: steps.map(() => skills),
		loaded: skills,
	});
	const sessions = (count: number, steps: readonly string[], skills: readonly string[] = []): SessionSteps[] =>
		Array.from({length: count}, (_, i) => session(`${steps.join(',')}-${i}`, steps, skills));

	test('reports a run in enough sessions with the skill loaded more often there than elsewhere', () => {
		const procedures = recurringProcedures(
			[
				...sessions(6, ['git add', 'git commit', 'git push'], ['git-commit:commit', 'coding']),
				...sessions(6, ['vp check', 'vp test'], ['coding']),
			],
			6,
			10,
		);

		expect(procedures).toStrictEqual([
			{
				id: 'procedure:git add > git commit > git push',
				projects: ['/w'],
				at: '2026-10-01T00:00:00Z',
				signal: 'procedure',
				text: 'git add > git commit > git push',
				sessions: 6,
				skills: ['git-commit:commit'],
			},
		]);
	});

	test('reports no skill that every session loads', () => {
		const procedures = recurringProcedures(sessions(10, ['git add', 'git commit', 'git push'], ['coding']), 6, 10);

		expect(procedures.map(({skills}) => skills)).toStrictEqual([[]]);
	});

	test('credits a skill loaded before a later occurrence of the run in the same session', () => {
		const repeated = Array.from({length: 6}, (_, i): SessionSteps => {
			const steps = ['git add', 'git commit', 'git push', `step ${i}`, 'git add', 'git commit', 'git push'];
			return {
				...session(`r${i}`, steps),
				skills: [
					[],
					[],
					[],
					['git-commit:commit'],
					['git-commit:commit'],
					['git-commit:commit'],
					['git-commit:commit'],
				],
				loaded: ['git-commit:commit'],
			};
		});
		const procedures = recurringProcedures(
			[...repeated, ...sessions(6, ['make lint', 'make test', 'make build'])],
			6,
			10,
		);

		expect(procedures.map(({text, sessions: count, skills}) => [text, count, skills])).toStrictEqual([
			['git add > git commit > git push', 6, ['git-commit:commit']],
			['make lint > make test > make build', 6, []],
		]);
	});

	test('skips a run in too few sessions and a run that adds no step a reported run lacks', () => {
		const procedures = recurringProcedures(
			[
				...sessions(7, ['git add', 'git commit', 'git log', 'git push']),
				...sessions(6, ['git log', 'git add', 'git commit']),
				...sessions(6, ['git push', 'gh pr', 'gh run']),
				...sessions(5, ['make lint', 'make test', 'make build']),
			],
			6,
			10,
		);

		expect(procedures.map(({text, sessions: count}) => [text, count])).toStrictEqual([
			['git add > git commit > git log > git push', 7],
			['git push > gh pr > gh run', 6],
		]);
	});

	test('reports at most the limit', () => {
		const procedures = recurringProcedures(
			[...sessions(6, ['a x', 'b x', 'c x']), ...sessions(6, ['d x', 'e x', 'f x'])],
			6,
			1,
		);

		expect(procedures).toHaveLength(1);
	});
});
