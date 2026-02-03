#!/usr/bin/env node

/**
 * Validate commit messages against conventions.
 */

import fs from 'node:fs/promises';
import process from 'node:process';

const HELP_TEXT = `Usage:
    validate-commit-message.js --file <path>
    validate-commit-message.js --msg "message"
    echo "message" | validate-commit-message.js

Options:
    --require-trailers <list>   Comma-separated trailer names that must be present
                                Example: --require-trailers "Task,Fixes"
    `;
const FILE_FLAG = '--file';
const MSG_FLAG = '--msg';
const REQUIRE_TRAILERS_FLAG = '--require-trailers';
const SUBJECT_MAX_LENGTH = 72;
const TRAILER_RX = /^([A-Za-z][A-Za-z0-9-]*):[ \t]+.+$/;

let hasErrors = false;

/**
 * Prints an error message to stdout.
 * @param {string} msg
 */
function printError(msg) {
    hasErrors = true;
    console.log(`ERROR: ${msg}`);
}

/**
 * Prints a warning message to stdout.
 * @param {string} msg
 */
function printWarn(msg) {
    console.log(`WARN: ${msg}`);
}

/**
 * Reads all data from standard input and returns it as a UTF-8 string.
 *
 * @returns {Promise<string>}
 */
async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

/**
 * Reads the content of a file at the given path and returns its contents as a UTF-8 string.
 * Exits the process with an error if the file cannot be read.
 *
 * @param filePath {string}
 * @returns {Promise<string>}
 */
async function readFile(filePath) {
    try {
        const buf = await fs.readFile(filePath, 'utf8');
        return buf.toString('utf8');
    } catch (err) {
        console.error(`ERROR: Cannot read file: ${filePath}`);
        process.exit(1);
    }
}

/**
 * Searches for help flags in command-line arguments and prints usage information if found.
 * Exits the process after printing help.
 */
function maybePrintHelp() {
    for (const argv of process.argv) {
        if (argv === '--help' || argv === '-h') {
            console.log(HELP_TEXT);
            process.exit(0);
        }
    }
}

/**
 * Parses command-line arguments and returns the message to validate.
 * Sources are mutually exclusive: --file, --msg, or stdin.
 *
 * @returns {Promise<string>}
 */
async function getMessage() {
    let fileArg = null;
    let msgArg = null;

    // Parse flags first (before reading stdin)
    for (let i = 2; i < process.argv.length; i++) {
        switch (process.argv[i]) {
            case FILE_FLAG:
                if (process.argv.length === i + 1) {
                    console.error(`ERROR: ${FILE_FLAG} requires a path argument`);
                    process.exit(1);
                }
                fileArg = process.argv[i + 1];
                break;

            case MSG_FLAG:
                if (process.argv.length === i + 1) {
                    console.error(`ERROR: ${MSG_FLAG} requires a message argument`);
                    process.exit(1);
                }
                msgArg = process.argv[i + 1];
                break;

            case REQUIRE_TRAILERS_FLAG:
                // Handled separately in getRequiredTrailers()
                break;
        }
    }

    if (fileArg && msgArg) {
        console.error('ERROR: Only one of --file or --msg may be used at a time.');
        process.exit(1);
    }

    if (fileArg) {
        return await readFile(fileArg);
    }

    if (msgArg) {
        return msgArg;
    }

    // Only read stdin if no flags provided and stdin has data (not a TTY)
    if (!process.stdin.isTTY) {
        const stdin = await readStdin();
        if (stdin) {
            return stdin;
        }
    }

    console.error('ERROR: No commit message provided. Use --file, --msg, or stdin.');
    process.exit(1);
}

/**
 * Parses --require-trailers flag and returns list of required trailer names.
 *
 * @returns {string[]}
 */
function getRequiredTrailers() {
    for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i] === REQUIRE_TRAILERS_FLAG) {
            if (process.argv.length === i + 1) {
                console.error(`ERROR: ${REQUIRE_TRAILERS_FLAG} requires a comma-separated list`);
                process.exit(1);
            }
            return process.argv[i + 1].split(',').map(t => t.trim()).filter(Boolean);
        }
    }
    return [];
}

/**
 * Validates the subject line of the commit message.
 *
 * @param subject {string}
 */
function validateSubject(subject) {
    if (subject.length < 10) {
        printWarn('Subject line is very short (less than 10 characters). Consider making it more descriptive.');
    }

    if (subject.length > SUBJECT_MAX_LENGTH) {
        printError(`Subject line exceeds maximum of ${SUBJECT_MAX_LENGTH} characters.`);
    }

    if (subject.endsWith('.')) {
        printError('Subject line should not end with a period.');
    }
}

/**
 * Validates the commit message against conventions and prints errors or warnings.
 *
 * @param message {string}
 * @param requiredTrailers {string[]}
 */
function validateMessage(message, requiredTrailers) {
    if (!message || message.trim().length === 0) {
        printError('Commit message is empty.');
        process.exit(1);
    }

    if (message.length > 1000) {
        printWarn('Commit message is very long (over 1000 characters). Consider shortening it.');
    }

    const lines = message.split('\n').map(line => line.trim());

    if (lines.length > 50) {
        printWarn('Commit message has more than 50 lines. Consider shortening it.');
    }

    validateSubject(lines[0]);

    if (lines.length === 1) {
        printWarn("Commit messages containing only subject line are discouraged.");
    }

    if (lines.length > 1) {
        if (lines[1] !== '') {
            printError('Subject must be separated from body by a blank line.');
        }
    }

    // Extract and validate trailers
    if (requiredTrailers.length > 0) {
        const trailers = new Set();

        // Walk backwards from end to find trailer block
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];

            if (line === '') {
                break;
            }

            const match = line.match(TRAILER_RX);
            if (match) {
                trailers.add(match[1]);
            } else {
                break;
            }
        }

        for (const required of requiredTrailers) {
            if (!trailers.has(required)) {
                printError(`Required trailer missing: ${required}`);
            }
        }
    }
}

async function main() {
    maybePrintHelp();

    const message = await getMessage();
    const requiredTrailers = getRequiredTrailers();

    validateMessage(message, requiredTrailers);

    if (!hasErrors) {
        console.log('OK: Commit message is valid.');
    }
}

main().catch(console.error);