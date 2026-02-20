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

| Situation | Reference | Contents |
|-----------|-----------|----------|
| SKILL.md format, frontmatter rules, directory layout | [spec.md](references/spec.md) | Frontmatter fields, name rules, string substitutions, progressive disclosure |
| Creating a skill from scratch | [creation.md](references/creation.md) | Step-by-step process, scope sizing, description examples, archetype templates |
| Evaluating skill quality (review, audit) | [evaluation.md](references/evaluation.md) | Scoring rubric (5 dimensions), testing protocol, common issues by score range |
| Skill not triggering, wrong output, refinement | [iteration.md](references/iteration.md) | Activation fixes, output fixes, restructuring, splitting guidance |
| Multi-file skills, scripts, subagents, hooks | [advanced-patterns.md](references/advanced-patterns.md) | Fork pattern, workflow skills, composable skills, permission scoping |
| Debugging activation failures, script errors | [troubleshooting.md](references/troubleshooting.md) | Diagnostic steps for structure, activation, output, script, reference issues |
| Writing persuasive instructions, reasoning | [prompt-techniques.md](references/prompt-techniques.md) | XML tags, chain of thought, format control, instruction strengthening |

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

- **Lead with function, not slogans.** The first sentence must describe
  what the skill covers. "Node.js runtime conventions, APIs, and
  ecosystem patterns" — not "Async-first, event-driven". Slogans waste
  description tokens on zero activation value.
- **Claim broadly, then list specifics.** "Invoke whenever task involves
  any interaction with X — creating, editing, debugging" beats "Invoke
  when creating, editing, or debugging X."
- **Aggressive triggering, graceful de-escalation.** Better to trigger
  and de-escalate inside the skill than to miss activations.
- **Skill dependencies belong in SKILL.md body, not descriptions.**
  Prerequisites like "load prompt-engineering first" are handled by the
  skill body — putting them in descriptions wastes trigger space.
- **Philosophy belongs in SKILL.md body.** If a skill has a guiding
  principle ("simplicity over cleverness"), put it as the opening
  statement in SKILL.md where it shapes behavior — not in the description
  where it wastes trigger space.

## Content Architecture

SKILL.md must be **behaviorally self-sufficient**. An agent reading only
SKILL.md — without loading any references — must be able to do the job
correctly. References provide depth, not breadth.

This applies to all skill types, not just coding disciplines.

### What Goes Where

| Content Type | Location | Rationale |
|---|---|---|
| **Behavioral rules** | SKILL.md body | Agent must follow these during work — can't afford a missed reference read |
| **Catalog/lookup content** | references/ | Agent reads on-demand for specific lookups (API tables, comparison charts) |
| **Situational content** | references/ | Only needed in specific phases (migration guides, deployment patterns) |
| **Voluminous structural content** | references/ | Too large to inline, inherently lookup-oriented (schemas, 50+ entry tables) |

Behavioral rules are directives an agent must follow to do the work correctly.
If an agent skipping a reference would produce wrong output, that content is
behavioral and belongs in SKILL.md.

### Working-Resolution / High-Resolution

When a reference contains both rules and depth, use a two-resolution split:

- **SKILL.md** — working-resolution: the thesis, core rules, summary that
  enables correct behavior
- **references/** — high-resolution: detailed rubrics, extended examples,
  full catalogs, edge case coverage

The agent works correctly at working resolution. References let it zoom in.

**Example:** A quality assessment skill puts a 6-row checklist with criteria
and weights in SKILL.md. The reference provides detailed 0-20 scoring rubrics
for each criterion with examples at each level.

**Example:** A Node.js skill puts 17 module system rules in SKILL.md.
The reference provides ESM/CJS comparison tables, file extension edge cases,
and interop patterns.

### Route-to-Reference Tables

When a skill has references, include a route table with a **Contents** column
describing what type of depth the reference provides:

```markdown
| Topic | Reference | Contents |
|-------|-----------|----------|
| Modules | `references/modules.md` | ESM/CJS comparison tables, file extension rules |
| Streams | `references/streams.md` | Stream types table, pipeline patterns, backpressure |
```

The Contents column tells the agent what's inside, enabling informed read
decisions. Without it, agents either over-read (wasting context) or skip
(missing content).

### State Rules as Positive Directives

Place rules in the body section where they're contextually relevant. State
them as positive directives: "Use `pipeline()` for stream composition" — not
"Don't use `.pipe()`" in a separate anti-pattern table. Separate anti-pattern
tables duplicate body content and waste tokens.

Keep an anti-pattern table only when the "don't" side is genuinely non-obvious
from the positive rule (e.g., common migration pitfalls in a version upgrade
skill where users carry muscle memory from the old version).

## Skill Structure

```
skill-name/
├── SKILL.md              # Required: complete behavioral specification
└── references/           # Optional: deepening material
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

**Add examples.** Few-shot prompting is the most reliable way to communicate
expected behavior. Include input/output pairs.

**Place critical rules at the end.** Instructions near the context boundary
are followed more reliably.

**Numbered lists vs bullet lists:**
- **Numbered lists** — ONLY for sequential steps where order matters:
  "1. Read input → 2. Validate → 3. Output"
- **Bullet lists** — for rules, directives, and conventions where there is
  no ordering: "- Use ESM. - Use `node:` prefix..."

If the items can be reordered without changing meaning, use bullets.

## Skill Archetypes

### Workflow Skill

Sequential phases with clear inputs/outputs and checkpoints. The SKILL.md
contains the complete workflow; references provide detailed rubrics, templates,
or extended checklists. Example: a CLAUDE.md auditor with discover → assess →
report → update phases.

### Knowledge Skill

Complete specification for a tool, format, or API. Everything inline — the
agent needs the full spec to do the work. References are rare; when present,
they hold example collections. Example: a hookify rule-writing skill containing
the entire rule syntax (~300 lines, no references).

### Coding Discipline Skill

Conventions and rules for a language, framework, or platform. Structure:

```markdown
# [Technology]

[Philosophy statement — one line]

## References (route table with Contents column)
## [Topic sections with declarative rules as bullet lists]
## Application (writing mode vs reviewing mode)
## Integration (relationship to other skills)
[Closing maxim]
```

Key patterns:
- **Philosophy bookends** — opening statement frames the skill's values;
  closing maxim reinforces
- **Declarative rules as bullet lists** per topic (8-17 rules is typical)
- **Application section** — "when writing: apply silently; when reviewing:
  cite violation, show fix inline"
- **Integration section** — names related skills and their boundaries

## Quick Templates

**Simple skill (no references):**

```markdown
---
name: my-skill
description: >-
  [What it does]. Invoke whenever task involves any interaction
  with [domain] — [specific triggers].
---

# My Skill

## Instructions

[Clear, imperative steps or declarative rules]

## Examples

**Input:** [request]
**Output:** [expected result]
```

**Skill with references:**

```markdown
---
name: my-skill
description: >-
  [What it does]. Invoke whenever task involves any interaction
  with [domain] — [specific triggers].
---

# My Skill

[Philosophy or purpose statement]

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| [topic] | `references/[file].md` | [type of depth: tables, examples, patterns] |

## [Topic Sections]

[Working-resolution rules — complete behavioral spec]

[Pointers to references for extended examples, lookup tables, edge cases]
```

## Core Principles

- **Skills are prompts.** Every prompt engineering principle applies. Use
  clear structure, examples, XML tags, and explicit format specifications.

- **Description is the trigger.** Claude activates based solely on matching
  request to description. Vague descriptions → missed activations.

- **SKILL.md is the discipline.** An agent reading only SKILL.md must be
  able to do the job correctly. References deepen — they don't complete.

- **References are optional depth.** Detailed rubrics, extended examples,
  full catalogs, niche how-tos. Never core behavioral rules.

- **One skill, one purpose.** Broad skills produce mediocre results. If
  scope creeps, split.

## Quick Checks

Before deploying:

- [ ] Description leads with what the skill does (not a slogan)
- [ ] Description claims domain broadly ("whenever task involves")
- [ ] Description lists specific trigger keywords as examples
- [ ] SKILL.md is behaviorally self-sufficient — no critical rules only in references
- [ ] References contain only deepening material (examples, catalogs, how-tos)
- [ ] Route-to-Reference table has Contents column (if references exist)
- [ ] Instructions use imperative voice
- [ ] Instructions structured (XML tags, numbered steps/rules)
- [ ] At least one input/output example (few-shot) for generative skills
- [ ] Critical rules placed at end
- [ ] Under 500 lines (exceeding is acceptable when all content is behavioral)
- [ ] Name matches directory (lowercase, hyphens)
