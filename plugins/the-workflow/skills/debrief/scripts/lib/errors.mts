import {truncate} from './text.mts';

const ERROR_LIMIT = 300;
const SIGNATURE_LIMIT = 160;
const RAN_AND_FAILED = /^Exit code \d+/;
const SHELL_TRAPS: ReadonlyArray<readonly [string, RegExp]> = [
	['zsh-nomatch', /^\(eval\):\d+: no matches found: /],
	['zsh-eq-expansion', /^\(eval\):\d+: =+\S* not found/],
	['zsh-readonly', /^\(eval\):\d+: read-only variable: (?:status|path|options|argv)/],
	['zsh-badpattern', /^\(eval\):\d+: bad (?:pattern|substitution|math)/],
	['zsh-modifier', /^\(eval\):\d+: unrecognized modifier/],
	['gnu-timeout', /^\(eval\):\d+: command not found: g?timeout\b/],
	['missing-fd', /^\(eval\):\d+: command not found: fd\b/],
	['bsd-cat', /^cat: illegal option/],
	[
		'bsd-sed',
		/^sed: (?:\d+: .*(?:invalid command code|unterminated|undefined label|extra characters)|-[ei]? ?RE error)/,
	],
	['bsd-grep-P', /^grep: (?:invalid option -- P|unrecognized option)/],
	['missing-pyyaml', /^ModuleNotFoundError: No module named '?yaml'?/],
	['ugrep-limit', /^\\_+exceeds complexity limits/],
];

/** One failed tool call, with the call that fixed it when the session has one. */
export type ToolErrorOccurrence = {
	readonly id: string;
	readonly project: string | null;
	readonly session: string | undefined;
	readonly at: string | undefined;
	readonly signal: 'tool-error';
	/** The tool and the error line with paths and numbers masked; occurrences that share it are one error. */
	readonly signature: string;
	readonly text: string;
	readonly did: readonly string[];
	readonly skills: readonly string[];
	readonly fix?: string;
};

/** A tool error that recurs, reported by its latest occurrence. */
export type RecurringError = {
	readonly id: string;
	readonly projects: ReadonlyArray<string | null>;
	readonly at: string | undefined;
	readonly signal: 'tool-error';
	readonly text: string;
	readonly count: number;
	readonly sessions: number;
	readonly did: readonly string[];
	readonly fix: string | undefined;
	readonly skills: readonly string[];
};

/** How a failed tool call reads as an error: the signature that groups it, and the line that shows it. */
export type ToolFailure = {
	readonly signature: string;
	readonly line: string;
};

function errorLine(text: string): string {
	const line = text
		.replaceAll(/<\/?tool_use_error>/g, '')
		.split('\n')
		.map((candidate) => candidate.trim())
		.find((candidate) => candidate !== '' && !/^<[^>]+>$/.test(candidate));
	return truncate(line ?? '', ERROR_LIMIT);
}

function errorSignature(tool: string, line: string): string {
	const masked = line.replaceAll(/(?:~|\/)[^\s:'"`,)]+/g, '<path>').replaceAll(/\d+/g, '<n>');
	return `${tool}: ${masked.slice(0, SIGNATURE_LIMIT)}`;
}

function shellTrap(text: string): ToolFailure | undefined {
	const lines = text.split('\n').map((line) => line.trim());
	for (const [name, pattern] of SHELL_TRAPS) {
		const line = lines.find((candidate) => pattern.test(candidate));
		if (line !== undefined) {
			return {signature: `Bash: ${name}`, line: truncate(line, ERROR_LIMIT)};
		}
	}

	return undefined;
}

/**
 * Reads the result of a tool call as a failure worth grouping. A Bash output with a line that opens with a shell trap —
 * a zsh or BSD dialect error, a missing tool — groups under the trap's name, whatever the exit code; a line that only
 * quotes one is no trap. A failure refused before it ran groups by its first line with paths and numbers masked. A
 * command that ran and failed (`Exit code N`) is ordinary work. Returns undefined for anything else.
 */
export function toolFailure(tool: string, text: string, isError: boolean): ToolFailure | undefined {
	const trap = tool === 'Bash' ? shellTrap(text) : undefined;
	if (trap !== undefined || !isError || RAN_AND_FAILED.test(text)) {
		return trap;
	}

	const line = errorLine(text);
	return line === '' ? undefined : {signature: errorSignature(tool, line), line};
}

/** Groups tool errors by signature and keeps each that repeats in at least `minSessions` sessions. */
export function recurringErrors(occurrences: readonly ToolErrorOccurrence[], minSessions: number): RecurringError[] {
	const groups = new Map<
		string,
		{count: number; sessions: Set<string | undefined>; projects: Set<string | null>; latest: ToolErrorOccurrence}
	>();
	for (const occurrence of occurrences) {
		const group = groups.get(occurrence.signature) ?? {
			count: 0,
			sessions: new Set(),
			projects: new Set(),
			latest: occurrence,
		};
		group.count += 1;
		group.sessions.add(occurrence.session);
		group.projects.add(occurrence.project);
		group.latest = occurrence;
		groups.set(occurrence.signature, group);
	}

	return [...groups]
		.filter(([, {count, sessions}]) => count >= 2 && sessions.size >= minSessions)
		.map(([signature, {count, sessions, projects, latest}]) => ({
			id: `error:${signature}`,
			projects: [...projects],
			at: latest.at,
			signal: 'tool-error',
			text: latest.text,
			count,
			sessions: sessions.size,
			did: latest.did,
			fix: latest.fix,
			skills: latest.skills,
		}));
}
