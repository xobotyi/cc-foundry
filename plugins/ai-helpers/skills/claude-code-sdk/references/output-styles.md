# Output Styles

Output styles modify Claude Code's system prompt to adapt it for uses beyond software engineering while keeping core
capabilities (running scripts, reading/writing files, tracking TODOs).

## Built-in Styles

- **Default** -- standard system prompt for software engineering tasks
- **Explanatory** -- provides educational "Insights" between engineering tasks; helps understand implementation choices
  and codebase patterns
- **Learning** -- collaborative learn-by-doing mode; shares insights and adds `TODO(human)` markers for you to implement

## How Output Styles Work

- All styles exclude instructions for efficient output (e.g., responding concisely)
- Custom styles exclude coding instructions unless `keep-coding-instructions` is true
- Custom instructions are appended to the end of the system prompt
- Reminders to adhere to the style are injected during the conversation

## Changing Output Style

Via menu: `/config` > Output style

Via settings (takes effect next session):

```json
{ "outputStyle": "Explanatory" }
```

Saved to `.claude/settings.local.json` (local project level). Changes take effect at next session start (system prompt
is stable within a session for prompt caching).

## Creating Custom Output Styles

Markdown files with frontmatter, saved to `~/.claude/output-styles` (user) or `.claude/output-styles` (project).

```markdown
---
name: My Custom Style
description: A brief description shown in the /config picker
keep-coding-instructions: false
---

# Custom Style Instructions

You are an interactive CLI tool that helps users with [your domain].

## Specific Behaviors

[Define behavior for this style...]
```

### Frontmatter Fields

- `name` -- display name (defaults to filename)
- `description` -- shown in `/config` picker
- `keep-coding-instructions` -- keep coding-related system prompt parts (default: `false`)

## Comparisons

### Output Styles vs CLAUDE.md vs --append-system-prompt

- **Output styles** -- replace/modify the default system prompt (turn off SW engineering parts)
- **CLAUDE.md** -- added as user message after the system prompt (does not modify it)
- **`--append-system-prompt`** -- appended to the system prompt (does not replace any part)

### Output Styles vs Agents

- **Output styles** -- affect the main agent loop, modify system prompt only
- **Agents** -- invoked for specific tasks, include additional settings (model, tools, context)

### Output Styles vs Skills

- **Output styles** -- modify response formatting/tone/structure, always active once selected
- **Skills** -- task-specific prompts, invoked on demand with `/skill-name` or auto-loaded when relevant
