# plugin-rollcall Plugin

A Claude Code mod that works around
[anthropics/claude-code#83422](https://github.com/anthropics/claude-code/issues/83422): a marketplace plugin enabled in
settings is skipped at startup when `installed_plugins.json` holds no install record for the user or for the session's
project path. At `session.start`, and again after `/clear`, a resume, or a compaction, the mod finds such plugins and
runs `/reload-plugins`, which loads them. A failed skill call of an enabled plugin that lists no command triggers the
same reload, install records aside.

## Components

Run every command in this file from the repository root.

- **`hooks/register.ts`** — the whole implementation, loaded through `modules` in `hooks/hooks.json`.
  `claude plugin validate plugins/plugin-rollcall` lists its hooks: `session.start`, `session.end`, `session.compact`,
  `tool.call`.
- **`tests/register.test.ts`** — the test-kit suite. Run `claude plugin test plugins/plugin-rollcall` after any change
  to the module.
- **`tsconfig.json`** — extends `.claude-plugin/types/tsconfig.json`, which Claude Code generates for its own version
  and gitignores. Start `claude --plugin-dir plugins/plugin-rollcall` interactively once to generate it, then type-check
  with `yarn dlx -p typescript tsc -p plugins/plugin-rollcall`.

## How It Works

- A plugin is missing when the merged `enabledPlugins` sets it `true`, its marketplace is a key of
  `known_marketplaces.json`, and none of its records in `installed_plugins.json` has `scope: "user"` or a `projectPath`
  equal to `$.session.root()`. This rule mirrors the loader as observed on 2.1.310; the loader's rule is undocumented.
- The hook awaits the reload, so the first prompt waits for it, including a prompt passed as `claude "<prompt>"`. The
  await does not deadlock, and the reload takes about 150 ms (verified on 2.1.310).
- After `/clear` or a resume (`session.end`) and after a compaction of the main conversation (`session.compact`), the
  mod schedules the roll call with `$.clock.after(0, …)`. Claude Code refuses `$.command.run` from a hook that a turn or
  a command waits on, and the timer runs once they finish (verified on 2.1.316). Transitions that come before the timer
  fires share its reload.
- A failed `Skill` call whose error reads `Unknown skill: <plugin>:<skill>` marks the plugin missing, install records
  aside, when an enabled plugin of that name comes from a known marketplace and `$.command.list()` lists no command of
  it. The mod schedules the reload, which runs once the turn ends even when the install records cannot be read, and adds
  a note to the failed result that names the reload (verified on 2.1.316).
- The `install` option turns on install mode. Claude Code stores it under `pluginConfigs[<id>].options` in user settings
  (verified on 2.1.316). After a reload, the mod runs `claude plugin install <id> --scope local` from the session root
  for each plugin without a record, in the background and one at a time. That writes a `local` record and an
  `enabledPlugins` entry in the project's `.claude/settings.local.json`, and the next session loads the plugin at
  startup (verified on 2.1.316). The line `installed plugins at local scope: <ids>` follows; a failed install reports
  its exit code and first output line.
- A reload keeps unchanged hooks modules loaded, so `session.start` does not fire again and the mod needs no loop guard
  (verified on 2.1.310). Recheck this if a session ever shows the reload line twice.
- After a reload, one transcript line names the occasion and the plugins: `reloaded plugins <occasion>: <ids>`, where
  the occasion is `skipped at startup`, `after /clear`, `after a resume`, `after compaction`, or
  `after <plugin>:<skill> failed`. `claude --plugin-dir plugins/plugin-rollcall` shows it end to end while a plugin that
  this repository's `.claude/settings.json` enables has no install record for the repository's path.
- A failure goes to the transcript as `roll call failed: <error>`; a malformed state file throws rather than guessing.
  The catch is the only visible failure path: Claude Code reports a skipped hook of an installed mod in the debug log
  alone.

## Known Limits

- Interactive sessions only. In `claude -p`, `/reload-plugins` answers that it is unavailable and runs after the turn
  (verified on 2.1.310).
- A reloaded plugin misses its own `SessionStart` hooks for that session. Claude Code dispatches classic `SessionStart`
  hooks alongside the mods' `session.start`, not after it, and the runtime mods API cannot raise a classic event —
  `$.classic` exists only in the test kit (verified on 2.1.310).
- The detection reads install records, not what the loader did, so it cannot tell when #83422 is fixed. From then on it
  reloads in every session where an enabled plugin has no record. Delete the plugin once the issue is fixed.
- Where a managed-tier plugin passes `session.compact` past the mods, no reload follows a compaction until a skill call
  of a missing plugin fails.
- A plugin with no skills or commands never lists one, so a failed call to a skill it lacks reloads it even when it is
  loaded.
- Install mode's `enabledPlugins` entry in `.claude/settings.local.json` outranks the project's settings: a plugin the
  project later disables stays enabled in that checkout until the entry is removed.

## Conventions

- The mod writes plugin state only in install mode, only through `claude plugin install`, and one install at a time:
  another session may write the same files at the same time, and Claude Code's installer is the only writer that knows
  their shape. Outside install mode the mod only reads.
- Hook engine events, never `classic.*`. A managed-tier plugin first in a chain can pass an event past every mod: on one
  machine a managed plugin passes every `classic.*` event and `session.compact` past them, while `session.start`,
  `session.end`, and `tool.call` reach the mod (verified on 2.1.316).
- Write each mods API call in full as `$.namespace.method(...)`, and pass `$` only to top-level functions in
  `register.ts`. `claude plugin validate` refuses any other form, because its static analysis reads the calls off the
  source. For the same reason `$.env.get` takes a literal variable name.
