import type {On, SessionMessage, SessionStartInput, ToolUseSummary, TurnCompleteInput} from 'claude-code';
import {describe, expect, mock, test} from 'claude-code/testing';

import {
	anchorOf,
	entryInputOf,
	entryTextOf,
	evidenceCallsOf,
	excerptOf,
	frontmatterOf,
	indexOf,
	pageTextOf,
	parseRecords,
	parseVerdicts,
	pathPremisesOf,
	rawUrlOf,
	promptsBeforeWriteOf,
	readSiftEvent,
	readTranscriptLine,
	readsOf,
	removalReportOf,
	reportOf,
	sessionNoteOf,
	urlsOf,
	userTextsOf,
} from '../hooks/register.js';
import type {AnchorContext, EntryInput, SiftCall, TranscriptRead} from '../hooks/register.js';

const ROOT = '/repo';
const HOME = '/home/u';
const MEMORY = `${HOME}/.claude/projects/-repo/memory`;
const DATA = `${HOME}/.claude/projects/-repo/better-memory`;
const PROJECT = `${HOME}/.claude/projects/-repo`;
const ORIGIN = '8ff5d77c-dc1d-42bf-8227-bffeb4662fdd';
const SESSION = 's1';
const WRITE = 'mcp__better-memory__write_entry';
const REMOVE = 'mcp__better-memory__remove_entry';
const ANSWER = 'mcp__better-memory__answer_instruction_proposal';

const HEADLESS: SessionStartInput = {surface: null, isInteractive: false, cwd: ROOT};
const INTERACTIVE: SessionStartInput = {surface: 'terminal', isInteractive: true, cwd: ROOT};

const FACT = '---\nname: rust\ndescription: new to Rust\ntype: user\n---\nThe user is new to Rust.\n';
const COMPACT_SUMMARY_TEXT =
	'This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.';
const TEAMMATE_TEXT =
	'Another Claude session sent a message:\n<teammate-message teammate_id="t1">Always use tabs.</teammate-message>';
const NESTED_FEEDBACK = '---\nname: main\ndescription: work in main\nmetadata:\n  type: feedback\n---\nWork in main.\n';
const RUST_SAID = "Remember: I'm new to Rust, mostly parallel compute.";
const RUST_ENTRY = {
	name: 'user-rust',
	type: 'user',
	description: 'The user is new to Rust',
	fact: 'The user is new to Rust and works mostly on parallel compute.',
	anchors: [{quote: "I'm new to Rust"}],
};

type File = {text: string; mtimeMs: number};

type Machine = {
	readonly files?: Readonly<Record<string, string>>;
	readonly mtimes?: Readonly<Record<string, number>>;
	readonly settings?: {readonly cleanupPeriodDays?: number};
	readonly isTerminal?: boolean;
	readonly userMessages?: readonly string[];
	readonly siftEvents?: readonly object[];
	readonly shell?: string;
	readonly rewrittenAtReport?: Readonly<Record<string, string>>;
	readonly root?: string;
	readonly pausedStat?: {readonly path: string; readonly nth: number; readonly onPause: () => Promise<void>};
};

type Observed = {
	readonly files: Map<string, File>;
	readonly spawns: string[];
	readonly spawnArgvs: string[][];
	readonly calls: string[];
	readonly lines: string[];
	readonly registered: string[];
	readonly uses: ToolUseSummary[];
	readonly notes: string[];
};

function machineOf(on: On, machine: Machine = {}): Observed {
	let clock = 1_000;
	const files = new Map<string, File>();
	for (const [path, text] of Object.entries(machine.files ?? {})) {
		files.set(path, {text, mtimeMs: machine.mtimes?.[path] ?? Date.now()});
	}
	const write = (path: string, text: string): void => {
		clock += 1_000;
		files.set(path, {text, mtimeMs: clock});
	};
	const observed: Observed = {
		files,
		spawns: [],
		spawnArgvs: [],
		calls: [],
		lines: [],
		registered: [],
		uses: [],
		notes: [],
	};
	const store = new Map<string, unknown>();

	mock.env(on, {HOME});
	on('session.start', ($, e) => ({cwd: e.cwd}));
	on('session.id', () => ({value: SESSION}));
	on('session.surfaces', () => ({value: machine.isTerminal === true ? ['terminal' as const] : []}));
	on('session.root', () => ({value: machine.root ?? ROOT}));
	on('session.repo', () => ({value: null}));
	on('settings.read', () => ({value: {...machine.settings}}));
	on('turn.complete', ($, e) => ({text: e.answer}));
	on('turn.start', ($, e) => ({turnId: e.turnId}));
	on('session.turns', () => ({value: (machine.userMessages ?? []).length}));
	on('session.messages', ($, e) => ({
		value:
			e.agentId === undefined
				? [
						...(machine.userMessages ?? []).map((text): SessionMessage => ({role: 'user', text, toolUses: []})),
						{role: 'assistant', text: '', toolUses: observed.uses},
					]
				: [],
	}));
	on('fs.exists', ($, e) => ({
		value: files.has(e.path) || [...files.keys()].some((path) => path.startsWith(`${e.path}/`)),
	}));
	on('fs.read', ($, e) => {
		const file = files.get(e.path);
		if (file === undefined) throw new Error(`ENOENT ${e.path}`);
		return {value: file.text};
	});
	let isReportSeen = false;
	on('fs.write', ($, e) => {
		if (!isReportSeen && e.path.startsWith(`${DATA}/reports/`) && !e.path.endsWith(`-MEMORY.md`)) {
			isReportSeen = true;
			for (const [path, text] of Object.entries(machine.rewrittenAtReport ?? {})) write(path, text);
		}
		write(e.path, e.text);
		return {value: undefined};
	});
	const stats = new Map<string, number>();
	on('fs.stat', async ($, e) => {
		const value = {kind: 'file' as const, size: 0, mtimeMs: files.get(e.path)?.mtimeMs ?? 0, isLink: false};
		stats.set(e.path, (stats.get(e.path) ?? 0) + 1);
		if (machine.pausedStat?.path === e.path && machine.pausedStat.nth === stats.get(e.path)) {
			await machine.pausedStat.onPause();
		}
		return {value};
	});
	on('fs.list', ($, e) => {
		const listed = new Map<string, {kind: 'file' | 'dir'; size: number; mtimeMs: number}>();
		for (const [path, file] of files) {
			if (!path.startsWith(`${e.path}/`)) continue;
			const [name = '', ...deeper] = path.slice(e.path.length + 1).split('/');
			listed.set(
				name,
				deeper.length === 0
					? {kind: 'file', size: file.text.length, mtimeMs: file.mtimeMs}
					: {kind: 'dir', size: 0, mtimeMs: 0},
			);
		}
		return {value: [...listed].map(([name, entry]) => ({name, ...entry, isLink: false}))};
	});
	on('process.run', ($, e) => {
		if (e.argv[0] === 'rm')
			for (const path of e.argv.slice(1).filter((arg) => !arg.startsWith('-'))) files.delete(path);
		return {value: {exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false}};
	});
	on('store.get', ($, e) => ({value: store.get(e.key)}));
	on('store.set', ($, e) => {
		store.set(e.key, e.value);
		return {value: undefined};
	});
	on('store.delete', ($, e) => {
		store.delete(e.key);
		return {value: undefined};
	});
	on('tool.register', ($, e) => {
		observed.registered.push(e.name);
		return {value: {tool: `mcp__better-memory__${e.name}`}};
	});
	on('tool.check', ($, e) => ({decision: e.tool.startsWith('mcp__') ? 'ask' : 'allow'}));
	on('process.spawn', async function* ($, e) {
		if (e.argv[0] === 'cat') {
			const text = files.get(e.argv[1] ?? '')?.text ?? '';
			for (const part of [text.slice(0, 50), text.slice(50)]) yield {stream: 'stdout' as const, text: part};
			return {value: {code: 0, signal: null}};
		}
		observed.spawns.push(e.input ?? '');
		observed.spawnArgvs.push([...e.argv]);
		for (const event of machine.siftEvents ?? []) yield {stream: 'stdout' as const, text: `${JSON.stringify(event)}\n`};
		return {value: {code: 0, signal: null}};
	});
	on('ui.log', ($, e) => {
		observed.lines.push(e.text);
		return {value: undefined};
	});
	on('session.append', ($, e, next) => {
		if (e.door === 'note') observed.notes.push(JSON.stringify(e.message));
		return next(e);
	});
	on('tool.call', ($, e) => {
		observed.calls.push(e.tool);
		const {tool, tool_use_id: toolUseId, ...input} = e;
		const text =
			e.tool === 'Bash' ? (machine.shell ?? 'ok') : e.tool === 'Read' ? (files.get(e.file_path)?.text ?? '') : 'ok';
		observed.uses.push({tool_use_id: toolUseId, tool, input, text});
		if (e.tool === 'Write') write(e.file_path, e.content);
		return {result: undefined, text};
	});

	return observed;
}

function recordsOf(observed: Observed): {
	entries: Record<
		string,
		{state: string; origin?: {session: string; round?: number}; anchors?: object[]; reads?: {count: number}}
	>;
	instructionProposals: {instruction: string; status: string}[];
} {
	return JSON.parse(observed.files.get(`${DATA}/records.json`)?.text ?? '{"entries":{},"instructionProposals":[]}');
}

function filesUnder(observed: Observed, dir: string): string[] {
	return [...observed.files.keys()].filter((path) => path.startsWith(`${dir}/`));
}

function reportsOf(observed: Observed): string[] {
	return filesUnder(observed, `${DATA}/reports`).map((path) => observed.files.get(path)?.text ?? '');
}

function turnOf(answer: string): TurnCompleteInput {
	return {answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer'};
}

function contextOf(overrides: Partial<AnchorContext>): AnchorContext {
	return {
		projectRoot: ROOT,
		reader: 'sift',
		entryText: '',
		userTexts: [],
		calls: [],
		reads: new Set(),
		urls: new Set(),
		recorded: [],
		...overrides,
	};
}

function useOf(
	id: string,
	tool: string,
	input: Record<string, unknown>,
	extra: Partial<ToolUseSummary> = {},
): ToolUseSummary {
	return {tool_use_id: id, tool, input, text: 'out', ...extra};
}

/** Lets the other tasks of a test run: each call through the engine yields to them once. */
async function turnsOf(call: () => Promise<unknown>, count: number): Promise<void> {
	for (let turn = 0; turn < count; turn += 1) await call();
}

function siftAnswerOf(verdicts: readonly object[]): string {
	return `Judged.\n\`\`\`json\n${JSON.stringify({verdicts})}\n\`\`\``;
}

describe('the write gate', () => {
	test('refuses a Write of an entry and points to write_entry', async ($, on) => {
		const observed = machineOf(on);
		await $.session.start(HEADLESS);

		const written = await $.tool.call({tool: 'Write', file_path: `${MEMORY}/rust.md`, content: FACT});

		expect(written.deny).toContain(WRITE);
		expect(observed.calls).toEqual([]);
	});

	test('refuses an Edit of MEMORY.md', async ($, on) => {
		const observed = machineOf(on, {files: {[`${MEMORY}/MEMORY.md`]: '# Memory\n'}});
		await $.session.start(HEADLESS);

		const edited = await $.tool.call({
			tool: 'Edit',
			file_path: `${MEMORY}/MEMORY.md`,
			old_string: '# Memory',
			new_string: '# Notes',
		});

		expect(edited.deny).toContain('better-memory writes MEMORY.md itself');
		expect(observed.calls).toEqual([]);
	});

	test('refuses a Write that reaches the memory directory through a parent path or a dotted name', async ($, on) => {
		const observed = machineOf(on);
		await $.session.start(HEADLESS);

		const parent = await $.tool.call({tool: 'Write', file_path: `${MEMORY}/../memory/rust.md`, content: FACT});
		const dotted = await $.tool.call({tool: 'Write', file_path: `${MEMORY}/note..md`, content: FACT});

		expect(parent.deny).toContain(WRITE);
		expect(dotted.deny).toContain(WRITE);
		expect(observed.calls).toEqual([]);
	});

	test('passes writes outside the memory directory untouched', async ($, on) => {
		const observed = machineOf(on);
		await $.session.start(HEADLESS);

		await $.tool.call({tool: 'Write', file_path: `${ROOT}/notes.md`, content: FACT});

		expect(observed.calls).toEqual(['Write']);
		expect(recordsOf(observed).entries).toEqual({});
	});

	test("refuses a shell command that can change this project's memory directory", async ($, on) => {
		machineOf(on);
		await $.session.start(HEADLESS);

		const home = await $.tool.check({tool: 'Bash', input: {command: 'rm ~/.claude/projects/-repo/memory/rust.md'}});
		const full = await $.tool.check({tool: 'Bash', input: {command: `echo x > ${MEMORY}/rust.md`}});

		expect(home).toMatchObject({decision: 'deny', reason: expect.stringContaining(REMOVE)});
		expect(full.decision).toBe('deny');
	});

	test('refuses a shell write into memory/ from the project directory and passes one to better-memory/', async ($, on) => {
		machineOf(on);
		await $.session.start(HEADLESS);

		const relative = await $.tool.check({
			tool: 'Bash',
			input: {command: 'cd ~/.claude/projects/-repo && echo x > memory/rust.md'},
		});
		const data = await $.tool.check({tool: 'Bash', input: {command: `rm "${PROJECT}/better-memory/review.md"`}});

		expect(relative.decision).toBe('deny');
		expect(data.decision).toBe('allow');
	});

	test("passes a read-only command on the memory directory and any command on another project's store", async ($, on) => {
		machineOf(on);
		await $.session.start(HEADLESS);

		const read = await $.tool.check({tool: 'Bash', input: {command: `cat ${MEMORY}/rust.md`}, isReadOnly: true});
		const other = await $.tool.check({
			tool: 'Bash',
			input: {command: `rm ${HOME}/.claude/projects/-other/memory/a.md`},
		});

		expect(read.decision).toBe('allow');
		expect(other.decision).toBe('allow');
	});

	test("allows the mod's own tools without a permission prompt", async ($, on) => {
		machineOf(on);
		await $.session.start(HEADLESS);

		const own = await $.tool.check({tool: WRITE, input: {}});
		const other = await $.tool.check({tool: 'mcp__other__send', input: {}});

		expect(own.decision).toBe('allow');
		expect(other.decision).toBe('ask');
	});
});

describe('write_entry', () => {
	test('saves an entry the user said, as a candidate with its anchor and origin', async ($, on) => {
		const observed = machineOf(on, {userMessages: [RUST_SAID]});
		await $.session.start(HEADLESS);

		const saved = await $.tool.call({tool: WRITE, ...RUST_ENTRY});

		expect(saved.result).toContain('Saved user-rust.md');
		expect(frontmatterOf(observed.files.get(`${MEMORY}/user-rust.md`)?.text ?? '')).toEqual({
			name: 'user-rust',
			description: 'The user is new to Rust',
			type: 'user',
		});
		expect(recordsOf(observed).entries['user-rust.md']).toMatchObject({
			state: 'candidate',
			origin: {session: SESSION, round: 1},
			anchors: [{type: 'quote', text: "I'm new to Rust"}],
		});
		expect(observed.files.get(`${MEMORY}/MEMORY.md`)?.text).toContain('No entries.');
	});

	test('refuses an entry that no anchor backs and writes nothing', async ($, on) => {
		const observed = machineOf(on, {userMessages: ['Fix the build.'], files: {[`${ROOT}/README.md`]: 'x'}});
		await $.session.start(HEADLESS);

		const saved = await $.tool.call({
			tool: WRITE,
			...RUST_ENTRY,
			anchors: [{quote: "I'm new to Rust"}, {file: 'README.md'}],
		});

		expect(saved.deny).toContain('no anchor holds');
		expect(saved.deny).toContain("not in the user's messages");
		expect(saved.deny).toContain('this session did not read it');
		expect(observed.files.has(`${MEMORY}/user-rust.md`)).toBe(false);
	});

	test('keeps a command the session ran and a file it read, and drops the rest', async ($, on) => {
		const observed = machineOf(on, {
			shell: '-r, --replace <TEXT>  Replace every match with TEXT.',
			files: {[`${ROOT}/Makefile`]: 'build:\n\tcargo build\n'},
		});
		await $.session.start(HEADLESS);
		await $.tool.call({tool: 'Bash', command: 'rg --help'});
		await $.tool.call({tool: 'Read', file_path: `${ROOT}/Makefile`});

		const saved = await $.tool.call({
			tool: WRITE,
			name: 'rg-replace',
			type: 'reference',
			description: 'rg rewrites matches with --replace',
			fact: 'ripgrep replaces each match with --replace.',
			anchors: [{command: 'rg --help'}, {file: './Makefile'}, {url: 'https://docs.rs/x'}],
		});

		expect(saved.result).toBe('Saved rg-replace.md.');
		expect(recordsOf(observed).entries['rg-replace.md']?.anchors).toEqual([
			{
				type: 'command',
				tool: 'Bash',
				input: 'rg --help',
				output: '-r, --replace <TEXT>  Replace every match with TEXT.',
			},
			{type: 'file', path: 'Makefile'},
		]);
	});

	test('finds the memory directory of a project key Claude Code shortened', async ($, on) => {
		const root = `/${'deep/'.repeat(45)}repo`;
		const short = `${HOME}/.claude/projects/${root.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 200)}-1x2y`;
		const observed = machineOf(on, {
			root,
			userMessages: [RUST_SAID],
			files: {[`${short}/memory/MEMORY.md`]: '# Memory\n'},
		});
		await $.session.start(HEADLESS);

		await $.tool.call({tool: WRITE, ...RUST_ENTRY});

		expect(observed.files.has(`${short}/memory/user-rust.md`)).toBe(true);
	});

	test('refuses an entry of type feedback', async ($, on) => {
		const observed = machineOf(on, {userMessages: ['Always work in main.']});
		await $.session.start(HEADLESS);

		const saved = await $.tool.call({tool: WRITE, ...RUST_ENTRY, type: 'feedback'});

		expect(saved.deny).toContain('memory holds facts only');
		expect(observed.files.has(`${MEMORY}/user-rust.md`)).toBe(false);
	});

	test('keeps the record of every entry when writes and reads run at once', async ($, on) => {
		const observed = machineOf(on, {userMessages: [RUST_SAID], files: {[`${MEMORY}/old.md`]: FACT}});
		await $.session.start(HEADLESS);

		await Promise.all([
			$.tool.call({tool: WRITE, ...RUST_ENTRY}),
			$.tool.call({tool: WRITE, ...RUST_ENTRY, name: 'rust-two'}),
			$.tool.call({tool: 'Read', file_path: `${MEMORY}/old.md`}),
		]);

		const entries = recordsOf(observed).entries;
		expect(Object.keys(entries).toSorted()).toEqual(['old.md', 'rust-two.md', 'user-rust.md']);
		expect(entries['old.md']?.reads?.count).toBe(1);
	});

	test('replaces an entry of the same name and keeps its reads', async ($, on) => {
		const records = {entries: {'user-rust.md': {state: 'promoted', reads: {count: 3, last: 'x'}}}};
		const observed = machineOf(on, {
			userMessages: [RUST_SAID],
			files: {[`${MEMORY}/user-rust.md`]: FACT, [`${DATA}/records.json`]: JSON.stringify(records)},
		});
		await $.session.start(HEADLESS);

		await $.tool.call({tool: WRITE, ...RUST_ENTRY});

		expect(recordsOf(observed).entries['user-rust.md']).toMatchObject({state: 'candidate', reads: {count: 3}});
		expect(observed.files.get(`${MEMORY}/user-rust.md`)?.text).toContain('parallel compute');
	});
});

describe('remove_entry', () => {
	test('deletes the entry, drops its record, and reports the reason with the text', async ($, on) => {
		const records = {entries: {'rust.md': {state: 'promoted'}}, instructionProposals: []};
		const observed = machineOf(on, {
			files: {[`${MEMORY}/rust.md`]: FACT, [`${DATA}/records.json`]: JSON.stringify(records)},
		});
		await $.session.start(HEADLESS);

		const removed = await $.tool.call({tool: REMOVE, name: 'rust', reason: 'The user asked to forget it.'});

		expect(removed.result).toContain('Removed rust.md');
		expect(observed.files.has(`${MEMORY}/rust.md`)).toBe(false);
		expect(recordsOf(observed).entries).toEqual({});
		const report = reportsOf(observed).find((text) => text.includes('- Reason: The user asked to forget it.'));
		expect(report).toContain('The user is new to Rust.');
	});

	test('keeps a report of each entry when removals run at once', async ($, on) => {
		const observed = machineOf(on, {
			files: {[`${MEMORY}/rust.md`]: FACT, [`${MEMORY}/task.md`]: '---\nname: task\n---\nHalf done.\n'},
		});
		await $.session.start(HEADLESS);

		await Promise.all([
			$.tool.call({tool: REMOVE, name: 'rust', reason: 'gone'}),
			$.tool.call({tool: REMOVE, name: 'task', reason: 'done'}),
		]);

		const reports = filesUnder(observed, `${DATA}/reports`);
		expect(reports.some((path) => path.endsWith('-rust.md'))).toBe(true);
		expect(reports.some((path) => path.endsWith('-task.md'))).toBe(true);
	});

	test('refuses a name that is no entry', async ($, on) => {
		machineOf(on);
		await $.session.start(HEADLESS);

		const removed = await $.tool.call({tool: REMOVE, name: 'nothing', reason: 'gone'});

		expect(removed.deny).toContain('No memory entry is named nothing');
	});
});

describe('tool rows', () => {
	const ROW = {tool_use_id: 'u1', isRunning: false, isErrored: false, isInterrupted: false};

	function drawnRowsOf(on: On): object[] {
		const drawn: object[] = [];
		on('ui.render', {component: 'ToolUse'}, ($, e) => {
			drawn.push(e.props);
			return {type: 'Text', children: ['row']};
		});

		return drawn;
	}

	test("draws a call of the mod's tool as its label and one field", async ($, on) => {
		const drawn = drawnRowsOf(on);
		const mount = {plugin: 'better-memory', surface: 'terminal', component: 'ToolUse'} as const;

		await $.ui.mount({...mount, props: {...ROW, tool: WRITE, input: RUST_ENTRY}});
		await $.ui.mount({...mount, props: {...ROW, tool: REMOVE, input: {name: 'user-rust', reason: 'Gone.'}}});
		await $.ui.mount({...mount, props: {...ROW, tool: ANSWER, input: {id: 'p1', answer: 'accepted'}}});

		expect(drawn).toEqual([
			{...ROW, tool: 'Save memory', input: {'user-rust': 'The user is new to Rust'}},
			{...ROW, tool: 'Remove memory', input: {'user-rust': 'Gone.'}},
			{...ROW, tool: 'Answer instruction proposal', input: {p1: 'accepted'}},
		]);
	});

	test('draws the label alone while the call is incomplete, and the whole call when expanded', async ($, on) => {
		const drawn = drawnRowsOf(on);
		const mount = {plugin: 'better-memory', surface: 'terminal', component: 'ToolUse'} as const;

		await $.ui.mount({...mount, props: {...ROW, isRunning: true, tool: WRITE, input: {name: 'user-rust'}}});
		await $.ui.mount({...mount, props: {...ROW, tool: WRITE, input: RUST_ENTRY, isExpanded: true}});
		await $.ui.mount({...mount, props: {...ROW, tool: 'mcp__other__send', input: {name: 'x', description: 'y'}}});

		expect(drawn).toEqual([
			{...ROW, isRunning: true, tool: 'Save memory', input: {}},
			{...ROW, tool: WRITE, input: RUST_ENTRY, isExpanded: true},
			{...ROW, tool: 'mcp__other__send', input: {name: 'x', description: 'y'}},
		]);
	});
});

describe('read tracking', () => {
	test('counts reads of an entry', async ($, on) => {
		const observed = machineOf(on, {files: {[`${MEMORY}/rust.md`]: FACT}});
		await $.session.start(HEADLESS);

		await $.tool.call({tool: 'Read', file_path: `${MEMORY}/rust.md`});
		await $.tool.call({tool: 'Read', file_path: `${MEMORY}/rust.md`});

		expect(recordsOf(observed).entries['rust.md']?.reads?.count).toBe(2);
	});

	test('marks an unsifted entry as unverified', async ($, on) => {
		machineOf(on, {files: {[`${MEMORY}/rust.md`]: FACT}});
		await $.session.start(HEADLESS);

		const read = await $.tool.call({tool: 'Read', file_path: `${MEMORY}/rust.md`});

		expect(read.context).toEqual([expect.stringContaining('sift has not confirmed this memory entry')]);
	});
});

describe('sift', () => {
	test('starts once an interactive session is idle, with each entry and its recorded anchors', async ($, on) => {
		const observed = machineOf(on, {userMessages: [RUST_SAID]});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);
		await $.tool.call({tool: WRITE, ...RUST_ENTRY});

		await $.turn.complete(turnOf('Saved.'));
		await clock.advance(30_000);

		expect(observed.spawns).toHaveLength(1);
		expect(observed.spawns[0]).toContain('<entry file="user-rust.md" origin="this-session">');
		expect(observed.spawns[0]).toContain(`<anchor id="a1" type="quote">I'm new to Rust</anchor>`);
		expect(observed.spawns[0]).not.toContain(RUST_SAID);
		const argv = observed.spawnArgvs[0] ?? [];
		expect(argv).toContain('--strict-mcp-config');
		expect(argv[argv.indexOf('--tools') + 1]).toBe('Read,Grep,Glob');
	});

	test('applies the verdicts of a run: a quoted fact is promoted and a progress note deleted', async ($, on) => {
		const observed = machineOf(on, {
			userMessages: [RUST_SAID],
			files: {[`${MEMORY}/task.md`]: '---\nname: task\n---\nHalf done.\n'},
			siftEvents: [
				{
					type: 'result',
					subtype: 'success',
					result: siftAnswerOf([
						{file: 'user-rust.md', action: 'promote', scope: 'machine', anchors: [{anchor: 'a1'}], reason: 'r'},
						{file: 'task.md', action: 'remove', reason: 'progress'},
					]),
				},
			],
		});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);
		await $.tool.call({tool: WRITE, ...RUST_ENTRY});

		await $.turn.complete(turnOf('Saved.'));
		await clock.advance(30_000);
		await clock.settle();

		expect(recordsOf(observed).entries['user-rust.md']).toMatchObject({
			state: 'promoted',
			anchors: [{type: 'quote', text: "I'm new to Rust"}],
		});
		expect(observed.files.has(`${MEMORY}/task.md`)).toBe(false);
		expect(reportsOf(observed).some((text) => text.includes('## task.md') && text.includes('Half done.'))).toBe(true);
		expect(filesUnder(observed, `${DATA}/archive`)).toEqual([]);
		expect(observed.files.get(`${DATA}/records.json`)?.text).not.toContain('lastSift');
		expect(observed.files.get(`${MEMORY}/MEMORY.md`)?.text).toContain('[user-rust](user-rust.md)');
	});

	test('leaves an entry rewritten while the verdicts of its run applied', async ($, on) => {
		const observed = machineOf(on, {
			userMessages: [RUST_SAID],
			siftEvents: [
				{
					type: 'result',
					subtype: 'success',
					result: siftAnswerOf([{file: 'user-rust.md', action: 'remove', reason: 'one session'}]),
				},
			],
			rewrittenAtReport: {[`${MEMORY}/user-rust.md`]: 'The user is new to Rust and writes compute kernels.\n'},
		});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);
		await $.tool.call({tool: WRITE, ...RUST_ENTRY});
		await $.turn.complete(turnOf('Saved.'));

		await clock.advance(30_000);
		await clock.settle();

		expect(reportsOf(observed).some((text) => text.includes('## user-rust.md'))).toBe(true);
		expect(observed.files.get(`${MEMORY}/user-rust.md`)?.text).toContain('compute kernels');
	});

	test('keeps an entry written while sift checked it for its verdict', async ($, on) => {
		let release = (): void => undefined;
		let paused = (): void => undefined;
		const isPaused = new Promise<void>((resolve) => {
			paused = resolve;
		});
		const observed = machineOf(on, {
			userMessages: [RUST_SAID],
			siftEvents: [
				{
					type: 'result',
					subtype: 'success',
					result: siftAnswerOf([{file: 'user-rust.md', action: 'remove', reason: 'one session'}]),
				},
			],
			pausedStat: {
				path: `${MEMORY}/user-rust.md`,
				nth: 2,
				onPause: async () =>
					new Promise<void>((resolve) => {
						release = resolve;
						paused();
					}),
			},
		});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);
		await $.tool.call({tool: WRITE, ...RUST_ENTRY});
		await $.turn.complete(turnOf('Saved.'));
		const sifting = (async () => {
			await clock.advance(30_000);
			await clock.settle();
		})();

		await isPaused;
		const writing = $.tool.call({
			tool: WRITE,
			...RUST_ENTRY,
			fact: 'The user is new to Rust and writes compute kernels.',
		});
		await turnsOf(async () => $.tool.check({tool: 'Bash', input: {command: 'true'}, isReadOnly: true}), 50);
		release();
		await Promise.all([sifting, writing]);
		await turnsOf(async () => $.tool.check({tool: 'Bash', input: {command: 'true'}, isReadOnly: true}), 50);
		await clock.settle();

		expect(observed.files.get(`${MEMORY}/user-rust.md`)?.text).toContain('compute kernels');
		expect(recordsOf(observed).entries['user-rust.md']?.state).toBe('candidate');
	});

	test('hands sift the rules files in force with the CLAUDE.md files', async ($, on) => {
		const observed = machineOf(on, {
			userMessages: [RUST_SAID],
			files: {
				[`${ROOT}/.claude/rules/tabs.md`]: 'Indent with tabs.\n',
				[`${HOME}/.claude/rules/commits.md`]: 'Sign every commit.\n',
			},
		});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);
		await $.tool.call({tool: WRITE, ...RUST_ENTRY});

		await $.turn.complete(turnOf('Saved.'));
		await clock.advance(30_000);

		expect(observed.spawns[0]).toContain(`- ${ROOT}/.claude/rules/tabs.md`);
		expect(observed.spawns[0]).toContain(`- ${HOME}/.claude/rules/commits.md`);
	});

	test('proposes an instruction only with the words the user said in its session transcript', async ($, on) => {
		const transcript = [
			JSON.stringify({type: 'user', message: {role: 'user', content: 'Always run kensai before you push.'}}),
			JSON.stringify({
				type: 'assistant',
				message: {content: [{type: 'tool_use', name: 'Write', input: {file_path: `${MEMORY}/kensai.md`}}]},
			}),
			'',
		].join('\n');
		const legacy = (name: string): string =>
			`---\nname: ${name}\ndescription: d\ntype: feedback\noriginSessionId: ${ORIGIN}\n---\nA rule.\n`;
		const observed = machineOf(on, {
			files: {
				[`${PROJECT}/${ORIGIN}.jsonl`]: transcript,
				[`${MEMORY}/kensai.md`]: legacy('kensai'),
				[`${MEMORY}/tabs.md`]: legacy('tabs'),
			},
			siftEvents: [
				{
					type: 'result',
					subtype: 'success',
					result: siftAnswerOf([
						{
							file: 'kensai.md',
							action: 'propose-instruction',
							target: 'user',
							instruction: 'Run kensai before a push.',
							anchors: [{quote: 'Always run kensai before you push'}],
							reason: 'r',
						},
						{
							file: 'tabs.md',
							action: 'propose-instruction',
							target: 'project',
							instruction: 'Indent with tabs.',
							anchors: [{quote: 'Always indent with tabs'}],
							reason: 'r',
						},
					]),
				},
			],
		});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.turn.complete(turnOf('Done.'));
		await clock.advance(30_000);
		await clock.settle();

		expect(observed.spawns[0]).toContain('<session id="s1">\n<message n="1">\nAlways run kensai before you push.');
		expect(observed.spawns[0]).toContain('<entry file="kensai.md" origin="unknown" session="s1">');
		expect(recordsOf(observed).instructionProposals).toEqual([
			expect.objectContaining({
				instruction: 'Run kensai before a push.',
				anchors: [{type: 'quote', text: 'Always run kensai before you push'}],
			}),
		]);
		expect(observed.files.has(`${MEMORY}/tabs.md`)).toBe(false);
		const report = reportsOf(observed).find((text) => text.includes('# Sift report')) ?? '';
		expect(report).toContain("## Instructions without the user's words");
		expect(report).toContain('- tabs.md, for the project CLAUDE.md: Indent with tabs. (moved to review.md)');
		const review = observed.files.get(`${DATA}/review.md`)?.text ?? '';
		expect(review).toContain('## tabs.md\n\n- Target: the project CLAUDE.md\n- Instruction: Indent with tabs.');
		expect(review).toContain('A rule.');
		expect(review).not.toContain('kensai.md');
	});
	test('turns a promotion into a removal when sift did not read the file it cites', async ($, on) => {
		const observed = machineOf(on, {
			files: {[`${ROOT}/README.md`]: 'x', [`${MEMORY}/a.md`]: FACT, [`${MEMORY}/b.md`]: FACT},
			siftEvents: [
				{
					type: 'assistant',
					message: {content: [{type: 'tool_use', id: 'u1', name: 'Read', input: {file_path: `${ROOT}/README.md`}}]},
				},
				{type: 'user', message: {content: [{type: 'tool_result', tool_use_id: 'u1', content: 'x'}]}},
				{
					type: 'result',
					subtype: 'success',
					result: siftAnswerOf([
						{file: 'a.md', action: 'promote', scope: 'project', anchors: [{file: 'README.md'}], reason: 'r'},
						{file: 'b.md', action: 'promote', scope: 'project', anchors: [{file: 'CHANGELOG.md'}], reason: 'r'},
					]),
				},
			],
		});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.turn.complete(turnOf('Done.'));
		await clock.advance(30_000);
		await clock.settle();

		expect(recordsOf(observed).entries['a.md']).toMatchObject({
			state: 'promoted',
			anchors: [{type: 'file', path: 'README.md'}],
		});
		expect(observed.files.has(`${MEMORY}/b.md`)).toBe(false);
	});

	test('never starts in a headless run', async ($, on) => {
		const observed = machineOf(on, {userMessages: [RUST_SAID]});
		await $.session.start(HEADLESS);
		await $.tool.call({tool: WRITE, ...RUST_ENTRY});

		await $.turn.complete(turnOf('Saved.'));

		expect(observed.spawns).toEqual([]);
		expect(recordsOf(observed).entries['user-rust.md']?.state).toBe('candidate');
	});

	test('restores the session at the next turn after a reload that skipped session.start', async ($, on) => {
		const observed = machineOf(on, {userMessages: [RUST_SAID], isTerminal: true});
		const clock = mock.clock(on);

		await $.turn.start({text: RUST_SAID, turnId: 't1'});
		await $.tool.call({tool: WRITE, ...RUST_ENTRY});
		await $.turn.complete(turnOf('Saved.'));
		await clock.advance(30_000);

		expect(observed.registered).toContain('write_entry');
		expect(recordsOf(observed).entries['user-rust.md']?.origin?.session).toBe(SESSION);
		expect(observed.spawns).toHaveLength(1);
	});

	test('waits for idle in an interactive session and a new turn cancels the wait', async ($, on) => {
		const observed = machineOf(on, {files: {[`${MEMORY}/rust.md`]: FACT}});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.turn.complete(turnOf('Done.'));
		await $.turn.start({text: 'next', turnId: 't2'});
		await clock.settle();

		expect(observed.spawns).toEqual([]);
	});

	test('judges a promoted entry again once a file it anchors changes', async ($, on) => {
		const records = {
			entries: {
				'build.md': {
					state: 'promoted',
					siftedAt: new Date(5_000).toISOString(),
					anchors: [{type: 'file', path: 'Makefile'}],
				},
			},
		};
		const observed = machineOf(on, {
			files: {
				[`${MEMORY}/build.md`]: '---\nname: build\n---\nBuild with make.\n',
				[`${ROOT}/Makefile`]: 'build:\n',
				[`${DATA}/records.json`]: JSON.stringify(records),
			},
			mtimes: {[`${MEMORY}/build.md`]: 1_000, [`${ROOT}/Makefile`]: 9_000},
		});
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.turn.complete(turnOf('Done.'));
		await clock.advance(30_000);

		expect(observed.spawns).toHaveLength(1);
		expect(observed.spawns[0]).toContain('<entry file="build.md"');
	});

	test('does not start when no entry is due', async ($, on) => {
		const observed = machineOf(on);
		const clock = mock.clock(on);
		await $.session.start(INTERACTIVE);

		await $.turn.complete(turnOf('Done.'));
		await clock.settle();

		expect(observed.spawns).toEqual([]);
	});

	test('registers the answer tool when an instruction proposal is open and records the answer', async ($, on) => {
		const records = {
			entries: {},
			instructionProposals: [
				{id: 'i-1', file: 'tabs.md', target: 'project', instruction: 'Tabs.', reason: 'r', status: 'open', at: 'x'},
			],
		};
		const observed = machineOf(on, {files: {[`${DATA}/records.json`]: JSON.stringify(records)}});
		await $.session.start(HEADLESS);

		await $.tool.call({tool: 'mcp__better-memory__answer_instruction_proposal', id: 'i-1', answer: 'declined'});

		expect(observed.registered).toEqual(['write_entry', 'remove_entry', 'answer_instruction_proposal']);
		expect(recordsOf(observed).instructionProposals[0]?.status).toBe('declined');
		expect(observed.notes).toEqual([]);
	});

	test('notes the open instruction proposals and the review file at the start of an interactive session', async ($, on) => {
		const records = {
			entries: {},
			instructionProposals: [
				{id: 'i-1', file: 'tabs.md', target: 'project', instruction: 'Tabs.', reason: 'r', status: 'open', at: 'x'},
			],
		};
		const observed = machineOf(on, {
			files: {
				[`${DATA}/records.json`]: JSON.stringify(records),
				[`${DATA}/review.md`]: '# Instructions waiting for review\n\n## old.md\n\n- Instruction: Use tabs.\n',
			},
		});

		await $.session.start(INTERACTIVE);

		expect(observed.notes).toHaveLength(1);
		expect(observed.notes[0]).toContain('"type":"user"');
		expect(observed.notes[0]).toContain('`i-1` for the project CLAUDE.md: Tabs.');
		expect(observed.notes[0]).toContain('better-memory moved 1 instructions');
		expect(observed.notes[0]).toContain('/better-memory:sift');
		expect(observed.files.get(`${MEMORY}/MEMORY.md`)?.text).not.toContain('Tabs.');
	});
});

describe('settings', () => {
	test('registers nothing when the mod is off', {options: {enabled: false}}, async ($, on) => {
		const observed = machineOf(on);
		await $.session.start(HEADLESS);

		await $.tool.call({tool: 'Write', file_path: `${MEMORY}/rust.md`, content: FACT});

		expect(observed.calls).toEqual(['Write']);
		expect(observed.registered).toEqual([]);
	});

	test(
		'keeps the tools and lists candidates in MEMORY.md, but never sifts, when sift is off',
		{options: {sift: false}},
		async ($, on) => {
			const observed = machineOf(on, {userMessages: [RUST_SAID]});
			const clock = mock.clock(on);
			await $.session.start(INTERACTIVE);
			await $.tool.call({tool: WRITE, ...RUST_ENTRY});

			await $.turn.complete(turnOf('Saved.'));
			await clock.advance(30_000);
			const read = await $.tool.call({tool: 'Read', file_path: `${MEMORY}/user-rust.md`});

			expect(observed.spawns).toEqual([]);
			expect(observed.files.get(`${MEMORY}/MEMORY.md`)?.text).toContain('[user-rust](user-rust.md)');
			expect(read.context).toBeUndefined();
		},
	);
});

describe('retention', () => {
	test("deletes reports and answered instruction proposals older than Claude Code's transcript period", async ($, on) => {
		const day = 86_400_000;
		const proposal = (id: string, status: string, answeredAt?: string): object => ({
			id,
			file: `${id}.md`,
			target: 'project',
			instruction: id,
			reason: 'r',
			status,
			at: new Date(Date.now() - 40 * day).toISOString(),
			...(answeredAt === undefined ? {} : {answeredAt}),
		});
		const records = {
			entries: {},
			instructionProposals: [
				proposal('open-old', 'open'),
				proposal('answered-old', 'declined', new Date(Date.now() - 20 * day).toISOString()),
				proposal('answered-new', 'accepted', new Date(Date.now() - day).toISOString()),
			],
		};
		const observed = machineOf(on, {
			settings: {cleanupPeriodDays: 14},
			files: {
				[`${DATA}/records.json`]: JSON.stringify(records),
				[`${DATA}/reports/old.md`]: 'old',
				[`${DATA}/reports/new.md`]: 'new',
			},
			mtimes: {[`${DATA}/reports/old.md`]: Date.now() - 15 * day},
		});

		await $.session.start(HEADLESS);

		expect(observed.files.has(`${DATA}/reports/old.md`)).toBe(false);
		expect(observed.files.has(`${DATA}/reports/new.md`)).toBe(true);
		expect(recordsOf(observed).instructionProposals.map((kept) => kept.instruction)).toEqual([
			'open-old',
			'answered-new',
		]);
	});
});

describe('anchors', () => {
	test('keeps a quote the user said', () => {
		const quote = {kind: 'quote', value: "I'm new to   Rust"} as const;

		expect(anchorOf(quote, contextOf({userTexts: ["FYI I'm new to Rust."]}))).toEqual({
			type: 'quote',
			text: "I'm new to   Rust",
		});
		expect(anchorOf(quote, contextOf({userTexts: ['something else']}))).toContain('not in the user');
		expect(anchorOf({kind: 'quote', value: 'Rust'}, contextOf({userTexts: ['Rust']}))).toContain('too short');
	});

	test('turns a command the session ran into an anchor with the output around the fact', () => {
		const help = `${'other flag. '.repeat(400)}-r, --replace <TEXT> rewrites each match. ${'more. '.repeat(400)}`;
		const context = contextOf({
			reader: 'this session',
			entryText: 'ripgrep --replace rewrites each match',
			calls: [useOf('b', 'Bash', {command: 'rg --help | less'}, {text: help})],
		});

		const anchor = anchorOf({kind: 'command', value: 'rg --help'}, context);

		expect(anchor).toMatchObject({type: 'command', tool: 'Bash', input: 'rg --help | less'});
		expect(typeof anchor === 'object' && anchor.type === 'command' && anchor.output).toContain('--replace <TEXT>');
		expect(anchorOf({kind: 'command', value: 'cargo test'}, context)).toContain('this session did not run it');
	});

	test('confirms a recorded anchor: quote and command as kept, file and url only when read again', () => {
		const recorded = [
			{type: 'quote', text: 'said it'},
			{type: 'file', path: 'src/a.ts'},
			{type: 'uri', url: 'https://docs.rs/x'},
			{type: 'command', tool: 'Bash', input: 'rg --help', output: '-r'},
		] as const;
		const fresh = contextOf({recorded, reads: new Set([`${ROOT}/src/a.ts`]), urls: new Set(['https://docs.rs/x'])});
		const stale = contextOf({recorded});

		expect(anchorOf({kind: 'anchor', value: 'a1'}, stale)).toEqual(recorded[0]);
		expect(anchorOf({kind: 'anchor', value: 'a4'}, stale)).toEqual(recorded[3]);
		expect(anchorOf({kind: 'anchor', value: 'a2'}, fresh)).toEqual({type: 'file', path: 'src/a.ts'});
		expect(anchorOf({kind: 'anchor', value: 'a2'}, stale)).toContain('sift did not read it');
		expect(anchorOf({kind: 'anchor', value: 'a3'}, fresh)).toEqual({type: 'uri', url: 'https://docs.rs/x'});
		expect(anchorOf({kind: 'anchor', value: 'a3'}, stale)).toContain('sift did not fetch it');
		expect(anchorOf({kind: 'anchor', value: 'a9'}, fresh)).toContain('not recorded with the entry');
	});

	test('accepts a file the reader read and a URL it fetched', () => {
		const context = contextOf({
			reads: new Set([`${ROOT}/src/a.ts`, '/opt/rg/README']),
			urls: new Set(['https://docs.rs/x']),
		});

		expect(anchorOf({kind: 'file', value: './src/a.ts'}, context)).toEqual({type: 'file', path: 'src/a.ts'});
		expect(anchorOf({kind: 'file', value: '/opt/rg/README'}, context)).toEqual({
			type: 'source',
			path: '/opt/rg/README',
		});
		expect(anchorOf({kind: 'file', value: 'README.md'}, context)).toContain('sift did not read it');
		expect(anchorOf({kind: 'file', value: 'src/../../etc/passwd'}, context)).toContain('leaves its directory');
		expect(anchorOf({kind: 'url', value: 'https://docs.rs/x/#flags'}, context)).toEqual({
			type: 'uri',
			url: 'https://docs.rs/x/#flags',
		});
		expect(anchorOf({kind: 'url', value: 'https://example.com'}, context)).toContain('sift did not fetch it');
	});

	test('collects the calls that can show a fact, from the whole transcript', () => {
		const messages: SessionMessage[] = [
			{role: 'user', text: 'first prompt', toolUses: []},
			{role: 'assistant', text: '', toolUses: [useOf('a', 'Bash', {command: 'ls'})]},
			{role: 'user', text: 'second prompt', toolUses: []},
			{
				role: 'assistant',
				text: '',
				toolUses: [
					useOf('c', 'Bash', {command: 'false'}, {isError: true}),
					useOf('d', 'Read', {file_path: `${MEMORY}/old.md`}),
					useOf('e', 'TodoWrite', {todos: []}),
					useOf('m', WRITE, {name: 'x'}),
					useOf('f', 'WebFetch', {url: 'https://docs.rs/x'}),
				],
			},
		];

		expect(evidenceCallsOf(messages, MEMORY).map((call) => call.tool_use_id)).toEqual(['a', 'f']);
	});

	test('reads the files a Read opened and a Grep searched or printed', () => {
		const calls = [
			useOf('r', 'Read', {file_path: '/repo/a.ts'}),
			useOf('g', 'Grep', {pattern: 'x', path: '/repo/src'}, {text: '/repo/src/b.ts:12:x\n/repo/src/c.ts'}),
		];

		expect(readsOf(calls)).toEqual(new Set(['/repo/a.ts', '/repo/src', '/repo/src/b.ts']));
	});
});

describe('entries', () => {
	test('parses a write_entry call and says what is wrong with a bad one', () => {
		expect(entryInputOf(RUST_ENTRY)).toEqual({
			name: 'user-rust',
			type: 'user',
			description: 'The user is new to Rust',
			fact: 'The user is new to Rust and works mostly on parallel compute.',
			citations: [{kind: 'quote', value: "I'm new to Rust"}],
		});
		expect(entryInputOf({...RUST_ENTRY, name: '../escape'})).toContain('needs a name');
		expect(entryInputOf({...RUST_ENTRY, name: 'memory'})).toContain('needs a name');
		expect(entryInputOf({...RUST_ENTRY, type: 'plan'})).toContain('needs a type');
		expect(entryInputOf({...RUST_ENTRY, anchors: [{guess: 'x'}]})).toContain('at least one anchor');
	});

	test('writes frontmatter that reads back, quoting a description YAML would misread', () => {
		const input: EntryInput = {
			name: 'deploy',
			type: 'project',
			description: 'Deploy target: eu-west',
			fact: 'Production deploys to eu-west.',
			citations: [],
		};

		const text = entryTextOf(input);

		expect(text).toContain('description: "Deploy target: eu-west"');
		expect(frontmatterOf(text)).toEqual({name: 'deploy', description: 'Deploy target: eu-west', type: 'project'});
	});
});

describe('verdicts', () => {
	test('reads the last JSON block and drops verdicts for files outside the batch', () => {
		const answer = `prose\n\`\`\`json\n{"verdicts":[]}\n\`\`\`\nmore\n${siftAnswerOf([
			{file: 'a.md', action: 'remove', reason: 'x'},
			{file: 'z.md', action: 'remove', reason: 'x'},
			{file: 'a.md', action: 'promote', reason: 'dup'},
		])}`;

		expect(parseVerdicts(answer, ['a.md'])).toEqual([{file: 'a.md', action: 'remove', reason: 'x'}]);
	});

	test('reads the anchors sift cites and ignores kinds sift cannot cite', () => {
		const answer = siftAnswerOf([
			{
				file: 'a.md',
				action: 'promote',
				scope: 'machine',
				anchors: [{anchor: 'a1'}, {file: 'x.md'}, {quote: 'said'}, {command: 'ls'}],
			},
		]);

		expect(parseVerdicts(answer, ['a.md'])[0]).toMatchObject({
			citations: [
				{kind: 'anchor', value: 'a1'},
				{kind: 'file', value: 'x.md'},
				{kind: 'quote', value: 'said'},
			],
		});
	});

	test('keeps an instruction sift removed for the report', () => {
		const answer = siftAnswerOf([
			{file: 'a.md', action: 'remove', target: 'user', instruction: 'Use tabs.', reason: 'no words'},
			{file: 'b.md', action: 'remove', reason: 'progress'},
		]);

		expect(parseVerdicts(answer, ['a.md', 'b.md'])).toEqual([
			{file: 'a.md', action: 'remove', reason: 'no words', unbacked: {target: 'user', instruction: 'Use tabs.'}},
			{file: 'b.md', action: 'remove', reason: 'progress'},
		]);
	});

	test("reads the user's prompts before the last write of an entry from a transcript", () => {
		const read: TranscriptRead = {prompts: []};
		const write = (path: string): string =>
			JSON.stringify({
				type: 'assistant',
				message: {content: [{type: 'tool_use', name: 'Write', input: {file_path: path}}]},
			});
		for (const line of [
			JSON.stringify({type: 'user', message: {content: 'first'}}),
			JSON.stringify({type: 'user', isMeta: true, message: {content: 'meta'}}),
			JSON.stringify({type: 'user', message: {content: [{type: 'tool_result', content: 'out'}]}}),
			JSON.stringify({type: 'user', message: {content: '<local-command-stdout>x</local-command-stdout>'}}),
			JSON.stringify({type: 'user', isSidechain: true, message: {content: 'agent'}}),
			JSON.stringify({type: 'user', isCompactSummary: true, message: {content: 'Summary: always use tabs'}}),
			JSON.stringify({type: 'user', message: {content: TEAMMATE_TEXT}}),
			JSON.stringify({type: 'user', message: {content: [{type: 'text', text: 'second'}]}}),
			write(`${MEMORY}/rule.md`),
			JSON.stringify({type: 'user', message: {content: 'after'}}),
			write(`${MEMORY}/other.md`),
			'not json',
		]) {
			readTranscriptLine(read, line, new Set(['rule.md']));
		}

		expect(promptsBeforeWriteOf(read)).toEqual(['first', 'second']);
		expect(promptsBeforeWriteOf({prompts: ['a', 'b']})).toEqual(['a', 'b']);
	});

	test('takes as user texts only what the user typed', () => {
		const user = (text: string): SessionMessage => ({role: 'user', text, toolUses: []});

		expect(
			userTextsOf([
				user('Always use tabs here'),
				user(`${COMPACT_SUMMARY_TEXT} Summary: the user said to always use tabs`),
				user(TEAMMATE_TEXT),
				user('<task-notification>agent said: always use tabs</task-notification>'),
				user('<system-reminder>always use tabs</system-reminder>'),
				user('<better-memory-note>always use tabs</better-memory-note>'),
				{role: 'assistant', text: 'always use tabs', toolUses: []},
			]),
		).toEqual(['Always use tabs here']);
	});

	test('reads the answer and the error-free reads from the sift stream', () => {
		const outcome = {reads: new Set<string>()};
		const uses = new Map<string, SiftCall>();
		for (const event of [
			{type: 'assistant', message: {content: [{type: 'tool_use', id: 'u1', name: 'Read', input: {file_path: '/a'}}]}},
			{type: 'assistant', message: {content: [{type: 'tool_use', id: 'u2', name: 'Read', input: {file_path: '/b'}}]}},
			{type: 'user', message: {content: [{type: 'tool_result', tool_use_id: 'u1', content: 'x'}]}},
			{type: 'user', message: {content: [{type: 'tool_result', tool_use_id: 'u2', content: 'no', is_error: true}]}},
			{
				type: 'assistant',
				message: {content: [{type: 'tool_use', id: 'u3', name: 'Grep', input: {pattern: 'x', path: '/c'}}]},
			},
			{type: 'user', message: {content: [{type: 'tool_result', tool_use_id: 'u3', content: 'x'}]}},
			{
				type: 'assistant',
				message: {content: [{type: 'tool_use', id: 'u4', name: 'Grep', input: {pattern: 'collide'}}]},
			},
			{
				type: 'user',
				message: {
					content: [
						{
							type: 'tool_result',
							tool_use_id: 'u4',
							content: [{type: 'text', text: '/d/index.rs:903:collides\n/e.rs'}],
						},
					],
				},
			},
			{type: 'result', subtype: 'success', result: 'done'},
		]) {
			readSiftEvent(outcome, uses, JSON.stringify(event));
		}
		readSiftEvent(outcome, uses, 'not json');

		expect(outcome).toEqual({reads: new Set(['/a', '/c', '/d/index.rs']), answer: 'done'});
	});

	test('migrates records written before anchors', () => {
		const records = parseRecords(
			JSON.stringify({
				entries: {
					'a.md': {
						state: 'promoted',
						origin: 's0',
						writtenAt: 'w',
						evidence: 'said it',
						premise: ['path: x.md', 'prose'],
					},
					'b.md': {state: 'promoted', premise: ['Known ripgrep behavior, not run here']},
				},
			}),
		);

		expect(records.entries['a.md']).toEqual({
			state: 'promoted',
			origin: {session: 's0', at: 'w'},
			anchors: [
				{type: 'quote', text: 'said it'},
				{type: 'file', path: 'x.md'},
			],
		});
		expect(records.entries['b.md']).toEqual({state: 'promoted'});
	});

	test('reads path premises and ignores paths that leave the project', () => {
		expect(pathPremisesOf(['path: ./src/a.ts', 'path: ../etc/passwd', 'the config says x'])).toEqual(['src/a.ts']);
	});
});

describe('pages', () => {
	test('reads a GitHub file page from its raw content', () => {
		expect(rawUrlOf('https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md')).toBe(
			'https://raw.githubusercontent.com/BurntSushi/ripgrep/master/GUIDE.md',
		);
		expect(rawUrlOf('https://docs.rs/x')).toBe('https://docs.rs/x');
	});

	test('turns a page into the passages that share words with the entry', () => {
		const html =
			'<html><head><title>t</title></head><body><script>x()</script><p>Use &lt;b&gt; &amp; more</p></body></html>';
		const page = `${'filler text here. '.repeat(400)}The --replace flag rewrites each match in the output. ${'more filler. '.repeat(400)}`;

		expect(pageTextOf(html, 'text/html; charset=utf-8')).toBe('Use <b> & more');
		expect(excerptOf(page, 'ripgrep replace flag rewrites matches', 6_000).length).toBeLessThanOrEqual(6_000);
		expect(excerptOf(page, 'ripgrep replace flag rewrites matches', 6_000)).toContain('--replace flag rewrites');
	});

	test('finds the URLs an entry names', () => {
		expect(urlsOf('See https://docs.rs/x, and (https://a.example/b).')).toEqual([
			'https://docs.rs/x',
			'https://a.example/b',
		]);
	});
});

describe('rendering', () => {
	test('lists the kept entries in MEMORY.md', () => {
		expect(indexOf(['- [build](build.md) — make build'])).toContain('- [build](build.md) — make build');
		expect(indexOf([])).toContain('No entries.');
	});

	test('notes only the open instruction proposals and the instructions waiting for review', () => {
		const note = sessionNoteOf(
			[
				{
					id: 'i-1',
					file: 'tabs.md',
					target: 'project',
					instruction: 'Indent with tabs.',
					reason: 'r',
					status: 'open',
					at: 'x',
				},
				{
					id: 'i-2',
					file: 'x.md',
					target: 'user',
					instruction: 'Declined rule.',
					reason: 'r',
					status: 'declined',
					at: 'x',
				},
				{
					id: 'i-3',
					file: 'english.md',
					target: 'user',
					instruction: 'Answer in English.',
					reason: 'r',
					status: 'open',
					at: 'x',
				},
			],
			3,
		);

		expect(note).toStartWith('<better-memory-note>');
		expect(note).toContain('`i-1` for the project CLAUDE.md: Indent with tabs.');
		expect(note).toContain('`i-3` for ~/.claude/CLAUDE.md: Answer in English.');
		expect(note).not.toContain('Declined rule.');
		expect(note).toContain('better-memory moved 3 instructions from entries written before it');
	});

	test('notes five open instruction proposals and counts the rest, and adds no note when nothing waits', () => {
		const proposals = Array.from({length: 7}, (_, i) => ({
			id: `i-${i}`,
			file: `r${i}.md`,
			target: 'project' as const,
			instruction: `Rule ${i}.`,
			reason: 'r',
			status: 'open' as const,
			at: 'x',
		}));

		const note = sessionNoteOf(proposals, 0);

		expect(note).toContain('Rule 4.');
		expect(note).not.toContain('Rule 5.');
		expect(note).toContain('2 more instruction proposals wait');
		expect(note).not.toContain('better-memory moved');
		expect(sessionNoteOf([], 0)).toBeUndefined();
	});

	test('reports each entry of the batch, judged or not', () => {
		const batch = [
			{file: 'a.md', origin: 'this-session' as const, text: 'A', mtimeMs: 1},
			{file: 'b.md', origin: 'unknown' as const, text: 'B', mtimeMs: 1},
		];
		const report = reportOf(
			SESSION,
			batch,
			[
				{
					file: 'a.md',
					action: 'promote',
					scope: 'machine',
					citations: [],
					anchors: [{type: 'quote', text: 'said it'}],
					dropped: ['file README.md: sift did not read it'],
					reason: 'quoted',
				},
			],
			3,
		);

		expect(report).toContain('- Anchor: quote "said it"');
		expect(report).toContain('- Dropped anchor: file README.md: sift did not read it');
		expect(report).toContain('- Files sift read: 3');
		expect(report).toContain('## b.md');
		expect(report).toContain('- Action: none');
	});

	test('reports a removal with its reason and the entry text', () => {
		const report = removalReportOf(SESSION, 'rust.md', 'No longer true.', FACT);

		expect(report).toContain('- Entry: rust.md');
		expect(report).toContain('- Reason: No longer true.');
		expect(report).toContain('The user is new to Rust.');
	});
});

describe('parsing helpers', () => {
	test('reads frontmatter fields at the top level and under metadata', () => {
		expect(frontmatterOf(FACT)).toEqual({name: 'rust', description: 'new to Rust', type: 'user'});
		expect(frontmatterOf(NESTED_FEEDBACK).type).toBe('feedback');
		expect(frontmatterOf('no frontmatter')).toEqual({});
	});
});
