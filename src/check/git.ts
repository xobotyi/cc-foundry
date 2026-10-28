import {exec} from './exec.ts';

/** Runs git in `root` and resolves with its stdout; rejects when git exits non-zero. */
export async function git(root: string, args: readonly string[]): Promise<string> {
	const result = await exec('git', ['-C', root, ...args]);
	if (result.code !== 0) {
		throw new Error(`git ${args.join(' ')} exited with ${String(result.code)}: ${result.stderr.trim()}`);
	}
	return result.stdout;
}
