import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, onTestFinished, test, vi} from 'vite-plus/test';
import {
	COMPACT_NOTE,
	LEGEND,
	TAIL_BYTES,
	TICK_DEFAULT_SECONDS,
	hms,
	parsePayload,
	parseTickSeconds,
	respond,
	stamp,
	type Outcome,
} from './wall-clock.mts';

type Line = Readonly<Record<string, unknown>>;

const NOW = Date.parse('2026-10-28T19:00:00Z');
const MINUTE = 60_000;
const ago = (seconds: number): string => new Date(NOW - seconds * 1000).toISOString();

const human = (seconds: number, content: unknown = 'go'): Line => ({
	type: 'user',
	timestamp: ago(seconds),
	message: {role: 'user', content},
});
const assistant = (seconds: number): Line => ({
	type: 'assistant',
	timestamp: ago(seconds),
	message: {content: [{type: 'text', text: 'ok'}]},
});
const toolResult = (seconds: number, content = 'ok'): Line => ({
	type: 'user',
	timestamp: ago(seconds),
	message: {content: [{type: 'tool_result', content}]},
});
const attachment = (seconds: number, value: Line): Line => ({
	type: 'attachment',
	timestamp: ago(seconds),
	attachment: value,
});
const promptTick = (seconds: number): Line =>
	attachment(seconds, {type: 'hook_additional_context', content: ['<wall-clock at="x"/>']});
const batchTick = (seconds: number): Line =>
	attachment(seconds, {type: 'hook_success', stdout: '{"additionalContext":"<wall-clock at=\\"x\\"/>"}'});

const at = `at="${stamp(NOW)}"`;
const emitted = (event: string, context: string, stderr = ''): Outcome => ({
	stdout: JSON.stringify({hookSpecificOutput: {hookEventName: event, additionalContext: context}}),
	stderr,
});

/** Writes a transcript the current test owns and returns its path; a string line is written as it is. */
async function transcript(lines: ReadonlyArray<Line | string>): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), 'wall-clock-'));
	onTestFinished(async () => {
		await rm(dir, {recursive: true, force: true});
	});

	const file = path.join(dir, 'transcript.jsonl');
	const text = lines.map((line) => (typeof line === 'string' ? line : JSON.stringify(line))).join('\n');
	await writeFile(file, `${text}\n`);
	return file;
}

describe('hms', () => {
	test.each([
		[0, '0s'],
		[59_400, '59s'],
		[59_600, '1m00s'],
		[61_000, '1m01s'],
		[3_599_000, '59m59s'],
		[3_600_000, '1h00m'],
		[7_325_000, '2h02m'],
		[-5000, '0s'],
	])('formats %i ms as %s', (ms, formatted) => {
		expect(hms(ms)).toBe(formatted);
	});
});

describe('stamp', () => {
	test.each([
		['UTC', 'Wed 2026-10-28 19:00:05+00:00'],
		['Asia/Kolkata', 'Thu 2026-10-29 00:30:05+05:30'],
		['America/St_Johns', 'Wed 2026-10-28 16:30:05-02:30'],
	])('formats the local time and offset in %s', (zone, formatted) => {
		vi.stubEnv('TZ', zone);
		onTestFinished(() => {
			vi.unstubAllEnvs();
		});

		expect(stamp(Date.parse('2026-10-28T19:00:05Z'))).toBe(formatted);
	});
});

describe('parseTickSeconds', () => {
	test.each([undefined, '', '  '])('falls back to the default period for %j', (raw) => {
		expect(parseTickSeconds(raw)).toBe(TICK_DEFAULT_SECONDS);
	});

	test.each([
		['0', 0],
		['90', 90],
		['1.5', 1.5],
	])('reads %j as %d seconds', (raw, seconds) => {
		expect(parseTickSeconds(raw)).toBe(seconds);
	});

	test.each(['abc', '-1', 'Infinity', 'NaN'])('rejects %j', (raw) => {
		expect(parseTickSeconds(raw)).toBeUndefined();
	});
});

describe('parsePayload', () => {
	test('reads the event and the transcript path', () => {
		expect(parsePayload('{"hook_event_name":"PostToolBatch","transcript_path":"/t.jsonl","x":1}')).toStrictEqual({
			event: 'PostToolBatch',
			transcriptPath: '/t.jsonl',
		});
	});

	test('drops a field that is not a string', () => {
		expect(parsePayload('{"hook_event_name":5}')).toStrictEqual({event: undefined, transcriptPath: undefined});
	});

	test.each([
		['not json', SyntaxError],
		['null', TypeError],
		['5', TypeError],
	])('rejects %j', (input, error) => {
		expect(() => parsePayload(input)).toThrow(error);
	});
});

describe('respond', () => {
	const clock = {nowMs: NOW, tickMs: MINUTE};
	const prompt = (transcriptPath: string): Outcome => respond({event: 'UserPromptSubmit', transcriptPath}, clock);
	const batch = (transcriptPath: string, tickMs = MINUTE): Outcome =>
		respond({event: 'PostToolBatch', transcriptPath}, {nowMs: NOW, tickMs});

	test('gives PreCompact its instruction as plain text', () => {
		expect(respond({event: 'PreCompact', transcriptPath: undefined}, clock)).toStrictEqual({
			stdout: COMPACT_NOTE,
			stderr: '',
		});
	});

	test('measures away from the newest assistant entry, with the legend on the first tick', async () => {
		const file = await transcript([human(900), assistant(600), assistant(300)]);

		expect(prompt(file)).toStrictEqual(emitted('UserPromptSubmit', `<wall-clock ${at} away="5m00s"/>\n${LEGEND}`));
	});

	test('measures turn from the newest human prompt, past tool results, meta entries and attachments', async () => {
		const meta = {...human(100), isMeta: true};
		const withAttachment = {...human(75), attachment: {type: 'queued_command'}};
		const entries = [human(900), human(400), assistant(300), toolResult(200), meta, withAttachment, attachment(50, {})];
		const file = await transcript(entries);

		expect(batch(file)).toStrictEqual(emitted('PostToolBatch', `<wall-clock ${at} turn="6m40s"/>\n${LEGEND}`));
	});

	test('counts a prompt that carries an image beside its text', async () => {
		const file = await transcript([human(500, [{type: 'image'}, {type: 'text', text: 'see'}]), toolResult(100)]);

		expect(batch(file)).toStrictEqual(emitted('PostToolBatch', `<wall-clock ${at} turn="8m20s"/>\n${LEGEND}`));
	});

	test.each([
		['a prompt tick', promptTick],
		['a batch tick', batchTick],
	] as const)('stays silent within the period after %s', async (_name, tick) => {
		const file = await transcript([human(400), assistant(300), tick(20)]);

		expect(batch(file)).toStrictEqual({stdout: '', stderr: ''});
	});

	test('ticks again once the period has passed, without the legend', async () => {
		const file = await transcript([human(400), assistant(300), promptTick(20)]);

		expect(batch(file, 10_000)).toStrictEqual(emitted('PostToolBatch', `<wall-clock ${at} turn="6m40s"/>`));
	});

	test('ticks on every batch when the period is zero', async () => {
		const file = await transcript([human(400), assistant(300), promptTick(0)]);

		expect(batch(file, 0)).toStrictEqual(emitted('PostToolBatch', `<wall-clock ${at} turn="6m40s"/>`));
	});

	test.each([
		['a tool result quoting the hook source', toolResult(10, 'const TICK_MARK = "<wall-clock ";')],
		['a loaded instruction file', attachment(10, {type: 'nested_memory', content: {text: '<wall-clock at="z"/>'}})],
	] as const)('does not take %s for a tick', async (_name, line) => {
		const file = await transcript([human(400), assistant(300), line]);

		expect(batch(file)).toStrictEqual(emitted('PostToolBatch', `<wall-clock ${at} turn="6m40s"/>\n${LEGEND}`));
	});

	test('omits the elapsed figure when the anchor sits outside the scanned tail', async () => {
		const file = await transcript([human(400), toolResult(5, 'x'.repeat(TAIL_BYTES))]);

		expect(batch(file)).toStrictEqual(emitted('PostToolBatch', `<wall-clock ${at}/>\n${LEGEND}`));
	});

	test('skips a transcript line that is not an object', async () => {
		const file = await transcript([assistant(300), 'null', '5', '"text"', '{"type":"user","timestamp":']);

		expect(prompt(file)).toStrictEqual(emitted('UserPromptSubmit', `<wall-clock ${at} away="5m00s"/>\n${LEGEND}`));
	});

	test('stays silent on a batch whose transcript cannot be read', () => {
		const {stdout, stderr} = batch('/nonexistent/transcript.jsonl');

		expect(stdout).toBe('');
		expect(stderr).toMatch(/^wall-clock hook: \/nonexistent\/transcript\.jsonl: ENOENT/);
	});

	test('still gives a prompt the time when its transcript cannot be read', () => {
		const {stdout, stderr} = prompt('/nonexistent/transcript.jsonl');

		expect(stdout).toBe(emitted('UserPromptSubmit', `<wall-clock ${at}/>\n${LEGEND}`).stdout);
		expect(stderr).toMatch(/^wall-clock hook: \/nonexistent\/transcript\.jsonl: ENOENT/);
	});
});
