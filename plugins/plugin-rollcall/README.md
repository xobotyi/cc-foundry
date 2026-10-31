<div align="center">

# plugin-rollcall

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code 2.1.287+](https://img.shields.io/badge/Claude%20Code-2.1.287%2B%20mod-d97757.svg)](https://claude.com/blog/claude-code-mods)

</div>

Plugins that a repository enables in its `.claude/settings.json` load from your first prompt there, including in a fresh
clone or a new worktree, where Claude Code skips them until you type `/reload-plugins`.

The line the mod adds to the transcript after it reloads ([`hooks/register.ts`](hooks/register.ts)):

```
reloaded plugins skipped at startup: the-coder@foundry
```

It names every plugin it had to reload, so a skipped plugin is visible instead of silently missing. A reload after
`/clear`, a resume, or a compaction names that occasion instead: `reloaded plugins after /clear: the-coder@foundry`.

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

A reload does not always survive `/clear`, a resume, or a compaction: the plugins can go missing again. The mod repeats
the check after each of them and reloads once that step has finished. Steps that follow each other before the reload
runs share one reload.

The mod also catches a missing plugin in the act. When a call to one of a plugin's skills fails as unknown, the plugin
is enabled, and Claude Code lists no command of it, the mod tells the model that it tries to reload the plugin when the
turn ends, and reloads it then. The skill works from the next turn, whether or not the plugin has an install record.

Unless you turn on install mode (see Configuration), the mod only reads. It never writes install records or settings, so
it cannot corrupt a file another session writes. A read that lands mid-write in another session can still fail; the mod
then reports `roll call failed` and skips the reload for that session. A session where every enabled plugin has an
install record never sees it.

## Installation

```
/plugin install plugin-rollcall --marketplace xobotyi/cc-foundry
```

Install it at user scope, which is the default. Installed at project scope, the mod falls to the bug it works around: a
new worktree or a fresh clone of that project has no install record for it, so it is skipped at startup there.

## Configuration

Install mode fixes the cause instead of the symptom. It is off by default, because it changes files in your repository
and in your plugin directory. Turn on **Install skipped plugins** for `plugin-rollcall` in `/config`, or set the
`install` option in your user `settings.json`:

```json
{"pluginConfigs": {"plugin-rollcall@foundry": {"options": {"install": true}}}}
```

After a reload, the mod then runs `claude plugin install <plugin> --scope local` for each plugin that has no install
record for the project, one after another and without holding your prompt. This is the workaround confirmed in #83422:
it writes the install record and enables the plugin in the project's `.claude/settings.local.json`. From the next
session on, Claude Code loads the plugin at startup and the mod has nothing to reload. The transcript names what was
installed:

```
installed plugins at local scope: the-coder@foundry
```

The option is read when the mod loads, and changing it in `/config` reloads the mod.

## Limits

- Interactive sessions only. In a `claude -p` run, `/reload-plugins` reports that it is not available and would run
  after the turn anyway.
- The detection mirrors the loader's behavior as observed, not a documented contract. A plugin skipped for any other
  reason triggers a reload that does not help, at session start and again after each `/clear`, resume, or compaction.
- The detection reads install records, not what the loader did, so it cannot tell when the bug is fixed. From then on it
  reloads in every session where an enabled plugin has no record. Uninstall the mod once #83422 is fixed.
- A plugin loaded by the reload misses its own `SessionStart` hooks for that session. Claude Code starts those hooks
  alongside the mod rather than after it, and a mod cannot fire them again. The plugin's other hooks run as usual from
  the first prompt on. A manual `/reload-plugins` has the same gap.
- In install mode, the `enabledPlugins` entry that `--scope local` writes to `.claude/settings.local.json` outranks the
  repository's `.claude/settings.json`. A plugin the repository later disables stays enabled in your checkout until you
  remove that entry.
- Install mode writes `installed_plugins.json` through Claude Code's own installer, so it carries the same risk as
  running `/plugin install` in two sessions at once.
- Some organizations manage a plugin that intercepts compaction before any other plugin sees it. Under such a plugin the
  mod never learns of a compaction and does not reload after one; the first failed skill call of a missing plugin
  reloads it instead.
- A plugin with no skills or commands never lists one, so a failed call to a skill it lacks reloads it even when it is
  loaded.
- Tested with Claude Code 2.1.310. The reloads after `/clear` and after a failed skill call, and install mode, are
  tested with 2.1.316; the reloads after a resume and after a compaction are covered by the test suite only.

## License

MIT
