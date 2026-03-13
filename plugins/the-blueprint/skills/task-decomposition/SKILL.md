---
name: task-decomposition
description: >-
  Convert technical designs into actionable, tracked task hierarchies with
  sizing, dependencies, and acceptance criteria. Invoke whenever task involves
  any interaction with work decomposition — breaking down features into
  subtasks, slicing work items, creating task lists, or writing decomposition
  documents.
---

# Task Decomposition

Convert a technical design into a set of actionable tasks and a persistent decomposition document. The input is a
technical design with affected components, sequencing, and scope boundaries. The output is a task hierarchy that any
developer or agent can pick up and execute without further clarification.

## Purpose

A technical design describes what changes at the component level — but components aren't work items. Decomposition
slices the design into assignable, estimable, trackable units with explicit boundaries, ordering, and completion
criteria. The decomposition document persists these decisions so any implementer — human or agent — can pick up
unblocked work without further clarification.

## When to Decompose

Decompose when the technical design touches multiple components, involves multiple implementers, takes more than a day,
or has non-obvious ordering constraints. Skip when a single task with acceptance criteria covers the entire scope.

## Creating a Task Decomposition

### Step 1: Read the Technical Design

1. Read the technical design's affected components, sequencing, and scope boundaries:
   - Which components change and what the nature of each change is
   - What dependencies exist between component changes
   - What tools or technologies were selected
   - What risks and assumptions were documented
2. Confirm understanding with the user before proceeding — restate the scope in your own terms.

### Step 2: Identify Work Boundaries

Choose the slicing approach that produces the most natural boundaries. There is no single correct decomposition — the
right one depends on the project:

| Approach         | Slices by                     | Best when                                                                                 | Watch out for                         |
| ---------------- | ----------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| By component     | Affected module or service    | Components are independent, changes don't span modules                                    | Cross-component coordination overhead |
| By functionality | User-facing capability        | Incremental delivery matters; a capability requires coordinated changes across components | Thin slices may feel artificial       |
| By layer         | Technical layer (DB, API, UI) | Team has clear specializations; layer changes are independent                             | Late integration risk                 |
| By risk          | Uncertainty level             | Part of the implementation has unknowns that might require a different approach           | Over-isolating trivial risks          |

Most real decompositions combine approaches. A database migration might be one task (by component), while the API
changes that depend on it are grouped by functionality.

### Step 3: Draft the Task List

1. For each task, write:
   - A clear title (imperative verb + object: "Add compound index on tenant_id and created_at")
   - A rough estimate (hours or days — enough to validate sizing, not a commitment)
   - Dependencies on other tasks in the list
2. Present as a table. No detailed descriptions yet — validate the structure before investing in details.

```
| # | Task | Estimate | Dependencies |
|---|------|----------|--------------|
| 1 | Create database migration for new schema | ~2h | — |
| 2 | Update repository layer for new query patterns | ~4h | #1 |
| 3 | Add cache invalidation to write path | ~3h | #2 |
| 4 | Update API response serialization | ~2h | #2 |
| 5 | Add integration tests for migration path | ~3h | #1, #2 |
```

3. Ask the user for approval before proceeding to detailed descriptions. The draft is cheap to change; detailed
   descriptions are not.
4. If the user requests changes, revise and present again.

### Step 4: Validate Sizing

1. Verify every leaf task takes no more than 8 hours. Leaf tasks are work units that reach an implementer's hands — not
   parent tasks grouping subtasks beneath them.

Eight hours is the ceiling, not the target. Well-decomposed work produces tasks well under that limit. If most tasks
cluster near 8 hours, the decomposition is likely too coarse.

- **Over 8 hours:** Break down further. No exceptions. If you can't split it, you don't understand the work well enough
  — go back to the technical design or investigate the codebase.
- **Near 8 hours (6-8h):** Acceptable but worth a second look. Is there a natural seam hiding inside? Often there is.
- **2-4 hours:** The sweet spot. Clean boundaries, estimable with confidence, completable in a focused session.
- **Under an hour:** Tracking overhead may exceed the work. Combine with related tasks unless isolation matters for risk
  or dependency reasons.
- **Can't estimate at all:** You don't understand the work well enough. Go back to the technical design or investigate
  the codebase before decomposing further.

2. Verify coverage using the 100% rule: the sum of all tasks must account for the complete scope defined in the
   technical design. If a component appears in the technical design but has no corresponding task, something is missing.

### Step 5: Write Detailed Descriptions

1. For each approved task, write a description that an implementer can act on without asking questions.

Two rules that agents violate constantly:

**Descriptions are plans, not reports.** Write every description as if the work has not started yet — because from the
implementer's perspective, it hasn't. Even if you've already explored the codebase, analyzed the problem, or prototyped
a solution during decomposition, the task description reads as a plan for work that remains to be done. "Add a compound
index on (tenant_id, created_at)" — not "Added a compound index" or "The compound index was created." The person or
agent picking up this task will read it fresh. It must tell them what to do, not what was done.

**Descriptions contain no implementation.** Describe WHAT should change and what "done" looks like. Never prescribe HOW
— no code, no function signatures, no class names to create. The implementer decides the approach. Two exceptions where
specificity helps: pseudocode is acceptable when describing logical changes that are easier to communicate as structured
logic than as prose; configuration samples are acceptable when the configuration itself is the deliverable (e.g., a YAML
snippet for a CI pipeline change).

2. Structure each description with:

   **Context** — Why this task exists. One or two sentences connecting it to the larger effort. Don't restate the entire
   design document — link to it.

   **What to do** — Specific work items. Concrete enough to act on, abstract enough to leave implementation judgment to
   the implementer.

   **Acceptance criteria** — Observable conditions that prove the task is done. Prefer verifiable statements: "API
   returns cached response within 50ms for repeated queries" over "caching works correctly."

   **References** — Links to the design document, technical design, relevant code, or similar implementations in the
   codebase. Only external resources — never references to other tasks. Inter-task dependencies are expressed through
   the Dependencies column in the task table and created as native tracker links during task creation.

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
- (Dependencies on other tasks are NOT listed here — they go in the task table's
  Dependencies column and become native tracker links during creation)
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

3. Verify every dependency is real, not accidental. If a task is marked as dependent but could actually start
   independently, the chain is artificially deep.

### Step 7: Create the Decomposition Document

1. Compose the decomposition document using the Document Template below, incorporating the approved task list and
   detailed descriptions from Steps 3-6.
2. Save to `design-docs/` following the file conventions.
3. Present to the user for review.
4. If the user requests changes, revise and present again. Do not proceed to After Completion until approved.

## Document Template

```markdown
# [Feature/Change Name]: Task Decomposition

**Source:** [link to or name of the technical design]
**Approach:** [by component / by functionality / by layer / by risk / hybrid — brief justification]

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
- [Links to design docs, code paths, mockups — never other tasks]

### Task 2: [Title]
...

## Execution Order

[Describe recommended sequence, parallelization opportunities, and critical path]

## Notes

[Context for implementers: decisions made during decomposition, gotchas, reference
implementations, anything that would otherwise be lost]
```

## File Conventions

- **Location:** `design-docs/` within project directory, alongside the technical design it decomposes
- **Naming:** `NN-short-description.decomposition.md` — same number prefix as the parent design document (e.g.,
  `02-cache-layer-redesign.decomposition.md`)
- **Completed:** Moves with the design document and technical design to `design-docs/completed/` when implemented

## Application

**When creating:** Apply all rules silently. Follow the workflow steps, validate sizing against the 8-hour ceiling,
enforce the 100% coverage rule, write descriptions as plans in imperative mood, and keep implementation details out of
task descriptions. Do not narrate which rules you are following.

**When reviewing:** Evaluate the existing decomposition against the Quality Checklist. For each violation, cite the
specific rule, quote the problematic section, and show the fix inline. Common review findings:

- Leaf tasks exceeding 8 hours (decomposition too coarse)
- Past-tense descriptions ("Added X" instead of "Add X")
- Implementation prescribed in descriptions (code, function signatures, class names)
- Missing coverage — components from the technical design with no corresponding task
- Hidden dependencies — tasks that implicitly require another task but don't declare it
- References section containing other task IDs instead of external resources

## Anti-Patterns

These failure modes are non-obvious from the positive directives above. The most common agent mistakes during
decomposition:

**Past-tense descriptions:** Descriptions written as if the work is already done ("Added the index", "The migration was
created"). This happens when the agent performed exploratory work during decomposition and described what it did instead
of what the implementer should do. Every description must read as a plan for future work.

**Implementation details in tasks:** Task descriptions that prescribe code ("create a function called X that takes Y")
cross into implementation. Describe what should change and what "done" looks like. The implementer decides how.
Pseudocode for logical changes and configuration samples for config-as-deliverable are acceptable — production code is
not.

**Hidden dependencies:** Tasks that silently depend on each other. A developer starts a task, discovers it's blocked,
and loses time context-switching. Make all ordering constraints visible and explicit in the task table.

## After Completion

When the decomposition is complete and approved:

1. Check whether task tracking tools are available (MCP servers, APIs, or other integrations that can create tasks).
2. **If tools are available:**
   1. Prompt the user:
      > The decomposition is complete. I can create these tasks in your issue tracker. Would you like to proceed?
   2. On confirmation, invoke the `task-creation` skill.
   3. After tasks are created, update the decomposition document: add task IDs and links to each entry in the task table
      so the document becomes the single reference connecting the plan to the tracked work.
3. **If no tools are available:** Tell the user explicitly:
   > The decomposition is complete, but I don't have access to a task tracking tool to create tasks autonomously. You'll
   > need to create these tasks manually using the descriptions above.

Do not silently skip task creation or pretend the pipeline is complete without it.

## Related Skills

- **technical-design** — Produces the input for this skill: affected components, sequencing, scope boundaries
- **design-documents** — The origin of the pipeline: problem analysis and solution decision
- **task-creation** — Consumes this skill's output: creates individual tasks in the issue tracker

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
