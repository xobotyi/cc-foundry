import fs from 'node:fs/promises';
import path from 'node:path';
import {exec} from './exec.ts';
import type {ExecResult} from './exec.ts';
import type {Finding} from './finding.ts';
import {isErrnoCode, isObject} from './repo.ts';
import type {Repo} from './repo.ts';

const RULE = 'validate';

/** Validator warnings this repository keeps on purpose; any other warning fails the check. */
const ACCEPTED_WARNINGS: ReadonlyArray<{readonly file: RegExp; readonly message: string}> = [
	// plugin CLAUDE.md files are developer docs for this repository, not context shipped to users
	{file: /^plugins\/[^/]+\/CLAUDE\.md$/, message: 'CLAUDE.md at the plugin root is not loaded as project context'},
];

const CONCURRENCY = 4;

type ValidatorIssue = {
	readonly path: string;
	readonly message: string;
};

type ValidatorSection = {
	readonly file: string;
	readonly errors: readonly ValidatorIssue[];
	readonly warnings: readonly ValidatorIssue[];
};

/** Runs `claude plugin validate --json` on the marketplace and on every plugin directory. */
export async function validateRepo(repo: Repo): Promise<Finding[]> {
	// constraint: the validator reports real paths, so a root reached through a symlink would not prefix them
	const root = await fs.realpath(repo.root);
	const targets = ['.', ...repo.plugins.map((p) => p.path)];
	const results: Finding[][] = [];
	for (let i = 0; i < targets.length; i += CONCURRENCY) {
		const batch = targets.slice(i, i + CONCURRENCY);
		// oxlint-disable-next-line no-await-in-loop -- each batch caps how many validator processes run at once
		results.push(...(await Promise.all(batch.map(async (target) => validateTarget(root, target)))));
	}
	return results.flat();
}

async function validateTarget(root: string, target: string): Promise<Finding[]> {
	let result: ExecResult;
	try {
		result = await exec('claude', ['plugin', 'validate', '--json', target], {cwd: root});
	} catch (error) {
		if (isErrnoCode(error, 'ENOENT')) {
			throw new Error('claude is not on PATH; install it with `npm install -g @anthropic-ai/claude-code`', {
				cause: error,
			});
		}
		throw error;
	}
	// constraint: claude plugin validate exits 1 when it finds an error and still prints the report on stdout
	if (result.stdout === '') {
		throw new Error(`claude plugin validate ${target} printed no report: ${result.stderr.trim()}`);
	}
	return findingsFromReport(result.stdout, root);
}

/** Turns one `claude plugin validate --json` report into findings, dropping the accepted warnings. */
export function findingsFromReport(stdout: string, root: string): Finding[] {
	const report: unknown = JSON.parse(stdout);
	if (!isObject(report)) {
		throw new Error('claude plugin validate --json printed no report object');
	}
	const contents: unknown[] = Array.isArray(report.contents) ? report.contents : [];
	const sections = [report.manifest, ...contents].flatMap((section) => parseSection(section));
	return sections.flatMap((section) => {
		const file = path.relative(root, section.file);
		const warnings = section.warnings.filter(
			(issue) => !ACCEPTED_WARNINGS.some((a) => a.file.test(file) && issue.message.startsWith(a.message)),
		);
		return [...section.errors, ...warnings].map((issue) => toFinding(file, issue));
	});
}

function parseSection(value: unknown): ValidatorSection[] {
	if (!isObject(value) || typeof value.file !== 'string') return [];
	return [{file: value.file, errors: parseIssues(value.errors), warnings: parseIssues(value.warnings)}];
}

function parseIssues(value: unknown): ValidatorIssue[] {
	if (!Array.isArray(value)) return [];
	const issues: unknown[] = value;
	return issues
		.filter((issue) => isObject(issue))
		.map((issue) => ({
			path: typeof issue.path === 'string' ? issue.path : '',
			message: typeof issue.message === 'string' ? issue.message : String(issue.message),
		}));
}

function toFinding(file: string, issue: ValidatorIssue): Finding {
	const where = issue.path === '' ? '' : `${issue.path}: `;
	return {rule: RULE, severity: 'error', file, message: `${where}${issue.message}`};
}
