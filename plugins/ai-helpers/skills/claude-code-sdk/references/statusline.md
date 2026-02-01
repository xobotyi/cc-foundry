# Status Line Reference

> **Latest docs:** https://code.claude.com/docs/en/statusline.md

Custom status line displays contextual information at the bottom of
Claude Code, similar to terminal prompts (PS1) in shells like Oh-my-zsh.

## Configuration

Add `statusLine` to `.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

| Field | Description |
|-------|-------------|
| `type` | Must be `"command"` |
| `command` | Path to script (absolute or `~/` relative) |
| `padding` | Optional: set to `0` to let status line reach edge |

**Settings scopes apply:** Can be configured at user, project, or local level.

## How It Works

- Updated when conversation messages change
- Updates run at most every 300ms
- First line of stdout becomes status line text
- ANSI color codes supported
- JSON context passed to script via stdin

## JSON Input Structure

Script receives session data via stdin:

```json
{
  "hook_event_name": "Status",
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.json",
  "cwd": "/current/working/directory",
  "model": {
    "id": "claude-opus-4-1",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory"
  },
  "version": "1.0.80",
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
    "used_percentage": 42.5,
    "remaining_percentage": 57.5,
    "current_usage": {
      "input_tokens": 8500,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 2000
    }
  }
}
```

## Available Fields

### Model

| Field | Description |
|-------|-------------|
| `model.id` | Model identifier (e.g., `claude-opus-4-1`) |
| `model.display_name` | Human-readable name (e.g., `Opus`) |

### Workspace

| Field | Description |
|-------|-------------|
| `cwd` | Current working directory |
| `workspace.current_dir` | Same as `cwd` |
| `workspace.project_dir` | Original project directory |

### Session

| Field | Description |
|-------|-------------|
| `session_id` | Unique session identifier |
| `transcript_path` | Path to session transcript |
| `version` | Claude Code version |
| `output_style.name` | Active output style |

### Cost

| Field | Description |
|-------|-------------|
| `cost.total_cost_usd` | Session cost in USD |
| `cost.total_duration_ms` | Total session duration |
| `cost.total_api_duration_ms` | Time spent in API calls |
| `cost.total_lines_added` | Lines added in session |
| `cost.total_lines_removed` | Lines removed in session |

### Context Window

| Field | Description |
|-------|-------------|
| `context_window.total_input_tokens` | Cumulative input tokens |
| `context_window.total_output_tokens` | Cumulative output tokens |
| `context_window.context_window_size` | Max context size (e.g., 200000) |
| `context_window.used_percentage` | Pre-calculated usage (0-100) |
| `context_window.remaining_percentage` | Pre-calculated remaining (0-100) |
| `context_window.current_usage` | Current context usage (may be `null`) |

### Current Usage (nested)

| Field | Description |
|-------|-------------|
| `current_usage.input_tokens` | Input tokens in current context |
| `current_usage.output_tokens` | Output tokens generated |
| `current_usage.cache_creation_input_tokens` | Tokens written to cache |
| `current_usage.cache_read_input_tokens` | Tokens read from cache |

## Interactive Setup

Run `/statusline` to have Claude Code help create a custom status line.
Provide instructions like `/statusline show model name in orange`.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Status line doesn't appear | Check script is executable (`chmod +x`) |
| No output | Ensure script writes to stdout, not stderr |
| Script errors | Test manually: `echo '{"model":{"display_name":"Test"}}' | ./script.sh` |

## Plugin Delivery

Status line scripts can be included in plugins but must be configured
via settings. Plugins cannot auto-enable statusLine — users must add
the `statusLine` configuration to their settings.

For project-wide status lines, add configuration to `.claude/settings.json`
(committed) or `.claude/settings.local.json` (gitignored).
