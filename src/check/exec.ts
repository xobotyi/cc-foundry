import {spawn} from 'node:child_process';
import {text} from 'node:stream/consumers';

export type ExecResult = {
	/** The exit code, or null when a signal ended the process. */
	readonly code: number | null;
	readonly stdout: string;
	readonly stderr: string;
};

export type ExecOptions = {
	readonly cwd?: string;
	/** Written to the process's stdin, which is then closed. */
	readonly input?: string;
};

/** Runs a command to completion and collects its output; rejects only when the command cannot start. */
export async function exec(command: string, args: readonly string[], options: ExecOptions = {}): Promise<ExecResult> {
	const child = spawn(command, args, {cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe']});
	child.stdin.end(options.input ?? '');
	const exited = new Promise<number | null>((resolve, reject) => {
		child.once('error', reject);
		child.once('close', resolve);
	});
	const [stdout, stderr, code] = await Promise.all([text(child.stdout), text(child.stderr), exited]);
	return {code, stdout, stderr};
}
