# Output Styles

Output styles modify Claude Code's system prompt to change how Claude responds — tone, format, persona — without
changing capabilities. Tools, file access, and CLAUDE.md instructions remain available regardless of active style.

## Built-in Styles

- **Default** — standard software engineering assistant. Concise, task-focused.
- **Explanatory** — adds educational "Insights" between coding tasks. Explains implementation choices and codebase
  patterns. Longer output by design.
- **Learning** — collaborative learn-by-doing mode. Shares "Insights" while coding and asks the user to implement small
  pieces via `TODO(human)` markers. Longest output.

## File Format

Output styles are single Markdown files with YAML frontmatter:

```markdown
---
name: My Custom Style
description: Brief description shown in the /config picker
keep-coding-instructions: false
---

# Style Instructions

[Markdown content appended to system prompt]
```

## Frontmatter Fields

### `name`

- **Type:** string
- **Required:** No
- **Default:** derived from filename (without `.md`)
- **Purpose:** display name in the `/config` output style picker

### `description`

- **Type:** string
- **Required:** No
- **Default:** none
- **Purpose:** explanation shown alongside the name in the `/config` picker

### `keep-coding-instructions`

- **Type:** boolean
- **Required:** No
- **Default:** `false`
- **Purpose:** controls whether Claude Code's software engineering instructions remain in the system prompt

When `false` (default):

- Software engineering guidance removed from system prompt
- Test verification instructions removed
- Code quality checks removed
- All tools remain available (Read, Write, Bash, etc.)
- CLAUDE.md instructions still load

When `true`:

- All coding instructions retained
- Style body appended on top of the full default prompt
- Use for coding-focused personality adjustments (tone, formatting) that should not disable coding behavior

## File Locations

- `~/.claude/output-styles/` — user scope, all projects. Not shared via git.
- `.claude/output-styles/` — project scope, all team members. Shared via git.
- `<plugin>/output-styles/` — plugin scope, installed users. Shared via plugin.

Project-level styles with the same name override user-level styles.

### File Naming

- Filename (without `.md`) is the style identifier
- Use lowercase with hyphens: `direct-professional.md`
- Identifier used in settings: `"outputStyle": "direct-professional"`

## Activation

### Via `/config`

Run `/config`, select **Output style**, pick from the menu. Selection saved to `.claude/settings.local.json`.

### Via Settings File

Set the `outputStyle` field directly in any settings scope:

```json
{
  "outputStyle": "Explanatory"
}
```

Valid in:

- `~/.claude/settings.json` (user global)
- `.claude/settings.json` (project shared)
- `.claude/settings.local.json` (project local, gitignored)

### Activation Timing

Output style is set in the system prompt at session start. Changes to `outputStyle` in settings take effect on the
**next session**, not mid-conversation. This keeps the system prompt stable for prompt caching.

## How Styles Modify the System Prompt

When a custom output style is active:

1. Default system prompt loads
2. Efficiency instructions (concise output guidance) removed
3. If `keep-coding-instructions: false`: coding-specific instructions removed
4. Style body content appended to system prompt
5. Periodic reminders injected during conversation to maintain style adherence

## Token Impact

- Adding instructions to the system prompt increases input tokens; prompt caching reduces this cost after the first
  request in a session
- Built-in Explanatory and Learning styles produce longer responses than Default by design (more output tokens)
- Custom style token usage depends on what the instructions tell Claude to produce

## Comparison with Related Mechanisms

| Mechanism                    | Modifies system prompt   | When active               | Purpose                                    |
| ---------------------------- | ------------------------ | ------------------------- | ------------------------------------------ |
| **Output style**             | Yes — replaces parts     | Always, once selected     | Change how Claude communicates             |
| **CLAUDE.md**                | No — injected as user    | Always, every session     | Project context, conventions, instructions |
| **`--append-system-prompt`** | Appends to system prompt | Session lifetime          | Programmatic system prompt additions       |
| **Subagent**                 | Own system prompt        | When invoked for a task   | Isolated delegated work with tool control  |
| **Skill**                    | No                       | When triggered by request | On-demand domain expertise or workflows    |

Key distinction: output styles are the only mechanism that **replaces** parts of the main agent's default system prompt.
CLAUDE.md and `--append-system-prompt` add to it. Subagents have their own separate prompt. Skills inject content
on-demand without modifying the base prompt.
