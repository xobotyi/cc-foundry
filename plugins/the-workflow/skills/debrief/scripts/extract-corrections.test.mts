import {mkdir, mkdtemp, rm, utimes, writeFile} from 'node:fs/promises';
import {homedir, tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, onTestFinished, test} from 'vite-plus/test';
import {
	extract,
	frontmatterValue,
	indexRow,
	lineNumbers,
	listProjects,
	parseSince,
	projectDirs,
	recurringErrors,
	type Candidate,
	type ExtractOptions,
} from './extract-corrections.mts';

type Line = Readonly<Record<string, unknown>>;

const PROJECT = '/work/acme.app';
const SLUG = '-work-acme-app';

const human = (at: string, text: unknown): Line => ({
	type: 'user',
	origin: {kind: 'human'},
	timestamp: at,
	sessionId: 's1',
	message: {role: 'user', content: text},
});
const assistant = (at: string, ...content: readonly Line[]): Line => ({
	type: 'assistant',
	timestamp: at,
	sessionId: 's1',
	message: {role: 'assistant', content},
});
const toolResult = (at: string, text: string, isError: boolean): Line => ({
	type: 'user',
	timestamp: at,
	sessionId: 's1',
	message: {role: 'user', content: [{type: 'tool_result', tool_use_id: 't1', is_error: isError, content: text}]},
});
const marker = (at: string, text: string): Line => ({
	type: 'user',
	timestamp: at,
	sessionId: 's1',
	message: {role: 'user', content: [{type: 'text', text}]},
});
const queued = (at: string, kind: string, prompt: unknown): Line => ({
	type: 'attachment',
	timestamp: at,
	sessionId: 's1',
	attachment: {type: 'queued_command', prompt, commandMode: 'prompt', origin: {kind}},
});
const unattributed = (at: string, text: string): Line => ({
	type: 'user',
	timestamp: at,
	sessionId: 's1',
	message: {role: 'user', content: text},
});
const LATE: Line = {...human('2026-10-20T10:00:00Z', 'late follow-up'), uuid: 'u-late', cwd: `${PROJECT}/packages/api`};

const SESSION: readonly Line[] = [
	human('2026-10-01T10:00:00Z', 'build the feature'),
	assistant(
		'2026-10-01T10:00:01Z',
		{type: 'text', text: 'Editing the handler.'},
		{type: 'tool_use', id: 't1', name: 'Edit', input: {file_path: '/work/acme.app/a.js'}},
	),
	toolResult(
		'2026-10-01T10:00:02Z',
		"The user doesn't want to proceed with this tool use. The tool use was rejected.",
		true,
	),
	marker('2026-10-01T10:00:02Z', '[Request interrupted by user for tool use]'),
	human('2026-10-01T10:00:03Z', 'no, keep the handler pure'),
	assistant('2026-10-01T10:00:04Z', {type: 'tool_use', id: 't2', name: 'Bash', input: {command: 'npm test'}}),
	queued('2026-10-01T10:00:05Z', 'human', [{type: 'text', text: 'also run lint'}]),
	queued('2026-10-01T10:00:05Z', 'channel', '<channel source="gerrit">review</channel>'),
	marker('2026-10-01T10:00:06Z', '[Request interrupted by user]'),
	{...human('2026-10-01T10:00:07Z', 'stop, wrong suit'), parentUuid: 'p1'},
	{...human('2026-10-01T10:00:08Z', 'stop, wrong suite'), parentUuid: 'p1'},
	assistant('2026-10-01T10:00:08Z', {
		type: 'tool_use',
		id: 't3',
		name: 'Write',
		input: {file_path: '/work/acme.app/b.js'},
	}),
	{...human('2026-10-01T10:00:09Z', 'use the existing helper'), parentUuid: 'p1'},
	{
		type: 'user',
		isMeta: true,
		timestamp: '2026-10-01T10:00:09Z',
		sessionId: 's1',
		message: {role: 'user', content: '<local-command-caveat>x</local-command-caveat>'},
	},
	human('2026-10-01T10:00:09Z', '<command-name>/handoff</command-name>'),
	{...human('2026-10-01T10:00:10Z', 'subagent prompt'), isSidechain: true},
	toolResult('2026-10-01T10:00:11Z', 'ok', false),
	unattributed('2026-10-01T10:00:12Z', 'Another Claude session sent a message: report ready'),
	unattributed('2026-10-01T10:00:13Z', '/compact keep the plan'),
	{...unattributed('2026-10-01T10:00:14Z', 'This session is being continued'), isCompactSummary: true},
	LATE,
];

const LEARN = '/work/learn.app';
const LEARN_SLUG = '-work-learn-app';

const skillSession: readonly Line[] = [
	human('2026-10-05T10:00:00Z', 'open'),
	assistant('2026-10-05T10:00:01Z', {type: 'tool_use', id: 'k1', name: 'Skill', input: {skill: 'the-coder:coding'}}),
	human('2026-10-05T10:00:02Z', '<command-message>compact</command-message>\n<command-name>/compact</command-name>'),
	human('2026-10-05T10:00:03Z', '<command-name>/git-commit:commit</command-name>'),
	{...unattributed('2026-10-05T10:00:03Z', 'Base directory for this skill: /skills/commit\n\n# Commit'), isMeta: true},
	{
		type: 'attachment',
		timestamp: '2026-10-05T10:00:04Z',
		sessionId: 's1',
		attachment: {type: 'invoked_skills', skills: [{name: 'deep-research', path: 'userSettings:deep-research'}]},
	},
	human('2026-10-05T10:00:05Z', 'correction after skills'),
];

const call = (at: string, id: string, name: string, input: Line): Line =>
	assistant(at, {type: 'tool_use', id, name, input});
const result = (at: string, id: string, text: string, isError: boolean, uuid: string): Line => ({
	...toolResult(at, text, isError),
	uuid,
	message: {role: 'user', content: [{type: 'tool_result', tool_use_id: id, is_error: isError, content: text}]},
});
const NOT_FOUND = '<tool_use_error>String to replace not found in file.\nString: foo</tool_use_error>';

const errorSession = [
	human('2026-10-06T10:00:00Z', 'open'),
	call('2026-10-06T10:00:01Z', 'e1', 'Edit', {file_path: '/work/learn.app/a.js'}),
	result('2026-10-06T10:00:02Z', 'e1', NOT_FOUND, true, 'r7a'),
	call('2026-10-06T10:00:03Z', 'e2', 'Edit', {file_path: '/work/learn.app/b.js'}),
	result('2026-10-06T10:00:04Z', 'e2', 'ok', false, 'r7b'),
	call('2026-10-06T10:00:05Z', 'b1', 'Bash', {command: 'npm test'}),
	result('2026-10-06T10:00:06Z', 'b1', 'Exit code 1\nFAIL suite', true, 'r7c'),
	call('2026-10-06T10:00:07Z', 'r1', 'Read', {file_path: '/work/learn.app/missing.js'}),
	result('2026-10-06T10:00:08Z', 'r1', 'File does not exist.', true, 'r7d'),
];

const repeatSession = [
	human('2026-10-07T10:00:00Z', 'open'),
	call('2026-10-07T10:00:01Z', 'e3', 'Edit', {file_path: '/work/learn.app/c.js'}),
	result('2026-10-07T10:00:02Z', 'e3', NOT_FOUND, true, 'r8a'),
	call('2026-10-07T10:00:03Z', 'e4', 'Edit', {file_path: '/work/learn.app/c.js'}),
	result('2026-10-07T10:00:04Z', 'e4', 'ok', false, 'r8b'),
	call('2026-10-07T10:00:05Z', 'b2', 'Bash', {command: 'npm test'}),
	result('2026-10-07T10:00:06Z', 'b2', 'Exit code 1\nFAIL suite', true, 'r8c'),
];

const unattributedSession = [
	unattributed('2026-10-03T10:00:00Z', 'legacy open'),
	{...unattributed('2026-10-03T10:00:01Z', 'This session is being continued'), isCompactSummary: true},
	unattributed('2026-10-03T10:00:02Z', '/compact'),
	unattributed('2026-10-03T10:00:03Z', 'legacy correction without origin'),
];

let projectsDir = '';
let configDir = '';
let repoRoot = '';
let linkedWorktree = '';

const slugOf = (dir: string): string => dir.replaceAll(/[^a-zA-Z0-9]/g, '-');

async function writeSession(
	dir: string,
	name: string,
	entries: readonly Line[],
	{cwd, mtime, sessionId}: {readonly cwd: string; readonly mtime: string; readonly sessionId?: string},
	root = projectsDir,
): Promise<void> {
	const file = path.join(root, dir, `${name}.jsonl`);
	await mkdir(path.dirname(file), {recursive: true});
	const lines = entries.map((entry) =>
		JSON.stringify(sessionId === undefined ? {cwd, ...entry} : {cwd, ...entry, sessionId}),
	);
	await writeFile(file, `${lines.join('\n')}\nnot json\n`);
	await utimes(file, new Date(mtime), new Date(mtime));
}

beforeAll(async () => {
	projectsDir = await mkdtemp(path.join(tmpdir(), 'debrief-'));
	await writeSession(SLUG, 's1', SESSION, {cwd: PROJECT, mtime: '2026-10-20T11:00:00Z'});
	await writeSession(
		`${SLUG}--claude-worktrees-feature`,
		's2',
		[
			human('2026-10-02T10:00:00Z', 'open'),
			human('2026-10-02T10:00:01Z', 'worktree correction'),
			{...LATE, sessionId: 's2'},
		],
		{cwd: `${PROJECT}/.claude/worktrees/feature`, mtime: '2026-10-21T11:00:00Z'},
	);
	await writeSession(SLUG, 's5', unattributedSession, {cwd: PROJECT, mtime: '2026-10-21T12:00:00Z'});
	await writeSession(
		`${SLUG}-other`,
		's3',
		[human('2026-10-02T10:00:00Z', 'open'), human('2026-10-02T10:00:01Z', 'foreign project')],
		{cwd: `${PROJECT}-other`, mtime: '2026-10-22T11:00:00Z'},
	);
	await writeSession(
		'-work-observer',
		's4',
		[
			{...human('2026-10-02T10:00:00Z', 'open'), entrypoint: 'sdk-ts'},
			{...human('2026-10-02T10:00:01Z', 'observer prompt'), entrypoint: 'sdk-ts'},
		],
		{cwd: '/work/observer', mtime: '2026-10-23T11:00:00Z'},
	);
	await mkdir(path.join(projectsDir, '-work-empty'));
	await writeSession(LEARN_SLUG, 's6', skillSession, {cwd: LEARN, mtime: '2026-10-05T11:00:00Z'});
	await writeSession(LEARN_SLUG, 's7', errorSession, {cwd: LEARN, mtime: '2026-10-06T11:00:00Z', sessionId: 's7'});
	await writeSession(LEARN_SLUG, 's8', repeatSession, {cwd: LEARN, mtime: '2026-10-07T11:00:00Z', sessionId: 's8'});

	const memory = path.join(projectsDir, LEARN_SLUG, 'memory');
	await mkdir(memory);
	await writeFile(path.join(memory, 'MEMORY.md'), '- [Pin versions](feedback_pins.md) — hook\n');
	await writeFile(
		path.join(memory, 'feedback_pins.md'),
		'---\nname: pins\ndescription: Pin exact versions\nmetadata:\n  type: feedback\n---\n\nPin every dependency.\n',
	);
	await writeFile(
		path.join(memory, 'user_role.md'),
		'---\ndescription: >-\n  "Backend engineer,\n  new to Go"\ntype: user\n---\nGo.\n',
	);
	await utimes(
		path.join(memory, 'feedback_pins.md'),
		new Date('2026-10-06T12:00:00Z'),
		new Date('2026-10-06T12:00:00Z'),
	);
	await utimes(path.join(memory, 'user_role.md'), new Date('2026-10-01T12:00:00Z'), new Date('2026-10-01T12:00:00Z'));

	configDir = await mkdtemp(path.join(tmpdir(), 'debrief-config-'));

	repoRoot = await mkdtemp(path.join(tmpdir(), 'debrief-repo-'));
	linkedWorktree = `${repoRoot}-wt`;
	await mkdir(path.join(repoRoot, '.git', 'worktrees', 'wt'), {recursive: true});
	await mkdir(path.join(repoRoot, 'pkg'));
	await mkdir(linkedWorktree);
	await writeFile(path.join(linkedWorktree, '.git'), `gitdir: ${repoRoot}/.git/worktrees/wt\n`);
	await writeSession(
		slugOf(`${repoRoot}/pkg`),
		's9',
		[human('2026-10-08T10:00:00Z', 'open'), human('2026-10-08T10:00:01Z', 'subdirectory correction')],
		{cwd: `${repoRoot}/pkg`, mtime: '2026-10-08T11:00:00Z'},
	);
	await writeSession(
		slugOf(linkedWorktree),
		's10',
		[human('2026-10-08T12:00:00Z', 'open'), human('2026-10-08T12:00:01Z', 'linked worktree correction')],
		{cwd: linkedWorktree, mtime: '2026-10-08T13:00:00Z'},
	);
});

afterAll(async () => {
	await Promise.all(
		[projectsDir, configDir, repoRoot, linkedWorktree].map(async (dir) => rm(dir, {recursive: true, force: true})),
	);
});

async function extractFrom(project: string, options: Partial<ExtractOptions> = {}): Promise<Candidate[]> {
	const records: Candidate[] = [];
	const all = extract({
		projectsDir,
		projects: [project],
		allProjects: false,
		since: 0,
		session: undefined,
		configDir,
		disableAutoMemory: undefined,
		...options,
	});
	for await (const record of all) {
		records.push(record);
	}
	return records;
}

async function memoryOf(
	settings: Line,
	options: Partial<ExtractOptions> = {},
): Promise<Array<[string | undefined, string]>> {
	onTestFinished(async () => {
		await writeFile(path.join(configDir, 'settings.json'), '{}');
	});
	await writeFile(path.join(configDir, 'settings.json'), JSON.stringify(settings));
	const records = await extractFrom(LEARN, options);
	return records.filter(({signal}) => signal === 'memory').map(({type, text}) => [type, text]);
}

describe('extract', () => {
	test('emits each human correction with the signal that preceded it', async () => {
		const candidates = await extractFrom(PROJECT);

		expect(candidates.map(({signal, text}) => [signal, text])).toStrictEqual([
			['rejection', 'no, keep the handler pure'],
			['mid-turn', 'also run lint'],
			['interrupt', 'stop, wrong suite'],
			['rewind', 'use the existing helper'],
			['follow-up', 'late follow-up'],
			['follow-up', 'worktree correction'],
			['follow-up', 'legacy correction without origin'],
		]);
	});

	test('attaches the assistant action the user reacted to', async () => {
		const [rejection] = await extractFrom(PROJECT);

		expect(rejection?.said).toBe('Editing the handler.');
		expect(rejection?.did).toStrictEqual(['Edit /work/acme.app/a.js']);
	});

	test('attaches the abandoned work to a rewind', async () => {
		const records = await extractFrom(PROJECT);
		const rewind = records.find(({signal}) => signal === 'rewind');

		expect(rewind?.did).toStrictEqual(['Write /work/acme.app/b.js']);
	});

	test('attaches the skills invoked before a candidate, typed or called, built-in commands excluded', async () => {
		const [candidate] = await extractFrom(LEARN);

		expect(candidate?.text).toBe('correction after skills');
		expect(candidate?.skills).toStrictEqual(['the-coder:coding', 'git-commit:commit', 'deep-research']);
	});

	test('groups a tool error the agent repeated across sessions with the call that fixed it', async () => {
		const records = await extractFrom(LEARN);
		const errors = records.filter(({signal}) => signal === 'tool-error');

		expect(errors).toStrictEqual([
			{
				id: 'error:Edit: String to replace not found in file.',
				projects: [LEARN],
				at: '2026-10-07T10:00:02Z',
				signal: 'tool-error',
				text: 'String to replace not found in file.',
				count: 2,
				sessions: 2,
				did: ['Edit /work/learn.app/c.js'],
				fix: 'Edit /work/learn.app/c.js',
				skills: [],
			},
		]);
	});

	test('reads auto memory entries in the window, the index excluded', async () => {
		expect(await memoryOf({})).toStrictEqual([
			['user', 'Backend engineer, new to Go\n\nGo.'],
			['feedback', 'Pin exact versions\n\nPin every dependency.'],
		]);
		expect(await memoryOf({}, {since: parseSince('2026-10-05')})).toStrictEqual([
			['feedback', 'Pin exact versions\n\nPin every dependency.'],
		]);
	});

	test('skips auto memory where it is off, and the environment overrides settings', async () => {
		expect(await memoryOf({}, {disableAutoMemory: '1'})).toStrictEqual([]);
		expect(await memoryOf({autoMemoryEnabled: false})).toStrictEqual([]);
		expect(await memoryOf({autoMemoryEnabled: false}, {disableAutoMemory: '0'})).toHaveLength(2);
	});

	test('reads auto memory from the directory the settings name', async () => {
		const custom = path.join(configDir, 'custom-memory');
		await mkdir(custom, {recursive: true});
		await writeFile(path.join(custom, 'project_note.md'), '---\ndescription: Custom\ntype: project\n---\nNote.\n');

		expect(await memoryOf({autoMemoryDirectory: custom})).toStrictEqual([['project', 'Custom\n\nNote.']]);
	});

	test('drops entries older than --since', async () => {
		const candidates = await extractFrom(PROJECT, {since: parseSince('2026-10-10')});

		expect(candidates.map(({text}) => text)).toStrictEqual(['late follow-up']);
	});

	test('reads only the transcript named by --session, copied history included', async () => {
		const candidates = await extractFrom(PROJECT, {session: 's2'});

		expect(candidates.map(({text}) => text)).toStrictEqual(['worktree correction', 'late follow-up']);
	});

	test('emits an entry copied into a later transcript once', async () => {
		const records = await extractFrom(PROJECT);
		const late = records.filter(({text}) => text === 'late follow-up');

		expect(late.map(({session}) => session)).toStrictEqual(['s1']);
	});

	test('folds a worktree session into its repository', async () => {
		const records = await extractFrom(PROJECT);
		const worktree = records.find(({text}) => text === 'worktree correction');

		expect(worktree?.project).toBe(PROJECT);
	});

	test('keeps the launch repository after the agent changes directory', async () => {
		const records = await extractFrom(PROJECT);
		const late = records.find(({text}) => text === 'late follow-up');

		expect(late?.project).toBe(PROJECT);
	});

	test('reads every project named by --project', async () => {
		const candidates = await extractFrom(PROJECT, {projects: [PROJECT, `${PROJECT}-other`]});

		expect(candidates).toContainEqual(expect.objectContaining({text: 'foreign project', project: `${PROJECT}-other`}));
	});

	test('reads every project under --all-projects and skips SDK sessions', async () => {
		const records = await extractFrom(PROJECT, {allProjects: true});
		const texts = records.map(({text}) => text);

		expect(texts).toContain('foreign project');
		expect(texts).not.toContain('observer prompt');
	});

	test('keys a subdirectory launch and a linked worktree to their repository root', async () => {
		const candidates = await extractFrom(repoRoot);

		expect(candidates.map(({text, project}) => [text, project])).toStrictEqual([
			['subdirectory correction', repoRoot],
			['linked worktree correction', repoRoot],
		]);
	});

	test('names a repository no session ran in', async () => {
		await expect(projectDirs(projectsDir, ['/nowhere'], false)).rejects.toThrow(
			`no transcripts for /nowhere: no session under ${projectsDir} ran in /nowhere`,
		);
	});
});

describe('listProjects', () => {
	test('lists each repository once, newest first', async () => {
		const listed = await listProjects(projectsDir);

		expect(
			listed.map(([project, {sessions, last}]) => [new Date(last).toISOString().slice(0, 10), sessions, project]),
		).toStrictEqual([
			['2026-10-22', 1, `${PROJECT}-other`],
			['2026-10-21', 3, PROJECT],
			['2026-10-08', 2, repoRoot],
			['2026-10-07', 3, LEARN],
		]);
	});
});

describe('recurringErrors', () => {
	const occurrence = (session: string, text: string): Candidate => ({
		project: LEARN,
		session,
		at: '2026-10-07T10:00:00Z',
		signal: 'tool-error',
		signature: `Read: ${text.replaceAll(/(?:~|\/)[^\s:'"`,)]+/g, '<path>').replaceAll(/\d+/g, '<n>')}`,
		text,
		did: ['Read'],
		skills: [],
	});

	test('keeps an error only when it repeats across enough sessions', () => {
		const errors = [occurrence('s1', 'gone'), occurrence('s1', 'gone')];

		expect(recurringErrors(errors, 2)).toStrictEqual([]);
		expect(recurringErrors(errors, 1)).toHaveLength(1);
	});

	test('counts repeats and sessions, reporting the latest occurrence', () => {
		const errors = [occurrence('s1', 'gone'), occurrence('s2', 'gone'), occurrence('s2', 'gone')];

		expect(recurringErrors(errors, 2)).toStrictEqual([
			expect.objectContaining({id: 'error:Read: gone', count: 3, sessions: 2, projects: [LEARN]}),
		]);
	});
});

describe('tool error signatures', () => {
	test('group errors that differ only in paths and numbers', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'debrief-sig-'));
		const dir = slugOf('/work/sig.app');
		const errorAt = (n: number): Line[] => [
			human(`2026-10-09T10:0${n}:00Z`, 'open'),
			call(`2026-10-09T10:0${n}:01Z`, `s${n}`, 'Read', {file_path: `/work/sig.app/f${n}.js`}),
			result(`2026-10-09T10:0${n}:02Z`, `s${n}`, `ENOENT /work/sig.app/f${n}.js line ${n * 7}`, true, `u${n}`),
		];
		const meta = {cwd: '/work/sig.app', mtime: '2026-10-09T11:00:00Z'};
		await writeSession(dir, 'sig1', errorAt(1), {...meta, sessionId: 'sig1'}, root);
		await writeSession(dir, 'sig2', errorAt(2), {...meta, sessionId: 'sig2'}, root);

		const records = await extractFrom('/work/sig.app', {projectsDir: root});
		const errors = records.filter(({signal}) => signal === 'tool-error');

		expect(errors).toStrictEqual([
			expect.objectContaining({id: 'error:Read: ENOENT <path> line <n>', count: 2, sessions: 2}),
		]);
		await rm(root, {recursive: true, force: true});
	});
});

describe('parseSince', () => {
	const now = Date.parse('2026-10-28T12:00:00Z');

	test('reads all history without a value', () => {
		expect(parseSince(undefined, now)).toBe(0);
	});

	test('reads a day count back from now', () => {
		expect(parseSince('14d', now)).toBe(Date.parse('2026-10-14T12:00:00Z'));
	});

	test('reads a date', () => {
		expect(parseSince('2026-10-05', now)).toBe(Date.parse('2026-10-05'));
	});

	test.each(['soon', '14 days', 'd'])('rejects %j', (value) => {
		expect(() => parseSince(value, now)).toThrow(`--since ${value}: expected a date or a day count such as 14d`);
	});
});

describe('frontmatterValue', () => {
	test.each([
		['a plain value', 'description: Pin versions\ntype: x', 'Pin versions'],
		['a quoted value', 'description: "Pin versions"', 'Pin versions'],
		['a folded block scalar', 'description: >-\n  Pin every\n  version\ntype: x', 'Pin every version'],
		['a continued line', 'description: Pin every\n  version', 'Pin every version'],
	])('reads %s', (_name, head, value) => {
		expect(frontmatterValue(head, 'description')).toBe(value);
	});

	test('reads nothing for a missing key', () => {
		expect(frontmatterValue('type: x', 'description')).toBeUndefined();
	});
});

describe('index and pick', () => {
	const records = [
		{signal: 'rejection', project: PROJECT, at: '2026-10-01T10:00:00Z', text: 'no,\n  keep it pure'},
		{signal: 'tool-error', projects: [LEARN, PROJECT], at: '2026-10-02T00:00:00Z', text: 'String not found.'},
	];

	test('indexes a record by line number, with its repositories and date and its text on one line', () => {
		expect(records.map((record, i) => indexRow(i + 1, record))).toStrictEqual([
			`1\trejection\t${PROJECT}\t2026-10-01\tno, keep it pure`,
			`2\ttool-error\t${LEARN},${PROJECT}\t2026-10-02\tString not found.`,
		]);
	});

	test('shows a repository under home relative to it and trims long text', () => {
		const row = indexRow(3, {signal: 'follow-up', project: path.join(homedir(), 'app'), text: 'x'.repeat(200)});

		expect(row).toBe(`3\tfollow-up\t~/app\t\t${'x'.repeat(160)}…`);
	});

	test('reads the picked line numbers', () => {
		expect(lineNumbers('2, 1', 2)).toStrictEqual([2, 1]);
	});

	test.each(['3', '0', '1.5', ''])('rejects the line number %j', (value) => {
		expect(() => lineNumbers(value, 2)).toThrow('expected line numbers from 1 to 2');
	});
});
