import {exec} from './exec.ts';
import type {ExecResult} from './exec.ts';
import {isErrnoCode} from './repo.ts';

/** Runs the `claude` CLI in `root` to completion; rejects with an install hint when `claude` is not on `PATH`. */
export async function claude(root: string, args: readonly string[]): Promise<ExecResult> {
	try {
		return await exec('claude', args, {cwd: root});
	} catch (error) {
		if (isErrnoCode(error, 'ENOENT')) {
			throw new Error('claude is not on PATH; install it with `npm install -g @anthropic-ai/claude-code`', {
				cause: error,
			});
		}
		throw error;
	}
}
