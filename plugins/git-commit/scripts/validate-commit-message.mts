#!/usr/bin/env node

import fs from 'node:fs/promises';
import {text} from 'node:stream/consumers';

/** One problem the validator reports; an `ERROR` is a rule the message breaks, a `WARN` a recommendation. */
export type Finding = {readonly level: 'ERROR' | 'WARN'; readonly message: string};

/** Where the message comes from: a file, the `--msg` argument, or stdin when neither flag is given. */
export type MessageSource =
	| {readonly kind: 'file'; readonly path: string}
	| {readonly kind: 'msg'; readonly text: string}
	| {readonly kind: 'stdin'};

/** A command line the validator cannot act on; the CLI prints it and exits 1. */
export class UsageError extends Error {
	override readonly name = 'UsageError';
}

export const HELP_TEXT = `Usage:
    validate-commit-message.mts --file <path>
    validate-commit-message.mts --msg "message"
    echo "message" | validate-commit-message.mts

Options:
    --require-trailers <list>   Comma-separated trailer names that must be present
                                Example: --require-trailers "Task,Fixes"
    `;
const FILE_FLAG = '--file';
const MSG_FLAG = '--msg';
const REQUIRE_TRAILERS_FLAG = '--require-trailers';
const SUBJECT_MIN_LENGTH = 10;
const SUBJECT_MAX_LENGTH = 72;
const TRAILER_RX = /^([A-Za-z][A-Za-z0-9-]*):[ \t]+.+$/;
const BODY_START = 2;
const SUBJECT_TIC_PATTERNS = [
	{
		rx: /\bthis (commit|change|fix|patch|update|pr)\b/i,
		message: '"this commit" / "this change" — the diff already says what',
	},
	{rx: /\b(I|we)\b(?!\/)/i, message: 'first-person ("I", "we") — the commit speaks for itself'},
] as const;

const errorFinding = (message: string): Finding => ({level: 'ERROR', message});
const warnFinding = (message: string): Finding => ({level: 'WARN', message});

/** Reports whether the arguments ask for the usage text. */
export function wantsHelp(args: readonly string[]): boolean {
	return args.some((arg) => arg === '--help' || arg === '-h');
}

/** Resolves where the message comes from; the last `--file` or `--msg` wins, and an empty value counts as absent. */
export function messageSource(args: readonly string[]): MessageSource {
	let file = '';
	let msg = '';

	for (const [i, arg] of args.entries()) {
		if (arg !== FILE_FLAG && arg !== MSG_FLAG) {
			continue;
		}

		const value = args[i + 1];

		if (value === undefined) {
			throw new UsageError(`${arg} requires a ${arg === FILE_FLAG ? 'path' : 'message'} argument`);
		}

		if (arg === FILE_FLAG) {
			file = value;
		} else {
			msg = value;
		}
	}

	if (file !== '' && msg !== '') {
		throw new UsageError('Only one of --file or --msg may be used at a time.');
	}

	if (file !== '') {
		return {kind: 'file', path: file};
	}

	return msg === '' ? {kind: 'stdin'} : {kind: 'msg', text: msg};
}

/** Returns the trailer names the first `--require-trailers` lists, trimmed, with empty names dropped. */
export function requiredTrailers(args: readonly string[]): string[] {
	const at = args.indexOf(REQUIRE_TRAILERS_FLAG);

	if (at === -1) {
		return [];
	}

	const list = args[at + 1];

	if (list === undefined) {
		throw new UsageError(`${REQUIRE_TRAILERS_FLAG} requires a comma-separated list`);
	}

	return list
		.split(',')
		.map((name) => name.trim())
		.filter((name) => name !== '');
}

function trailerStart(lines: readonly string[]): number {
	let end = lines.length - 1;
	while (end >= BODY_START && lines[end] === '') {
		end--;
	}

	let start = end + 1;
	for (let i = end; i >= BODY_START; i--) {
		const line = lines[i] ?? '';
		if (line === '' || !TRAILER_RX.test(line)) {
			break;
		}
		start = i;
	}

	return start;
}

function subjectFindings(subject: string): Finding[] {
	const findings: Finding[] = [];

	if (subject.length < SUBJECT_MIN_LENGTH) {
		findings.push(
			warnFinding('Subject line is very short (less than 10 characters). Consider making it more descriptive.'),
		);
	}

	if (subject.length > SUBJECT_MAX_LENGTH) {
		findings.push(
			warnFinding(`Subject line exceeds ${SUBJECT_MAX_LENGTH} characters. Consider tightening — soft target is 50.`),
		);
	}

	if (subject.endsWith('.')) {
		findings.push(errorFinding('Subject line should not end with a period.'));
	}

	for (const {rx, message} of SUBJECT_TIC_PATTERNS) {
		if (rx.test(subject)) {
			findings.push(warnFinding(`Subject filler tic: ${message}.`));
		}
	}

	return findings;
}

/** Checks a commit message against the conventions and returns its findings in the order the CLI prints them. */
export function validate(message: string, required: readonly string[]): Finding[] {
	if (message.trim() === '') {
		return [errorFinding('Commit message is empty.')];
	}

	const lines = message.split('\n').map((line) => line.trim());
	const start = trailerStart(lines);
	const findings = subjectFindings(lines[0] ?? '');

	if (lines.slice(BODY_START, start).every((line) => line === '')) {
		findings.push(warnFinding('Commit message has no body. A subject-only message is rarely acceptable.'));
	}

	if (lines.length > 1 && lines[1] !== '') {
		findings.push(errorFinding('Subject must be separated from body by a blank line.'));
	}

	const present = new Set(lines.slice(start).flatMap((line) => TRAILER_RX.exec(line)?.[1] ?? []));
	for (const name of required) {
		if (!present.has(name)) {
			findings.push(errorFinding(`Required trailer missing: ${name}`));
		}
	}

	return findings;
}

async function readMessage(source: MessageSource): Promise<string> {
	if (source.kind === 'msg') {
		return source.text;
	}

	if (source.kind === 'file') {
		try {
			return await fs.readFile(source.path, 'utf8');
		} catch {
			throw new UsageError(`Cannot read file: ${source.path}`);
		}
	}

	const stdin = process.stdin.isTTY ? '' : await text(process.stdin);

	if (stdin === '') {
		throw new UsageError('No commit message provided. Use --file, --msg, or stdin.');
	}

	return stdin;
}

async function main(args: readonly string[]): Promise<void> {
	if (wantsHelp(args)) {
		process.stdout.write(`${HELP_TEXT}\n`);
		return;
	}

	try {
		const message = await readMessage(messageSource(args));
		const findings = validate(message, requiredTrailers(args));

		for (const {level, message: detail} of findings) {
			process.stdout.write(`${level}: ${detail}\n`);
		}

		if (message.trim() === '') {
			process.exitCode = 1;
		} else if (!findings.some(({level}) => level === 'ERROR')) {
			process.stdout.write('OK: Commit message is valid.\n');
		}
	} catch (error) {
		if (!(error instanceof UsageError)) {
			throw error;
		}

		process.stderr.write(`ERROR: ${error.message}\n`);
		process.exitCode = 1;
	}
}

if (import.meta.main) {
	await main(process.argv.slice(2));
}
