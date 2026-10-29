import {truncate} from './text.mts';

const ERROR_LIMIT = 300;
const SIGNATURE_LIMIT = 160;

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

/** Returns the first line of a tool error that is not markup, or an empty string for none. */
export function errorLine(text: string): string {
	const line = text
		.replaceAll(/<\/?tool_use_error>/g, '')
		.split('\n')
		.map((candidate) => candidate.trim())
		.find((candidate) => candidate !== '' && !/^<[^>]+>$/.test(candidate));
	return truncate(line ?? '', ERROR_LIMIT);
}

/** Returns the signature of a tool error: the tool and the error line with paths and numbers masked. */
export function errorSignature(tool: string, line: string): string {
	const masked = line.replaceAll(/(?:~|\/)[^\s:'"`,)]+/g, '<path>').replaceAll(/\d+/g, '<n>');
	return `${tool}: ${masked.slice(0, SIGNATURE_LIMIT)}`;
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
