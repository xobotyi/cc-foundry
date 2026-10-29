import {errorLine, errorSignature, type ToolErrorOccurrence} from './errors.mts';
import {isObject} from './json.mts';
import {type LoadedContext, SessionInstructions} from './loaded.mts';
import {repositoryOf} from './projects.mts';
import {similarity, tail, TEXT_LIMIT, truncate} from './text.mts';
import {type EntryBase, isSdk, type QueuedCommand, readEntries, type ToolUse, type UserEntry} from './transcript.mts';

const REJECTION_PREFIX = "The user doesn't want to proceed with this tool use";
const INTERRUPT_PREFIX = '[Request interrupted by user';
const SKILL_BODY_PREFIX = 'Base directory for this skill:';
const COMMAND_NAME = /<command-name>\/([^<\s]+)<\/command-name>/;
const RAN_AND_FAILED = /^Exit code \d+/;
const SUGGESTION_ACCEPTED = 'suggestion_accepted';
const RETYPED_SIMILARITY = 0.9;
const INTERJECTION_MS = 1000;
const SAID_LIMIT = 600;
const DID_LIMIT = 3;
const INPUT_LIMIT = 160;
const INPUT_KEYS = ['file_path', 'command', 'pattern', 'skill', 'description', 'url', 'query', 'prompt'];

/**
 * What preceded a correction candidate. An `interjection` is a prompt sent within a second of a rejected tool call: the
 * harness rejects the pending call because the user sent a message, so the rejection refuses nothing.
 */
export type CorrectionSignal = 'rejection' | 'interjection' | 'interrupt' | 'rewind' | 'mid-turn' | 'follow-up';

/** A human message that may correct the agent, with what the agent said and did just before it. */
export type Correction = {
	readonly id: string | undefined;
	readonly project: string | null;
	readonly session: string | undefined;
	readonly at: string | undefined;
	readonly signal: CorrectionSignal;
	readonly text: string;
	readonly said: string;
	readonly did: readonly string[];
	readonly skills: readonly string[];
	/** The JSON file that lists the instruction files in context, when the extraction collects them. */
	readonly loaded?: string;
};

function describeTool(call: ToolUse): string {
	const input = isObject(call.input) ? call.input : {};
	const detail =
		INPUT_KEYS.map((key) => input[key]).find((value) => typeof value === 'string') ?? JSON.stringify(call.input ?? {});
	return `${call.name} ${truncate(detail.replaceAll('\n', ' '), INPUT_LIMIT)}`;
}

function isHumanPrompt(entry: UserEntry, sessionHasOrigin: boolean): boolean {
	if (entry.isMeta || entry.isCompactSummary || entry.results.length > 0) {
		return false;
	}

	const text = entry.text.trimStart();
	if (text === '' || text.startsWith('<') || text.startsWith(INTERRUPT_PREFIX)) {
		return false;
	}

	if (entry.origin !== undefined) {
		return entry.origin.kind === 'human';
	}

	return !sessionHasOrigin && !text.startsWith('/');
}

function isHumanQueuedCommand(command: QueuedCommand): boolean {
	if (command.origin !== undefined) {
		return command.origin.kind === 'human';
	}

	return command.commandMode === 'prompt' && !command.prompt.trimStart().startsWith('<');
}

/**
 * Reads one transcript and yields its correction candidates in order: each human prompt that follows a rejection,
 * an interrupt, a rewind, or another prompt, each message queued mid-turn, and each tool error with the call that
 * fixed it. A session's first prompt and anything before `since` are skipped; an SDK session yields nothing. With
 * `context`, each correction names the set of instruction files it was made under.
 */
export async function* sessionCandidates(
	file: string,
	since: number,
	context?: LoadedContext,
): AsyncGenerator<Correction | ToolErrorOccurrence> {
	let opening = true;
	let held: Correction | undefined;
	let lastParent: string | undefined;
	const promptsByParent = new Map<string | undefined, string>();
	let answered = false;
	let said = '';
	let did: string[] = [];
	let pending: 'rejection' | 'interrupt' | undefined;
	let rejectedAt = Number.NaN;
	let project: string | null = null;
	let sessionHasOrigin = false;
	const skills = new Set<string>();
	let typedCommand: string | undefined;
	const instructions = new SessionInstructions();
	const calls = new Map<string, {tool: string; call: string}>();
	const unresolved = new Map<string, ToolErrorOccurrence>();

	const candidate = (entry: EntryBase, signal: CorrectionSignal, text: string): Correction => {
		const files = instructions.files();
		return {
			id: entry.uuid,
			project,
			session: entry.sessionId,
			at: entry.timestamp,
			signal,
			text: truncate(text, TEXT_LIMIT),
			said: tail(said, SAID_LIMIT),
			did,
			skills: [...skills],
			loaded: context === undefined || files.length === 0 ? undefined : context.record(files),
		};
	};

	for await (const entry of readEntries(file)) {
		if (entry.isSidechain) {
			continue;
		}

		if (isSdk(entry)) {
			return;
		}

		// oxlint-disable-next-line no-await-in-loop -- the first entry that carries a cwd decides the repository, once
		project ??= await repositoryOf(entry.cwd);

		if (entry.kind === 'assistant') {
			answered = true;
			for (const block of entry.blocks) {
				if (block.type === 'text') {
					if (block.text.trim() !== '') {
						said = block.text;
					}
					continue;
				}

				const described = describeTool(block);
				did = [...did, described].slice(-DID_LIMIT);
				calls.set(block.id, {tool: block.name, call: described});

				const skill = isObject(block.input) ? block.input.skill : undefined;
				if (block.name === 'Skill' && typeof skill === 'string') {
					skills.add(skill);
				}
			}
			continue;
		}

		const inWindow = Date.parse(entry.timestamp ?? '') >= since;

		if (entry.kind === 'system') {
			if (entry.subtype === 'compact_boundary') {
				instructions.compact();
			}
			continue;
		}

		if (entry.kind === 'attachment') {
			const {attachment} = entry;
			if (attachment.kind === 'instructions') {
				instructions.apply(attachment);
				continue;
			}

			if (attachment.kind === 'nested-memory') {
				instructions.nest(attachment.file);
				continue;
			}

			if (attachment.kind === 'invoked-skills') {
				for (const skill of attachment.skills) {
					skills.add(skill);
				}
				continue;
			}

			if (attachment.kind === 'queued-command' && isHumanQueuedCommand(attachment)) {
				if (held !== undefined) {
					yield held;
				}
				held = undefined;
				if (inWindow) {
					yield candidate(entry, 'mid-turn', attachment.prompt);
				}
			}
			continue;
		}

		if (entry.kind !== 'user') {
			continue;
		}
		sessionHasOrigin ||= entry.origin !== undefined;

		for (const result of entry.results) {
			const call = calls.get(result.toolUseId);
			if (call === undefined) {
				continue;
			}

			if (!result.isError) {
				const failed = unresolved.get(call.tool);
				unresolved.delete(call.tool);
				if (failed !== undefined) {
					yield {...failed, fix: call.call};
				}
				continue;
			}

			const {text} = result;
			if (text.startsWith(REJECTION_PREFIX) || text.startsWith(INTERRUPT_PREFIX) || RAN_AND_FAILED.test(text)) {
				continue;
			}

			const firstLine = errorLine(text);
			if (!inWindow || firstLine === '') {
				continue;
			}

			const previous = unresolved.get(call.tool);
			if (previous !== undefined) {
				yield previous;
			}
			unresolved.set(call.tool, {
				id: `${String(entry.uuid)}/${result.toolUseId}`,
				project,
				session: entry.sessionId,
				at: entry.timestamp,
				signal: 'tool-error',
				signature: errorSignature(call.tool, firstLine),
				text: firstLine,
				did: [call.call],
				skills: [...skills],
			});
		}

		const body = entry.text;
		if (typedCommand !== undefined && entry.isMeta && body.startsWith(SKILL_BODY_PREFIX)) {
			skills.add(typedCommand);
		}
		typedCommand = COMMAND_NAME.exec(body)?.[1];

		if (entry.results.some((result) => result.text.startsWith(REJECTION_PREFIX))) {
			pending = 'rejection';
			rejectedAt = Date.parse(entry.timestamp ?? '');
			continue;
		}

		if (body.startsWith(INTERRUPT_PREFIX)) {
			pending ??= 'interrupt';
			continue;
		}

		if (!isHumanPrompt(entry, sessionHasOrigin)) {
			continue;
		}

		const text = body.trim();
		const parent = entry.parentUuid;
		if (parent !== undefined && parent === lastParent && !answered) {
			if (held !== undefined) {
				held = {...held, id: entry.uuid, at: entry.timestamp, text: truncate(text, TEXT_LIMIT)};
			}
		} else {
			if (held !== undefined) {
				yield held;
			}
			const replaced = parent === undefined ? undefined : promptsByParent.get(parent);
			const interjected = pending === 'rejection' && Date.parse(entry.timestamp ?? '') - rejectedAt < INTERJECTION_MS;
			const precedent = interjected ? 'interjection' : (pending ?? 'follow-up');
			const signal = replaced === undefined ? precedent : 'rewind';
			const predicted = entry.promptSource === SUGGESTION_ACCEPTED;
			const retyped = replaced !== undefined && similarity(replaced, text) >= RETYPED_SIMILARITY;
			held = !opening && inWindow && !predicted && !retyped ? candidate(entry, signal, text) : undefined;
			opening = false;
			said = '';
			did = [];
		}
		promptsByParent.set(parent, text);
		lastParent = parent;
		answered = false;
		pending = undefined;
	}

	if (held !== undefined) {
		yield held;
	}
	yield* unresolved.values();
}
