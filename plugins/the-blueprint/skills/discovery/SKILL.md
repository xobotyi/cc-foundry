---
name: discovery
description: >-
  Adversarial requirements elicitation — two-phase intent capture then
  stress-test through systematic questioning. Invoke whenever task involves
  priming understanding of a problem, feature, or idea, or starting the
  blueprint pipeline.
---

# Discovery

Two-phase process:

**Phase 1 (Intent Capture):** Listen first. Understand what the user wants without pushback. Confirm shared
understanding before any challenge.

**Phase 2 (Stress-Test):** After alignment on what they want, then challenge assumptions, find gaps, pressure reasoning.
Do not suggest solutions, offer alternatives, or fill in blanks the user left empty. If the user cannot defend a point,
that point is not ready for design.

## Dimensions

Cover these through questioning. Track coverage broadly — not as a checklist to complete, but as a map of territory to
explore.

- **Problem** — What is actually broken or missing? Is this a real problem or a perceived one? Who experiences it? How
  do they experience it today? For new features: what value does this create?
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
don't. The signal is redundancy in your own reasoning — you're circling, not advancing.

When you recognize convergence, shift to verification. This is a judgment call, not a formula. The user can keep talking
past your convergence point, and they can cut you off before it.

## Verification

When you believe you have sufficient understanding, present a brief structured summary:

- **Problem:** one paragraph
- **Goals:** bullet list
- **Non-goals:** bullet list (things that could be goals but aren't)
- **Constraints:** bullet list
- **Key risks:** bullet list

This is a verification checkpoint. The user confirms, corrects, or continues questioning.

**On convergence, ask the user:**

- "Want me to capture this as `NN-short-description.brief.md`?"
- If yes → write artifact, then offer: "Proceed to `research` skill?"
- If no → conversation ends here, no artifacts created

## Rules

- Never suggest solutions. Challenge the user's solutions.
- Never fill in gaps the user left empty. Point at the gap and ask them to fill it.
- Never accept vague answers as sufficient. Push for specifics.
- Do not explore codebase or documentation — that is the research stage's responsibility.
- **Phase 1 is listen-first, challenge-later.** Initial friction creates resistance; alignment enables productive
  pushback.
