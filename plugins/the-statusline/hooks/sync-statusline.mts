#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type Entry = Readonly<Record<string, unknown>>;

const RENDERER = 'statusline.mts';
const LEGACY_RENDERER = 'statusline.js';
// constraint: Claude Code re-runs the status line on session events only; a terminal resize is not one
const REFRESH_INTERVAL_SECONDS = 10;

const isRecord = (value: unknown): value is Entry =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Returns the user-level Claude configuration directory: `CLAUDE_CONFIG_DIR` when it is set and not empty, else ~/.claude. */
export function configDir(env: string | undefined, home: string): string {
	return env === undefined || env === '' ? path.join(home, '.claude') : env;
}

/**
 * Copies the renderer from `pluginRoot` into `claudeDir` and points `statusLine` in that directory's settings.json at
 * it, keeping every other key. A renderer an earlier release installed is deleted when the settings still name it.
 */
export function sync(claudeDir: string, pluginRoot: string): void {
	const settingsPath = path.join(claudeDir, 'settings.json');
	const target = path.join(claudeDir, RENDERER);

	fs.mkdirSync(claudeDir, {recursive: true});
	fs.copyFileSync(path.join(pluginRoot, RENDERER), target);

	const settings: unknown = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {};
	if (!isRecord(settings)) {
		throw new TypeError(`${settingsPath} does not hold a JSON object`);
	}

	const command = `node "${target}"`;
	const statusLine = isRecord(settings.statusLine) ? settings.statusLine : undefined;

	const isCurrent =
		statusLine?.type === 'command' && statusLine.command === command && statusLine.refreshInterval !== undefined;
	if (isCurrent) {
		return;
	}

	const legacy = path.join(claudeDir, LEGACY_RENDERER);
	if (statusLine?.command === `node "${legacy}"`) {
		fs.rmSync(legacy, {force: true});
	}

	const next = {
		...settings,
		statusLine: {refreshInterval: REFRESH_INTERVAL_SECONDS, ...statusLine, type: 'command', command},
	};
	fs.writeFileSync(settingsPath, `${JSON.stringify(next, null, 2)}\n`);
}

if (import.meta.main) {
	try {
		const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
		if (pluginRoot === undefined) {
			throw new Error('CLAUDE_PLUGIN_ROOT is not set');
		}

		sync(configDir(process.env.CLAUDE_CONFIG_DIR, os.homedir()), pluginRoot);
	} catch (error) {
		process.stderr.write(`[statusline-sync] ${error instanceof Error ? error.message : String(error)}\n`);
	}
}
