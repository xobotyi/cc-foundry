import {defineCommand} from 'citty';
import {consola} from 'consola';
import path from 'node:path';
import {exec} from '../check/exec.ts';
import {buildWithXerj, refreshCorpora} from '../xerj-hub/refresh.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

export default defineCommand({
	meta: {
		name: 'xerj-hub-refresh',
		description: 'Move the XERJ Corpus Hub pins of released plugins to their release commit',
	},
	args: {
		hub: {
			type: 'string',
			required: true,
			description: 'Path to a xerj checkout on the corpus-hub branch',
		},
		sha: {
			type: 'string',
			required: true,
			description: 'Full SHA of the release commit on origin/master',
		},
		plugins: {
			type: 'positional',
			required: true,
			description: 'Released plugins whose corpora move',
		},
	},
	async run({args}) {
		await assertOnMaster(args.sha);
		const refreshed = await refreshCorpora({
			root: REPO_ROOT,
			hub: path.resolve(args.hub),
			sha: args.sha,
			plugins: args._,
			date: new Date().toISOString().slice(0, 10),
			build: buildWithXerj,
		});
		if (refreshed.length === 0) consola.info('No corpus inside these plugins needs a new pin');
		for (const r of refreshed) {
			consola.success(
				`${r.corpus}: ${r.from.slice(0, 12)} -> ${r.to.slice(0, 12)}, ${r.files} files, ${r.bytes} bytes`,
			);
		}
	},
});

/** Rejects unless `sha` is on origin/master, the history hub users clone. */
async function assertOnMaster(sha: string): Promise<void> {
	const result = await exec('git', ['-C', REPO_ROOT, 'merge-base', '--is-ancestor', sha, 'origin/master']);
	if (result.code === 1) throw new Error(`${sha} is not on origin/master; fetch origin, or pin a commit that is`);
	if (result.code !== 0) {
		throw new Error(`git merge-base exited with ${String(result.code)}: ${result.stderr.trim()}`);
	}
}
