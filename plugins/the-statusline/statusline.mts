#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import posixpath from 'node:path/posix';
import {text} from 'node:stream/consumers';
import {stripVTControlCharacters} from 'node:util';

type Entry = Readonly<Record<string, unknown>>;

/** A rate-limit window as the payload reports it: usage in percent and the reset time in Unix epoch seconds. */
export type RateLimitWindow = {readonly used_percentage?: number; readonly resets_at?: number};

/**
 * The status line payload fields this renderer reads, each dropped when its value has another type. Full schema:
 * https://code.claude.com/docs/en/statusline#available-data
 */
export type SessionData = {
	readonly cwd?: string;
	readonly model?: {readonly display_name?: string};
	readonly effort?: {readonly level?: string};
	readonly workspace?: {readonly current_dir?: string; readonly project_dir?: string};
	readonly output_style?: {readonly name?: string};
	readonly cost?: {
		readonly total_cost_usd?: number;
		readonly total_lines_added?: number;
		readonly total_lines_removed?: number;
	};
	readonly context_window?: {readonly remaining_percentage?: number};
	readonly rate_limits?: {readonly five_hour?: RateLimitWindow; readonly seven_day?: RateLimitWindow};
	readonly worktree?: {readonly name?: string; readonly path?: string; readonly original_cwd?: string};
};

type Row1Level = {readonly style: boolean; readonly effort: boolean; readonly reset: boolean; readonly cost: boolean};
type Row2Level = {
	readonly lines: boolean;
	readonly branch: 'full' | 'short' | 'none';
	readonly worktree: 'full' | 'short';
};

const RESET = '\u001B[0m';

// shortcut: a guess at Claude Code's spacing around the status line — measure it if row 1 wraps or leaves a gap
const RESERVED_COLUMNS = 4;

const FALLBACK_PATH_WIDTH = 50;

const MIN_PATH_WIDTH = 12;

const SHORT_BRANCH_WIDTH = 16;

const ROW1_LEVELS: readonly Row1Level[] = [
	{style: true, effort: true, reset: true, cost: true},
	{style: true, effort: false, reset: true, cost: true},
	{style: false, effort: false, reset: true, cost: true},
	{style: false, effort: false, reset: false, cost: true},
	{style: false, effort: false, reset: false, cost: false},
];

const ROW2_LEVELS: readonly Row2Level[] = [
	{lines: true, branch: 'full', worktree: 'full'},
	{lines: true, branch: 'full', worktree: 'short'},
	{lines: false, branch: 'full', worktree: 'short'},
	{lines: false, branch: 'short', worktree: 'short'},
	{lines: false, branch: 'none', worktree: 'short'},
];

const RATE_LIMIT_WINDOWS = [
	{key: 'five_hour', label: '5h', durationSeconds: 5 * 60 * 60},
	{key: 'seven_day', label: '7d', durationSeconds: 7 * 24 * 60 * 60},
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const isRecord = (value: unknown): value is Entry => typeof value === 'object' && value !== null;
const stringOf = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const numberOf = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const recordOf = <T,>(value: unknown, read: (entry: Entry) => T): T | undefined =>
	isRecord(value) ? read(value) : undefined;

const windowOf = (value: unknown): RateLimitWindow | undefined =>
	recordOf(value, (w) => ({used_percentage: numberOf(w.used_percentage), resets_at: numberOf(w.resets_at)}));

/** Reads the payload fields the renderer uses; throws when the payload is not a JSON object. */
export function parseSession(value: unknown): SessionData {
	if (!isRecord(value)) {
		throw new TypeError('expected a JSON object');
	}

	return {
		cwd: stringOf(value.cwd),
		model: recordOf(value.model, (m) => ({display_name: stringOf(m.display_name)})),
		effort: recordOf(value.effort, (e) => ({level: stringOf(e.level)})),
		workspace: recordOf(value.workspace, (w) => ({
			current_dir: stringOf(w.current_dir),
			project_dir: stringOf(w.project_dir),
		})),
		output_style: recordOf(value.output_style, (s) => ({name: stringOf(s.name)})),
		cost: recordOf(value.cost, (c) => ({
			total_cost_usd: numberOf(c.total_cost_usd),
			total_lines_added: numberOf(c.total_lines_added),
			total_lines_removed: numberOf(c.total_lines_removed),
		})),
		context_window: recordOf(value.context_window, (w) => ({remaining_percentage: numberOf(w.remaining_percentage)})),
		rate_limits: recordOf(value.rate_limits, (r) => ({
			five_hour: windowOf(r.five_hour),
			seven_day: windowOf(r.seven_day),
		})),
		worktree: recordOf(value.worktree, (w) => ({
			name: stringOf(w.name),
			path: stringOf(w.path),
			original_cwd: stringOf(w.original_cwd),
		})),
	};
}

function writeScriptError(error: unknown): void {
	const errorFile = path.join(import.meta.dirname, 'statusline.error.log');
	const timestamp = new Date().toISOString();
	const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);

	fs.appendFileSync(errorFile, `[${timestamp}]\n${message}\n\n`);
}

const ansi256 = (n: number): string => `\u001B[38;5;${n}m`;

const color = (colorNum: number, value: string): string => `${ansi256(colorNum)}${value}${RESET}`;

const c = {
	gray: (t: string): string => color(245, t),
	green: (t: string): string => color(151, t),
	yellow: (t: string): string => color(223, t),
	blue: (t: string): string => color(153, t),
	magenta: (t: string): string => color(182, t),
	cyan: (t: string): string => color(152, t),
	red: (t: string): string => color(174, t),
};

/**
 * Colors text by the percentage remaining, in 10-point steps below 60%: dim gray, light gray, pale yellow, bright
 * yellow, orange, red, then bright red-pink under 10%. Luminosity rises with urgency.
 */
export function colorByUrgency(percent: number, value: string): string {
	let colorNum: number;

	if (percent >= 60) {
		colorNum = 245;
	} else if (percent >= 50) {
		colorNum = 251;
	} else if (percent >= 40) {
		colorNum = 228;
	} else if (percent >= 30) {
		colorNum = 220;
	} else if (percent >= 20) {
		colorNum = 208;
	} else if (percent >= 10) {
		colorNum = 196;
	} else {
		colorNum = 197;
	}

	return color(colorNum, value);
}

/** Returns the width of a string in terminal columns, terminal escapes excluded. */
export function visibleWidth(value: string): number {
	// shortcut: one column per code point, so CJK and emoji undercount — add East Asian Width if rows misalign
	// oxlint-disable-next-line typescript/no-misused-spread -- counts code points, the ceiling the shortcut above names
	return [...stripVTControlCharacters(value)].length;
}

function readPadding(): number {
	try {
		const settings: unknown = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'settings.json'), 'utf8'));
		const padding = isRecord(settings) && isRecord(settings.statusLine) ? settings.statusLine.padding : undefined;
		return typeof padding === 'number' && Number.isFinite(padding) ? padding : 0;
	} catch {
		// padding only tunes alignment; an unreadable settings file must not blank the status line
		return 0;
	}
}

function readAvailableWidth(): number | null {
	// constraint: Claude Code captures stdout, so the terminal width reaches the script only as COLUMNS
	const columns = Number(process.env.COLUMNS);
	if (!Number.isFinite(columns) || columns <= 0) {
		return null;
	}

	return columns - RESERVED_COLUMNS - 2 * readPadding();
}

/** Formats output style, model and effort: "Style (Model · effort)", or "Model" alone when the style is left out. */
export function formatStyleModel(data: SessionData, level: Pick<Row1Level, 'style' | 'effort'>): string {
	let style = data.output_style?.name ?? 'default';
	const model = data.model?.display_name ?? 'unknown';
	const effort = level.effort ? (data.effort?.level ?? '') : '';

	const pluginPrefixEnd = style.indexOf(':');
	if (pluginPrefixEnd !== -1) {
		style = style.slice(pluginPrefixEnd + 1).trim();
	}

	const engine = effort === '' ? model : `${model} · ${effort}`;
	if (!level.style) {
		return c.yellow(engine);
	}

	return `${c.green(style)} ${c.yellow(`(${engine})`)}`;
}

/** Trims a string from the middle, keeping its start and end around an ellipsis: "very-...name" for 12 columns. */
export function trimMiddle(str: string, maxWidth: number): string {
	if (str.length <= maxWidth) {
		return str;
	}

	const ellipsis = '...';
	const available = maxWidth - ellipsis.length;
	if (available <= 0) {
		return str.slice(0, maxWidth);
	}

	return str.slice(0, Math.ceil(available / 2)) + ellipsis + str.slice(-Math.floor(available / 2));
}

/**
 * Collapses a path to fit within maxWidth, in three stages: directory segments shorten to their first letter, then
 * the segments after the first give way to an ellipsis, then the last segment (current folder) trims in the middle.
 * Always uses unix-style separators.
 */
export function collapsePath(unixPath: string, maxWidth: number): string {
	if (unixPath.length <= maxWidth) {
		return unixPath;
	}

	let overdue = unixPath.length - maxWidth;
	const root = unixPath.startsWith(posixpath.sep) ? posixpath.sep : '';
	const segments = posixpath
		.dirname(unixPath.slice(root.length))
		.split(posixpath.sep)
		.filter((seg) => seg !== '');

	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i] ?? '';
		overdue -= segment.length - 1;
		segments[i] = segment.slice(0, 1);
		if (overdue <= 0) {
			break;
		}
	}

	if (segments.length > 2 && overdue > 0) {
		const ellipsis = '...';

		for (let i = 1; i < segments.length; i++) {
			const segment = segments[i] ?? '';
			overdue -= segment.length + 1;

			if (i === 1) {
				overdue -= segment.length - 1;
				segments[i] = ellipsis;
			} else {
				segments[i] = '';
			}

			if (overdue <= 0) {
				break;
			}
		}
	}

	let basename = posixpath.basename(unixPath);
	if (overdue > 0) {
		basename = trimMiddle(basename, Math.max(basename.length - overdue, 0));
	}

	return root + posixpath.join(...segments.filter((seg) => seg !== ''), basename);
}

const toUnixPath = (p: string): string => p.replaceAll('\\', '/');

/** Replaces the home directory prefix with "~". */
export function toHomeRelative(unixPath: string): string {
	const homedir = toUnixPath(os.homedir());
	return unixPath === homedir || unixPath.startsWith(`${homedir}/`) ? `~${unixPath.slice(homedir.length)}` : unixPath;
}

/**
 * Resolves the working directory for display: the project root as a path, a subdirectory as "$/sub/dir". In a
 * worktree session the root is shown as the repository the worktree was created from, tagged as a worktree, instead
 * of its .claude/worktrees/... location. Returns the uncollapsed path and the tag that follows it.
 */
export function resolveLocation(data: SessionData, worktreeTag: 'full' | 'short'): {path: string; tag: string} {
	const cwd = toUnixPath(data.cwd ?? data.workspace?.current_dir ?? '');
	const {worktree} = data;
	const root = toUnixPath(worktree?.path ?? data.workspace?.project_dir ?? '');
	const relPath = root === '' ? '..' : posixpath.relative(root, cwd);

	if (relPath === '..' || relPath.startsWith('../')) {
		return {path: toHomeRelative(cwd), tag: ''};
	}

	const name = worktree?.name ?? '';
	let tag = '';
	if (name !== '') {
		tag = worktreeTag === 'full' ? ` [wt ${name}]` : ' [wt]';
	}

	const shown = relPath === '' ? toHomeRelative(toUnixPath(worktree?.original_cwd ?? root)) : `$/${relPath}`;

	return {path: shown, tag};
}

/**
 * Returns the branch checked out in the repository that contains `dir`, linked worktrees included: the branch name, a
 * short commit hash on a detached HEAD, or null outside a repository.
 */
export function readGitBranch(dir: string): string | null {
	let current = dir;

	while (current !== '') {
		const dotGit = path.join(current, '.git');
		const dotGitStat = fs.statSync(dotGit, {throwIfNoEntry: false});

		if (dotGitStat !== undefined) {
			let gitDir = dotGit;
			if (dotGitStat.isFile()) {
				const pointer = /^gitdir:\s*(?<gitDir>.+)$/m.exec(fs.readFileSync(dotGit, 'utf8'))?.groups?.gitDir;
				if (pointer === undefined) {
					return null;
				}
				gitDir = path.resolve(current, pointer.trim());
			}

			const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
			const branch = /^ref:\s*(?:refs\/heads\/)?(?<branch>.+)$/.exec(head)?.groups?.branch;
			return branch ?? head.slice(0, 7);
		}

		const parent = path.dirname(current);
		if (parent === current) {
			return null;
		}
		current = parent;
	}

	return null;
}

function resolveBranch(data: SessionData): string | null {
	const cwd = data.cwd ?? data.workspace?.current_dir ?? '';
	if (cwd === '') {
		return null;
	}

	try {
		return readGitBranch(cwd);
	} catch {
		// the branch is optional context; an unreadable .git must not blank the status line
		return null;
	}
}

/** Formats lines added and removed in the session: "+12 −3". */
export function formatLinesChanged(data: SessionData): string {
	const added = data.cost?.total_lines_added ?? 0;
	const removed = data.cost?.total_lines_removed ?? 0;
	return `${c.green(`+${added}`)} ${c.red(`−${removed}`)}`;
}

/** Formats the session cost in USD. */
export function formatCost(data: SessionData): string {
	const cost = data.cost?.total_cost_usd ?? 0;
	return c.magenta(`$${cost.toFixed(2)}`);
}

/** Formats the context window's remaining percentage, or "--%" before the payload reports one. */
export function formatContextRemaining(data: SessionData): string {
	const remaining = data.context_window?.remaining_percentage;
	if (remaining === undefined) {
		return c.gray('ctx left --%');
	}

	return colorByUrgency(remaining, `ctx left ${Math.round(remaining)}%`);
}

/** Formats a reset time as local 24h "HH:MM", prefixed with the weekday when it is a day or more away. */
export function formatResetTime(epochSeconds: number, nowSeconds: number): string {
	const date = new Date(epochSeconds * 1000);
	const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
	return epochSeconds - nowSeconds < 24 * 60 * 60 ? hhmm : `${WEEKDAYS[date.getDay()] ?? ''} ${hhmm}`;
}

/**
 * Projects when a rate-limit window runs out if consumption keeps the average pace of the window so far, in Unix
 * epoch seconds; Infinity when nothing is consumed yet.
 */
export function projectExhaustion(limitWindow: RateLimitWindow, durationSeconds: number, nowSeconds: number): number {
	const used = limitWindow.used_percentage ?? 0;
	if (used >= 100) {
		return nowSeconds;
	}

	const elapsed = nowSeconds - ((limitWindow.resets_at ?? Number.NaN) - durationSeconds);
	if (used <= 0 || !(elapsed > 0)) {
		return Infinity;
	}

	return nowSeconds + ((100 - used) * elapsed) / used;
}

/**
 * Formats the rate-limit window closer to stopping the session, or returns null when no window is reported. A window
 * stops the session when its projected exhaustion comes before its reset, and the earliest such window wins. When no
 * window stops the session, the one with less left wins.
 */
export function formatRateLimit(data: SessionData, level: Pick<Row1Level, 'reset'>): string | null {
	const nowSeconds = Date.now() / 1000;

	let closest: {label: string; limitWindow: RateLimitWindow; stopsAt: number; remaining: number} | null = null;
	for (const {key, label, durationSeconds} of RATE_LIMIT_WINDOWS) {
		const limitWindow = data.rate_limits?.[key];
		if (limitWindow === undefined) {
			continue;
		}

		const exhaustsAt = projectExhaustion(limitWindow, durationSeconds, nowSeconds);
		const candidate = {
			label,
			limitWindow,
			stopsAt: exhaustsAt < (limitWindow.resets_at ?? Number.NaN) ? exhaustsAt : Infinity,
			remaining: Math.max(0, 100 - (limitWindow.used_percentage ?? 0)),
		};

		const isCloser =
			closest === null ||
			candidate.stopsAt < closest.stopsAt ||
			(candidate.stopsAt === closest.stopsAt && candidate.remaining < closest.remaining);
		if (isCloser) {
			closest = candidate;
		}
	}

	if (closest === null) {
		return null;
	}

	const resetsAt = closest.limitWindow.resets_at ?? 0;
	const resetLabel = level.reset && resetsAt !== 0 ? ` til ${formatResetTime(resetsAt, nowSeconds)}` : '';
	return colorByUrgency(closest.remaining, `${closest.label} left ${Math.round(closest.remaining)}%${resetLabel}`);
}

/**
 * Formats first row of status line: style, model and cost; context and rate limit at the row end.
 * Walks ROW1_LEVELS until a variant fits; the sparsest one renders even when it doesn't.
 */
export function formatRow1(data: SessionData, width: number | null): string {
	const minGap = 3;

	for (const [index, level] of ROW1_LEVELS.entries()) {
		const left = [formatStyleModel(data, level), level.cost ? formatCost(data) : '']
			.filter((part) => part !== '')
			.join(c.gray(' | '));

		const right = [formatContextRemaining(data), formatRateLimit(data, level) ?? '']
			.filter((part) => part !== '')
			.join(c.gray(' · '));

		if (width === null) {
			return left + c.gray(' | ') + right;
		}

		const gap = width - visibleWidth(left) - visibleWidth(right);
		if (gap >= minGap || index === ROW1_LEVELS.length - 1) {
			return left + ' '.repeat(Math.max(gap, minGap)) + right;
		}
	}

	throw new Error('ROW1_LEVELS is empty');
}

/**
 * Formats second row of status line: location, branch and lines changed. Walks ROW2_LEVELS until the path keeps
 * MIN_PATH_WIDTH after the other segments; the sparsest level renders even when it doesn't.
 */
export function formatRow2(data: SessionData, width: number | null): string {
	const separator = ' | ';
	const branch = resolveBranch(data) ?? '';

	for (const [index, level] of ROW2_LEVELS.entries()) {
		let branchLabel = '';
		if (branch !== '' && level.branch !== 'none') {
			branchLabel = c.cyan(level.branch === 'full' ? branch : trimMiddle(branch, SHORT_BRANCH_WIDTH));
		}

		const tail = [branchLabel, level.lines ? formatLinesChanged(data) : ''].filter((part) => part !== '').join(' ');

		const {path: dirPath, tag} = resolveLocation(data, level.worktree);
		const tailWidth = tail === '' ? 0 : visibleWidth(tail) + separator.length;
		const pathWidth = width === null ? FALLBACK_PATH_WIDTH : width - tailWidth - tag.length;

		if (width === null || pathWidth >= MIN_PATH_WIDTH || index === ROW2_LEVELS.length - 1) {
			const location = c.blue(collapsePath(dirPath, Math.max(pathWidth, 1))) + c.gray(tag);
			return tail === '' ? location : location + c.gray(separator) + tail;
		}
	}

	throw new Error('ROW2_LEVELS is empty');
}

async function main(): Promise<void> {
	const data = parseSession(JSON.parse(await text(process.stdin)));
	const width = readAvailableWidth();

	process.stdout.write([formatRow1(data, width), formatRow2(data, width)].join('\n'));
}

if (import.meta.main) {
	process.on('uncaughtException', (error) => {
		writeScriptError(error);
		process.exit(1);
	});

	process.on('unhandledRejection', (reason) => {
		writeScriptError(reason);
		process.exit(1);
	});

	await main();
}
