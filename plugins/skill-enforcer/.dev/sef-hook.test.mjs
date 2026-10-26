import { execFile } from 'node:child_process';
import path from 'node:path';
import { expect, test } from "vite-plus/test";
import { promisify } from 'node:util';

const run = promisify(execFile);
const HOOK = path.join(import.meta.dirname, '..', 'hooks', 'sef-hook.js');

test('pre-compact writes its instructions as plain text, the only output Claude Code reads for PreCompact', async () => {
    const { stdout } = await run(process.execPath, [HOOK, 'pre-compact']);

    expect(stdout).toMatch(/^<sef-compaction>\n/);
});
