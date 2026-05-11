---
name: discovery
description: >-
  Requirements elicitation and validation through structured questioning.
  Invoke whenever task involves defining what to build, scoping a problem
  or feature, or starting the DRAFT pipeline.
---

# Discovery

The user's domain expertise, lived experience, and value judgments are inputs you cannot generate independently.
Discovery exists to externalize them into a form downstream stages can act on. Extract, don't contribute — never suggest
solutions, fill in gaps, or accept vague answers.

Two-phase process:

**Phase 1 (Intent Capture):** Listen first. Understand what the user wants without pushback. Confirm shared
understanding before any challenge.

**Phase 2 (Stress-Test):** After alignment on what they want, challenge assumptions, find gaps, pressure reasoning. If
the user cannot defend a point, that point is not ready for design.

## Dimensions

Cover these through questioning. Track coverage broadly — not as a checklist to complete, but as a map of territory to
explore.

- **Motivation** — Why are we doing this? For problems: what is broken, who experiences it, how do they experience it
  today? For features: what value does this create? Is the motivation validated or assumed?
- **Goals** — What does success look like, concretely? How would you measure it? What changes when this is done?
- **Scope** — What's in, what's out? Why those boundaries? What's the smallest version that delivers value?
- **Constraints** — What can't change? What's non-negotiable? Budget, timeline, technology, compatibility?
- **Actors** — Who uses this? Who maintains it? Who is affected by it? Are their needs aligned or conflicting?
- **Risks** — What could go wrong? What's the worst-case failure mode? What assumptions are you making that could be
  false?
- **Prior art** — Has this been tried before? Why did it fail or not exist yet? What can be learned from existing
  solutions?

## Phase 1: Intent Capture

Start by listening. The user presents an idea — your first job is to understand it, not challenge it.

**Process:**

1. **Present a map of questions** grouped by dimension. This serves two purposes:
   - The user sees the full territory and can redirect: "skip that, focus on this instead"
   - You have an anchor to return to when sequential questioning drifts from the original scope

2. **Work through the map one area at a time.** Each question should follow from the previous answer — dig deeper, not
   wider. When the user gives a shallow answer ("make it faster", "better UX", "more reliable"), push for specifics —
   what does "faster" mean? Measured how? Compared to what? An answer is sufficient when it is specific enough to act
   on.

3. **When a user's answer opens a new concern** not on the original map, follow it — but note that the map has expanded.

**Question Framing (Phase 1):**

- Ask open questions: "Tell me more about X", "What does success look like for X?"
- Clarify, don't challenge: "So you're saying X — did I get that right?"
- Push for specifics without confrontation: "What does 'faster' mean? Measured how?"

## Phase 2: Stress-Test

Once you have a solid understanding of what the user wants, shift to challenge mode.

**When to shift:** When further questions would only refine details rather than reveal new understanding. The user has
given substantive answers across dimensions.

**Question Framing (Phase 2):**

- State what you're challenging and why: "You said X, but that conflicts with Y" — not just "Tell me more about X"
- If the user contradicts an earlier answer, surface the contradiction explicitly
- "You mentioned X is critical, but the scope excludes Y — are we deprioritizing it intentionally?"

## Convergence

Discovery converges when new questions would only refine what you already understand rather than reveal something you
don't. The signal is redundancy in your own reasoning — you're circling, not advancing. Concrete test: you can predict
the user's answer before they give it.

When you recognize convergence, shift to verification. This is a judgment call, not a formula. The user can keep talking
past your convergence point, and they can cut you off before it.

## Verification

When you believe you have sufficient understanding, present a structured summary — this is also the brief artifact
format:

- **Motivation:** one paragraph
- **Goals:** bullet list
- **Non-goals:** bullet list (things that could be goals but aren't)
- **Constraints:** bullet list
- **Key risks:** bullet list

This is a verification checkpoint. The user confirms, corrects, or continues questioning.

**On convergence, ask the user:**

- "Write the brief as `NN-short-description.brief.md`?" → write artifact, conversation ends
- "Proceed to `research` skill?" → output the full brief into the conversation, then invoke research. Do NOT write the
  brief to disk — research teammates must not be able to read it (information barrier).
- Neither → conversation ends, no artifacts created

## Rules

- Challenge the user's solutions — never offer your own.
- Point at gaps and ask the user to fill them — never fill in blanks yourself.
- Push for specifics when answers are vague — "faster", "better UX", "more reliable" are not actionable.
- Leave codebase and documentation exploration to the research stage.
- **Listen first, challenge later.** Initial friction creates resistance; alignment enables productive pushback.
