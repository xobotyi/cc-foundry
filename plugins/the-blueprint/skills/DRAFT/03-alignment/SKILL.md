---
name: alignment
description: >-
  Solution direction synthesis — design opinions from research findings,
  presented for human correction, with decision capture. Invoke whenever
  task involves the A stage of the DRAFT pipeline, aligning on approach
  before implementation, or recording design decisions.
---

# Alignment

Declare every pattern you intend to follow and every design opinion you've formed — explicitly, with evidence and
reasoning — so the human can correct them before implementation begins. Research produces facts; alignment is where you
form and surface opinions for correction.

## Prerequisites

Locate the inputs:

1. **Brief** — check conversation context first; fall back to `design-docs/NN-name.brief.md`; if absent, ask whether to
   run discovery.
2. **Research** — check conversation context first; fall back to `design-docs/NN-name.research.md`; if absent, ask
   whether to run research.

## Process

### Phase 1 — Synthesize

1. Read the brief and research.
2. From research, extract:
   - Codebase patterns with prevalence (dominant convention vs isolated instance).
   - Integration points and boundaries relevant to the brief's goals.
3. From the brief, extract:
   - Motivation, desired end state, constraints, non-goals.
4. Form opinions: which patterns to follow, which to deviate from, and why.

### Phase 2 — Surface Patterns

Present patterns you intend to follow as a structured block:

- **Pattern:** [what]
- **Found in:** [where, prevalence — e.g., "12/15 files in `internal/auth/`"]
- **Intend to follow:** yes / no / partially
- **Reason:** [why]

After presenting, ask: "Any patterns to reject or modify before I propose the end state?"

Iterate until the user confirms the pattern set. Do not proceed to Phase 3 until patterns are reviewed.

<examples>
<example name="pattern-surfacing">
**Patterns I intend to follow:**

- **Pattern:** Service classes suffixed with `*Handler`
- **Found in:** 8/10 files in `internal/api/` — dominant convention
- **Intend to follow:** yes
- **Reason:** Consistent with codebase; deviating creates naming inconsistency.

- **Pattern:** Raw SQL queries in repository layer
- **Found in:** 3/12 files in `internal/data/` — minority pattern
- **Intend to follow:** no
- **Reason:** Dominant pattern (9/12 files) uses query builder. Raw SQL files predate its adoption.

- **Pattern:** Error wrapping with `fmt.Errorf("%w", err)`
- **Found in:** 14/14 files — universal
- **Intend to follow:** yes
- **Reason:** Consistent, well-established.

Any patterns to reject or modify before I propose the end state?

</example>

<example name="user-correction">
**User:** "The `*Handler` naming is legacy — new code uses `*Controller`. Check `internal/api/v2/`."

**Agent:** Updated. Verified `*Controller` convention in `internal/api/v2/`. Revised pattern set: [updated list].

</example>
</examples>

### Phase 3 — Present End State

With corrected patterns, present:

- **Current state** — how the affected area works today, derived from research.
- **Desired end state** — what it should look like after the change, derived from brief + corrected patterns.
- **Open questions** — anything not determinable from brief and research alone.

Iterate until end state is clear and all questions are resolved.

### Phase 4 — Conditional ADR Sections

When the dialog surfaces two or more viable approaches and the user expresses uncertainty, prompt: "Multiple paths exist
— add an ADR section to commit to one?"

Include ADR sections when:

- Significant architectural choice must be made
- Cross-cutting concerns involved (security, observability, compatibility)
- Rationale invisible to future contributors once code is merged
- Same trade-off risks re-litigation without a record

ADR sections use the structure in the document format below. They are durable — must remain self-contained and
meaningful when the initiative moves to `completed/`.

### Phase 5 — Write Artifact

1. Compose `alignment.md` using the document format below.
2. Number prefix: match existing artifacts (`NN-name.brief.md` / `NN-name.research.md`), or next available number in
   `design-docs/`.
3. Save to `design-docs/NN-name.alignment.md`.
4. Present to user for final review. Revise if requested.

### Transition

On user approval:

> Alignment is complete. Proceed to `frame`?

## Alignment Document Format

Target ~200 lines. Exceeding 300 indicates content belongs in the frame stage.

```markdown
# Alignment: {title from brief}

- **Date:** {date}
- **Brief:** {path or "in conversation context"}
- **Research:** {path or "in conversation context"}

## Patterns Adopted

- **[Pattern name]** — [description]. Found in [location, prevalence]. [Reason.]

## Current State

[How the affected area works today.]

## Desired End State

[Target state, derived from brief + corrected patterns.]

## Resolved Questions

- [Question] → [Resolution]

## Decision: [title]

(Repeatable. Only when ADR sections exist.)

**Status:** accepted
**Context:** [forces at play]
**Options considered:**
1. [Option] — [pros, cons]
2. [Option] — [pros, cons]
**Decision:** [which and why]
**Consequences:** [what follows]
```

## Rules

- **Surface every opinion.** Patterns you intend to follow, deviations you chose, assumptions you made — declare all of
  them. Silently adopting a pattern is the failure mode this skill exists to prevent.
- **Living artifact.** `alignment.md` may be updated throughout development. Immutable only when moved to `completed/`.
- **Always persists to disk.** No "skip file" option. Brief and research may live in conversation context; alignment
  always writes to the filesystem.
- **ADR sections are durable.** Conditional, but once written, must remain self-contained for future proposals that need
  to understand why the architecture looks the way it does.
- **Complexity is a signal.** If the user struggles to answer your questions during alignment, the scope is too large or
  ill-defined. Push to split or simplify before proceeding — don't paper over the uncertainty.
- **Create only.** One alignment per initiative. Revise the living artifact directly; formal update mode deferred.
