import {recurringErrors, type RecurringError, type ToolErrorOccurrence} from './errors.mts';
import {LoadedContext} from './loaded.mts';
import {type MemoryLookup, memoryDir, type MemoryRecord, memoryRecords} from './memory.mts';
import {type Procedure, recurringProcedures, type SessionSteps, sessionSteps} from './procedures.mts';
import {projectDirs, repositoryOf, transcriptFiles} from './projects.mts';
import {type CompactionLoss, type Correction, type Retraction, sessionCandidates} from './session.mts';
import {isSdk, sessionHead} from './transcript.mts';

/** One record the extractor emits as a JSON line: a candidate, a recurring tool error, a procedure, or a memory. */
export type Candidate = Correction | Retraction | CompactionLoss | RecurringError | Procedure | MemoryRecord;

const PROCEDURE_SESSIONS = 6;
const PROCEDURE_LIMIT = 25;

/** What one extraction reads: the transcript directory, the repositories, the window, and the auto-memory switch. */
export type ExtractOptions = MemoryLookup & {
	readonly projects: readonly string[];
	readonly allProjects: boolean;
	readonly since: number;
	readonly session: string | undefined;
	/** The directory the instruction sets of the corrections are written to; none are collected without it. */
	readonly contextDir: string | undefined;
};

/**
 * Yields every record of one extraction in output order: the candidates of each transcript, oldest file first, then
 * the tool errors that recur, then the procedures repeated in six or more sessions unless one session is named, then
 * the auto memories written in the window. A record copied into a later transcript is yielded once. With
 * `contextDir`, the instruction sets the corrections name are written there before the errors.
 */
export async function* extract(options: ExtractOptions): AsyncGenerator<Candidate> {
	const {projectsDir, since, session} = options;
	const dirs = await projectDirs(projectsDir, options.projects, options.allProjects);
	const files = await transcriptFiles(dirs, since, session);
	const emitted = new Set<string | undefined>();
	const errors: ToolErrorOccurrence[] = [];
	const context = options.contextDir === undefined ? undefined : new LoadedContext(options.contextDir);

	for (const {file} of files) {
		// oxlint-disable-next-line no-await-in-loop -- transcripts are read oldest first, and a copied entry keeps its first one
		for await (const candidate of sessionCandidates(file, since, context)) {
			if (candidate.id !== undefined && emitted.has(candidate.id)) {
				continue;
			}
			emitted.add(candidate.id);
			if (candidate.signal === 'tool-error') {
				errors.push(candidate);
			} else {
				yield candidate;
			}
		}
	}

	await context?.write();
	yield* recurringErrors(errors, session === undefined ? 2 : 1);

	const heads = await Promise.all(
		files.map(async ({file}) => {
			const head = await sessionHead(file);
			return {file, head, project: await repositoryOf(head?.cwd)};
		}),
	);

	if (session === undefined) {
		const steps: SessionSteps[] = [];
		const seen = new Set<string>();
		for (const {file, project} of heads) {
			// oxlint-disable-next-line no-await-in-loop -- transcripts are read oldest first, and a copied entry keeps its first one
			const read = await sessionSteps(file, since, project, seen);
			if (read !== undefined) {
				steps.push(read);
			}
		}
		yield* recurringProcedures(steps, PROCEDURE_SESSIONS, PROCEDURE_LIMIT);
	}

	const memorySince = new Map<string, number>();
	for (const {head, project} of heads) {
		if (head === undefined || project === null || isSdk(head)) {
			continue;
		}

		const started = Date.parse(head.timestamp ?? '');
		const start = session === undefined || Number.isNaN(started) || started === 0 ? since : started;
		memorySince.set(project, Math.min(memorySince.get(project) ?? Infinity, start));
	}

	const memories = await Promise.all(
		[...memorySince].map(async ([project, start]) => {
			const dir = await memoryDir(project, options);
			return dir === undefined ? [] : memoryRecords(project, dir, start);
		}),
	);
	for (const record of memories.flat()) {
		if (!emitted.has(record.id)) {
			emitted.add(record.id);
			yield record;
		}
	}
}
