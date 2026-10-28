import path from 'node:path';
import {exec} from './exec.ts';

/** The dev-tools package's own Vite+ binary, so the result does not depend on what PATH holds. */
const VP = path.resolve(import.meta.dirname, '../../node_modules/.bin/vp');

/**
 * Formats `content` as the file at `file` would be, with the Oxfmt settings of the repository at `root`. Resolves to
 * null when the formatter refuses the input, such as a file type it does not format or syntax it cannot parse.
 */
export async function formatted(root: string, file: string, content: string): Promise<string | null> {
	const result = await exec(VP, ['fmt', `--stdin-filepath=${file}`], {cwd: root, input: content});
	return result.code === 0 ? result.stdout : null;
}
