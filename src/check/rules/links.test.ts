import {expect, test} from 'vite-plus/test';
import type {Finding} from '../finding.ts';
import {createFixture} from '../fixture.ts';
import {loadRepo} from '../repo.ts';
import {dependencyScope, prerequisiteDependencies, skillReferences} from './links.ts';

const brief = (findings: readonly Finding[]) => findings.map((f) => `${f.file}:${f.line ?? ''} ${f.message}`);

const skill = (name: string, body: string) => `---\nname: ${name}\ndescription: The ${name} skill.\n---\n\n${body}\n`;

test("skill-ref resolves every explicit reference to this marketplace's plugins", async () => {
	await using fixture = await createFixture();
	await fixture.write(
		'plugins/alpha/skills/one/SKILL.md',
		skill(
			'one',
			[
				'Load `beta:two` and Skill(alpha:one) first, then run `/beta:two`.',
				'Leave `node:test`, `frontend-design:frontend-design`, and `<a href="javascript:alert(1)">` alone.',
				'`beta:three` is gone.',
			].join('\n'),
		),
	);
	await fixture.write('README.md', '# fixture\n\n### alpha\n\n### beta\n\nSee Skill(alpha:missing).\n');

	expect(brief(await skillReferences(await loadRepo(fixture.root)))).toStrictEqual([
		'README.md:7 `alpha:missing` names no skill, agent, or command in plugins/alpha',
		'plugins/alpha/skills/one/SKILL.md:8 `beta:three` names no skill, agent, or command in plugins/beta',
	]);
});

test('skill-ref skips .dev directories', async () => {
	await using fixture = await createFixture();
	await fixture.write('plugins/alpha/.dev/reference/notes.md', '`beta:nothing`\n');

	expect(await skillReferences(await loadRepo(fixture.root))).toStrictEqual([]);
});

test("prerequisite-dependency requires a dependency for another plugin's skill", async () => {
	await using fixture = await createFixture();
	await fixture.write(
		'plugins/alpha/skills/one/SKILL.md',
		skill('one', '<prerequisite>\nInvoke `two` first, and `one` for the rest.\n</prerequisite>'),
	);

	expect(brief(await prerequisiteDependencies(await loadRepo(fixture.root)))).toStrictEqual([
		'plugins/alpha/skills/one/SKILL.md:6 the prerequisite `two` ships in "beta", missing from dependencies',
	]);

	await fixture.editManifest('alpha', (m) => ({...m, dependencies: ['beta']}));

	expect(await prerequisiteDependencies(await loadRepo(fixture.root))).toStrictEqual([]);
});

test('prerequisite-dependency reads explicit references and refuses an ambiguous bare name', async () => {
	await using fixture = await createFixture([
		{name: 'alpha', skills: ['one']},
		{name: 'beta', skills: ['shared']},
		{name: 'gamma', skills: ['shared']},
	]);
	await fixture.write(
		'plugins/alpha/skills/one/SKILL.md',
		skill('one', '<prerequisite>\nRun Skill(gamma:shared), then `shared`.\n</prerequisite>'),
	);

	expect(brief(await prerequisiteDependencies(await loadRepo(fixture.root)))).toStrictEqual([
		'plugins/alpha/skills/one/SKILL.md:6 the prerequisite `gamma:shared` ships in "gamma", missing from dependencies',
		'plugins/alpha/skills/one/SKILL.md:6 `shared` is a skill in beta, gamma; name it as plugin:skill',
	]);
});

test('dependency-scope refuses a dependency outside this marketplace', async () => {
	await using fixture = await createFixture();
	await fixture.editManifest('alpha', (m) => ({
		...m,
		dependencies: ['beta', 'beta@foundry', 'delta', 'linter@elsewhere'],
	}));

	expect(brief(dependencyScope(await loadRepo(fixture.root)))).toStrictEqual([
		'plugins/alpha/.claude-plugin/plugin.json: dependency "delta" is no plugin of this marketplace',
		'plugins/alpha/.claude-plugin/plugin.json: dependency "linter@elsewhere" comes from another marketplace',
	]);
});
