#!/usr/bin/env node

import process from 'node:process';
import posixpath from 'node:path/posix';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';

/**
 * Writes error to a log file next to the script.
 * @param {unknown} err
 */
function writeScriptError(err) {
	const scriptDir = path.dirname(fileURLToPath(import.meta.url));
	const errorFile = path.join(scriptDir, 'statusline.error.log');

	const timestamp = new Date().toISOString();
	const message = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);

	fs.appendFileSync(errorFile, `[${timestamp}]\n${message}\n\n`);
}

const RESET = '\u001B[0m';

// shortcut: a guess at Claude Code's spacing around the status line — measure it if row 1 wraps or leaves a gap
const RESERVED_COLUMNS = 4;

const FALLBACK_PATH_WIDTH = 50;

const MIN_PATH_WIDTH = 12;

const SHORT_BRANCH_WIDTH = 16;

const ROW1_LEVELS = [
	{style: true, effort: true, reset: true, cost: true},
	{style: true, effort: false, reset: true, cost: true},
	{style: false, effort: false, reset: true, cost: true},
	{style: false, effort: false, reset: false, cost: true},
	{style: false, effort: false, reset: false, cost: false},
];

const ROW2_LEVELS = [
	{lines: true, branch: 'full', worktree: 'full'},
	{lines: true, branch: 'full', worktree: 'short'},
	{lines: false, branch: 'full', worktree: 'short'},
	{lines: false, branch: 'short', worktree: 'short'},
	{lines: false, branch: 'none', worktree: 'short'},
];

/** @type {{key: keyof RateLimitsData, label: string, durationSeconds: number}[]} */
const RATE_LIMIT_WINDOWS = [
	{key: 'five_hour', label: '5h', durationSeconds: 5 * 60 * 60},
	{key: 'seven_day', label: '7d', durationSeconds: 7 * 24 * 60 * 60},
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Returns 256-color ANSI escape code.
 * @param {number} n - Color number (0-255)
 * @returns {string}
 */
function ansi256(n) {
	return `\u001B[38;5;${n}m`;
}

/**
 * Wraps text with 256-color code and reset.
 * @param {number} colorNum - 256-color number
 * @param {string} text - Text to colorize
 * @returns {string}
 */
function color(colorNum, text) {
	return `${ansi256(colorNum)}${text}${RESET}`;
}

const c = {
	gray: (t) => color(245, t),
	green: (t) => color(151, t),
	yellow: (t) => color(223, t),
	blue: (t) => color(153, t),
	magenta: (t) => color(182, t),
	cyan: (t) => color(152, t),
	red: (t) => color(174, t),
};

/**
 * Colors text by the percentage remaining, in 10-point steps below 60%: dim gray, light gray, pale yellow, bright
 * yellow, orange, red, then bright red-pink under 10%. Luminosity rises with urgency.
 * @param {number} percent - Remaining percentage (0-100)
 * @param {string} text - Text to colorize
 * @returns {string}
 */
function colorByUrgency(percent, text) {
	let colorNum;

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

	return `${ansi256(colorNum)}${text}${RESET}`;
}

/**
 * Returns the width of a string in terminal columns, color escapes excluded.
 * @param {string} text
 * @returns {number}
 */
function visibleWidth(text) {
	// shortcut: one column per code point, so CJK and emoji undercount — add East Asian Width if rows misalign
	// oxlint-disable-next-line typescript/no-misused-spread -- counts code points, the ceiling the shortcut above names
	return [...stripVTControlCharacters(text)].length;
}

/**
 * @typedef {object} CostData
 * @property {number} total_cost_usd - Estimated session cost in USD, at list price
 * @property {number} total_lines_added - Lines added in session
 * @property {number} total_lines_removed - Lines removed in session
 */

/**
 * @typedef {object} ContextWindowData
 * @property {number|null} remaining_percentage - Remaining share of the model's full context window (0-100), null
 *     early in session
 */

/**
 * @typedef {object} RateLimitWindow
 * @property {number} used_percentage - Usage percentage (0-100)
 * @property {number} resets_at - Reset time (Unix epoch seconds)
 */

/**
 * @typedef {object} RateLimitsData
 * @property {RateLimitWindow} [five_hour] - 5-hour window
 * @property {RateLimitWindow} [seven_day] - 7-day window
 */

/**
 * @typedef {object} WorktreeData
 * @property {string} name - Worktree name
 * @property {string} path - Absolute path to the worktree directory
 * @property {string} original_cwd - Directory the session was in before entering the worktree
 */

/**
 * The status line payload fields this renderer reads. Full schema:
 * https://code.claude.com/docs/en/statusline#available-data
 *
 * @typedef {object} SessionData
 * @property {string} cwd - Current working directory
 * @property {{display_name: string}} model - Model information
 * @property {{level: string}} [effort] - Reasoning effort; absent when the model doesn't support it
 * @property {{current_dir: string, project_dir: string}} workspace - Workspace paths
 * @property {{name: string}} output_style - Active output style, "plugin:Style" when a plugin provides it
 * @property {CostData} cost - Session cost and stats
 * @property {ContextWindowData} context_window - Context usage info
 * @property {RateLimitsData} [rate_limits] - Subscribers only, after the first API response; each window may be absent
 * @property {WorktreeData} [worktree] - Present only in a worktree session
 */

/**
 * Reads JSON data from stdin and parses it into a SessionData object.
 * No validation is performed.
 *
 * @returns {Promise<SessionData>}
 */
async function readStdinJSON() {
	const chunks = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}

	const input = Buffer.concat(chunks).toString('utf8');
	return JSON.parse(input);
}

/**
 * Reads the `padding` the user configured for the status line, which narrows the usable width.
 * @returns {number}
 */
function readPadding() {
	const settingsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'settings.json');
	try {
		const padding = JSON.parse(fs.readFileSync(settingsPath, 'utf8')).statusLine?.padding;
		return Number.isFinite(padding) ? padding : 0;
	} catch {
		// padding only tunes alignment; an unreadable settings file must not blank the status line
		return 0;
	}
}

/**
 * Returns the columns available to a status line row, or null when the terminal width is unknown.
 * @returns {number|null}
 */
function readAvailableWidth() {
	// constraint: Claude Code captures stdout, so the terminal width reaches the script only as COLUMNS
	const columns = Number(process.env.COLUMNS);
	if (!Number.isFinite(columns) || columns <= 0) {
		return null;
	}

	return columns - RESERVED_COLUMNS - 2 * readPadding();
}

/**
 * Formats output style, model and effort: "Style (Model · effort)", or "Model" alone when the style is left out.
 * @param {SessionData} data
 * @param {{style: boolean, effort: boolean}} level - Which parts to include
 * @returns {string}
 */
function formatStyleModel(data, level) {
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

/**
 * Trims string from the middle, keeping start and end with ellipsis.
 * "very-long-folder-name" -> "very-...name" (for maxWidth=12)
 * @param {string} str - String to trim
 * @param {number} maxWidth - Maximum allowed width
 * @returns {string}
 */
function trimMiddle(str, maxWidth) {
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
 * @param {string} unixPath - Path to collapse
 * @param {number} maxWidth - Maximum allowed width
 * @returns {string}
 */
function collapsePath(unixPath, maxWidth) {
	if (unixPath.length <= maxWidth) {
		return unixPath;
	}

	let overdue = unixPath.length - maxWidth;
	const segments = posixpath.dirname(unixPath).split(posixpath.sep);

	for (let i = 0; i < segments.length; i++) {
		overdue -= segments[i].length - 1;
		segments[i] = segments[i][0];
		if (overdue <= 0) {
			break;
		}
	}

	if (segments.length > 2 && overdue > 0) {
		const ellipsis = '...';

		for (let i = 1; i < segments.length; i++) {
			overdue -= segments[i].length + 1;

			if (i === 1) {
				overdue -= segments[i].length - 1;
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

	return posixpath.join(...segments.filter((seg) => seg !== ''), basename);
}

/**
 * Converts path to unix-style separators.
 * @param {string} p
 * @returns {string}
 */
function toUnixPath(p) {
	return p.replaceAll('\\', '/');
}

/**
 * Replaces the home directory prefix with "~".
 * @param {string} unixPath
 * @returns {string}
 */
function toHomeRelative(unixPath) {
	const homedir = toUnixPath(os.homedir());
	return unixPath === homedir || unixPath.startsWith(homedir + '/') ? '~' + unixPath.slice(homedir.length) : unixPath;
}

/**
 * Resolves the working directory for display: the project root as a path, a subdirectory as "$/sub/dir". In a
 * worktree session the root is shown as the repository the worktree was created from, tagged as a worktree, instead
 * of its .claude/worktrees/... location.
 * @param {SessionData} data
 * @param {'full'|'short'} worktreeTag - "[wt name]" or "[wt]"
 * @returns {{path: string, tag: string}} Uncollapsed path and the tag that follows it
 */
function resolveLocation(data, worktreeTag) {
	const cwd = toUnixPath(data.cwd ?? data.workspace?.current_dir ?? '');
	const worktree = data.worktree;
	const root = toUnixPath(worktree?.path ?? data.workspace?.project_dir ?? '');
	const relPath = root ? posixpath.relative(root, cwd) : '..';

	if (relPath === '..' || relPath.startsWith('../')) {
		return {path: toHomeRelative(cwd), tag: ''};
	}

	let tag = '';
	if ((worktree?.name ?? '') !== '') {
		tag = worktreeTag === 'full' ? ` [wt ${worktree.name}]` : ' [wt]';
	}

	const shown = relPath === '' ? toHomeRelative(toUnixPath(worktree?.original_cwd ?? root)) : '$/' + relPath;

	return {path: shown, tag};
}

/**
 * Returns the branch checked out in the repository that contains `dir`, linked worktrees included: the branch name, a
 * short commit hash on a detached HEAD, or null outside a repository.
 * @param {string} dir
 * @returns {string|null}
 */
function readGitBranch(dir) {
	let current = dir;

	while (current) {
		const dotGit = path.join(current, '.git');
		const dotGitStat = fs.statSync(dotGit, {throwIfNoEntry: false});

		if (dotGitStat) {
			let gitDir = dotGit;
			if (dotGitStat.isFile()) {
				const pointer = /^gitdir:\s*(?<gitDir>.+)$/m.exec(fs.readFileSync(dotGit, 'utf8'));
				if (!pointer) {
					return null;
				}
				gitDir = path.resolve(current, pointer.groups.gitDir.trim());
			}

			const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
			const ref = /^ref:\s*(?:refs\/heads\/)?(?<branch>.+)$/.exec(head);
			return ref ? ref.groups.branch : head.slice(0, 7);
		}

		const parent = path.dirname(current);
		if (parent === current) {
			return null;
		}
		current = parent;
	}

	return null;
}

/**
 * Resolves the current branch. Returns null outside a git repository or when HEAD can't be read.
 * @param {SessionData} data
 * @returns {string|null}
 */
function resolveBranch(data) {
	const cwd = data.cwd ?? data.workspace?.current_dir;
	if (!cwd) {
		return null;
	}

	try {
		return readGitBranch(cwd);
	} catch {
		// the branch is optional context; an unreadable .git must not blank the status line
		return null;
	}
}

/**
 * Formats lines added and removed in the session: "+12 −3"
 * @param {SessionData} data
 * @returns {string}
 */
function formatLinesChanged(data) {
	const added = data.cost?.total_lines_added ?? 0;
	const removed = data.cost?.total_lines_removed ?? 0;
	return `${c.green(`+${added}`)} ${c.red(`−${removed}`)}`;
}

/**
 * Formats cost in USD.
 * @param {SessionData} data
 * @returns {string}
 */
function formatCost(data) {
	const cost = data.cost?.total_cost_usd ?? 0;
	return c.magenta(`$${cost.toFixed(2)}`);
}

/**
 * Formats context window remaining percentage.
 * @param {SessionData} data
 * @returns {string}
 */
function formatContextRemaining(data) {
	const remaining = data.context_window?.remaining_percentage;
	if (remaining === null || remaining === undefined) {
		return c.gray('ctx left --%');
	}

	return colorByUrgency(remaining, `ctx left ${Math.round(remaining)}%`);
}

/**
 * Formats a reset time as local 24h "HH:MM", prefixed with the weekday when it is a day or more away.
 * @param {number} epochSeconds - Reset time
 * @param {number} nowSeconds - Current time
 * @returns {string}
 */
function formatResetTime(epochSeconds, nowSeconds) {
	const date = new Date(epochSeconds * 1000);
	const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
	return epochSeconds - nowSeconds < 24 * 60 * 60 ? hhmm : `${WEEKDAYS[date.getDay()]} ${hhmm}`;
}

/**
 * Projects when a rate-limit window runs out if consumption keeps the average pace of the window so far.
 * @param {RateLimitWindow} limitWindow
 * @param {number} durationSeconds - Window length
 * @param {number} nowSeconds - Current time, Unix epoch seconds
 * @returns {number} Unix epoch seconds; Infinity when nothing is consumed yet
 */
function projectExhaustion(limitWindow, durationSeconds, nowSeconds) {
	const used = limitWindow.used_percentage ?? 0;
	if (used >= 100) {
		return nowSeconds;
	}

	const elapsed = nowSeconds - (limitWindow.resets_at - durationSeconds);
	if (used <= 0 || !(elapsed > 0)) {
		return Infinity;
	}

	return nowSeconds + ((100 - used) * elapsed) / used;
}

/**
 * Formats the rate-limit window closer to stopping the session, or returns null when no window is reported. A window
 * stops the session when its projected exhaustion comes before its reset, and the earliest such window wins. When no
 * window stops the session, the one with less left wins.
 * @param {SessionData} data
 * @param {{reset: boolean}} level - Whether to include the reset time
 * @returns {string|null}
 */
function formatRateLimit(data, level) {
	const nowSeconds = Date.now() / 1000;

	/** @type {{label: string, limitWindow: RateLimitWindow, stopsAt: number, remaining: number} | null} */
	let closest = null;
	for (const {key, label, durationSeconds} of RATE_LIMIT_WINDOWS) {
		const limitWindow = data.rate_limits?.[key];
		if (!limitWindow) {
			continue;
		}

		const exhaustsAt = projectExhaustion(limitWindow, durationSeconds, nowSeconds);
		const candidate = {
			label,
			limitWindow,
			stopsAt: exhaustsAt < limitWindow.resets_at ? exhaustsAt : Infinity,
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

	const resetLabel =
		level.reset && closest.limitWindow.resets_at
			? ` til ${formatResetTime(closest.limitWindow.resets_at, nowSeconds)}`
			: '';
	return colorByUrgency(closest.remaining, `${closest.label} left ${Math.round(closest.remaining)}%${resetLabel}`);
}

/**
 * Formats first row of status line: style, model and cost; context and rate limit at the row end.
 * Walks ROW1_LEVELS until a variant fits; the sparsest one renders even when it doesn't.
 * @param {SessionData} data
 * @param {number|null} width - Available columns
 * @returns {string}
 */
function formatRow1(data, width) {
	const minGap = 3;

	for (const [index, level] of ROW1_LEVELS.entries()) {
		const left = [formatStyleModel(data, level), level.cost && formatCost(data)].filter(Boolean).join(c.gray(' | '));

		const right = [formatContextRemaining(data), formatRateLimit(data, level)].filter(Boolean).join(c.gray(' · '));

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
 * @param {SessionData} data
 * @param {number|null} width - Available columns
 * @returns {string}
 */
function formatRow2(data, width) {
	const separator = ' | ';
	const branch = resolveBranch(data);

	for (const [index, level] of ROW2_LEVELS.entries()) {
		let branchLabel = null;
		if ((branch ?? '') !== '' && level.branch !== 'none') {
			branchLabel = c.cyan(level.branch === 'full' ? branch : trimMiddle(branch, SHORT_BRANCH_WIDTH));
		}

		const tail = [branchLabel, level.lines && formatLinesChanged(data)].filter(Boolean).join(' ');

		const {path: dirPath, tag} = resolveLocation(data, level.worktree);
		const tailWidth = tail ? visibleWidth(tail) + separator.length : 0;
		const pathWidth = width === null ? FALLBACK_PATH_WIDTH : width - tailWidth - tag.length;

		if (width === null || pathWidth >= MIN_PATH_WIDTH || index === ROW2_LEVELS.length - 1) {
			const location = c.blue(collapsePath(dirPath, Math.max(pathWidth, 1))) + c.gray(tag);
			return tail ? location + c.gray(separator) + tail : location;
		}
	}

	throw new Error('ROW2_LEVELS is empty');
}

async function main() {
	const sessionData = await readStdinJSON();
	const width = readAvailableWidth();

	const rows = [formatRow1(sessionData, width), formatRow2(sessionData, width)];

	process.stdout.write(rows.join('\n'));
}

// constraint: Node gives import.meta.url the entry's real path and argv[1] the typed one, so a symlink breaks equality
const invoked = process.argv[1] !== undefined && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (invoked) {
	process.on('uncaughtException', (err) => {
		writeScriptError(err);
		process.exit(1);
	});

	process.on('unhandledRejection', (reason) => {
		writeScriptError(reason);
		process.exit(1);
	});

	await main();
}
