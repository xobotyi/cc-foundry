import {access, readFile} from 'node:fs/promises';
import {type Json, parseJson} from './json.mts';

/** Returns whether a file or directory exists. */
export async function exists(file: string): Promise<boolean> {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}

/** Reads a UTF-8 file, or returns an empty string when it cannot be read. */
export async function readOrEmpty(file: string): Promise<string> {
	try {
		return await readFile(file, 'utf8');
	} catch {
		return '';
	}
}

/** Reads a JSON file, or returns undefined when it cannot be read or parsed. */
export async function readJson(file: string): Promise<Json | undefined> {
	try {
		return parseJson(await readFile(file, 'utf8'));
	} catch {
		return undefined;
	}
}
