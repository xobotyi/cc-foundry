# Skills Reference

> **Action Required:** When creating, editing, or improving skills, invoke
> the `ai-helpers:skill-engineering` skill first.

Skills extend Claude Code with custom instructions. Create a `SKILL.md` file,
and Claude adds it to its toolkit. Claude uses skills when relevant, or you
can invoke directly with `/skill-name`.

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

| Location   | Path                                     | Scope                          |
|------------|------------------------------------------|--------------------------------|
| Enterprise | Managed settings                         | All users in organization      |
| Personal   | `~/.claude/skills/<name>/SKILL.md`       | All your projects              |
| Project    | `.claude/skills/<name>/SKILL.md`         | This project only              |
| Plugin     | `<plugin>/skills/<name>/SKILL.md`        | Where plugin is enabled        |

Priority: enterprise > personal > project. Plugin skills use `plugin-name:skill-name`
namespace and cannot conflict.

## Frontmatter Reference

```yaml
---
name: my-skill
description: What this skill does and when to use it
argument-hint: "[filename] [format]"
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Grep, Glob
model: opus
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

| Field                      | Required    | Description                                                |
|----------------------------|-------------|------------------------------------------------------------|
| `name`                     | No          | Display name (defaults to directory name). Lowercase, hyphens, max 64 chars |
| `description`              | Recommended | What the skill does and when to use it. Claude uses this for auto-invocation |
| `argument-hint`            | No          | Hint shown during autocomplete (e.g., `[issue-number]`)    |
| `disable-model-invocation` | No          | `true` = only user can invoke. Default: `false`            |
| `user-invocable`           | No          | `false` = hide from `/` menu. Default: `true`              |
| `allowed-tools`            | No          | Tools Claude can use without permission when skill active  |
| `model`                    | No          | Model to use when skill is active                          |
| `context`                  | No          | `fork` = run in isolated subagent context                  |
| `agent`                    | No          | Subagent type when `context: fork` (`Explore`, `Plan`, custom) |
| `hooks`                    | No          | Hooks scoped to skill lifecycle                            |

## Invocation Control

| Frontmatter                      | You can invoke | Claude can invoke | When loaded into context                     |
|----------------------------------|----------------|-------------------|----------------------------------------------|
| (default)                        | Yes            | Yes               | Description always, full skill when invoked  |
| `disable-model-invocation: true` | Yes            | No                | Description not in context                   |
| `user-invocable: false`          | No             | Yes               | Description always, full skill when invoked  |

## String Substitutions

| Variable               | Description                                              |
|------------------------|----------------------------------------------------------|
| `$ARGUMENTS`           | All arguments passed when invoking                       |
| `$ARGUMENTS[N]`        | Specific argument by 0-based index                       |
| `$N`                   | Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`)         |
| `${CLAUDE_SESSION_ID}` | Current session ID                                       |

**Example:**

```yaml
---
name: migrate-component
description: Migrate a component from one framework to another
---

Migrate the $0 component from $1 to $2.
Preserve all existing behavior and tests.
```

Run `/migrate-component SearchBar React Vue`.

## Dynamic Context Injection

The `` !`command` `` syntax runs shell commands before the skill content is sent.
Output replaces the placeholder:

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

Commands execute immediately (preprocessing), not by Claude.

## Run Skills in Subagents

Add `context: fork` to run in isolation. The skill content becomes the subagent's prompt:

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
2. Subagent receives skill content as prompt
3. `agent` field determines environment (model, tools, permissions)
4. Results summarized and returned to main conversation

Available agents: `Explore`, `Plan`, `general-purpose`, or custom from `.claude/agents/`.

## Supporting Files

Keep `SKILL.md` under 500 lines. Move detailed content to separate files:

```
my-skill/
├── SKILL.md              # Overview and navigation
├── reference.md          # Detailed API docs
├── examples.md           # Usage examples
└── scripts/
    └── helper.py         # Utility script
```

Reference from SKILL.md:

```markdown
## Additional resources
- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)
```

## Restrict Tool Access

Limit tools Claude can use when skill is active:

```yaml
---
name: safe-reader
description: Read files without making changes
allowed-tools: Read, Grep, Glob
---
```

## Permission Rules for Skills

Control which skills Claude can invoke via permission rules:

```
# Allow specific skills
Skill(commit)
Skill(review-pr *)

# Deny specific skills
Skill(deploy *)
```

Syntax: `Skill(name)` for exact match, `Skill(name *)` for prefix match.

## Hooks in Skills

Skills can define hooks scoped to their lifecycle:

```yaml
---
name: secure-operations
description: Perform operations with security checks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

Hooks cleaned up when skill finishes.

## Visual Output Pattern

Skills can bundle scripts that generate visual output:

```yaml
---
name: codebase-visualizer
description: Generate an interactive tree visualization
allowed-tools: Bash(python *)
---

# Codebase Visualizer

Run the visualization script:

```bash
python ~/.claude/skills/codebase-visualizer/scripts/visualize.py .
```

This creates `codebase-map.html` and opens it in your browser.
```

The script generates HTML that opens in the browser for interactive exploration.

## Troubleshooting

### Skill not triggering

1. Check description includes keywords users would naturally say
2. Verify skill appears in `What skills are available?`
3. Try rephrasing request to match description
4. Invoke directly with `/skill-name`

### Skill triggers too often

1. Make description more specific
2. Add `disable-model-invocation: true` for manual-only

### Claude doesn't see all skills

Skill descriptions have a character budget (default 15,000). Run `/context` to
check for warnings about excluded skills.

Increase limit: `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable.

## Skills vs Commands

Files in `.claude/commands/` still work with the same frontmatter. Skills are
recommended because they support additional features like supporting files.

If a skill and command share the same name, the skill takes precedence.
