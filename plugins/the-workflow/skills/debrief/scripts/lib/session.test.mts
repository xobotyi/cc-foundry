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
});
