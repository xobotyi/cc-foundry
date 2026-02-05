# the-statusline

Auto-syncing status line for Claude Code with context window usage, cost tracking, and model info.

## What It Does

Displays a 3-row status bar at the bottom of your Claude Code terminal:

- **Row 1** — Output style, model name, session cost, API time
- **Row 2** — Context window remaining %, input/output token ratio, cache hit rate
- **Row 3** — Current working directory (relative to project root)

Colors shift with urgency — context remaining turns from gray to yellow to red as you approach limits.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-statusline
```

The plugin automatically:
- Installs the status line script to `~/.claude/statusline.js`
- Configures `~/.claude/settings.json` with the status line setting
- Keeps the script in sync on every session start

## Why User-Level

Project-level status line settings use relative script paths that break when agents change
working directory during a session. This plugin installs to user-level settings with an
absolute path, ensuring the status line persists regardless of cwd changes.

## Uninstalling

```
/plugin uninstall the-statusline
```

To fully clean up, remove the `statusLine` key from `~/.claude/settings.json` and
delete `~/.claude/statusline.js`.
