import {claude} from './claude.ts';
import type {ExecResult} from './exec.ts';
import type {Finding} from './finding.ts';
import type {Plugin, Repo} from './repo.ts';

const RULE = 'mod-test';

/** Runs `claude plugin test` on every mod; a failing suite, or a mod with no tests, is an error. */
export async function testMods(repo: Repo): Promise<Finding[]> {
	const mods = repo.plugins.filter((plugin) => plugin.modules.length > 0);
	const findings = await Promise.all(mods.map(async (plugin) => testMod(repo.root, plugin)));
	return findings.flat();
}

async function testMod(root: string, plugin: Plugin): Promise<Finding[]> {
	const result = await claude(root, ['plugin', 'test', plugin.path]);
	if (result.code === 0) return [];
	return [{rule: RULE, severity: 'error', file: `${plugin.path}/hooks/hooks.json`, message: failureOf(result)}];
}

/** The tests the kit reports as failed, or its last line when it names none, as for a mod with no tests. */
function failureOf(result: ExecResult): string {
	const lines = `${result.stdout}\n${result.stderr}`
		.split('\n')
		.map((line) => line.trim().replace(/ \[[\d.]+m?s\]$/, ''))
		.filter((line) => line !== '');
	const failed = lines.filter((line) => line.startsWith('(fail)'));
	const summary = failed.length > 0 ? failed.join('; ') : (lines.at(-1) ?? `exit code ${String(result.code)}`);
	return `claude plugin test failed: ${summary}`;
}
