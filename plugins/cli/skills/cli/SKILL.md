---
name: cli
description: >-
  CLI application design: argument conventions, output streams, exit codes,
  configuration hierarchy, interactive modes, and terminal UX. Invoke whenever
  task involves building command-line tools or terminal applications.
---

# CLI Design

**Programs are composable by default.** stdout carries data, stderr carries
diagnostics, exit codes carry status, and signals carry intent. Get the
boundaries right and everything else follows.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Arguments | `references/arguments.md` | Full POSIX guidelines, GNU long option table, subcommand patterns, flag design |
| Output | `references/output.md` | Stream separation details, color codes, ANSI escapes, NO_COLOR spec, pager setup |
| Exit codes | `references/exit-codes.md` | Standard/extended code tables, signal exit codes, partial success patterns |
| Interaction | `references/interaction.md` | TTY detection, prompting patterns, confirmation levels, progress display, error format |
| Configuration | `references/configuration.md` | Full hierarchy, XDG spec, env var catalog, config file formats, secret handling |
| Signals | `references/signals.md` | Full signal table, SIGPIPE handling, crash-only design, child process signals |

## Output Streams

This is the single most important convention. Mixing data and diagnostics in
stdout is the #1 way to break composability.

- **stdout is data.** Primary output goes to stdout -- query results,
  computed values, formatted data. This is what gets piped to the next
  command or redirected to a file.
- **stderr is diagnostics.** Progress indicators, status messages, warnings,
  errors, and debug output go to stderr. Users see stderr in the terminal
  even when stdout is redirected.
- **Check each stream independently.** stdout may be piped while stderr is
  still a TTY. Adapt output format per-stream: human-readable when TTY,
  machine-parseable when piped.
- **No animations when not a TTY.** Disable spinners, progress bars, and
  color when the target stream is not an interactive terminal. This prevents
  CI logs from becoming escape-code garbage.
- **Print something within 100ms.** Before any network request or long
  operation, print a status line to stderr. Silence looks like a hang.
- **Tell the user what changed.** When a command modifies state, describe
  what happened and suggest what to do next.

## Arguments

- **POSIX short flags, GNU long flags.** Single-letter options use `-x`,
  multi-letter use `--long-name`. Every short flag must have a long
  equivalent. Reserve one-letter flags for frequently-used options.
- **`--` terminates options.** Everything after `--` is an operand, even if
  it starts with `-`. This is POSIX Guideline 10 and is non-negotiable.
- **Prefer flags over positional arguments.** Flags are self-documenting.
  Exception: primary action on a single target (`rm file.txt`,
  `cat file.txt`). Two or more positional args for different things is a
  design smell.
- **`-` means stdin/stdout.** When a command accepts file arguments, `-`
  means read from stdin (or write to stdout when context is clear).
- **Use standard flag names.** `-h`/`--help`, `--version`, `-v`/`--verbose`,
  `-q`/`--quiet`, `-f`/`--force`, `-n`/`--dry-run`, `-o`/`--output`,
  `--json`, `--no-color`, `--no-input`. Don't reinvent these.
- **Make flags order-independent.** Users add flags by pressing up-arrow and
  appending. `mycmd --flag subcmd` and `mycmd subcmd --flag` should both
  work where possible.

## Subcommands

- **`noun verb` or `verb noun`, pick one and be consistent.** Don't mix
  ordering styles. `docker container create` and `docker image pull` follow
  `noun verb`.
- **Support help at every level.** `mycmd --help`, `mycmd subcmd --help`,
  and `mycmd help subcmd` should all work.
- **No catch-all subcommand.** Don't interpret unknown first arguments as
  an implicit default subcommand. This prevents you from ever adding new
  subcommands.
- **No arbitrary abbreviations.** If `mycmd i` aliases `mycmd install`,
  you can never add `mycmd init`. Aliases must be explicit and stable.

## Exit Codes

- **0 = success, 1 = error, 2 = usage error.** This covers most programs.
  Only define additional codes when callers need to distinguish specific
  failure modes.
- **Signal exit codes use 128+N.** SIGINT (Ctrl-C) exits 130, SIGTERM exits
  143. Preserve this convention so calling scripts can distinguish "user
  cancelled" from "error."
- **Never return 0 on failure.** Scripts depend on exit codes via `$?` and
  `set -e`. A false success silently breaks pipelines.

## Configuration

- **Flags > env vars > project config > user config > system config >
  defaults.** This is the universal precedence hierarchy. A flag always
  wins over an env var, which always wins over a config file.
- **Follow XDG for user-level files.** Use `$XDG_CONFIG_HOME/myapp/` (default
  `~/.config/myapp/`), not `~/.myapp`. Respect `XDG_DATA_HOME`,
  `XDG_STATE_HOME`, `XDG_CACHE_HOME`.
- **Respect well-known environment variables.** `NO_COLOR`, `FORCE_COLOR`,
  `DEBUG`, `EDITOR`, `PAGER`, `HTTP_PROXY`/`HTTPS_PROXY`, `TMPDIR`, `HOME`,
  `TERM`, `LINES`, `COLUMNS`. Check these before inventing app-specific
  alternatives.
- **Never read secrets from environment variables.** They leak through `ps`,
  Docker inspect, systemd, and process listings. Accept secrets via
  `--password-file`, stdin, or a credential helper.
- **Never read secrets from flags.** `--password=secret` leaks into `ps`
  output and shell history. Use `--password-file` or stdin.

## Color and Terminal Output

- **Disable color when:** stdout/stderr is not a TTY (check each
  independently), `NO_COLOR` is set and non-empty, `TERM=dumb`, or
  `--no-color` is passed.
- **Support `FORCE_COLOR` or `--color`** to override detection and force
  color output when the user explicitly wants it.
- **Use color intentionally.** Red for errors, green for success, yellow
  for warnings. Don't paint everything -- if everything is colored, nothing
  stands out.
- **Use a color library.** Don't hand-code ANSI escape sequences. Libraries
  handle NO_COLOR, TERM detection, and cross-platform differences.

## Interactive Behavior

- **Only prompt when stdin is a TTY.** If stdin is not interactive, fail
  with an error telling the user which flag to pass. Never hang waiting for
  input that will never come.
- **Provide `--no-input`.** An explicit flag to disable all prompts. Required
  for CI/CD, cron, and automation.
- **Confirm before destructive actions.** Prompt for `y/N` interactively,
  require `--force` non-interactively. For severe operations (deleting
  infrastructure), require typing the resource name.
- **Provide `--dry-run`.** For any state-modifying command, let users
  preview what would happen without executing it.
- **Don't echo passwords.** Disable terminal echo when accepting secret
  input. Provide `--password-file` as a non-interactive alternative.

## Signal Handling

- **Respond to SIGINT immediately.** Print "Shutting down..." before
  starting cleanup. Add a timeout so cleanup can't hang forever.
- **Second Ctrl-C skips cleanup.** Tell the user: "press Ctrl+C again to
  force." Then exit immediately.
- **Handle SIGTERM like SIGINT.** Process managers (systemd, Docker, K8s)
  send SIGTERM before SIGKILL. Complete cleanup within the grace period.
- **Handle SIGPIPE silently.** When the user pipes your output to `head`,
  don't print an error when the pipe closes. Exit quietly with code 141
  or 0.
- **Design for crash recovery.** Use atomic file operations (write to temp,
  rename). Check for incomplete state on startup. Don't require cleanup to
  complete for correctness.

## Help Text

- **Support `-h` and `--help`.** Both must show help. Don't overload `-h`
  for anything else.
- **Show concise help with no arguments.** When a command requires arguments
  and gets none, show a brief description, one or two examples, and a
  pointer to `--help` for the full listing.
- **Lead with examples.** Users read examples first. Show common invocations
  before the flag catalog.
- **Suggest corrections.** When the user types a close misspelling, suggest
  the correct command. Don't auto-execute the suggestion.
- **Support `--version`.** Print the version and exit. Format: program name
  and version, optionally with build metadata.

## Error Messages

- **Structure errors consistently.** Use a format like:
  `error: <what went wrong>` followed by `hint: <how to fix it>`.
- **Be actionable.** Don't say "permission denied" -- say "permission denied;
  run with sudo or use --config-dir for a writable location."
- **Put important information last.** The eye lands at the bottom of output.
  Put the error summary and fix there, not the stack trace.
- **No stack traces by default.** Put them behind `--verbose` or write to a
  debug log file. Signal-to-noise ratio matters.
- **Make bug reporting easy.** For unexpected errors, provide a URL or
  command to file a bug, pre-populated with diagnostic information.

## Structured Output

- **Support `--json` for machine-readable output.** Output well-formed JSON
  to stdout. Use consistent field names across commands.
- **Support `--plain` for scriptable tabular output.** One record per line,
  no color, no decorations. Useful for `grep` and `awk` pipelines.
- **Use a pager for large output.** Pipe through `less -FIRX` when stdout
  is a TTY. Respect the `PAGER` environment variable. Don't page when
  output fits one screen.

## Robustness

- **Validate input early.** Check arguments and flags before starting work.
  Report all validation errors at once, not one at a time.
- **Make operations idempotent where possible.** Running the same command
  twice should produce the same result, not an error or doubled state.
- **Make operations recoverable.** If the program fails partway through, the
  user should be able to hit up-arrow and enter to retry from where it
  left off.
- **Set network timeouts.** Allow timeout configuration and have a
  reasonable default. Never hang indefinitely on a network call.

## Naming

- **Lowercase, short, memorable.** `curl` not `DownloadURL`. Use only
  lowercase letters and hyphens. Keep it easy to type.
- **Avoid ambiguous subcommand names.** Don't have both "update" and
  "upgrade". Use distinct verbs or disambiguate with extra words.

## Future-Proofing

- **Keep changes additive.** Add new flags rather than changing existing
  behavior. If you must break compatibility, warn in advance.
- **Warn before deprecation.** When a user invokes a deprecated flag, tell
  them what to use instead and when the old form will be removed.
- **Changing human-readable output is OK.** Encourage `--json` or `--plain`
  for scripts. Human-readable output is not a stable interface.

## Application

When **writing** CLI code:
- Apply all conventions silently. Don't narrate each rule.
- Use an argument parsing library (clap, cobra, argparse, commander).
- Wire up stdout/stderr correctly from the start. Retrofitting is painful.
- Handle SIGINT/SIGTERM from day one. Don't defer signal handling.

When **reviewing** CLI code:
- Check stdout vs stderr usage first. This is the most common mistake.
- Verify exit codes match actual success/failure.
- Confirm `--help`, `--version`, and `--no-color` are supported.
- Look for secret leaks in flags and env vars.

## Integration

This skill covers CLI platform concerns -- the interface between a program
and the terminal/shell/pipeline. Language-specific implementation details
(argument parsing libraries, terminal I/O APIs) come from language skills
(golang, javascript, etc.). The coding discipline skill governs general
workflow.

**Programs are composable when they respect boundaries.**
