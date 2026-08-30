# the-statusline Plugin

Auto-syncing status line for Claude Code sessions with context window usage, cost tracking, and model information.

## Components

- **`hooks/sync-statusline.js`** — SessionStart hook; copies the renderer to `~/.claude/statusline.js` and patches
  `statusLine` in `~/.claude/settings.json`
- **`hooks/hooks.json`** — hook registration
- **`statusline.js`** — the renderer; Claude Code runs the installed copy under `~/.claude/` and feeds it session data
  as JSON on stdin

## Conventions

- **Patch `~/.claude/settings.json` by spreading the existing object** — the hook rewrites the whole file, so any key
  not spread through is erased from the user's global config, including `padding` under `statusLine`
- **The status line installs at user level with an absolute command path** — a project-level `statusLine` carries a
  relative script path that breaks when an agent changes working directory mid-session
- **An edit to `statusline.js` reaches the user on the next session start**, when the hook re-copies it — a change is
  not observable in the session that made it
