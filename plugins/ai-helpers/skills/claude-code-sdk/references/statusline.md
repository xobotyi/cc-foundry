# Status Line Reference

> **Latest docs:** https://code.claude.com/docs/en/statusline.md

A customizable bar at the bottom of Claude Code. Runs any shell script you configure — the script
receives JSON session data on stdin and displays whatever it prints to stdout.

## Configuration

Add `statusLine` to `~/.claude/settings.json` (user) or `.claude/settings.json` (project):

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 2
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `"command"` |
| `command` | Yes | Script path or inline shell command |
| `padding` | No | Extra horizontal spacing in characters (default `0`) |

**Critical — command runs from CWD:** The status line command executes from Claude Code's
current working directory. If the `command` uses a relative path (e.g., `./statusline.sh`
or `.claude/statusline.sh`), it will break whenever Claude performs a `cd` operation to a
different directory. **Always use absolute paths** — either a full path
(`/home/user/.claude/statusline.sh`), home directory expansion (`~/.claude/statusline.sh`),
or an environment variable (`"$CLAUDE_PROJECT_DIR/.claude/statusline.sh"`).

**Inline command** (no script file needed):

```json
{
  "statusLine": {
    "type": "command",
    "command": "jq -r '[\\(.model.display_name)] \\(.context_window.used_percentage // 0)% context'"
  }
}
```

**Interactive setup:** `/statusline show model name and context percentage` — Claude generates the
script and updates settings automatically.

**Disable:** `/statusline remove` or delete the `statusLine` key from settings.

**Note:** If `disableAllHooks` is `true`, the status line is also disabled.

## How It Works

- Runs after each new assistant message, permission mode change, or vim mode toggle
- Updates debounced at 300ms — rapid changes batch; script runs once things settle
- If a new update triggers while script is still running, in-flight execution is cancelled
- Script changes don't appear until the next interaction triggers an update
- Does **not** consume API tokens
- Temporarily hidden during autocomplete, help menu, and permission prompts

**Output capabilities:**
- Multiple lines: each `echo` creates a separate row
- Colors: ANSI escape codes (`\033[32m` green, `\033[33m` yellow, `\033[0m` reset)
- Clickable links: OSC 8 escape sequences (requires iTerm2, Kitty, or WezTerm)

## JSON Input Schema

Script receives this structure via stdin on each update:

```json
{
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "version": "1.0.80",
  "model": {
    "id": "claude-opus-4-6",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory"
  },
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
  "vim": { "mode": "NORMAL" },
  "agent": { "name": "security-reviewer" }
}
```

**Fields that may be absent:**
- `vim` — only present when vim mode is enabled
- `agent` — only present when running with `--agent` flag or agent settings configured

**Fields that may be `null`:**
- `context_window.current_usage` — `null` before the first API call
- `context_window.used_percentage`, `context_window.remaining_percentage` — may be `null` early
  in the session

Always use fallbacks: `// 0` in jq, `or 0` in Python, `|| 0` in JS.

## Available Fields

| Field | Description |
|-------|-------------|
| `model.id` | Model identifier (e.g., `claude-opus-4-6`) |
| `model.display_name` | Human-readable name (e.g., `Opus`) |
| `cwd` | Current working directory (alias for `workspace.current_dir`) |
| `workspace.current_dir` | Current working directory (preferred) |
| `workspace.project_dir` | Directory where Claude Code was launched |
| `session_id` | Unique session identifier |
| `transcript_path` | Path to conversation transcript file |
| `version` | Claude Code version string |
| `output_style.name` | Name of the active output style |
| `vim.mode` | `NORMAL` or `INSERT` when vim mode is enabled |
| `agent.name` | Agent name when running with `--agent` flag |
| `cost.total_cost_usd` | Session cost in USD |
| `cost.total_duration_ms` | Total elapsed time since session start (ms) |
| `cost.total_api_duration_ms` | Time spent waiting for API responses (ms) |
| `cost.total_lines_added` | Lines of code added in session |
| `cost.total_lines_removed` | Lines of code removed in session |
| `context_window.context_window_size` | Max context tokens (200000 default, 1000000 extended) |
| `context_window.used_percentage` | Pre-calculated usage percentage |
| `context_window.remaining_percentage` | Pre-calculated remaining percentage |
| `context_window.total_input_tokens` | Cumulative input tokens (whole session) |
| `context_window.total_output_tokens` | Cumulative output tokens (whole session) |
| `context_window.current_usage` | Token counts from most recent API call (see below) |
| `exceeds_200k_tokens` | Whether recent response exceeded 200k tokens (fixed threshold) |

### Context Window Detail

`current_usage` sub-fields (null before first API call):

| Field | Description |
|-------|-------------|
| `input_tokens` | Input tokens in current context |
| `output_tokens` | Output tokens generated |
| `cache_creation_input_tokens` | Tokens written to cache |
| `cache_read_input_tokens` | Tokens read from cache |

**`used_percentage` formula:** `(input_tokens + cache_creation_input_tokens + cache_read_input_tokens)
/ context_window_size × 100` — does **not** include `output_tokens`.

Use `current_usage` (not cumulative totals) for accurate context percentage. Cumulative totals
accumulate across the whole session and can exceed context window size.

## Implementation Notes

**Script contract:** Read JSON from stdin, print display text to stdout. Any language works —
the script is a standalone process. Non-zero exit or no output produces a blank status line.

**Multiple lines:** Each line of stdout becomes a separate status line row.

**Colors:** Use ANSI escape codes (`\033[32m` for green, `\033[0m` for reset). Prefer
`printf '%b'` over `echo -e` for reliable escape handling across shells.

**Clickable links:** Use OSC 8 escape sequences (`\e]8;;<url>\a<text>\e]8;;\a`). Only works
in iTerm2, Kitty, and WezTerm. Terminal.app and SSH/tmux sessions may strip these sequences.

**Caching slow operations:** Each invocation spawns a new process — `$$` and PID differ every
time. Cache to a fixed filename (e.g., `/tmp/statusline-cache`) with a staleness check.
Operations like `git status` on large repos cause visible lag without caching.

**Null handling:** Several fields are `null` before the first API call. Always use fallbacks
in your parsing (`// 0` in jq, `or 0` in Python, `|| 0` in JS).

## Plugin Delivery

Status line scripts can ship in a plugin directory, but users must configure them manually:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/plugins/my-plugin/statusline.sh"
  }
}
```

Plugins cannot auto-enable the status line — the user must add `statusLine` to their settings.

## Tips and Pitfalls

| Tip | Detail |
|-----|--------|
| Test with mock input | `echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":25}}' | ./statusline.sh` |
| Keep output short | Long output truncates or wraps on narrow terminals |
| Cache slow commands | `git status`/`git diff` on large repos cause lag; cache to `/tmp/fixed-name` |
| Fixed cache filename | Never use `$$` or PID — each run is a new process, cache is never reused |
| Use `printf '%b'` not `echo -e` | More reliable escape sequence handling across shells |
| Notifications share the row | MCP errors, token warnings display on the right; narrow terminals truncate status |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Status line not appearing | `chmod +x` the script; check stdout (not stderr); verify `disableAllHooks` is not `true` |
| Empty or `--` values | Fields are `null` before first API call; add `// 0` fallbacks |
| Wrong context percentage | Use `used_percentage` not cumulative totals; cumulative can exceed window size |
| OSC 8 links not clickable | Requires iTerm2/Kitty/WezTerm; Terminal.app unsupported; SSH/tmux may strip OSC sequences |
| Escape sequences as literal text | Use `printf '%b'` instead of `echo -e` |
| Display glitches | Simplify to plain text; multi-line + escape codes are most prone to rendering issues |
| Script hangs or errors | Non-zero exit or no output → blank status line; test independently with mock input |
| Status line truncated | Terminal too narrow; notifications on right side consume space |
