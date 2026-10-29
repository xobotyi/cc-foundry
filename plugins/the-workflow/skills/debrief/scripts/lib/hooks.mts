import {spawn} from 'node:child_process';
import {exists} from './files.mts';
import {isObject, type Json, parseJson, stringOf} from './json.mts';

const PARALLEL = 4;
const GROUPS = process.platform !== 'win32';
const CATCHES = new Set<HookDecision>(['deny', 'ask', 'stop']);
const PASSES = new Set<HookDecision>(['allow', 'pass']);

/** A recorded tool call as a PreToolUse hook receives it. */
export type HookCall = {
	readonly id: string;
	readonly session: string | undefined;
	readonly cwd: string | undefined;
	readonly project: string | null;
	readonly transcript: string | undefined;
	readonly tool: string;
	readonly input: Json | undefined;
};

/**
 * What a PreToolUse hook decided: a `permissionDecision` it returned, `stop` for `continue: false`, `pass` when it let
 * the call through to the permission rules, and `error` when it failed, which also lets the call through.
 */
export type HookDecision = 'allow' | 'deny' | 'ask' | 'defer' | 'stop' | 'pass' | 'error';

/** A hook's decision on one call, with the reason it gave. */
export type HookVerdict = {
	readonly decision: HookDecision;
	readonly reason: string;
};

/** How one hook run ended. */
export type HookRun = {
	readonly code: number | null;
	readonly stdout: string;
	readonly stderr: string;
	readonly timedOut: boolean;
};

/** A hook's verdict on one call, and whether it is the one expected. */
export type CheckResult = HookVerdict & {
	readonly id: string;
	readonly tool: string;
	/** `catch` for a call named as violating, `pass` for any other call, none when no call is named. */
	readonly expected: 'catch' | 'pass' | undefined;
	readonly ok: boolean;
};

/** Reads one line of a `--calls` dump as a call, or returns undefined for a line that is not one. */
export function hookCallOf(value: Json): HookCall | undefined {
	if (!isObject(value) || typeof value.id !== 'string' || typeof value.tool !== 'string') {
		return undefined;
	}

	return {
		id: value.id,
		session: stringOf(value.session),
		cwd: stringOf(value.cwd),
		project: stringOf(value.project) ?? null,
		transcript: stringOf(value.transcript),
		tool: value.tool,
		input: value.input,
	};
}

/** Builds the PreToolUse input a hook reads on stdin for a recorded call. */
export function hookPayload(call: HookCall, cwd: string): Json {
	return {
		session_id: call.session ?? '',
		transcript_path: call.transcript ?? '',
		cwd,
		permission_mode: 'default',
		hook_event_name: 'PreToolUse',
		tool_name: call.tool,
		tool_input: call.input ?? {},
		tool_use_id: call.id,
	};
}

function firstLine(text: string): string {
	return (
		text
			.split('\n')
			.find((line) => line.trim() !== '')
			?.trim() ?? ''
	);
}

function jsonVerdict(output: Json): HookVerdict {
	const fields = isObject(output) ? output : {};
	if (fields.continue === false) {
		return {decision: 'stop', reason: stringOf(fields.stopReason) ?? ''};
	}

	const specific = isObject(fields.hookSpecificOutput) ? fields.hookSpecificOutput : {};
	const decision = stringOf(specific.permissionDecision);
	if (decision === 'allow' || decision === 'deny' || decision === 'ask' || decision === 'defer') {
		return {decision, reason: stringOf(specific.permissionDecisionReason) ?? ''};
	}

	const legacy = stringOf(fields.decision);
	if (legacy === 'block' || legacy === 'approve') {
		return {decision: legacy === 'block' ? 'deny' : 'allow', reason: stringOf(fields.reason) ?? ''};
	}

	return {decision: 'pass', reason: ''};
}

/**
 * Reads a PreToolUse hook run the way Claude Code does: exit 2 denies with stderr as the reason; a JSON object on stdout
 * decides on any other exit code; plain output passes on exit 0; anything else, a timeout included, is an error.
 */
export function verdictOf(run: HookRun): HookVerdict {
	if (run.timedOut) {
		return {decision: 'error', reason: 'timed out'};
	}

	if (run.code === 2) {
		return {decision: 'deny', reason: firstLine(run.stderr)};
	}

	const stdout = run.stdout.trim();
	if (stdout.startsWith('{')) {
		try {
			return jsonVerdict(parseJson(stdout));
		} catch {
			return {decision: 'error', reason: `invalid JSON: ${firstLine(stdout)}`};
		}
	}

	return run.code === 0 ? {decision: 'pass', reason: ''} : {decision: 'error', reason: firstLine(run.stderr)};
}

/**
 * Runs a hook command through the shell in `cwd`, with `payload` on stdin and `CLAUDE_PROJECT_DIR` set to `projectDir`;
 * after `timeoutMs` it kills the hook and returns the run as timed out, and outside Windows the kill takes every command
 * the hook started.
 */
export async function runHook(
	command: string,
	payload: Json,
	{cwd, projectDir, timeoutMs}: {readonly cwd: string; readonly projectDir: string; readonly timeoutMs: number},
): Promise<HookRun> {
	const {promise, resolve, reject} = Promise.withResolvers<HookRun>();
	const env = {...process.env, CLAUDE_PROJECT_DIR: projectDir};
	const child = spawn(command, {shell: true, cwd, env, detached: GROUPS, stdio: ['pipe', 'pipe', 'pipe']});
	let stdout = '';
	let stderr = '';
	const timer = setTimeout(() => {
		// constraint: a command the shell started can hold the hook's pipes open after the shell dies, so a timed-out run
		// ends here and not at the close of its pipes
		child.stdout.destroy();
		child.stderr.destroy();
		resolve({code: null, stdout, stderr, timedOut: true});
		if (!GROUPS || child.pid === undefined) {
			child.kill('SIGKILL');
			return;
		}

		try {
			process.kill(-child.pid, 'SIGKILL');
		} catch (error) {
			// constraint: the group can end between its last exit and the close of the run
			if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) {
				throw error;
			}
		}
	}, timeoutMs);
	child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
		stdout += chunk;
	});
	child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
		stderr += chunk;
	});
	child.on('error', (error) => {
		clearTimeout(timer);
		reject(error);
	});
	child.on('close', (code) => {
		clearTimeout(timer);
		resolve({code, stdout, stderr, timedOut: false});
	});
	// constraint: a hook may exit without reading stdin, and the write then fails with EPIPE
	child.stdin.on('error', () => undefined);
	child.stdin.end(JSON.stringify(payload));
	return promise;
}

async function checkOne(command: string, call: HookCall, timeoutMs: number): Promise<HookVerdict> {
	const cwd = call.cwd !== undefined && (await exists(call.cwd)) ? call.cwd : process.cwd();
	try {
		return verdictOf(await runHook(command, hookPayload(call, cwd), {cwd, projectDir: call.project ?? cwd, timeoutMs}));
	} catch (error) {
		return {decision: 'error', reason: error instanceof Error ? error.message : String(error)};
	}
}

/**
 * Runs a hook command on every call and reads its verdicts. With `violating` named, a violating call must be caught —
 * denied, asked, or stopped — and every other call must pass; without it, a verdict is wrong only when the hook failed.
 * The hook decides each call from that call alone: calls run four at a time, in no fixed order.
 */
export async function checkCalls(
	command: string,
	calls: readonly HookCall[],
	{violating, timeoutMs}: {readonly violating: ReadonlySet<string> | undefined; readonly timeoutMs: number},
): Promise<CheckResult[]> {
	const verdicts: HookVerdict[] = [];
	let next = 0;
	await Promise.all(
		Array.from({length: PARALLEL}, async () => {
			for (let i = next++; i < calls.length; i = next++) {
				const call = calls[i];
				if (call !== undefined) {
					// oxlint-disable-next-line no-await-in-loop -- each worker runs one hook at a time, so at most PARALLEL run
					verdicts[i] = await checkOne(command, call, timeoutMs);
				}
			}
		}),
	);

	return calls.map((call, i) => {
		const verdict = verdicts[i] ?? {decision: 'error', reason: 'not run'};
		let expected: CheckResult['expected'];
		if (violating !== undefined) {
			expected = violating.has(call.id) ? 'catch' : 'pass';
		}

		const allowed = expected === 'catch' ? CATCHES : PASSES;
		const ok = expected === undefined ? verdict.decision !== 'error' : allowed.has(verdict.decision);
		return {id: call.id, tool: call.tool, ...verdict, expected, ok};
	});
}
