# Interactive Behavior

Detailed conventions for interactive and non-interactive modes, prompts,
confirmation dialogs, progress display, and user input. Extends the
behavioral rules in SKILL.md with patterns and edge cases.

## TTY Detection

The fundamental mechanism for deciding between interactive and
non-interactive behavior is checking whether stdin/stdout/stderr are
connected to a terminal (TTY).

```
if stdin is TTY:
    interactive input is possible (prompts, confirmations)
else:
    running in a pipe or script -- no prompts

if stdout is TTY:
    human-readable output (colors, tables, progress)
else:
    piped -- machine-readable output, no decorations

if stderr is TTY:
    show progress, spinners, interactive diagnostics
else:
    plain diagnostics only
```

Check each stream independently. A common pattern is stdout piped to
another program while stderr still shows progress in the terminal.

## Prompting

### When to Prompt

- Prompt when a required value is missing and stdin is a TTY.
- Prompt for confirmation before destructive or irreversible actions.
- Never prompt when stdin is not a TTY -- fail with an error telling
  the user which flag to pass.

### `--no-input` Flag

Always provide `--no-input` (or `--non-interactive`) to explicitly disable
all interactive prompts. When set:
- Skip all prompts
- If required input is missing, fail with an error
- Use defaults where available

This is essential for:
- CI/CD pipelines
- Scripted automation
- Cron jobs

### Password Input

When prompting for passwords or secrets:
- Disable echo (don't print characters as they're typed)
- Use platform-specific secure input APIs
- Provide a `--password-file` alternative for scripted use

## Confirmation Patterns

### Danger Levels

Different levels of destructive action warrant different confirmation
patterns:

**Mild** (delete a single file):
- Prompt with `y/N` (default no), or skip if clearly intentional
  (e.g., `rm` implies deletion)

**Moderate** (delete a directory, remote resource, bulk change):
- Prompt with `y/N` in interactive mode
- Require `--force` or `-f` in non-interactive mode
- Consider offering `--dry-run` to preview the operation

**Severe** (delete entire application, irreversible bulk operation):
- Require typing the name of the resource to confirm
- Support `--confirm="resource-name"` for scripted use
- Consider a mandatory `--force` flag even in interactive mode

### Dry Run

Provide `--dry-run` or `-n` for any operation that modifies state:
- Show exactly what would change without making changes
- Use the same code paths as the real operation where possible
- Clearly label output as a dry run

## Progress Display

### Principles

- Print something within 100ms of starting any non-trivial operation.
- Before a network request, print what you're about to do.
- Use spinners for indeterminate operations.
- Use progress bars when total size/count is known.
- Show estimated time remaining when possible.
- Animate to indicate the program is still working.

### Progress on stderr

All progress indicators go to stderr:
- Spinners, progress bars, status messages
- This keeps stdout clean for data output
- When stderr is not a TTY, suppress animations entirely

### Parallel Progress

When running multiple operations in parallel:
- Use a library that supports multiple progress bars (tqdm, indicatif)
- Ensure output doesn't interleave confusingly
- On error, show the full log for the failed operation

### Ctrl-C Behavior

When the user hits Ctrl-C during a long operation:
1. Print a message immediately ("Shutting down...")
2. Begin cleanup with a timeout
3. On second Ctrl-C, skip cleanup and exit immediately
4. Tell the user what the second Ctrl-C will do

Example:
```
^C Gracefully stopping... (press Ctrl+C again to force)
```

## Error Display

### Error Format

Structure error messages consistently:

```
error: <what went wrong>
  hint: <how to fix it>
```

Or with context:

```
error: cannot write to /etc/config
  cause: permission denied
  hint: run with sudo or use --config-dir to specify a writable location
```

### Error Guidelines

1. Put the most important information last (where the eye lands).
2. Use red sparingly -- only for the error label or critical detail.
3. Provide actionable hints: what to do next, which flag to pass.
4. Group similar errors under a single header rather than printing many
   similar lines.
5. For unexpected errors, include debug info and instructions for filing
   a bug report.
6. Don't show stack traces by default -- put them behind `--verbose`
   or write to a log file.

## Letting Users Escape

- Make Ctrl-C work at all times, even during network I/O.
- If your program wraps another process where Ctrl-C doesn't propagate,
  document the escape sequence.
- For multi-step wizards, support going back to the previous step.
