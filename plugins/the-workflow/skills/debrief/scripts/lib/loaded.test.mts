import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vite-plus/test';
import {isObject, type JsonObject, listOf, parseJson, stringOf} from './json.mts';
import {foldWorktree, LoadedContext, SessionInstructions} from './loaded.mts';
import type {InstructionFile} from './transcript.mts';

async function readSet(set: string): Promise<JsonObject[]> {
	const written = parseJson(await readFile(set, 'utf8'));
	return isObject(written) ? listOf(written.files).filter((entry) => isObject(entry)) : [];
}

const recordedOf = (file?: JsonObject): string => stringOf(file?.recorded) ?? '';
const VERSION_FILE = /\/versions\/[0-9a-f]{8}\.md$/;

const file = (filePath: string, content: string, type = 'Project'): InstructionFile => ({
	type,
	path: filePath,
	content,
});

describe('SessionInstructions', () => {
	test('replaces the files with a full set and updates them with a delta', () => {
		const instructions = new SessionInstructions();
		instructions.apply({kind: 'instructions', files: [file('/a', '1'), file('/b', '1')], delta: false, removed: []});
		instructions.apply({kind: 'instructions', files: [file('/b', '2')], delta: true, removed: ['/a']});
		instructions.apply({kind: 'instructions', files: [file('/c', '1')], delta: true, removed: []});

		expect(instructions.files()).toStrictEqual([file('/b', '2'), file('/c', '1')]);

		instructions.apply({kind: 'instructions', files: [file('/d', '1')], delta: false, removed: []});

		expect(instructions.files()).toStrictEqual([file('/d', '1')]);
	});

	test('keeps nested files until a compaction', () => {
		const instructions = new SessionInstructions();
		instructions.apply({kind: 'instructions', files: [file('/a', '1')], delta: false, removed: []});
		instructions.nest(file('/a/rules/x.md', 'x'));

		expect(instructions.files().map(({path: filePath}) => filePath)).toStrictEqual(['/a', '/a/rules/x.md']);

		instructions.compact();

		expect(instructions.files().map(({path: filePath}) => filePath)).toStrictEqual(['/a']);
	});
});

describe('foldWorktree', () => {
	test('maps a worktree path to the main checkout and leaves other paths alone', () => {
		expect(foldWorktree('/repo/.claude/worktrees/feature/CLAUDE.md')).toBe('/repo/CLAUDE.md');
		expect(foldWorktree('/repo/pkg/CLAUDE.md')).toBe('/repo/pkg/CLAUDE.md');
	});
});

describe('LoadedContext', () => {
	let dir = '';
	let repo = '';

	beforeAll(async () => {
		dir = await mkdtemp(path.join(tmpdir(), 'debrief-loaded-'));
		repo = await mkdtemp(path.join(tmpdir(), 'debrief-loaded-repo-'));
		await mkdir(path.join(repo, 'pkg'));
		await writeFile(path.join(repo, 'CLAUDE.md'), '# Repo\n\nKeep it pure.\n');
		await writeFile(path.join(repo, 'pkg', 'CLAUDE.md'), '# Pkg\n\nNew rule.\n');
	});

	afterAll(async () => {
		await Promise.all([dir, repo].map(async (target) => rm(target, {recursive: true, force: true})));
	});

	test('gives the same set of files the same path, whatever their order', () => {
		const context = new LoadedContext(dir);
		const first = context.record([file('/x', 'a'), file('/y', 'b')]);

		expect(context.record([file('/y', 'b'), file('/x', 'a')])).toBe(first);
		expect(context.record([file('/y', 'c'), file('/x', 'a')])).not.toBe(first);
		expect(path.dirname(first)).toBe(dir);
	});

	test('writes each set with every file state on disk, a worktree path folded to the main checkout', async () => {
		const context = new LoadedContext(dir);
		const set = context.record([
			file(path.join(repo, '.claude', 'worktrees', 'wt', 'CLAUDE.md'), '# Repo\n\nKeep it pure.'),
			file(path.join(repo, 'pkg', 'CLAUDE.md'), '# Pkg\n\nOld rule.'),
			file(path.join(repo, 'gone.md'), 'Removed rule.', 'AutoMem'),
		]);
		await context.write();

		const files = await readSet(set);
		expect(files.map(({type, path: filePath, state}) => ({type, path: filePath, state}))).toStrictEqual([
			{type: 'Project', path: path.join(repo, 'CLAUDE.md'), state: 'same'},
			{type: 'AutoMem', path: path.join(repo, 'gone.md'), state: 'missing'},
			{type: 'Project', path: path.join(repo, 'pkg', 'CLAUDE.md'), state: 'changed'},
		]);
		const [same, missing, changed] = files.map((loaded) => recordedOf(loaded));
		expect(same).toBe('');
		expect(missing).toMatch(VERSION_FILE);
		expect(changed).toMatch(VERSION_FILE);
	});

	test('writes the loaded text of a changed file beside the set', async () => {
		const context = new LoadedContext(dir);
		const set = context.record([file(path.join(repo, 'pkg', 'CLAUDE.md'), '# Pkg\n\nOld rule.\n')]);
		await context.write();

		const [changed] = await readSet(set);
		expect(await readFile(recordedOf(changed), 'utf8')).toBe('# Pkg\n\nOld rule.\n');
	});
});
