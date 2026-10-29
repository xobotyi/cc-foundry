import {expect, test} from 'vite-plus/test';
import {createFixture} from './fixture.ts';
import type {Fixture} from './fixture.ts';
import {testMods} from './mods.ts';
import {loadRepo} from './repo.ts';

const KIT_TEST = (name: string, assertion: string): string =>
	`import {expect, test} from 'claude-code/testing';\ntest('${name}', () => { ${assertion}; });\n`;

/** Turns the fixture's alpha plugin into a mod whose suite holds the given test files. */
async function makeMod(fixture: Fixture, tests: Readonly<Record<string, string>>): Promise<void> {
	await fixture.write('plugins/alpha/hooks/hooks.json', JSON.stringify({modules: ['./register.ts']}));
	await fixture.write('plugins/alpha/hooks/register.ts', 'export function register(): void {}\n');
	await Promise.all(
		Object.entries(tests).map(async ([file, source]) => fixture.write(`plugins/alpha/tests/${file}`, source)),
	);
}

test('loadRepo reads the hooks modules a plugin names', async () => {
	await using fixture = await createFixture();
	await makeMod(fixture, {});

	const repo = await loadRepo(fixture.root);

	expect(repo.plugins.map((p) => [p.dir, p.modules])).toStrictEqual([
		['alpha', ['./register.ts']],
		['beta', []],
	]);
});

test('testMods passes a mod whose tests pass, and skips plugins that name no module', async () => {
	await using fixture = await createFixture();
	await makeMod(fixture, {'a.test.ts': KIT_TEST('passes', 'expect(1).toBe(1)')});

	expect(await testMods(await loadRepo(fixture.root))).toStrictEqual([]);
});

test('testMods fails a mod with a failing test and names the test', async () => {
	await using fixture = await createFixture();
	await makeMod(fixture, {
		'a.test.ts': KIT_TEST('passes', 'expect(1).toBe(1)'),
		'b.test.ts': KIT_TEST('breaks', 'expect(1).toBe(2)'),
	});

	expect(await testMods(await loadRepo(fixture.root))).toStrictEqual([
		{
			rule: 'mod-test',
			severity: 'error',
			file: 'plugins/alpha/hooks/hooks.json',
			message: 'claude plugin test failed: (fail) breaks',
		},
	]);
});

test('testMods fails a mod that ships no tests', async () => {
	await using fixture = await createFixture();
	await makeMod(fixture, {});

	const findings = await testMods(await loadRepo(fixture.root));

	expect(findings.map((f) => [f.rule, f.file, f.message.includes('no *.test.ts')])).toStrictEqual([
		['mod-test', 'plugins/alpha/hooks/hooks.json', true],
	]);
});
