# Creating Skills — Extended Depth

Step-by-step creation workflow with scope sizing, evaluation-driven development, and archetype deep dives. SKILL.md
contains the description formula, content architecture rules, instruction design, and archetype structures — this
reference provides the sequential workflow for applying them.

## Contents

- [Creation Workflow](#creation-workflow)
- [Scope Sizing](#scope-sizing)
- [Description Writing](#description-writing)
- [Evaluation-Driven Development](#evaluation-driven-development)
- [Archetype Deep Dives](#archetype-deep-dives)
- [Pre-Delivery Checklist](#pre-delivery-checklist)
- [Common Creation Mistakes](#common-creation-mistakes)

---

## Creation Workflow

### Step 1: Identify the Pattern

Before writing anything, identify what you're encoding.

**Good skill candidates:**

- Workflows you repeatedly explain: coding conventions, document generation, data analysis methodology
- Domain knowledge Claude lacks: team-specific schemas, internal APIs, proprietary formats
- Consistency requirements: output format, quality gates, validation rules

**Poor skill candidates:**

- One-off tasks — just prompt directly
- Highly variable tasks — can't standardize effectively
- Tasks needing real-time data — use MCP instead

**Discovery method:** Complete the task once with normal prompting. Notice what context you repeatedly provide. That
repeated context is the skill candidate.

### Step 2: Size the Scope

See [Scope Sizing](#scope-sizing). The rule: focused enough to be specific, broad enough to be useful.

### Step 3: Write the Description

See [Description Writing](#description-writing). Test by asking: "If Claude sees this alongside 20 other descriptions,
will it activate for the right requests and not for wrong ones?"

### Step 4: Choose the Archetype

Match to Workflow, Knowledge, or Coding Discipline (see SKILL.md). This determines structure, reference strategy, and
instruction style. See [Archetype Deep Dives](#archetype-deep-dives) for structural patterns.

### Step 5: Set Degrees of Freedom

Decide instruction specificity per SKILL.md guidance. The more fragile or error-prone the operation, the lower the
freedom.

- **High freedom** — multiple valid approaches, context-dependent decisions, heuristic guidance
- **Medium freedom** — preferred pattern exists, some variation acceptable
- **Low freedom** — exact sequence required, variation is a bug

### Step 6: Write SKILL.md

Apply Writing Instructions rules from SKILL.md body. Key decisions:

- Declarative vs procedural for each section
- What goes in SKILL.md vs references
- Where to place critical rules (primacy/recency zones)
- Whether a TOC is needed (files over 100 lines: yes)

### Step 7: Write References (if needed)

References must provide **genuinely different depth** from SKILL.md — detailed rubrics, extended examples, full
catalogs, edge case coverage. Never restate rules already in SKILL.md. Keep references one level deep; nested references
may only be partially read via `head -100`.

### Step 8: Test with Evaluation-Driven Development

See [Evaluation-Driven Development](#evaluation-driven-development) and
[`${CLAUDE_SKILL_DIR}/references/evaluation.md`].

---

## Scope Sizing

### Too Broad

```
Skill: Full-Stack Development
- Handles frontend, backend, databases, deployment, testing...
```

Produces mediocre results across all areas. Instructions are too vague to be actionable.

**Indicators:**

- More than 3 unrelated topic sections
- Instructions use "as appropriate" or "depending on context"
- Output quality varies significantly by input type

**Fix:** Split into focused skills.

### Too Narrow

```
Skill: Button Component Generator
- Only creates button components
```

Not reusable enough to justify skill overhead. A prompt template would work.

**Indicators:**

- Triggered less than once per week
- Could be a one-line instruction
- Covers a single variation of a broader task

**Fix:** Generalize or absorb into a broader skill.

### Right Scope

```
Skill: React Component Generator
- Creates TypeScript React components following team conventions
- Generates corresponding test files
- Enforces accessibility and typing standards
```

**The litmus test:** Can you describe what the skill does in one sentence without using "and" more than once? If not,
it's probably too broad.

---

## Description Writing

The description is the only field Claude sees before deciding whether to load a skill. It must carry enough signal to
route correctly across 100+ available skills.

**Formula:** `[Capability summary]. Use when [specific trigger conditions]. [Negative triggers if needed].`

**Effective examples:**

- **PDF Processing:**
  `Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.`
- **Excel Analysis:**
  `Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.`
- **Git Commit Helper:**
  `Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes.`

**Rules:**

- Be specific — include domain terms, tool names, file types
- State when to use AND when not to use (negative triggers prevent false activations)
- Third-person imperative: "Extracts text..." not "I extract..." or "You should extract..."
- Max 1024 characters; aim for 200-400 in practice
- Test by generating 3 prompts that should trigger it and 3 that should not

**Avoid:**

- `description: Helps with documents` — no specificity
- `description: Processes data` — no domain terms, no trigger conditions
- Generic keywords without context

---

## Evaluation-Driven Development

Build evaluations **before** writing extensive content — anchors rules to observed failures, not anticipated ones.

For the full evaluation process, scoring rubrics, and testing protocol, see
[`${CLAUDE_SKILL_DIR}/references/evaluation.md`].

### Process

1. **Identify gaps** — Run Claude on representative tasks without the skill. Document specific failures and missing
   context.
2. **Create evaluations** — Build 3+ scenarios that test the identified gaps.
3. **Establish baseline** — Measure Claude's performance without the skill (score each output).
4. **Write minimal instructions** — Create just enough content to pass the evaluations.
5. **Iterate** — Execute evaluations, compare against baseline, refine.

### Evaluation Structure

```json
{
  "skills": ["skill-name"],
  "query": "The user request that should trigger this skill",
  "files": ["test-files/fixture.ext"],
  "expected_behavior": [
    "Specific observable behavior 1",
    "Specific observable behavior 2",
    "Specific observable behavior 3"
  ]
}
```

### When to Stop

A skill is done when:

- Triggers correctly for target cases
- Instructions followed consistently
- No recurring quality gaps
- Maintenance burden is low

A 200-line skill that works reliably beats a 500-line skill that's comprehensive but attention-starved.

### Testing Breadth

Test with multiple model tiers (Haiku, Sonnet, Opus). Skills that only work with Opus have a fragile description or
instructions that are too implicit. Effective skills work across all tiers for their intended use cases.

---

## Archetype Deep Dives

SKILL.md defines three archetypes. This section provides extended structural patterns for each.

### Workflow Skill

**Characteristic pattern:** Sequential phases with explicit checkpoints.

**Reference strategy:** References hold rubrics, validation criteria, or templates for specific phases. SKILL.md
contains the complete phase sequence with working-resolution criteria for each.

**Checkpoint design rules:**

- Each phase produces a named artifact (plan, report, validated output)
- Checkpoints are explicit: "Do not proceed until [condition]"
- Failure at a checkpoint triggers a defined recovery path

**Example structure:**

```markdown
## Workflow

### Phase 1: Discover
- Scan project for [target files]
- Build inventory: file path, size, last modified

### Phase 2: Assess
For each item in inventory, evaluate against criteria in `references/rubric.md`.
Produce assessment as:
\`\`\`json
{"file": "...", "score": 0-10, "issues": [...]}
\`\`\`

**Checkpoint:** All items assessed. If any scored < 5, flag for review.

### Phase 3: Report
[Report template inline or reference to template file]

### Phase 4: Fix
Apply fixes for items scoring < 5. Re-assess after fixing.
```

**Checklist pattern** — for multi-step workflows, provide a self-tracking checklist:

```markdown
Copy this checklist and check off items as you complete them:

\`\`\`
- [ ] Step 1: Analyze inputs
- [ ] Step 2: Build plan
- [ ] Step 3: Validate plan
- [ ] Step 4: Execute
- [ ] Step 5: Verify output
\`\`\`
```

### Knowledge Skill

**Characteristic pattern:** Complete inline specification. Everything the agent needs is in SKILL.md.

**Reference strategy:** Rare. When present, references hold example collections or edge case galleries — never core
rules. The agent needs the full spec in SKILL.md to produce correct output without additional reads.

**When to choose this archetype:**

- Domain is a specific tool, format, or API
- Rules are numerous but all behavioral (no catalog content)
- Spec is stable (doesn't change often)
- Missing any rule produces incorrect output

**Size guidance:** Knowledge skills often exceed 500 lines — acceptable when all content is behavioral. A 700-line skill
with all behavioral rules is better than a 400-line skill where critical rules are in unread references.

**Content organization:**

```markdown
## [Concept Name]

[Brief framing — 1-2 lines max]

### Rules
- Rule one stated declaratively
- Rule two with specific constraint
- Rule three with example inline if < 3 lines

### Examples (when needed)
Input: [concrete input]
Output: [concrete output]
```

### Coding Discipline Skill

**Characteristic pattern:** Declarative rules organized by topic, with philosophy bookends.

**Reference strategy:** Most reference-heavy archetype. Typically 3-8 references covering topic areas with API catalogs,
comparison tables, and edge case patterns.

**Structure:**

```markdown
[Philosophy section — 3-5 bullet principles, primacy position]

## Conventions

### [Topic 1]
- Rule A
- Rule B

### [Topic 2]
- Rule C

## Application

When **writing** code:
- Apply all conventions silently — don't narrate each rule
- If existing code contradicts a convention, follow the codebase and flag divergence once

When **reviewing** code:
- Cite the specific violation and show the fix inline
- Don't lecture — state what's wrong and how to fix it

## Integration

The **[other-skill]** skill governs [X]; this skill governs [Y]. When both apply, [precedence rule].

[Closing philosophy — recency position, 1-3 bullets]
```

**Why the Application section matters:** Without it, the agent may narrate every rule application or fail to apply
conventions during review. The section explicitly programs two behavioral modes.

**Why the Integration section matters:** Prevents conflicts when multiple discipline skills are loaded — gives the agent
clear precedence rules rather than forcing it to guess.

---

## Pre-Delivery Checklist

Adapted from mgechev's validation guide. Run these checks before considering a skill complete.

### Discovery validation

- Description tested: generate 3 prompts that should trigger, 3 that should not
- Name matches directory name exactly
- No false triggers for adjacent skills

### Logic validation

Feed the full SKILL.md to a fresh Claude instance and ask it to simulate execution step-by-step. Flag any point where it
guesses or hallucinates missing steps — those are instruction gaps.

### Edge case testing

Ask the LLM to act as a ruthless QA tester: "Find 3-5 specific edge cases or failure states in this skill. Don't fix
them — just ask the questions."

### Architecture check

- SKILL.md under 500 lines
- References one level deep (no nested references)
- Files longer than 100 lines have a table of contents
- No time-sensitive information in main body
- Consistent terminology throughout (one term per concept)
- All file paths use forward slashes

### Format audit

- Every table passes the column-removal test: removing any column would lose comparative meaning. If not → convert to KV
  list
- Independent-entry data (route tables, hook events, permission modes, model aliases) uses KV lists, not tables
- Numbered lists used ONLY for sequential steps where order matters
- Bullet lists used for rules, directives, conventions with no ordering
- No table is used merely because the data has two fields — two-field data is a KV list

### Content quality

- Description specific and includes key terms
- Each reference provides content SKILL.md doesn't have
- Degrees of freedom matched to task fragility
- Worked examples present for output-quality-dependent skills
- No rules duplicating Claude's existing capabilities (deletion test applied)

---

## Common Creation Mistakes

- **Writing references first** — seems logical to gather depth before rules. Fix: write SKILL.md first; it defines what
  depth is needed.
- **Duplicating SKILL.md in references** — copy-paste habit, fear of missing content. Fix: each reference must provide
  content SKILL.md doesn't have.
- **Over-scoping initial version** — trying to cover all cases upfront. Fix: start with the 3 most common scenarios,
  expand from observed failures.
- **Skipping evaluation** — "I know what the skill needs." Fix: run Claude without the skill first; failures reveal real
  gaps.
- **Writing 40+ rules** — more rules = more thorough (false). Fix: more rules = more attention competition; apply the
  deletion test.
- **Procedural style for everything** — steps feel more concrete. Fix: declarative for constraints, procedural only for
  genuinely ordered workflows.
- **Nested references** — "advanced.md links to details.md links to the actual info." Fix: all references one level
  deep; nested content may only be partially read.
- **Vague negative triggers** — description says what skill does, not what it doesn't. Fix: add explicit negative
  triggers ("Don't use for Vue, Svelte, or vanilla CSS projects") to prevent false activations.
