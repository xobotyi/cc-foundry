# Skill Quality Evaluation

Detailed scoring rubrics and evaluation procedures. For the quick deployment checklist, see the "Quick Checks" section
in SKILL.md.

## Contents

- [Description Quality](#description-quality)
- [Instruction Quality](#instruction-quality)
- [Progressive Disclosure](#progressive-disclosure)
- [Scope Assessment](#scope-assessment)
- [Example Quality](#example-quality)
- [Evaluation-Driven Development](#evaluation-driven-development)
- [Testing Protocol](#testing-protocol)
- [Scoring Rubric](#scoring-rubric)
- [Common Issues by Score Range](#common-issues-by-score-range)

## Description Quality

The description is the **highest-leverage field**. It is the only signal Claude uses to decide whether to invoke a skill
— no algorithmic routing, no intent classification, pure LLM reasoning against the description text. Poor descriptions
cause activation failures or false triggers.

### Trigger Keyword Density

Keyword density directly correlates with activation rate. Claude matches descriptions against user intent using language
understanding. A description with zero trigger verbs (e.g., "Helps with coding tasks") gives Claude nothing to match
against. A description with 4-6 domain-specific trigger verbs gives Claude multiple match opportunities.

**Baseline activation rates by description quality (Scott Spence, 200+ test runs, Haiku 4.5):**

- No hook, poor description: ~20% (coin flip)
- No hook, optimized description: 20-50% (systemic ceiling, not just a description problem)
- Forced-eval hook, any description: ~84%
- Manual invocation: 100%

**What "optimized description" means:** domain claim + action verbs + clear scope. Example:

```
# Low keyword density — activation unreliable
description: Helps with Go code

# High keyword density — best achievable without a hook
description: >-
  Go language conventions, idioms, and toolchain.
  Invoke whenever task involves any interaction with Go —
  writing, reviewing, debugging, or understanding Go code.
```

### Evaluation Criteria

**Functional lead:**

- Good: "Go language conventions, idioms, and toolchain"
- Bad: "Helps with coding"

**Domain claim:**

- Good: "Invoke whenever task involves any interaction with X"
- Bad: "Use when creating or editing X"

**Trigger keywords:**

- Good: "— creating, evaluating, debugging, or understanding"
- Bad: (no trigger keywords listed)

**Point of view:**

- Good: "Design and iterate..."
- Bad: "I can help you..."

### Red Flags

- Slogan instead of functional description (opens with tagline)
- Narrow verb list instead of broad domain claim
- Uses vague verbs: "helps", "assists", "handles"
- Cross-skill dependencies that belong in SKILL.md body
- Written in second person ("you can...")
- Contradicts actual skill functionality

## Instruction Quality

### Clarity Test

Could a colleague follow these instructions without asking clarifying questions? If not, the instructions need work.
(This is the golden rule of prompt engineering.)

### Evaluation Criteria

**Voice:**

- Good: Imperative: "Extract the data"
- Bad: Passive: "Data should be extracted"

**Steps:**

- Good: Numbered, sequential
- Bad: Prose paragraphs

**Specificity:**

- Good: "Format as JSON with keys: name, date"
- Bad: "Format appropriately"

**Completeness:**

- Good: Covers happy path + edge cases
- Bad: Only happy path

**Structure:**

- Good: XML tags, clear sections
- Bad: Wall of text

**Format spec:**

- Good: Explicit output example
- Bad: "Return results"

**Critical rules:**

- Good: At end of document (recency zone)
- Bad: Buried in middle

### Red Flags

- Long paragraphs without structure
- Ambiguous terms: "appropriately", "as needed", "correctly"
- Missing error handling guidance
- No examples for complex operations
- No explicit output format specification
- Critical constraints buried in prose
- No XML tags for multi-part instructions

## Progressive Disclosure

### Evaluation Criteria

**SKILL.md size:**

- Good: < 500 lines
- Bad: > 1000 lines

**Reference depth:**

- Good: One level from SKILL.md
- Bad: Nested references

**Content split:**

- Good: Detailed docs in references
- Bad: Everything in SKILL.md

**File references:**

- Good: Clear pointers with context
- Bad: "See other files"

### Structure Check

```
Good:
SKILL.md → references/api.md    (one level)
SKILL.md → references/guide.md  (one level)

Bad:
SKILL.md → references/main.md → references/details.md → ...
```

## Scope Assessment

### Too Broad

Signs:

- Skill tries to handle multiple unrelated domains
- Instructions are vague to cover all cases
- Output quality varies significantly by input type

Fix: Split into multiple focused skills.

### Too Narrow

Signs:

- Skill handles only one very specific case
- Rarely triggered
- Could be a one-line instruction instead

Fix: Generalize slightly or absorb into a broader skill.

### Right Size

Signs:

- Clear, consistent purpose
- Triggered appropriately
- Output quality is predictable
- Valuable enough to justify the overhead

## Example Quality

### Evaluation Criteria

**Coverage:**

- Good: Simple, complex, and edge cases
- Bad: Only happy path

**Format:**

- Good: Clear input → output pairs
- Bad: Prose descriptions

**Realism:**

- Good: Uses realistic data
- Bad: Trivial "foo/bar" examples

**Diversity:**

- Good: Different scenarios represented
- Bad: Same pattern repeated

### Minimum Examples

For most skills, include at least:

- **Simple case** — Shows basic functionality
- **Complex case** — Shows handling of real-world complexity
- **Edge case** — Shows behavior at boundaries

### Worked Examples Are Refinement Artifacts

Complete input→output worked examples (showing a realistic request and the skill's full output) are high-value but
rarely available during initial skill creation. They typically emerge from real usage: a problem is encountered, solved,
and the solution documented as an example.

Treat worked examples as a refinement goal, not an initial requirement. Populate them during iteration as you observe
the skill in use. Pre-existing context (existing codebases, prior conversations) can sometimes provide material, but
this is the exception.

## Evaluation-Driven Development

Build evaluations BEFORE writing extensive documentation:

1. **Identify gaps** — run Claude on representative tasks without the skill. Document specific failures or missing
   context.
2. **Create evaluations** — build 3+ scenarios that test these gaps.
3. **Establish baseline** — measure performance without the skill.
4. **Write minimal instructions** — only content that addresses observed failures.
5. **Iterate** — run evaluations, compare against baseline, refine.

This prevents over-engineering. You only add content that addresses real failures, not anticipated ones.

## Testing Protocol

### Activation Testing

Run these prompts and verify behavior:

- **Should trigger:** 3-5 prompts that should activate the skill
- **Should not trigger:** 3-5 prompts that shouldn't activate it
- **Borderline:** 2-3 ambiguous cases to understand boundaries

Document expected behavior for each.

**Activation rate benchmarks (Haiku 4.5, 200+ test runs):**

- Simple instruction hook: ~20% — effectively no better than no hook at all
- LLM-eval hook: ~80% — faster and cheaper, but can fail spectacularly on multi-skill prompts
- Forced-eval hook: ~84% — most consistent; forces Claude to state YES/NO per skill before acting
- Manual `/skill-name`: 100% — always reliable

If auto-activation is below 50% after description optimization, the description is not the primary problem — the
activation ceiling is systemic. Use a forced-eval hook or accept manual invocation.

### Output Quality Testing

For each test case:

- Does output match expected format?
- Is content accurate and complete?
- Are edge cases handled correctly?
- Is output consistent across multiple runs?

### Regression Testing

After any change:

1. Re-run activation tests
2. Re-run quality tests
3. Verify no new issues introduced

## Scoring Rubric

### Description (20 points)

- 20: Specific capabilities + clear triggers + right length; trigger keyword density ≥ 4 domain-specific verbs
- 15: Mostly complete, minor improvements possible
- 10: Vague on either capabilities or triggers; low keyword density
- 5: Very vague, missing key information; no trigger verbs
- 0: Missing or actively misleading

### Instructions (20 points)

- 20: Clear, imperative, structured (XML tags/steps), explicit format
- 15: Mostly clear, minor ambiguities, format specified
- 10: Understandable but verbose or missing structure
- 5: Confusing structure, significant gaps, no format
- 0: Unclear or contradictory

### Examples (20 points)

- 20: Comprehensive coverage, realistic, well-formatted
- 15: Good coverage, minor gaps
- 10: Basic coverage, missing edge cases
- 5: Minimal examples, not representative
- 0: No examples or misleading examples

### Structure (20 points)

- 20: Right scope, proper organization, appropriate length
- 15: Minor structural issues
- 10: Too long or too short, scope issues
- 5: Poor organization, wrong scope
- 0: Fundamentally broken structure

### Content Placement (20 points)

- 20: SKILL.md behaviorally self-sufficient; references contain only deepening material; route list describes each
  reference's contents; KV lists for lookups, tables only for 2D comparisons; critical rules in primacy/recency zones
- 15: Most behavioral rules inline; one or two rules only in references; mostly good placement
- 10: Significant behavioral content only in references; critical rules buried in middle
- 5: SKILL.md is mostly a router; critical rules live in references
- 0: No references exist but SKILL.md is incomplete, or references duplicate SKILL.md body content

**What to check:**

- Can an agent produce correct output reading only SKILL.md?
- Do references contain depth (examples, catalogs, rubrics) or breadth (rules, directives)?
- Are anti-patterns stated as positive directives in the body, or duplicated in a separate table?
- Does the route list describe each reference's contents?
- Are KV lists used for lookups/routes, tables reserved for 2D comparisons?
- Are critical rules placed in the top 20% or bottom 20% of SKILL.md (not only buried in the middle)?
- Is instruction style appropriate — declarative for constraints/conventions, procedural only for ordered workflows?
- Does every instruction earn its place (deletion test)?

### Interpretation

- **90-100:** Production-ready
- **70-89:** Usable, improvements recommended
- **50-69:** Needs significant work
- **< 50:** Major revision required

## Common Issues by Score Range

### 70-89 (Minor Issues)

- Description could be more specific; trigger keyword density < 4 verbs
- Missing one edge case example
- Instructions slightly verbose
- One or two behavioral rules only in references
- Route list missing content descriptions
- Tables used for lookup data that should be KV lists

### 50-69 (Moderate Issues)

- Vague description causing activation problems; zero trigger keywords
- Instructions missing key scenarios
- No examples for edge cases
- Wrong scope (too broad or too narrow)
- Significant behavioral content only in references

### < 50 (Major Issues)

- Description doesn't match actual functionality
- Instructions contradictory or unclear
- No examples
- Fundamentally wrong structure
- SKILL.md is a router with no behavioral content
