#!/usr/bin/env node
import {mkdtemp, readFile} from 'node:fs/promises';
import {homedir, tmpdir} from 'node:os';
import path from 'node:path';
import {text} from 'node:stream/consumers';
import {parseArgs} from 'node:util';
import {exists} from './lib/files.mts';
import {projectDirs, transcriptFiles} from './lib/projects.mts';
import {isObject, parseJson, stringOf} from './lib/json.mts';
import {
	type Arm,
	buildCopy,
	instructionEdits,
	locateTurn,
	type ReplayPoint,
	replayArgs,
	runArms,
	shamEdits,
	stopHookCommand,
	stopHookOutput,
} from './lib/replay.mts';

const DEFAULT_SAMPLES = 3;
const DEFAULT_TIMEOUT_S = 600;
const USAGE = [
	'usage: replay.mts locate --session <id> --entry <id> [--projects-dir <dir>]',
	'       replay.mts verify --session <id> --entry <id> --edits <file> [--projects-dir <dir>] [--samples <n>]',
	'                         [--model <m>] [--effort <e>] [--out <dir>] [--disable-plugin <plugin>]... [--timeout <s>]',
	'                         [--dry-run]',
	'       replay.mts stop-hook',
].join('\n');

/** Finds the transcript of a session under `projectsDir`; throws when no transcript, or more than one, has its id. */
export async function transcriptOf(projectsDir: string, session: string): Promise<string> {
	const files = await transcriptFiles(await projectDirs(projectsDir, [], true), 0, session);
	const [found] = files;
	if (found === undefined || files.length > 1) {
		throw new Error(`session ${session}: ${files.length} transcripts under ${projectsDir}`);
	}

	return found.file;
}

/**
 * Locates the turn a candidate corrects and writes its two replay copies under `out`: `sham`, the control, and `rule`,
 * which carries the edits. Throws when the turn cannot be replayed from here.
 */
export async function prepareArms({
	transcript,
	entry,
	edits,
	out,
	model,
	effort,
	disabledPlugins,
	home,
}: {
	readonly transcript: string;
	readonly entry: string;
	readonly edits: string;
	readonly out: string;
	readonly model: string | undefined;
	readonly effort: string | undefined;
	readonly disabledPlugins: readonly string[];
	readonly home: string;
}): Promise<{readonly point: ReplayPoint; readonly cwd: string; readonly arms: Arm[]}> {
	const point = await locateTurn(transcript, entry);
	const cwd = point.cwd;
	if (cwd === undefined || !(await exists(cwd))) {
		throw new Error(`the turn ran in ${cwd ?? 'an unrecorded directory'}, which no longer exists`);
	}

	const relative = path.relative(cwd, out);
	if (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
		throw new Error(`--out ${out} lies inside ${cwd}, whose instruction files a replay excludes`);
	}

	const changes = instructionEdits(parseJson(await readFile(edits, 'utf8')));
	if (changes.length === 0) {
		throw new Error(`${edits}: no edits`);
	}

	const hookCommand = stopHookCommand(process.execPath, import.meta.filename);
	const arms = await Promise.all(
		[
			{name: 'sham', changes: shamEdits(changes)},
			{name: 'rule', changes},
		].map(async ({name, changes: armEdits}) => {
			const dir = path.join(out, name);
			const copy = await buildCopy({
				source: transcript,
				dir,
				edits: armEdits,
				resumeAt: point.resumeAt,
				cwd,
				home,
				disabledPlugins,
				hookCommand,
			});
			return {name, dir, args: replayArgs({copy, point, model: model ?? point.model, effort})};
		}),
	);
	return {point, cwd, arms};
}

async function stopHook(): Promise<void> {
	let toolName = '';
	try {
		const input = parseJson(await text(process.stdin));
		toolName = (isObject(input) ? stringOf(input.tool_name) : undefined) ?? '';
	} catch {
		toolName = '';
	}

	const output = stopHookOutput(toolName);
	if (output !== undefined) {
		process.stdout.write(`${JSON.stringify(output)}\n`);
	}
}

async function main(): Promise<void> {
	const [command, ...rest] = process.argv.slice(2);
	if (command === 'stop-hook') {
		await stopHook();
		return;
	}

	const {values} = parseArgs({
		args: rest,
		options: {
			session: {type: 'string'},
			entry: {type: 'string'},
			'projects-dir': {type: 'string'},
			edits: {type: 'string'},
			samples: {type: 'string', default: String(DEFAULT_SAMPLES)},
			model: {type: 'string'},
			effort: {type: 'string'},
			out: {type: 'string'},
			'disable-plugin': {type: 'string', multiple: true, default: []},
			timeout: {type: 'string', default: String(DEFAULT_TIMEOUT_S)},
			'dry-run': {type: 'boolean', default: false},
		},
	});

	if (values.session === undefined || values.entry === undefined) {
		throw new TypeError(USAGE);
	}

	const configDir = process.env.CLAUDE_CONFIG_DIR ?? path.join(homedir(), '.claude');
	const projectsDir = values['projects-dir'] ?? path.join(configDir, 'projects');
	if (command === 'locate') {
		const point = await locateTurn(await transcriptOf(projectsDir, values.session), values.entry);
		process.stdout.write(`${JSON.stringify(point, null, '\t')}\n`);
		return;
	}

	if (command !== 'verify' || values.edits === undefined) {
		throw new TypeError(USAGE);
	}

	const samples = Number(values.samples);
	const timeoutMs = Number(values.timeout) * 1000;
	if (!Number.isInteger(samples) || samples < 1) {
		throw new RangeError(`--samples ${values.samples}: expected a positive whole number`);
	}

	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new RangeError(`--timeout ${values.timeout}: expected a positive number of seconds`);
	}

	const transcript = await transcriptOf(projectsDir, values.session);
	const out = path.resolve(values.out ?? (await mkdtemp(path.join(tmpdir(), 'debrief-replay-'))));
	const {point, cwd, arms} = await prepareArms({
		transcript,
		entry: values.entry,
		edits: values.edits,
		out,
		model: values.model,
		effort: values.effort,
		disabledPlugins: values['disable-plugin'],
		home: homedir(),
	});

	if (values['dry-run']) {
		process.stdout.write(`${JSON.stringify({point, out, arms}, null, '\t')}\n`);
		return;
	}

	const runs = await runArms({arms, samples, command: ['claude'], cwd, timeoutMs});
	process.stdout.write(`${JSON.stringify({point, out, arms: Object.fromEntries(runs)}, null, '\t')}\n`);
	const failed = [...runs.values()].flat().filter(({exit}) => exit !== 0);
	process.stderr.write(`${arms.length * samples} runs in ${out}; ${failed.length} exited with an error\n`);
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		process.stderr.write(`replay: ${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 2;
	}
}
