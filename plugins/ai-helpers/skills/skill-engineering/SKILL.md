---
name: skill-engineering
description: >-
  Design and iterate Claude Code skills: description triggers activation, instructions shape
  behavior. Invoke whenever task involves any interaction with Claude Code skills — creating,
  evaluating, debugging, or understanding how they work.
---

# Skill Engineering

Skills are prompt templates that extend Claude with domain expertise.
They load on-demand: Claude sees only `name` and `description` at startup,
then loads full SKILL.md content when triggered.

<prerequisite>
**Skills are prompts.** Before writing or improving a skill, invoke
`prompt-engineering` to load instruction design techniques.

```
Skill(ai-helpers:prompt-engineering)
```

Skip only for trivial edits (typos, formatting).
</prerequisite>

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

The description determines when Claude activates your skill. It's the
highest-leverage field — poor descriptions cause missed activations.

```
[What it does] + [When to invoke — broad domain claim with trigger examples]
```

1. **What it does** — Functional description of the skill's purpose.
   State what the skill covers concretely, not a slogan or tagline.
2. **When to invoke** — "Invoke whenever task involves any interaction
   with X." Claims the domain broadly, then lists specific triggers
   as examples under the broad claim.

**Good — functional description + broad claim:**
```yaml
description: >-
  Go language conventions, idioms, and toolchain. Invoke when task
  involves any interaction with Go code — writing, reviewing,
  refactoring, debugging, or understanding Go projects.
```

**Good — what it does + when with trigger keywords:**
```yaml
description: >-
  Design and iterate Claude Code skills: description triggers
  activation, instructions shape behavior. Invoke whenever task
  involves any interaction with Claude Code skills — creating,
  evaluating, debugging, or understanding how they work.
```

**Bad — vague, no trigger surface:**
```yaml
description: Helps with documents
```

**Bad — slogan instead of functional description:**
```yaml
description: >-
  Speed and simplicity over compatibility layers: Bun runtime
  conventions, APIs, and toolchain.
```

**Bad — narrow verb list instead of domain claim:**
```yaml
description: >-
  Skills for Claude Code. Invoke when creating, editing, debugging,
  or asking questions about skills.
```

### Principles

- **Lead with function, not slogans.** The first sentence must
  describe what the skill covers. "Node.js runtime conventions,
  APIs, and ecosystem patterns" — not "Async-first, event-driven".
  Slogans waste description tokens on zero activation value.
- **Claim broadly, then list specifics.** "Invoke whenever task
  involves any interaction with X — creating, editing, debugging"
  beats "Invoke when creating, editing, or debugging X."
- **Aggressive triggering, graceful de-escalation.** Better to trigger
  and de-escalate inside the skill than to miss activations.
- **Skill dependencies belong in SKILL.md body, not descriptions.**
  Prerequisites like "load prompt-engineering first" are handled by
  the skill body — putting them in descriptions wastes trigger space.
- **Philosophy belongs in SKILL.md body.** If a skill has a guiding
  principle ("simplicity over cleverness"), put it as the opening
  statement in SKILL.md where it shapes behavior — not in the
  description where it wastes trigger space.

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
description: >-
  [What it does — functional description]. Invoke whenever task
  involves any interaction with [domain] — [specific triggers].
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
XML tags, and explicit format specifications.

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
| Slogan before description | Wastes tokens, zero activation value |
| Narrow verb list as trigger | Misses activations outside listed verbs |
| Cross-skill deps in description | Redundant — handle in SKILL.md body |
| Wall of text instructions | Key steps get buried |
| No examples | Ambiguous output expectations |

## Quick Checks

Before deploying:

- [ ] Description leads with what the skill does (not a slogan)
- [ ] Description claims domain broadly ("whenever task involves")
- [ ] Description lists specific trigger keywords as examples
- [ ] Instructions use imperative voice
- [ ] Instructions structured (XML tags, numbered steps)
- [ ] Output format explicitly specified
- [ ] At least one input/output example (few-shot)
- [ ] Critical rules placed at end
- [ ] SKILL.md under 500 lines
- [ ] Name matches directory (lowercase, hyphens)
