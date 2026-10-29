import {expect, test} from 'vite-plus/test';
import {exec} from './exec.ts';

test('exec settles with the exit code when the command exits before reading its input', async () => {
	const result = await exec(process.execPath, ['-e', 'process.exit(3)'], {input: 'x'.repeat(1024 * 1024)});

	expect(result.code).toBe(3);
});
