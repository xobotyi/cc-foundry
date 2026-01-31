---
name: skill-engineering
description: >-
  Create, evaluate, and improve Claude Code skills. Use when working with
  SKILL.md files, debugging skill activation, or building new skills.
---

# Skill Engineering

Skills are prompt templates that extend Claude with domain expertise.
They load on-demand: Claude sees only `name` and `description` at startup,
then loads full SKILL.md content when triggered.

**Skills are prompts.** Apply prompt engineering principles when writing them.
Consider invoking the `prompt-engineering` skill for complex instruction design.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| SKILL.md format, frontmatter rules, directory structure | [spec.md](references/spec.md) |
| Creating a skill from scratch | [creation.md](references/creation.md) |
| Evaluating skill quality (review, audit) | [evaluation.md](references/evaluation.md) |
| Skill not triggering, wrong output, needs refinement | [iteration.md](references/iteration.md) |
| Multi-file skills, scripts, subagents, hooks | [advanced-patterns.md](references/advanced-patterns.md) |
| Debugging activation failures, script errors | [troubleshooting.md](references/troubleshooting.md) |
| Writing persuasive instructions, reasoning patterns | [prompt-techniques.md](references/prompt-techniques.md) |

Read the relevant reference before proceeding.

## Description Formula

The description determines when Claude activates your skill.

```
[What it does] + [When to use it]
```

**Good:**
```yaml
description: >-
  Extract text from PDFs, fill forms, merge documents.
  Use when working with .pdf files or document extraction.
```

**Bad:**
```yaml
description: Helps with documents
```

Include: specific capabilities, trigger keywords, file types.
Avoid: vague verbs ("helps", "assists"), marketing speak.

## Skill Structure

```
skill-name/
├── SKILL.md              # Required: frontmatter + instructions
└── references/           # Optional: detailed docs loaded as needed
    └── *.md
```

**Locations:**
- Personal: `~/.claude/skills/<name>/SKILL.md`
- Project: `.claude/skills/<name>/SKILL.md`
- Plugin: `<plugin>/skills/<name>/SKILL.md`

## Writing Instructions

Skills are prompts. Apply prompt engineering fundamentals:

**Be clear and direct.** If a colleague reading your instructions would be
confused, Claude will be too.

**Use imperative voice:**
```markdown
1. Read the input file
2. Extract entities matching pattern X
3. Return as JSON with keys: name, type, value
```

Not:
```markdown
You should read the file and then you might want to
extract some entities from it...
```

**Use XML tags for structure:**
```markdown
<instructions>
1. Parse the input
2. Validate against schema
3. Return results
</instructions>

<output_format>
Return as JSON: {"status": "ok|error", "data": [...]}
</output_format>
```

**Add examples.** Few-shot prompting is the most reliable way to
communicate expected behavior. Include input/output pairs.

**Place critical rules at the end.** Instructions near the context
boundary are followed more reliably.

## Quick Template

```markdown
---
name: my-skill
description: What it does. Use when [specific triggers].
---

# My Skill

## Instructions

[Clear, imperative steps]

## Examples

**Input:** [request]
**Output:** [expected result]
```

For skills with multiple references, add a "Route to Reference" table
(see this skill as an example).

## Core Principles

**Skills are prompts.**
Every prompt engineering principle applies. Use clear structure, examples,
XML tags, and explicit format specifications. Consider invoking the
`prompt-engineering` skill when designing complex instructions.

**Description is the trigger.**
Claude decides activation based solely on matching user request to
skill descriptions. Vague descriptions → missed or wrong activations.

**Context is shared.**
Every token competes with conversation. Move detailed content to
`references/`. Challenge each paragraph: does Claude need this now?

**One skill, one purpose.**
Broad skills produce mediocre results. If scope creeps, split.

## Anti-Patterns

| Pattern | Problem |
|---------|---------|
| Vague description | Missed activations |
| "Helps with X" | Too generic to trigger correctly |
| No trigger scenarios | Claude doesn't know when to use it |
| Wall of text instructions | Key steps get buried |
| No examples | Ambiguous output expectations |

## Quick Checks

Before deploying:

- [ ] Description includes what AND when
- [ ] Description has specific trigger words
- [ ] Instructions use imperative voice
- [ ] Instructions structured (XML tags, numbered steps)
- [ ] Output format explicitly specified
- [ ] At least one input/output example (few-shot)
- [ ] Critical rules placed at end
- [ ] SKILL.md under 500 lines
- [ ] Name matches directory (lowercase, hyphens)
