# plugin-rollcall

A plugin that a repository enables in its `.claude/settings.json` can be missing from your sessions in that repository
until you type `/reload-plugins`. This mod notices that at session start and runs the reload for you.

## The Problem

Claude Code loads a marketplace plugin at startup only when `installed_plugins.json` in its plugin directory
(`~/.claude/plugins/`, or `plugins/` under `CLAUDE_CONFIG_DIR` when that variable is set) holds an install record for it
that applies to the session: one for your user, or one for this project's path. Enabling the plugin in project settings
does not create that record. So unless you installed the plugin at user scope, a plugin enabled by a repository you
cloned, by a new worktree, or by a project you never ran `/plugin install` in is skipped silently. The debug log calls
it `plugin-cache-miss`, even though the plugin sits in the cache. `/reload-plugins` loads it, for that session only.

The bug is tracked in [anthropics/claude-code#83422](https://github.com/anthropics/claude-code/issues/83422).

## The Solution

When an interactive session starts, the mod reads the merged `enabledPlugins` and checks each enabled plugin from a
known marketplace for a user install record or one for the session's project root. If any plugin has neither, the mod
runs `/reload-plugins` and holds your first prompt until the reload completes, about 150 ms in testing. The first prompt
therefore sees every plugin, even a prompt passed on the command line as `claude "…"`. The transcript shows the reload
as a prompt from `plugin-rollcall`, followed by a line that names the plugins it reloaded.

The mod only reads. It never writes install records or settings, so it cannot corrupt a file another session writes. A
read that lands mid-write in another session can still fail; the mod then reports `roll call failed` and skips the
reload for that session. A session where every enabled plugin has an install record never sees it.

## Installation

```
/plugin install plugin-rollcall --marketplace xobotyi/cc-foundry
```

On Claude Code before 2.1.275, add the marketplace first:

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install plugin-rollcall@foundry
```

Install it at user scope, which is the default. Installed at project scope, the mod falls to the bug it works around: a
new worktree or a fresh clone of that project has no install record for it, so it is skipped at startup there.

## Limits

- Interactive sessions only. In a `claude -p` run, `/reload-plugins` reports that it is not available and would run
  after the turn anyway.
- The detection mirrors the loader's behavior as observed, not a documented contract. A plugin skipped for any other
  reason triggers a reload that does not help, once per session.
- The detection reads install records, not what the loader did, so it cannot tell when the bug is fixed. From then on it
  reloads in every session where an enabled plugin has no record. Uninstall the mod once #83422 is fixed.
- A plugin loaded by the reload misses its own `SessionStart` hooks for that session. Claude Code starts those hooks
  alongside the mod rather than after it, and a mod cannot fire them again. The plugin's other hooks run as usual from
  the first prompt on. A manual `/reload-plugins` has the same gap.
- Tested with Claude Code 2.1.310.

## License

MIT
