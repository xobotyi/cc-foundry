import {describe, expect, test} from 'vite-plus/test';
import {contentText, parseEntry} from './transcript.mts';

const line = (entry: Readonly<Record<string, unknown>>): string => JSON.stringify(entry);

describe('parseEntry', () => {
	test.each(['not json', '[1, 2]', '"text"', 'null'])('skips a line that is not a JSON object: %s', (text) => {
		expect(parseEntry(text)).toBeUndefined();
	});

	test('reads a typed prompt with its origin and common fields', () => {
		const entry = parseEntry(
			line({
				type: 'user',
				uuid: 'u1',
				parentUuid: null,
				sessionId: 's1',
				timestamp: '2026-10-01T10:00:00Z',
				cwd: '/work',
				origin: {kind: 'human'},
				promptSource: 'typed',
				message: {role: 'user', content: 'fix it'},
			}),
		);

		expect(entry).toStrictEqual({
			kind: 'user',
			uuid: 'u1',
			parentUuid: undefined,
			sessionId: 's1',
			timestamp: '2026-10-01T10:00:00Z',
			cwd: '/work',
			entrypoint: undefined,
			isSidechain: false,
			text: 'fix it',
			results: [],
			isMeta: false,
			isCompactSummary: false,
			origin: {kind: 'human'},
			promptSource: 'typed',
		});
	});

	test('tells an absent origin from one without a kind', () => {
		const absent = parseEntry(line({type: 'user', message: {content: 'x'}}));
		const empty = parseEntry(line({type: 'user', origin: null, message: {content: 'x'}}));

		expect(absent).toMatchObject({kind: 'user', origin: undefined});
		expect(empty).toMatchObject({kind: 'user', origin: {kind: undefined}});
	});

	test('reads tool results and drops a result without a call id', () => {
		const entry = parseEntry(
			line({
				type: 'user',
				message: {
					content: [
						{type: 'tool_result', tool_use_id: 't1', is_error: true, content: [{type: 'text', text: 'boom'}]},
						{type: 'tool_result', content: 'orphan'},
						{type: 'text', text: 'note'},
					],
				},
			}),
		);

		expect(entry).toMatchObject({text: 'note', results: [{toolUseId: 't1', isError: true, text: 'boom'}]});
	});

	test('reads assistant text and tool calls in order and drops a malformed call', () => {
		const entry = parseEntry(
			line({
				type: 'assistant',
				message: {
					content: [
						{type: 'thinking', thinking: ''},
						{type: 'text', text: 'Running.'},
						{type: 'tool_use', id: 't1', name: 'Bash', input: {command: 'ls'}},
						{type: 'tool_use', name: 'Bash'},
					],
				},
			}),
		);

		expect(entry).toMatchObject({
			kind: 'assistant',
			blocks: [
				{type: 'text', text: 'Running.'},
				{type: 'tool_use', id: 't1', name: 'Bash', input: {command: 'ls'}},
			],
		});
	});

	test('reads the model and the request size of an assistant message', () => {
		const usage = {input_tokens: 3, cache_creation_input_tokens: 40, cache_read_input_tokens: 500, output_tokens: 9};
		const entry = parseEntry(line({type: 'assistant', message: {model: 'claude-opus-5-5', usage, content: []}}));

		expect(entry).toMatchObject({kind: 'assistant', model: 'claude-opus-5-5', context: 543});
	});

	test('reads no request size from an assistant message without usage', () => {
		expect(parseEntry(line({type: 'assistant', message: {content: []}}))).toMatchObject({
			model: undefined,
			context: undefined,
		});
	});

	test('reads a queued command, a null origin read as absent', () => {
		const entry = parseEntry(
			line({
				type: 'attachment',
				attachment: {
					type: 'queued_command',
					prompt: [{type: 'text', text: 'also lint'}],
					commandMode: 'prompt',
					origin: null,
				},
			}),
		);

		expect(entry).toMatchObject({
			kind: 'attachment',
			attachment: {kind: 'queued-command', prompt: 'also lint', commandMode: 'prompt', origin: undefined},
		});
	});

	test('reads the names of re-attached skills', () => {
		const entry = parseEntry(
			line({type: 'attachment', attachment: {type: 'invoked_skills', skills: [{name: 'a'}, {path: 'x'}, {name: 'b'}]}}),
		);

		expect(entry).toMatchObject({attachment: {kind: 'invoked-skills', skills: ['a', 'b']}});
	});

	test('reads the instruction files in context, a delta with its unloaded paths', () => {
		const full = parseEntry(
			line({
				type: 'attachment',
				attachment: {
					type: 'instructions',
					files: [{type: 'User', path: '/home/.claude/CLAUDE.md', content: 'Be terse.'}, {path: '/broken'}],
				},
			}),
		);
		const delta = parseEntry(
			line({
				type: 'attachment',
				attachment: {
					type: 'instructions',
					files: [{type: 'AutoMem', path: '/m/MEMORY.md', content: '- [x](x.md)'}],
					changed: true,
					reason: 'compaction',
					removed: ['/work/.claude/worktrees/a/CLAUDE.md'],
				},
			}),
		);

		expect(full).toMatchObject({
			attachment: {
				kind: 'instructions',
				files: [{type: 'User', path: '/home/.claude/CLAUDE.md', content: 'Be terse.'}],
				delta: false,
				removed: [],
			},
		});
		expect(delta).toMatchObject({
			attachment: {kind: 'instructions', delta: true, removed: ['/work/.claude/worktrees/a/CLAUDE.md']},
		});
	});

	test('reads a nested instruction file', () => {
		const entry = parseEntry(
			line({
				type: 'attachment',
				attachment: {
					type: 'nested_memory',
					path: '/work/.claude/rules/a.md',
					displayPath: '.claude/rules/a.md',
					content: {path: '/work/.claude/rules/a.md', type: 'Project', content: '# Rule'},
				},
			}),
		);

		expect(entry).toMatchObject({
			attachment: {kind: 'nested-memory', file: {type: 'Project', path: '/work/.claude/rules/a.md', content: '# Rule'}},
		});
	});

	test('reads a system entry with its subtype', () => {
		expect(parseEntry(line({type: 'system', subtype: 'compact_boundary', cwd: '/work'}))).toMatchObject({
			kind: 'system',
			subtype: 'compact_boundary',
			cwd: '/work',
		});
	});

	test('reads other attachments and entry types as unread', () => {
		expect(parseEntry(line({type: 'attachment', attachment: {type: 'edited_text_file'}}))).toMatchObject({
			kind: 'attachment',
			attachment: {kind: 'unread'},
		});
		expect(parseEntry(line({type: 'api-request', cwd: '/work'}))).toMatchObject({kind: 'unread', cwd: '/work'});
	});
});

describe('contentText', () => {
	test('joins the text blocks of a block list', () => {
		expect(contentText([{type: 'text', text: 'a'}, {type: 'image'}, {type: 'text', text: 'b'}])).toBe('a\nb');
	});

	test('reads a plain string and nothing from other values', () => {
		expect(contentText('plain')).toBe('plain');
		expect(contentText(undefined)).toBe('');
		expect(contentText({text: 'x'})).toBe('');
	});
});
