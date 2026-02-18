# cc-foundry

Claude Code plugin development repository. Contains plugins that extend Claude Code with
domain-specific skills, output styles, hooks, and workflow automation.

## Structure

```
cc-foundry/
├── .dev/                 # Development CLI tools
├── plugins/
│   ├── ai-helpers/       # AI artifact engineering (prompts, skills, agents, styles)
│   ├── git-commit/       # Structured commit workflow with validation
│   ├── skill-enforcer/   # Skill activation enforcement via lifecycle hooks
│   ├── the-blueprint/    # Planning pipeline (design → technical design → tasks)
│   ├── the-coder/        # Language-agnostic coding discipline
│   ├── the-crucible/     # Quality validation and multi-agent code review
│   ├── the-statusline/   # Session metrics status line
│   ├── frontend/         # Frontend platform discipline (CSS, React, Vue, Svelte, accessibility)
│   ├── backend/          # Backend platform discipline (observability, Prometheus, StatsD, OTel)
│   ├── cli/              # CLI platform discipline (scaffold)
│   ├── golang/           # Go language discipline (conventions, templ, gopls LSP)
│   └── javascript/       # JS/TS language discipline (Node.js, Bun, Vitest, TS LSP)
└── CLAUDE.md
```

Each plugin has its own `CLAUDE.md` with plugin-specific context.

## Building Skills with External Documentation

<workflow>
When a skill needs to embed external documentation as reference material:

1. **Create inventory** — add `.dev/reference-inventory.json` in the skill directory:
   ```json
   {
     "sources": {
       "Topic Name": "https://example.com/docs/page.md"
     }
   }
   ```

2. **Fetch docs** — from repo root:
   ```bash
   cd .dev && yarn cli docs-fetch <path-to-inventory.json>
   ```
   URLs ending in `.md` fetch as raw markdown. Others convert from HTML.

3. **Distill into references** — process fetched content into skill `references/*.md` files

Full CLI docs: [.dev/CLAUDE.md](.dev/CLAUDE.md)
</workflow>

## Conventions

<conventions>
**Formatting:**
- Wrap all markdown and instruction files at 100–120 characters per line

**Skill structure:**
- Router pattern: SKILL.md routes to `references/` for detailed content
- Keep SKILL.md under 500 lines; move depth to references

**Development artifacts:**
- `.dev/` directories contain build tooling and source materials
- `.dev/reference/` holds fetched docs (raw source, not shipped as-is)
- `references/` holds processed content (shipped with plugin)

**Plugin context:**
- Each plugin has `CLAUDE.md` explaining its components
- Each plugin has `README.md` for user-facing documentation

**Plugin documentation style:**
Both `CLAUDE.md` and `README.md` must be written in explanatory style — prose that tells the
reader what exists, how it works, and why it's structured that way. Tables and bullet lists
support the explanation; they don't replace it.

- **CLAUDE.md** — Claude's internal reference. Explain the plugin's components (skills, hooks,
  output styles), how they relate to each other, what conventions apply, and where scope
  boundaries are. The goal is that Claude can read this file and understand the plugin well
  enough to work with it correctly without needless research.
- **README.md** — user-facing documentation. Frame the plugin around the problem it solves
  ("The Problem" / "The Solution"), explain what each skill does and when to use it, show
  relationships between skills. The goal is that a human can read this file and decide
  whether to install the plugin.

Don't write documentation as flat inventories. Explain the *why* and the connections, not
just the *what*.

**Documentation maintenance:**
After any significant change to a plugin, update its documentation before committing:

- **Plugin CLAUDE.md** — update when: adding/removing/renaming skills, output styles, hooks,
  or commands; changing skill purpose, scope, or dependencies; adding/removing conventions.
  This file is Claude's internal reference — keep it accurate to what exists.
- **Plugin README.md** — update when: any change that affects what users see or install.
  Same triggers as CLAUDE.md, plus installation instructions or usage examples.
- **Root CLAUDE.md** — update the structure diagram when: adding/removing a plugin, or
  changing a plugin's one-line purpose.
- **Root README.md** — update the plugin listing when: adding/removing a plugin, or
  changing a plugin's purpose or skill roster significantly enough that the summary
  paragraph no longer describes it accurately.

Do not defer documentation to a separate task. Update docs in the same work session as
the code change, ideally in the same commit or immediately following commit.

**Installation instructions:**
- All plugin READMEs must use marketplace commands:
  ```
  /plugin marketplace add xobotyi/cc-foundry
  /plugin install <plugin-name>
  ```
- Do not use manual cp/ln installation methods

**Version management:**
- Plugin versions must be synchronized between `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
- Update both files when bumping versions

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
