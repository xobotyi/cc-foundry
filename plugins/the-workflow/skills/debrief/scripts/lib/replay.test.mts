import {mkdir, mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vite-plus/test';
import {exists} from './files.mts';
import {isObject, type Json, listOf, parseJson} from './json.mts';
import {
	buildCopy,
	diskInstructions,
	editRendered,
	type InstructionEdit,
	instructionEdits,
	locateTurn,
	replayArgs,
	runArms,
	shamEdits,
	stopHookOutput,
	summarizeRun,
} from './replay.mts';

type Line = Readonly<Record<string, unknown>>;

const USER_MD = '/home/u/.claude/CLAUDE.md';
const REPO_MD = '/w/repo/CLAUDE.md';
const MEMORY_MD = '/home/u/.claude/projects/w-repo/memory/MEMORY.md';
const NESTED_MD = '/w/repo/pkg/CLAUDE.md';
const RENDERED = [
	'<system-reminder>',
	'Codebase and user instructions are shown below.',
	'',
	`Contents of ${USER_MD} (user's private global instructions for all projects):`,
	'',
	'# Rules',
	'- answer in English',
	'',
	`Contents of ${REPO_MD} (project instructions, checked into the codebase):`,
	'',
	'# Repo',
	'- use npm',
	'',
	`Contents of ${MEMORY_MD} (user's auto-memory, persists across conversations):`,
	'',
	'- prefers short answers',
	'</system-reminder>',
].join('\n');

const entry = (uuid: string, parentUuid: string | undefined, fields: Line): Line => ({
	uuid,
	parentUuid,
	sessionId: 's1',
	cwd: '/w/repo',
	timestamp: '2026-10-01T10:00:00Z',
	...fields,
});
const typed = (uuid: string, parent: string | undefined, text: string): Line =>
	entry(uuid, parent, {type: 'user', origin: {kind: 'human'}, message: {role: 'user', content: text}});
const usage = {input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5};
const said = (uuid: string, parent: string | undefined, text: string): Line =>
	entry(uuid, parent, {
		type: 'assistant',
		message: {role: 'assistant', model: 'claude-opus-5-5', usage, content: [{type: 'text', text}]},
	});
const ran = (uuid: string, parent: string, id: string, command: string): Line =>
	entry(uuid, parent, {
		type: 'assistant',
		message: {
			role: 'assistant',
			model: 'claude-opus-5-5',
			usage,
			content: [{type: 'tool_use', id, name: 'Bash', input: {command}}],
		},
	});
const result = (uuid: string, parent: string, id: string): Line =>
	entry(uuid, parent, {
		type: 'user',
		message: {role: 'user', content: [{type: 'tool_result', tool_use_id: id, content: 'ok'}]},
	});
const instructions = (uuid: string, parent: string | undefined, fields: Line, rendered: string): Line =>
	entry(uuid, parent, {
		type: 'attachment',
		attachment: {type: 'instructions', ...fields},
		rendered: [{content: rendered}],
		renderedRole: 'user',
	});

const SESSION: readonly Line[] = [
	instructions(
		'a0',
		undefined,
		{
			files: [
				{type: 'User', path: USER_MD, content: '# Rules\n- answer in English'},
				{type: 'Project', path: REPO_MD, content: '# Repo\n- use npm'},
				{type: 'AutoMem', path: MEMORY_MD, content: '- prefers short answers'},
			],
		},
		RENDERED,
	),
	{type: 'api-request', uuid: 'q0', request: {}},
	typed('p0', 'a0', 'hello'),
	said('m0', 'p0', 'Hi.'),
	typed('p1', 'm0', 'install deps'),
	instructions(
		'd1',
		'p1',
		{
			changed: true,
			reason: 'compaction',
			removed: [USER_MD],
			files: [{type: 'Project', path: REPO_MD, content: '# Repo\n- use yarn'}],
		},
		`<system-reminder>\nContents of ${REPO_MD} (project instructions):\n\n# Repo\n- use yarn\n</system-reminder>`,
	),
	entry('n1', 'd1', {
		type: 'attachment',
		attachment: {
			type: 'nested_memory',
			path: NESTED_MD,
			content: {path: NESTED_MD, type: 'Project', content: '- lint the package'},
		},
		rendered: [{content: `<system-reminder>\nContents of ${NESTED_MD}:\n\n- lint the package\n</system-reminder>`}],
	}),
	said('m1', 'n1', 'Installing.'),
	ran('m2', 'm1', 't1', 'npm install'),
	result('r1', 'm2', 't1'),
	said('m3', 'r1', 'Installed.'),
	typed('p2', 'm3', 'use yarn, not npm'),
	ran('m4', 'p2', 't2', 'yarn install'),
	entry('i1', 'm4', {
		type: 'user',
		message: {role: 'user', content: [{type: 'text', text: '[Request interrupted by user for tool use]'}]},
	}),
	typed('p3', 'i1', 'stop'),
	typed('p4', 'm3', 'try again'),
	said('m5', 'p4', 'Retrying.'),
	entry('c1', 'm5', {type: 'user', message: {role: 'user', content: '<command-name>/release</command-name>'}}),
	entry('k1', 'c1', {
		type: 'user',
		isMeta: true,
		message: {role: 'user', content: 'Base directory for this skill: /x'},
	}),
	ran('m6', 'k1', 't3', 'gh release create'),
	typed('p5', 'm6', 'not yet'),
	said('m7', 'lost', 'Continuing.'),
	typed('p6', 'm7', 'wrong file'),
	typed('p7', 'm3', 'third try'),
	entry('x1', 'm4', {type: 'assistant', isSidechain: true, message: {role: 'assistant', content: []}}),
];

let dir = '';
let transcript = '';

beforeAll(async () => {
	dir = await mkdtemp(path.join(tmpdir(), 'debrief-replay-'));
	transcript = path.join(dir, 's1.jsonl');
	await writeFile(transcript, `${SESSION.map((line) => JSON.stringify(line)).join('\n')}\n`);
});

afterAll(async () => {
	await rm(dir, {recursive: true, force: true});
});

describe('instructionEdits', () => {
	test('reads a list of edits, the anchor optional for append', () => {
		expect(
			instructionEdits([
				{path: REPO_MD, op: 'append', text: '- never pnpm'},
				{path: REPO_MD, op: 'insert_after', anchor: '- use npm', text: '\n- never pnpm'},
			]),
		).toStrictEqual([
			{path: REPO_MD, op: 'append', anchor: '', text: '- never pnpm'},
			{path: REPO_MD, op: 'insert_after', anchor: '- use npm', text: '\n- never pnpm'},
		]);
	});

	test.each([
		['an unknown op', {path: REPO_MD, op: 'replace', anchor: 'a', text: 'b'}],
		['an insert without an anchor', {path: REPO_MD, op: 'insert_before', text: 'b'}],
		['an edit without a path', {op: 'append', text: 'b'}],
	])('rejects %s', (_name, edit) => {
		expect(() => instructionEdits([edit])).toThrow('edit 1: expected {path, op');
	});
});

describe('editRendered', () => {
	const apply = (edit: Omit<InstructionEdit, 'path'>, file = REPO_MD): ReturnType<typeof editRendered> =>
		editRendered(RENDERED, {path: file, ...edit});

	test('appends to the end of a file section, before the next one', () => {
		const {text, hit} = apply({op: 'append', anchor: '', text: '\n- never pnpm\n'});

		expect(hit).toBe(true);
		expect(text).toContain(`- use npm\n\n- never pnpm\n\nContents of ${MEMORY_MD}`);
	});

	test('appends to the last section, before the closing tag', () => {
		const {text} = apply({op: 'append', anchor: '', text: '- likes tables'}, MEMORY_MD);

		expect(text).toMatch(/- prefers short answers\n\n- likes tables<\/system-reminder>$/);
	});

	test('inserts at the anchor inside the file section, the text taken literally', () => {
		expect(apply({op: 'insert_after', anchor: '# Repo', text: '\n- $& stays'}).text).toContain('# Repo\n- $& stays\n');
		expect(apply({op: 'insert_before', anchor: '- use npm', text: '- lint first\n'}).text).toContain(
			'- lint first\n- use npm',
		);
	});

	test('removes the anchor from the file section', () => {
		expect(apply({op: 'remove', anchor: '\n- use npm', text: ''}).text).toContain('# Repo\n\nContents of');
	});

	test('misses an anchor that only another file section holds', () => {
		expect(apply({op: 'remove', anchor: '- answer in English', text: ''})).toStrictEqual({text: RENDERED, hit: false});
	});

	test('misses a file the block does not hold', () => {
		expect(apply({op: 'append', anchor: '', text: 'x'}, '/w/other/CLAUDE.md').hit).toBe(false);
	});
});

describe('shamEdits', () => {
	test('puts one newline before the first edited file section', () => {
		const sham = shamEdits([
			{path: REPO_MD, op: 'append', anchor: '', text: '- never pnpm'},
			{path: USER_MD, op: 'append', anchor: '', text: '- be brief'},
		]);
		const applied = sham.map((edit) => editRendered(RENDERED, edit));

		expect(applied).toStrictEqual([
			{text: RENDERED.replace(`\nContents of ${REPO_MD}`, `\n\nContents of ${REPO_MD}`), hit: true},
		]);
	});
});

describe('locateTurn', () => {
	test('replays a follow-up at the prompt before it, resuming at the message before that prompt', async () => {
		await expect(locateTurn(transcript, 'p2')).resolves.toStrictEqual({
			file: transcript,
			cwd: '/w/repo',
			model: 'claude-opus-5-5',
			context: 1110,
			resumeAt: 'm0',
			prompt: 'install deps',
			steps: 3,
			original: [{text: 'Installing.'}, {tool: 'Bash', input: '{"command":"npm install"}'}],
		});
	});

	test('passes the entry an interrupt leaves', async () => {
		await expect(locateTurn(transcript, 'p3')).resolves.toMatchObject({
			resumeAt: 'm3',
			prompt: 'use yarn, not npm',
			steps: 1,
			original: [{tool: 'Bash', input: '{"command":"yarn install"}'}],
		});
	});

	test('replays the turn a rewind replaced', async () => {
		await expect(locateTurn(transcript, 'p4')).resolves.toMatchObject({
			resumeAt: 'm3',
			prompt: 'use yarn, not npm',
			steps: 1,
		});
	});

	test('replays the nearest prompt a rewind replaced when several share its parent', async () => {
		await expect(locateTurn(transcript, 'p7')).resolves.toMatchObject({resumeAt: 'm3', prompt: 'try again'});
	});

	test("reads a tool error's entry uuid from its id", async () => {
		await expect(locateTurn(transcript, 'r1/t1')).resolves.toMatchObject({prompt: 'install deps', steps: 2});
	});

	test.each([
		['a command', 'p5', 'the turn it corrects opens with <command-name>/release</command-name>, not a typed prompt'],
		['a broken chain', 'p6', 'the turn it corrects opens with a compaction or the session start'],
		['a prompt with no message before it', 'm0', 'no message precedes the prompt that opens its turn'],
		['an unknown entry', 'zz', 'zz: no such entry'],
	])('refuses a turn opened by %s', async (_name, id, message) => {
		await expect(locateTurn(transcript, id)).rejects.toThrow(message);
	});
});

describe('diskInstructions', () => {
	test("covers every ancestor's project files, the user layer, and the tree below the working directory", () => {
		const patterns = diskInstructions('/w/repo', '/home/u');

		expect(patterns).toStrictEqual([
			'/w/repo/CLAUDE.md',
			'/w/repo/CLAUDE.local.md',
			'/w/repo/.claude/CLAUDE.md',
			'/w/repo/.claude/rules/**',
			'/w/CLAUDE.md',
			'/w/CLAUDE.local.md',
			'/w/.claude/CLAUDE.md',
			'/w/.claude/rules/**',
			'/CLAUDE.md',
			'/CLAUDE.local.md',
			'/.claude/CLAUDE.md',
			'/.claude/rules/**',
			'/home/u/.claude/CLAUDE.md',
			'/home/u/.claude/rules/**',
			'/w/repo/**',
		]);
	});

	test('lists the user layer once when the home directory is an ancestor', () => {
		const patterns = diskInstructions('/home/u/repo', '/home/u');

		expect(patterns.filter((pattern) => pattern === '/home/u/.claude/CLAUDE.md')).toHaveLength(1);
	});
});

describe('buildCopy', () => {
	const edits: InstructionEdit[] = [{path: REPO_MD, op: 'insert_after', anchor: '- use npm', text: '\n- never pnpm'}];

	const build = async (name: string, changes = edits): ReturnType<typeof buildCopy> =>
		buildCopy({
			source: transcript,
			dir: path.join(dir, name),
			edits: changes,
			resumeAt: 'm1',
			cwd: '/w/repo',
			home: '/home/u',
			disabledPlugins: ['observer@market'],
			hookCommand: "'node' 'replay.mts' 'stop-hook'",
		});
	const linesOf = async (file: string): Promise<Json[]> => {
		const text = await readFile(file, 'utf8');
		return text
			.trimEnd()
			.split('\n')
			.map((line) => parseJson(line));
	};
	const field = (value: Json | undefined, key: string): Json | undefined => (isObject(value) ? value[key] : undefined);

	test('cuts the copy after the resume entry and drops recorded API requests', async () => {
		const {copy} = await build('cut');
		const lines = await linesOf(copy);

		expect(path.basename(copy)).toBe('s1.jsonl');
		expect(lines.map((line) => field(line, 'uuid'))).toStrictEqual(['a0', 'p0', 'm0', 'p1', 'd1', 'n1', 'm1']);
	});

	test('edits the rendered text and points the recorded files at scratch copies', async () => {
		const target = path.join(dir, 'remap');
		const {copy, addDirs} = await build('remap');
		const lines = await linesOf(copy);
		const first = lines[0];
		const delta = lines[4];
		const files = (line: Json | undefined): unknown[] =>
			listOf(field(field(line, 'attachment'), 'files')).map((file) => [field(file, 'type'), field(file, 'path')]);

		expect(field(listOf(field(first, 'rendered'))[0], 'content')).toBe(
			RENDERED.replace('- use npm', '- use npm\n- never pnpm'),
		);
		expect(files(first)).toStrictEqual([
			['Project', path.join(target, 'ctx/0/CLAUDE.md')],
			['Project', path.join(target, 'ctx/1/CLAUDE.md')],
			['AutoMem', path.join(target, 'memory/MEMORY.md')],
		]);
		expect(files(delta)).toStrictEqual([['Project', path.join(target, 'ctx/1/CLAUDE.md')]]);
		expect(field(field(delta, 'attachment'), 'removed')).toStrictEqual([path.join(target, 'ctx/0/CLAUDE.md')]);
		expect(addDirs).toStrictEqual([path.join(target, 'ctx/0'), path.join(target, 'ctx/1')]);
	});

	test('edits the rendered text of a nested file the session loaded', async () => {
		const {copy} = await build('nested', [{path: NESTED_MD, op: 'append', anchor: '', text: '- never pnpm'}]);
		const lines = await linesOf(copy);

		expect(field(listOf(field(lines[5], 'rendered'))[0], 'content')).toBe(
			`<system-reminder>\nContents of ${NESTED_MD}:\n\n- lint the package\n\n- never pnpm</system-reminder>`,
		);
	});

	test('writes each scratch copy with the text the session last recorded for it', async () => {
		const target = path.join(dir, 'scratch');
		await build('scratch');

		await expect(readFile(path.join(target, 'ctx/0/CLAUDE.md'), 'utf8')).resolves.toBe('# Rules\n- answer in English');
		await expect(readFile(path.join(target, 'ctx/1/CLAUDE.md'), 'utf8')).resolves.toBe('# Repo\n- use yarn');
		await expect(readFile(path.join(target, 'memory/MEMORY.md'), 'utf8')).resolves.toBe('- prefers short answers');
	});

	test('writes settings that exclude the files on disk and stop the run at its first action', async () => {
		const target = path.join(dir, 'settings');
		const {settings} = await build('settings');
		const written = parseJson(await readFile(settings, 'utf8'));
		const excludes = listOf(field(written, 'claudeMdExcludes'));

		expect(excludes.slice(0, 2)).toStrictEqual([USER_MD, REPO_MD]);
		expect(excludes).toContain('/w/repo/**');
		expect(excludes).not.toContain(MEMORY_MD);
		expect(field(written, 'autoMemoryDirectory')).toBe(path.join(target, 'memory'));
		expect(field(written, 'enabledPlugins')).toStrictEqual({'observer@market': false});
		expect(field(written, 'permissions')).toStrictEqual({allow: ['Skill', 'ToolSearch']});
		expect(field(written, 'hooks')).toStrictEqual({
			PreToolUse: [{matcher: '*', hooks: [{type: 'command', command: "'node' 'replay.mts' 'stop-hook'"}]}],
		});
	});

	test('refuses an edit that matches no rendered section, writing nothing', async () => {
		await expect(
			build('missed', [...edits, {path: REPO_MD, op: 'remove', anchor: '- use pnpm', text: ''}]),
		).rejects.toThrow(
			`edits that match no rendered section, for a file the session never loaded or text it lacks: remove in ${REPO_MD}`,
		);
		await expect(exists(path.join(dir, 'missed'))).resolves.toBe(false);
	});
});

describe('replayArgs', () => {
	const point = {
		file: transcript,
		cwd: '/w/repo',
		model: 'claude-opus-5-5',
		context: 1110,
		resumeAt: 'm0',
		prompt: 'install deps',
		steps: 3,
		original: [],
	};
	const copy = {copy: '/r/s1.jsonl', settings: '/r/settings.json', addDirs: ['/r/ctx/0', '/r/ctx/1']};

	test('resumes the copy at the replay point, sends the prompt, and persists nothing', () => {
		expect(replayArgs({copy, point, model: 'claude-opus-5-5', effort: 'xhigh'})).toStrictEqual([
			'-p',
			'install deps',
			'--resume',
			'/r/s1.jsonl',
			'--fork-session',
			'--resume-session-at',
			'm0',
			'--no-session-persistence',
			'--strict-mcp-config',
			'--permission-mode',
			'dontAsk',
			'--settings',
			'/r/settings.json',
			'--add-dir',
			'/r/ctx/0',
			'--add-dir',
			'/r/ctx/1',
			'--model',
			'claude-opus-5-5',
			'--effort',
			'xhigh',
			'--max-turns',
			'8',
			'--output-format',
			'stream-json',
			'--verbose',
		]);
	});

	test('leaves the model and effort to the CLI when none is given', () => {
		const args = replayArgs({copy, point, model: undefined, effort: undefined});

		expect(args).not.toContain('--model');
		expect(args).not.toContain('--effort');
	});
});

describe('stopHookOutput', () => {
	test('lets the instruction-loading tools run', () => {
		expect(stopHookOutput('Skill')).toBeUndefined();
		expect(stopHookOutput('ToolSearch')).toBeUndefined();
	});

	test('stops the turn at any other call', () => {
		expect(stopHookOutput('Bash')).toStrictEqual({
			continue: false,
			stopReason: 'replay stopped at its first action',
			hookSpecificOutput: {
				hookEventName: 'PreToolUse',
				permissionDecision: 'deny',
				permissionDecisionReason: 'replay: tools do not run',
			},
		});
	});
});

describe('summarizeRun', () => {
	const message = (id: string, content: Json, tokens: Json): string =>
		JSON.stringify({type: 'assistant', message: {id, content, usage: tokens}});

	test("reads each request's usage once and lists what the run said and did", () => {
		const stream = [
			JSON.stringify({type: 'system', subtype: 'init'}),
			message('msg1', [{type: 'text', text: 'Checking.'}], {...usage, output_tokens: 3}),
			message('msg1', [{type: 'tool_use', id: 't1', name: 'Skill', input: {skill: 'lint'}}], {
				...usage,
				output_tokens: 12,
			}),
			message('msg2', [{type: 'tool_use', id: 't2', name: 'Bash', input: {command: 'ls'}}], {
				input_tokens: 7,
				cache_read_input_tokens: 1100,
				output_tokens: 4,
			}),
			'not json',
			JSON.stringify({
				type: 'result',
				num_turns: 1,
				stop_reason: 'tool_use',
				usage: {output_tokens: 2976},
				permission_denials: [{tool_name: 'Bash'}],
			}),
		].join('\n');

		expect(summarizeRun(stream)).toStrictEqual({
			context: 1110,
			output: 2976,
			calls: 2,
			cacheWrite: 100,
			cacheRead: 2100,
			turns: 1,
			stop: 'tool_use',
			denied: ['Bash'],
			actions: [
				{text: 'Checking.'},
				{tool: 'Skill', input: '{"skill":"lint"}'},
				{tool: 'Bash', input: '{"command":"ls"}'},
			],
		});
	});

	test('falls back to the streamed output counts for a run that ended before its result', () => {
		const stream = [
			message('msg1', [{type: 'text', text: 'Checking.'}], {...usage, output_tokens: 3}),
			message('msg2', [{type: 'text', text: 'Still checking.'}], {...usage, output_tokens: 4}),
		].join('\n');

		expect(summarizeRun(stream)).toMatchObject({output: 7, calls: 2, turns: undefined, stop: undefined});
	});
});

describe('runArms', () => {
	test('runs every sample of every arm and summarizes each run', async () => {
		const fake = path.join(dir, 'fake-claude.mjs');
		await writeFile(
			fake,
			[
				'const args = process.argv.slice(2);',
				"const said = `${args[args.indexOf('-p') + 1]} ${process.env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD}`;",
				"const content = [{type: 'text', text: said}];",
				"console.log(JSON.stringify({type: 'assistant', message: {id: 'm', content}}));",
				"console.log(JSON.stringify({type: 'result', num_turns: 1}));",
			].join('\n'),
		);
		const arms = ['sham', 'rule'].map((name) => ({name, dir: path.join(dir, `arm-${name}`), args: ['-p', name]}));
		await Promise.all(arms.map(async (arm) => mkdir(arm.dir)));

		const runs = await runArms({arms, samples: 2, command: [process.execPath, fake], cwd: dir, timeoutMs: 10_000});

		expect(
			[...runs].map(([name, results]) => [
				name,
				results.map(({run, exit, actions}) => [path.basename(run), exit, actions]),
			]),
		).toStrictEqual([
			[
				'sham',
				[
					['run-1.jsonl', 0, [{text: 'sham 1'}]],
					['run-2.jsonl', 0, [{text: 'sham 1'}]],
				],
			],
			[
				'rule',
				[
					['run-1.jsonl', 0, [{text: 'rule 1'}]],
					['run-2.jsonl', 0, [{text: 'rule 1'}]],
				],
			],
		]);
		await expect(readdir(path.join(dir, 'arm-sham'))).resolves.toStrictEqual([
			'run-1.jsonl',
			'run-1.jsonl.err',
			'run-2.jsonl',
			'run-2.jsonl.err',
		]);
	});
});
