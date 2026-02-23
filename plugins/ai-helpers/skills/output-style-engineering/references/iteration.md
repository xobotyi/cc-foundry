# Output Style Iteration

Patterns for refining and improving output styles.

## Table of Contents

- [Iteration Cycle](#iteration-cycle)
- [Diagnostic Table](#diagnostic-table)
- [Common Fixes](#common-fixes)
- [Refinement Patterns](#refinement-patterns)
- [When to Rewrite vs Iterate](#when-to-rewrite-vs-iterate)
- [Version Control](#version-control)

---

## Iteration Cycle

```
1. Observe → 2. Diagnose → 3. Hypothesize → 4. Modify → 5. Test → Repeat
```

### 1. Observe

Document specific failure cases:
- What prompt triggered the issue?
- What response did you get?
- What response did you expect?
- Was this first turn or mid-conversation?

### 2. Diagnose

Identify the root cause (see diagnostic table below).

### 3. Hypothesize

Form a specific hypothesis about what's wrong:
- "The persona isn't strong enough to override defaults"
- "There's no example showing this scenario"
- "The rule conflicts with another rule"

### 4. Modify

Make ONE targeted change. Multiple changes make debugging
impossible.

### 5. Test

Re-run the failing prompt. If fixed, test other scenarios
for regression.

---

## Diagnostic Table

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Reverts to sycophantic tone | Weak persona, no anti-patterns | Add explicit "Never use..." list |
| Ignores format | Format buried in text | Move format to end, add example |
| Inconsistent between turns | No multi-turn guidance | Add conversation continuity rules |
| Works initially, drifts later | Style reminders not reinforced | Add "maintain throughout" language |
| Too verbose | No length constraints | Add explicit length limits |
| Too terse | Over-aggressive brevity rules | Relax constraints, add minimum |
| Wrong tone in edge cases | Examples don't cover scenario | Add example for failing case |
| Contradictory behavior | Conflicting instructions | Resolve conflict, prioritize rules |
| Ignores some rules | Too many instructions | Simplify, consolidate, prioritize |

---

## Common Fixes

### Sycophancy Persists

**Problem:** Claude still uses "Great question!" despite instructions.

**Weak fix:**
```markdown
Don't be sycophantic.
```

**Strong fix:**
```markdown
## Forbidden Phrases (Never Use)

- "Great question!"
- "I'd be happy to..."
- "That's a wonderful..."
- "Absolutely!"
- "Of course!"

## Opening Patterns (Use Instead)

- Start with the answer
- Start with a clarifying question
- Start with acknowledgment: "Looking at this..."
```

### Format Ignored

**Problem:** Claude doesn't follow response structure.

**Weak fix:**
```markdown
Format responses clearly.
```

**Strong fix:**
```markdown
## Response Template

ALWAYS structure responses as:

### [One-line answer]

**Rationale:** [2-3 sentences explaining why]

**Caveats:** [If applicable, otherwise omit]

## Example

User: "Should I use React or Vue?"

Response:
### Use React for this project

**Rationale:** Your team already knows React, and the project
requires the ecosystem of React Native later.

**Caveats:** Vue would be faster to prototype if timeline
is the primary constraint.
```

### Style Drifts Mid-Conversation

**Problem:** Style works for first few turns, then reverts.

**Fix:** Add explicit persistence language:

```markdown
## Consistency

Maintain this communication style throughout the entire
conversation. Do not revert to default patterns even if:
- The topic changes
- The user asks follow-up questions
- Multiple turns have passed
- The task becomes complex

If uncertain, default to MORE adherence to this style,
not less.
```

### Works for Simple, Fails for Complex

**Problem:** Style holds for simple tasks but breaks down
for multi-step work.

**Fix:** Add complexity-specific guidance:

```markdown
## Complex Task Handling

When tasks require multiple steps:

- Maintain style for EACH step
- Structure output clearly (headers, bullets)
- If length needed, prefer structure over prose
- Preserve tone even when providing details

For longer responses, check: "Does each paragraph
match this style?"
```

### Conflicting Instructions

**Problem:** Style has rules that contradict each other.

**Example conflict:**
```markdown
- Be direct and concise
- Always explain your reasoning thoroughly
```

**Fix:** Establish hierarchy:

```markdown
## Priority Hierarchy

When rules conflict, follow this priority:

1. Safety and accuracy first
2. Style persona (direct, professional)
3. Format requirements
4. Length constraints

Example: If being thorough requires being longer,
prioritize thoroughness but use structured format
to maintain directness.
```

---

## Refinement Patterns

### Strengthen via Repetition

Critical rules can be reinforced by appearing in multiple places:

```markdown
# Persona
You are direct and never use sycophantic language.

## Communication
Open with answers, not pleasantries. No sycophancy.

## Examples
[Shows direct openings, no sycophancy]

## Critical Rules
Never use sycophantic openers like "Great question!"
```

### Strengthen via Examples

If a rule isn't being followed, add an example showing it:

```markdown
## Rule
Never apologize for limitations.

## Example of Rule

User: "Can you access the internet?"

Wrong: "I apologize, but I cannot access the internet."

Correct: "I don't have internet access. Here's what I can
do instead: [alternatives]"
```

### Strengthen via Contrast

Show what NOT to do alongside what TO do:

```markdown
## Tone Contrast

**Default Claude (avoid):**
"That's a great question! I'd be happy to help you
understand this concept. Let me break it down for you..."

**This Style (use):**
"Here's how it works: [explanation]"
```

### Simplify via Consolidation

If style is too long and rules get ignored, consolidate:

**Before (scattered):**
```markdown
- Be direct
- Don't hedge
- Avoid qualifiers
- State conclusions first
- Don't use "maybe" or "perhaps"
```

**After (consolidated):**
```markdown
## Directness Rule

State conclusions without qualifiers. Open with the answer,
not caveats. Banned words: "maybe", "perhaps", "might",
"could be", "I think".
```

---

## When to Rewrite vs Iterate

**Iterate when:**
- Core concept is sound
- Issues are specific and diagnosable
- Style works in most cases
- Problems are at the edges

**Rewrite when:**
- Fundamental misunderstanding of purpose
- Persona is wrong for the use case
- Too many conflicting rules
- More than 50% of tests fail
- Style has grown too complex to maintain

---

## Version Control

Track changes systematically:

```markdown
<!-- CHANGELOG
v1.0: Initial version
v1.1: Added explicit anti-sycophancy rules
v1.2: Fixed format template, added example
v1.3: Simplified conflicting length rules
-->
```

Or maintain separate versions:
```
output-styles/
  direct-professional-v1.md
  direct-professional-v2.md
  direct-professional.md  # symlink to current
```
