#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {extract} from './lib/extract.mts';
import {isList, isObject, type Json, parseJson, stringOf} from './lib/json.mts';
import {listProjects} from './lib/projects.mts';
import {truncate} from './lib/text.mts';

const INDEX_TEXT_LIMIT = 160;
const DAY_MS = 86_400_000;

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

/** Formats one extraction record as a tab-separated index row: number, signal, repositories, date, and text. */
export function indexRow(number: number, record: Json): string {
	const entry = isObject(record) ? record : {};
	const home = homedir();
	const projects = isList(entry.projects) ? entry.projects : [entry.project];
	const where = projects
		.map((project) => {
			const name = stringOf(project) ?? '';
			return name.startsWith(home) ? `~${name.slice(home.length)}` : name;
		})
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
			context: {type: 'string'},
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
			process.stdout.write(`${indexRow(i + 1, parseJson(line))}\n`);
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
	const projects = new Set<string | null>();
	const records = extract({
		projectsDir,
		projects: values.project,
		allProjects: values['all-projects'],
		since: parseSince(values.since),
		session: values.session,
		contextDir: values.context === undefined ? undefined : path.resolve(values.context),
		configDir,
		disableAutoMemory: process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY,
	});
	for await (const record of records) {
		counts.set(record.signal, (counts.get(record.signal) ?? 0) + 1);
		for (const project of 'projects' in record ? record.projects : [record.project]) {
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
