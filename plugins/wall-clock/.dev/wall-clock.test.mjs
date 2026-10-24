import { execFile } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';

const HOOK = path.join(import.meta.dirname, '..', 'hooks', 'wall-clock.js');

const runHook = (payload) =>
    new Promise((resolve, reject) => {
        const child = execFile(process.execPath, [HOOK], (err, stdout) => (err ? reject(err) : resolve(stdout)));

        child.stdin.end(JSON.stringify(payload));
    });

test('PreCompact writes its instruction as plain text, the only output Claude Code reads for that event', async (t) => {
    const stdout = await runHook({ hook_event_name: 'PreCompact', transcript_path: '/nonexistent', trigger: 'manual' });

    t.assert.match(stdout, /^When compacting, drop every <wall-clock/);
});
