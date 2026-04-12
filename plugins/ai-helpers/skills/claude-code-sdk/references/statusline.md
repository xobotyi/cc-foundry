# Status Line

The status line is a customizable bar at the bottom of Claude Code that runs a shell script, receives JSON session data
on stdin, and displays whatever the script prints to stdout. It does not consume API tokens.

## Configuration

Add a `statusLine` field to user settings (`~/.claude/settings.json`) or project settings (`.claude/settings.json`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 2,
    "refreshInterval": 5
  }
}
```

### Configuration Fields

- `type` (required): Must be `"command"`
- `command` (required): Path to script or inline shell command. Runs in a shell, so pipes and jq work inline.
- `padding` (optional, default `0`): Extra horizontal spacing in characters, added on top of built-in interface spacing
- `refreshInterval` (optional): Re-run the command every N seconds in addition to event-driven updates. Minimum `1`. Use
  for time-based data (clocks) or when background subagents change state while the main session is idle. Leave unset to
  run only on events.

### Disabling

Delete the `statusLine` field from settings, or run `/statusline clear`. Setting `disableAllHooks: true` in settings
also disables the status line.

## Update Triggers

The script runs after:

- Each new assistant message
- Permission mode changes
- Vim mode toggles

Updates are debounced at 300ms — rapid changes batch together. If a new update triggers while the script is still
running, the in-flight execution is cancelled. Script changes take effect on the next triggered update.

When `refreshInterval` is set, the script also re-runs on that timer independently of event triggers.

## Script Contract

- **Input:** JSON on stdin (see [JSON Input Schema](#json-input-schema))
- **Output:** Each line printed to stdout becomes a separate row in the status area
- **Exit code:** Non-zero or no output causes the status line to go blank
- **Performance:** Scripts run frequently during active sessions; cache slow operations (see
  [Caching](#caching-expensive-operations))

## JSON Input Schema

The script receives this JSON structure on stdin:

```json
{
  "cwd": "/current/working/directory",
  "session_id": "abc123...",
  "session_name": "my-session",
  "transcript_path": "/path/to/transcript.jsonl",
  "model": {
    "id": "claude-opus-4-6",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory",
    "added_dirs": [],
    "git_worktree": "feature-xyz"
  },
  "version": "2.1.90",
  "output_style": {
    "name": "default"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  },
  "context_window": {
    "total_input_tokens": 15234,
    "total_output_tokens": 4521,
    "context_window_size": 200000,
    "used_percentage": 8,
    "remaining_percentage": 92,
    "current_usage": {
      "input_tokens": 8500,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 2000
    }
  },
  "exceeds_200k_tokens": false,
  "rate_limits": {
    "five_hour": {
      "used_percentage": 23.5,
      "resets_at": 1738425600
    },
    "seven_day": {
      "used_percentage": 41.2,
      "resets_at": 1738857600
    }
  },
  "vim": {
    "mode": "NORMAL"
  },
  "agent": {
    "name": "security-reviewer"
  },
  "worktree": {
    "name": "my-feature",
    "path": "/path/to/.claude/worktrees/my-feature",
    "branch": "worktree-my-feature",
    "original_cwd": "/path/to/project",
    "original_branch": "main"
  }
}
```

### Field Reference

- `model.id` (string) — model identifier (e.g., `claude-opus-4-6`)
- `model.display_name` (string) — display name (e.g., `Opus`)
- `cwd` (string) — current working directory (same as `workspace.current_dir`)
- `workspace.current_dir` (string) — current working directory (preferred over `cwd`)
- `workspace.project_dir` (string) — directory where Claude Code was launched
- `workspace.added_dirs` (string[]) — directories added via `/add-dir` or `--add-dir`
- `workspace.git_worktree` (string) — git worktree name when inside a linked worktree
- `cost.total_cost_usd` (number) — total session cost in USD
- `cost.total_duration_ms` (number) — wall-clock time since session start
- `cost.total_api_duration_ms` (number) — time spent waiting for API responses
- `cost.total_lines_added` (number) — lines of code added
- `cost.total_lines_removed` (number) — lines of code removed
- `context_window.total_input_tokens` (number) — cumulative input tokens across session
- `context_window.total_output_tokens` (number) — cumulative output tokens across session
- `context_window.context_window_size` (number) — max context window (200000 default, 1000000 for extended)
- `context_window.used_percentage` (number) — pre-calculated context usage percentage
- `context_window.remaining_percentage` (number) — pre-calculated context remaining percentage
- `context_window.current_usage` (object) — token counts from last API call (see below)
- `exceeds_200k_tokens` (boolean) — whether last response exceeded 200k tokens (fixed threshold)
- `rate_limits.five_hour.used_percentage` (number) — 5-hour rate limit usage (0-100)
- `rate_limits.five_hour.resets_at` (number) — Unix epoch seconds when 5-hour window resets
- `rate_limits.seven_day.used_percentage` (number) — 7-day rate limit usage (0-100)
- `rate_limits.seven_day.resets_at` (number) — Unix epoch seconds when 7-day window resets
- `session_id` (string) — unique session identifier
- `session_name` (string) — custom name set with `--name` or `/rename`
- `transcript_path` (string) — path to conversation transcript file
- `version` (string) — Claude Code version
- `output_style.name` (string) — name of current output style
- `vim.mode` (string) — vim mode (`NORMAL` or `INSERT`) when vim mode is enabled
- `agent.name` (string) — agent name when running with `--agent` or agent settings
- `worktree.name` (string) — active worktree name
- `worktree.path` (string) — absolute path to worktree directory
- `worktree.branch` (string) — git branch for worktree (e.g., `worktree-my-feature`)
- `worktree.original_cwd` (string) — directory before entering worktree
- `worktree.original_branch` (string) — git branch before entering worktree

### Absent Fields

These fields are omitted from the JSON when not applicable:

- `session_name` — only when custom name set with `--name` or `/rename`
- `workspace.git_worktree` — only inside a linked git worktree
- `vim` — only when vim mode is enabled
- `agent` — only when running with `--agent` flag or agent settings
- `worktree` — only during `--worktree` sessions; when present, `branch` and `original_branch` may also be absent for
  hook-based worktrees
- `rate_limits` — only for Claude.ai subscribers (Pro/Max) after the first API response. Each window (`five_hour`,
  `seven_day`) may be independently absent.

### Nullable Fields

- `context_window.current_usage` — `null` before the first API call
- `context_window.used_percentage`, `context_window.remaining_percentage` — may be `null` early in the session

Handle absent fields with conditional access and null values with fallback defaults.

### Context Window Detail

The `current_usage` object contains token counts from the most recent API call:

- `input_tokens` — input tokens in current context
- `output_tokens` — output tokens generated
- `cache_creation_input_tokens` — tokens written to cache
- `cache_read_input_tokens` — tokens read from cache

`used_percentage` is calculated from input tokens only:
`input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. It does not include `output_tokens`. Match this
formula when calculating manually.

Cumulative totals (`total_input_tokens`, `total_output_tokens`) sum all tokens across the session and may exceed context
window size. Use `used_percentage` or `current_usage` for accurate context state.

## Output Capabilities

### Multiple Lines

Each `echo`/`print` statement produces a separate row in the status area:

```bash
echo "Line 1: model and directory"
echo "Line 2: context bar and cost"
```

### ANSI Color Codes

Use ANSI escape sequences for terminal colors:

| Code       | Color   | Code       | Color               |
| ---------- | ------- | ---------- | ------------------- |
| `\033[30m` | Black   | `\033[90m` | Bright black (gray) |
| `\033[31m` | Red     | `\033[91m` | Bright red          |
| `\033[32m` | Green   | `\033[92m` | Bright green        |
| `\033[33m` | Yellow  | `\033[93m` | Bright yellow       |
| `\033[34m` | Blue    | `\033[94m` | Bright blue         |
| `\033[35m` | Magenta | `\033[95m` | Bright magenta      |
| `\033[36m` | Cyan    | `\033[96m` | Bright cyan         |
| `\033[37m` | White   | `\033[97m` | Bright white        |
| `\033[0m`  | Reset   | `\033[1m`  | Bold                |

Use `echo -e` in Bash or `printf '%b'` (more reliable across shells) to interpret escape sequences. In Python, embed
directly in f-strings. In Node.js, use `\x1b` instead of `\033`.

### Clickable Links (OSC 8)

Make text clickable using OSC 8 escape sequences (Cmd+click on macOS, Ctrl+click on Windows/Linux):

```
\e]8;;URL\aLINK_TEXT\e]8;;\a
```

**Bash (printf is more reliable than echo -e):**

```bash
printf '%b' "\e]8;;https://github.com/user/repo\arepo-name\e]8;;\a\n"
```

**Python:**

```python
print(f"\033]8;;https://github.com/user/repo\arepo-name\033]8;;\a")
```

**Node.js:**

```javascript
console.log(`\x1b]8;;https://github.com/user/repo\x07repo-name\x1b]8;;\x07`);
```

Requires a terminal that supports hyperlinks: iTerm2, Kitty, WezTerm. Terminal.app does not support clickable links. Set
`FORCE_HYPERLINK=1` before launching Claude Code to override detection for terminals not in the auto-detection list:

```bash
FORCE_HYPERLINK=1 claude
```

## Caching Expensive Operations

Scripts run frequently. Commands like `git status` or `git diff` can cause lag in large repos. Cache results to a temp
file keyed by `session_id` (stable within a session, unique across sessions — do NOT use `$$`/PID which changes every
invocation):

```bash
SESSION_ID=$(echo "$input" | jq -r '.session_id')
CACHE_FILE="/tmp/statusline-cache-$SESSION_ID"
CACHE_MAX_AGE=5  # seconds

cache_is_stale() {
    [ ! -f "$CACHE_FILE" ] || \
    [ $(($(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || \
      stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0))) -gt $CACHE_MAX_AGE ]
}

if cache_is_stale; then
    # Run expensive operations and write to $CACHE_FILE
    git branch --show-current > "$CACHE_FILE"
fi

# Read cached result
BRANCH=$(cat "$CACHE_FILE")
```

## Plugin Delivery

Plugins can ship status line scripts and configure them via default settings in `plugin.json`:

```json
{
  "defaultSettings": {
    "statusLine": {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/scripts/statusline.sh"
    }
  }
}
```

Use `${CLAUDE_PLUGIN_ROOT}` to reference files within the plugin directory. The path resolves at runtime.

## Windows

On Windows, Claude Code runs status line commands through Git Bash. Invoke PowerShell explicitly:

```json
{
  "statusLine": {
    "type": "command",
    "command": "powershell -NoProfile -File C:/Users/username/.claude/statusline.ps1"
  }
}
```

Or use Bash scripts directly — they work through Git Bash without additional configuration.

## Testing

Test scripts with mock JSON input:

```bash
echo '{"model":{"display_name":"Opus"},"workspace":{"current_dir":"/home/user/project"},"context_window":{"used_percentage":25},"session_id":"test-session-abc"}' | ./statusline.sh
```

## Troubleshooting

- **Status line not appearing** — script not executable (`chmod +x`), outputs to stderr not stdout, or workspace trust
  not accepted. Run `claude --debug` to log exit code and stderr.
- **Shows `--` or empty values** — fields are `null` before first API response. Add fallbacks (e.g., `// 0` in jq,
  `or 0` in Python).
- **Unexpected context percentage** — use `used_percentage` — cumulative totals (`total_input_tokens`) may exceed
  context window size.
- **OSC 8 links not clickable** — terminal doesn't support OSC 8 (Terminal.app), or set `FORCE_HYPERLINK=1`. SSH/tmux
  may strip OSC sequences.
- **Escape sequences as literal text** — use `printf '%b'` instead of `echo -e`.
- **Display glitches** — complex escape sequences can garble output on UI updates. Simplify to plain text if persistent.
- **Stale during idle** — background subagents change state but no event fires. Set `refreshInterval` to poll on a
  timer.
- **`statusline skipped` notification** — workspace trust not accepted. Restart Claude Code and accept the trust prompt.
- **Script hangs or blanks** — slow scripts block updates. A new trigger cancels in-flight scripts. Keep scripts fast.
- **Notifications truncate output** — system notifications share the status line row on the right side. Narrow terminals
  truncate.

## UI Behavior

- The status line temporarily hides during autocomplete suggestions, the help menu, and permission prompts
- System notifications (MCP errors, auto-updates, context-low warning) display on the right side of the status line row
- Verbose mode adds a token counter to the notification area
