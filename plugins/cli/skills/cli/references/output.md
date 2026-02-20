# Output Conventions

Detailed conventions for stdout, stderr, structured output, color, and
terminal detection. Extends the behavioral rules in SKILL.md with full
patterns and edge cases.

## Stream Separation

### stdout: Data Only

stdout carries the program's primary data output -- the content that gets
piped to the next command or redirected to a file.

What goes to stdout:
- Query results, computed output, formatted data
- JSON/CSV/plain-text data when `--json` or `--plain` is passed
- Content that would be piped: `mycmd | grep pattern`

What does NOT go to stdout:
- Progress indicators
- Status messages ("Processing file...")
- Warnings
- Errors
- Debug/log output

### stderr: Diagnostics

stderr carries everything else: progress, status, diagnostics, errors.

This separation is critical because:
- Pipes connect stdout of one program to stdin of the next
- Progress bars in stdout corrupt downstream data
- Users see stderr in the terminal even when stdout is redirected

### Detection and Adaptation

Check whether stdout and stderr are TTYs independently:

```
if stdout is TTY:
    human-readable output to stdout
else:
    machine-parseable output to stdout

if stderr is TTY:
    colored diagnostics, progress bars to stderr
else:
    plain diagnostics to stderr, no progress animations
```

## Structured Output

### `--json` Flag

Provide `--json` for machine-readable output:
- Output well-formed JSON to stdout
- One JSON object per logical result (or a JSON array)
- Use consistent field names across commands
- Include metadata fields (version, timestamp) when useful

### `--plain` Flag

When human-readable output breaks machine parseability (e.g., wrapped table
cells), provide `--plain` for simple tabular output:
- One record per line
- Tab or space delimited
- No color codes
- No progress indicators

## Human-Readable Output

### Success Output

- Display output on success, but keep it brief.
- If a command changes state, tell the user what happened.
- Suggest what to do next when commands form a workflow.

### Progress Indication

- Print something within 100ms. If making a network request, say so before
  starting.
- Use a spinner or progress bar for long operations.
- Show estimated time remaining when possible.
- Animate something to indicate the program is still working.
- Direct progress indicators to stderr so they don't interfere with piped
  stdout.
- Disable animations when stderr is not a TTY (CI environments).

### Pager Support

For large output, pipe through a pager (e.g., `less -FIRX`):
- Only when stdout is a TTY
- Respect the `PAGER` environment variable
- `less -FIRX`: no paging if content fits one screen, case-insensitive
  search, color passthrough, leaves content on screen after quit

## Color Output

### When to Use Color

- Use color intentionally: highlight important information, distinguish
  errors, aid scannability.
- Don't overuse -- if everything is colored, nothing stands out.
- Put critical information at the end of output where the eye lands first.
- Use red sparingly and intentionally (errors, destructive actions).

### Color Disable Conditions

Disable color output when ANY of these conditions is true:

1. **stdout/stderr is not a TTY.** Check each stream independently --
   if piping stdout but stderr is still a terminal, keep stderr colors.
2. **`NO_COLOR` is set and non-empty** (regardless of value). This is the
   [no-color.org](https://no-color.org/) standard.
3. **`TERM=dumb`** -- indicates a terminal without color support.
4. **`--no-color` flag** is passed.
5. **`MYAPP_NO_COLOR`** environment variable is set (app-specific override).

### Color Enable Override

Support `FORCE_COLOR` or `--color` to force color output even when the
above conditions would disable it. User-level config and per-instance flags
override `NO_COLOR`.

### NO_COLOR Specification

From [no-color.org](https://no-color.org/):

> Command-line software which adds ANSI color to its output by default
> should check for a `NO_COLOR` environment variable that, when present
> and not an empty string (regardless of its value), prevents the addition
> of ANSI color.

Key points:
- Check `NO_COLOR != ""`, not `NO_COLOR == "1"`.
- `NO_COLOR` only affects color, not other styling (bold, underline, italic).
- User-level config files and CLI flags may override `NO_COLOR`.

### ANSI Escape Code Basics

ANSI escape sequences start with `ESC[` (hex `\x1B[`), known as CSI
(Control Sequence Introducer).

Common SGR (Select Graphic Rendition) codes:

| Code | Effect |
|------|--------|
| `0` | Reset all |
| `1` | Bold |
| `2` | Dim |
| `3` | Italic |
| `4` | Underline |
| `31` | Red foreground |
| `32` | Green foreground |
| `33` | Yellow foreground |
| `34` | Blue foreground |

Example: `\x1B[1;31mERROR\x1B[0m` prints "ERROR" in bold red, then resets.

Extended colors:
- 256-color: `\x1B[38;5;{ID}m` (foreground), `\x1B[48;5;{ID}m` (background)
- RGB: `\x1B[38;2;{r};{g};{b}m` (foreground)

Use a color library rather than hand-coding escape sequences. Libraries
handle detection, NO_COLOR, and cross-platform differences.
