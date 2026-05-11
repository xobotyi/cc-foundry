---
name: tasks
description: >-
  Decompose frame phases into individually trackable work items with sizing,
  dependencies, and acceptance criteria. Invoke whenever task involves the T
  stage of the DRAFT pipeline, breaking vertical slice phases into assignable
  tasks, or creating a task breakdown from a frame document.
---

# Tasks

Decompose frame phases into work items an implementer can pick up without asking questions. Each frame phase becomes a
group of tasks; each task is sized, dependency-mapped, and described as a plan for future work. The task breakdown feeds
`task-creation` for tracker mechanics — this skill handles the decomposition intelligence, not tracker operations.

## Prerequisites

Locate the inputs:

1. **Frame** — check conversation context first; fall back to `design-docs/NN-name.frame.md`; if absent, ask whether to
   run frame.
2. **Alignment** — optional reference for pattern decisions and ADRs. Check context or disk.

## Process

### Phase 1 — Draft Task Table

1. Read the frame document's phases, components, acceptance criteria, and phase sequence.
2. For each phase, identify the individual work items within it. A phase may produce 1–7 tasks. If a phase needs more
   than 7, it's likely too coarse — reconsider splitting the phase in the frame.
3. For each task, write:
   - Title (imperative verb + object: "Add compound index on tenant_id")
   - Estimate (hours — enough to validate sizing, not a commitment)
   - Dependencies (other tasks that must complete first)
   - Artifact (expected output: file path, passing test, endpoint, or other verifiable result)
   - Mode: **AFK** (agent can execute autonomously) or **HITL** (requires human at keyboard — alignment, QA, taste)
   - Parent phase
4. Present as a grouped table. Validate the structure before investing in detailed descriptions.

Ask the user for approval of the draft table before proceeding.

### Phase 2 — Validate Sizing

Verify every task against the sizing guidance:

- **Over 8 hours:** Break down further. No exceptions. If it can't be split, the work isn't understood well enough.
- **6–8 hours:** Acceptable but check for a natural seam.
- **2–4 hours:** Sweet spot. Clean boundaries, estimable with confidence.
- **Under 1 hour:** Combine with related tasks unless isolation matters for risk or dependency reasons.
- **Can't estimate:** Go back to the frame or investigate the codebase.

Verify coverage: every frame phase must have at least one corresponding task. A phase in the frame with no tasks is a
gap.

### Phase 3 — Write Descriptions

For each approved task, write a description. Two rules agents violate constantly:

**Descriptions are plans, not reports.** Write as if the work has not started — because from the implementer's
perspective, it hasn't. "Add a compound index" — not "Added a compound index."

**Descriptions contain no implementation.** Describe WHAT should change and what "done" looks like. No code, no function
signatures, no class names. Pseudocode acceptable for complex logic; configuration samples acceptable when config is the
deliverable.

Structure each description:

- **Context** — why this task exists. One sentence connecting it to the frame phase. Link to the frame document.
- **What to do** — specific work items. Concrete enough to act on, abstract enough to leave implementation judgment.
- **Acceptance criteria** — observable conditions proving the task is done. Prefer verifiable statements with measurable
  thresholds over vague "works correctly."
- **Artifact** — the expected output: specific file, passing test suite, working endpoint. Every task must produce a
  verifiable artifact that can be checked and rolled back if wrong.
- **References** — links to alignment, frame, or relevant code. Never reference other tasks — inter-task dependencies
  use native tracker links created by `task-creation`.

Ask the user for approval of descriptions before proceeding.

### Phase 4 — Map Dependencies

1. Make ordering constraints explicit: which tasks must complete first, which can run in parallel.
2. Apply dependency rules:
   - No circular dependencies.
   - Minimize cross-phase dependencies — tasks within a phase should primarily depend on each other, not on tasks in
     other phases.
   - Infrastructure before business logic.
   - Interfaces before implementations.
3. Verify every dependency is real, not accidental. A task marked dependent but startable independently creates
   artificial serialization that blocks parallel execution.
4. Visualize when helpful:

```
Phase 1: Tracer Bullet
  [#1 Schema migration] (no deps, AFK)
      ├──→ [#2 API handler] (depends on #1, AFK)
      └──→ [#3 UI component] (depends on #2, AFK)

Phase 2: Error Handling
  [#4 Validation layer] (depends on #1, AFK)
  [#5 Error responses] (depends on #4, HITL — needs QA review)
```

### Phase 5 — Present and Transition

1. Present the complete task breakdown to the user.
2. If the user approves and task tracking tools are available:
   > Task breakdown is ready. Invoke `task-creation` to create these in your issue tracker?
3. If no tracking tools are available:
   > Task breakdown is ready, but no issue tracker integration is available. Tasks can be created manually from the
   > descriptions above.

## Tasks Document Format

Optional file artifact — write when the user requests persistence or when cross-session continuity matters. The document
survives context rot: fresh sessions can load it to resume work without losing progress.

Use `design-docs/NN-name.tasks.md`.

```markdown
# Tasks: {title}

- **Date:** {date}
- **Frame:** {path or "in conversation context"}

## Phase 1: {phase name from frame}

| # | Task | Est. | Deps | Artifact | Mode |
| --- | --- | --- | --- | --- | --- |
| 1 | [Title] | ~Xh | — | [expected output] | AFK |
| 2 | [Title] | ~Xh | #1 | [expected output] | HITL |

### Task 1: [Title]

**Context:** [One sentence, link to frame phase]

**What to do:**

- [Specific work items]

**Acceptance criteria:**

- [ ] [Verifiable condition]

**Artifact:** [Expected output — file, test, endpoint]

**References:**

- [Links to frame, alignment, relevant code — never other tasks]

## Phase 2: {phase name}

...

## Dependency Graph

[Visualization of cross-phase and within-phase dependencies]
```

## Rules

- **Decompose within phases.** Tasks are grouped under their frame phase. A task that spans multiple phases indicates
  the frame's phase boundaries need adjustment — push back to Frame, don't paper over it.
- **8-hour ceiling.** No leaf task exceeds 8 hours. 2–4 hours is the sweet spot.
- **100% coverage.** Every frame phase must produce at least one task. Missing a phase means missing work.
- **Every task produces an artifact.** A task without a verifiable output (file, test, endpoint) cannot be confirmed
  done. Name the artifact upfront.
- **Classify AFK vs HITL.** Tasks that can run autonomously (implementation, refactoring) are AFK. Tasks needing human
  judgment (QA, alignment, taste decisions) are HITL. The classification informs execution strategy.
- **Dependency rules.** No circular deps. Minimize cross-phase deps. Infrastructure before business logic. Interfaces
  before implementations. Artificial serialization blocks parallelism.
- **Plans, not reports.** Every description uses imperative mood and reads as future work. Past tense is a violation.
- **No implementation in descriptions.** Describe what changes and what "done" looks like. The implementer decides how.
- **Optional file persistence.** The tracked tasks in the issue tracker become source of truth after creation. The
  tasks.md document is a persistent external record for cross-session continuity — it survives context rot when agents
  start fresh sessions.

## Related Skills

- **frame** — Produces the input: vertical slice phases with acceptance criteria
- **task-creation** — Standalone skill that handles tracker operations: field discovery, drafting, creating, linking
- **alignment** — Reference for pattern decisions and ADRs cited in task descriptions
