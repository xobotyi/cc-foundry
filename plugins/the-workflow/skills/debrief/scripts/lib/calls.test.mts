import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vite-plus/test';
import {type CallFilter, type RecordedCall, recordedCalls} from './calls.mts';

type Line = Readonly<Record<string, unknown>>;

const call = (at: string, id: string, command: string, fields: Line = {}): Line => ({
	type: 'assistant',
	sessionId: 's1',
	cwd: '/w',
	timestamp: `2026-10-01T10:00:${at}Z`,
	message: {content: [{type: 'tool_use', id, name: 'Bash', input: {command}}]},
	...fields,
});
const result = (id: string, text: string, isError: boolean): Line => ({
	type: 'user',
	sessionId: 's1',
	message: {content: [{type: 'tool_result', tool_use_id: id, is_error: isError, content: text}]},
});

let dir = '';

beforeAll(async () => {
	dir = await mkdtemp(path.join(tmpdir(), 'debrief-calls-'));
});

afterAll(async () => {
	await rm(dir, {recursive: true, force: true});
});

async function callsOf(
	name: string,
	entries: readonly Line[],
	filter: CallFilter,
	options: {readonly since?: number; readonly seen?: Set<string>} = {},
): Promise<RecordedCall[]> {
	const file = path.join(dir, `${name}.jsonl`);
	await writeFile(file, entries.map((entry) => JSON.stringify(entry)).join('\n'));
	const calls: RecordedCall[] = [];
	for await (const recorded of recordedCalls(file, options.since ?? 0, '/w', filter, options.seen ?? new Set())) {
		calls.push(recorded);
	}
	return calls;
}

describe('recordedCalls', () => {
	test('reads each call of the tool with its input and how it ended', async () => {
		const calls = await callsOf(
			'outcomes',
			[
				call('00', 'a', 'git push'),
				result('a', "The user doesn't want to proceed with this tool use. The tool use was rejected.", true),
				call('01', 'b', 'git push --force'),
				result('b', 'Exit code 1\nrejected', true),
				call('02', 'c', 'git status'),
				result('c', 'clean', false),
				call('03', 'd', 'git push origin'),
			],
			{tool: 'Bash', match: undefined},
		);

		expect(calls.map(({id, outcome}) => [id, outcome])).toStrictEqual([
			['a', 'rejected'],
			['b', 'error'],
			['c', 'ok'],
			['d', 'unanswered'],
		]);
		expect(calls[0]).toStrictEqual({
			id: 'a',
			session: 's1',
			at: '2026-10-01T10:00:00Z',
			project: '/w',
			cwd: '/w',
			transcript: path.join(dir, 'outcomes.jsonl'),
			tool: 'Bash',
			input: {command: 'git push'},
			outcome: 'rejected',
		});
	});

	test('reads only the calls whose input matches, in the window, on the main thread', async () => {
		const calls = await callsOf(
			'filtered',
			[
				call('00', 'a', 'git push'),
				call('01', 'b', 'git push --force'),
				call('02', 'c', 'git status'),
				call('03', 'd', 'git push --force', {isSidechain: true}),
			],
			{tool: 'Bash', match: 'push'},
			{since: Date.parse('2026-10-01T10:00:01Z')},
		);

		expect(calls.map(({id}) => id)).toStrictEqual(['b']);
	});

	test('skips a call a resumed session copied', async () => {
		const seen = new Set<string>();
		await callsOf('first', [call('00', 'a', 'git push')], {tool: 'Bash', match: undefined}, {seen});
		const copied = await callsOf(
			'second',
			[call('00', 'a', 'git push'), call('01', 'b', 'git push')],
			{tool: 'Bash', match: undefined},
			{seen},
		);

		expect(copied.map(({id}) => id)).toStrictEqual(['b']);
	});
});
