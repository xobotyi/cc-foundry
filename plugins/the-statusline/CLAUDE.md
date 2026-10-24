# the-statusline Plugin

Auto-syncing status line for Claude Code sessions with context window usage, cost tracking, and model information.

## Components

- **`hooks/sync-statusline.js`** — SessionStart hook; copies the renderer to `~/.claude/statusline.js` and patches
  `statusLine` in `~/.claude/settings.json` with the command and a default `refreshInterval`
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
- **Context left is measured against the model's full window** — the payload carries no auto-compact state (checked
  against the v2.1.306 payload builder). Don't re-derive the threshold from settings files: they miss `--autocompact`,
  managed scope, and server-side overrides, and a wrong countdown is worse than none
- **Read git state from `.git/HEAD`, never spawn `git`** — the script runs on every assistant message and every
  `refreshInterval` tick, in every open session
- **Row width comes from `COLUMNS`, read only when Claude Code runs the script** — stdout is captured, so terminal width
  detection finds no tty, and a terminal resize triggers no run; the hook's default `refreshInterval` is what refits the
  rows after one
- **Render every layout change at a narrow and a wide `COLUMNS` value** — each row has to fit at both ends, because the
  renderer runs in every open session at whatever width each pane has
