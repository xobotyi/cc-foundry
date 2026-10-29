import {spawnSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vite-plus/test';
import {type HookDecision, runHook, verdictOf} from './lib/hooks.mts';
import type {Json} from './lib/json.mts';
import {stopHookCommand} from './lib/replay.mts';
import {prepareArms, transcriptOf} from './replay.mts';

const SCRIPT = path.join(import.meta.dirname, 'replay.mts');

let dir = '';
let work = '';
let transcript = '';
let edits = '';

const entry = (uuid: string, parentUuid: string | undefined, fields: Readonly<Record<string, unknown>>): string =>
	JSON.stringify({uuid, parentUuid, sessionId: 's1', cwd: work, timestamp: '2026-10-01T10:00:00Z', ...fields});

beforeAll(async () => {
	dir = await mkdtemp(path.join(tmpdir(), 'debrief-replay-cli-'));
	work = path.join(dir, 'work');
	transcript = path.join(dir, 's1.jsonl');
	edits = path.join(dir, 'edits.json');
	const repoMd = path.join(work, 'CLAUDE.md');
	await mkdir(work);
	await writeFile(
		transcript,
		[
			entry('a0', undefined, {
				type: 'attachment',
				attachment: {type: 'instructions', files: [{type: 'Project', path: repoMd, content: '- use npm'}]},
				rendered: [{content: `<system-reminder>\nContents of ${repoMd} (project):\n\n- use npm\n</system-reminder>`}],
			}),
			entry('p0', 'a0', {type: 'user', origin: {kind: 'human'}, message: {content: 'hello'}}),
			entry('m0', 'p0', {
				type: 'assistant',
				message: {model: 'claude-opus-5-5', content: [{type: 'text', text: 'Hi.'}]},
			}),
			entry('p1', 'm0', {type: 'user', origin: {kind: 'human'}, message: {content: 'install deps'}}),
			entry('m1', 'p1', {
				type: 'assistant',
				message: {model: 'claude-opus-5-5', content: [{type: 'tool_use', id: 't1', name: 'Bash', input: {}}]},
			}),
			entry('p2', 'm1', {type: 'user', origin: {kind: 'human'}, message: {content: 'use yarn'}}),
		].join('\n'),
	);
	await writeFile(edits, JSON.stringify([{path: repoMd, op: 'append', text: '- never pnpm'}]));
});

afterAll(async () => {
	await rm(dir, {recursive: true, force: true});
});

describe('prepareArms', () => {
	const prepare = async (out: string): ReturnType<typeof prepareArms> =>
		prepareArms({
			transcript,
			entry: 'p2',
			edits,
			out,
			model: undefined,
			effort: undefined,
			disabledPlugins: [],
			home: path.join(dir, 'home'),
		});

	test('writes a control arm and an edited arm that resume at the corrected turn', async () => {
		const out = path.join(dir, 'arms');
		const {point, cwd, arms} = await prepare(out);
		const rule = await readFile(path.join(out, 'rule', 's1.jsonl'), 'utf8');
		const sham = await readFile(path.join(out, 'sham', 's1.jsonl'), 'utf8');

		expect(cwd).toBe(work);
		expect(point).toMatchObject({resumeAt: 'm0', prompt: 'install deps'});
		expect(arms.map(({name, dir: armDir}) => [name, armDir])).toStrictEqual([
			['sham', path.join(out, 'sham')],
			['rule', path.join(out, 'rule')],
		]);
		expect(arms[1]?.args.slice(0, 7)).toStrictEqual([
			'-p',
			'install deps',
			'--resume',
			path.join(out, 'rule', 's1.jsonl'),
			'--fork-session',
			'--resume-session-at',
			'm0',
		]);
		expect(arms[1]?.args).toContain('claude-opus-5-5');
		expect(rule).toContain(String.raw`- use npm\n\n- never pnpm`);
		expect(sham).toContain(String.raw`\n\nContents of`);
		expect(sham).not.toContain('never pnpm');
	});

	test('refuses an output directory inside the working directory the replay excludes', async () => {
		await expect(prepare(path.join(work, 'arms'))).rejects.toThrow(`lies inside ${work}`);
		await expect(prepare(path.join(work, '..cache', 'arms'))).rejects.toThrow(`lies inside ${work}`);
	});
});

describe('transcriptOf', () => {
	test('finds the one transcript a session id names in any project directory', async () => {
		const projects = path.join(dir, 'projects');
		await mkdir(path.join(projects, '-w-a'), {recursive: true});
		await mkdir(path.join(projects, '-w-b'), {recursive: true});
		await writeFile(path.join(projects, '-w-a', 's8.jsonl'), '');
		await writeFile(path.join(projects, '-w-b', 's9.jsonl'), '');

		await expect(transcriptOf(projects, 's9')).resolves.toBe(path.join(projects, '-w-b', 's9.jsonl'));
		await expect(transcriptOf(projects, 's7')).rejects.toThrow(`session s7: 0 transcripts under ${projects}`);
	});
});

describe('the command line', () => {
	test.each([
		['an unknown command', 'inspect'],
		['verify without edits', 'verify'],
	])('reports a usage error for %s before it looks up the session', (_name, command) => {
		const args = [SCRIPT, command, '--session', 's7', '--entry', 'p1', '--projects-dir', dir];
		const run = spawnSync(process.execPath, args, {encoding: 'utf8'});
		expect(run.stderr).toMatch(/^replay: usage:/);
		expect(run.status).toBe(2);
	});
});

describe('stop-hook', () => {
	const decide = async (payload: Json): Promise<HookDecision> => {
		const run = await runHook(stopHookCommand(process.execPath, SCRIPT), payload, {
			cwd: dir,
			projectDir: dir,
			timeoutMs: 10_000,
		});
		return verdictOf(run).decision;
	};

	test('lets an instruction-loading tool run', async () => {
		await expect(decide({hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: {}})).resolves.toBe('pass');
	});

	test('stops the run at any other tool call', async () => {
		await expect(decide({hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: {}})).resolves.toBe('stop');
	});

	test('stops the run on input it cannot read', async () => {
		await expect(decide('not a payload')).resolves.toBe('stop');
	});
});
