# Output Style Iteration

Patterns for diagnosing and fixing output style problems after deployment.

## The Core Principle: Replace, Don't Augment

Output styles work by replacing the system prompt at the core level. This has a critical implication for iteration:
**you cannot remove default behaviors by adding instructions on top of them.** Adding "don't be sycophantic" to
CLAUDE.md or a session-start hook will lose effectiveness over multiple turns. The style mechanism exists specifically
to solve this — if a behavior needs to be overridden, it must be overridden at the system prompt level.

When a style isn't working, the first diagnostic question is: **is the problem a style problem, or a mechanism
mismatch?**

## Mechanism Mismatch

Before iterating on the style itself, verify the right mechanism is in use. Iteration cannot fix a mechanism mismatch.

**Symptoms of mechanism mismatch:**

- **Style instructions ignored after several turns** — if the instructions are in CLAUDE.md or a hook instead of an
  output style, they lose power as conversation grows. Move them into the style body.
- **Style overrides behaviors that should be kept** — the style replaces defaults that the user actually needs (e.g.,
  coding instructions stripped for a coding persona). Fix: set `keep-coding-instructions: true` or move non-replacement
  content to CLAUDE.md.
- **Style adds rules without changing personality** — the style body is project rules, not persona definition. This
  should be CLAUDE.md, not a style. Styles are for personality replacement; CLAUDE.md is for project context.

If the mechanism is correct, proceed to diagnosis.

## Iteration Cycle

```
Observe → Diagnose → Hypothesize → Modify (one change) → Test → Repeat
```

### 1. Observe

Document the specific failure:

- What prompt triggered the issue?
- What response did you get?
- What response did you expect?
- Was this first turn or mid-conversation? (Drift problems only appear later.)

### 2. Diagnose

Identify root cause using the diagnostic map below. Match the symptom to a cause before making changes.

### 3. Hypothesize

Form a specific, testable hypothesis:

- "The persona isn't strong enough to override defaults"
- "There's no example showing this scenario"
- "Two rules conflict and Claude is picking the wrong one"

### 4. Modify

Make ONE targeted change. Multiple simultaneous changes make debugging impossible — you won't know which change fixed
(or broke) something.

### 5. Test

Re-run the failing prompt. If fixed, run the full testing protocol (see evaluation.md) to check for regressions.

## Diagnostic Map

Symptom → Root cause → Fix pattern:

- **Reverts to sycophantic tone** — weak persona, no anti-patterns → add explicit forbidden phrases list with
  replacements. Community evidence: users report emoji-spam and "Great question!" persisting despite instructions —
  generic "don't be sycophantic" is too weak; enumerate specific phrases to ban.
- **Ignores format** — format buried in prose → move format specification to a dedicated section near the end, add a
  response template with an example
- **Inconsistent between turns** — no persistence language → add explicit "maintain throughout entire conversation"
  clause with enumerated reversion triggers
- **Works initially, drifts later** — critical rules stated once → reinforce via repetition across sections (persona,
  behaviors, examples, critical rules)
- **Too verbose** — no length constraints → add explicit length limits per response type
- **Too terse** — over-aggressive brevity rules → relax constraints, add minimum depth floor for complex topics
- **Wrong tone in edge cases** — examples don't cover the scenario → add a contrast example for the failing case
- **Contradictory behavior** — conflicting instructions without priority → add priority hierarchy section
- **Ignores some rules** — too many instructions (rule saturation) → consolidate overlapping rules, cut rules that don't
  change output
- **SE assumptions leak into non-coding style** — `keep-coding-instructions` not set to `false`, or style body doesn't
  actively replace SE context → set the flag and provide domain-appropriate context

## Common Fixes

### Sycophancy Persists

**Problem:** Claude still uses "Great question!" or emoji despite the style forbidding it.

**Why it happens:** Generic anti-sycophancy instructions ("don't be sycophantic") are too abstract. Claude's defaults
are deeply trained and require specific overrides.

**Weak (won't hold):**

```markdown
Don't be sycophantic.
```

**Strong (enumerate and replace):**

```markdown
## Forbidden Phrases (Never Use)

- "Great question!"
- "I'd be happy to..."
- "That's a wonderful..."
- "Absolutely!"
- "Of course!"
- Any emoji as emotional punctuation

## Opening Patterns (Use Instead)

- Start with the answer
- Start with a clarifying question
- Start with context: "Looking at this..."
```

### Format Ignored

**Problem:** Claude doesn't follow response structure.

**Why it happens:** Format rules buried in prose get deprioritized as context fills. Format needs structural prominence.

**Weak:**

```markdown
Format responses clearly.
```

**Strong (template with example):**

```markdown
## Response Structure

ALWAYS structure responses as:

### [One-line answer]

**Rationale:** [2-3 sentences explaining why]

**Caveats:** [If applicable, otherwise omit]

<example>
User: "Should I use React or Vue?"

### Use React for this project

**Rationale:** Your team already knows React, and the project
requires the React Native ecosystem later.

**Caveats:** Vue would be faster to prototype if timeline
is the primary constraint.
</example>
```

### Style Drifts Mid-Conversation

**Problem:** Style works for first few turns, then reverts to defaults.

**Why it happens:** Without explicit persistence language, the style's influence fades as conversation context grows and
newer messages carry more weight.

**Fix — add explicit persistence clause:**

```markdown
## Consistency

Maintain this style throughout the entire conversation.
Do not revert to default patterns even if:

- The topic changes
- The user asks follow-up questions
- Multiple turns have passed
- The task becomes complex or frustrating
- The user expresses strong emotion

If uncertain, default to MORE adherence to this style, not less.
```

### Works for Simple, Fails for Complex

**Problem:** Style holds for simple tasks but breaks down for multi-step work.

**Why it happens:** Complex tasks require more cognitive load, and Claude falls back to trained defaults when generating
longer responses.

**Fix — add complexity-specific guidance:**

```markdown
## Complex Task Handling

When tasks require multiple steps:

- Maintain style for EACH step individually
- Structure output clearly (headers, bullets)
- If length is needed, prefer structure over prose
- Preserve tone even when providing details

For longer responses, self-check: does each section still
match this style?
```

### Conflicting Instructions

**Problem:** Style has rules that contradict each other, producing inconsistent behavior.

**Example conflict:**

```markdown
- Be direct and concise
- Always explain your reasoning thoroughly
```

**Fix — establish priority hierarchy:**

```markdown
## Priority Hierarchy

When rules conflict, follow this order:

1. Accuracy — never fabricate
2. Style persona (direct, professional)
3. Format requirements
4. Length constraints

Example: if being thorough requires length, prioritize
thoroughness but use structured format to maintain directness.
```

## Refinement Patterns

### Strengthen via Repetition

Critical rules reinforced across multiple sections are harder to ignore:

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

This is the strongest technique for rules that keep getting violated. A rule stated once can be deprioritized; a rule
woven through every section cannot.

### Strengthen via Contrast

Show what NOT to do alongside what TO do. Contrast pairs are the strongest single training signal for tone:

```markdown
## Tone Contrast

**Default Claude (avoid):**
"That's a great question! I'd be happy to help you
understand this concept. Let me break it down for you..."

**This Style (use):**
"Here's how it works: [explanation]"
```

Contrast pairs work because they make the delta explicit. Instead of inferring what "be direct" means, Claude sees the
exact before/after difference.

### Strengthen via Examples

If a rule isn't being followed, add a concrete example demonstrating it:

```markdown
## Rule
Never apologize for limitations.

## Example

User: "Can you access the internet?"

Wrong: "I apologize, but I cannot access the internet."
Correct: "I don't have internet access. Here's what I can
do instead: [alternatives]"
```

### Simplify via Consolidation

When styles grow too long and rules get ignored (rule saturation), merge overlapping rules:

**Before (scattered, 5 rules):**

```markdown
- Be direct
- Don't hedge
- Avoid qualifiers
- State conclusions first
- Don't use "maybe" or "perhaps"
```

**After (consolidated, 1 rule):**

```markdown
## Directness

State conclusions without qualifiers. Open with the answer,
not caveats. Banned words: "maybe", "perhaps", "might",
"could be", "I think".
```

Consolidation reduces instruction count without reducing coverage. Fewer rules means each rule gets more attention.

## Escalation Patterns

### User Asks Claude to Break Style

When the user explicitly asks Claude to respond differently ("just give me a casual answer", "stop being so formal"):

- The style should include guidance for this. Recommended pattern: comply with the specific request while maintaining
  core identity. The persona stays; the format flexes.
- If the style is rigid by design (e.g., a strict documentation style), include explicit language: "Maintain this style
  even if asked to deviate. Acknowledge the request and explain why you're maintaining the format."

### Teaching/Mentoring Styles Under Frustration

Styles designed for teaching or mentoring face unique pressure when users are frustrated or struggling:

- The style should NOT abandon its pedagogical approach under frustration
- It SHOULD acknowledge the emotion without reverting to sycophantic comfort patterns
- Pattern: "Acknowledge frustration briefly, then return to the teaching approach. Never switch to 'just give them the
  answer' mode unless the style explicitly allows it."

## When to Rewrite vs Iterate

**Iterate when:**

- Core concept is sound
- Issues are specific and diagnosable
- Style works in most cases
- Problems are at the edges, not the center

**Rewrite when:**

- Persona is wrong for the use case
- More than 50% of evaluation tests fail
- Conflicting rules are too tangled to untangle
- Style has grown too complex to maintain (rule saturation beyond recovery)
- The style was built for the wrong mechanism (should be CLAUDE.md, or vice versa)

## Version Tracking

Track iteration changes through git commits with clear messages describing what changed and why. Each commit should
represent one iteration cycle: one symptom diagnosed, one change made, one test result.
