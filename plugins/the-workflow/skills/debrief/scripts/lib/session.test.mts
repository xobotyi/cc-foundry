import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vite-plus/test';
import type {ToolErrorOccurrence} from './errors.mts';
import {type Correction, sessionCandidates} from './session.mts';

type Line = Readonly<Record<string, unknown>>;

const human = (at: string, text: string, fields: Line = {}): Line => ({
	type: 'user',
	origin: {kind: 'human'},
	timestamp: `2026-10-01T10:00:${at}Z`,
	message: {role: 'user', content: text},
	...fields,
});
const call = (at: string, id: string, command: string): Line => ({
	type: 'assistant',
	timestamp: `2026-10-01T10:00:${at}Z`,
	message: {role: 'assistant', content: [{type: 'tool_use', id, name: 'Bash', input: {command}}]},
});
const result = (at: string, id: string, text: string, isError: boolean): Line => ({
	type: 'user',
	timestamp: `2026-10-01T10:00:${at}Z`,
	message: {role: 'user', content: [{type: 'tool_result', tool_use_id: id, is_error: isError, content: text}]},
});
const REJECTED = "The user doesn't want to proceed with this tool use. The tool use was rejected.";
const said = (at: string, text: string): Line => ({
	type: 'assistant',
	timestamp: `2026-10-01T10:00:${at}Z`,
	message: {role: 'assistant', content: [{type: 'text', text}]},
});

let dir = '';
let files = 0;

beforeAll(async () => {
	dir = await mkdtemp(path.join(tmpdir(), 'debrief-session-'));
});

afterAll(async () => {
	await rm(dir, {recursive: true, force: true});
});

async function candidatesOf(entries: readonly Line[]): Promise<Array<Correction | ToolErrorOccurrence>> {
	files += 1;
	const file = path.join(dir, `${files}.jsonl`);
	await writeFile(file, entries.map((entry) => JSON.stringify(entry)).join('\n'));
	const candidates: Array<Correction | ToolErrorOccurrence> = [];
	for await (const candidate of sessionCandidates(file, 0)) {
		candidates.push(candidate);
	}
	return candidates;
}

describe('sessionCandidates', () => {
	test('keeps the end of a long agent message, where its question sits', async () => {
		const message = `${'x'.repeat(700)} Proceed with the rename?`;
		const [candidate] = await candidatesOf([human('00', 'open'), said('01', message), human('02', 'yes')]);

		expect(candidate).toMatchObject({signal: 'follow-up', said: `…${message.slice(-600)}`});
	});

	test('skips a prompt the user accepted from the CLI suggestion, which still ends the turn', async () => {
		const candidates = await candidatesOf([
			human('00', 'open'),
			said('01', 'Tests pass.'),
			human('02', 'commit it', {promptSource: 'suggestion_accepted'}),
			said('03', 'Committed.'),
			human('04', 'no, amend instead', {promptSource: 'typed'}),
		]);

		expect(candidates).toStrictEqual([
			expect.objectContaining({signal: 'follow-up', text: 'no, amend instead', said: 'Committed.'}),
		]);
	});

	test('reads a rewind to a reworded prompt as a rewind, and a retyped one as no candidate', async () => {
		const asked = 'rename the config loader to settings loader please';
		const afterRewind = async (first: string, second: string): Promise<string[][]> => {
			const candidates = await candidatesOf([
				human('00', 'open', {parentUuid: 'root'}),
				said('01', 'Ready.'),
				human('02', first, {parentUuid: 'p'}),
				said('03', 'Renamed.'),
				human('04', second, {parentUuid: 'p'}),
			]);
			return candidates.map(({signal, text}) => [signal, text]);
		};
		const pasted = 'x '.repeat(1100);

		expect(await afterRewind(asked, 'keep the config loader and add a settings alias')).toStrictEqual([
			['follow-up', asked],
			['rewind', 'keep the config loader and add a settings alias'],
		]);
		expect(await afterRewind(asked, 'rename the config loader to the settings loader please')).toStrictEqual([
			['follow-up', asked],
		]);
		const long = await afterRewind(`${pasted}${'alpha '.repeat(300)}`, `${pasted}${'beta '.repeat(300)}`);

		expect(long.map(([signal]) => signal)).toStrictEqual(['follow-up', 'rewind']);
	});

	test('reads a prompt sent within a second of a rejection as an interjection', async () => {
		const signalAfter = async (rejected: string, prompted: string): Promise<string | undefined> => {
			const [candidate] = await candidatesOf([
				human('00', 'open'),
				call('01', 't1', 'git push'),
				result(rejected, 't1', REJECTED, true),
				human(prompted, 'what does the review say?'),
			]);
			return candidate?.signal;
		};

		expect(await signalAfter('02.100', '02.400')).toBe('interjection');
		expect(await signalAfter('02', '05')).toBe('rejection');
	});
});
