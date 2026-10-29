import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vite-plus/test';
import type {ToolErrorOccurrence} from './errors.mts';
import {isObject, type Json, listOf, parseJson} from './json.mts';
import {LoadedContext} from './loaded.mts';
import {type CompactionLoss, type Correction, type Retraction, sessionCandidates} from './session.mts';

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

async function loadedPaths(candidate: Correction | Retraction | CompactionLoss | ToolErrorOccurrence): Promise<Json[]> {
	const set = parseJson(await readFile('loaded' in candidate ? String(candidate.loaded) : '', 'utf8'));
	return listOf(isObject(set) ? set.files : undefined).map((file) => (isObject(file) ? (file.path ?? null) : null));
}

async function candidatesOf(
	entries: readonly Line[],
	context?: LoadedContext,
	name = `${files + 1}`,
): Promise<Array<Correction | Retraction | CompactionLoss | ToolErrorOccurrence>> {
	files += 1;
	const file = path.join(dir, `${name}.jsonl`);
	await writeFile(file, entries.map((entry) => JSON.stringify(entry)).join('\n'));
	const candidates: Array<Correction | Retraction | CompactionLoss | ToolErrorOccurrence> = [];
	for await (const candidate of sessionCandidates(file, 0, context)) {
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

	test('names the instruction files in context at each correction, nested ones until a compaction', async () => {
		const context = new LoadedContext(path.join(dir, 'context'));
		const root = {type: 'Project', path: '/work/CLAUDE.md', content: '# Work'};
		const rule = {type: 'Project', path: '/work/api/CLAUDE.md', content: '# API'};
		const candidates = await candidatesOf(
			[
				{type: 'attachment', attachment: {type: 'instructions', files: [root]}},
				human('00', 'open'),
				{type: 'attachment', attachment: {type: 'nested_memory', path: rule.path, content: rule}},
				human('01', 'before compaction'),
				{type: 'system', subtype: 'compact_boundary'},
				human('02', 'after compaction'),
			],
			context,
		);
		await context.write();

		expect(await Promise.all(candidates.map(async (candidate) => loadedPaths(candidate)))).toStrictEqual([
			['/work/CLAUDE.md', '/work/api/CLAUDE.md'],
			['/work/CLAUDE.md'],
		]);
	});

	test('names no instruction set when the extraction collects none', async () => {
		const [candidate] = await candidatesOf([
			{type: 'attachment', attachment: {type: 'instructions', files: [{path: '/w/CLAUDE.md', content: 'x'}]}},
			human('00', 'open'),
			human('01', 'fix'),
		]);

		expect(candidate).not.toHaveProperty('loaded', expect.anything());
	});

	test('reads a command that hit a shell trap as a tool error, fixed by the next command that ran', async () => {
		const candidates = await candidatesOf([
			human('00', 'open'),
			call('01', 'b1', 'ls docs/*.md'),
			result('02', 'b1', 'Exit code 1\n(eval):1: no matches found: docs/*.md', true),
			call('03', 'b2', 'npm test'),
			result('04', 'b2', 'Exit code 1\nFAIL src/a.test.ts', true),
			call('05', 'b3', "ls docs | rg '\\.md$'"),
			result('06', 'b3', 'a.md', false),
		]);

		expect(candidates).toStrictEqual([
			expect.objectContaining({
				signal: 'tool-error',
				signature: 'Bash: zsh-nomatch',
				text: '(eval):1: no matches found: docs/*.md',
				did: ['Bash ls docs/*.md'],
				fix: "Bash ls docs | rg '\\.md$'",
			}),
		]);
	});

	test('reads a shell trap in a command that exited 0 as a tool error', async () => {
		const candidates = await candidatesOf([
			human('00', 'open'),
			call('01', 'b1', 'ls *.txt; echo done'),
			result('02', 'b1', '(eval):1: no matches found: *.txt\ndone', false),
		]);

		expect(candidates).toStrictEqual([
			expect.objectContaining({
				signal: 'tool-error',
				signature: 'Bash: zsh-nomatch',
				did: ['Bash ls *.txt; echo done'],
			}),
		]);
	});

	test('reads an agent message that withdraws its own claim from the line that says so', async () => {
		const candidates = await candidatesOf([
			human('00', 'open'),
			call('01', 'b1', 'npm test -- --once'),
			said('02', 'Ran the suite.\n\nCorrection: the flag is `--run`; I was wrong about `--once`.\n\nRerunning.'),
			said('03', 'All the correction candidates are listed.'),
		]);

		expect(candidates).toStrictEqual([
			expect.objectContaining({
				signal: 'retraction',
				text: 'Correction: the flag is `--run`; I was wrong about `--once`.\n\nRerunning.',
				did: ['Bash npm test -- --once'],
			}),
		]);
	});

	test("groups the agent's reads of its own transcript after each compaction", async () => {
		const own = '/home/.claude/projects/-work/f00d.jsonl';
		const candidates = await candidatesOf(
			[
				human('00', 'open'),
				call('01', 'b1', `rg -c . ${own}`),
				{type: 'system', subtype: 'compact_boundary'},
				call('02', 'b2', `rg -n "notify" ${own}`),
				call('03', 'b3', 'rg -n "notify" /home/.claude/projects/-work/other.jsonl'),
				{type: 'system', subtype: 'compact_boundary'},
				call('04', 'b4', `jq -r .uuid ${own} | tail -1`),
				call('05', 'b5', `rg -n "push" ${own}`),
			],
			undefined,
			'f00d',
		);

		expect(candidates).toStrictEqual([
			expect.objectContaining({signal: 'compaction-loss', text: 'Bash rg -n "notify" <transcript>', count: 1}),
			expect.objectContaining({
				signal: 'compaction-loss',
				text: 'Bash jq -r .uuid <transcript> | tail -1\nBash rg -n "push" <transcript>',
				count: 2,
			}),
		]);
	});
});
