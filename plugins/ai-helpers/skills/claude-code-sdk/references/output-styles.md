# Output Styles Reference

> **Action Required:** When creating, editing, or improving output styles,
> invoke the `ai-helpers:output-style-engineering` skill first.

Output styles adapt Claude Code for uses beyond software engineering by modifying the system
prompt. They replace parts of the default prompt rather than appending to it.

## Built-in Styles

| Style           | Description                                                                    |
|-----------------|--------------------------------------------------------------------------------|
| **Default**     | Efficient software engineering                                                 |
| **Explanatory** | Educational "Insights" between tasks, explains implementation choices/patterns |
| **Learning**    | Collaborative mode; shares Insights + adds `TODO(human)` markers for you to implement |

## How Output Styles Work

- All styles **exclude** efficient-output instructions (e.g., "respond concisely")
- Custom styles **exclude** coding instructions unless `keep-coding-instructions: true`
- Style instructions are appended to the end of the system prompt
- Reminders are triggered during conversation to maintain style adherence

## Change Your Output Style

```
/output-style                  # interactive menu (also accessible from /config)
/output-style explanatory      # direct switch
```

Changes apply at local project level and are saved to `.claude/settings.local.json`.
You can also directly edit the `outputStyle` field in any settings file at any scope.

## Create Custom Output Styles

Custom styles are Markdown files with frontmatter, stored at:

| Scope   | Path                      |
|---------|---------------------------|
| User    | `~/.claude/output-styles/` |
| Project | `.claude/output-styles/`  |

```markdown
---
name: My Custom Style
description: Brief description shown in /output-style UI
keep-coding-instructions: true
---

# Custom Style Instructions

You are an interactive CLI tool that helps users with software engineering
tasks. [Your custom instructions here...]

## Specific Behaviors

[Define how the assistant should behave...]
```

## Frontmatter

| Field                      | Purpose                                              | Default       |
|----------------------------|------------------------------------------------------|---------------|
| `name`                     | Display name                                         | From filename |
| `description`              | Shown in `/output-style` UI                          | None          |
| `keep-coding-instructions` | Keep coding-related parts of the default system prompt | `false`     |

## Comparisons

| Feature                  | Modifies system prompt | Subtractive | Additive | Scope         |
|--------------------------|------------------------|-------------|----------|---------------|
| Output styles            | Yes                    | Yes         | Yes      | Always active |
| CLAUDE.md                | No (added as user msg) | No          | Yes      | Always loaded |
| `--append-system-prompt` | Yes (append only)      | No          | Yes      | Session flag  |
| Agents                   | No (own system prompt) | —           | —        | Task-invoked  |
| Skills                   | No (injected prompt)   | —           | Yes      | On-demand     |

**Key distinctions:**

- **vs CLAUDE.md**: Output styles replace parts of the default prompt; CLAUDE.md adds content
  as a user message *after* the system prompt — it cannot remove default instructions.
- **vs `--append-system-prompt`**: That flag only appends; output styles can also suppress
  default sections.
- **vs Agents**: Agents are invoked for specific tasks and control model, tools, and context.
  Output styles only affect the main agent's system prompt.
- **vs Skills**: Output styles are always active once selected and shape formatting/tone.
  Skills are task-specific and invoked on demand.
