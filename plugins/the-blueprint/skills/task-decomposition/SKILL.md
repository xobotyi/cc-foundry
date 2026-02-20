---
name: task-decomposition
description: >-
  Task decomposition — convert technical designs into actionable, tracked
  task hierarchies. Invoke when decomposing features into subtasks, preparing
  work items, or creating decomposition documents.
---

# Task Decomposition

Convert a technical design into a set of actionable tasks and a persistent decomposition
document. The input is a technical design with affected components, sequencing, and scope
boundaries. The output is a task hierarchy that any developer or agent can pick up and
execute without further clarification.

## Why Task Decomposition Matters

A technical design describes WHAT changes at the component level. But components aren't
work items. Someone must decide how to slice the work into pieces that can be assigned,
estimated, tracked, and verified independently. That's decomposition.

Without it, implementation begins with implicit assumptions about order, scope, and
boundaries. Two people working on "the backend changes" step on each other. An agent
tasked with "implement the cache layer" produces a monolith because nobody defined where
one task ends and the next begins.

The decomposition document also solves a persistence problem. Design documents capture
decisions. Technical designs map those decisions to components. But neither tells a new
team member or a future agent session what the actual work units are, in what order they
should execute, and what "done" looks like for each. The decomposition document is that
bridge — it turns strategic intent into executable work.

## When to Decompose

Decompose when any of these apply:

- The technical design touches more than one component
- Implementation will take more than a day
- Multiple people or agents will work on different parts
- The work has non-obvious ordering constraints
- You need to track progress at a granular level

Skip decomposition when:
- The technical design scopes a single, self-contained change
- The work is small enough that a single task with acceptance criteria covers it
- Decomposition overhead exceeds the work itself

## Creating a Task Decomposition

### Step 1: Read the Technical Design

1. Read the technical design's affected components, sequencing, and scope boundaries:
   - Which components change and what the nature of each change is
   - What dependencies exist between component changes
   - What tools or technologies were selected
   - What risks and assumptions were documented
2. Confirm understanding with the user before proceeding — restate the scope in your
   own terms.

### Step 2: Identify Work Boundaries

Choose the slicing approach that produces the most natural boundaries. There is no single
correct decomposition — the right one depends on the project:

**By component** — One task per affected component. Works well when components are
independent and changes don't span multiple modules.

**By functionality** — Group related changes across components into feature-oriented tasks.
Works when a single user-facing capability requires coordinated changes in several places.

**By layer** — Separate tasks for data model, API, business logic, and presentation.
Works when changes at each layer are independent and can be verified separately.

**By risk** — Isolate uncertain or experimental work into its own task. Works when part
of the implementation has unknowns that might require a different approach.

Most real decompositions combine approaches. A database migration might be one task
(by component), while the API changes that depend on it are grouped by functionality.

### Step 3: Draft the Task List

1. For each task, write:
   - A clear title (imperative verb + object: "Add compound index on tenant_id and created_at")
   - A rough estimate (hours or days — enough to validate sizing, not a commitment)
   - Dependencies on other tasks in the list
2. Present as a table. No detailed descriptions yet — validate the structure before
   investing in details.

```
| # | Task | Estimate | Dependencies |
|---|------|----------|--------------|
| 1 | Create database migration for new schema | ~2h | — |
| 2 | Update repository layer for new query patterns | ~4h | #1 |
| 3 | Add cache invalidation to write path | ~3h | #2 |
| 4 | Update API response serialization | ~2h | #2 |
| 5 | Add integration tests for migration path | ~3h | #1, #2 |
```

3. Ask the user for approval before proceeding to detailed descriptions. The draft is
   cheap to change; detailed descriptions are not.
4. If the user requests changes, revise and present again.

### Step 4: Validate Sizing

1. Verify every leaf task takes no more than 8 hours. Leaf tasks are work units that
   reach an implementer's hands — not parent tasks grouping subtasks beneath them.

Eight hours is the ceiling, not the target. Well-decomposed work produces tasks well
under that limit. If most tasks cluster near 8 hours, the decomposition is likely too
coarse.

- **Over 8 hours:** Break down further. No exceptions. If you can't split it, you don't
  understand the work well enough — go back to the technical design or investigate the
  codebase.
- **Near 8 hours (6-8h):** Acceptable but worth a second look. Is there a natural seam
  hiding inside? Often there is.
- **2-4 hours:** The sweet spot. Clean boundaries, estimable with confidence, completable
  in a focused session.
- **Under an hour:** Tracking overhead may exceed the work. Combine with related tasks
  unless isolation matters for risk or dependency reasons.
- **Can't estimate at all:** You don't understand the work well enough. Go back to the
  technical design or investigate the codebase before decomposing further.

2. Verify coverage using the 100% rule: the sum of all tasks must account for the
   complete scope defined in the technical design. If a component appears in the technical
   design but has no corresponding task, something is missing.

### Step 5: Write Detailed Descriptions

1. For each approved task, write a description that an implementer can act on without
   asking questions.

Two rules that agents violate constantly:

**Descriptions are plans, not reports.** Write every description as if the work has not
started yet — because from the implementer's perspective, it hasn't. Even if you've
already explored the codebase, analyzed the problem, or prototyped a solution during
decomposition, the task description reads as a plan for work that remains to be done.
"Add a compound index on (tenant_id, created_at)" — not "Added a compound index" or
"The compound index was created." The person or agent picking up this task will read it
fresh. It must tell them what to do, not what was done.

**Descriptions contain no implementation.** Describe WHAT should change and what "done"
looks like. Never prescribe HOW — no code, no function signatures, no class names to
create. The implementer decides the approach. Two exceptions where specificity helps:
pseudocode is acceptable when describing logical changes that are easier to communicate
as structured logic than as prose; configuration samples are acceptable when the
configuration itself is the deliverable (e.g., a YAML snippet for a CI pipeline change).

2. Structure each description with:

   **Context** — Why this task exists. One or two sentences connecting it to the larger
   effort. Don't restate the entire design document — link to it.

   **What to do** — Specific work items. Concrete enough to act on, abstract enough to
   leave implementation judgment to the implementer.

   **Acceptance criteria** — Observable conditions that prove the task is done. Prefer
   verifiable statements: "API returns cached response within 50ms for repeated queries"
   over "caching works correctly."

   **References** — Links to the design document, technical design, relevant code, or
   similar implementations in the codebase.

```markdown
## Context
Part of the cache layer redesign (see design-docs/02-cache-layer-redesign.md).
The repository layer currently issues a full table scan for tenant-scoped queries
because the new schema lacks a compound index.

## What to do
- Add a database migration creating a compound index on (tenant_id, created_at)
- Include a rollback migration that drops the index
- Update the migration changelog

## Acceptance criteria
- [ ] Migration runs successfully against a copy of production data
- [ ] Rollback migration cleanly removes the index
- [ ] Tenant-scoped queries use the new index (verified via EXPLAIN)

## References
- Technical design: design-docs/02-cache-layer-redesign.technical-design.md
- Current schema: db/migrations/latest
```

3. Ask the user for approval before creating tasks in the issue tracker.
4. If the user requests changes, revise and present again.

### Step 6: Map Dependencies and Parallelization

1. Make ordering constraints explicit:
   - Which tasks must complete before others can start
   - Which tasks can proceed in parallel
   - Where handoff points exist between different people or agents
2. Visualize when helpful:

```
[#1 DB migration] (no deps)
    ├──→ [#2 Repository layer] (depends on #1)
    │       ├──→ [#3 Cache invalidation] (depends on #2)
    │       └──→ [#4 API serialization] (depends on #2)
    └──→ [#5 Integration tests] (depends on #1, #2)
```

3. Verify every dependency is real, not accidental. If a task is marked as dependent but
   could actually start independently, the chain is artificially deep.

### Step 7: Create the Decomposition Document

1. Compose the decomposition document using the Document Template below, incorporating
   the approved task list and detailed descriptions from Steps 3-6.
2. Save to `design-docs/` following the file conventions.
3. Present to the user for review.
4. If the user requests changes, revise and present again. Do not proceed to After
   Completion until approved.

## Decomposition Approaches

Different situations call for different slicing strategies. These can be combined.

**Horizontal decomposition** splits work by technical layer or specialty: one person
handles the database, another the API, another the frontend. Each task requires
coordination to deliver complete functionality. Works for teams with clear specialization.

**Vertical decomposition** splits work by user-facing capability: each task delivers a
thin slice of functionality across all layers. Every completed task produces something
demonstrable. Works when incremental delivery matters or when a single person or agent
handles the full stack.

**Stage-based decomposition** follows the implementation lifecycle: data model first,
then business logic, then API surface, then tests. Natural for greenfield work where
each stage builds on the previous one.

**Risk-first decomposition** isolates the most uncertain work into early tasks. If the
risky piece fails or needs a different approach, less work is wasted. Works for efforts
with significant unknowns.

The choice depends on team structure, delivery constraints, and risk profile — not on
the technology. A solo developer might decompose vertically while a team of specialists
decomposes horizontally for the same technical design.

## Document Template

```markdown
# [Feature/Change Name]: Task Decomposition

**Source:** [link to or name of the technical design]
**Approach:** [horizontal / vertical / stage-based / hybrid — brief justification]

## Summary

[1-2 sentences: what this effort delivers and roughly how it's structured]

## Tasks

| # | Task | Estimate | Dependencies | Status |
|---|------|----------|--------------|--------|
| 1 | [Title] | ~Xh | — | Pending |
| 2 | [Title] | ~Xh | #1 | Pending |
| 3 | [Title] | ~Xh | #1, #2 | Pending |

Total estimate: ~Xh (~Y days)

### Task 1: [Title]

**Context:** [Why this task exists]

**What to do:**
- [Specific work items]

**Acceptance criteria:**
- [ ] [Verifiable condition]

**References:**
- [Links to design docs, code, similar implementations]

### Task 2: [Title]
...

## Execution Order

[Describe recommended sequence, parallelization opportunities, and critical path]

## Notes

[Context for implementers: decisions made during decomposition, gotchas, reference
implementations, anything that would otherwise be lost]
```

## File Conventions

- **Location:** `design-docs/` within project directory, alongside the technical design
  it decomposes
- **Naming:** `NN-short-description.decomposition.md` — same number prefix as the parent
  design document (e.g., `02-cache-layer-redesign.decomposition.md`)
- **Completed:** Moves with the design document and technical design to
  `design-docs/completed/` when implemented

## Quality Checklist

Before considering a decomposition complete:

- [ ] Technical design was read and understood
- [ ] User approved the draft task list (Step 3) before detailed descriptions
- [ ] User approved detailed descriptions (Step 5) before issue tracker creation
- [ ] Every component from the technical design has at least one corresponding task
- [ ] No leaf task exceeds 8 hours
- [ ] Each task has context, work items, and acceptance criteria
- [ ] Dependencies are explicit — no hidden ordering assumptions
- [ ] Parallel execution opportunities are identified
- [ ] Decomposition document created and persisted
- [ ] User approved the decomposition document (Step 7) before task creation
- [ ] An implementer can start any unblocked task without asking questions

## Anti-Patterns

**Title-only tasks:**
"Fix the bug" or "Implement feature" without description. After a day or two, nobody —
including the author — remembers the full context. Every task needs context, work items,
and acceptance criteria.

**Monolithic tasks:**
If a leaf task exceeds 8 hours, it hides internal complexity. Seeing the same task "in
progress" for days is a signal that decomposition was skipped. Break it down until each
piece is estimable with reasonable confidence.

**Micro-tasks:**
Tasks so small that tracking overhead exceeds the work. "Rename variable X" is not a
task — it's a line in someone else's task. Combine related small work into meaningful
units.

**Skipping the draft:**
Jumping straight to detailed descriptions wastes effort when the structure is wrong.
Validate the shape of the decomposition before investing in the details.

**Hidden dependencies:**
Tasks that silently depend on each other. A developer starts a task, discovers it's
blocked, and loses time context-switching. Make all ordering constraints visible and
explicit.

**Decomposing before understanding:**
Rushing to create tasks before fully understanding the technical design leads to rework.
If the technical design has unresolved risks or ambiguous scope, address those first.

**Implementation details in tasks:**
Task descriptions that prescribe code ("create a function called X that takes Y") cross
into implementation. Describe what should change and what "done" looks like. The
implementer decides how. Pseudocode for logical changes and configuration samples for
config-as-deliverable are acceptable — production code is not.

**Past-tense descriptions:**
Descriptions written as if the work is already done ("Added the index", "The migration
was created"). This happens when the agent performed exploratory work during decomposition
and described what it did instead of what the implementer should do. Every description
must read as a plan for future work.

**Missing the 100% rule:**
Tasks that don't cover the full scope of the technical design. If a component is in the
technical design but has no task, either the decomposition is incomplete or the technical
design has unnecessary scope.

## After Completion

When the decomposition is complete and approved:

1. Check whether task tracking tools are available (MCP servers, APIs, or other
   integrations that can create tasks).
2. **If tools are available:**
   1. Prompt the user:
      > The decomposition is complete. I can create these tasks in your issue tracker.
      > Would you like to proceed?
   2. On confirmation, invoke the `task-creation` skill.
   3. After tasks are created, update the decomposition document: add task IDs and links
      to each entry in the task table so the document becomes the single reference
      connecting the plan to the tracked work.
3. **If no tools are available:** Tell the user explicitly:
   > The decomposition is complete, but I don't have access to a task tracking tool to
   > create tasks autonomously. You'll need to create these tasks manually using the
   > descriptions above.

Do not silently skip task creation or pretend the pipeline is complete without it.

## Related Skills

- **technical-design** — Produces the input for this skill: affected components, sequencing,
  scope boundaries
- **design-documents** — The origin of the pipeline: problem analysis and solution decision
- **task-creation** — Consumes this skill's output: creates individual tasks in the issue
  tracker
