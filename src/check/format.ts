import path from 'node:path';
import {exec} from './exec.ts';

/** The dev-tools package's own binaries, so the result does not depend on what PATH holds. */
const VP = path.resolve(import.meta.dirname, '../../node_modules/.bin/vp');
const RUMDL = path.resolve(import.meta.dirname, '../../node_modules/.bin/rumdl');

/**
 * Formats `content` as the file at `file` would be, with the settings of the repository at `root`: rumdl for markdown,
 * Oxfmt for every other file. Resolves to null when the formatter refuses the input, such as a file type it does not
 * format or syntax it cannot parse.
 */
export async function formatted(root: string, file: string, content: string): Promise<string | null> {
	const [command, args] = file.endsWith('.md')
		? [RUMDL, ['fmt', '-', '--stdin-filename', file]]
		: [VP, ['fmt', `--stdin-filepath=${file}`]];
	const result = await exec(command, args, {cwd: root, input: content});
	return result.code === 0 ? result.stdout : null;
}
