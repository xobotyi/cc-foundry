# the-statusline

Auto-syncing status line for Claude Code with context window usage, cost tracking, and model information.

## The Problem

Claude Code's default status line is minimal. When working on complex tasks, you need visibility into:

- Context window consumption (how much room is left?)
- Subscription rate limits (which one runs out first, and when does it reset?)
- Session costs (how much is this costing?)
- Where agents are operating (which directory, branch, worktree?)

Project-level status line configurations break when agents change directories during execution, leaving you without
status visibility mid-session.

## The Solution

This plugin installs a two-row status line to your user-level Claude configuration (`~/.claude/`), where it persists
across all sessions and survives agent directory changes.

The first row shows the output style, the model with its reasoning effort, and the session cost. At its right edge sit
the context left and whichever rate limit is closer to stopping you, the 5-hour or the 7-day one, with the time it
resets. A limit counts as closer when, at the pace used so far in its window, it runs out before it resets. When neither
will, the one with less left is shown.

The second row shows the current directory, the git branch, and the lines added and removed in the session. The
directory reads relative to the project root; in a worktree session it shows the repository the worktree was created
from, tagged with the worktree name.

Context left is measured against the model's full context window. Claude Code doesn't pass the auto-compact threshold to
status lines, so if you lowered the auto-compact window, compaction runs before the context reaches zero.

The layout follows the terminal width. On a wide terminal, context and rate limit stay at the right edge. As the
terminal narrows, the first row drops the reasoning effort, then the output style, the reset time, and the cost; the
second row folds the path, then drops the line counts and shortens the branch.

Color urgency increases as context or the rate limit runs low: gray → yellow → orange → red.

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

On every session start, a hook copies the status line script to your user-level Claude directory and patches your
settings if needed. The script receives session data from Claude Code and renders the two-row status display.

User preferences like padding are preserved across updates. The status line uses absolute paths, so it continues working
even when agents change directories during multi-agent workflows.

Claude Code doesn't re-run the status line when the terminal is resized, so the hook sets a `refreshInterval` of 10
seconds: after a resize, the rows refit to the new width within that time. A `refreshInterval` you set yourself is kept.

## Customization

To modify the status line display, edit `statusline.js` in the plugin directory and bump the version in
`.claude-plugin/plugin.json`. Changes propagate on the next session start.

## Uninstalling

```
/plugin uninstall the-statusline
```

To fully clean up, remove the `statusLine` key from `~/.claude/settings.json` and delete `~/.claude/statusline.js`.

## License

MIT
