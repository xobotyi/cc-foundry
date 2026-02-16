---
name: technical-design
description: >-
  High-level technical design — affected components, tool selection, approach,
  and sequencing. Invoke when task involves any interaction with technical
  designs — creating, reviewing, understanding, or mapping design decisions
  onto the codebase.
---

# Technical Design

High-level technical planning that bridges a design document to task decomposition.
The input is a design document with a chosen solution. The output is a technical design
that maps the solution onto the codebase without prescribing implementation details.

## Why Technical Design Matters

A design document decides WHAT to build and WHY. But before work can be decomposed into
tasks, someone must map the decision onto reality: which components are affected, what
tools are needed, in what order things should change, and what risks exist.

Without this step, task decomposition operates on abstractions. Tasks like "implement the
new cache layer" appear without clarity on which modules are involved, what dependencies
exist between changes, or what the technical approach looks like. The result is tasks that
are either too vague to act on or too detailed to have been created without actually doing
the implementation work.

The technical design is the map between the strategic decision and the practical work
breakdown. It scopes the territory so that task decomposition can divide it.

## When to Write

Write a technical design when:

- A design document has been created and a solution was chosen
- The chosen solution affects multiple components or systems
- Tool or technology selection is needed before implementation
- The implementation sequence has non-obvious dependencies
- Multiple people or agents will work on different parts

Skip when:
- The design document already scopes a single-component change with an obvious approach
- The change is small enough to go directly from design to tasks

## Creating a Technical Design

### Step 1: Read the Design Document

1. Read the design document's recommendation, constraints, and conditions.
2. Confirm understanding with the user before proceeding — restate the chosen solution
   in your own terms.

### Step 2: Identify Affected Components

1. Map which parts of the codebase, infrastructure, or system the solution touches:
   - Which modules, packages, or services change
   - Which interfaces or APIs are affected
   - Which data models or storage layers are involved
   - Which external dependencies are impacted
2. Be exhaustive but stay at the component level — name the modules, not the functions.

### Step 3: Define Technical Approach per Component

For each affected component, describe WHAT changes at a high level:
1. What the component does today.
2. What it needs to do after the change.
3. What the nature of the change is (new code, refactor, configuration, migration, etc.).

Describe changes in terms of their effect on the component, not the code that implements them.
Pseudocode is acceptable when expressing logical changes that are easier to communicate as
structured logic than as prose.

### Step 4: Select Tools and Technologies

1. Document tool or technology decisions that must be made before implementation:
   - New libraries or frameworks to adopt
   - Migration tools needed
   - Testing infrastructure changes
   - Build or deployment pipeline adjustments
2. Justify each selection briefly — why this tool over alternatives.

### Step 5: Map Dependencies and Sequencing

Identify ordering constraints between component changes:
- Which changes must complete before others can start
- Which changes can proceed in parallel
- Which changes have external dependencies (API availability, data migration, etc.)

### Step 6: Document Risks and Assumptions

1. List technical risks (performance unknowns, compatibility concerns).
2. List assumptions about existing behavior that haven't been verified.
3. Flag areas where the approach might need revision during implementation.

### Step 7: Set Scope Boundaries

Explicitly state what this technical design does NOT cover:
- Adjacent systems that won't be modified
- Future work that's out of scope for this effort
- Known tech debt that won't be addressed now

### Step 8: Write and Present the Document

1. Compose the technical design using the Document Template below, incorporating research
   from Steps 1-7.
2. Save to `design-docs/` following the file conventions.
3. Present the document to the user for review.
4. If the user requests changes, revise and present again. Do not proceed to After
   Completion until approved.

## Document Template

```markdown
# Technical Design: [Feature/Change Name]

**Design Document:** [link to or name of the design document]
**Chosen Solution:** [brief restatement of the recommended option]

## Affected Components

- **[Component A]** — [brief description of what changes]
- **[Component B]** — [brief description of what changes]
- ...

## Technical Approach

### [Component A]
- Current state: [what it does now]
- Target state: [what it needs to do]
- Nature of change: [new code / refactor / config / migration]

### [Component B]
- Current state: [what it does now]
- Target state: [what it needs to do]
- Nature of change: [new code / refactor / config / migration]

## Tool and Technology Decisions

- **[Tool/Library]** — [what for, why this one]
- ...

## Dependencies and Sequencing

```
[Component A] (no dependencies)
    ↓
[Component B] (depends on A)
    ↓
[Component C] (depends on B)

[Component D] (parallel, no dependencies)
```

## Risks and Assumptions

- **Risk:** [what could go wrong]
- **Assumption:** [what we're taking for granted]

## Scope Boundaries

**In scope:**
- [what this effort covers]

**Out of scope:**
- [what it explicitly does not cover]
```

## Quality Checklist

Before considering a technical design complete:

- [ ] Links to the source design document
- [ ] All affected components identified at the module level
- [ ] Technical approach described per component (current → target)
- [ ] No implementation details — no production code, no function signatures (pseudocode
  acceptable for logical changes)
- [ ] Tool selections justified
- [ ] Dependencies and sequencing mapped
- [ ] Risks and assumptions documented
- [ ] Scope boundaries explicit
- [ ] User approved the document (Step 8) before proceeding to task decomposition
- [ ] An agent or colleague could decompose this into tasks without further clarification

## File Conventions

- **Location:** `design-docs/` within project directory, alongside the design document it realizes
- **Naming:** `NN-short-description.technical-design.md` — same number prefix as the parent design
  document (e.g., `02-cache-layer-redesign.technical-design.md` for design doc `02-cache-layer-redesign.md`)
- **Completed:** Moves with the design document to `design-docs/completed/` when implemented

## Anti-Patterns

**Contains implementation details:**
If the document includes production code or function-level descriptions, it has crossed into
implementation. The technical design describes WHAT changes at the component level and HOW the
approach works abstractly — the exact implementation is the job of whoever picks up the task.
Pseudocode for logical changes is acceptable; production code is not.

**Skips the design document:**
A technical design without a design document is a solution without a justified decision. Go
back and create the design document first.

**Task-level granularity:**
If the document reads like a task list ("Step 1: create file X, Step 2: modify function Y"),
it has crossed into task decomposition. Pull back to the component level.

**Missing dependencies:**
Without sequencing, task decomposition will produce tasks that block each other or that
someone starts before prerequisites are ready.

**Scope creep from the design document:**
The technical design realizes the CHOSEN solution. If it starts exploring alternatives or
revisiting decisions, it belongs back in the design document.

## After Completion

When the technical design is complete and approved:

1. Prompt the user to proceed with task decomposition:
   > The technical design is complete. The next step is decomposing it into actionable tasks.
   > Would you like to proceed with task decomposition?
2. On confirmation, invoke the `task-decomposition` skill.

## Related Skills

- **design-documents** — Produces the input for this skill: the chosen solution with rationale
- **task-decomposition** — Consumes this skill's output: decomposes the technical design into
  tracked work items
- **task-creation** — Creates individual tasks from decomposition output
