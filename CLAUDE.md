# cc-foundry

Claude Code plugin development repository. Contains plugins that extend Claude Code with domain-specific skills, output
styles, hooks, and workflow automation.

## Plugins

- `plugins/ai-helpers/` — AI artifact engineering (prompts, skills, agents, styles)
- `plugins/git-commit/` — structured commit workflow with validation
- `plugins/skill-enforcer/` — skill activation enforcement via lifecycle hooks
- `plugins/the-blueprint/` — planning pipeline: DRAFT (discovery → research → alignment → frame → tasks)
- `plugins/the-coder/` — language-agnostic coding discipline
- `plugins/the-statusline/` — session metrics status line
- `plugins/the-writer/` — prose discipline for agent-authored text
- `plugins/infrastructure/` — infrastructure discipline (Ansible, Docker, Proxmox, networking)
- `plugins/the-workflow/` — agentic workflow mechanics (CLAUDE.md quality, context handoff, correction harvesting)
- `plugins/frontend/` — frontend platform discipline
- `plugins/backend/` — backend platform discipline (observability, Prometheus, StatsD, OTel)
- `plugins/grafana/` — Grafana platform (dashboards, PromQL, MetricsQL, LogsQL, alerting, provisioning, dataviz)
- `plugins/cli/` — CLI platform discipline (CLI design, shell scripting)
- `plugins/open-source/` — open-source contribution discipline (issues, pull requests)
- `plugins/golang/`, `plugins/javascript/`, `plugins/php/`, `plugins/python/`, `plugins/rust/` — language disciplines
- `plugins/wall-clock/` — wall-clock and elapsed-time grounding for agent context (hook-only)
- `plugins/plugin-rollcall/` — reloads settings-enabled plugins that Claude Code skipped at startup (mod)

Each plugin has its own `CLAUDE.md` with plugin-specific context.

## Creating a New Skill

Full workflow: [`.claude/guides/skill-creation-workflow.md`](.claude/guides/skill-creation-workflow.md) — 4-phase
process (Research → Scaffold → Write → Ship).

## Conventions

**Formatting:**

- Vite+ formats and lints every file: Oxfmt and Oxlint, configured in `vite.config.ts` from the ver0 project's settings
  (`@ver0/oxlint-config` for lint)
- After editing any file, run `vp fmt <file>` before committing; `vp check` fails on an unformatted file

**Skill structure:**

- Router pattern: SKILL.md routes to `references/` for detailed content
- SKILL.md must be behaviorally self-sufficient; route only lookup-oriented depth to `references/`. No hard line cap —
  length is governed by the deletion test, not a line budget (see [ADR 1.2](/design-docs/adr/1.2-skill-md-length.md))

**Auditing prompt text:**

- **Grep cannot assess a prompt.** A prompt is prose, and prose carries its meaning in sentences, not in tokens a
  pattern can match. Read the file end to end before judging it — a premise is carried by sentences no search term
  predicts.
- **Grep narrows the read surface; it is never the read.** Use it to find a known literal, or to count occurrences after
  the full read. A grep result is never exhaustive evidence about text: the same meaning appears under different words,
  and the same word carries different meanings a few lines apart, so a clean grep is not a clean file.
- An audit assembled from grep hits reports clean on every line it never opened. If the conclusion would change had you
  read the whole file, you have not audited it.

**Development artifacts:**

- `src/` holds the repository's dev CLI, run from the root as `vp run cli <command>`: `check` validates the marketplace
  and every plugin, `docs-fetch` fetches a skill's reference sources, `xerj-hub-refresh` moves the XERJ Corpus Hub pins
  of released plugins ([src/CLAUDE.md](/src/CLAUDE.md))
- A plugin's `.dev/` directory holds its build tooling and source materials
- `.dev/reference/` holds fetched docs (raw source, not shipped as-is)
- `references/` holds processed content (shipped with plugin)

**Design decisions:**

- Load-bearing decisions about how cc-foundry's own skills and plugins are authored are ADRs in `design-docs/adr/`,
  written and maintained through the `the-blueprint:adr` skill. Record one when the rationale would otherwise live only
  in a commit message or memory.

@design-docs/ADR.md

**Documentation maintenance:** Update plugin docs in the same work session as the code change:

- **Plugin CLAUDE.md** — update when: adding/removing/renaming skills, output styles, hooks, or commands; changing skill
  purpose, scope, or dependencies; adding/removing conventions
- **Plugin README.md** — update when: any change that affects what users see or install
- **Root CLAUDE.md** — update plugin list when: adding/removing a plugin
- **Root README.md** — update plugin listing when: plugin purpose or skill roster changes significantly

**Plugin configuration:**

- A plugin's user-facing environment knobs are named `FOUNDRY_<PLUGIN>_<KNOB>` — the marketplace prefix keeps them clear
  of system and third-party variables and greppable as one family
- Prefer that env knob over a `userConfig` key for optional tuning values, because `userConfig` prompts the user at
  enable time. Where userConfig is warranted, plumb it into the same env name via `${user_config.KEY}` in the hook
  command rather than reading a second variable
- A mod (a plugin whose `hooks.json` lists `modules`) declares its settings as `userConfig` fields and reads them from
  `register(on, options)`, with no env knob: Claude Code lists them in `/config`, and a mod has no hook command to plumb
  an env name through

**Plugin dependencies:**

- A plugin works on a bare Claude Code install. It never requires a system from outside this marketplace — a memory
  server, a third-party plugin — because users install different subsets
- It uses such a system when the session shows it is present, and the plugin's text names the system by the role it
  fills, never by product name

**Plugin scripts:**

- A script Claude Code runs through `node` is an `.mts` file of erasable TypeScript, run by Node 26's type stripping and
  doing I/O only under `import.meta.main` ([ADR 1.13](/design-docs/adr/1.13-plugin-script-runtime.md))
- Its tests sit beside it as `<name>.test.mts` and import its exports; a `.dev/` folder never exists only to hold a test

**Landing changes:**

- `master` accepts a change only through a pull request whose `ci-ok` check passes, merged by rebase
  (`gh pr merge --rebase`); GitHub refuses a direct push
- A rebase merge gives every commit a new SHA, so a file never cites a commit of its own pull request by SHA
- Before the first push from a clone, run `vp hooks enable` when `vp hooks status` shows no dispatcher; the
  `.vite-hooks/pre-push` hook then runs `vp run cli check --pre-push` and refuses a push it fails

**Plugin metadata and versions:**

- A plugin's version, description, keywords, and every other field `plugin.json` accepts live only in its
  `.claude-plugin/plugin.json`. Its entry in `.claude-plugin/marketplace.json` holds `name`, `source`, `category`, and
  `tags` ([ADR 1.12](/design-docs/adr/1.12-plugin-metadata-source.md))
- A version bump changes `plugin.json` only
- Renaming or removing a plugin adds a key to `renames` in `.claude-plugin/marketplace.json`: the old name maps to the
  new name, or to `null` for a removal. Never edit or delete an existing key — Claude Code follows the chain from the
  oldest name, and `forceRemoveDeletedPlugins` uninstalls an unmapped old name instead of migrating it
- Every plugin version bump merged into master ships with a GitHub release whose notes are the plugin's changelog — no
  CHANGELOG.md files. Workflow: the `release` skill (`.claude/skills/release/`); rationale:
  [ADR 1.5](/design-docs/adr/1.5-plugin-changelog.md)

**Licensing:**

- Every plugin must contain a copy of the root `LICENSE` file in its directory
- When adding a new plugin, copy `LICENSE` from the repository root into the plugin directory

<git-commit-config>
<extra-instructions>
Since the project is about the plugins and the claude-code marketplace, the scope in the commit-message, if defined,
must not contain the `plugins` path, it is enough to have the plugin name as the scope.
</extra-instructions>
</git-commit-config>
