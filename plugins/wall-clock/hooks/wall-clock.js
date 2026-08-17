#!/usr/bin/env node

/**
 * Wall-clock tick injected as Claude Code hook context.
 *
 * UserPromptSubmit -> away: the gap since the agent last spoke, so a returning user is visible.
 * PostToolBatch    -> turn: elapsed since the current prompt landed, at most one tick per tick
 *                     period, so an hour of autonomous work stays time-aware without an action.
 * PreCompact       -> an instruction to drop the accumulated ticks, which are re-injected anyway.
 *
 * Every figure comes from the transcript Claude Code already writes, so no state file can go stale
 * across resume, crash, or two concurrent sessions. The throttle reads the same source, finding the
 * previous tick in the transcript tail the way Claude Code finds its own date-change reminder.
 * An unreadable transcript therefore leaves no throttle, and a batch tick stays silent rather than
 * firing on every batch.
 */

import fs from 'node:fs';
import process from 'node:process';

const TICK_DEFAULT_SECONDS = 60; // quiet period between PostToolBatch ticks
const WINDOW = 256 * 1024; // transcript tail scanned for the anchor and the previous tick
const MARK = '<wall-clock '; // this hook's own output, as recorded in the transcript
// The `date` form is POSIX: GNU long options and BSD-only flags are not portable across hosts.
const LEGEND =
    'The latest <wall-clock> is now; earlier ones are history. Run `date +%Y-%m-%dT%H:%M:%S%z` when a turn needs precision.';
const COMPACT_NOTE =
    'When compacting, drop every <wall-clock .../> block and its legend. They are re-injected automatically.';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// One name carries the period, whether the user sets it in the `env` settings block or the plugin
// feeds it from userConfig through ${user_config.TICK_SECONDS} in the hook command. The marketplace
// prefix scopes every cc-foundry knob as FOUNDRY_<PLUGIN>_<KNOB>, so nothing else reads or writes
// this variable. A period longer than the transcript WINDOW can hold degrades to a shorter one,
// because a tick scrolled out of the window cannot be found.
const readTickSeconds = () => {
    const raw = process.env.FOUNDRY_WALL_CLOCK_TICK_SECONDS;

    if (raw === undefined || raw.trim() === '') return TICK_DEFAULT_SECONDS;

    const seconds = Number(raw);

    if (Number.isFinite(seconds) && seconds >= 0) return seconds;

    process.stderr.write(
        `wall-clock hook: ignoring tick period ${JSON.stringify(raw)}, expected a non-negative number of seconds\n`,
    );

    return TICK_DEFAULT_SECONDS;
};

const tickMs = readTickSeconds() * 1000;

const pad = (value) => String(value).padStart(2, '0');

const hms = (ms) => {
    const total = Math.max(0, Math.round(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (hours) return `${hours}h${pad(minutes)}m`;

    return minutes ? `${minutes}m${pad(total % 60)}s` : `${total}s`;
};

const stamp = (date) => {
    const offset = -date.getTimezoneOffset();
    const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    const zone = `${offset < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;

    return `${DAYS[date.getDay()]} ${ymd} ${time}${zone}`;
};

const readStdin = async () => {
    let raw = '';

    for await (const chunk of process.stdin) raw += chunk;

    return raw;
};

const readTail = (path) => {
    const { size } = fs.statSync(path);
    const length = Math.min(size, WINDOW);
    const buffer = Buffer.alloc(length);
    const fd = fs.openSync(path, 'r');

    try {
        fs.readSync(fd, buffer, 0, length, size - length);
    } finally {
        fs.closeSync(fd);
    }

    return buffer.toString('utf8').split('\n');
};

const emit = (event, context) =>
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } }));

// A human turn carries text; a tool result carries tool_result blocks, and an image prompt carries
// text beside the image, so the presence of text identifies a turn either way.
const hasText = (content) =>
    typeof content === 'string' || (Array.isArray(content) && content.some((block) => block?.type === 'text'));

// A batch tick is recorded twice, as hook_success with `stdout` and as hook_additional_context with
// `content`; a prompt tick gets only the second form. Both fields count, or a prompt tick never
// throttles the batch tick behind it. Demanding an attachment keeps this file's own source, quoted
// into the transcript by a Read or a Write, from matching the marker.
const isTick = (entry) => `${entry.attachment?.stdout ?? ''}${entry.attachment?.content ?? ''}`.includes(MARK);

const scan = (lines, isAnchor) => {
    let anchor = null;
    let tick = null;

    for (let i = lines.length - 1; i >= 0 && !(anchor && tick); i--) {
        const line = lines[i];
        const candidate = !tick && line.includes(MARK);

        if (line.length < 2 || (!candidate && anchor)) continue;

        let entry;

        try {
            entry = JSON.parse(line);
        } catch {
            continue; // the first line of the window is a fragment, and recorded stdout can be truncated
        }

        const at = Date.parse(entry.timestamp ?? '');

        if (!at) continue;

        if (candidate && isTick(entry)) tick = at;
        else if (!anchor && isAnchor(entry)) anchor = at;
    }

    return { anchor, tick };
};

const main = async () => {
    let event;
    let transcript;

    try {
        ({ hook_event_name: event, transcript_path: transcript } = JSON.parse(await readStdin()));
    } catch (err) {
        process.stderr.write(`wall-clock hook: unreadable hook payload: ${err.message}\n`);

        return;
    }

    if (event === 'PreCompact') {
        emit(event, COMPACT_NOTE);

        return;
    }

    const isPrompt = event === 'UserPromptSubmit';
    // Anchored so that neither event depends on whether the current prompt reached the transcript.
    const isAnchor = isPrompt
        ? (entry) => entry.type === 'assistant'
        : (entry) => entry.type === 'user' && !entry.attachment && !entry.isMeta && hasText(entry.message?.content);

    const now = new Date();
    const fields = [`at="${stamp(now)}"`];
    let isFirstTick = true;

    try {
        const { anchor, tick } = scan(readTail(transcript), isAnchor);

        isFirstTick = !tick;

        if (!isPrompt && tick && now - tick < tickMs) return;
        if (anchor) fields.push(`${isPrompt ? 'away' : 'turn'}="${hms(now - anchor)}"`);
    } catch (err) {
        process.stderr.write(`wall-clock hook: ${transcript}: ${err.message}\n`);

        if (!isPrompt) return;
    }

    emit(event, `<wall-clock ${fields.join(' ')}/>${isFirstTick ? `\n${LEGEND}` : ''}`);
};

await main();
