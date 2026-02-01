#!/usr/bin/env node

import process from 'node:process';
import posixpath from 'node:path/posix';
import os from 'node:os';

const RESET = '\x1b[0m';

/**
 * Returns 256-color ANSI escape code.
 * @param {number} n - Color number (0-255)
 * @returns {string}
 */
function ansi256(n) {
    return `\x1b[38;5;${n}m`;
}

/**
 * Wraps text with 256-color code and reset.
 * @param {number} colorNum - 256-color number
 * @param {string} text - Text to colorize
 * @returns {string}
 */
function color(colorNum, text) {
    return `${ansi256(colorNum)}${text}${RESET}`;
}

// 256-color palette choices (pastel tones)
const c = {
    gray: (t) => color(245, t),     // medium gray
    green: (t) => color(151, t),    // pastel green
    yellow: (t) => color(223, t),   // pastel yellow/cream
    blue: (t) => color(153, t),     // pastel blue
    magenta: (t) => color(182, t),  // pastel pink/magenta
};

/**
 * Colors text with stepped 256-color palette based on percentage remaining.
 * Luminosity increases with urgency (more visible when critical).
 * @param {number} percent - Remaining percentage (0-100)
 * @param {string} text - Text to colorize
 * @returns {string}
 */
function colorByUrgency(percent, text) {
    // Stepped colors with increasing luminosity as urgency rises
    // Gray (dim) → Yellow (medium) → Orange (bright) → Red (vivid)
    let colorNum;

    if (percent >= 60) {
        colorNum = 245;      // gray (low luminosity)
    } else if (percent >= 50) {
        colorNum = 251;      // light gray
    } else if (percent >= 40) {
        colorNum = 228;      // pale yellow
    } else if (percent >= 30) {
        colorNum = 220;      // bright yellow
    } else if (percent >= 20) {
        colorNum = 208;      // orange (high luminosity)
    } else if (percent >= 10) {
        colorNum = 196;      // red
    } else {
        colorNum = 197;      // bright red-pink (max luminosity)
    }

    return `${ansi256(colorNum)}${text}${RESET}`;
}

/**
 * @typedef {object} ModelData
 * @property {string} id - Model identifier (e.g., "claude-opus-4-1")
 * @property {string} display_name - Human-readable name (e.g., "Opus")
 */

/**
 * @typedef {object} WorkspaceData
 * @property {string} current_dir - Current working directory
 * @property {string} project_dir - Original project directory
 */

/**
 * @typedef {object} OutputStyleData
 * @property {string} name - Active output style name
 */

/**
 * @typedef {object} CostData
 * @property {number} total_cost_usd - Session cost in USD
 * @property {number} total_duration_ms - Total session duration
 * @property {number} total_api_duration_ms - Time spent in API calls
 * @property {number} total_lines_added - Lines added in session
 * @property {number} total_lines_removed - Lines removed in session
 */

/**
 * @typedef {object} CurrentUsageData
 * @property {number} input_tokens - Input tokens in current context
 * @property {number} output_tokens - Output tokens generated
 * @property {number} cache_creation_input_tokens - Tokens written to cache
 * @property {number} cache_read_input_tokens - Tokens read from cache
 */

/**
 * @typedef {object} ContextWindowData
 * @property {number} total_input_tokens - Cumulative input tokens
 * @property {number} total_output_tokens - Cumulative output tokens
 * @property {number} context_window_size - Max context size (e.g., 200000)
 * @property {number} used_percentage - Pre-calculated usage (0-100)
 * @property {number} remaining_percentage - Pre-calculated remaining (0-100)
 * @property {CurrentUsageData|null} current_usage - Current context usage
 */

/**
 * @typedef {object} SessionData
 * @property {string} hook_event_name - Always "Status" for statusline
 * @property {string} session_id - Unique session identifier
 * @property {string} transcript_path - Path to session transcript
 * @property {string} cwd - Current working directory
 * @property {ModelData} model - Model information
 * @property {WorkspaceData} workspace - Workspace paths
 * @property {string} version - Claude Code version
 * @property {OutputStyleData} output_style - Active output style
 * @property {CostData} cost - Session cost and stats
 * @property {ContextWindowData} context_window - Context usage info
 */


/**
 * Reads JSON data from stdin and parses it into a SessionData object.
 * No validation is performed.
 *
 * @returns {Promise<SessionData>}
 */
async function readStdinJSON() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }

    const input = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(input);
}

/**
 * Formats output style and model: "Style (Model)"
 * @param {SessionData} data
 * @returns {string}
 */
function formatStyleModel(data) {
    let style = data.output_style?.name ?? 'default';
    const model = data.model?.display_name ?? 'unknown';

    // Remove any plugin prefix from style
    const stylePluginIdx = style.indexOf(':');
    if (stylePluginIdx !== -1) {
        style = style.substring(stylePluginIdx + 1).trim();
    }

    return `${c.green(style)} ${c.yellow(`(${model})`)}`;
}

/**
 * Trims string from the middle, keeping start and end with ellipsis.
 * "very-long-folder-name" -> "very-...name" (for maxWidth=12)
 * @param {string} str - String to trim
 * @param {number} maxWidth - Maximum allowed width
 * @returns {string}
 */
function trimMiddle(str, maxWidth) {
    if (str.length <= maxWidth) {
        return str;
    }

    const ellipsis = '...';
    const available = maxWidth - ellipsis.length;
    if (available <= 0) {
        return str.slice(0, maxWidth);
    }

    return str.slice(0, Math.ceil(available / 2)) + ellipsis + str.slice(-Math.floor(available / 2));
}

/**
 * Collapses path segments to first letter to fit within maxWidth.
 * Keeps the last segment (current folder) intact as long as possible.
 * Always uses unix-style separators.
 * @param {string} path - Path to collapse
 * @param {number} maxWidth - Maximum allowed width
 * @returns {string}
 */
function collapsePath(path, maxWidth) {
    if (path.length <= maxWidth) {
        return path;
    }

    let overdue = path.length - maxWidth;
    const segments = posixpath.dirname(path).split(posixpath.sep);

    for (let i = 0; i < segments.length; i++) {
        overdue -= (segments[i].length - 1);
        segments[i] = segments[i][0];
        if (overdue <= 0) {
            break
        }
    }

    // if overdue is not fulfilled - we can pop path segments starting from the 2nd, replacing with ellipsis
    // Keep first segment, replace middle with ellipsis
    if (segments.length > 2 && overdue > 0) {
        const ellipsis = '...';

        for (let i = 1; i < segments.length; i++) {
            overdue -= (segments[i].length + 1);

            //replace the segment with ellipsis and adjust overdue
            if (i === 1) {
                overdue -= (segments[i].length - 1);
                segments[i] = ellipsis;
            } else {
                segments[i] = '';
            }

            if (overdue <= 0) {
                break;
            }
        }
    }


    let basename = posixpath.basename(path);
    // still overdue - trim in the middle of the basename
    if (overdue > 0) {
        basename = trimMiddle(basename, Math.max(basename.length - overdue, 0));
    }

    return posixpath.join(...segments.filter(seg => seg !== ''), basename);
}

/**
 * Converts path to unix-style separators.
 * @param {string} p
 * @returns {string}
 */
function toUnixPath(p) {
    return posixpath.join(...p.split(/[/\\]/));
}

/**
 * Formats path relative to project root, with terminal-width-aware folding.
 * @param {SessionData} data
 * @returns {string}
 */
function formatPath(data) {
    // since we're not able reliably get terminal width in all environments,
    // we'll use a fixed max width for now
    const maxPrintWidth = 50;

    const cwd = toUnixPath(data.cwd ?? data.workspace?.current_dir ?? '');
    const projectDir = toUnixPath(data.workspace?.project_dir ?? '');

    const relPath = posixpath.relative(projectDir, cwd);

    if (relPath === '') {
        const homedir = toUnixPath(os.homedir());
        if (projectDir.startsWith(homedir)) {
            // Project in home directory - replace home with ~
            return collapsePath('~' + projectDir.slice(homedir.length), maxPrintWidth);
        }

        // we're in the project root, print as-is
        return collapsePath(projectDir, maxPrintWidth);
    }

    // in case we went deeper than project root, ensure we have $/ prefix, not to print it
    return collapsePath("$/" + relPath, maxPrintWidth);
}

/**
 * Formats cost in USD.
 * @param {SessionData} data
 * @returns {string}
 */
function formatCost(data) {
    const cost = data.cost?.total_cost_usd ?? 0;
    return c.magenta(`$${cost.toFixed(2)}`);
}

/**
 * Formats API time in human-readable form.
 * @param {SessionData} data
 * @returns {string}
 */
function formatApiTime(data) {
    const ms = data.cost?.total_api_duration_ms ?? 0;
    const seconds = ms / 1000;
    if (seconds < 60) {
        return c.gray(`${seconds.toFixed(1)}s api`);
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSec = Math.round(seconds % 60);
    return `${minutes}m${remainingSec}s api`;
}

/**
 * Formats context window remaining percentage.
 * @param {SessionData} data
 * @returns {string}
 */
function formatContextRemaining(data) {
    const remaining = data.context_window?.remaining_percentage;
    let val = c.gray('--.--%')
    if (remaining !== undefined) {
        val = `${remaining.toFixed(2)}%`
        val = colorByUrgency(remaining, val)
    }
    return `ctx left ${val}`;
}

/**
 * Formats input/output token ratio.
 * @param {SessionData} data
 * @returns {string}
 */
function formatTokenRatio(data) {
    const input = data.context_window?.total_input_tokens;
    const output = data.context_window?.total_output_tokens;

    let ratio = '--%'
    if (input && output) {
        ratio = `${Math.round((input / (input + output)) * 100)}%`;
    }

    return `inp÷out ${ratio}`;
}

/**
 * Formats cache efficiency percentage.
 * @param {SessionData} data
 * @returns {string}
 */
function formatCacheEfficiency(data) {
    const usage = data.context_window?.current_usage;
    if (!usage) {
        return 'cache --%';
    }

    const fresh = usage.input_tokens ?? 0;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;
    const total = fresh + cacheRead + cacheWrite;

    if (total === 0) {
        return 'cache --%';
    }

    const efficiency = Math.round((cacheRead / total) * 100);
    return `cache ${efficiency}%`;
}

/**
 * Formats first row of status line: style, model, cost, api time
 * @param {SessionData} data
 * @returns {string}
 */
function formatRow1(data) {
    const row = [
        formatStyleModel(data),
        formatCost(data),
        formatApiTime(data)
    ];
    return row.join(c.gray(" | "));
}

/**
 * Formats second row of status line: token metrics
 * @param {SessionData} data
 * @returns {string}
 */
function formatRow2(data) {
    const row = [
        formatContextRemaining(data),
        formatTokenRatio(data),
        formatCacheEfficiency(data)
    ];
    return row.join(" | ");
}

/**
 * Formats third row of status line: path
 * @param {SessionData} data
 * @returns {string}
 */
function formatRow3(data) {
    return c.blue(formatPath(data));
}

async function main() {
    const sessionData = await readStdinJSON();

    const rows = [
        formatRow1(sessionData),
        formatRow2(sessionData),
        formatRow3(sessionData)
    ];

    process.stdout.write(rows.join('\n'));
}

main().catch(console.error);
