#!/usr/bin/env node

/**
 * SessionStart hook — syncs status line script and settings
 * to user-level Claude configuration (~/.claude/).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');
const TARGET_SCRIPT = path.join(CLAUDE_DIR, 'statusline.js');
const SOURCE_SCRIPT = path.join(
    process.env.CLAUDE_PLUGIN_ROOT,
    'statusline.js',
);

try {
    fs.mkdirSync(CLAUDE_DIR, {recursive: true});
    fs.copyFileSync(SOURCE_SCRIPT, TARGET_SCRIPT);

    const settings = fs.existsSync(SETTINGS_PATH)
        ? JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
        : {};

    const command = `node ${TARGET_SCRIPT}`;
    const sl = settings.statusLine;

    if (sl?.type !== 'command' || sl?.command !== command) {
        settings.statusLine = {
            ...sl,
            type: 'command',
            command,
        };
        fs.writeFileSync(
            SETTINGS_PATH,
            JSON.stringify(settings, null, 2) + '\n',
        );
    }
} catch (err) {
    console.error(`[statusline-sync] ${err.message}`);
}
