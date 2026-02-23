# Output Style Specification

Technical requirements for valid output styles.

## File Structure

Output styles are single Markdown files with YAML frontmatter:

```markdown
---
name: Style Name
description: Brief description for UI
keep-coding-instructions: false
---

# Style Instructions

[Markdown content added to system prompt]
```

## Storage Locations

| Location | Path | Scope |
|----------|------|-------|
| User-level | `~/.claude/output-styles/*.md` | All projects for this user |
| Project-level | `.claude/output-styles/*.md` | Anyone in this repo |

**Resolution:** Project-level styles with same name override user-level.

## Frontmatter Fields

### `name`

- **Type:** string
- **Required:** No
- **Default:** Derived from filename
- **Purpose:** Display name in `/output-style` menu

```yaml
name: Direct Professional
```

### `description`

- **Type:** string
- **Required:** No
- **Default:** None
- **Purpose:** Explanation shown in `/output-style` menu

```yaml
description: >-
  Clear, professional communication without excessive
  deference or sycophantic language
```

### `keep-coding-instructions`

- **Type:** boolean
- **Required:** No
- **Default:** `false`
- **Purpose:** Whether to retain Claude Code's coding-specific instructions

When `false` (default):
- Removes software engineering specific guidance
- Removes test verification instructions
- Removes code quality checks
- Keeps tool access (Read, Write, Bash, etc.)

When `true`:
- Retains all coding instructions
- Style adds to rather than replaces coding behavior
- Use for coding-focused personality adjustments

```yaml
keep-coding-instructions: true
```

## Body Content

The body is Markdown that becomes part of Claude's system prompt.

### Recommended Sections

- **Persona Definition** — Who is Claude in this style?
- **Core Behaviors** — Primary rules and interaction patterns
- **Communication Style** — Tone, language, formatting preferences
- **Output Format** — How to structure responses
- **Examples** — Demonstrate expected tone/behavior

### Length Guidelines

- **No hard limit** on body length
- **Recommended:** 200-500 lines for complex styles
- **Keep focused:** Every instruction competes for attention
- **Test extensively:** Long styles may have instructions ignored

## How Styles Modify the System Prompt

When a custom output style is active:

1. Default system prompt is loaded
2. Efficiency instructions removed (concise output guidance)
3. If `keep-coding-instructions: false`: coding instructions removed
4. Style body content appended
5. Periodic reminders injected during conversation

**Important:** Output styles REPLACE rather than augment. To augment,
use `--append-system-prompt` or CLAUDE.md instead.

## Activation Methods

### Via Slash Command

```
/output-style                    # Open selection menu
/output-style direct-professional   # Activate by name
/output-style:new [description]  # Create new style
```

### Via Settings File

Edit `.claude/settings.local.json`:

```json
{
  "outputStyle": "direct-professional"
}
```

Or at different settings levels:
- `~/.claude/settings.json` (user global)
- `.claude/settings.json` (project shared)
- `.claude/settings.local.json` (project local, gitignored)

## File Naming

- Filename (without `.md`) becomes the style identifier
- Use lowercase with hyphens: `direct-professional.md`
- Identifier used in `/output-style [name]` command
- Identifier used in settings `"outputStyle": "name"`

## Validation Checklist

- [ ] File has .md extension
- [ ] Frontmatter starts with `---` on line 1
- [ ] Frontmatter ends with `---` before body
- [ ] Stored in valid location (`~/.claude/output-styles/` or `.claude/output-styles/`)
- [ ] Body is valid Markdown
- [ ] `keep-coding-instructions` set appropriately for use case

## Security Note

Output styles replace the system prompt. A maliciously crafted style
could theoretically attempt to weaken Claude's safeguards. When
reviewing third-party styles, verify they don't include instructions
to ignore safety guidelines or bypass restrictions.

## Comparison to Related Files

| File | Purpose | Loaded When |
|------|---------|-------------|
| Output Style | System prompt replacement | Style activated |
| CLAUDE.md | Project context | Session starts |
| Custom Agent | Delegated task handler | Agent invoked |
| Skill | Task-specific workflow | Skill triggered |

**Key difference:** Output styles are the ONLY mechanism that replaces
the main agent's core system prompt.
