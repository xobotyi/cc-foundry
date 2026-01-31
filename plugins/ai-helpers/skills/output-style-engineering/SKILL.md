---
name: output-style-engineering
description: >-
  Create and edit Claude Code output styles. Use when building
  custom personas, modifying AI communication patterns, or adapting Claude
  for non-coding domains.
---

# Output Style Engineering

Create, edit, and manage Claude Code output styles—custom system prompts
that transform Claude's personality while preserving all tool capabilities.

## When to Read References

| Situation | Read |
|-----------|------|
| Need file format, frontmatter options | [structure.md](references/structure.md) |
| Writing effective style instructions | [best-practices.md](references/best-practices.md) |
| Want concrete examples to adapt | [examples.md](references/examples.md) |
| Choosing between styles vs CLAUDE.md vs agents | [comparison.md](references/comparison.md) |

## Quick Reference

**Locations:**
- User-level: `~/.claude/output-styles/<name>.md`
- Project-level: `.claude/output-styles/<name>.md`

**Commands:**
- `/output-style` — menu to select style
- `/output-style [name]` — switch directly
- `/output-style:new [description]` — create with Claude's help

**Minimal template:**
```markdown
---
name: my-style
description: Brief description shown in menu
---

# Style Instructions

You are an interactive CLI tool. [Your instructions...]
```

## Workflow

### Creating a New Output Style

1. **Clarify the purpose**
   - What domain or persona? (researcher, editor, analyst)
   - What communication style? (concise, explanatory, formal)
   - What should Claude prioritize or avoid?

2. **Choose location**
   - `~/.claude/output-styles/` — available everywhere
   - `.claude/output-styles/` — project-specific, shareable via git

3. **Write the style file**
   - See [structure.md](references/structure.md) for format
   - See [best-practices.md](references/best-practices.md) for writing tips
   - See [examples.md](references/examples.md) for inspiration

4. **Test and iterate**
   - Activate: `/output-style [name]`
   - Try varied tasks to verify behavior
   - Refine instructions based on results

### Editing an Existing Style

1. Locate the style file (check both locations)
2. Read current content to understand intent
3. Make targeted changes
4. Test with `/output-style [name]`

## Key Concepts

**Output styles replace the system prompt.** Unlike CLAUDE.md (which adds
context) or `--append-system-prompt` (which appends), output styles
completely override Claude's default software engineering personality.

**Tools stay available.** File I/O, script execution, TODO tracking, and
all other capabilities remain—only the personality and priorities change.

**`keep-coding-instructions: true`** retains coding-specific guidance.
Use when you want a modified coding assistant rather than a completely
different persona.
