import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Runs git in `root` and resolves with its stdout; rejects when git exits non-zero. */
export async function git(root: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", root, ...args], { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}
