---
name: skill-engineering
description: >-
  Manage Claude Code skills: create, evaluate, iterate, and troubleshoot.
  Use when working with skills - creating new ones, analyzing or improving
  existing ones, debugging why a skill isn't working, or assessing skill quality.
---

# Skill Engineering

Manage the full lifecycle of Claude Code skills: creation, evaluation,
iteration, and troubleshooting.

## What Are You Trying To Do?

| Goal | Read |
|------|------|
| Create a new skill | [creation.md](references/creation.md) |
| Evaluate skill quality | [evaluation.md](references/evaluation.md) |
| Improve an existing skill | [iteration.md](references/iteration.md) |
| Debug a skill that isn't working | [troubleshooting.md](references/troubleshooting.md) |
| Check frontmatter rules and constraints | [spec.md](references/spec.md) |
| Use advanced features (arguments, subagents, hooks) | [advanced-patterns.md](references/advanced-patterns.md) |

## Core Principles

**1. Concise is key**
Context window is shared. Only add what Claude doesn't already know.
Challenge each line: "Does this justify its token cost?"

<critical>
**2. Description is the trigger**
Claude sees ONLY `name` and `description` when deciding whether to load
a skill. The body loads AFTER triggering.

**Description = triggering decision.** Include:
- What the skill does (1 sentence)
- When to use it (specific contexts, file types, user phrases)

**Description ≠ execution instructions.** Do NOT include:
- Keywords lists ("Keywords: x, y, z") — redundant if well-written
- Completion criteria ("Done when:") — belongs in SKILL.md body
- How-to details — belongs in SKILL.md body
- Success metrics — belongs in SKILL.md body
</critical>

```yaml
# Bad: vague
description: Helps with documents

# Bad: bloated with non-trigger content
description: "Edit PDFs. Done when: no errors. Keywords: pdf, edit"

# Good: lean, specific what + when
description: "Extract text from PDFs, fill forms, merge documents.
  Use when working with .pdf files or document extraction."
```

**3. Progressive disclosure**
SKILL.md is the overview. Move detailed content to `references/` files
that Claude loads only when needed.

**4. Match freedom to fragility**
- High freedom (text guidance): multiple valid approaches
- Low freedom (exact steps): fragile operations, consistency critical

## Skill Anatomy

```
skill-name/
├── SKILL.md              # Required: frontmatter + instructions
└── references/           # Optional: detailed docs loaded as needed
    └── *.md
```

Keep SKILL.md under 500 lines (loaded entirely on trigger — large files
hurt context budget). Split to references when approaching this limit.

## Quick Reference

**Frontmatter requirements:**
- `name`: lowercase, hyphens, max 64 chars, no `<>`, no "anthropic"/"claude"
- `description`: max 1024 chars, no `<>`, include what + when to use

**Creating a skill directory:**
```bash
mkdir -p .claude/skills/my-skill
```

**Validation:** Read SKILL.md, verify frontmatter against
[spec.md](references/spec.md).

## Related Skills

- `prompt-engineering` — SKILL.md instructions are prompts; apply
  prompting techniques for better skills
