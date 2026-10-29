import {spawn} from 'node:child_process';
import {mkdir, open, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {isList, isObject, type Json, type JsonObject, listOf, parseJson, stringOf} from './json.mts';
import {INTERRUPT_PREFIX, isHumanPrompt} from './session.mts';
import {truncate} from './text.mts';
import {type AssistantEntry, type Entry, readEntries, requestTokens} from './transcript.mts';

const SECTION_HEAD = 'Contents of ';
const SECTION_END = '</system-reminder>';
const PASS_THROUGH_TOOLS = ['Skill', 'ToolSearch'];
const MAX_TURNS = 8;
const ACTION_TEXT_LIMIT = 1500;
const ACTION_INPUT_LIMIT = 400;
const OPS: ReadonlySet<string> = new Set(['append', 'insert_after', 'insert_before', 'remove']);

/** One change to the text a loaded instruction file put in context. */
export type InstructionEdit = {
	/** The file's path as the session loaded it. */
	readonly path: string;
	readonly op: 'append' | 'insert_after' | 'insert_before' | 'remove';
	/** The text the edit is placed at or removes; unused by `append`. */
	readonly anchor: string;
	readonly text: string;
};

/** One thing a turn did: a text it wrote, or a tool call it made. */
export type Action = {readonly text: string} | {readonly tool: string; readonly input: string};

/** Where a corrected turn can be regenerated: resume at `resumeAt`, then send the prompt that opened the turn. */
export type ReplayPoint = {
	readonly file: string;
	readonly cwd: string | undefined;
	readonly model: string | undefined;
	/** The tokens of the turn's first request, to compare with a replay's. */
	readonly context: number | undefined;
	readonly resumeAt: string;
	readonly prompt: string;
	/** Assistant messages the turn wrote before the correction. */
	readonly steps: number;
	/** What the turn did up to and including its first tool call, where a replay stops. */
	readonly original: readonly Action[];
};

/** The files a replay copy consists of. */
export type ReplayCopy = {
	readonly copy: string;
	readonly settings: string;
	/** The scratch directories that hold the session-time instruction files, to load with `--add-dir`. */
	readonly addDirs: readonly string[];
};

/** What one regenerated turn did, and the tokens its own requests wrote, read, and produced. */
export type RunSummary = {
	readonly context: number | undefined;
	readonly output: number;
	readonly calls: number;
	readonly cacheWrite: number;
	readonly cacheRead: number;
	readonly turns: number | undefined;
	readonly stop: string | undefined;
	readonly denied: readonly string[];
	readonly actions: readonly Action[];
};

/** One replay run: its stream file, how the process ended, and the summary of what it did. */
export type RunResult = RunSummary & {
	readonly run: string;
	readonly exit: number | null;
};

/** One arm of a replay: the copy it resumes and the arguments that run it. */
export type Arm = {
	readonly name: string;
	readonly dir: string;
	readonly args: readonly string[];
};

const isOp = (op: string): op is InstructionEdit['op'] => OPS.has(op);

/** Reads an edits file: a JSON list of instruction edits; throws on an entry that is not one. */
export function instructionEdits(value: Json): InstructionEdit[] {
	return listOf(value).map((item, i) => {
		const fields = isObject(item) ? item : {};
		const file = stringOf(fields.path);
		const op = stringOf(fields.op) ?? '';
		const anchor = stringOf(fields.anchor) ?? '';
		if (file === undefined || !isOp(op) || (op !== 'append' && anchor === '')) {
			throw new TypeError(`edit ${i + 1}: expected {path, op: append|insert_after|insert_before|remove, anchor, text}`);
		}

		return {path: file, op, anchor, text: stringOf(fields.text) ?? ''};
	});
}

/**
 * The control for a set of edits: one newline before the first edited file's section. Any edit to text that precedes
 * the session's earlier turns drops their reasoning from a replay, so the control carries one to differ from the edited
 * arm only in the lesson.
 */
export const shamEdits = (edits: readonly InstructionEdit[]): InstructionEdit[] =>
	edits.slice(0, 1).map((edit) => ({path: edit.path, op: 'insert_before', anchor: '', text: '\n'}));

function sectionEnd(text: string, from: number): number {
	const next = text.indexOf(`\n\n${SECTION_HEAD}`, from);
	if (next !== -1) {
		return next;
	}

	const last = text.lastIndexOf(SECTION_END);
	return last === -1 ? text.length : last;
}

/**
 * Finds where a rendered block's section for `file` starts: `Contents of <path> (` in an `instructions` block,
 * `Contents of <path>:` in a `nested_memory` one. Returns -1 when the block holds no section for it.
 */
function sectionStart(text: string, file: string): number {
	const head = `${SECTION_HEAD}${file}`;
	for (let at = text.indexOf(head); at !== -1; at = text.indexOf(head, at + 1)) {
		if (text.startsWith(' (', at + head.length) || text.startsWith(':', at + head.length)) {
			return at;
		}
	}

	return -1;
}

/** Applies one edit to the section a rendered instruction block holds for its file; reports whether it changed it. */
export function editRendered(text: string, edit: InstructionEdit): {readonly text: string; readonly hit: boolean} {
	const start = sectionStart(text, edit.path);
	if (start === -1) {
		return {text, hit: false};
	}

	const end = sectionEnd(text, start + SECTION_HEAD.length + edit.path.length);
	const section = text.slice(start, end);
	if (edit.op !== 'append' && !section.includes(edit.anchor)) {
		return {text, hit: false};
	}

	const edited = {
		append: () => `${section.replace(/\n+$/, '')}\n\n${edit.text.replaceAll(/^\n+|\n+$/g, '')}`,
		insert_after: () => section.replace(edit.anchor, () => `${edit.anchor}${edit.text}`),
		insert_before: () => section.replace(edit.anchor, () => `${edit.text}${edit.anchor}`),
		remove: () => section.replace(edit.anchor, ''),
	}[edit.op]();
	return {text: `${text.slice(0, start)}${edited}${text.slice(end)}`, hit: true};
}

/** Lists what assistant messages did, in order, up to and including the first tool call. */
export function firstActions(messages: readonly AssistantEntry[]): Action[] {
	const actions: Action[] = [];
	for (const block of messages.flatMap((message) => message.blocks)) {
		if (block.type === 'tool_use') {
			actions.push({tool: block.name, input: truncate(JSON.stringify(block.input ?? {}), ACTION_INPUT_LIMIT)});
			break;
		}

		if (block.text.trim() !== '') {
			actions.push({text: truncate(block.text, ACTION_TEXT_LIMIT)});
		}
	}

	return actions;
}

/**
 * Finds the replay point of a correction candidate: the typed prompt that opened the turn it corrects, and the message
 * to resume at before that prompt. `id` is the entry uuid a candidate carries, or a tool error's
 * `<uuid>/<tool-use-id>`. A rewind corrects the turn of the nearest prompt it replaced. Throws when a compaction, a
 * command, or a message other than a typed prompt opens the turn, or when no message precedes the prompt.
 */
export async function locateTurn(file: string, id: string): Promise<ReplayPoint> {
	const uuid = id.split('/', 1)[0] ?? id;
	const entries = new Map<string, Entry>();
	const children = new Map<string, Entry[]>();
	let hasOrigin = false;
	for await (const entry of readEntries(file)) {
		if (entry.isSidechain || entry.uuid === undefined) {
			continue;
		}

		entries.set(entry.uuid, entry);
		const siblings = children.get(entry.parentUuid ?? '');
		if (siblings === undefined) {
			children.set(entry.parentUuid ?? '', [entry]);
		} else {
			siblings.push(entry);
		}
		hasOrigin ||= entry.kind === 'user' && entry.origin !== undefined;
	}

	const typed = (entry: Entry): boolean => entry.kind === 'user' && isHumanPrompt(entry, hasOrigin);
	const opensTurn = (entry: Entry): boolean =>
		entry.kind === 'user' &&
		!entry.isMeta &&
		entry.results.length === 0 &&
		!entry.text.trimStart().startsWith(INTERRUPT_PREFIX);
	const descent = (prompt: Entry): Entry[] => {
		const turn: Entry[] = [];
		let next = children.get(prompt.uuid ?? '')?.[0];
		while (next !== undefined && !opensTurn(next)) {
			turn.push(next);
			next = children.get(next.uuid ?? '')?.[0];
		}
		return turn;
	};

	const correction = entries.get(uuid);
	if (correction === undefined) {
		throw new Error(`${uuid}: no such entry in ${file}`);
	}

	const siblings = typed(correction) ? (children.get(correction.parentUuid ?? '') ?? []) : [];
	const replaced = siblings.slice(0, siblings.indexOf(correction)).findLast((entry) => typed(entry));
	let prompt: Entry | undefined = replaced;
	let turn = replaced === undefined ? [] : descent(replaced);
	if (!turn.some((entry) => entry.kind === 'assistant')) {
		turn = [];
		prompt = entries.get(correction.parentUuid ?? '');
		while (prompt !== undefined && !opensTurn(prompt)) {
			turn.unshift(prompt);
			prompt = entries.get(prompt.parentUuid ?? '');
		}
	}

	if (prompt?.kind !== 'user' || !isHumanPrompt(prompt, hasOrigin)) {
		const opener = prompt?.kind === 'user' ? truncate(prompt.text.trim(), 80) : 'a compaction or the session start';
		throw new Error(`${uuid}: the turn it corrects opens with ${opener}, not a typed prompt`);
	}

	let resume = entries.get(prompt.parentUuid ?? '');
	while (resume !== undefined && resume.kind !== 'user' && resume.kind !== 'assistant') {
		resume = entries.get(resume.parentUuid ?? '');
	}

	if (resume?.uuid === undefined) {
		throw new Error(`${uuid}: no message precedes the prompt that opens its turn`);
	}

	const messages = turn.filter((entry) => entry.kind === 'assistant');
	return {
		file,
		cwd: prompt.cwd,
		model: messages[0]?.model,
		context: messages[0]?.context,
		resumeAt: resume.uuid,
		prompt: prompt.text.trim(),
		steps: messages.length,
		original: firstActions(messages),
	};
}

/**
 * Lists, as `claudeMdExcludes` patterns, the instruction files the CLI loads from disk for a session in `cwd`: the
 * project files of `cwd` and every ancestor, the user layer, and every file below `cwd`.
 */
export function diskInstructions(cwd: string, home: string): string[] {
	const ancestors = [cwd];
	for (let dir = path.dirname(cwd); dir !== ancestors.at(-1); dir = path.dirname(dir)) {
		ancestors.push(dir);
	}

	const patterns = ancestors.flatMap((dir) => [
		path.join(dir, 'CLAUDE.md'),
		path.join(dir, 'CLAUDE.local.md'),
		path.join(dir, '.claude', 'CLAUDE.md'),
		path.join(dir, '.claude', 'rules', '**'),
	]);
	return [
		...new Set([
			...patterns,
			path.join(home, '.claude', 'CLAUDE.md'),
			path.join(home, '.claude', 'rules', '**'),
			path.join(cwd, '**'),
		]),
	];
}

/** Builds the shell command that runs `script stop-hook` under `node`, each part quoted. */
export const stopHookCommand = (node: string, script: string): string =>
	[node, script, 'stop-hook'].map((part) => `'${part.replaceAll("'", String.raw`'\''`)}'`).join(' ');

/**
 * Writes a replay copy of the transcript `source` into `dir`, cut after the entry `resumeAt`. Each rendered instruction
 * section takes the edits, a nested file's included, and each loaded file moves to a scratch copy of its session-time
 * text; the settings load the copies and exclude the files on disk. On resume the CLI compares the recorded files with
 * the ones it loads and appends any that differ, so the scratch copies hold the replay at the session-time text plus
 * the edits. Throws, and writes nothing, when an edit matches no rendered section.
 */
export async function buildCopy({
	source,
	dir,
	edits,
	resumeAt,
	cwd,
	home,
	disabledPlugins,
	hookCommand,
}: {
	readonly source: string;
	readonly dir: string;
	readonly edits: readonly InstructionEdit[];
	readonly resumeAt: string;
	readonly cwd: string;
	readonly home: string;
	readonly disabledPlugins: readonly string[];
	readonly hookCommand: string;
}): Promise<ReplayCopy> {
	const memoryDir = path.join(dir, 'memory');
	const scratch = new Map<string, {readonly file: string; readonly type: string}>();
	const contents = new Map<string, string>();
	const hits = edits.map(() => 0);

	const remap = (file: Json): Json => {
		if (!isObject(file)) {
			return file;
		}

		const original = stringOf(file.path) ?? '';
		let target = scratch.get(original);
		if (target === undefined) {
			const loaded = [...scratch.values()].filter(({type}) => type !== 'AutoMem').length;
			target =
				file.type === 'AutoMem'
					? {file: path.join(memoryDir, path.basename(original)), type: 'AutoMem'}
					: {file: path.join(dir, 'ctx', String(loaded), 'CLAUDE.md'), type: 'Project'};
			scratch.set(original, target);
		}
		contents.set(target.file, stringOf(file.content) ?? '');
		return {...file, path: target.file, type: target.type};
	};

	const edit = (block: Json): Json => {
		if (!isObject(block) || typeof block.content !== 'string') {
			return block;
		}

		let content = block.content;
		for (const [i, change] of edits.entries()) {
			const result = editRendered(content, change);
			content = result.text;
			hits[i] = (hits[i] ?? 0) + Number(result.hit);
		}
		return {...block, content};
	};

	const controlled = (entry: JsonObject, attachment: JsonObject): JsonObject => {
		const removed: JsonObject =
			attachment.removed === undefined
				? {}
				: {removed: listOf(attachment.removed).map((file) => scratch.get(stringOf(file) ?? '')?.file ?? file)};
		const remapped: JsonObject = {
			...attachment,
			...removed,
			files: listOf(attachment.files).map((file) => remap(file)),
		};
		return {...entry, attachment: remapped, rendered: listOf(entry.rendered).map((block) => edit(block))};
	};

	const lines: string[] = [];
	const text = await readFile(source, 'utf8');
	for (const line of text.split('\n')) {
		if (line.trim() === '') {
			continue;
		}

		let entry: Json;
		try {
			entry = parseJson(line);
		} catch {
			lines.push(line);
			continue;
		}

		if (!isObject(entry)) {
			lines.push(line);
			continue;
		}

		if (stringOf(entry.type)?.startsWith('api-request') === true) {
			continue;
		}

		const attachment = isObject(entry.attachment) ? entry.attachment : undefined;
		if (attachment?.type === 'instructions') {
			lines.push(JSON.stringify(controlled(entry, attachment)));
		} else if (attachment?.type === 'nested_memory' && isList(entry.rendered)) {
			lines.push(JSON.stringify({...entry, rendered: entry.rendered.map((block) => edit(block))}));
		} else {
			lines.push(line);
		}
		if (entry.uuid === resumeAt) {
			break;
		}
	}

	const missed = edits.filter((_change, i) => hits[i] === 0);
	if (missed.length > 0) {
		const named = missed.map((change) => `${change.op} in ${change.path}`).join('; ');
		throw new Error(
			`edits that match no rendered section, for a file the session never loaded or text it lacks: ${named}`,
		);
	}

	const loaded = [...scratch].filter(([, {type}]) => type !== 'AutoMem');
	const excludes = [...loaded.map(([original]) => original).toSorted(), ...diskInstructions(cwd, home)];
	const settings = {
		enabledPlugins: Object.fromEntries(disabledPlugins.map((plugin) => [plugin, false])),
		autoMemoryEnabled: true,
		autoMemoryDirectory: memoryDir,
		autoDreamEnabled: false,
		permissions: {allow: PASS_THROUGH_TOOLS},
		claudeMdExcludes: [...new Set(excludes)],
		hooks: {PreToolUse: [{matcher: '*', hooks: [{type: 'command', command: hookCommand}]}]},
	};
	const copy = path.join(dir, path.basename(source));
	const settingsFile = path.join(dir, 'settings.json');
	const addDirs = loaded.map(([, {file}]) => path.dirname(file));

	await Promise.all([memoryDir, ...addDirs].map(async (scratchDir) => mkdir(scratchDir, {recursive: true})));
	await Promise.all([
		writeFile(copy, `${lines.join('\n')}\n`),
		writeFile(settingsFile, `${JSON.stringify(settings, null, '\t')}\n`),
		...[...contents].map(async ([file, content]) => writeFile(file, content)),
	]);

	return {copy, settings: settingsFile, addDirs};
}

/** Builds the `claude` arguments that regenerate one turn from a replay copy without persisting the run. */
export function replayArgs({
	copy,
	point,
	model,
	effort,
}: {
	readonly copy: ReplayCopy;
	readonly point: ReplayPoint;
	readonly model: string | undefined;
	readonly effort: string | undefined;
}): string[] {
	return [
		'-p',
		point.prompt,
		'--resume',
		copy.copy,
		'--fork-session',
		'--resume-session-at',
		point.resumeAt,
		'--no-session-persistence',
		'--strict-mcp-config',
		'--permission-mode',
		'dontAsk',
		'--settings',
		copy.settings,
		...copy.addDirs.flatMap((dir) => ['--add-dir', dir]),
		...(model === undefined ? [] : ['--model', model]),
		...(effort === undefined ? [] : ['--effort', effort]),
		'--max-turns',
		String(MAX_TURNS),
		'--output-format',
		'stream-json',
		'--verbose',
	];
}

/** Decides a tool call in a replay: lets the instruction-loading tools run, and stops the turn at any other call. */
export function stopHookOutput(toolName: string): Json | undefined {
	if (PASS_THROUGH_TOOLS.includes(toolName)) {
		return undefined;
	}

	return {
		continue: false,
		stopReason: 'replay stopped at its first action',
		hookSpecificOutput: {
			hookEventName: 'PreToolUse',
			permissionDecision: 'deny',
			permissionDecisionReason: 'replay: tools do not run',
		},
	};
}

const tokens = (value: Json | undefined): number => (typeof value === 'number' ? value : 0);

function blockAction(block: Json): Action[] {
	if (!isObject(block)) {
		return [];
	}

	if (block.type === 'tool_use') {
		return [{tool: stringOf(block.name) ?? '', input: truncate(JSON.stringify(block.input ?? {}), ACTION_INPUT_LIMIT)}];
	}

	const text = block.type === 'text' ? (stringOf(block.text) ?? '') : '';
	return text.trim() === '' ? [] : [{text: truncate(text, ACTION_TEXT_LIMIT)}];
}

/**
 * Summarizes the stream-json output of one replay. Each streamed message carries its request's input and cache counts
 * but the output count of its first token, so the output comes from the result's `usage`, which holds the run's own
 * requests; a run killed before its result falls back to the streamed counts. The result's cost fields go unread: on
 * resume they include the usage of the session resumed.
 */
export function summarizeRun(text: string): RunSummary {
	const calls = new Map<string, {output: number; cacheWrite: number; cacheRead: number}>();
	const actions: Action[] = [];
	let context: number | undefined;
	let result: JsonObject = {};

	for (const line of text.split('\n')) {
		let event: Json;
		try {
			event = parseJson(line);
		} catch {
			continue;
		}

		if (isObject(event) && event.type === 'result') {
			result = event;
		}

		const message =
			isObject(event) && event.type === 'assistant' && isObject(event.message) ? event.message : undefined;
		if (message === undefined) {
			continue;
		}

		const usage = isObject(message.usage) ? message.usage : {};
		const id = stringOf(message.id) ?? String(calls.size);
		const known = calls.get(id) ?? {output: 0, cacheWrite: 0, cacheRead: 0};
		calls.set(id, {
			output: Math.max(known.output, tokens(usage.output_tokens)),
			cacheWrite: Math.max(known.cacheWrite, tokens(usage.cache_creation_input_tokens)),
			cacheRead: Math.max(known.cacheRead, tokens(usage.cache_read_input_tokens)),
		});
		context ??= requestTokens(message.usage);
		actions.push(...listOf(message.content).flatMap((block) => blockAction(block)));
	}

	const sum = (key: 'output' | 'cacheWrite' | 'cacheRead'): number =>
		[...calls.values()].reduce((total, call) => total + call[key], 0);
	return {
		context,
		output: Math.max(sum('output'), tokens(isObject(result.usage) ? result.usage.output_tokens : undefined)),
		calls: calls.size,
		cacheWrite: sum('cacheWrite'),
		cacheRead: sum('cacheRead'),
		turns: typeof result.num_turns === 'number' ? result.num_turns : undefined,
		stop: stringOf(result.stop_reason),
		denied: listOf(result.permission_denials).flatMap((denial) =>
			isObject(denial) && typeof denial.tool_name === 'string' ? [denial.tool_name] : [],
		),
		actions,
	};
}

/**
 * Runs one replay: `command` followed by `args`, in `cwd`, its output to `out` and its stderr to `out.err`; kills it
 * after `timeoutMs`. Resolves to the exit code, or null when a signal ended it.
 */
export async function runReplay({
	command,
	args,
	cwd,
	out,
	timeoutMs,
}: {
	readonly command: readonly string[];
	readonly args: readonly string[];
	readonly cwd: string;
	readonly out: string;
	readonly timeoutMs: number;
}): Promise<number | null> {
	const [binary = 'claude', ...prefix] = command;
	const stdout = await open(out, 'w');
	try {
		const stderr = await open(`${out}.err`, 'w');
		try {
			const {promise, resolve, reject} = Promise.withResolvers<number | null>();
			const child = spawn(binary, [...prefix, ...args], {
				cwd,
				env: {...process.env, CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: '1'},
				stdio: ['ignore', stdout.fd, stderr.fd],
				timeout: timeoutMs,
			});
			child.on('error', reject);
			child.on('close', (code) => {
				resolve(code);
			});
			return await promise;
		} finally {
			await stderr.close();
		}
	} finally {
		await stdout.close();
	}
}

/**
 * Runs `samples` replays of every arm and summarizes each. The arms' first samples run first, one per arm, and each
 * writes its arm's prompt cache; the other samples of every arm start together once those end, and read that cache.
 */
export async function runArms({
	arms,
	samples,
	command,
	cwd,
	timeoutMs,
}: {
	readonly arms: readonly Arm[];
	readonly samples: number;
	readonly command: readonly string[];
	readonly cwd: string;
	readonly timeoutMs: number;
}): Promise<Map<string, RunResult[]>> {
	const sample = async (arm: Arm, n: number): Promise<RunResult> => {
		const out = path.join(arm.dir, `run-${n}.jsonl`);
		const exit = await runReplay({command, args: arm.args, cwd, out, timeoutMs});
		return {run: out, exit, ...summarizeRun(await readFile(out, 'utf8'))};
	};

	const first = await Promise.all(arms.map(async (arm) => sample(arm, 1)));
	const rest = await Promise.all(
		arms.map(async (arm) => Promise.all(Array.from({length: samples - 1}, async (_unused, i) => sample(arm, i + 2)))),
	);
	return new Map(arms.map((arm, i) => [arm.name, [first[i], ...(rest[i] ?? [])].filter((run) => run !== undefined)]));
}
