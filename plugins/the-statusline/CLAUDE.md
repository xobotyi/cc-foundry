# the-statusline Plugin

Auto-syncing status line for Claude Code sessions with context window usage, cost tracking, and
model information.

## How It Works

On every session start, the `sync-statusline.js` hook:

1. Copies `statusline.js` to `~/.claude/statusline.js`
2. Reads `~/.claude/settings.json` and patches the `statusLine` configuration if `type` or
   `command` differ from expected values
3. Preserves existing user preferences (e.g., `padding`) via object spread

The status line script receives session data via stdin and renders three rows:

- **Row 1** — Output style, model name, session cost (USD), API time
- **Row 2** — Context window remaining (%), input/output token ratio, cache hit rate
- **Row 3** — Current working directory (relative to project root, collapsed if too long)

Color urgency increases as context approaches limits: gray → yellow → orange → red.

## Components

| Type | Path | Purpose |
|------|------|---------|
| Hook | `hooks/sync-statusline.js` | SessionStart hook that syncs script and settings |
| Script | `statusline.js` | Status line renderer (installed to `~/.claude/`) |
| Config | `hooks/hooks.json` | Hook registration |

## Why User-Level Installation

Project-level status line configurations use relative script paths that break when agents change
working directory during multi-agent sessions. Installing to `~/.claude/` with an absolute path
ensures the status line persists regardless of cwd changes.

## Extension

To modify the status line display, edit `statusline.js` in this plugin directory and bump the
version in `.claude-plugin/plugin.json`. The hook propagates changes on the next session start.
