# Output Style File Structure

## File Format

Output styles are Markdown files with YAML frontmatter:

```markdown
---
name: style-name
description: Brief description for the /output-style menu
keep-coding-instructions: false
---

# Style Title

[Markdown instructions that become the system prompt]
```

## Frontmatter Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | Yes | — | Style identifier (lowercase, hyphens) |
| `description` | Yes | — | Shown in `/output-style` menu |
| `keep-coding-instructions` | No | `false` | Retain coding-specific system prompt parts |

### name

- Lowercase letters, digits, hyphens only
- Should match filename (without `.md`)
- Displayed in style selection menu

### description

- Brief explanation of what the style does
- Shown in `/output-style` menu for selection
- Keep under 100 characters for readability

### keep-coding-instructions

When `true`:
- Retains instructions for code verification, testing, efficiency
- Use for modified coding assistants

When `false` (default):
- Removes all software engineering assumptions
- Use for non-coding domains (research, writing, analysis)

## Body Content

The body becomes Claude's system prompt. Structure it clearly:

```markdown
# Role Definition

You are [role description].

## Core Behaviors

- [Behavior 1]
- [Behavior 2]

## Communication Style

[How to communicate]

## Priorities

[What to focus on, what to avoid]
```

## File Locations

| Location | Path | Scope |
|----------|------|-------|
| User-level | `~/.claude/output-styles/<name>.md` | All projects |
| Project-level | `.claude/output-styles/<name>.md` | This project only |

Project-level styles can be committed to git for team sharing.

## How Styles Are Applied

1. Style content replaces Claude Code's default system prompt
2. All tool capabilities remain (Read, Write, Bash, etc.)
3. CLAUDE.md content still applies (added after system prompt)
4. Style-specific reminders injected during conversation
