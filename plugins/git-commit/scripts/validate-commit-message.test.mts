import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {describe, expect, test} from 'vite-plus/test';
import {
	HELP_TEXT,
	UsageError,
	messageSource,
	requiredTrailers,
	validate,
	wantsHelp,
	type Finding,
} from './validate-commit-message.mts';

const SCRIPT = path.join(import.meta.dirname, 'validate-commit-message.mts');
const SUBJECT = '[parser] handle empty input';
const BODY = 'Empty input dereferenced nil.';
const VALID = `${SUBJECT}\n\n${BODY}`;
const NO_BODY: Finding = {
	level: 'WARN',
	message: 'Commit message has no body. A subject-only message is rarely acceptable.',
};

const withSubject = (subject: string): string => `${subject}\n\n${BODY}`;

describe('validate', () => {
	test('accepts a subject, a blank line, and a body', () => {
		expect(validate(VALID, [])).toStrictEqual([]);
	});

	test('accepts CRLF line endings and indented lines', () => {
		expect(validate(`  ${SUBJECT}\r\n\r\n${BODY}\r\n`, [])).toStrictEqual([]);
	});

	test.each(['', ' \n\t\n'])('rejects the empty message %j', (message) => {
		expect(validate(message, ['Task'])).toStrictEqual([{level: 'ERROR', message: 'Commit message is empty.'}]);
	});

	const SHORT = 'Subject line is very short (less than 10 characters). Consider making it more descriptive.';
	const LONG = 'Subject line exceeds 72 characters. Consider tightening — soft target is 50.';
	const THIS_COMMIT = 'Subject filler tic: "this commit" / "this change" — the diff already says what.';
	const FIRST_PERSON = 'Subject filler tic: first-person ("I", "we") — the commit speaks for itself.';

	test.each([
		['a 9-character subject', 'x'.repeat(9), SHORT],
		['a 73-character subject', 'x'.repeat(73), LONG],
		['"this commit"', '[x] this commit adds a parser', THIS_COMMIT],
		['"we"', '[x] we add a parser', FIRST_PERSON],
		['"I"', '[x] I add a parser', FIRST_PERSON],
	])('warns on %s', (_name, subject, message) => {
		expect(validate(withSubject(subject), [])).toStrictEqual([{level: 'WARN', message}]);
	});

	test.each([
		['a 10-character subject', 'x'.repeat(10)],
		['a 72-character subject', 'x'.repeat(72)],
		['"I/O"', '[io] retry I/O errors'],
	])('does not warn on %s', (_name, subject) => {
		expect(validate(withSubject(subject), [])).toStrictEqual([]);
	});

	test('rejects a subject that ends with a period', () => {
		expect(validate(withSubject(`${SUBJECT}.`), [])).toStrictEqual([
			{level: 'ERROR', message: 'Subject line should not end with a period.'},
		]);
	});

	test.each([
		['a subject alone', SUBJECT],
		['a subject and blank lines', `${SUBJECT}\n\n\n`],
		['a subject and trailers', `${SUBJECT}\n\nTask: PROJ-1\nRefs: #2`],
	])('warns that %s has no body', (_name, message) => {
		expect(validate(message, [])).toStrictEqual([NO_BODY]);
	});

	test('rejects a body on the line after the subject, which leaves the message bodyless', () => {
		expect(validate(`${SUBJECT}\n${BODY}`, [])).toStrictEqual([
			NO_BODY,
			{level: 'ERROR', message: 'Subject must be separated from body by a blank line.'},
		]);
	});

	test('finds required trailers in the closing block', () => {
		expect(validate(`${VALID}\n\nTask: PROJ-1\nFixes: #2\n\n`, ['Task', 'Fixes'])).toStrictEqual([]);
	});

	test('reports each missing trailer in the order the flag lists them', () => {
		expect(validate(`${VALID}\n\nRefs: #1`, ['Task', 'Refs', 'Fixes'])).toStrictEqual([
			{level: 'ERROR', message: 'Required trailer missing: Task'},
			{level: 'ERROR', message: 'Required trailer missing: Fixes'},
		]);
	});

	test('does not take a key-value line inside the body for a trailer', () => {
		expect(validate(`${SUBJECT}\n\nTask: in the body\n${BODY}\n\nFixes: #1`, ['Task'])).toStrictEqual([
			{level: 'ERROR', message: 'Required trailer missing: Task'},
		]);
	});

	test('reports subject, body, separator, and trailer findings in that order', () => {
		expect(validate('short.\nbody', ['Task']).map(({message}) => message.slice(0, 24))).toStrictEqual([
			'Subject line is very sho',
			'Subject line should not ',
			'Commit message has no bo',
			'Subject must be separate',
			'Required trailer missing',
		]);
	});
});

describe('messageSource', () => {
	test('reads stdin when no flag names a source', () => {
		expect(messageSource(['--require-trailers', 'Task'])).toStrictEqual({kind: 'stdin'});
	});

	test('takes the last --file or --msg', () => {
		expect(messageSource(['--file', 'a.txt', '--file', 'b.txt'])).toStrictEqual({kind: 'file', path: 'b.txt'});
		expect(messageSource(['--msg', 'one', '--msg', 'two'])).toStrictEqual({kind: 'msg', text: 'two'});
	});

	test('treats an empty value as no source', () => {
		expect(messageSource(['--msg', ''])).toStrictEqual({kind: 'stdin'});
	});

	test.each([
		[['--file', 'a.txt', '--msg', 'x'], 'Only one of --file or --msg may be used at a time.'],
		[['--file'], '--file requires a path argument'],
		[['--msg'], '--msg requires a message argument'],
	])('rejects %j', (args, message) => {
		expect(() => messageSource(args)).toThrow(new UsageError(message));
	});
});

describe('requiredTrailers', () => {
	test('reads the first list, trimmed, with empty names dropped', () => {
		expect(requiredTrailers(['--require-trailers', ' Task, ,Fixes ', '--require-trailers', 'Refs'])).toStrictEqual([
			'Task',
			'Fixes',
		]);
	});

	test('requires nothing without the flag', () => {
		expect(requiredTrailers(['--msg', 'x'])).toStrictEqual([]);
	});

	test('rejects the flag without a list', () => {
		expect(() => requiredTrailers(['--require-trailers'])).toThrow(
			new UsageError('--require-trailers requires a comma-separated list'),
		);
	});
});

test.each([['--help'], ['--msg', 'x', '-h']])('%j asks for help', (...args) => {
	expect(wantsHelp(args)).toBe(true);
});

describe('command line', () => {
	const run = (args: readonly string[], input = ''): {status: number | null; stdout: string; stderr: string} => {
		const {status, stdout, stderr} = spawnSync(process.execPath, [SCRIPT, ...args], {input, encoding: 'utf8'});
		return {status, stdout, stderr};
	};

	test('prints the findings and exits 0, because the validator prescribes and does not block', () => {
		expect(run(['--msg', `${SUBJECT}.`])).toStrictEqual({
			status: 0,
			stdout:
				'ERROR: Subject line should not end with a period.\nWARN: Commit message has no body. A subject-only message is rarely acceptable.\n',
			stderr: '',
		});
	});

	test('confirms a clean message read from stdin', () => {
		expect(run([], VALID)).toStrictEqual({status: 0, stdout: 'OK: Commit message is valid.\n', stderr: ''});
	});

	test('exits 1 on an empty message', () => {
		expect(run(['--msg', '   '])).toStrictEqual({status: 1, stdout: 'ERROR: Commit message is empty.\n', stderr: ''});
	});

	test.each([
		[['--file', '/nonexistent/msg.txt'], 'ERROR: Cannot read file: /nonexistent/msg.txt\n'],
		[[], 'ERROR: No commit message provided. Use --file, --msg, or stdin.\n'],
	])('exits 1 when %j yields no message', (args, stderr) => {
		expect(run(args)).toStrictEqual({status: 1, stdout: '', stderr});
	});

	test('prints the usage text for --help', () => {
		expect(run(['--help'])).toStrictEqual({status: 0, stdout: `${HELP_TEXT}\n`, stderr: ''});
	});
});
