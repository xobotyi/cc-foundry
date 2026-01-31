# Skill Specification

Technical requirements for valid skills.

## File Structure

```
skill-name/
├── SKILL.md           # Required
├── references/        # Optional: docs loaded as needed
│   └── *.md
├── scripts/           # Optional: executable code
│   └── *.py, *.sh
└── assets/            # Optional: files used in output
    └── templates, images, fonts
```

## SKILL.md Format

```yaml
---
name: skill-name
description: What it does and when to use it
---

# Skill Title

[Markdown content]
```

## Frontmatter Fields

### Required Fields

#### `name`
- **Type:** string
- **Max length:** 64 characters
- **Pattern:** `^[a-z0-9-]+$` (lowercase letters, digits, hyphens)
- **Constraints:**
  - Cannot start or end with hyphen
  - Cannot contain consecutive hyphens (`--`)
  - Cannot contain `<` or `>`
  - Cannot contain reserved words: "anthropic", "claude"
  - Should match directory name

**Valid examples:**
```
my-skill
data-analyzer
pdf-processing-v2
```

**Invalid examples:**
```
My-Skill        # uppercase
my_skill        # underscore
-my-skill       # starts with hyphen
my--skill       # consecutive hyphens
claude-helper   # reserved word
```

#### `description`
- **Type:** string
- **Max length:** 1024 characters
- **Constraints:**
  - Must be non-empty
  - Cannot contain `<` or `>`

**Content guidance:**
- Include what the skill does
- Include when/triggers for using it
- Claude uses this to decide when to apply the skill

### Optional Fields

#### `allowed-tools`
- **Type:** comma-separated string or YAML list
- **Purpose:** Tools Claude can use without asking permission
- **Note:** Only supported in Claude Code

```yaml
# String format
allowed-tools: Read, Grep, Glob

# YAML list format
allowed-tools:
  - Read
  - Grep
  - Glob
```

#### `model`
- **Type:** string
- **Purpose:** Model to use when skill is active
- **Values:** Model ID (e.g., `claude-sonnet-4-20250514`) or alias
- **Default:** Inherits from conversation's model

#### `context`
- **Type:** string
- **Purpose:** Run skill in isolated context
- **Values:** `fork` (runs in forked sub-agent context)

#### `agent`
- **Type:** string
- **Purpose:** Agent type when `context: fork` is set
- **Values:** `Explore`, `Plan`, `general-purpose`, or custom agent name
- **Default:** `general-purpose`
- **Note:** Only applicable with `context: fork`

#### `hooks`
- **Type:** object
- **Purpose:** Hooks scoped to skill's lifecycle
- **Events:** `PreToolUse`, `PostToolUse`, `Stop`

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh $TOOL_INPUT"
          once: true
```

#### `user-invocable`
- **Type:** boolean
- **Purpose:** Controls visibility in slash command menu
- **Default:** `true`
- **Note:** Does not affect Skill tool or auto-discovery

#### `argument-hint`
- **Type:** string
- **Purpose:** Hint shown during autocomplete for expected arguments
- **Example:** `[issue-number]` or `[filename] [format]`

#### `disable-model-invocation`
- **Type:** boolean
- **Purpose:** Blocks programmatic invocation via Skill tool
- **Default:** `false`
- **Note:** Does not affect slash menu or auto-discovery

## Body Guidelines

### Length
- **Recommended:** Under 500 lines
- **Maximum:** No hard limit, but long skills hurt performance
- **Solution:** Move detailed content to `references/` files

### Content
- Use Markdown formatting
- Imperative form for instructions ("Run command" not "You should run")

## Directory Conventions

### references/
Documentation Claude reads when needed.
- Keep one level deep (no nested references)
- Include table of contents for files >100 lines
- Use descriptive filenames

### scripts/
Executable code.
- Include shebang line (`#!/usr/bin/env python3`)
- Make executable (`chmod +x`)
- Document dependencies
- Scripts executed without loading into context

### assets/
Files used in output, not loaded into context.
- Templates, images, fonts, boilerplate
- Organized by type or purpose

## Validation Checklist

```
[ ] SKILL.md exists in skill directory
[ ] Frontmatter starts with --- on line 1
[ ] Frontmatter ends with --- before content
[ ] name field present and valid
[ ] description field present and valid
[ ] Body is valid Markdown
```

## Locations

Skills loaded from these locations (higher row wins on name collision):

| Location | Path | Applies To |
|----------|------|------------|
| Enterprise | Managed settings | All org users |
| Personal | `~/.claude/skills/` | You, all projects |
| Project | `.claude/skills/` | Anyone in this repo |
| Plugin | Bundled with plugins | Plugin users |

### Personal Skills
```
~/.claude/skills/skill-name/SKILL.md
```
Available across all projects for current user.

### Project Skills
```
.claude/skills/skill-name/SKILL.md
```
Shared with team via git. Available in project directory.

## Skills and Subagents

### Give Subagent Access to Skills

Subagents don't inherit skills from main conversation. List them explicitly:

```yaml
# .claude/agents/code-reviewer.md
---
name: code-reviewer
skills: pr-review, security-check
---
```

Full skill content is injected at subagent startup.

### Run Skill in Subagent Context

Use `context: fork` and `agent` to run skill in isolated subagent:

```yaml
---
name: code-analysis
description: Analyze code quality
context: fork
agent: Explore
---
```
