# plugin-rollcall Plugin

A Claude Code mod that works around
[anthropics/claude-code#83422](https://github.com/anthropics/claude-code/issues/83422): a marketplace plugin enabled in
settings is skipped at startup when `installed_plugins.json` holds no install record for the user or for the session's
project path. At `session.start` the mod finds such plugins and runs `/reload-plugins`, which loads them.

## Components

Run every command in this file from the repository root.

- **`hooks/register.ts`** — the whole implementation, loaded through `modules` in `hooks/hooks.json`.
  `claude plugin validate plugins/plugin-rollcall` lists `session.start` as its only hook.
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
- A reload keeps unchanged hooks modules loaded, so `session.start` does not fire again and the mod needs no loop guard
  (verified on 2.1.310). Recheck this if a session ever shows the reload line twice.
- After the reload, one transcript line names the plugins it reloaded: `reloaded plugins skipped at startup: <ids>`.
  `claude --plugin-dir plugins/plugin-rollcall` shows it end to end while a plugin that this repository's
  `.claude/settings.json` enables has no install record for the repository's path.
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

## Conventions

- The mod only reads. It never writes install records or settings, because another session may write the same files at
  the same time.
- Write each mods API call in full as `$.namespace.method(...)`, and pass `$` only to top-level functions in
  `register.ts`. `claude plugin validate` refuses any other form, because its static analysis reads the calls off the
  source.
- Format with the neighbouring hooks' style (4-space indent, single quotes, semicolons), not the repo's Prettier
  defaults.
