import type {ExtractOptions} from './extract.mts';
import type {Json} from './json.mts';
import {projectDirs, repositoryOf, transcriptFiles} from './projects.mts';
import {isSdk, readEntries, sessionHead} from './transcript.mts';

const REJECTION_PREFIX = "The user doesn't want to proceed with this tool use";

/** How a recorded tool call ended: it ran, it failed, the user refused it, or the transcript holds no result. */
export type CallOutcome = 'ok' | 'error' | 'rejected' | 'unanswered';

/** One recorded tool call with the input the agent sent, as a hook would have received it. */
export type RecordedCall = {
	readonly id: string;
	readonly session: string | undefined;
	readonly at: string | undefined;
	readonly project: string | null;
	readonly cwd: string | undefined;
	readonly transcript: string;
	readonly tool: string;
	readonly input: Json | undefined;
	readonly outcome: CallOutcome;
};

/** Which recorded calls to read: one tool by name, and optionally a regular expression its JSON input must match. */
export type CallFilter = {
	readonly tool: string;
	readonly match: string | undefined;
};

function outcomeOf(text: string, isError: boolean): CallOutcome {
	if (text.startsWith(REJECTION_PREFIX)) {
		return 'rejected';
	}

	return isError ? 'error' : 'ok';
}

/**
 * Yields the main-thread calls of one transcript that pass `filter` and were made since `since`, each with its outcome.
 * A call whose id is in `seen` is history a resumed session copied and is skipped; every other id is added to it.
 */
export async function* recordedCalls(
	file: string,
	since: number,
	project: string | null,
	filter: CallFilter,
	seen: Set<string>,
): AsyncGenerator<RecordedCall> {
	const pending = new Map<string, Omit<RecordedCall, 'outcome'>>();
	const match = filter.match === undefined ? undefined : new RegExp(filter.match);

	for await (const entry of readEntries(file)) {
		if (isSdk(entry)) {
			return;
		}

		if (entry.isSidechain) {
			continue;
		}

		if (entry.kind === 'assistant' && Date.parse(entry.timestamp ?? '') >= since) {
			for (const block of entry.blocks) {
				if (block.type !== 'tool_use' || block.name !== filter.tool || seen.has(block.id)) {
					continue;
				}

				if (match !== undefined && !match.test(JSON.stringify(block.input ?? {}))) {
					continue;
				}

				seen.add(block.id);
				pending.set(block.id, {
					id: block.id,
					session: entry.sessionId,
					at: entry.timestamp,
					project,
					cwd: entry.cwd,
					transcript: file,
					tool: block.name,
					input: block.input,
				});
			}
		}

		if (entry.kind === 'user') {
			for (const result of entry.results) {
				const call = pending.get(result.toolUseId);
				if (call !== undefined) {
					pending.delete(result.toolUseId);
					yield {...call, outcome: outcomeOf(result.text, result.isError)};
				}
			}
		}
	}

	for (const call of pending.values()) {
		yield {...call, outcome: 'unanswered'};
	}
}

/** Yields the recorded calls that pass `filter` across the transcripts an extraction with `options` reads, oldest first. */
export async function* extractCalls(
	options: Pick<ExtractOptions, 'projectsDir' | 'projects' | 'allProjects' | 'since' | 'session'>,
	filter: CallFilter,
): AsyncGenerator<RecordedCall> {
	const dirs = await projectDirs(options.projectsDir, options.projects, options.allProjects);
	const files = await transcriptFiles(dirs, options.since, options.session);
	const seen = new Set<string>();
	for (const {file} of files) {
		// oxlint-disable-next-line no-await-in-loop -- transcripts are read oldest first, and a copied call keeps its first one
		const head = await sessionHead(file);
		// oxlint-disable-next-line no-await-in-loop -- the repository resolves once per transcript, in read order
		const project = await repositoryOf(head?.cwd);
		yield* recordedCalls(file, options.since, project, filter, seen);
	}
}
