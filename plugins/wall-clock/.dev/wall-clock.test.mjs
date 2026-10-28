import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {expect, test} from 'vite-plus/test';

const HOOK = path.join(import.meta.dirname, '..', 'hooks', 'wall-clock.js');

test('PreCompact writes its instruction as plain text, the only output Claude Code reads for that event', () => {
	const payload = {hook_event_name: 'PreCompact', transcript_path: '/nonexistent', trigger: 'manual'};
	const stdout = execFileSync(process.execPath, [HOOK], {input: JSON.stringify(payload), encoding: 'utf8'});

	expect(stdout).toMatch(/^When compacting, drop every <wall-clock/);
});
