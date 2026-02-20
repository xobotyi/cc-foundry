# Skills Reference

> **Action Required:** When creating, editing, or improving skills, invoke
> the `ai-helpers:skill-engineering` skill first.

Skills extend Claude Code with custom instructions. Create a `SKILL.md` file,
and Claude adds it to its toolkit. Claude uses skills when relevant, or you
can invoke directly with `/skill-name`.

Skills follow the [Agent Skills](https://agentskills.io) open standard.
Claude Code extends it with invocation control, subagent execution, and
dynamic context injection.

> **Legacy:** `.claude/commands/` files still work and support the same frontmatter.
> Skills are recommended — they support supporting files and additional features.
> If a skill and command share the same name, the skill takes precedence.

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

| Location   | Path                                     | Scope                     |
|------------|------------------------------------------|---------------------------|
| Enterprise | Managed settings                         | All users in organization |
| Personal   | `~/.claude/skills/<name>/SKILL.md`       | All your projects         |
| Project    | `.claude/skills/<name>/SKILL.md`         | This project only         |
| Plugin     | `<plugin>/skills/<name>/SKILL.md`        | Where plugin is enabled   |

Priority: enterprise > personal > project. Plugin skills use `plugin-name:skill-name`
namespace and cannot conflict with other levels.

### Nested Directory Discovery

Claude Code discovers skills from nested `.claude/skills/` directories when you work
with files in subdirectories. Editing a file in `packages/frontend/` also discovers
skills in `packages/frontend/.claude/skills/`. Supports monorepo setups where packages
define their own skills.

### Skills from `--add-dir` Directories

Skills in `.claude/skills/` within directories added via `--add-dir` are loaded
automatically and support live change detection (editable without restarting).

CLAUDE.md files from `--add-dir` directories are **not** loaded by default. Set
`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` to load them.

## Content Design Patterns

Skill content falls into two categories that guide frontmatter choices:

| Pattern               | Purpose                                                      | Typical invocation  | `context` | `disable-model-invocation` |
|-----------------------|--------------------------------------------------------------|---------------------|-----------|----------------------------|
| **Reference content** | Knowledge Claude applies to current work (conventions,       | Auto or manual      | (inline)  | `false`                    |
|                       | patterns, style guides)                                      |                     |           |                            |
| **Task content**      | Step-by-step instructions for a specific action (deploy,     | Manual (`/name`)    | `fork`    | `true`                     |
|                       | commit, generate)                                            |                     |           |                            |

Reference content runs inline so Claude uses it alongside conversation context.
Task content often runs in a subagent and should use `disable-model-invocation: true`
to prevent Claude from triggering it automatically.

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

| Field                      | Required    | Description                                                                          |
|----------------------------|-------------|--------------------------------------------------------------------------------------|
| `name`                     | No          | Display name (defaults to directory name). Lowercase, hyphens, max 64 chars.        |
| `description`              | Recommended | What the skill does and when to use it. Claude uses this for auto-invocation. If    |
|                            |             | omitted, uses the first paragraph of markdown content.                               |
| `argument-hint`            | No          | Hint shown during autocomplete (e.g., `[issue-number]`).                            |
| `disable-model-invocation` | No          | `true` = only user can invoke. Removes skill from Claude's context. Default: `false`.|
| `user-invocable`           | No          | `false` = hide from `/` menu. Claude can still auto-invoke. Default: `true`.        |
| `allowed-tools`            | No          | Tools Claude can use without per-use approval when skill is active.                  |
| `model`                    | No          | Model to use when skill is active.                                                   |
| `context`                  | No          | `fork` = run in isolated subagent context.                                           |
| `agent`                    | No          | Subagent type when `context: fork` (`Explore`, `Plan`, `general-purpose`, or custom).|
| `hooks`                    | No          | Hooks scoped to skill lifecycle. Cleaned up when skill finishes.                     |

## Invocation Control

| Frontmatter                      | You can invoke | Claude can invoke | When loaded into context                    |
|----------------------------------|----------------|-------------------|---------------------------------------------|
| (default)                        | Yes            | Yes               | Description always; full skill when invoked |
| `disable-model-invocation: true` | Yes            | No                | Neither description nor full skill          |
| `user-invocable: false`          | No             | Yes               | Description always; full skill when invoked |

**Key distinction:** `user-invocable: false` hides from the `/` menu but does **not** block
the Skill tool. Claude can still auto-invoke it. To block programmatic invocation entirely,
use `disable-model-invocation: true`.

**Permission rules** — control which skills Claude can invoke:

```
# Allow specific skills
Skill(commit)
Skill(review-pr *)

# Deny specific skills
Skill(deploy *)
```

Syntax: `Skill(name)` for exact match, `Skill(name *)` for prefix match with any arguments.
To disable all skills, deny the `Skill` tool in `/permissions`.

**Context budget:** Skill descriptions compete for context space — budget is 2% of the context
window, with a fallback of 16,000 characters. Run `/context` to check for warnings about
excluded skills. Override with `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.

## String Substitutions

| Variable               | Description                                                        |
|------------------------|--------------------------------------------------------------------|
| `$ARGUMENTS`           | All arguments passed when invoking                                 |
| `$ARGUMENTS[N]`        | Specific argument by 0-based index                                 |
| `$N`                   | Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`)                  |
| `${CLAUDE_SESSION_ID}` | Current session ID (useful for logging, session-specific files)    |

If `$ARGUMENTS` is not present in the skill content, arguments are appended as
`ARGUMENTS: <value>` — Claude still sees the input.

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

The `` !`command` `` syntax runs shell commands before the skill content is sent to Claude.
Output replaces the placeholder (preprocessing — Claude only sees the final rendered prompt):

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

**Extended thinking:** Include the word `ultrathink` anywhere in skill content to enable
extended thinking mode.

## Run Skills in Subagents

Add `context: fork` to run in isolation. The skill content becomes the subagent's prompt.
The subagent does not have access to conversation history.

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

Available agents: `Explore`, `Plan`, `general-purpose`, or custom from `.claude/agents/`.
If `agent` is omitted, uses `general-purpose`.

**Warning:** `context: fork` only makes sense for skills with explicit task instructions.
A skill containing only guidelines (no actionable prompt) returns without meaningful output.

### Skills vs Subagents

Skills with `context: fork` and subagents from `.claude/agents/` both delegate work,
but from opposite directions:

| Approach                     | System prompt                             | Task                        | Also loads                   |
|------------------------------|-------------------------------------------|-----------------------------|------------------------------|
| Skill with `context: fork`   | From agent type (`Explore`, `Plan`, etc.) | SKILL.md content            | CLAUDE.md                    |
| Subagent with `skills` field | Subagent's markdown body                  | Claude's delegation message | Preloaded skills + CLAUDE.md |

With `context: fork`, you write the task in the skill and pick an agent type.
For the inverse (custom subagent that loads skills as reference), see the subagents reference.

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

Reference from SKILL.md so Claude knows what each file contains and when to load it:

```markdown
## Additional resources
- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)
```

Skills can also bundle and run scripts in any language (Python, Bash, etc.) to generate
visual output, run analysis, or extend what's possible in a single prompt.

## Share Skills

| Method             | Mechanism                                         | Audience             |
|--------------------|---------------------------------------------------|----------------------|
| **Project skills** | Commit `.claude/skills/` to version control       | Project contributors |
| **Plugins**        | Create `skills/` directory in a plugin            | Plugin users         |
| **Managed**        | Deploy via managed settings                       | Organization-wide    |

## Troubleshooting

### Skill not triggering

1. Check description includes keywords users would naturally say
2. Verify skill appears in `What skills are available?`
3. Try rephrasing request to match description more closely
4. Invoke directly with `/skill-name`

### Skill triggers too often

1. Make description more specific
2. Add `disable-model-invocation: true` for manual-only invocation

### Claude doesn't see all skills

Skill descriptions have a character budget: 2% of the context window, fallback 16,000 chars.
Run `/context` to check for warnings. Override with `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.
