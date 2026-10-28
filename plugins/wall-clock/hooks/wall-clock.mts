#!/usr/bin/env node

import fs from 'node:fs';
import {text} from 'node:stream/consumers';

/** The hook's output for one event: what goes to stdout and to stderr. */
export type Outcome = {
	readonly stdout: string;
	readonly stderr: string;
};

/** The fields of a hook payload the hook reads. */
export type Payload = {
	readonly event: string | undefined;
	readonly transcriptPath: string | undefined;
};

type Entry = Readonly<Record<string, unknown>>;

/** Seconds between two batch ticks when `FOUNDRY_WALL_CLOCK_TICK_SECONDS` is unset. */
export const TICK_DEFAULT_SECONDS = 60;
/** Bytes of the transcript tail scanned for the anchor and the previous tick. */
export const TAIL_BYTES = 256 * 1024;
const TICK_MARK = '<wall-clock ';
/** The note that follows the first tick of a session. */
export const LEGEND =
	// constraint: `date` takes only POSIX flags here — GNU long options and BSD-only flags differ across hosts
	'The latest <wall-clock> is now; earlier ones are history. Run `date +%Y-%m-%dT%H:%M:%S%z` when a turn needs precision.';
/** The instruction the hook gives PreCompact. */
export const COMPACT_NOTE =
	'When compacting, drop every <wall-clock .../> block and its legend. They are re-injected automatically.';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const NO_OUTPUT: Outcome = {stdout: '', stderr: ''};

const isRecord = (value: unknown): value is Entry => typeof value === 'object' && value !== null;

const pad = (value: number): string => String(value).padStart(2, '0');

/** Returns the tick period in seconds, or undefined when `raw` is neither blank nor a non-negative number. */
export function parseTickSeconds(raw: string | undefined): number | undefined {
	if (raw === undefined || raw.trim() === '') {
		return TICK_DEFAULT_SECONDS;
	}

	const seconds = Number(raw);
	return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

/** Formats a duration as `12s`, `3m05s`, or `2h07m`; a negative duration reads `0s`. */
export function hms(ms: number): string {
	const total = Math.max(0, Math.round(ms / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);

	if (hours > 0) {
		return `${hours}h${pad(minutes)}m`;
	}

	return minutes > 0 ? `${minutes}m${pad(total % 60)}s` : `${total}s`;
}

/** Formats an epoch time as local time, `Wed 2026-10-28 19:49:05+01:00`. */
export function stamp(epochMs: number): string {
	const date = new Date(epochMs);
	const offset = -date.getTimezoneOffset();
	const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
	const zone = `${offset < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;

	return `${DAYS[date.getDay()] ?? ''} ${ymd} ${time}${zone}`;
}

/** Reads the fields the hook uses from a hook payload; throws when the payload is not a JSON object. */
export function parsePayload(input: string): Payload {
	const value: unknown = JSON.parse(input);

	if (!isRecord(value)) {
		throw new TypeError('expected a JSON object');
	}

	const {hook_event_name: event, transcript_path: transcriptPath} = value;
	return {
		event: typeof event === 'string' ? event : undefined,
		transcriptPath: typeof transcriptPath === 'string' ? transcriptPath : undefined,
	};
}

function readTail(path: string): string[] {
	const {size} = fs.statSync(path);
	const length = Math.min(size, TAIL_BYTES);
	const buffer = Buffer.alloc(length);
	const fd = fs.openSync(path, 'r');

	try {
		fs.readSync(fd, buffer, 0, length, size - length);
	} finally {
		fs.closeSync(fd);
	}

	return buffer.toString('utf8').split('\n');
}

const textOf = (value: unknown): string => {
	if (typeof value === 'string') {
		return value;
	}

	return Array.isArray(value) ? value.filter((part) => typeof part === 'string').join('\n') : '';
};

const hasText = (content: unknown): boolean =>
	typeof content === 'string' ||
	(Array.isArray(content) && content.some((block) => isRecord(block) && block.type === 'text'));

const isTick = ({attachment}: Entry): boolean =>
	isRecord(attachment) && `${textOf(attachment.stdout)}${textOf(attachment.content)}`.includes(TICK_MARK);

const isPromptAnchor = (entry: Entry): boolean => entry.type === 'assistant';

const isBatchAnchor = (entry: Entry): boolean =>
	entry.type === 'user' &&
	entry.attachment === undefined &&
	entry.isMeta !== true &&
	hasText(isRecord(entry.message) ? entry.message.content : undefined);

function scan(
	lines: readonly string[],
	isAnchor: (entry: Entry) => boolean,
): {readonly anchor: number | null; readonly tick: number | null} {
	let anchor: number | null = null;
	let tick: number | null = null;

	for (let i = lines.length - 1; i >= 0 && (anchor === null || tick === null); i--) {
		const line = lines[i] ?? '';
		const candidate = tick === null && line.includes(TICK_MARK);

		if (line.length < 2 || (!candidate && anchor !== null)) {
			continue;
		}

		let entry: unknown;

		try {
			entry = JSON.parse(line);
		} catch {
			continue; // the first line of the window is a fragment, and recorded stdout can be truncated
		}

		if (!isRecord(entry) || typeof entry.timestamp !== 'string') {
			continue;
		}

		const at = Date.parse(entry.timestamp);

		if (Number.isNaN(at) || at === 0) {
			continue;
		}

		if (candidate && isTick(entry)) {
			tick = at;
		} else if (anchor === null && isAnchor(entry)) {
			anchor = at;
		}
	}

	return {anchor, tick};
}

/** Returns the hook's output for one event, read against the transcript tail at `nowMs`. */
export function respond(
	{event, transcriptPath}: Payload,
	{nowMs, tickMs}: {readonly nowMs: number; readonly tickMs: number},
): Outcome {
	if (event === 'PreCompact') {
		return {stdout: COMPACT_NOTE, stderr: ''};
	}

	const isPrompt = event === 'UserPromptSubmit';
	const fields = [`at="${stamp(nowMs)}"`];
	let isFirstTick = true;
	let stderr = '';

	try {
		const {anchor, tick} = scan(readTail(transcriptPath ?? ''), isPrompt ? isPromptAnchor : isBatchAnchor);

		isFirstTick = tick === null;

		if (!isPrompt && tick !== null && nowMs - tick < tickMs) {
			return NO_OUTPUT;
		}

		if (anchor !== null) {
			fields.push(`${isPrompt ? 'away' : 'turn'}="${hms(nowMs - anchor)}"`);
		}
	} catch (error) {
		stderr = `wall-clock hook: ${String(transcriptPath)}: ${error instanceof Error ? error.message : String(error)}\n`;

		if (!isPrompt) {
			return {stdout: '', stderr};
		}
	}

	const context = `<wall-clock ${fields.join(' ')}/>${isFirstTick ? `\n${LEGEND}` : ''}`;
	return {stdout: JSON.stringify({hookSpecificOutput: {hookEventName: event, additionalContext: context}}), stderr};
}

async function main(): Promise<void> {
	const raw = process.env.FOUNDRY_WALL_CLOCK_TICK_SECONDS;
	const seconds = parseTickSeconds(raw);

	if (seconds === undefined) {
		process.stderr.write(
			`wall-clock hook: ignoring tick period ${JSON.stringify(raw)}, expected a non-negative number of seconds\n`,
		);
	}

	let payload: Payload;

	try {
		payload = parsePayload(await text(process.stdin));
	} catch (error) {
		process.stderr.write(
			`wall-clock hook: unreadable hook payload: ${error instanceof Error ? error.message : String(error)}\n`,
		);
		return;
	}

	const {stdout, stderr} = respond(payload, {nowMs: Date.now(), tickMs: (seconds ?? TICK_DEFAULT_SECONDS) * 1000});
	process.stderr.write(stderr);
	process.stdout.write(stdout);
}

if (import.meta.main) {
	await main();
}
