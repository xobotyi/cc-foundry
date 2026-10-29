import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {InstructionFile, Instructions} from './transcript.mts';

const WORKTREE = /\/\.claude\/worktrees\/[^/]+(?=\/)/;
const ID_LENGTH = 8;

/** How a loaded file compares with the file on disk now. */
export type FileState = 'same' | 'changed' | 'missing';

/** One loaded file of a set, as the gate reads it. */
export type LoadedFile = {
	readonly type: string;
	readonly path: string;
	readonly state: FileState;
	/** The text the session loaded, written beside the set when the file changed since or is gone. */
	readonly recorded?: string;
};

type Version = {
	readonly type: string;
	readonly path: string;
	readonly content: string;
	readonly id: string;
};

const hash = (text: string): string => createHash('sha256').update(text).digest('hex').slice(0, ID_LENGTH);
const versionKey = (version: Version): string => `${version.path}@${version.id}`;

async function diskText(file: string): Promise<string | undefined> {
	try {
		const text = await readFile(file, 'utf8');
		return text.trim();
	} catch {
		return undefined;
	}
}

function loadedFile(version: Version, current: string | undefined, versionsDir: string): LoadedFile {
	const {type, path: file, content, id} = version;
	if (current === content) {
		return {type, path: file, state: 'same'};
	}

	const recorded = path.join(versionsDir, `${id}.md`);
	return {type, path: file, state: current === undefined ? 'missing' : 'changed', recorded};
}

/** Returns a path inside a `.claude/worktrees/<name>` checkout as the same path in the main checkout. */
export const foldWorktree = (file: string): string => file.replace(WORKTREE, '');

/** The instruction files one session has in context, as its attachments record them. */
export class SessionInstructions {
	readonly #files = new Map<string, InstructionFile>();
	readonly #nested = new Map<string, InstructionFile>();

	/** Applies an `instructions` attachment: a full set replaces the files, a delta updates and unloads them. */
	apply(instructions: Instructions): void {
		if (!instructions.delta) {
			this.#files.clear();
		}
		for (const removed of instructions.removed) {
			this.#files.delete(removed);
		}
		for (const file of instructions.files) {
			this.#files.set(file.path, file);
		}
	}

	/** Adds a nested file the harness loaded when the agent reached its directory. */
	nest(file: InstructionFile): void {
		this.#nested.set(file.path, file);
	}

	/** Unloads the nested files, which a compaction drops until the agent reaches their directories again. */
	compact(): void {
		this.#nested.clear();
	}

	/** Returns the files in context now. */
	files(): InstructionFile[] {
		return [...new Map([...this.#files, ...this.#nested]).values()];
	}
}

/**
 * Collects the sets of instruction files that candidates were corrected under, and writes each set to `dir` as a
 * JSON file the gate reads: every file with its layer, its path in the main checkout, and its state on disk now.
 */
export class LoadedContext {
	readonly #dir: string;
	readonly #sets = new Map<string, readonly Version[]>();

	constructor(dir: string) {
		this.#dir = dir;
	}

	/** Records one set of loaded files and returns the path its JSON file is written to. */
	record(files: readonly InstructionFile[]): string {
		const versions = new Map<string, Version>();
		for (const file of files) {
			const content = file.content.trim();
			const folded = foldWorktree(file.path);
			versions.set(folded, {type: file.type, path: folded, content, id: hash(content)});
		}

		const sorted = [...versions.values()].toSorted((a, b) => Number(a.path > b.path) - Number(a.path < b.path));
		const id = hash(sorted.map((version) => `${version.type}\t${version.path}\t${version.id}`).join('\n'));
		this.#sets.set(id, sorted);
		return path.join(this.#dir, `${id}.json`);
	}

	/** Writes every recorded set, and the loaded text of each file that changed on disk since or is gone. */
	async write(): Promise<void> {
		const versions = new Map([...this.#sets.values()].flat().map((version) => [versionKey(version), version]));
		const paths = [...new Set([...versions.values()].map((version) => version.path))];
		const disk = new Map(await Promise.all(paths.map(async (file) => [file, await diskText(file)] as const)));
		const versionsDir = path.join(this.#dir, 'versions');
		const loaded = new Map(
			[...versions].map(([key, version]) => [key, loadedFile(version, disk.get(version.path), versionsDir)]),
		);

		await mkdir(versionsDir, {recursive: true});
		await Promise.all([
			...[...versions].map(async ([key, version]) => {
				const recorded = loaded.get(key)?.recorded;
				return recorded === undefined ? undefined : writeFile(recorded, `${version.content}\n`);
			}),
			...[...this.#sets].map(async ([id, set]) => {
				const files = set.map((version) => loaded.get(versionKey(version)));
				return writeFile(path.join(this.#dir, `${id}.json`), `${JSON.stringify({files}, null, '\t')}\n`);
			}),
		]);
	}
}
