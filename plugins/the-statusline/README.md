# the-statusline

Auto-syncing status line for Claude Code with context window usage, cost tracking, and model
information.

## The Problem

Claude Code's default status line is minimal. When working on complex tasks, you need visibility
into:

- Context window consumption (when will you hit limits?)
- Session costs (how much is this costing?)
- Cache efficiency (is prompt caching working?)
- Current working directory (where are agents operating?)

Project-level status line configurations break when agents change directories during execution,
leaving you without status visibility mid-session.

## The Solution

This plugin installs a comprehensive 3-row status line to your user-level Claude configuration
(`~/.claude/`), ensuring it persists across all sessions and survives agent directory changes.

**Row 1** — Output style, model name, session cost (USD), API time spent
**Row 2** — Context window remaining (%), input/output ratio, cache hit rate
**Row 3** — Current working directory (relative to project root, intelligently collapsed)

Color urgency increases as you approach context limits: gray → yellow → orange → red.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-statusline
```

The plugin automatically:
- Installs the status line script to `~/.claude/statusline.js`
- Configures `~/.claude/settings.json` with the correct status line command
- Keeps the script synchronized on every session start

## How It Works

On every session start, a hook copies the status line script to your user-level Claude directory
and patches your settings if needed. The script receives session data from Claude Code and
renders the three-row status display.

User preferences like padding are preserved across updates. The status line uses absolute paths,
so it continues working even when agents change directories during multi-agent workflows.

## Customization

To modify the status line display, edit `statusline.js` in the plugin directory and bump the
version in `.claude-plugin/plugin.json`. Changes propagate on the next session start.

## Uninstalling

```
/plugin uninstall the-statusline
```

To fully clean up, remove the `statusLine` key from `~/.claude/settings.json` and delete
`~/.claude/statusline.js`.

## License

MIT
