#!/usr/bin/env node
import {createReadStream} from 'node:fs';
import {access, readdir, readFile, stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {createInterface} from 'node:readline';
import {parseArgs} from 'node:util';

type Entry = Readonly<Record<string, unknown>>;

/** One record the extractor emits as a JSON line: a correction candidate, a tool error, or a memory. */
export type Candidate = {
	readonly id?: string;
	readonly project?: string | null;
	readonly projects?: ReadonlyArray<string | null>;
	readonly session?: string;
	readonly at?: string;
	readonly signal: string;
	readonly signature?: string;
	readonly type?: string;
	readonly file?: string;
	readonly text: string;
	readonly said?: string;
	readonly count?: number;
	readonly sessions?: number;
	readonly did?: readonly string[];
	readonly fix?: string;
	readonly skills?: readonly string[];
};

/** What one extraction reads: the transcript directory, the repositories, the window, and the auto-memory switch. */
export type ExtractOptions = {
	readonly projectsDir: string;
	readonly projects: readonly string[];
	readonly allProjects: boolean;
	readonly since: number;
	readonly session: string | undefined;
	readonly configDir: string;
	readonly disableAutoMemory: string | undefined;
};

const REJECTION_PREFIX = "The user doesn't want to proceed with this tool use";
const INTERRUPT_PREFIX = '[Request interrupted by user';
const SKILL_BODY_PREFIX = 'Base directory for this skill:';
const COMMAND_NAME = /<command-name>\/([^<\s]+)<\/command-name>/;
const RAN_AND_FAILED = /^Exit code \d+/;
const ERROR_LIMIT = 300;
const SIGNATURE_LIMIT = 160;
const INDEX_TEXT_LIMIT = 160;
const MEMORY_INDEX = 'MEMORY.md';
const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;
const MANAGED_SETTINGS_BY_PLATFORM: Readonly<Record<string, string>> = {
	darwin: '/Library/Application Support/ClaudeCode/managed-settings.json',
	win32: 'C:\\Program Files\\ClaudeCode\\managed-settings.json',
};
const MANAGED_SETTINGS = MANAGED_SETTINGS_BY_PLATFORM[process.platform] ?? '/etc/claude-code/managed-settings.json';
const TEXT_LIMIT = 2000;
const SAID_LIMIT = 600;
const DID_LIMIT = 3;
const INPUT_LIMIT = 160;
const INPUT_KEYS = ['file_path', 'command', 'pattern', 'skill', 'description', 'url', 'query', 'prompt'];
const DAY_MS = 86_400_000;
const WORKTREE_SUFFIX = /\/\.claude\/worktrees\/[^/]+.*$/;

const isRecord = (value: unknown): value is Entry => typeof value === 'object' && value !== null;
const recordOf = (value: unknown): Entry | undefined => (isRecord(value) ? value : undefined);
const stringOf = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const listOf = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const isSdk = (entry: Entry): boolean => stringOf(entry.entrypoint)?.startsWith('sdk-') === true;

/** Reads `--since`: an ISO date, a day count such as `14d`, or nothing for all history; throws on anything else. */
export function parseSince(value: string | undefined, now = Date.now()): number {
	if (value === undefined) {
		return 0;
	}

	const days = /^(\d+)d$/.exec(value)?.[1];
	const since = days === undefined ? Date.parse(value) : now - Number(days) * DAY_MS;
	if (Number.isNaN(since)) {
		throw new TypeError(`--since ${value}: expected a date or a day count such as 14d`);
	}

	return since;
}

async function exists(file: string): Promise<boolean> {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}

async function readOrEmpty(file: string): Promise<string> {
	try {
		return await readFile(file, 'utf8');
	} catch {
		return '';
	}
}

function ancestors(start: string): string[] {
	const dirs = [start];
	for (let dir = start; path.dirname(dir) !== dir; dir = path.dirname(dir)) {
		dirs.push(path.dirname(dir));
	}
	return dirs;
}

async function repositoryRoot(start: string): Promise<string> {
	const markers = await Promise.all(
		ancestors(start).map(async (dir) => {
			const marker = path.join(dir, '.git');
			const gitdir = /^gitdir:\s*(.+)$/m.exec(await readOrEmpty(marker))?.[1];
			const linked =
				gitdir === undefined
					? undefined
					: /^(.*)\/\.git\/worktrees\/[^/]+$/.exec(path.resolve(dir, gitdir.trim()))?.[1];
			return {dir, linked, present: await exists(marker)};
		}),
	);

	for (const {dir, linked, present} of markers) {
		if (linked !== undefined) {
			return linked;
		}

		if (present) {
			return dir;
		}
	}

	return start;
}

const repositories = new Map<string, Promise<string>>();

/** Returns the repository a working directory belongs to, a worktree folded into its main repository; null for none. */
export async function repositoryOf(cwd: unknown): Promise<string | null> {
	if (typeof cwd !== 'string' || cwd === '') {
		return null;
	}

	const folded = path.resolve(cwd.replace(WORKTREE_SUFFIX, ''));
	let root = repositories.get(folded);
	if (root === undefined) {
		root = repositoryRoot(folded);
		repositories.set(folded, root);
	}

	return root;
}

function parseEntry(line: string): unknown {
	try {
		return JSON.parse(line) as unknown;
	} catch {
		return undefined;
	}
}

const truncate = (text: string, limit: number): string => (text.length > limit ? `${text.slice(0, limit)}…` : text);

function contentText(content: unknown): string {
	if (typeof content === 'string') {
		return content;
	}

	return listOf(content)
		.filter((block) => isRecord(block) && block.type === 'text')
		.map((block) => stringOf(recordOf(block)?.text) ?? '')
		.join('\n');
}

function describeTool(block: Entry): string {
	const input = recordOf(block.input);
	const key = INPUT_KEYS.find((candidate) => typeof input?.[candidate] === 'string');
	const detail = key === undefined ? JSON.stringify(block.input ?? {}) : String(input?.[key]);
	return `${String(block.name)} ${truncate(detail.replaceAll('\n', ' '), INPUT_LIMIT)}`;
}

function errorLine(text: string): string {
	const line = text
		.replaceAll(/<\/?tool_use_error>/g, '')
		.split('\n')
		.map((candidate) => candidate.trim())
		.find((candidate) => candidate !== '' && !/^<[^>]+>$/.test(candidate));
	return truncate(line ?? '', ERROR_LIMIT);
}

function errorSignature(tool: string, line: string): string {
	const masked = line.replaceAll(/(?:~|\/)[^\s:'"`,)]+/g, '<path>').replaceAll(/\d+/g, '<n>');
	return `${tool}: ${masked.slice(0, SIGNATURE_LIMIT)}`;
}

const isRejection = (content: unknown): boolean =>
	listOf(content).some(
		(block) =>
			isRecord(block) && block.type === 'tool_result' && contentText(block.content).startsWith(REJECTION_PREFIX),
	);

function isHumanPrompt(entry: Entry, sessionHasOrigin: boolean): boolean {
	if (entry.isMeta === true || entry.isCompactSummary === true) {
		return false;
	}

	const content = recordOf(entry.message)?.content;
	if (listOf(content).some((block) => isRecord(block) && block.type === 'tool_result')) {
		return false;
	}

	const text = contentText(content).trimStart();
	if (text === '' || text.startsWith('<') || text.startsWith(INTERRUPT_PREFIX)) {
		return false;
	}

	if ('origin' in entry) {
		return recordOf(entry.origin)?.kind === 'human';
	}

	return !sessionHasOrigin && !text.startsWith('/');
}

function isHumanQueuedCommand(attachment: Entry | undefined): boolean {
	if (attachment?.type !== 'queued_command') {
		return false;
	}

	if (attachment.origin !== null && attachment.origin !== undefined) {
		return recordOf(attachment.origin)?.kind === 'human';
	}

	return attachment.commandMode === 'prompt' && !contentText(attachment.prompt).trimStart().startsWith('<');
}

/**
 * Reads one transcript and yields its correction candidates in order: each human prompt that follows a rejection,
 * an interrupt, a rewind, or another prompt, each message queued mid-turn, and each tool error with the call that
 * fixed it. A session's first prompt and anything before `since` are skipped; an SDK session yields nothing.
 */
export async function* sessionCandidates(file: string, since: number): AsyncGenerator<Candidate> {
	const lines = createInterface({input: createReadStream(file), crlfDelay: Infinity});
	let opening = true;
	let held: Candidate | undefined;
	let lastParent: unknown;
	const promptParents = new Set<unknown>();
	let answered = false;
	let said = '';
	let did: string[] = [];
	let pending: string | undefined;
	let project: string | null = null;
	let sessionHasOrigin = false;
	const skills = new Set<string>();
	let typedCommand: string | undefined;
	const calls = new Map<string, {tool: string; call: string}>();
	const unresolved = new Map<string, Candidate>();

	const candidate = (entry: Entry, signal: string, text: string): Candidate => ({
		id: stringOf(entry.uuid),
		project,
		session: stringOf(entry.sessionId),
		at: stringOf(entry.timestamp),
		signal,
		text: truncate(text, TEXT_LIMIT),
		said: truncate(said, SAID_LIMIT),
		did,
		skills: [...skills],
	});

	for await (const line of lines) {
		const entry = parseEntry(line);
		if (!isRecord(entry) || entry.isSidechain === true) {
			continue;
		}

		if (isSdk(entry)) {
			return;
		}

		// oxlint-disable-next-line no-await-in-loop -- the first entry that carries a cwd decides the repository, once
		project ??= await repositoryOf(entry.cwd);

		if (entry.type === 'assistant') {
			answered = true;
			for (const block of listOf(recordOf(entry.message)?.content)) {
				if (!isRecord(block)) {
					continue;
				}

				if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
					said = block.text;
				}

				if (block.type === 'tool_use') {
					did = [...did, describeTool(block)].slice(-DID_LIMIT);
					calls.set(String(block.id), {tool: String(block.name), call: describeTool(block)});

					const skill = recordOf(block.input)?.skill;
					if (block.name === 'Skill' && typeof skill === 'string') {
						skills.add(skill);
					}
				}
			}
			continue;
		}

		const inWindow = Date.parse(stringOf(entry.timestamp) ?? '') >= since;
		const attachment = recordOf(entry.attachment);

		if (entry.type === 'attachment' && attachment?.type === 'invoked_skills') {
			for (const skill of listOf(attachment.skills)) {
				const name = recordOf(skill)?.name;
				if (typeof name === 'string') {
					skills.add(name);
				}
			}
			continue;
		}

		if (entry.type === 'attachment' && isHumanQueuedCommand(attachment)) {
			if (held !== undefined) {
				yield held;
			}
			held = undefined;
			if (inWindow) {
				yield candidate(entry, 'mid-turn', contentText(attachment?.prompt));
			}
			continue;
		}

		if (entry.type !== 'user') {
			continue;
		}
		sessionHasOrigin ||= 'origin' in entry;

		const content = recordOf(entry.message)?.content;
		for (const block of listOf(content)) {
			const call = isRecord(block) && block.type === 'tool_result' ? calls.get(String(block.tool_use_id)) : undefined;
			if (call === undefined || !isRecord(block)) {
				continue;
			}

			if (block.is_error !== true) {
				const failed = unresolved.get(call.tool);
				unresolved.delete(call.tool);
				if (failed !== undefined) {
					yield {...failed, fix: call.call};
				}
				continue;
			}

			const text = contentText(block.content);
			if (text.startsWith(REJECTION_PREFIX) || text.startsWith(INTERRUPT_PREFIX) || RAN_AND_FAILED.test(text)) {
				continue;
			}

			const firstLine = errorLine(text);
			if (!inWindow || firstLine === '') {
				continue;
			}

			const previous = unresolved.get(call.tool);
			if (previous !== undefined) {
				yield previous;
			}
			unresolved.set(call.tool, {
				id: `${String(entry.uuid)}/${String(block.tool_use_id)}`,
				project,
				session: stringOf(entry.sessionId),
				at: stringOf(entry.timestamp),
				signal: 'tool-error',
				signature: errorSignature(call.tool, firstLine),
				text: firstLine,
				did: [call.call],
				skills: [...skills],
			});
		}

		const body = contentText(content);
		if (typedCommand !== undefined && entry.isMeta === true && body.startsWith(SKILL_BODY_PREFIX)) {
			skills.add(typedCommand);
		}
		typedCommand = COMMAND_NAME.exec(body)?.[1];

		if (isRejection(content)) {
			pending = 'rejection';
			continue;
		}

		if (body.startsWith(INTERRUPT_PREFIX)) {
			pending ??= 'interrupt';
			continue;
		}

		if (!isHumanPrompt(entry, sessionHasOrigin)) {
			continue;
		}

		const text = body.trim();
		const parent = entry.parentUuid;
		const hasParent = parent !== null && parent !== undefined;
		if (hasParent && parent === lastParent && !answered) {
			if (held !== undefined) {
				held = {...held, id: stringOf(entry.uuid), at: stringOf(entry.timestamp), text: truncate(text, TEXT_LIMIT)};
			}
		} else {
			if (held !== undefined) {
				yield held;
			}
			const signal = hasParent && promptParents.has(parent) ? 'rewind' : (pending ?? 'follow-up');
			held = !opening && inWindow ? candidate(entry, signal, text) : undefined;
			opening = false;
			said = '';
			did = [];
		}
		promptParents.add(parent);
		lastParent = parent;
		answered = false;
		pending = undefined;
	}

	if (held !== undefined) {
		yield held;
	}
	yield* unresolved.values();
}

/** Groups tool errors by signature and keeps each that repeats in at least `minSessions` sessions. */
export function recurringErrors(occurrences: readonly Candidate[], minSessions: number): Candidate[] {
	const groups = new Map<
		string,
		{count: number; sessions: Set<string | undefined>; projects: Set<string | null | undefined>; latest: Candidate}
	>();
	for (const occurrence of occurrences) {
		const signature = occurrence.signature ?? '';
		const group = groups.get(signature) ?? {count: 0, sessions: new Set(), projects: new Set(), latest: occurrence};
		group.count += 1;
		group.sessions.add(occurrence.session);
		group.projects.add(occurrence.project);
		group.latest = occurrence;
		groups.set(signature, group);
	}

	return [...groups]
		.filter(([, {count, sessions}]) => count >= 2 && sessions.size >= minSessions)
		.map(([signature, {count, sessions, projects, latest}]) => ({
			id: `error:${signature}`,
			projects: [...projects].map((project) => project ?? null),
			at: latest.at,
			signal: 'tool-error',
			text: latest.text,
			count,
			sessions: sessions.size,
			did: latest.did,
			fix: latest.fix,
			skills: latest.skills,
		}));
}

async function transcriptDirs(projectsDir: string): Promise<string[]> {
	const entries = await readdir(projectsDir, {withFileTypes: true});
	return entries.filter((dirent) => dirent.isDirectory()).map((dirent) => path.join(projectsDir, dirent.name));
}

async function transcriptFiles(
	dirs: readonly string[],
	since: number,
	session?: string,
): Promise<Array<{file: string; mtimeMs: number}>> {
	const listed = await Promise.all(
		dirs.map(async (dir) => {
			const names = await readdir(dir);
			return names.map((name) => ({dir, name}));
		}),
	);
	const wanted = listed
		.flat()
		.filter(({name}) => name.endsWith('.jsonl') && (session === undefined || name === `${session}.jsonl`));
	const files = await Promise.all(
		wanted.map(async ({dir, name}) => {
			const file = path.join(dir, name);
			const {mtimeMs} = await stat(file);
			return {file, mtimeMs};
		}),
	);
	return files.filter(({mtimeMs}) => mtimeMs >= since).toSorted((a, b) => a.mtimeMs - b.mtimeMs);
}

async function sessionHead(file: string): Promise<Entry> {
	const input = createReadStream(file);
	try {
		for await (const line of createInterface({input, crlfDelay: Infinity})) {
			const entry = parseEntry(line);
			if (isRecord(entry) && typeof entry.cwd === 'string' && entry.cwd !== '') {
				return entry;
			}
		}
		return {};
	} finally {
		input.destroy();
	}
}

async function dirRepository(dir: string): Promise<string | null> {
	const files = await transcriptFiles([dir], 0);
	const newest = files.at(-1);
	if (newest === undefined) {
		return null;
	}

	const head = await sessionHead(newest.file);
	return repositoryOf(head.cwd);
}

/** Returns the transcript directories whose sessions ran in each repository; throws for a repository with none. */
export async function projectDirs(
	projectsDir: string,
	projects: readonly string[],
	allProjects: boolean,
): Promise<string[]> {
	const dirs = await transcriptDirs(projectsDir);
	if (allProjects) {
		return dirs;
	}

	const owners = await Promise.all(dirs.map(async (dir) => ({dir, repository: await dirRepository(dir)})));
	const repositoriesOfProjects = await Promise.all(projects.map(async (projectDir) => repositoryOf(projectDir)));

	return projects.flatMap((projectDir, i) => {
		const repository = repositoriesOfProjects[i] ?? null;
		const matched = owners.filter((owner) => owner.repository === repository);
		if (matched.length === 0) {
			throw new Error(`no transcripts for ${projectDir}: no session under ${projectsDir} ran in ${String(repository)}`);
		}
		return matched.map(({dir}) => dir);
	});
}

async function readJson(file: string): Promise<unknown> {
	try {
		return JSON.parse(await readFile(file, 'utf8')) as unknown;
	} catch {
		return undefined;
	}
}

async function setting(project: string, configDir: string, key: string): Promise<unknown> {
	const layers = [
		MANAGED_SETTINGS,
		path.join(project, '.claude', 'settings.local.json'),
		path.join(project, '.claude', 'settings.json'),
		path.join(configDir, 'settings.json'),
	];
	const values = await Promise.all(layers.map(async (file) => recordOf(await readJson(file))?.[key]));
	return values.find((value) => value !== undefined);
}

/**
 * Returns the auto-memory directory of a repository, or undefined when auto memory is off or the directory is
 * absent. `disableAutoMemory` is CLAUDE_CODE_DISABLE_AUTO_MEMORY: `1` turns it off, `0` overrides the settings.
 */
export async function memoryDir(
	project: string,
	{configDir, projectsDir, disableAutoMemory}: Pick<ExtractOptions, 'configDir' | 'projectsDir' | 'disableAutoMemory'>,
): Promise<string | undefined> {
	if (disableAutoMemory === '1') {
		return undefined;
	}

	if (disableAutoMemory !== '0' && (await setting(project, configDir, 'autoMemoryEnabled')) === false) {
		return undefined;
	}

	const custom = await setting(project, configDir, 'autoMemoryDirectory');
	if (typeof custom === 'string') {
		return custom.startsWith('~/') ? path.join(homedir(), custom.slice(2)) : custom;
	}

	const dir = path.join(projectsDir, project.replaceAll(/[^a-zA-Z0-9]/g, '-'), 'memory');
	return (await exists(dir)) ? dir : undefined;
}

/** Reads a frontmatter value, folding a block scalar or a continued line into one line and dropping quotes. */
export function frontmatterValue(head: string, key: string): string | undefined {
	const match = new RegExp(String.raw`^${key}:[ \t]*(.*)((?:\n[ \t]+.*)*)`, 'm').exec(head);
	if (match === null) {
		return undefined;
	}

	const [, first = '', rest = ''] = match;
	const folded = /^[>|][-+]?$/.test(first.trim()) ? rest : `${first}${rest}`;
	return folded
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
		.join(' ')
		.replace(/^"(.*)"$/, '$1');
}

async function memoryRecords(project: string, dir: string, since: number): Promise<Candidate[]> {
	const listed = await readdir(dir);
	const names = listed.filter((name) => name.endsWith('.md') && name !== MEMORY_INDEX);
	const records = await Promise.all(
		names.map(async (name): Promise<Candidate | undefined> => {
			const file = path.join(dir, name);
			const {mtimeMs} = await stat(file);
			if (mtimeMs < since) {
				return undefined;
			}

			const text = await readFile(file, 'utf8');
			const frontmatter = FRONTMATTER.exec(text);
			const head = frontmatter?.[1] ?? '';
			const description = frontmatterValue(head, 'description');
			const body = (frontmatter === null ? text : text.slice(frontmatter[0].length)).trim();
			return {
				id: `memory:${file}`,
				project,
				at: new Date(mtimeMs).toISOString(),
				signal: 'memory',
				type: /^\s*type:\s*(\S+)/m.exec(head)?.[1],
				file,
				text: truncate(
					[description, body].filter((part) => part !== undefined && part !== '').join('\n\n'),
					TEXT_LIMIT,
				),
			};
		}),
	);
	return records.filter((record) => record !== undefined).toSorted((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
}

/**
 * Yields every record of one extraction in output order: the candidates of each transcript, oldest file first, then
 * the tool errors that recur, then the auto memories written in the window. A record copied into a later transcript
 * is yielded once.
 */
export async function* extract(options: ExtractOptions): AsyncGenerator<Candidate> {
	const {projectsDir, since, session} = options;
	const dirs = await projectDirs(projectsDir, options.projects, options.allProjects);
	const files = await transcriptFiles(dirs, since, session);
	const emitted = new Set<string | undefined>();
	const errors: Candidate[] = [];

	for (const {file} of files) {
		// oxlint-disable-next-line no-await-in-loop -- transcripts are read oldest first, and a copied entry keeps its first one
		for await (const candidate of sessionCandidates(file, since)) {
			if (candidate.id !== undefined && emitted.has(candidate.id)) {
				continue;
			}
			emitted.add(candidate.id);
			if (candidate.signal === 'tool-error') {
				errors.push(candidate);
			} else {
				yield candidate;
			}
		}
	}

	yield* recurringErrors(errors, session === undefined ? 2 : 1);

	const heads = await Promise.all(
		files.map(async ({file}) => {
			const head = await sessionHead(file);
			return {head, project: await repositoryOf(head.cwd)};
		}),
	);
	const memorySince = new Map<string, number>();
	for (const {head, project} of heads) {
		if (project === null || isSdk(head)) {
			continue;
		}

		const started = Date.parse(stringOf(head.timestamp) ?? '');
		const start = session === undefined || Number.isNaN(started) || started === 0 ? since : started;
		memorySince.set(project, Math.min(memorySince.get(project) ?? Infinity, start));
	}

	const memories = await Promise.all(
		[...memorySince].map(async ([project, start]) => {
			const dir = await memoryDir(project, options);
			return dir === undefined ? [] : memoryRecords(project, dir, start);
		}),
	);
	for (const record of memories.flat()) {
		if (!emitted.has(record.id)) {
			emitted.add(record.id);
			yield record;
		}
	}
}

/** Formats one extraction record as a tab-separated index row: number, signal, repositories, date, and text. */
export function indexRow(number: number, record: unknown): string {
	const entry = recordOf(record) ?? {};
	const home = homedir();
	const projects = Array.isArray(entry.projects) ? entry.projects : [entry.project];
	const where = projects
		.map((project: unknown) =>
			typeof project === 'string' && project.startsWith(home)
				? `~${project.slice(home.length)}`
				: (stringOf(project) ?? ''),
		)
		.join(',');
	const text = truncate((stringOf(entry.text) ?? '').replaceAll(/\s+/g, ' ').trim(), INDEX_TEXT_LIMIT);
	return [number, stringOf(entry.signal) ?? '', where, stringOf(entry.at)?.slice(0, 10) ?? '', text].join('\t');
}

/** Reads `--lines` as one-based line numbers within `count`; throws on any other value. */
export function lineNumbers(value: string | undefined, count: number): number[] {
	return (value ?? '').split(',').map((part) => {
		const number = Number(part.trim());
		if (!Number.isInteger(number) || number < 1 || number > count) {
			throw new RangeError(`--lines ${part}: expected line numbers from 1 to ${count}`);
		}
		return number;
	});
}

/** Lists each repository that has transcripts, with its session count and newest transcript time, newest first. */
export async function listProjects(projectsDir: string): Promise<Array<[string, {sessions: number; last: number}]>> {
	const dirs = await transcriptDirs(projectsDir);
	const found = await Promise.all(
		dirs.map(async (dir) => {
			const files = await transcriptFiles([dir], 0);
			const newest = files.at(-1);
			if (newest === undefined) {
				return undefined;
			}

			const head = await sessionHead(newest.file);
			if (isSdk(head)) {
				return undefined;
			}

			return {project: (await repositoryOf(head.cwd)) ?? dir, sessions: files.length, last: newest.mtimeMs};
		}),
	);

	const projects = new Map<string, {sessions: number; last: number}>();
	for (const info of found) {
		if (info !== undefined) {
			const known = projects.get(info.project) ?? {sessions: 0, last: 0};
			projects.set(info.project, {sessions: known.sessions + info.sessions, last: Math.max(known.last, info.last)});
		}
	}
	return [...projects].toSorted(([, a], [, b]) => b.last - a.last);
}

async function extractionLines(file: string): Promise<string[]> {
	const text = await readFile(file, 'utf8');
	return text.split('\n').filter((line) => line !== '');
}

async function main(): Promise<void> {
	const {values} = parseArgs({
		options: {
			project: {type: 'string', multiple: true, default: [process.cwd()]},
			'all-projects': {type: 'boolean', default: false},
			'list-projects': {type: 'boolean', default: false},
			since: {type: 'string'},
			session: {type: 'string'},
			'projects-dir': {type: 'string'},
			index: {type: 'string'},
			pick: {type: 'string'},
			lines: {type: 'string'},
		},
	});

	const configDir = process.env.CLAUDE_CONFIG_DIR ?? path.join(homedir(), '.claude');
	const projectsDir = values['projects-dir'] ?? path.join(configDir, 'projects');

	if (values['list-projects']) {
		for (const [project, {sessions, last}] of await listProjects(projectsDir)) {
			process.stdout.write(`${new Date(last).toISOString().slice(0, 10)}\t${sessions}\t${project}\n`);
		}
		return;
	}

	if (values.index !== undefined) {
		const lines = await extractionLines(values.index);
		for (const [i, line] of lines.entries()) {
			process.stdout.write(`${indexRow(i + 1, JSON.parse(line) as unknown)}\n`);
		}
		return;
	}

	if (values.pick !== undefined) {
		const lines = await extractionLines(values.pick);
		for (const number of lineNumbers(values.lines, lines.length)) {
			process.stdout.write(`${lines[number - 1] ?? ''}\n`);
		}
		return;
	}

	const counts = new Map<string, number>();
	const projects = new Set<string | null | undefined>();
	const records = extract({
		projectsDir,
		projects: values.project,
		allProjects: values['all-projects'],
		since: parseSince(values.since),
		session: values.session,
		configDir,
		disableAutoMemory: process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY,
	});
	for await (const record of records) {
		counts.set(record.signal, (counts.get(record.signal) ?? 0) + 1);
		for (const project of record.projects ?? [record.project]) {
			projects.add(project);
		}
		process.stdout.write(`${JSON.stringify(record)}\n`);
	}

	const summary = [...counts].map(([signal, count]) => `${signal} ${count}`).join(', ');
	process.stderr.write(`candidates from ${projects.size} repositories: ${summary === '' ? 'none' : summary}\n`);
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		process.stderr.write(`extract-corrections: ${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	}
}
