import {describe, expect, test} from 'vite-plus/test';
import {callsOf} from './check-hook.mts';

describe('callsOf', () => {
	test('reads each line of a calls dump, blank lines skipped', () => {
		const text = [
			JSON.stringify({id: 'a', tool: 'Bash', input: {command: 'git push'}, outcome: 'ok'}),
			'',
			JSON.stringify({id: 'b', tool: 'Edit', input: {file_path: '/a'}, outcome: 'error'}),
		].join('\n');

		expect(callsOf(text).map(({id, tool}) => [id, tool])).toStrictEqual([
			['a', 'Bash'],
			['b', 'Edit'],
		]);
	});

	test('names the line that is not a recorded call, blank lines counted', () => {
		expect(() => callsOf(`${JSON.stringify({id: 'a', tool: 'Bash'})}\n\n{"id":"b"}`)).toThrow(
			'line 3: expected a recorded call with an id and a tool',
		);
	});
});
