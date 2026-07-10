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

## Glossary

The project's glossary (`docs/glossary.md` if present) is loaded before discovery starts. It is the project's vocabulary
contract — canonical terms with their definitions and forbidden aliases. Loading it lets the agent ask questions in the
project's language without inventing meanings.

Loading the glossary is **not** codebase or architecture exploration. Architecture-shaped knowledge (CLAUDE.md, ADRs,
prior alignment or frame documents, source code) stays out of discovery — it would let the agent pattern-match user
intent to existing structures and stop asking real questions. Glossary is vocabulary; it shapes language, not
assumptions.

**First iteration exception.** If no glossary exists, proceed glossary-blind. The glossary is created during alignment.

**Hypothesis, not law.** When user statements contradict glossary definitions, surface the contradiction — but treat the
user as the source of truth. Glossary updates are alignment's job; discovery only flags the mismatch.

## Dimensions

Cover these through questioning. Track coverage broadly — not a checklist to complete, but a map of territory to
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

## Facts vs Decisions

Every candidate question is one of two kinds:

- **Decisions** — values, priorities, intent, trade-offs. These belong to the user; ask them.
- **Facts** — how the codebase behaves, what the data looks like, what an external system does. These belong to
  research; asking the user spends their patience on answers the pipeline can establish itself. Discovery's information
  barrier means you don't look facts up either — record them in the brief under **Questions for research** and move on.

When a question mixes both, split it: ask for the decision, defer the fact.

## Phase 1: Intent Capture

Start by listening. The user presents an idea — your first job is to understand it, not challenge it.

**Process:**

1. **Present a map of questions** grouped by dimension. This serves two purposes:
   - The user sees the full territory and can redirect: "skip that, focus on this instead"
   - You have an anchor to return to when sequential questioning drifts from the original scope

2. **Work through the map one area at a time, one question per message.** A batch of questions bewilders and buys
   shallow answers to all of them — wait for each answer before the next question. Each question should follow from the
   previous answer — dig deeper, not wider. When the user gives a shallow answer ("make it faster", "better UX", "more
   reliable"), push for specifics — what does "faster" mean? Measured how? Compared to what? An answer is sufficient
   when it is specific enough to act on.

3. **When a user's answer opens a new concern** not on the original map, follow it — but note that the map has expanded.

**Question Framing (Phase 1):**

- Ask open questions: "Tell me more about X", "What does success look like for X?"
- Clarify, don't challenge: "So you're saying X — did I get that right?"
- Push for specifics without confrontation: "What does 'faster' mean? Measured how?"

**Terminology clarification (Phase 1):**

Phase 1 is listen-first for _intent_, not for _language_. Vocabulary gets clarified immediately so the rest of the
conversation rests on shared meaning:

- **Synonym for a canonical term** ("buyer" when glossary has `Customer`) — ask: "When you said buyer, did you mean
  `Customer`?" Use the canonical term going forward after confirmation.
- **Term not in glossary** — ask: "Is this a new concept? Want to work through it?" Note it for alignment; do not add to
  the glossary here.
- **Glossary term used against its definition** — surface: "Glossary says X, but you're describing Y — which one is true
  now?" Don't insist the glossary wins; the contradiction is a signal alignment may need to update the glossary.

These are **clarifications, not challenges**. They disambiguate language without pushing back on the user's intent —
intent challenges belong in Phase 2.

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

**Convergence does not require dissolving every unknown.** Apply the test to each remaining one: can the question be
stated precisely now — regardless of whether it can be answered now? A precisely-stated question is either asked (a
decision) or deferred to research (a fact). One too dim to phrase yet is **fog** — record it in the brief under **Not
yet specified** as loosely or as fully as the current view allows, and don't pre-slice it into question-sized pieces.
Fog is in-scope territory downstream stages revisit once nearby answers sharpen it; forcing a premature question out of
it produces a premature answer.

## Verification

When you believe you have sufficient understanding, present a structured summary — this is also the brief artifact
format:

- **Motivation:** one paragraph
- **Goals:** bullet list
- **Non-goals:** bullet list (things that could be goals but aren't)
- **Constraints:** bullet list
- **Key risks:** bullet list
- **Flagged term ambiguities:** bullet list — include only when any exist. Capture terms used contrary to the glossary,
  synonyms surfaced in Phase 1 that need a glossary decision, and new concepts the user introduced. Alignment is the
  consumer of this list.
- **Questions for research:** bullet list — include only when any exist. Fact-shaped questions discovery deferred
  instead of asking the user. Research is the consumer of this list.
- **Not yet specified:** bullet list — include only when any exist. In-scope unknowns too dim to phrase as precise
  questions yet (see Convergence). Alignment revisits these; anything research or alignment sharpens graduates into an
  open question, the rest carries forward.

Write all entries using canonical glossary terms. Vocabulary mismatch between brief and glossary produces drift
downstream.

This is a verification checkpoint. The user confirms, corrects, or continues questioning.

**On convergence, ask the user:**

- "Write the brief as `NN-short-description.brief.md`?" → write artifact, conversation ends
- "Proceed to `research` skill?" → output the full brief into the conversation, then invoke research. Do NOT write the
  brief to disk — research teammates must not read it (information barrier).
- Neither → conversation ends, no artifacts created

## Rules

- Challenge the user's solutions — never offer your own.
- Point at gaps and ask the user to fill them — never fill in blanks yourself.
- Ask the user for decisions, never for facts — facts are deferred to research via the brief's **Questions for
  research** list.
- Push for specifics when answers are vague — "faster", "better UX", "more reliable" are not actionable.
- Leave codebase, ADRs, prior design docs, and architecture documentation to research. **Glossary is the exception** —
  load it as the project's vocabulary contract.
- Glossary is a hypothesis, not law — flag contradictions for alignment, don't insist the glossary wins.
- **Listen first, challenge later.** Initial friction creates resistance; alignment enables productive pushback.
  Terminology clarification (synonyms, new terms, glossary contradictions) is the exception — surfaced as clarifying
  questions in Phase 1, not as challenges.
