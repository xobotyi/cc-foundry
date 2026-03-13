# Creating Skills — Extended Depth

Step-by-step creation process with scope sizing guidance and evaluation-driven development. SKILL.md contains the
description formula, content architecture rules, instruction design guidance, and archetype structures — this reference
provides the sequential workflow for applying them.

## Contents

- [Creation Workflow](#creation-workflow)
- [Scope Sizing](#scope-sizing)
- [Evaluation-Driven Development](#evaluation-driven-development)
- [Archetype Deep Dives](#archetype-deep-dives)
- [Common Creation Mistakes](#common-creation-mistakes)

---

## Creation Workflow

### Step 1: Identify the Pattern

Before writing anything, identify what you're encoding:

**Questions to ask:**

- What do I repeatedly explain to Claude?
- What workflow needs consistency across sessions?
- What domain knowledge does Claude lack?
- What format do I always want for this task?

**Good skill candidates:**

- Coding conventions for your stack
- Document generation with specific structure
- Data analysis following your methodology
- Workflows with multiple coordinated steps

**Poor skill candidates:**

- One-off tasks (just prompt directly)
- Highly variable tasks (can't standardize)
- Tasks needing real-time data (use MCP instead)

### Step 2: Size the Scope

See [Scope Sizing](#scope-sizing) below for detailed guidance. The rule: focused enough to be specific, broad enough to
be useful.

### Step 3: Write the Description

Apply the Description Formula from SKILL.md. Test by asking: "If Claude sees this description alongside 20 other skill
descriptions, will it activate for the right requests and not for wrong ones?"

### Step 4: Choose the Archetype

Match your skill to an archetype from SKILL.md (Workflow, Knowledge, or Coding Discipline). This determines structure,
reference strategy, and instruction style. See [Archetype Deep Dives](#archetype-deep-dives) for detailed structural
patterns.

### Step 5: Set Degrees of Freedom

Decide instruction specificity per SKILL.md guidance. The more fragile or error-prone the operation, the lower the
freedom.

### Step 6: Write SKILL.md

Apply the Writing Instructions rules from SKILL.md body. Key decisions:

- Declarative vs procedural for each section
- What goes in SKILL.md vs references
- Where to place critical rules (primacy/recency zones)

### Step 7: Write References (if needed)

References must provide **genuinely different depth** from SKILL.md — detailed rubrics, extended examples, full
catalogs, comparison tables, edge case coverage. Never restate rules already in SKILL.md.

### Step 8: Test with Evaluation-Driven Development

See [Evaluation-Driven Development](#evaluation-driven-development).

---

## Scope Sizing

### Too Broad

```
Skill: Full-Stack Development
- Handles frontend, backend, databases, deployment, testing...
```

Produces mediocre results across all areas. Instructions are too vague to be useful for any specific task.

**Indicators:**

- More than 3 unrelated topic sections
- Instructions use phrases like "as appropriate" or "depending on context"
- Output quality varies significantly by input type

**Fix:** Split into multiple focused skills.

### Too Narrow

```
Skill: Button Component Generator
- Only creates button components
```

Not reusable enough to justify the overhead. A prompt would work.

**Indicators:**

- Triggered less than once per week
- Could be a one-line instruction
- Covers a single variation of a broader task

**Fix:** Generalize slightly or absorb into a broader skill.

### Right Scope

```
Skill: React Component Generator
- Creates TypeScript React components
- Follows team conventions for structure
- Includes proper typing and accessibility
- Generates corresponding test files
```

Focused enough to be specific, broad enough to be useful.

**The litmus test:** Can you describe what the skill does in one sentence without using "and" more than once? If not,
it's probably too broad.

---

## Evaluation-Driven Development

Build evaluations BEFORE writing extensive documentation. This ensures the skill solves real problems rather than
documenting imagined ones.

For the full evaluation process, scoring rubrics, and testing protocol, see
[`${CLAUDE_SKILL_DIR}/references/evaluation.md`].

### Why This Order Matters

This prevents over-engineering: you only add content that addresses observed failures, not anticipated ones. A skill
with 15 rules that each address a real failure is more effective than a skill with 40 rules where 25 duplicate the
model's existing capabilities.

### When to Stop Adding Rules

A skill is done when:

- Triggers correctly for target cases
- Instructions followed consistently
- No recurring quality gaps
- Maintenance burden is low

Effectiveness over perfection. A 200-line skill that works reliably beats a 500-line skill that's theoretically
comprehensive but attention-starved.

---

## Archetype Deep Dives

SKILL.md defines three archetypes (Workflow, Knowledge, Coding Discipline). This section provides extended structural
patterns and real-world examples for each.

### Workflow Skill — Extended

**Characteristic pattern:** Sequential phases with explicit checkpoints.

**Reference strategy:** References hold detailed rubrics, validation criteria, or templates for specific phases.
SKILL.md contains the complete phase sequence with working-resolution criteria for each phase.

**Checkpoint design:**

- Each phase produces a named artifact (plan, report, validated output)
- Checkpoints are explicit: "Do not proceed until [condition]"
- Failure at any checkpoint triggers a defined recovery path

**Example structure for a multi-phase auditor:**

```markdown
## Workflow

### Phase 1: Discover
- Scan project for [target files]
- Build inventory: file path, size, last modified

### Phase 2: Assess
For each item in inventory, evaluate against criteria in
`references/rubric.md`. Produce assessment as:
\`\`\`json
{"file": "...", "score": 0-10, "issues": [...]}
\`\`\`

**Checkpoint:** All items assessed. If any scored < 5, flag for review.

### Phase 3: Report
[Report template...]

### Phase 4: Fix
Apply fixes for items scoring < 5. Re-assess after fixing.
```

### Knowledge Skill — Extended

**Characteristic pattern:** Complete inline specification. Everything the agent needs is in SKILL.md.

**Reference strategy:** Rare. When present, references hold example collections or edge case galleries — never core
rules.

**When to choose Knowledge archetype:**

- The domain is a specific tool, format, or API
- The agent needs the full spec to produce correct output
- Rules are numerous but all behavioral (no catalog content)
- The spec is stable (doesn't change often)

**Size guidance:** Knowledge skills often exceed 500 lines — this is acceptable when all content is behavioral. A
700-line skill with all behavioral rules is better than a 400-line skill with critical rules in unread references.

### Coding Discipline Skill — Extended

**Characteristic pattern:** Declarative rules organized by topic, with philosophy bookends.

**Reference strategy:** Most reference-heavy archetype. Typically 5-10 references covering different topic areas with
comparison tables, API catalogs, and edge case patterns.

**The Application section — why it matters:**

The Application section differentiates how the skill behaves in two modes:

```markdown
## Application

When **writing** code:
- Apply all conventions silently — don't narrate each rule
- If an existing codebase contradicts a convention, follow the
  codebase and flag the divergence once

When **reviewing** code:
- Cite the specific violation and show the fix inline
- Don't lecture — state what's wrong and how to fix it
```

Without this section, the agent may narrate every rule application ("I'm using ESM because the Node.js skill says...")
or miss violations during review.

**The Integration section — scope boundaries:**

```markdown
## Integration

The **javascript** skill governs language choices; this skill governs
Node.js runtime decisions. When both apply, language rules defer to
runtime requirements (e.g., ESM is a runtime choice, not a language one).
```

This prevents skills from conflicting and gives the agent clear precedence rules when multiple skills are loaded.

---

## Common Creation Mistakes

- **Writing references first** — seems logical to gather depth before rules. Fix: write SKILL.md first — it defines what
  depth is needed
- **Duplicating SKILL.md in references** — copy-paste habit, fear of missing content. Fix: each reference must provide
  content SKILL.md doesn't have
- **Over-scoping initial version** — trying to cover all cases upfront. Fix: start with the 3 most common scenarios,
  expand later
- **Skipping evaluation** — "I know what the skill needs." Fix: run Claude without the skill first — failures reveal
  real gaps
- **Writing 40+ rules** — more rules = more thorough (false). Fix: more rules = more attention competition. Apply
  deletion test
- **Procedural style for everything** — steps feel more concrete. Fix: declarative for constraints, procedural only for
  ordered workflows
