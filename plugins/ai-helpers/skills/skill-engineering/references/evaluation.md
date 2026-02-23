# Skill Quality Evaluation

Skills are prompts. Evaluate them using prompt engineering criteria.

## Quick Evaluation Checklist

Before deploying a skill, verify:

- [ ] Description leads with what the skill does (not a slogan)
- [ ] Description claims domain broadly ("whenever task involves")
- [ ] Description lists specific trigger keywords as examples
- [ ] SKILL.md is behaviorally self-sufficient — no critical rules only in references
- [ ] References contain only deepening material (examples, catalogs, how-tos)
- [ ] Route-to-Reference table has Contents column (if references exist)
- [ ] Instructions are clear and imperative
- [ ] Instructions use structure (numbered steps/rules, XML tags, headers)
- [ ] Examples cover normal and edge cases (few-shot prompting)
- [ ] Critical rules placed at end of SKILL.md
- [ ] Output format explicitly specified (if applicable)
- [ ] Under 500 lines (behavioral rules count as core; exceeding is acceptable)
- [ ] References are one level deep (no nested chains)
- [ ] Scope is focused (one purpose)
- [ ] Tested with varied inputs

## Description Quality

The description is the **highest-leverage field**. Poor descriptions
cause activation failures or false triggers.

### Evaluation Criteria

| Aspect | Good | Bad |
|--------|------|-----|
| Functional lead | "Go language conventions, idioms, and toolchain" | "Helps with coding" |
| Domain claim | "Invoke whenever task involves any interaction with X" | "Use when creating or editing X" |
| Trigger keywords | "— creating, evaluating, debugging, or understanding" | (no trigger keywords) |
| Point of view | "Design and iterate..." | "I can help you..." |

### Red Flags

- Slogan instead of functional description (opens with tagline)
- Narrow verb list instead of broad domain claim
- Uses vague verbs: "helps", "assists", "handles"
- Cross-skill dependencies that belong in SKILL.md body
- Written in second person ("you can...")
- Contradicts actual skill functionality

## Instruction Quality

### Clarity Test

Could a colleague follow these instructions without asking clarifying
questions? If not, the instructions need work. (This is the golden rule
of prompt engineering.)

### Evaluation Criteria

| Aspect | Good | Bad |
|--------|------|-----|
| Voice | Imperative: "Extract the data" | Passive: "Data should be extracted" |
| Steps | Numbered, sequential | Prose paragraphs |
| Specificity | "Format as JSON with keys: name, date" | "Format appropriately" |
| Completeness | Covers happy path + edge cases | Only happy path |
| Structure | XML tags, clear sections | Wall of text |
| Format spec | Explicit output example | "Return results" |
| Critical rules | At end of document | Buried in middle |

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

| Aspect | Good | Bad |
|--------|------|-----|
| SKILL.md size | < 500 lines | > 1000 lines |
| Reference depth | One level from SKILL.md | Nested references |
| Content split | Detailed docs in references | Everything in SKILL.md |
| File references | Clear pointers with context | "See other files" |

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

| Aspect | Good | Bad |
|--------|------|-----|
| Coverage | Simple, complex, and edge cases | Only happy path |
| Format | Clear input → output pairs | Prose descriptions |
| Realism | Uses realistic data | Trivial "foo/bar" examples |
| Diversity | Different scenarios represented | Same pattern repeated |

### Minimum Examples

For most skills, include at least:
- **Simple case** — Shows basic functionality
- **Complex case** — Shows handling of real-world complexity
- **Edge case** — Shows behavior at boundaries

## Testing Protocol

### Activation Testing

Run these prompts and verify behavior:

- **Should trigger:** 3-5 prompts that should activate the skill
- **Should not trigger:** 3-5 prompts that shouldn't activate it
- **Borderline:** 2-3 ambiguous cases to understand boundaries

Document expected behavior for each.

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

| Score | Criteria |
|-------|----------|
| 20 | Specific capabilities + clear triggers + right length |
| 15 | Mostly complete, minor improvements possible |
| 10 | Vague on either capabilities or triggers |
| 5 | Very vague, missing key information |
| 0 | Missing or actively misleading |

### Instructions (20 points)

| Score | Criteria |
|-------|----------|
| 20 | Clear, imperative, structured (XML tags/steps), explicit format |
| 15 | Mostly clear, minor ambiguities, format specified |
| 10 | Understandable but verbose or missing structure |
| 5 | Confusing structure, significant gaps, no format |
| 0 | Unclear or contradictory |

### Examples (20 points)

| Score | Criteria |
|-------|----------|
| 20 | Comprehensive coverage, realistic, well-formatted |
| 15 | Good coverage, minor gaps |
| 10 | Basic coverage, missing edge cases |
| 5 | Minimal examples, not representative |
| 0 | No examples or misleading examples |

### Structure (20 points)

| Score | Criteria |
|-------|----------|
| 20 | Right scope, proper organization, appropriate length |
| 15 | Minor structural issues |
| 10 | Too long or too short, scope issues |
| 5 | Poor organization, wrong scope |
| 0 | Fundamentally broken structure |

### Content Placement (20 points)

| Score | Criteria |
|-------|----------|
| 20 | SKILL.md behaviorally self-sufficient; references contain only deepening material; route table has Contents column |
| 15 | Most behavioral rules inline; one or two rules only in references |
| 10 | Significant behavioral content only in references; agent would produce partial/incorrect output without reading them |
| 5 | SKILL.md is mostly a router; critical rules live in references |
| 0 | No references exist but SKILL.md is incomplete, or references duplicate SKILL.md body content |

**What to check:**
- Can an agent produce correct output reading only SKILL.md?
- Do references contain depth (examples, catalogs, rubrics) or breadth
  (rules, directives)?
- Are anti-patterns stated as positive directives in the body, or
  duplicated in a separate table?
- Does the route table include a Contents column?

### Interpretation

- **90-100:** Production-ready
- **70-89:** Usable, improvements recommended
- **50-69:** Needs significant work
- **< 50:** Major revision required

## Common Issues by Score Range

### 70-89 (Minor Issues)

- Description could be more specific
- Missing one edge case example
- Instructions slightly verbose
- One or two behavioral rules only in references
- Route table missing Contents column

### 50-69 (Moderate Issues)

- Vague description causing activation problems
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
