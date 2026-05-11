---
name: frame
description: >-
  Vertical-slice implementation planning — phases that cross all layers
  end-to-end with per-phase testing. Invoke whenever task involves the F
  stage of the DRAFT pipeline, planning implementation phases, or structuring
  work before coding begins.
---

# Frame

Structure implementation as vertical slices — each phase crosses all affected layers end-to-end, producing a testable
integrated path. Phase 1 is the tracer bullet: the thinnest possible slice wired through every layer. Models default to
horizontal plans (all DB, then all API, then all UI); this skill enforces vertical structure that cannot be prompted
away.

<examples>
<example name="horizontal-vs-vertical">
Feature: add user notifications (email + in-app). Affects: DB schema, notification service, API endpoints, UI.

**Horizontal (wrong — layer by layer):**

- Phase 1: All DB — notification tables, preferences, delivery log
- Phase 2: All service — email sender, in-app dispatcher, preference resolver
- Phase 3: All API — notification endpoints, preference endpoints
- Phase 4: All UI — notification center, preference panel, toast

By Phase 4, the agent has generated hundreds of lines across every layer. Integration reveals the notification table
schema assumed a delivery model the service layer doesn't support. Fix cascades through all layers — most work is
discarded.

**Vertical (correct — slice by slice):**

- Phase 1 (tracer bullet): Email notification, one path — table, service, endpoint, toast. Validates the full stack.
- Phase 2: In-app notifications — extends schema, adds dispatcher, wires notification center.
- Phase 3: User preferences — preference table, resolver, settings endpoint, preference panel.

Schema error surfaces in Phase 1, not Phase 4. Each phase is testable and deployable independently.

</example>
</examples>

## Prerequisites

Locate the inputs:

1. **Alignment** — check conversation context first; fall back to `design-docs/NN-name.alignment.md`; if absent, ask
   whether to run alignment.
2. **Research** — optional reference for codebase details. Check context or `design-docs/NN-name.research.md`.

## Process

### Phase 1 — Define the Tracer Bullet

1. Read the alignment document's desired end state and adopted patterns.
2. Identify the thinnest end-to-end slice that exercises the core path — from data layer through service logic to the
   outermost interface (API, UI, CLI, or whatever the system exposes).
3. This is Phase 1 of the frame. It must cross all relevant layers. A phase touching only one layer is a horizontal
   slice — restructure it.

### Phase 2 — Define Subsequent Phases

4. Each subsequent phase adds depth as a vertical pass — new behavior, edge cases, integration points — always crossing
   layers, never completing one layer in isolation.
5. Target 3–5 phases total. More than 5 suggests the scope is too large for a single frame — consider splitting.
6. Cross-cutting concerns (auth, logging, error handling) are established within the vertical phases that need them —
   the tracer bullet wires the minimal cross-cutting path, subsequent phases extend it.

### Phase 3 — Detail Each Phase

For each phase, define:

- **Components touched** — which modules, packages, or layers change.
- **Testing strategy** — what tests verify this phase works. Prefer TDD: write failing test, implement, verify. For
  external contracts, include learning tests that verify assumptions about the external system before building on them.
- **Verification gate** — observable condition proving this phase is correct before proceeding. "Tests pass" is a
  minimum; add integration-level verification for phases wiring across boundaries.
- **Acceptance criteria** — what "done" looks like, stated as verifiable conditions.

### Phase 4 — Sequence and Dependencies

7. Map phase ordering: which phases must complete first, which can run in parallel, where handoff points exist. Design
   for maximum parallelism — phases that don't share dependencies should be executable concurrently by independent
   agents, each in a clean context window.
8. Every phase must appear in the sequence. A phase listed but not sequenced creates orphan work.

### Phase 5 — Write Artifact

1. Compose `frame.md` using the document format below.
2. Number prefix: match existing artifacts (`NN-name.alignment.md`), or next available in `design-docs/`.
3. Save to `design-docs/NN-name.frame.md`.
4. Present to user for review. Revise if requested.

### Transition

On user approval:

> Frame is complete. Proceed to `tasks` to decompose phases into trackable work items?

## Frame Document Format

Concise outline, not implementation detail. The frame is to the implementation what a C header file is to the source —
signatures, types, and boundaries, not logic.

```markdown
# Frame: {title}

- **Date:** {date}
- **Alignment:** {path or "in conversation context"}

## Phase 1: Tracer Bullet — {short description}

**Components:**

- [Component] — [what changes in this phase]

**Testing strategy:**

- [What to test and how]

**Verification gate:**

- [Observable condition proving this phase works]

**Acceptance criteria:**

- [ ] [Verifiable condition]

## Phase 2: {short description}

**Components:**

- ...

**Testing strategy:**

- ...

**Verification gate:**

- ...

**Acceptance criteria:**

- [ ] ...

## Learning Tests

(Only when unfamiliar external contracts need verification before relying on them.)

- [Contract/API] — [what assumption to verify]

## Phase Sequence

Phase 1 (tracer bullet, no deps)
    ↓
Phase 2 (depends on Phase 1)
Phase 3 (parallel with Phase 2, depends on Phase 1)

## Scope Boundaries

**In scope:** [what this effort covers]
**Out of scope:** [what it does not]
```

## Rules

- **Vertical, not horizontal.** Every phase must cross layers. A phase that completes one layer (all DB, all API) is a
  horizontal slice — restructure it. This is structural enforcement; models cannot be prompted into vertical planning.
- **Living artifact.** `frame.md` may be updated as implementation reveals the plan was wrong. Immutable only when moved
  to `completed/`.
- **Always persists to disk.** Tasks link back to frame.md; it must exist on the filesystem.
- **Outline, not implementation.** The frame shows what changes and in what order. No function bodies, no production
  code. Signatures and type definitions are acceptable when they clarify boundaries.
- **Create only.** One frame per initiative. Revise the living artifact directly; formal update mode deferred.
