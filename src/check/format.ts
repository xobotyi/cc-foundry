import {spawn} from 'node:child_process';
import path from 'node:path';

/** The dev-tools package's own Vite+ binary, so the result does not depend on what PATH holds. */
const VP = path.resolve(import.meta.dirname, '../../node_modules/.bin/vp');

/**
 * Formats `content` as the file at `file` would be, with the Oxfmt settings of the repository at `root`. Resolves to
 * null when the formatter refuses the input, such as a file type it does not format or syntax it cannot parse.
 */
export function formatted(root: string, file: string, content: string): Promise<string | null> {
	return new Promise((resolve, reject) => {
		const child = spawn(VP, ['fmt', `--stdin-filepath=${file}`], {cwd: root, stdio: ['pipe', 'pipe', 'ignore']});
		const chunks: Buffer[] = [];
		child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
		child.on('error', reject);
		child.on('close', (code) => {
			resolve(code === 0 ? Buffer.concat(chunks).toString('utf8') : null);
		});
		child.stdin.end(content);
	});
}
