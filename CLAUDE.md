# cc-foundry

Claude Code plugin development repository. Contains plugins that extend Claude Code with domain-specific skills, output
styles, hooks, and workflow automation.

## Structure

- `.dev/` — development CLI tools
- `plugins/ai-helpers/` — AI artifact engineering (prompts, skills, agents, styles)
- `plugins/git-commit/` — structured commit workflow with validation
- `plugins/skill-enforcer/` — skill activation enforcement via lifecycle hooks
- `plugins/the-blueprint/` — planning pipeline: DRAFT (discovery → research → alignment → frame → tasks)
- `plugins/the-coder/` — language-agnostic coding discipline
- `plugins/the-statusline/` — session metrics status line
- `plugins/the-writer/` — prose discipline for agent-authored text (humanize)
- `plugins/infrastructure/` — infrastructure discipline (Ansible, Docker, Proxmox, Unraid, networking)
- `plugins/the-workflow/` — agentic workflow mechanics (CLAUDE.md quality, context handoff)
- `plugins/frontend/` — frontend platform discipline (CSS, Tailwind, React, Vue, Svelte, accessibility)
- `plugins/backend/` — backend platform discipline (observability, Prometheus, StatsD, OTel)
- `plugins/grafana/` — Grafana platform (dashboards, PromQL, MetricsQL, LogsQL, alerting, provisioning, dataviz)
- `plugins/cli/` — CLI platform discipline (CLI design, shell scripting)
- `plugins/open-source/` — open-source contribution discipline (issues, pull requests)
- `plugins/golang/` — Go language discipline (conventions, templ, gopls LSP)
- `plugins/javascript/` — JS/TS language discipline (Node.js, Bun, Vitest, TS LSP)
- `plugins/php/` — PHP language discipline (conventions, types, OOP, PHPUnit, Pest, Intelephense LSP)
- `plugins/python/` — Python language discipline (conventions, typing, pytest, uv)
- `plugins/rust/` — Rust language discipline (ownership, concurrency, cargo/clippy, rust-analyzer LSP)

Each plugin has its own `CLAUDE.md` with plugin-specific context.

## Creating a New Skill

Full workflow: [`.claude/guides/skill-creation-workflow.md`](.claude/guides/skill-creation-workflow.md) — 4-phase
process (Research → Scaffold → Write → Ship) using Perplexity for discovery and NotebookLM for synthesis.

## Conventions

<conventions>
**Formatting:**
- The repo uses Prettier for markdown formatting (`.prettierrc.yaml` at root)
- After editing any `.md` file, run `yarn dlx prettier --write <file>` before committing
- SKILL.md and CLAUDE.md files use the MDX parser (block-level XML tag support)
- README.md files use the standard markdown parser
- Do not format files in `.dev/reference/` — those are raw fetched docs

**Skill structure:**

- Router pattern: SKILL.md routes to `references/` for detailed content
- SKILL.md must be behaviorally self-sufficient; route only lookup-oriented depth to `references/`. No hard line cap —
  length is governed by the deletion test, not a line budget (see `docs/adr/0002`)

**Development artifacts:**

- `.dev/` directories contain build tooling and source materials
- `.dev/reference/` holds fetched docs (raw source, not shipped as-is)
- `references/` holds processed content (shipped with plugin)

**Design decisions:**

- Load-bearing decisions about how cc-foundry's own skills and plugins are authored are recorded as ADRs in `docs/adr/`
  (sequential `NNNN-slug.md`, indexed in `docs/adr/README.md`). Record one when the rationale would otherwise live only
  in a commit message or memory — so future authors neither re-litigate nor cargo-cult it.
- These are distinct from the per-project ADRs the `the-blueprint:alignment` skill writes to a downstream project's
  `design-docs/adr/`.

**Plugin documentation style:**

- **CLAUDE.md** — Claude's internal reference. Brief prose introduction (what the plugin does, 1-3 sentences), then
  structured content: skill KV lists, dependency diagrams, bullet-list conventions. KV bullet lists over tables — skill
  rosters and component inventories are independent entries, not 2D comparisons. Optimize for LLM compliance — terse
  bullets over explanatory paragraphs for rules and conventions.
- **README.md** — user-facing documentation. Explanatory prose that frames the plugin around the problem it solves ("The
  Problem" / "The Solution"), explains what each skill does and when to use it, shows relationships between skills.
  Prose is appropriate here — the audience is human.

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

**Version management:**

- Plugin versions must be synchronized between each plugin's `.claude-plugin/plugin.json` and the repo-root
  `.claude-plugin/marketplace.json` (which lists all plugins in a single file)
- Update both files when bumping versions
- Every plugin version bump pushed to master ships with a GitHub release whose notes are the plugin's changelog — no
  CHANGELOG.md files. Workflow: the `release` skill (`.claude/skills/release/`); rationale: `docs/adr/0005`

**Licensing:**

- Every plugin must contain a copy of the root `LICENSE` file in its directory
- When adding a new plugin, copy `LICENSE` from the repository root into the plugin directory
  </conventions>

<git-commit-config>
<extra-instructions>
Since the project is about the plugins and the claude-code marketplace, the scope in the commit-message, if defined,
must not contain the `plugins` path, it is enough to have the plugin name as the scope.
</extra-instructions>
</git-commit-config>
