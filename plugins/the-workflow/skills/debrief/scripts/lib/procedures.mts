import {isObject, stringOf} from './json.mts';
import {LoadedSkills} from './skills.mts';
import {isSdk, readEntries, type ToolUse} from './transcript.mts';

const MIN_LENGTH = 3;
const MAX_LENGTH = 5;
const SKILL_RATE = 0.5;
const SKILL_LIMIT = 3;
const NON_STEPS = new Set([
	'Read',
	'Edit',
	'MultiEdit',
	'Write',
	'NotebookEdit',
	'Grep',
	'Glob',
	'LS',
	'LSP',
	'TodoWrite',
	'ToolSearch',
	'Monitor',
	'TaskOutput',
	'TaskStop',
	'TaskUpdate',
	'TaskCreate',
	'TaskList',
	'TaskGet',
	'SendMessage',
	'Agent',
	'Task',
	'WebSearch',
	'WebFetch',
]);
const SUBCOMMAND_TOOLS = new Set([
	'git',
	'gh',
	'glab',
	'vp',
	'yarn',
	'npm',
	'pnpm',
	'npx',
	'go',
	'cargo',
	'docker',
	'kubectl',
	'helm',
	'make',
	'claude',
	'terraform',
]);
const VALUE_OPTIONS = new Set([
	'-C',
	'-c',
	'-f',
	'-R',
	'-n',
	'--repo',
	'--prefix',
	'--cwd',
	'--namespace',
	'--context',
]);
const SCRIPT_RUNNERS = new Set(['node', 'python3', 'python', 'sh', 'bash', 'zsh', 'bun', 'deno']);
const SHELL_PLUMBING = new Set([
	'awk',
	'cat',
	'command',
	'cp',
	'cut',
	'date',
	'diff',
	'echo',
	'export',
	'fd',
	'find',
	'for',
	'grep',
	'head',
	'if',
	'jq',
	'ls',
	'mkdir',
	'mv',
	'printf',
	'pwd',
	'rg',
	'rm',
	'sed',
	'sleep',
	'sort',
	'source',
	'stat',
	'tail',
	'test',
	'touch',
	'tr',
	'true',
	'type',
	'uniq',
	'until',
	'wc',
	'which',
	'while',
	'xargs',
]);

/** The tool calls of one session as procedure steps, each with the skills loaded when it ran. */
export type SessionSteps = {
	readonly session: string;
	readonly project: string | null;
	readonly at: string | undefined;
	readonly steps: readonly string[];
	readonly skills: ReadonlyArray<readonly string[]>;
	/** Every skill the session loaded. */
	readonly loaded: readonly string[];
};

/** A run of tool calls the agent repeats across sessions. */
export type Procedure = {
	readonly id: string;
	readonly projects: ReadonlyArray<string | null>;
	readonly at: string | undefined;
	readonly signal: 'procedure';
	/** The run's steps joined by ` > `. */
	readonly text: string;
	readonly sessions: number;
	/**
	 * Up to three skills loaded during the runs in at least half of their sessions, those loaded most above their rate
	 * across all sessions first.
	 */
	readonly skills: readonly string[];
};

type Run = {
	readonly key: string;
	readonly steps: readonly string[];
	readonly skillsBySession: ReadonlyMap<string, readonly string[]>;
	readonly projects: ReadonlySet<string | null>;
	readonly at: string | undefined;
};

function commandStep(command: string): string | undefined {
	const words = command
		.trim()
		.replace(/^(?:cd [^&;|]+(?:&&|;)\s*)+/, '')
		.replace(/^(?:[A-Z_][A-Z0-9_]*=\S+\s+)+/, '')
		.split(/\s+/);
	const name = words[0]?.split('/').at(-1) ?? '';
	if (name === '' || SHELL_PLUMBING.has(name)) {
		return undefined;
	}

	const operand =
		words.slice(1).find((word, i, all) => !word.startsWith('-') && !VALUE_OPTIONS.has(all[i - 1] ?? '')) ?? '';
	if (SUBCOMMAND_TOOLS.has(name)) {
		return /^[a-z][a-z-]*$/.test(operand) ? `${name} ${operand}` : name;
	}

	if (SCRIPT_RUNNERS.has(name)) {
		const script = operand.split('/').at(-1) ?? '';
		return /^[\w.-]+$/.test(script) ? `${name} ${script}` : undefined;
	}

	return name;
}

/** Reduces a tool call to a procedure step, or returns undefined for a lookup, a file edit, or shell plumbing. */
export function callStep(call: ToolUse): string | undefined {
	if (NON_STEPS.has(call.name)) {
		return undefined;
	}

	const input = isObject(call.input) ? call.input : {};
	if (call.name === 'Skill') {
		const skill = stringOf(input.skill);
		return skill === undefined ? undefined : `Skill ${skill}`;
	}

	return call.name === 'Bash' ? commandStep(stringOf(input.command) ?? '') : call.name;
}

/**
 * Reads the main-thread tool calls of one session since `since` as steps, a repeated step collapsed into one. An entry
 * whose uuid is in `seen` is history a resumed session copied, and gives no step; every other uuid is added to it.
 */
export async function sessionSteps(
	file: string,
	since: number,
	project: string | null,
	seen: Set<string>,
): Promise<SessionSteps | undefined> {
	const steps: string[] = [];
	const skills: Array<readonly string[]> = [];
	const loaded = new LoadedSkills();
	let session: string | undefined;
	let at: string | undefined;

	for await (const entry of readEntries(file)) {
		if (isSdk(entry)) {
			return undefined;
		}

		if (entry.isSidechain) {
			continue;
		}

		loaded.observe(entry);
		const copied = entry.uuid !== undefined && seen.has(entry.uuid);
		if (entry.uuid !== undefined) {
			seen.add(entry.uuid);
		}

		if (copied || entry.kind !== 'assistant' || !(Date.parse(entry.timestamp ?? '') >= since)) {
			continue;
		}

		session ??= entry.sessionId;
		for (const block of entry.blocks) {
			const step = block.type === 'tool_use' ? callStep(block) : undefined;
			if (step !== undefined && steps.at(-1) !== step) {
				steps.push(step);
				skills.push(loaded.list());
				at = entry.timestamp;
			}
		}
	}

	return session === undefined ? undefined : {session, project, at, steps, skills, loaded: loaded.list()};
}

function collectRuns(sessions: readonly SessionSteps[]): Run[] {
	const runs = new Map<
		string,
		{
			key: string;
			steps: readonly string[];
			skillsBySession: Map<string, readonly string[]>;
			projects: Set<string | null>;
			at: string | undefined;
		}
	>();
	for (const {session, project, at, steps, skills} of sessions) {
		for (let length = MIN_LENGTH; length <= MAX_LENGTH; length++) {
			for (let start = 0; start + length <= steps.length; start++) {
				const slice = steps.slice(start, start + length);
				const key = slice.join(' > ');
				const run = runs.get(key) ?? {
					key,
					steps: slice,
					skillsBySession: new Map<string, readonly string[]>(),
					projects: new Set<string | null>(),
					at,
				};
				const known = run.skillsBySession.get(session) ?? [];
				run.skillsBySession.set(session, [...new Set([...known, ...(skills[start + length - 1] ?? [])])]);
				run.projects.add(project);
				run.at = at !== undefined && (run.at === undefined || at > run.at) ? at : run.at;
				runs.set(key, run);
			}
		}
	}
	return [...runs.values()];
}

function procedure(run: Run, baseRates: ReadonlyMap<string, number>): Procedure {
	const sessions = run.skillsBySession.size;
	const counts = new Map<string, number>();
	for (const skills of run.skillsBySession.values()) {
		for (const skill of skills) {
			counts.set(skill, (counts.get(skill) ?? 0) + 1);
		}
	}

	const skills = [...counts]
		.map(([skill, count]) => ({skill, rate: count / sessions, lift: count / sessions / (baseRates.get(skill) ?? 1)}))
		.filter(({rate, lift}) => rate >= SKILL_RATE && lift > 1)
		.toSorted((a, b) => b.lift - a.lift)
		.slice(0, SKILL_LIMIT)
		.map(({skill}) => skill);

	return {
		id: `procedure:${run.key}`,
		projects: [...run.projects],
		at: run.at,
		signal: 'procedure',
		text: run.key,
		sessions,
		skills,
	};
}

/**
 * Finds the procedures the agent repeats: runs of 3 to 5 steps that occur in at least `minSessions` sessions. Taken
 * from the run in the most sessions down, a run is kept only when it has a step that no kept run has. Returns at most
 * `limit` runs.
 */
export function recurringProcedures(
	sessions: readonly SessionSteps[],
	minSessions: number,
	limit: number,
): Procedure[] {
	const loadedIn = new Map<string, number>();
	for (const {loaded} of sessions) {
		for (const skill of loaded) {
			loadedIn.set(skill, (loadedIn.get(skill) ?? 0) + 1);
		}
	}
	const baseRates = new Map([...loadedIn].map(([skill, count]) => [skill, count / sessions.length]));

	const byReach = collectRuns(sessions)
		.filter((run) => run.skillsBySession.size >= minSessions)
		.toSorted((a, b) => b.skillsBySession.size - a.skillsBySession.size || b.steps.length - a.steps.length);
	const kept: Procedure[] = [];
	const shown = new Set<string>();
	for (const run of byReach) {
		if (kept.length < limit && run.steps.some((step) => !shown.has(step))) {
			kept.push(procedure(run, baseRates));
			for (const step of run.steps) {
				shown.add(step);
			}
		}
	}
	return kept;
}
