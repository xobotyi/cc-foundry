import {expect, onTestFinished, test, vi} from 'vite-plus/test';
import {exec} from './exec.ts';

test('exec settles with the exit code when the command exits before reading its input', async () => {
	const result = await exec(process.execPath, ['-e', 'process.exit(3)'], {input: 'x'.repeat(1024 * 1024)});

	expect(result.code).toBe(3);
});

test('exec sets env variables on top of the inherited environment', async () => {
	vi.stubEnv('EXEC_TEST_VALUE', 'inherited');
	onTestFinished(() => {
		vi.unstubAllEnvs();
	});
	const script = 'process.stdout.write(`${process.env.EXEC_TEST_VALUE} ${process.env.PATH === undefined}`)';
	const result = await exec(process.execPath, ['-e', script], {env: {EXEC_TEST_VALUE: 'set'}});

	expect(result.stdout).toBe('set false');
});
