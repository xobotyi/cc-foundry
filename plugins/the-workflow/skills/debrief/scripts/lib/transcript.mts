import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {isObject, type Json, listOf, parseJson, stringOf} from './json.mts';

/** The `origin` field of an entry or a queued command: who produced it. */
export type Origin = {
	readonly kind: string | undefined;
};

/** The fields every transcript entry may carry. */
export type EntryBase = {
	readonly uuid: string | undefined;
	readonly parentUuid: string | undefined;
	readonly sessionId: string | undefined;
	readonly timestamp: string | undefined;
	readonly cwd: string | undefined;
	readonly entrypoint: string | undefined;
	readonly isSidechain: boolean;
};

/** The result of one tool call, joined to its call by `toolUseId`. */
export type ToolResult = {
	readonly toolUseId: string;
	readonly isError: boolean;
	readonly text: string;
};

/** A `user` entry: a prompt, a harness message, or the results of tool calls. */
export type UserEntry = EntryBase & {
	readonly kind: 'user';
	readonly text: string;
	readonly results: readonly ToolResult[];
	readonly isMeta: boolean;
	readonly isCompactSummary: boolean;
	/** Undefined when the entry carries no `origin` field. */
	readonly origin: Origin | undefined;
	/** How the user produced the prompt: `typed`, or `suggestion_accepted` for a prompt the CLI predicted. */
	readonly promptSource: string | undefined;
};

/** A text block of an assistant message. */
export type TextBlock = {
	readonly type: 'text';
	readonly text: string;
};

/** A tool call of an assistant message. */
export type ToolUse = {
	readonly type: 'tool_use';
	readonly id: string;
	readonly name: string;
	readonly input: Json | undefined;
};

/** An `assistant` entry: the text blocks and tool calls of one message, in order. */
export type AssistantEntry = EntryBase & {
	readonly kind: 'assistant';
	readonly blocks: ReadonlyArray<TextBlock | ToolUse>;
};

/** A message the user or a channel queued while the agent worked. */
export type QueuedCommand = {
	readonly kind: 'queued-command';
	readonly prompt: string;
	readonly commandMode: string | undefined;
	/** Undefined when the field is absent or null. */
	readonly origin: Origin | undefined;
};

/** The skills the harness re-attached, after a compaction. */
export type InvokedSkills = {
	readonly kind: 'invoked-skills';
	readonly skills: readonly string[];
};

/** One instruction file as the harness loaded it: a CLAUDE.md, a rules file, or a MEMORY.md. */
export type InstructionFile = {
	/** Its layer: `User`, `Project`, `Local`, `AutoMem`, or another the CLI adds. */
	readonly type: string;
	readonly path: string;
	readonly content: string;
};

/**
 * The instruction files in context. The first attachment of a session lists every file; a later one with `delta` set
 * lists only the files that changed and the paths it unloaded, after a compaction or a resume.
 */
export type Instructions = {
	readonly kind: 'instructions';
	readonly files: readonly InstructionFile[];
	readonly delta: boolean;
	readonly removed: readonly string[];
};

/** A nested CLAUDE.md or rules file the harness loaded when the agent reached its directory. */
export type NestedMemory = {
	readonly kind: 'nested-memory';
	readonly file: InstructionFile;
};

/** An attachment of a type debrief does not read. */
export type UnreadAttachment = {
	readonly kind: 'unread';
};

/** The payload of an `attachment` entry. */
export type Attachment = QueuedCommand | InvokedSkills | Instructions | NestedMemory | UnreadAttachment;

/** An `attachment` entry. */
export type AttachmentEntry = EntryBase & {
	readonly kind: 'attachment';
	readonly attachment: Attachment;
};

/** A `system` entry, such as the `compact_boundary` a compaction leaves. */
export type SystemEntry = EntryBase & {
	readonly kind: 'system';
	readonly subtype: string | undefined;
};

/** An entry of a type debrief reads only the common fields of. */
export type UnreadEntry = EntryBase & {
	readonly kind: 'unread';
};

/** One parsed transcript entry. */
export type Entry = UserEntry | AssistantEntry | AttachmentEntry | SystemEntry | UnreadEntry;

/** Joins the text of a message content: a plain string, or the text blocks of a block list. */
export function contentText(content: Json | undefined): string {
	if (typeof content === 'string') {
		return content;
	}

	return listOf(content)
		.map((block) => (isObject(block) && block.type === 'text' ? (stringOf(block.text) ?? '') : undefined))
		.filter((text) => text !== undefined)
		.join('\n');
}

const originOf = (value: Json | undefined): Origin => ({kind: isObject(value) ? stringOf(value.kind) : undefined});

function toolResults(content: Json | undefined): ToolResult[] {
	return listOf(content).flatMap((block) =>
		isObject(block) && block.type === 'tool_result' && typeof block.tool_use_id === 'string'
			? [{toolUseId: block.tool_use_id, isError: block.is_error === true, text: contentText(block.content)}]
			: [],
	);
}

function assistantBlocks(content: Json | undefined): Array<TextBlock | ToolUse> {
	return listOf(content).flatMap((block): Array<TextBlock | ToolUse> => {
		if (!isObject(block)) {
			return [];
		}

		if (block.type === 'text' && typeof block.text === 'string') {
			return [{type: 'text', text: block.text}];
		}

		if (block.type === 'tool_use' && typeof block.id === 'string' && typeof block.name === 'string') {
			return [{type: 'tool_use', id: block.id, name: block.name, input: block.input}];
		}

		return [];
	});
}

function instructionFileOf(value: Json | undefined): InstructionFile | undefined {
	if (!isObject(value) || typeof value.path !== 'string' || typeof value.content !== 'string') {
		return undefined;
	}

	return {type: stringOf(value.type) ?? '', path: value.path, content: value.content};
}

function attachmentOf(value: Json | undefined): Attachment {
	if (!isObject(value)) {
		return {kind: 'unread'};
	}

	switch (stringOf(value.type) ?? '') {
		case 'queued_command': {
			return {
				kind: 'queued-command',
				prompt: contentText(value.prompt),
				commandMode: stringOf(value.commandMode),
				origin: value.origin === null || value.origin === undefined ? undefined : originOf(value.origin),
			};
		}
		case 'invoked_skills': {
			const names = listOf(value.skills).map((skill) => (isObject(skill) ? stringOf(skill.name) : undefined));
			return {kind: 'invoked-skills', skills: names.filter((name) => name !== undefined)};
		}
		case 'instructions': {
			return {
				kind: 'instructions',
				files: listOf(value.files).flatMap((file) => instructionFileOf(file) ?? []),
				delta: value.changed === true,
				removed: listOf(value.removed).flatMap((removed) => stringOf(removed) ?? []),
			};
		}
		case 'nested_memory': {
			const file = instructionFileOf(value.content);
			return file === undefined ? {kind: 'unread'} : {kind: 'nested-memory', file};
		}
		default: {
			return {kind: 'unread'};
		}
	}
}

/** Parses one transcript line into an entry, or returns undefined for a line that is not a JSON object. */
export function parseEntry(line: string): Entry | undefined {
	let raw: Json;
	try {
		raw = parseJson(line);
	} catch {
		return undefined;
	}

	if (!isObject(raw)) {
		return undefined;
	}

	const base: EntryBase = {
		uuid: stringOf(raw.uuid),
		parentUuid: stringOf(raw.parentUuid),
		sessionId: stringOf(raw.sessionId),
		timestamp: stringOf(raw.timestamp),
		cwd: stringOf(raw.cwd),
		entrypoint: stringOf(raw.entrypoint),
		isSidechain: raw.isSidechain === true,
	};
	const content = isObject(raw.message) ? raw.message.content : undefined;

	switch (stringOf(raw.type) ?? '') {
		case 'user': {
			return {
				...base,
				kind: 'user',
				text: contentText(content),
				results: toolResults(content),
				isMeta: raw.isMeta === true,
				isCompactSummary: raw.isCompactSummary === true,
				origin: 'origin' in raw ? originOf(raw.origin) : undefined,
				promptSource: stringOf(raw.promptSource),
			};
		}
		case 'assistant': {
			return {...base, kind: 'assistant', blocks: assistantBlocks(content)};
		}
		case 'attachment': {
			return {...base, kind: 'attachment', attachment: attachmentOf(raw.attachment)};
		}
		case 'system': {
			return {...base, kind: 'system', subtype: stringOf(raw.subtype)};
		}
		default: {
			return {...base, kind: 'unread'};
		}
	}
}

/** Returns whether an entry comes from an SDK-driven session, which holds no human corrections. */
export const isSdk = (entry: EntryBase): boolean => entry.entrypoint?.startsWith('sdk-') === true;

/** Yields every entry of a transcript in file order, skipping lines that are not JSON objects. */
export async function* readEntries(file: string): AsyncGenerator<Entry> {
	const input = createReadStream(file);
	try {
		for await (const line of createInterface({input, crlfDelay: Infinity})) {
			const entry = parseEntry(line);
			if (entry !== undefined) {
				yield entry;
			}
		}
	} finally {
		input.destroy();
	}
}

/** Returns the first entry of a transcript that carries a working directory, or undefined when none does. */
export async function sessionHead(file: string): Promise<Entry | undefined> {
	for await (const entry of readEntries(file)) {
		if (entry.cwd !== undefined && entry.cwd !== '') {
			return entry;
		}
	}

	return undefined;
}
