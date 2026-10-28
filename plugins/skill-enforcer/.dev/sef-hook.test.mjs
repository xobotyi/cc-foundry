import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {expect, test} from 'vite-plus/test';

const HOOK = path.join(import.meta.dirname, '..', 'hooks', 'sef-hook.js');

test('pre-compact writes its instructions as plain text, the only output Claude Code reads for PreCompact', () => {
	const stdout = execFileSync(process.execPath, [HOOK, 'pre-compact'], {encoding: 'utf8'});

	expect(stdout).toMatch(/^<sef-compaction>\n/);
});
