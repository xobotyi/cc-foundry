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
- `plugins/infrastructure/` — infrastructure discipline (Ansible, Docker, Proxmox, Unraid, networking)
- `plugins/the-workflow/` — agentic workflow mechanics (CLAUDE.md quality, context handoff)
- `plugins/frontend/` — frontend platform discipline
- `plugins/backend/` — backend platform discipline (observability, Prometheus, StatsD, OTel)
- `plugins/grafana/` — Grafana platform (dashboards, PromQL, MetricsQL, LogsQL, alerting, provisioning, dataviz)
- `plugins/cli/` — CLI platform discipline (CLI design, shell scripting)
- `plugins/open-source/` — open-source contribution discipline (issues, pull requests)
- `plugins/golang/`, `plugins/javascript/`, `plugins/php/`, `plugins/python/`, `plugins/rust/` — language disciplines
- `plugins/wall-clock/` — wall-clock and elapsed-time grounding for agent context (hook-only)

Each plugin has its own `CLAUDE.md` with plugin-specific context.

## Creating a New Skill

Full workflow: [`.claude/guides/skill-creation-workflow.md`](.claude/guides/skill-creation-workflow.md) — 4-phase
process (Research → Scaffold → Write → Ship).

## Conventions

**Formatting:**

- The repo uses Prettier for markdown formatting (`.prettierrc.yaml` at root)
- After editing any `.md` file, run `yarn dlx prettier --write <file>` before committing
- Never pass `--parser` — the config assigns mdx to CLAUDE.md and files under `skills/`, markdown to README.md

**Skill structure:**

- Router pattern: SKILL.md routes to `references/` for detailed content
- SKILL.md must be behaviorally self-sufficient; route only lookup-oriented depth to `references/`. No hard line cap —
  length is governed by the deletion test, not a line budget (see `docs/adr/0002`)

**Auditing prompt text:**

- Read a prompt, skill, or instruction file end to end before judging it — a premise is carried by sentences no search
  term predicts.
- Use grep only to locate a known literal or to count occurrences after that full read. An audit assembled from grep
  hits reports clean on every line it never opened.

**Development artifacts:**

- `.dev/` directories contain build tooling and source materials
- `.dev/reference/` holds fetched docs (raw source, not shipped as-is)
- `references/` holds processed content (shipped with plugin)

**Design decisions:**

- Load-bearing decisions about how cc-foundry's own skills and plugins are authored are recorded as ADRs in `docs/adr/`
  (sequential `NNNN-slug.md`, indexed in `docs/adr/README.md`). Record one when the rationale would otherwise live only
  in a commit message or memory.
- These are distinct from the per-project ADRs the `the-blueprint:alignment` skill writes to a downstream project's
  `design-docs/adr/`.

**Documentation maintenance:** Update plugin docs in the same work session as the code change:

- **Plugin CLAUDE.md** — update when: adding/removing/renaming skills, output styles, hooks, or commands; changing skill
  purpose, scope, or dependencies; adding/removing conventions
- **Plugin README.md** — update when: any change that affects what users see or install
- **Root CLAUDE.md** — update plugin list when: adding/removing a plugin
- **Root README.md** — update plugin listing when: plugin purpose or skill roster changes significantly

**Installation instructions:**

- All plugin READMEs must use marketplace commands:
  ```
  /plugin marketplace add xobotyi/cc-foundry
  /plugin install <plugin-name>
  ```
- Do not use manual cp/ln installation methods

**Plugin configuration:**

- A plugin's user-facing environment knobs are named `FOUNDRY_<PLUGIN>_<KNOB>` — the marketplace prefix keeps them clear
  of system and third-party variables and greppable as one family
- Prefer that env knob over a `userConfig` key for optional tuning values, because `userConfig` prompts the user at
  enable time. Where userConfig is warranted, plumb it into the same env name via `${user_config.KEY}` in the hook
  command rather than reading a second variable

**Version management:**

- Plugin versions must be synchronized between each plugin's `.claude-plugin/plugin.json` and the repo-root
  `.claude-plugin/marketplace.json` (which lists all plugins in a single file)
- Update both files when bumping versions
- Every plugin version bump pushed to master ships with a GitHub release whose notes are the plugin's changelog — no
  CHANGELOG.md files. Workflow: the `release` skill (`.claude/skills/release/`); rationale: `docs/adr/0005`

**Licensing:**

- Every plugin must contain a copy of the root `LICENSE` file in its directory
- When adding a new plugin, copy `LICENSE` from the repository root into the plugin directory

<git-commit-config>
<extra-instructions>
Since the project is about the plugins and the claude-code marketplace, the scope in the commit-message, if defined,
must not contain the `plugins` path, it is enough to have the plugin name as the scope.
</extra-instructions>
</git-commit-config>
