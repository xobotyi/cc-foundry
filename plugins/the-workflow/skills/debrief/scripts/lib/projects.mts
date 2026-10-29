import {readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {exists, readOrEmpty} from './files.mts';
import {isSdk, sessionHead} from './transcript.mts';

const WORKTREE_SUFFIX = /\/\.claude\/worktrees\/[^/]+.*$/;

/** A transcript file and its modification time. */
export type TranscriptFile = {
	readonly file: string;
	readonly mtimeMs: number;
};

/** The transcripts of one repository: how many there are and when the newest was written. */
export type ProjectActivity = {
	readonly sessions: number;
	readonly last: number;
};

function ancestors(start: string): string[] {
	const dirs = [start];
	for (let dir = start; path.dirname(dir) !== dir; dir = path.dirname(dir)) {
		dirs.push(path.dirname(dir));
	}
	return dirs;
}

async function repositoryRoot(start: string): Promise<string> {
	const markers = await Promise.all(
		ancestors(start).map(async (dir) => {
			const marker = path.join(dir, '.git');
			const gitdir = /^gitdir:\s*(.+)$/m.exec(await readOrEmpty(marker))?.[1];
			const linked =
				gitdir === undefined
					? undefined
					: /^(.*)\/\.git\/worktrees\/[^/]+$/.exec(path.resolve(dir, gitdir.trim()))?.[1];
			return {dir, linked, present: await exists(marker)};
		}),
	);

	for (const {dir, linked, present} of markers) {
		if (linked !== undefined) {
			return linked;
		}

		if (present) {
			return dir;
		}
	}

	return start;
}

const repositories = new Map<string, Promise<string>>();

/** Returns the repository a working directory belongs to, a worktree folded into its main repository; null for none. */
export async function repositoryOf(cwd: string | undefined): Promise<string | null> {
	if (cwd === undefined || cwd === '') {
		return null;
	}

	const folded = path.resolve(cwd.replace(WORKTREE_SUFFIX, ''));
	let root = repositories.get(folded);
	if (root === undefined) {
		root = repositoryRoot(folded);
		repositories.set(folded, root);
	}

	return root;
}

async function transcriptDirs(projectsDir: string): Promise<string[]> {
	const entries = await readdir(projectsDir, {withFileTypes: true});
	return entries.filter((dirent) => dirent.isDirectory()).map((dirent) => path.join(projectsDir, dirent.name));
}

/** Returns the transcripts in `dirs` written since `since`, oldest first; only the one named `session` when given. */
export async function transcriptFiles(
	dirs: readonly string[],
	since: number,
	session?: string,
): Promise<TranscriptFile[]> {
	const listed = await Promise.all(
		dirs.map(async (dir) => {
			const names = await readdir(dir);
			return names.map((name) => ({dir, name}));
		}),
	);
	const wanted = listed
		.flat()
		.filter(({name}) => name.endsWith('.jsonl') && (session === undefined || name === `${session}.jsonl`));
	const files = await Promise.all(
		wanted.map(async ({dir, name}) => {
			const file = path.join(dir, name);
			const {mtimeMs} = await stat(file);
			return {file, mtimeMs};
		}),
	);
	return files.filter(({mtimeMs}) => mtimeMs >= since).toSorted((a, b) => a.mtimeMs - b.mtimeMs);
}

async function dirRepository(dir: string): Promise<string | null> {
	const files = await transcriptFiles([dir], 0);
	const newest = files.at(-1);
	if (newest === undefined) {
		return null;
	}

	const head = await sessionHead(newest.file);
	return repositoryOf(head?.cwd);
}

/** Returns the transcript directories whose sessions ran in each repository; throws for a repository with none. */
export async function projectDirs(
	projectsDir: string,
	projects: readonly string[],
	allProjects: boolean,
): Promise<string[]> {
	const dirs = await transcriptDirs(projectsDir);
	if (allProjects) {
		return dirs;
	}

	const owners = await Promise.all(dirs.map(async (dir) => ({dir, repository: await dirRepository(dir)})));
	const repositoriesOfProjects = await Promise.all(projects.map(async (projectDir) => repositoryOf(projectDir)));

	return projects.flatMap((projectDir, i) => {
		const repository = repositoriesOfProjects[i] ?? null;
		const matched = owners.filter((owner) => owner.repository === repository);
		if (matched.length === 0) {
			throw new Error(`no transcripts for ${projectDir}: no session under ${projectsDir} ran in ${String(repository)}`);
		}
		return matched.map(({dir}) => dir);
	});
}

/** Lists each repository that has transcripts, with its session count and newest transcript time, newest first. */
export async function listProjects(projectsDir: string): Promise<Array<[string, ProjectActivity]>> {
	const dirs = await transcriptDirs(projectsDir);
	const found = await Promise.all(
		dirs.map(async (dir) => {
			const files = await transcriptFiles([dir], 0);
			const newest = files.at(-1);
			if (newest === undefined) {
				return undefined;
			}

			const head = await sessionHead(newest.file);
			if (head !== undefined && isSdk(head)) {
				return undefined;
			}

			return {project: (await repositoryOf(head?.cwd)) ?? dir, sessions: files.length, last: newest.mtimeMs};
		}),
	);

	const projects = new Map<string, ProjectActivity>();
	for (const info of found) {
		if (info !== undefined) {
			const known = projects.get(info.project) ?? {sessions: 0, last: 0};
			projects.set(info.project, {sessions: known.sessions + info.sessions, last: Math.max(known.last, info.last)});
		}
	}
	return [...projects].toSorted(([, a], [, b]) => b.last - a.last);
}
