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
3. **Glossary** — load `docs/glossary.md` if present. If absent (first iteration), schedule creation at Phase 3 end (see
   Glossary maintenance below).

## Process

### Phase 1 — Synthesize

1. Read the brief, research, and glossary (if present).
2. From research, extract:
   - Codebase patterns with prevalence (dominant convention vs isolated instance).
   - Integration points and boundaries relevant to the brief's goals.
3. From the brief, extract:
   - Motivation, desired end state, constraints, non-goals.
   - Flagged term ambiguities — unresolved terms discovery surfaced for alignment to resolve.
4. From the glossary, extract:
   - Canonical vocabulary to use throughout alignment.
   - Definitions that constrain pattern choices (e.g., "Customer owns CustomerId" forbids cross-context FKs).
5. Form opinions: which patterns to follow, which to deviate from, and why.

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

**Glossary maintenance.** Before completing Phase 3, reconcile vocabulary:

- **If glossary exists:** apply term resolutions surfaced in this initiative — sharpen definitions, resolve ambiguities
  the brief flagged, add new entries that pass the glossary skill's trap test. Invoke the `glossary` skill for the
  update.
- **If glossary missing (first iteration):** invoke the `glossary` skill to create one from canonical terms used in
  brief, research, and alignment dialog. The glossary is a sibling artifact, not a section of `alignment.md`.

### Phase 4 — Conditional ADRs

ADRs are standalone files at `design-docs/adr/{N.M}-slug.md` — never embedded in `alignment.md`. The number tracks the
initiative that birthed the ADR; the ADR itself is system-wide and outlives its parent initiative.

**Numbering.** Initiative `04-orders-refactor` writing its first ADR creates `design-docs/adr/4.1-{slug}.md`. Second ADR
from the same initiative is `4.2-{slug}.md`. Different initiatives never collide because the prefix matches the
initiative number.

**Trigger gate (all three must be true):**

1. **Hard to reverse** — changing the decision later carries meaningful cost.
2. **Surprising without context** — a future reader will look at the code and ask "why on earth did they do it this
   way?"
3. **Result of a real trade-off** — genuine alternatives existed, and one was picked for specific reasons.

If any of the three is missing, skip the ADR. Easy-to-reverse decisions get reversed; non-surprising ones don't need a
record; "we did the obvious thing" isn't worth preserving.

**Qualifying types (non-exhaustive — the gate is the test, this list is the catalog):**

- **Architectural shape.** "Write model is event-sourced, read model projects into Postgres."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, auth provider, deployment target — not every
  library, just the ones that would take a quarter to replace.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; others reference by ID only."
- **Deliberate deviations from the obvious path.** "We use manual SQL instead of an ORM because X."
- **Constraints not visible in code.** "Response times must stay under 200ms because of partner API contract."
- **Rejected alternatives when rejection is non-obvious.** Considered GraphQL, picked REST for subtle reasons — record
  it, or someone re-proposes GraphQL in six months.
- **Compliance, legal, regulatory, or security boundary decisions** — even when not architecturally surprising.

**When to prompt.** When the dialog surfaces two or more viable approaches and the user expresses uncertainty, ask:
"Multiple paths exist — write an ADR to commit to one?" Run the trigger gate before writing — uncertainty isn't enough
on its own.

**ADR file format:**

```markdown
# {Short title of the decision}

- **Status:** accepted
- **Date:** {YYYY-MM-DD}
- **Initiative:** {NN-slug}

{1-3 paragraphs: context, what was decided, why.}
```

A one-paragraph ADR is fine. Status values: `accepted | deprecated | superseded by {N.M}`. Optional sections
(`Considered Options`, `Consequences`) only when they add genuine value — most ADRs don't need them.

**Write the file, then update the index.** After writing `design-docs/adr/{N.M}-slug.md`, update `design-docs/ADR.md`:

```markdown
# ADR Index

## Accepted

- [4.1 Event-sourced write model](./adr/4.1-event-sourced-write-model.md) — initiative `04-orders-refactor`, 2026-05-15
- ...

## Deprecated

- [2.1 ...] — superseded by 4.1

## Superseded

- ...
```

If `design-docs/ADR.md` does not exist, create it on the first ADR write. Create `design-docs/adr/` lazily on the same
write.

**Cross-reference from alignment.md.** Add a line under `## Recorded ADRs` pointing at the ADR file. Do not copy ADR
content into `alignment.md` — the ADR file is the source of truth.

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

Target ~150 lines. Exceeding 250 indicates content belongs in the frame stage or in ADR files.

```markdown
# Alignment: {title from brief}

- **Date:** {date}
- **Brief:** {path or "in conversation context"}
- **Research:** {path or "in conversation context"}
- **Glossary:** {path, or "(created during this alignment)"}

## Patterns Adopted

- **[Pattern name]** — [description]. Found in [location, prevalence]. [Reason.]

## Current State

[How the affected area works today.]

## Desired End State

[Target state, derived from brief + corrected patterns.]

## Resolved Questions

- [Question] → [Resolution]

## Recorded ADRs

(Only when ADRs were written during this alignment. List paths — ADR content lives in the files, not here.)

- [ADR 4.1: Event-sourced write model](./adr/4.1-event-sourced-write-model.md)
```

## Rules

- **Surface every opinion.** Patterns you intend to follow, deviations you chose, assumptions you made — declare all of
  them. Silently adopting a pattern is the failure mode this skill exists to prevent.
- **Living artifact.** `alignment.md` may be updated throughout development. Immutable only when moved to `completed/`.
- **Always persists to disk.** No "skip file" option. Brief and research may live in conversation context; alignment
  always writes to the filesystem.
- **ADRs are standalone files, not alignment sections.** Each ADR lives at `design-docs/adr/{N.M}-slug.md`. The ADR file
  is the source of truth; `alignment.md` only references it.
- **ADRs outlive their initiative.** When the initiative moves to `completed/`, ADRs stay in `design-docs/adr/`.
  Lifecycle is decoupled.
- **Update the ADR index on every write.** `design-docs/ADR.md` is the single discoverability surface for ADRs across
  all initiatives — a stale index is a broken contract.
- **Glossary maintenance is alignment's job.** Discovery flags ambiguities; alignment resolves them by invoking the
  `glossary` skill before Phase 4.
- **Complexity is a signal.** If the user struggles to answer your questions during alignment, the scope is too large or
  ill-defined. Push to split or simplify before proceeding — don't paper over the uncertainty.
- **Create only.** One alignment per initiative. Revise the living artifact directly; formal update mode deferred.
