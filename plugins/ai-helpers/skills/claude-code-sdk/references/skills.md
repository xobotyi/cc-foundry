# Skills Reference

> **Action Required:** When creating, editing, or improving skills, invoke the `ai-helpers:skill-engineering` skill
> first.

Skills extend Claude Code with custom instructions. Create a `SKILL.md` file, and Claude adds it to its toolkit. Claude
uses skills when relevant, or you can invoke directly with `/skill-name`.

Skills follow the [Agent Skills](https://agentskills.io) open standard. Claude Code extends it with invocation control,
subagent execution, and dynamic context injection.

> **Legacy:** `.claude/commands/` files still work and support the same frontmatter. Skills are recommended — they
> support supporting files and additional features. If a skill and command share the same name, the skill takes
> precedence.

## Bundled Skills

Bundled skills ship with Claude Code and are available in every session. Unlike built-in commands (which execute fixed
logic directly), bundled skills are prompt-based: they give Claude a detailed playbook and let it orchestrate the work
using its tools. This means bundled skills can spawn parallel agents, read files, and adapt to your codebase.

- `/batch <instruction>` — orchestrate large-scale changes across a codebase in parallel. Researches the codebase,
  decomposes work into 5-30 independent units, presents a plan. Once approved, spawns one background agent per unit in
  an isolated git worktree. Each agent implements its unit, runs tests, and opens a PR. Requires a git repository.
- `/claude-api` — load Claude API reference material for your project's language (Python, TypeScript, Java, Go, Ruby,
  C#, PHP, cURL) and Agent SDK reference for Python and TypeScript. Auto-activates when code imports `anthropic`,
  `@anthropic-ai/sdk`, or `claude_agent_sdk`.
- `/debug [description]` — troubleshoot current session by reading the session debug log. Optionally describe the issue
  to focus analysis.
- `/loop [interval] <prompt>` — run a prompt repeatedly on an interval while the session stays open. Useful for polling
  deployments, babysitting PRs, or periodically re-running another skill.
- `/simplify [focus]` — review recently changed files for code reuse, quality, and efficiency issues. Spawns three
  review agents in parallel, aggregates findings, and applies fixes. Pass text to focus on specific concerns.

## Skill Structure

```
skill-name/
├── SKILL.md           # Main instructions (required)
├── references/        # Detailed docs loaded on-demand
│   └── *.md
└── scripts/           # Scripts Claude can execute
    └── *.sh
```

**Locations:**

- Enterprise — managed settings. Scope: all users in organization.
- Personal — `~/.claude/skills/<name>/SKILL.md`. Scope: all your projects.
- Project — `.claude/skills/<name>/SKILL.md`. Scope: this project only.
- Plugin — `<plugin>/skills/<name>/SKILL.md`. Scope: where plugin is enabled.

Priority: enterprise > personal > project. Plugin skills use `plugin-name:skill-name` namespace and cannot conflict with
other levels.

### Nested Directory Discovery

Claude Code discovers skills from nested `.claude/skills/` directories when you work with files in subdirectories.
Editing a file in `packages/frontend/` also discovers skills in `packages/frontend/.claude/skills/`. Supports monorepo
setups where packages define their own skills.

### Skills from `--add-dir` Directories

Skills in `.claude/skills/` within directories added via `--add-dir` are loaded automatically and support live change
detection (editable without restarting).

CLAUDE.md files from `--add-dir` directories are **not** loaded by default. Set
`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` to load them.

## Content Design Patterns

Skill content falls into two categories that guide frontmatter choices:

- **Reference content** — knowledge Claude applies to current work (conventions, patterns, style guides). Typical
  invocation: auto or manual. `context`: inline. `disable-model-invocation`: `false`.
- **Task content** — step-by-step instructions for a specific action (deploy, commit, generate). Typical invocation:
  manual (`/name`). `context`: `fork`. `disable-model-invocation`: `true`.

Reference content runs inline so Claude uses it alongside conversation context. Task content often runs in a subagent
and should use `disable-model-invocation: true` to prevent Claude from triggering it automatically.

## Frontmatter Reference

```yaml
---
name: my-skill
description: What this skill does and when to use it
argument-hint: "[filename] [format]"
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Grep, Glob
model: claude-opus-4-6
effort: high
context: fork
agent: Explore
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
---
```

- `name` — Display name (defaults to directory name). Lowercase, hyphens, max 64 chars. Required: No.
- `description` — What the skill does and when to use it. Claude uses this for auto-invocation. If omitted, uses the
  first paragraph of markdown content. Required: Recommended.
- `argument-hint` — Hint shown during autocomplete (e.g., `[issue-number]`). Required: No.
- `disable-model-invocation` — `true` = only user can invoke. Removes skill from Claude's context. Default: `false`.
  Required: No.
- `user-invocable` — `false` = hide from `/` menu. Claude can still auto-invoke. Default: `true`. Required: No.
- `allowed-tools` — Tools Claude can use without per-use approval when skill is active. Required: No.
- `model` — Model to use when skill is active. Required: No.
- `effort` — Effort level when skill is active. Overrides session effort level. Options: `low`, `medium`, `high`, `max`
  (Opus 4.6 only). Default: inherits from session. Required: No.
- `context` — `fork` = run in isolated subagent context. Required: No.
- `agent` — Subagent type when `context: fork` (`Explore`, `Plan`, `general-purpose`, or custom). Required: No.
- `hooks` — Hooks scoped to skill lifecycle. Cleaned up when skill finishes. Required: No.

## Invocation Control

- **(default)** — you: yes / Claude: yes — description always loaded; full skill when invoked
- **`disable-model-invocation: true`** — you: yes / Claude: no — neither description nor full skill loaded
- **`user-invocable: false`** — you: no / Claude: yes — description always loaded; full skill when invoked

**Key distinction:** `user-invocable: false` hides from the `/` menu but does **not** block the Skill tool. Claude can
still auto-invoke it. To block programmatic invocation entirely, use `disable-model-invocation: true`.

**Permission rules** — control which skills Claude can invoke:

```
# Allow specific skills
Skill(commit)
Skill(review-pr *)

# Deny specific skills
Skill(deploy *)
```

Syntax: `Skill(name)` for exact match, `Skill(name *)` for prefix match with any arguments. To disable all skills, deny
the `Skill` tool in `/permissions`.

**Context budget:** Skill descriptions compete for context space — budget is 2% of the context window, with a fallback
of 16,000 characters. Run `/context` to check for warnings about excluded skills. Override with
`SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.

## String Substitutions

- `$ARGUMENTS` — All arguments passed when invoking
- `$ARGUMENTS[N]` — Specific argument by 0-based index
- `$N` — Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`)
- `${CLAUDE_SESSION_ID}` — Current session ID (useful for logging, session-specific files)
- `${CLAUDE_SKILL_DIR}` — Directory containing the skill's `SKILL.md` file. For plugin skills, this is the skill's
  subdirectory within the plugin, not the plugin root. Use in bash injection commands to reference bundled scripts/files
  regardless of current working directory.

If `$ARGUMENTS` is not present in the skill content, arguments are appended as `ARGUMENTS: <value>` — Claude still sees
the input.

**Example:**

```yaml
---
name: migrate-component
description: Migrate a component from one framework to another
---

Migrate the $0 component from $1 to $2.
Preserve all existing behavior and tests.
```

Run `/migrate-component SearchBar React Vue` — `$0` = SearchBar, `$1` = React, `$2` = Vue.

## Dynamic Context Injection

The `` !`command` `` syntax runs shell commands before the skill content is sent to Claude. Output replaces the
placeholder (preprocessing — Claude only sees the final rendered prompt):

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

**Extended thinking:** Include the word `ultrathink` anywhere in skill content to enable extended thinking mode.

## Run Skills in Subagents

Add `context: fork` to run in isolation. The skill content becomes the subagent's prompt. The subagent does not have
access to conversation history.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

**How it works:**

1. New isolated context created
2. Subagent receives skill content as its prompt
3. `agent` field determines environment (model, tools, permissions)
4. Results summarized and returned to main conversation

Available agents: `Explore`, `Plan`, `general-purpose`, or custom from `.claude/agents/`. If `agent` is omitted, uses
`general-purpose`.

**Warning:** `context: fork` only makes sense for skills with explicit task instructions. A skill containing only
guidelines (no actionable prompt) returns without meaningful output.

### Skills vs Subagents

Skills with `context: fork` and subagents from `.claude/agents/` both delegate work, but from opposite directions:

| Approach                     | System prompt                             | Task                        | Also loads                   |
| ---------------------------- | ----------------------------------------- | --------------------------- | ---------------------------- |
| Skill with `context: fork`   | From agent type (`Explore`, `Plan`, etc.) | SKILL.md content            | CLAUDE.md                    |
| Subagent with `skills` field | Subagent's markdown body                  | Claude's delegation message | Preloaded skills + CLAUDE.md |

With `context: fork`, you write the task in the skill and pick an agent type. For the inverse (custom subagent that
loads skills as reference), see the subagents reference.

## Supporting Files

Keep `SKILL.md` under 500 lines. Move detailed content to separate files:

```
my-skill/
├── SKILL.md              # Overview and navigation
├── reference.md          # Detailed API docs — loaded when needed
├── examples.md           # Usage examples — loaded when needed
└── scripts/
    └── helper.py         # Utility script — executed, not loaded into context
```

Reference from SKILL.md using `${CLAUDE_SKILL_DIR}` so Claude sees absolute paths it can pass directly to the Read tool:

```markdown
## Additional resources
- For complete API details, see `${CLAUDE_SKILL_DIR}/reference.md`
- For usage examples, see `${CLAUDE_SKILL_DIR}/examples.md`
```

Skills can also bundle and run scripts in any language (Python, Bash, etc.) to generate visual output (interactive
HTML), run analysis, or extend what's possible in a single prompt. The bundled script does the heavy lifting while
Claude handles orchestration.

## Share Skills

- **Project skills** — Commit `.claude/skills/` to version control. Audience: Project contributors.
- **Plugins** — Create `skills/` directory in a plugin. Audience: Plugin users.
- **Managed** — Deploy via managed settings. Audience: Organization-wide.

## Troubleshooting

### Skill not triggering

- Check description includes keywords users would naturally say
- Verify skill appears in `What skills are available?`
- Try rephrasing request to match description more closely
- Invoke directly with `/skill-name`

### Skill triggers too often

- Make description more specific
- Add `disable-model-invocation: true` for manual-only invocation

### Claude doesn't see all skills

Skill descriptions have a character budget: 2% of the context window, fallback 16,000 chars. Run `/context` to check for
warnings. Override with `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.
