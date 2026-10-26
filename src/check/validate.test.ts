import {expect, test} from 'vite-plus/test';
import {createFixture} from './fixture.ts';
import {loadRepo} from './repo.ts';
import {findingsFromReport, validateRepo} from './validate.ts';

test('findingsFromReport fails every validator issue except the accepted warnings', () => {
	const report = {
		success: false,
		manifest: {
			file: '/repo/plugins/alpha/.claude-plugin/plugin.json',
			errors: [{path: 'version', message: 'Invalid version', code: null}],
			warnings: [],
		},
		contents: [
			{
				file: '/repo/plugins/alpha/CLAUDE.md',
				errors: [],
				warnings: [{path: 'root', message: 'CLAUDE.md at the plugin root is not loaded as project context.'}],
			},
			{
				file: '/repo/plugins/alpha/hooks/hooks.json',
				errors: [],
				warnings: [{path: 'hooks.Stop', message: 'Shell command uses ${CLAUDE_PLUGIN_ROOT} without quotes'}],
			},
		],
		directory: {warnings: [{path: 'icon', message: 'No icon'}]},
	};

	const findings = findingsFromReport(JSON.stringify(report), '/repo');

	expect(findings).toStrictEqual([
		{
			rule: 'validate',
			severity: 'error',
			file: 'plugins/alpha/.claude-plugin/plugin.json',
			message: 'version: Invalid version',
		},
		{
			rule: 'validate',
			severity: 'error',
			file: 'plugins/alpha/hooks/hooks.json',
			message: 'hooks.Stop: Shell command uses ${CLAUDE_PLUGIN_ROOT} without quotes',
		},
	]);
});

test('validateRepo reports what claude plugin validate finds in a plugin', async () => {
	await using fixture = await createFixture();
	await fixture.write(
		'plugins/alpha/hooks/hooks.json',
		JSON.stringify({
			hooks: {Stop: [{hooks: [{type: 'command', command: 'node ${CLAUDE_PLUGIN_ROOT}/hooks/stop.js'}]}]},
		}),
	);
	await fixture.write('plugins/alpha/hooks/stop.js', '');

	const findings = await validateRepo(await loadRepo(fixture.root));

	expect(findings.map((f) => [f.file, f.severity])).toStrictEqual([['plugins/alpha/hooks/hooks.json', 'error']]);
	expect(findings[0]?.message ?? '').toMatch(/without quotes/);
});
