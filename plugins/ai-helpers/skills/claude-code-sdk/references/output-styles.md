# Output Styles Reference

> **Action Required:** When creating, editing, or improving output styles,
> invoke the `ai-helpers:output-style-engineering` skill first.

Output styles adapt Claude Code for uses beyond software engineering by
modifying the system prompt.

## Built-in Styles

| Style         | Description                                                  |
|---------------|--------------------------------------------------------------|
| **Default**   | Efficient software engineering                               |
| **Explanatory** | Educational "Insights" between tasks, explains patterns    |
| **Learning**  | Collaborative mode with `TODO(human)` markers for you to implement |

## How Output Styles Work

- All styles exclude instructions for efficient output (responding concisely)
- Custom styles exclude coding instructions unless `keep-coding-instructions: true`
- Style instructions added to end of system prompt
- Reminders triggered during conversation to maintain style adherence

## Change Your Output Style

**Via menu:**

```
/output-style
```

Or access from `/config` menu.

**Direct switch:**

```
/output-style explanatory
```

Changes saved to `.claude/settings.local.json` (local project level).

## Create Custom Output Styles

Custom styles are Markdown files with frontmatter:

```markdown
---
name: My Custom Style
description: Brief description for the UI
keep-coding-instructions: true
---

# Custom Style Instructions

You are an interactive CLI tool that helps users with software engineering
tasks. [Your custom instructions here...]

## Specific Behaviors

[Define how the assistant should behave...]
```

**Locations:**

- User level: `~/.claude/output-styles/`
- Project level: `.claude/output-styles/`

## Frontmatter

| Field                    | Purpose                                      | Default           |
|--------------------------|----------------------------------------------|-------------------|
| `name`                   | Display name                                 | From filename     |
| `description`            | Shown in `/output-style` UI                  | None              |
| `keep-coding-instructions` | Keep coding-related system prompt parts    | `false`           |

## Comparisons

### Output Styles vs CLAUDE.md

- **Output styles**: Modify/replace parts of default system prompt
- **CLAUDE.md**: Added as user message after system prompt (additive)

### Output Styles vs --append-system-prompt

- **Output styles**: Can exclude default instructions (subtractive + additive)
- **--append-system-prompt**: Only appends to system prompt (additive)

### Output Styles vs Agents

- **Output styles**: Always active, only affect system prompt
- **Agents**: Invoked for specific tasks, include model/tools/context settings

### Output Styles vs Skills

- **Output styles**: Modify response formatting/tone, always active when selected
- **Skills**: Task-specific prompts invoked with `/skill-name` or auto-loaded

Use output styles for consistent formatting preferences.
Use skills for reusable workflows and tasks.
