# Skill Technical Specification

## Directory Structure

```
skill-name/
├── SKILL.md              # Required: main instructions
├── references/           # Optional: additional documentation
│   ├── guide.md
│   └── examples.md
├── scripts/              # Optional: executable code
│   └── helper.py
└── assets/               # Optional: templates, data files
    └── template.json
```

## SKILL.md Format

```markdown
---
name: skill-name
description: What it does and when to use it
---

# Skill Title

[Markdown instructions]
```

## Frontmatter Fields

### Open Standard Fields (cross-platform)

- `name` (required): 1–64 chars, lowercase letters, numbers, hyphens only. Must match parent directory name.
- `description` (required): 1–1024 chars. Describes what the skill does AND when to use it.
- `license`: License name or reference to a bundled license file.
- `compatibility`: 1–500 chars. Environment requirements (product, packages, network access).
- `metadata`: Arbitrary key-value map. Use reasonably unique keys to avoid conflicts.
- `allowed-tools`: Space-separated string of pre-approved tools. In Claude Code, grants tool access without per-use
  approval while the skill is active. **No effect in the Agent SDK** — use the SDK's `allowedTools` option instead.

### Claude Code Extensions

- `argument-hint`: UI hint during autocomplete. Example: `[issue-number]`, `[filename] [format]`.
- `disable-model-invocation` (default: `false`): Prevents Claude from auto-triggering the skill. **Also removes the
  description from context entirely** — Claude won't know the skill exists until explicitly invoked. Frees description
  budget for other skills. Use for workflows with side effects or those you want to control timing of.
- `user-invocable` (default: `true`): Set `false` to hide from the `/` menu. Does NOT block model invocation — use
  `disable-model-invocation` for that.
- `model`: Model override when this skill is active. Accepts model short names (`sonnet`, `opus`, `haiku`).
- `effort`: Effort level override when this skill is active. Options: `low`, `medium`, `high`, `max` (Opus 4.6 only).
  Overrides the session effort level.
- `context`: Set to `fork` to run the skill in an isolated subagent context.
- `agent`: Subagent type when `context: fork` is set. Built-ins: `Explore`, `Plan`, `general-purpose`. Also accepts any
  custom subagent name from `.claude/agents/`. Defaults to `general-purpose` if omitted.
- `hooks`: Skill-scoped lifecycle hooks. Same format as session hooks in `settings.json`.
- `paths`: Glob patterns limiting when this skill is auto-activated. Comma-separated string or YAML list. Claude loads
  the skill automatically only when working with files matching these patterns.
- `shell`: Shell for `!` commands in this skill. `bash` (default) or `powershell`. Requires
  `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` for PowerShell.

### Invocation Control Matrix

| Frontmatter                      | User invoke | Claude invoke | Description in context |
| :------------------------------- | :---------- | :------------ | :--------------------- |
| (default)                        | Yes         | Yes           | Always                 |
| `disable-model-invocation: true` | Yes         | No            | Never                  |
| `user-invocable: false`          | No          | Yes           | Always                 |

## Name Field Rules

- Allowed characters: `a-z`, `0-9`, `-`
- Cannot start or end with a hyphen
- No consecutive hyphens (`my--skill` is invalid)
- Max 64 characters
- Must match parent directory name exactly
- Cannot contain reserved words: `anthropic`, `claude`
- Cannot contain XML tags

**Valid:** `pdf-processing`, `code-review`, `data-analysis-v2`

**Invalid:** `PDF-Processing` (uppercase), `-pdf` (leading hyphen), `my--skill` (consecutive hyphens), `claude-helper`
(reserved word)

**Naming strategy:** Gerund or noun-phrase forms both work. Avoid vague names (`helper`, `utils`, `tools`).

## Description Field Rules

- Max 1024 characters (open standard)
- Max 250 characters before truncation in the skill listing (Claude Code)
- Must describe both what the skill does AND when to use it
- Front-load the key use case — descriptions are truncated from the end
- No XML tags (plain text only)
- No second-person framing ("You can use this to...")

## Skill Discovery and Precedence

### Location Precedence

When skills share the same name, higher-priority location wins:

```
enterprise > personal > project
```

- Enterprise: managed settings (org-wide)
- Personal: `~/.claude/skills/<name>/SKILL.md`
- Project: `.claude/skills/<name>/SKILL.md`
- Plugin: `<plugin>/skills/<name>/SKILL.md` — uses `plugin-name:skill-name` namespace, cannot conflict

If a command (`.claude/commands/`) and a skill share the same name, the skill takes precedence.

### Nested Directory Discovery

Claude Code automatically discovers skills from `.claude/skills/` in subdirectories. Editing a file in
`packages/frontend/` causes Claude Code to also look for skills in `packages/frontend/.claude/skills/`. Supports
monorepo setups where packages have their own skills.

### `--add-dir` Exception

Skills in `.claude/skills/` within an `--add-dir` directory are loaded automatically and picked up by live change
detection. Other `.claude/` configuration (subagents, commands, output styles) is not loaded from additional
directories.

## Progressive Disclosure

Skills load in three stages — only the relevant stage occupies the context window at any given time:

- **Level 1 — Metadata** (startup): `name` + `description` from frontmatter. ~30–100 tokens per skill. Always loaded
  unless `disable-model-invocation: true`, which removes the skill from context entirely.
- **Level 2 — Instructions** (skill triggered): Full `SKILL.md` body injected as a single user message. Target under
  5,000 tokens.
- **Level 3 — Resources** (as referenced): Files in `references/`, `scripts/`, `assets/`. Loaded on demand via Read or
  Bash. No practical size limit — unused files cost zero tokens.

### Description Budget

All skill names are always included in context. Descriptions are loaded up to a character budget:

- Default budget: 1% of context window (fallback: 8,000 characters)
- Each description entry capped at 250 characters regardless of total budget
- At ~250 chars per entry with the 8K fallback: approximately 32 skills before truncation begins
- Override: `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable
- `disable-model-invocation: true` excludes a skill's description entirely, freeing budget for others

### Skill Content Lifecycle

- Skill content enters the conversation as a single message on invocation and stays for the rest of the session
- Claude Code does not re-read the skill file on later turns — write guidance as standing instructions, not one-time
  steps
- On auto-compaction: each invoked skill is re-attached (first 5,000 tokens per skill); all re-attached skills share a
  combined 25,000-token budget, filled from most-recently-invoked skill first; older skills can be dropped entirely

## String Substitutions

All `${...}` variables resolve at skill load time — Claude sees the expanded value, not the variable syntax.

- `$ARGUMENTS`: All arguments passed when invoking. If absent from content, arguments are appended as
  `ARGUMENTS: <value>`.
- `$ARGUMENTS[N]`: Specific argument by 0-based index. Multi-word values require shell-style quoting at call site.
- `$N`: Shorthand for `$ARGUMENTS[N]` (`$0`, `$1`, etc.).
- `${CLAUDE_SESSION_ID}`: Current session ID. Useful for logging or session-specific files.
- `${CLAUDE_SKILL_DIR}`: Absolute path to the skill's own directory. Use in all reference paths so Claude receives
  unambiguous paths it can pass directly to the Read tool.

**`$ARGUMENTS` example:**

```markdown
Fix GitHub issue $ARGUMENTS following our coding standards.
```

Running `/fix-issue 123` → Claude receives: "Fix GitHub issue 123 following our coding standards."

**`${CLAUDE_SKILL_DIR}` example:**

```markdown
For form-filling details, see `${CLAUDE_SKILL_DIR}/references/forms.md`.
```

Claude receives the expanded absolute path. Use this variable in all reference paths and route-to-reference tables
instead of relative paths.

## Reference Files

Files in the skill directory that Claude reads on demand via the Read tool.

**When to use references:**

- Detailed documentation (API specs, schemas)
- Large example collections
- Domain-specific knowledge that applies only sometimes
- Content too large for the SKILL.md instruction core

**How to reference:** Always use `${CLAUDE_SKILL_DIR}` for paths:

```markdown
For complete API reference, see `${CLAUDE_SKILL_DIR}/references/api.md`.
```

**Depth constraint:** Keep references one level deep from `SKILL.md`. Claude may partially read deeply nested
references.

**TOC for long references:** For reference files longer than ~100 lines, include a table of contents at the top. Claude
may preview files with partial reads; a TOC ensures it can assess the full scope before deciding what to read in full.

**Critical design rule:** Agents do not reliably load references. Put every rule and directive the agent needs in
SKILL.md. Use references for content that enriches but is not required for correctness.

## Scripts Directory

Executable code Claude runs via Bash tool. Script code does not enter context — only output does.

**When to use scripts:**

- Deterministic operations (validation, parsing, transformation)
- Operations better expressed in code than prose
- Generating visual output (HTML reports, charts)

**Script principles:**

- Self-contained or clearly document dependencies
- Handle errors gracefully — include helpful error messages, don't punt to Claude
- Document constants (no magic numbers)

## Assets Directory

Static resources Claude references by path but does not load into context (templates, binary files, configuration
examples).

**Difference from references:**

- `references/`: Text files loaded into context via Read
- `assets/`: Files manipulated by path only — never loaded into context

## Dynamic Context Injection

The `` !`<command>` `` syntax runs shell commands during skill rendering, before Claude sees any content. Command output
replaces the placeholder. This is preprocessing — Claude only sees the final rendered result.

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
---

## Pull request context
- PR diff: !`gh pr diff`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

For multi-line commands, use a fenced block opened with ` ```! `.

Disable shell injection org-wide: `"disableSkillShellExecution": true` in managed settings. Each command is replaced
with `[shell command execution disabled by policy]`. Bundled and managed skills are not affected.

## Subagent Execution

`context: fork` runs the skill in an isolated subagent. The skill content becomes the subagent's prompt. The subagent
has no access to the parent conversation history.

| Approach                     | System prompt                        | Task              | Also loads       |
| :--------------------------- | :----------------------------------- | :---------------- | :--------------- |
| Skill with `context: fork`   | From agent type (Explore, Plan, ...) | SKILL.md content  | CLAUDE.md        |
| Subagent with `skills` field | Subagent's markdown body             | Delegation prompt | Preloaded skills |

**Warning:** `context: fork` only makes sense for skills with explicit task instructions. A skill containing only
guidelines (without an actionable task) will return no meaningful output.

## Extended Thinking

Include the word `ultrathink` anywhere in the skill content to enable extended thinking mode when the skill is active.

## Instruction Budget

Frontier models reliably follow ~150–200 instructions total. Claude Code's own system prompt consumes ~50. As loaded
instructions increase, instruction-following quality degrades uniformly — not just for later instructions, but for all.

- Keep SKILL.md focused on behavioral directives
- A skill with 40+ behavioral rules approaches the limit of reliable compliance
- Distinguish behavioral rules (must stay in SKILL.md) from catalog/reference content (belongs in `references/`)

## SDK Behavior Differences

When using Skills through the Claude Agent SDK:

- Skills must be filesystem artifacts — no programmatic registration API exists
- Require explicit `settingSources: ['user', 'project']` (TS) / `setting_sources=["user", "project"]` (Python)
- Must include `"Skill"` in `allowedTools` to enable the Skill tool
- `allowed-tools` frontmatter field has no effect — control tool access via SDK's `allowedTools` option instead
- Default SDK behavior loads no filesystem settings — skills are not discovered unless `settingSources` is configured
