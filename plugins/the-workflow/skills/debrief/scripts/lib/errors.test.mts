import {describe, expect, test} from 'vite-plus/test';
import {toolFailure} from './errors.mts';

describe('toolFailure', () => {
	test('groups a refused call by its first line, paths and numbers masked', () => {
		expect(
			toolFailure('Read', '<tool_use_error>File does not exist: /work/a.js line 12</tool_use_error>', true),
		).toStrictEqual({
			signature: 'Read: File does not exist: <path> line <n>',
			line: 'File does not exist: /work/a.js line 12',
		});
	});

	test('reads nothing from a failure with no text', () => {
		expect(toolFailure('Read', '<tool_use_error>\n</tool_use_error>', true)).toBeUndefined();
	});

	test('reads a command that ran and failed as ordinary work', () => {
		expect(toolFailure('Bash', 'Exit code 1\nFAIL src/a.test.ts', true)).toBeUndefined();
	});

	test.each([
		['zsh-nomatch', '(eval):1: no matches found: *.md'],
		['zsh-eq-expansion', '(eval):3: ====== not found'],
		['zsh-readonly', '(eval):1: read-only variable: status'],
		['zsh-badpattern', '(eval):2: bad pattern: [a'],
		['zsh-modifier', '(eval):1: unrecognized modifier `y'],
		['gnu-timeout', '(eval):1: command not found: timeout'],
		['missing-fd', '(eval):1: command not found: fd'],
		['bsd-cat', 'cat: illegal option -- A'],
		['bsd-sed', 'sed: 1: "s/a/b/I": invalid command code I'],
		['bsd-grep-P', 'grep: invalid option -- P'],
		['missing-pyyaml', "ModuleNotFoundError: No module named 'yaml'"],
		['ugrep-limit', String.raw`\___exceeds complexity limits`],
	])('groups a command that hit the %s shell trap under the trap', (name, line) => {
		expect(toolFailure('Bash', `Exit code 1\nsome output\n  ${line}\nmore`, true)).toStrictEqual({
			signature: `Bash: ${name}`,
			line,
		});
	});

	test('reads a shell trap in a command that exited 0, a later command having succeeded', () => {
		expect(toolFailure('Bash', 'a.md\n(eval):1: no matches found: *.txt\n', false)).toStrictEqual({
			signature: 'Bash: zsh-nomatch',
			line: '(eval):1: no matches found: *.txt',
		});
	});

	test('reads no trap from text that only quotes one, or from a tool other than Bash', () => {
		expect(toolFailure('Bash', "\t['zsh-nomatch', '(eval):1: no matches found: *.md'],", false)).toBeUndefined();
		expect(toolFailure('Read', '(eval):1: no matches found: *.md', false)).toBeUndefined();
	});
});
