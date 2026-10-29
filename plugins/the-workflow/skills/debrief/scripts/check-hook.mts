#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {checkCalls, type HookCall, hookCallOf} from './lib/hooks.mts';
import {parseJson} from './lib/json.mts';

const DEFAULT_TIMEOUT_S = 10;

/** Reads a `--calls` dump: one recorded call per line; throws on a line that is not one. */
export function callsOf(text: string): HookCall[] {
	return text.split('\n').flatMap((line, i) => {
		if (line.trim() === '') {
			return [];
		}

		const call = hookCallOf(parseJson(line));
		if (call === undefined) {
			throw new TypeError(`line ${i + 1}: expected a recorded call with an id and a tool`);
		}
		return [call];
	});
}

async function main(): Promise<void> {
	const {values} = parseArgs({
		options: {
			hook: {type: 'string'},
			calls: {type: 'string'},
			violating: {type: 'string'},
			timeout: {type: 'string', default: String(DEFAULT_TIMEOUT_S)},
		},
	});

	if (values.hook === undefined || values.calls === undefined) {
		throw new TypeError('usage: check-hook.mts --hook <command> --calls <file> [--violating <id,…>] [--timeout <s>]');
	}

	const timeoutMs = Number(values.timeout) * 1000;
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new RangeError(`--timeout ${values.timeout}: expected a positive number of seconds`);
	}

	const calls = callsOf(await readFile(values.calls, 'utf8'));
	const violating =
		values.violating === undefined ? undefined : new Set(values.violating.split(',').map((id) => id.trim()));
	const unknown = [...(violating ?? [])].filter((id) => !calls.some((call) => call.id === id));
	if (unknown.length > 0) {
		throw new RangeError(`--violating names calls not in ${values.calls}: ${unknown.join(', ')}`);
	}

	const results = await checkCalls(values.hook, calls, {violating, timeoutMs});
	for (const result of results) {
		process.stdout.write(`${JSON.stringify(result)}\n`);
	}

	const counts = new Map<string, number>();
	for (const {decision} of results) {
		counts.set(decision, (counts.get(decision) ?? 0) + 1);
	}
	const wrong = results.filter(({ok}) => !ok);
	const tally = [...counts].map(([decision, count]) => `${decision} ${count}`).join(', ');
	process.stderr.write(`${results.length} calls: ${tally}; ${wrong.length} wrong\n`);
	process.exitCode = wrong.length === 0 ? 0 : 1;
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		process.stderr.write(`check-hook: ${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 2;
	}
}
