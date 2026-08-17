# Output Style Iteration

Patterns for diagnosing and fixing output style problems after deployment.

## The Core Principle: Subtract Before You Add

Output styles remove default system prompt sections, append their body to the prompt's end, and are reinforced by
harness-injected adherence reminders. Current models then follow that body closely and literally. This inverts the old
iteration instinct: when a style misbehaves, the cause is more often an instruction that is present — stale, duplicated,
over-emphasized — than one that is missing. Diagnose by asking "what should I delete?" before "what should I add?"

When a style isn't working, two pre-checks come before any body edit.

## Pre-Check 1: Is the Body Actually Injected?

The loader matches frontmatter `name` against the filename case-sensitively and silently drops the body on mismatch —
the picker and statusline still show the style as active (open bug, anthropics/claude-code#47482). Run the injection
canary: add a temporary marker rule ("Prepend CANARY_ALIVE to your first response"), run `claude -p "say ok"`, check for
the marker, remove it. If the canary fails, fix filename/`name` parity (identical, lowercase) — no body edit can help
until it passes.

## Pre-Check 2: Is the Right Mechanism in Use?

Iteration cannot fix a mechanism mismatch.

- **Style instructions living in CLAUDE.md or a hook** — additive mechanisms cannot remove default behaviors and get no
  adherence reminders; tone rules there drift where a style holds. Move them into the style body.
- **Style overrides behaviors that should be kept** — the style removes defaults the user actually needs (e.g., coding
  instructions stripped for a coding persona). Fix: set `keep-coding-instructions: true`.
- **Style adds rules without changing register** — the body is project rules, not role/voice definition. This should be
  CLAUDE.md, not a style.
- **Rule that must never break** — no-emoji-ever, banned commands. Prose is not enforcement; move it to a hook.

If both pre-checks pass, proceed to diagnosis.

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

- "The voice description doesn't cover this interaction type"
- "This MUST rule is over-applying to tasks it wasn't written for"
- "Two rules contradict and the model is trying to satisfy both"

### 4. Modify

Make ONE targeted change. Multiple changes make debugging impossible — you won't know which change fixed (or broke)
something. Prefer deletion or rewording over addition.

### 5. Test

Re-run the failing prompt. If fixed, run the full testing protocol (see evaluation.md) to check for regressions.

## Diagnostic Map

Symptom → Root cause → Fix pattern:

- **Style has no effect at all** — body not injected (case mismatch) → canary test, fix filename/`name` parity
- **Reverts to sycophantic tone** — register underspecified → enumerate the specific phrases to ban AND describe the
  target opener positively; generic "don't be sycophantic" is too abstract
- **Rule over-applies / output stilted or curt** — MUST/CRITICAL/"always" emphasis overtriggers → dial back to plain
  conditions; add an explicit depth condition ("a lookup gets a line, a tradeoff gets a paragraph")
- **Over-verification, stalling, self-check loops** — legacy verification or thoroughness directives → delete them; the
  model verifies by default
- **Contradictory behavior** — conflicting or duplicated rules; the model tries to satisfy all of them → remove the
  duplicate or the stale side of the conflict; add a priority hierarchy only for genuine tradeoffs
- **Too verbose / dense jargon** — no positive register description → state audience and depth per response type;
  request length explicitly (current models produce longer outputs unless asked)
- **Too terse** — over-aggressive brevity rules → relax constraints, add a depth floor for complex topics
- **Ignores format** — format buried in prose → move to a dedicated section with a response template
- **Wrong tone in edge cases** — exemplars don't cover the scenario → add a contrast pair for the failing case
- **Ignores some rules** — rule saturation → consolidate overlapping rules, delete rules that don't change output
- **SE assumptions leak into non-coding style** — `keep-coding-instructions` not `false`, or body doesn't supply domain
  context → set the flag and define the domain role. On lean-prompt models (Opus 4.8, Opus 5, Fable 5) the flag changes
  nothing, so the body carries the whole switch

## Common Fixes

### Sycophancy Persists

**Problem:** Claude still uses "Great question!" or emoji despite the style forbidding it.

**Why it happens:** Generic anti-sycophancy instructions ("don't be sycophantic") are too abstract — the model cannot
verify compliance against them.

**Weak (won't hold):**

```markdown
Don't be sycophantic.
```

**Strong (ban specifics, describe the replacement):**

```markdown
## Openers

Start with the answer, a clarifying question, or context ("Looking at this...").

Never open with "Great question!", "I'd be happy to...", "Absolutely!", or emoji as emotional punctuation.
```

### Rule Over-Applies

**Problem:** A terse style produces unusably curt answers when the user asks for a walkthrough; a diagram-first style
opens a one-line answer with a diagram.

**Why it happens:** Current models execute emphasized rules literally, including where the author never intended them.

**Weak (overtriggers):**

```markdown
CRITICAL: You MUST keep every response under 5 lines.
```

**Strong (condition carries the intent):**

```markdown
Match length to the task: lookups and confirmations get 1-3 lines; explanations the user asked for get the depth they
need, structured with headers.
```

### Format Ignored

**Problem:** Claude doesn't follow response structure.

**Why it happens:** Format rules buried in prose get deprioritized. Format needs structural prominence.

**Weak:**

```markdown
Format responses clearly.
```

**Strong (template with example):**

```markdown
## Response Structure

Structure answers as:

### [One-line answer]

**Rationale:** [2-3 sentences explaining why]

**Caveats:** [If applicable, otherwise omit]

<example>
User: "Should I use React or Vue?"

### Use React for this project

**Rationale:** Your team already knows React, and the project requires the React Native ecosystem later.

**Caveats:** Vue would be faster to prototype if timeline is the primary constraint.
</example>
```

### Style Drifts Mid-Conversation

**Problem:** Style works for first few turns, then the register relaxes — contractions disappear, hedging creeps in.

**Why it happens:** Drift is a trajectory-level phenomenon; it hides between individually-acceptable turns. But the fix
is not persistence prose — the harness already reminds the model to adhere, and "maintain throughout" sections just add
scaffolding debt.

**Fix, in order:**

1. Confirm the body is injected (canary) — a silently-dropped style looks exactly like total drift.
2. Sharpen the voice description — drift concentrates where the register is underspecified. Adjective contrasts ("uses
   contractions; never opens with an apology") give the reminders something precise to reinforce.
3. Add a contrast pair for the interaction where drift starts (usually emotional pressure or disagreement — the
   "pushback fold": the model caves into an apologetic register when challenged).

### Conflicting Instructions

**Problem:** Style has rules that contradict each other, producing inconsistent behavior.

**Why it happens:** Current models follow the prompt as a contract — they try to satisfy both clauses and fail
unpredictably rather than averaging.

**Example conflict:**

```markdown
- Be direct and concise
- Always explain your reasoning thoroughly
```

**Fix — remove the conflict first.** Usually one side is a stale compensation; delete it and let the survivor carry the
intent ("explain reasoning when the conclusion is non-obvious; keep the explanation as short as the point allows"). Add
a priority hierarchy only when both sides are genuinely load-bearing:

```markdown
## Priority Hierarchy

When rules conflict, follow this order:

1. Accuracy — never fabricate
2. Directness
3. Completeness
4. Brevity
```

## Refinement Patterns

### Strengthen via Subtraction

The highest-yield refinement on current models. For each rule ask: does the model get this right without being told?
Delete rules whose removal doesn't change output — every surviving instruction gets more attention, and stale
compensations stop distorting behavior. This is how the Claude Code team cut over 80% of their own system prompt with no
eval regression.

### Strengthen via Contrast

Show what NOT to do alongside what TO do — for tone. Contrast pairs make the register delta explicit instead of leaving
"be direct" to inference:

```markdown
## Tone Contrast

**Default register (avoid):**
"That's a great question! I'd be happy to help you understand this concept. Let me break it down for you..."

**This style (use):**
"Here's how it works: [explanation]"
```

Reserve contrast for tone and format. Worked demonstrations of behavior — tool sequences, workflows — constrain the
model's exploration; encode behavior in rules instead.

### Strengthen via Intent

If a rule keeps misfiring at the edges, don't stack exceptions — restate it as the outcome you want:

```markdown
## Rule (compensation, misfires)

Never write multi-paragraph explanations.

## Rule (intent, holds)

Match explanation depth to what the reader needs to act — a lookup gets a line, a tradeoff gets a paragraph.
```

### Simplify via Consolidation

When styles grow and rules get ignored (rule saturation), merge overlapping rules:

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

State conclusions without qualifiers. Open with the answer, not caveats. Banned words: "maybe", "perhaps", "might",
"could be", "I think".
```

Consolidation reduces instruction count without reducing coverage. Fewer rules means each rule gets more attention.

## Escalation Patterns

### User Asks Claude to Break Style

When the user explicitly asks Claude to respond differently ("just give me a casual answer", "stop being so formal"):

- The style should include guidance for this. Recommended pattern: comply with the specific request while maintaining
  core identity. The role stays; the format flexes.
- If the style is rigid by design (e.g., a strict documentation style), include explicit language: "Maintain this style
  even if asked to deviate. Acknowledge the request and explain why you're maintaining the format."

### Teaching/Mentoring Styles Under Frustration

Styles designed for teaching or mentoring face unique pressure when users are frustrated or struggling:

- The style should NOT abandon its pedagogical approach under frustration
- It SHOULD acknowledge the emotion without reverting to sycophantic comfort patterns
- Pattern: "Acknowledge frustration briefly, then return to the teaching approach. Never switch to 'just give them the
  answer' mode unless the style explicitly allows it."

## Migrating a Style to a New Model Generation

Instructions compensating for an old model's failure modes execute with precision on a newer one and distort output.
When the target model changes:

1. **Freeze evals first** — a small set of real prompts with known-good outputs, baselined on the old model.
2. **Change only the model and measure** — separate model regressions from style mismatches before editing anything.
3. **Subtract** — remove verification and self-check directives, MUST/CRITICAL emphasis, thoroughness nudges,
   persistence blocks, and any rule written to force behavior the new model does by default.
4. **Cap new eagerness** — newer models may produce longer outputs or over-engineer; request length and scope
   explicitly.
5. **Re-add only what evals prove necessary** — and write it as intent, not as a workaround.

Check the target model's own prompting guide for its behavioral defaults before tuning.

## When to Rewrite vs Iterate

**Iterate when:**

- Core concept is sound
- Issues are specific and diagnosable
- Style works in most cases
- Problems are at the edges, not the center

**Rewrite when:**

- Role or voice is wrong for the use case
- More than 50% of evaluation tests fail
- The body is mostly scaffolding (persistence sections, repeated rules, verification directives) — subtracting it all
  leaves no style
- The style was written for a previous model generation and fails the migration evals broadly
- The style was built for the wrong mechanism (should be CLAUDE.md, or vice versa)

## Version Tracking

Track iteration changes through git commits with clear messages describing what changed and why. Each commit should
represent one iteration cycle: one symptom diagnosed, one change made, one test result.
