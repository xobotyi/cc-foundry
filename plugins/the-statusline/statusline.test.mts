import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {stripVTControlCharacters as plain} from 'node:util';
import {describe, expect, onTestFinished, test, vi} from 'vite-plus/test';
import {
	collapsePath,
	colorByUrgency,
	formatContextRemaining,
	formatRateLimit,
	formatRow1,
	formatRow2,
	formatStyleModel,
	parseSession,
	projectExhaustion,
	readGitBranch,
	resolveLocation,
	toHomeRelative,
	trimMiddle,
	visibleWidth,
	type SessionData,
} from './statusline.mts';

const HOME = '/home/dev';
const NOW = Date.parse('2026-10-28T12:00:00Z');
const nowSeconds = NOW / 1000;
const HOUR = 3600;

async function tempDir(): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), 'statusline-'));
	onTestFinished(async () => {
		await rm(dir, {recursive: true, force: true});
	});
	return dir;
}

function stubHome(): void {
	vi.stubEnv('HOME', HOME);
	onTestFinished(() => {
		vi.unstubAllEnvs();
	});
}

function fixClock(): void {
	vi.useFakeTimers({toFake: ['Date']});
	vi.setSystemTime(NOW);
	vi.stubEnv('TZ', 'UTC');
	onTestFinished(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
	});
}

const session: SessionData = {
	cwd: '/nonexistent/app',
	model: {display_name: 'Opus 5.5'},
	effort: {level: 'high'},
	workspace: {current_dir: '/nonexistent/app', project_dir: '/nonexistent/app'},
	output_style: {name: 'ai-helpers:AI Engineer'},
	cost: {total_cost_usd: 12.345, total_lines_added: 120, total_lines_removed: 7},
	context_window: {remaining_percentage: 42.6},
	rate_limits: {five_hour: {used_percentage: 63, resets_at: nowSeconds + HOUR}},
};

describe('parseSession', () => {
	test('keeps the fields the renderer reads', () => {
		expect(parseSession({...session, extra: true})).toStrictEqual({
			...session,
			effort: {level: 'high'},
			context_window: {remaining_percentage: 42.6},
			rate_limits: {five_hour: session.rate_limits?.five_hour, seven_day: undefined},
			worktree: undefined,
		});
	});

	test('drops a field whose value has another type', () => {
		const parsed = parseSession({cwd: 5, cost: {total_cost_usd: '1'}, context_window: {remaining_percentage: null}});

		expect(parsed.cwd).toBeUndefined();
		expect(parsed.cost).toStrictEqual({
			total_cost_usd: undefined,
			total_lines_added: undefined,
			total_lines_removed: undefined,
		});
		expect(parsed.context_window).toStrictEqual({remaining_percentage: undefined});
	});

	test.each([null, 5, 'text'])('rejects the payload %j', (payload) => {
		expect(() => parseSession(payload)).toThrow(TypeError);
	});
});

describe('visibleWidth', () => {
	test('excludes terminal escapes', () => {
		expect(visibleWidth(colorByUrgency(50, 'abc'))).toBe(3);
	});

	test('counts one column per code point', () => {
		expect(visibleWidth('é🚀')).toBe(2);
	});
});

describe('trimMiddle', () => {
	test.each([
		['short', 10, 'short'],
		['very-long-folder-name', 12, 'very-...name'],
		['very-long-folder-name', 3, 'ver'],
	])('trims %j to %i columns as %j', (str, width, trimmed) => {
		expect(trimMiddle(str, width)).toBe(trimmed);
	});
});

describe('collapsePath', () => {
	const projectPath = '~/projects/very-long-project-directory-name';

	test('leaves a path that fits', () => {
		expect(collapsePath(projectPath, 43)).toBe(projectPath);
	});

	test('shortens directory segments first, then trims the folder name', () => {
		expect(collapsePath(projectPath, 40)).toBe('~/p/very-long-project-directory-name');
		expect(collapsePath(projectPath, 20)).toBe('~/p/very-lo...y-name');
	});

	test('keeps the root of an absolute path at every collapse stage', () => {
		const dir = '/opt/some/deeply/nested/working/directory';

		expect(collapsePath(dir, 30)).toBe('/o/s/d/n/working/directory');
		expect(collapsePath(dir, 12)).toBe('/o/.../d...y');
	});
});

describe('toHomeRelative', () => {
	test.each([
		[HOME, '~'],
		[`${HOME}/app`, '~/app'],
		[`${HOME}ops/app`, `${HOME}ops/app`],
		['/srv/app', '/srv/app'],
	])('shows %s as %s', (dir, shown) => {
		stubHome();

		expect(toHomeRelative(dir)).toBe(shown);
	});
});

describe('resolveLocation', () => {
	const app = `${HOME}/app`;
	const wt = `${app}/.claude/worktrees/feat`;
	const at = (cwd: string, extra: SessionData = {}): SessionData => ({
		cwd,
		workspace: {current_dir: cwd, project_dir: app},
		...extra,
	});
	const worktree = {name: 'feat', path: wt, original_cwd: app};

	test.each([
		['the project root', at(app), 'full', {path: '~/app', tag: ''}],
		['a subdirectory', at(`${app}/src/ui`), 'full', {path: '$/src/ui', tag: ''}],
		['a directory outside the project', at('/srv/other'), 'full', {path: '/srv/other', tag: ''}],
		['a session with no project directory', {cwd: app}, 'full', {path: '~/app', tag: ''}],
		['a worktree root', at(wt, {worktree}), 'full', {path: '~/app', tag: ' [wt feat]'}],
		['a worktree root in the short form', at(wt, {worktree}), 'short', {path: '~/app', tag: ' [wt]'}],
		['a worktree subdirectory', at(`${wt}/sub`, {worktree}), 'full', {path: '$/sub', tag: ' [wt feat]'}],
		['a worktree with no name', at(wt, {worktree: {...worktree, name: ''}}), 'full', {path: '~/app', tag: ''}],
	] as const)('shows %s', (_name, data, form, location) => {
		stubHome();

		expect(resolveLocation(data, form)).toStrictEqual(location);
	});

	test('reads Windows separators as unix ones', () => {
		const data = {cwd: String.raw`C:\Users\dev\proj\sub`, workspace: {project_dir: String.raw`C:\Users\dev\proj`}};

		expect(resolveLocation(data, 'full')).toStrictEqual({path: '$/sub', tag: ''});
	});
});

describe('readGitBranch', () => {
	async function repository(head: string): Promise<string> {
		const repo = await tempDir();
		await mkdir(path.join(repo, '.git'));
		await writeFile(path.join(repo, '.git', 'HEAD'), `${head}\n`);
		return repo;
	}

	test('reads the branch from a subdirectory of the repository', async () => {
		const repo = await repository('ref: refs/heads/feature/x');
		await mkdir(path.join(repo, 'src', 'ui'), {recursive: true});

		expect(readGitBranch(path.join(repo, 'src', 'ui'))).toBe('feature/x');
	});

	test('shows a detached HEAD as a short hash', async () => {
		expect(readGitBranch(await repository('0123456789abcdef0123456789abcdef01234567'))).toBe('0123456');
	});

	test('follows a linked worktree to its own HEAD', async () => {
		const repo = await repository('ref: refs/heads/main');
		await mkdir(path.join(repo, '.git', 'worktrees', 'wt'), {recursive: true});
		await writeFile(path.join(repo, '.git', 'worktrees', 'wt', 'HEAD'), 'ref: refs/heads/wt-branch\n');
		const worktree = await tempDir();
		await writeFile(path.join(worktree, '.git'), `gitdir: ${repo}/.git/worktrees/wt\n`);

		expect(readGitBranch(worktree)).toBe('wt-branch');
	});

	test('reads no branch from a .git file without a gitdir pointer', async () => {
		const dir = await tempDir();
		await writeFile(path.join(dir, '.git'), 'nonsense\n');

		expect(readGitBranch(dir)).toBeNull();
	});

	test('reads no branch outside a repository', () => {
		expect(readGitBranch('/nonexistent/dir')).toBeNull();
	});
});

describe('urgency', () => {
	test.each([
		[60, 245],
		[59.9, 251],
		[40, 228],
		[30, 220],
		[20, 208],
		[10, 196],
		[9.9, 197],
	])('colors %d%% left with color %i', (percent, code) => {
		expect(colorByUrgency(percent, 'x')).toBe(`\u001B[38;5;${code}mx\u001B[0m`);
	});

	test('shows the context left, rounded, or a placeholder before the payload reports it', () => {
		expect(plain(formatContextRemaining(session))).toBe('ctx left 43%');
		expect(plain(formatContextRemaining({}))).toBe('ctx left --%');
	});
});

describe('projectExhaustion', () => {
	const window = (used: number, resetsIn: number): {used_percentage: number; resets_at: number} => ({
		used_percentage: used,
		resets_at: nowSeconds + resetsIn,
	});

	test('runs out now when the window is used up', () => {
		expect(projectExhaustion(window(100, HOUR), 5 * HOUR, nowSeconds)).toBe(nowSeconds);
	});

	test.each([
		['nothing is used', window(0, HOUR)],
		['the reset time is missing', {used_percentage: 50}],
	])('never runs out when %s', (_name, limitWindow) => {
		expect(projectExhaustion(limitWindow, 5 * HOUR, nowSeconds)).toBe(Infinity);
	});

	test('extends the pace so far: 25% in the first half-hour runs out 90 minutes later', () => {
		expect(projectExhaustion(window(25, 4.5 * HOUR), 5 * HOUR, nowSeconds)).toBe(nowSeconds + 1.5 * HOUR);
	});
});

describe('formatRateLimit', () => {
	const rateLimit = (data: SessionData, reset: boolean): string => plain(formatRateLimit(data, {reset}) ?? '');
	const limits = (rateLimits: SessionData['rate_limits']): SessionData => ({rate_limits: rateLimits});

	test('reports nothing without a window', () => {
		fixClock();

		expect(formatRateLimit({}, {reset: true})).toBeNull();
	});

	test('picks the window that stops the session first', () => {
		fixClock();
		const data = limits({
			five_hour: {used_percentage: 90, resets_at: nowSeconds + 4 * HOUR},
			seven_day: {used_percentage: 20, resets_at: nowSeconds + 3 * 24 * HOUR},
		});

		expect(rateLimit(data, true)).toBe('5h left 10% til 16:00');
	});

	test('picks the window with less left when none stops the session', () => {
		fixClock();
		const data = limits({
			five_hour: {used_percentage: 10, resets_at: nowSeconds + 4 * HOUR},
			seven_day: {used_percentage: 60, resets_at: nowSeconds + 2 * 24 * HOUR},
		});

		expect(rateLimit(data, true)).toBe('7d left 40% til Fri 12:00');
	});

	test('drops the reset time when the level leaves it out', () => {
		fixClock();
		const data = limits({five_hour: {used_percentage: 10, resets_at: nowSeconds + HOUR}});

		expect(rateLimit(data, false)).toBe('5h left 90%');
	});
});

describe('formatStyleModel', () => {
	test.each([
		['style, model and effort', {style: true, effort: true}, 'AI Engineer (Opus 5.5 · high)'],
		['no effort when the level drops it', {style: true, effort: false}, 'AI Engineer (Opus 5.5)'],
		['the model alone when the level drops the style', {style: false, effort: true}, 'Opus 5.5 · high'],
	])('shows %s', (_name, level, shown) => {
		expect(plain(formatStyleModel(session, level))).toBe(shown);
	});

	test('falls back to the default style and an unknown model', () => {
		expect(plain(formatStyleModel({effort: {level: ''}}, {style: true, effort: true}))).toBe('default (unknown)');
	});
});

describe('rows', () => {
	const widest = (rows: readonly string[]): number => Math.max(...rows.map((row) => visibleWidth(row)));

	test('joins row 1 with a separator when the width is unknown', () => {
		fixClock();

		expect(plain(formatRow1(session, null))).toBe(
			'AI Engineer (Opus 5.5 · high) | $12.35 | ctx left 43% · 5h left 37% til 13:00',
		);
	});

	test.each([120, 90, 70, 55, 45])('fits row 1 into %i columns by dropping parts', (width) => {
		fixClock();

		expect(widest([formatRow1(session, width)])).toBeLessThanOrEqual(width);
	});

	test('drops the effort before the style, and the reset time before the cost', () => {
		fixClock();
		const row = (width: number): string => plain(formatRow1(session, width));

		expect(row(75)).toMatch(/^AI Engineer \(Opus 5\.5\) \| \$12\.35 +ctx left 43% · 5h left 37% til 13:00$/);
		expect(row(50)).toMatch(/^Opus 5\.5 \| \$12\.35 +ctx left 43% · 5h left 37%$/);
	});

	test.each([100, 60, 40, 25])('fits row 2 into %i columns', async (width) => {
		const repo = path.join(await tempDir(), 'a-fairly-long-repository-name');
		await mkdir(path.join(repo, '.git'), {recursive: true});
		await writeFile(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/feature/a-really-long-branch-name\n');
		const data = {...session, cwd: repo, workspace: {current_dir: repo, project_dir: repo}};

		expect(widest([formatRow2(data, width)])).toBeLessThanOrEqual(width);
	});
});
