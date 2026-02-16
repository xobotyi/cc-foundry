# the-statusline Plugin

Auto-syncing status line for Claude Code sessions.

## Components

| Type | Name | Purpose |
|------|------|---------|
| Hook | `sync-statusline.js` | SessionStart hook that syncs script and settings |
| Script | `statusline.js` | Status line renderer (installed to `~/.claude/`) |

## How It Works

On every session start, the hook:

1. Copies `statusline.js` to `~/.claude/statusline.js`
2. Reads `~/.claude/settings.json`, patches `statusLine` if `type` or `command` differ
3. Preserves user preferences (e.g. `padding`) via spread

The status line renders three rows:
- Row 1: output style, model, session cost, API time
- Row 2: context window remaining, input/output ratio, cache efficiency
- Row 3: current working directory (relative to project root)

## Why User-Level

Project-level status line config uses relative paths that break when
agents change working directory. Installing to `~/.claude/` with an
absolute path ensures the status line works regardless of cwd.

## Extension

To modify the status line display, edit `statusline.js` in this plugin
and bump the version. The hook will propagate changes on next session start.