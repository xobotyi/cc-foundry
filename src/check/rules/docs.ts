import fs from 'node:fs/promises';
import path from 'node:path';
import type {Finding} from '../finding.ts';
import type {Repo} from '../repo.ts';

/** The root CLAUDE.md names every plugin by its directory, and the root README gives each one a section. */
export async function rootDocs(repo: Repo): Promise<Finding[]> {
	const [claude, readme] = await Promise.all(
		['CLAUDE.md', 'README.md'].map(async (file) => fs.readFile(path.join(repo.root, file), 'utf8')),
	);
	const headings = new Set((readme ?? '').split('\n').map((line) => line.trim()));
	return repo.plugins.flatMap((plugin): Finding[] => {
		const findings: Finding[] = [];
		if (!(claude ?? '').includes(`plugins/${plugin.dir}/`)) {
			const message = `the plugin list does not name plugins/${plugin.dir}/`;
			findings.push({rule: 'root-docs', severity: 'error', file: 'CLAUDE.md', message});
		}
		if (!headings.has(`### ${plugin.dir}`)) {
			const message = `no "### ${plugin.dir}" section describes the plugin`;
			findings.push({rule: 'root-docs', severity: 'error', file: 'README.md', message});
		}
		return findings;
	});
}
