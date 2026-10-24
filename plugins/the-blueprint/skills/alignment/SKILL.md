---
name: alignment
description: >-
  Solution direction synthesis — design opinions from research findings,
  presented for human correction, with each settled decision handed to the
  adr skill. Invoke whenever task involves the A stage of the DRAFT pipeline
  or aligning on approach before implementation.
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
   - Not-yet-specified items — unknowns discovery could not yet phrase as precise questions. Check each against the
     research findings: graduate the ones research has sharpened into open questions for Phase 3; carry the rest into
     the alignment document unchanged.
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
- **Open questions** — anything not determinable from brief and research alone, including not-yet-specified items that
  graduated during synthesis.

Iterate until end state is clear and all questions are resolved. Not-yet-specified items that remain too dim to phrase
stay in the alignment document's **Not yet specified** section — resolving them is not a gate for completing alignment.

**Glossary maintenance.** Apply term resolutions the moment they crystallize during Phases 2–3 — a batched cleanup at
the end loses the rationale that was live when the term was resolved. Before completing Phase 3, sweep for stragglers:

- **If glossary exists:** apply term resolutions surfaced in this initiative — sharpen definitions, resolve ambiguities
  the brief flagged, add new entries that pass the glossary skill's trap test. Invoke the `glossary` skill for the
  update.
- **If glossary missing (first iteration):** invoke the `glossary` skill to create one from canonical terms used in
  brief, research, and alignment dialog. The glossary is a sibling artifact, not a section of `alignment.md`.

### Phase 4 — Record Decisions

When the dialog settles a choice between real alternatives, invoke the `adr` skill. It decides whether the choice earns
an ADR, and it owns the ADR, its format, its number, and the ADR index. Alignment adds no ADR rule of its own; the
initiative's number is the group the `adr` skill numbers the record in.

**Explore alternatives before committing (optional).** The first workable design anchors — when a genuine trade-off
surfaces and no option is clearly right, generate alternatives before asking the user to commit:

1. Write the problem framing — constraints from brief and research, adopted patterns, what any solution must satisfy —
   and present it to the user.
2. While the user reads, spawn 2–3 parallel subagents via the Agent tool, each designing the same decision under a
   different bias: follow dominant patterns with minimal change; design the clean target state ignoring migration cost;
   optimize for operational simplicity. Give each the problem framing; each returns its direction, what it changes, and
   where its trade-offs bite.
3. Compare the returns on named dimensions, recommend one — or a hybrid — with reasoning. The user picks; the chosen
   direction goes to the `adr` skill.

Fire this only when a real trade-off exists — routine alignments never need it.

**When to prompt.** When the dialog surfaces two or more viable approaches and the user expresses uncertainty, ask:
"Multiple paths exist — commit to one and record it?" Uncertainty alone earns no ADR; the `adr` skill's test decides.

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

## Not Yet Specified

(Only when unphrased unknowns remain. In-scope territory future iterations revisit — carried from the brief or surfaced
during alignment, written as loosely as the current view allows.)

- [Unknown — what's dim about it, what would sharpen it]

## Recorded ADRs

(Only when ADRs were written during this alignment. List paths — ADR content lives in the files, not here.)

- [4.1 Event-source the write model](/design-docs/adr/4.1-write-model.md)
```

## Rules

- **Surface every opinion.** Patterns you intend to follow, deviations you chose, assumptions you made — declare all of
  them. Silently adopting a pattern is the failure mode this skill exists to prevent.
- **Living artifact.** `alignment.md` may be updated throughout development. Immutable only when moved to `completed/`.
- **Always persists to disk.** No "skip file" option. Brief and research may live in conversation context; alignment
  always writes to the filesystem.
- **ADRs belong to the `adr` skill.** Alignment writes every record and every index line through it, and `alignment.md`
  only links the records.
- **Glossary maintenance is alignment's job.** Discovery flags ambiguities; alignment resolves them by invoking the
  `glossary` skill before Phase 4.
- **Complexity is a signal.** If the user struggles to answer your questions during alignment, the scope is too large or
  ill-defined. Push to split or simplify before proceeding — don't paper over the uncertainty.
- **Create only.** One alignment per initiative. Revise the living artifact directly; formal update mode deferred.
