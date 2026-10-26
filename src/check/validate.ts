import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import type {Finding} from './finding.ts';
import {isErrnoCode, isObject} from './repo.ts';
import type {Repo} from './repo.ts';

const execFileAsync = promisify(execFile);

const RULE = 'validate';

/** Validator warnings this repository keeps on purpose; any other warning fails the check. */
const ACCEPTED_WARNINGS: readonly {file: RegExp; message: string}[] = [
	// plugin CLAUDE.md files are developer docs for this repository, not context shipped to users
	{file: /^plugins\/[^/]+\/CLAUDE\.md$/, message: 'CLAUDE.md at the plugin root is not loaded as project context'},
];

const CONCURRENCY = 4;

interface ValidatorIssue {
	path: string;
	message: string;
}

interface ValidatorSection {
	file: string;
	errors: readonly ValidatorIssue[];
	warnings: readonly ValidatorIssue[];
}

/** Runs `claude plugin validate --json` on the marketplace and on every plugin directory. */
export async function validateRepo(repo: Repo): Promise<Finding[]> {
	// constraint: the validator reports real paths, so a root reached through a symlink would not prefix them
	const root = await fs.realpath(repo.root);
	const targets = ['.', ...repo.plugins.map((p) => p.path)];
	const results: Finding[][] = [];
	for (let i = 0; i < targets.length; i += CONCURRENCY) {
		const batch = targets.slice(i, i + CONCURRENCY);
		results.push(...(await Promise.all(batch.map((target) => validateTarget(root, target)))));
	}
	return results.flat();
}

async function validateTarget(root: string, target: string): Promise<Finding[]> {
	let stdout: string;
	try {
		({stdout} = await execFileAsync('claude', ['plugin', 'validate', '--json', target], {
			cwd: root,
			maxBuffer: 64 * 1024 * 1024,
		}));
	} catch (err) {
		if (isErrnoCode(err, 'ENOENT')) {
			throw new Error('claude is not on PATH; install it with `npm install -g @anthropic-ai/claude-code`', {
				cause: err,
			});
		}
		// constraint: claude plugin validate exits 1 when it finds an error and still prints the report on stdout
		if (err instanceof Error && 'stdout' in err && typeof err.stdout === 'string' && err.stdout !== '') {
			stdout = err.stdout;
		} else {
			throw err;
		}
	}
	return findingsFromReport(stdout, root);
}

/** Turns one `claude plugin validate --json` report into findings, dropping the accepted warnings. */
export function findingsFromReport(stdout: string, root: string): Finding[] {
	const report: unknown = JSON.parse(stdout);
	if (!isObject(report)) {
		throw new Error('claude plugin validate --json printed no report object');
	}
	const sections = [report.manifest, ...(Array.isArray(report.contents) ? report.contents : [])].flatMap(parseSection);
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
	return value.filter(isObject).map((issue) => ({
		path: typeof issue.path === 'string' ? issue.path : '',
		message: typeof issue.message === 'string' ? issue.message : String(issue.message),
	}));
}

function toFinding(file: string, issue: ValidatorIssue): Finding {
	const where = issue.path === '' ? '' : `${issue.path}: `;
	return {rule: RULE, severity: 'error', file, message: `${where}${issue.message}`};
}
