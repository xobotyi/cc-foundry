import {describe, expect, test} from 'vite-plus/test';
import {similarity, tail, truncate} from './text.mts';

describe('truncate and tail', () => {
	test('keep the start or the end of a long text and mark the cut', () => {
		expect(truncate('abcdef', 4)).toBe('abcd…');
		expect(tail('abcdef', 4)).toBe('…cdef');
	});

	test('leave a text within the limit as it is', () => {
		expect(truncate('abc', 3)).toBe('abc');
		expect(tail('abc', 3)).toBe('abc');
	});
});

describe('similarity', () => {
	test.each([
		['identical texts, case and spacing aside', 'Fix the  loader', 'fix the loader', 1],
		['identical words, punctuation aside', 'load the config, then run it.', 'load the config then run it', 1],
		['one word changed in five', 'use the yarn package manager', 'use the pnpm package manager', 0.8],
		['one word added to four', 'run the test suite', 'run the full test suite', 8 / 9],
		['no word in common', 'alpha beta', 'gamma delta', 0],
		['two empty texts', '', '  ', 1],
	])('scores %s', (_name, a, b, score) => {
		expect(similarity(a, b)).toBeCloseTo(score);
	});

	test('is symmetric', () => {
		expect(similarity('a b c d', 'b d e')).toBe(similarity('b d e', 'a b c d'));
	});
});
