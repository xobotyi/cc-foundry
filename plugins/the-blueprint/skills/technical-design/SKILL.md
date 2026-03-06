---
name: technical-design
description: >-
  High-level technical design — affected components, tool selection, approach,
  and sequencing. Invoke whenever task involves any interaction with technical
  designs — creating, reviewing, understanding, or mapping design decisions
  onto the codebase.
---

# Technical Design

High-level technical planning that bridges a design document to task decomposition.
The input is a design document with a decided solution. The output is a technical design
that maps the decision onto the codebase without prescribing implementation details.

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

- A design document has been created and a solution was decided
- The chosen solution affects multiple components or systems
- Tool or technology selection is needed before implementation
- The implementation sequence has non-obvious dependencies
- Multiple people or agents will work on different parts

Skip when:
- The design document already scopes a single-component change with an obvious approach
- The change is small enough to go directly from design to tasks

## Creating a Technical Design

### Step 1: Read the Design Document

1. Read the design document's decision, constraints, and conditions. A technical
   design requires a design document as input — if none exists, stop and create one first
   using the `design-documents` skill.
2. Confirm understanding with the user before proceeding — restate the decided solution
   in your own terms.

### Step 2: Identify Affected Components

1. Map which parts of the codebase, infrastructure, or system the solution touches:
   - Which modules, packages, or services change
   - Which interfaces or APIs are affected
   - Which data models or storage layers are involved
   - Which external dependencies are impacted
2. Stay at the component level — name modules and packages, not individual functions or
   classes. Be exhaustive: missing a component here means missing tasks later.

### Step 3: Define Technical Approach per Component

For each affected component, describe WHAT changes at a high level:
- What the component does today.
- What it needs to do after the change.
- What the nature of the change is (new code, refactor, configuration, migration, etc.).

Describe changes in terms of their effect on the component, not the code that implements them.
Pseudocode is acceptable for logical changes; production code and function signatures are not.
If the description reads like something you'd put in a code review, it's too detailed — pull
back to the component level.

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

Every component from Step 2 must appear in the dependency map. Missing a component here
produces tasks that block each other or start before prerequisites are ready.

### Step 6: Document Risks and Assumptions

- List technical risks (performance unknowns, compatibility concerns).
- List assumptions about existing behavior that haven't been verified.
- Flag areas where the approach might need revision during implementation.

### Step 7: Set Scope Boundaries

Explicitly state what this technical design does NOT cover:
- Adjacent systems that won't be modified
- Future work that's out of scope for this effort
- Known tech debt that won't be addressed now

Realize the CHOSEN solution only. If this step surfaces alternatives or revisits decisions,
that analysis belongs back in the design document.

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
**Chosen Solution:** [brief restatement of the decided solution]

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

## File Conventions

- **Location:** `design-docs/` within project directory, alongside the design document it realizes
- **Naming:** `NN-short-description.technical-design.md` — same number prefix as the parent design
  document (e.g., `02-cache-layer-redesign.technical-design.md` for design doc `02-cache-layer-redesign.md`)
- **Completed:** Moves with the design document to `design-docs/completed/` when implemented

## Example

<example>
<design_document_input>
Design document recommends replacing the in-memory session store with Redis-backed sessions
to support horizontal scaling. Chosen solution: use Redis with a connection pool, migrate
session schema, and add fallback to in-memory for local development.
</design_document_input>

<technical_design_output>
# Technical Design: Redis-Backed Sessions

**Design Document:** `02-session-store-redesign.md`
**Chosen Solution:** Replace in-memory session store with Redis, retaining in-memory fallback
for local development.

## Affected Components

- **`session` module** — currently owns in-memory store; will own Redis-backed store
- **`config` module** — needs Redis connection parameters
- **`auth` middleware** — reads sessions; interface changes if session access becomes async
- **`docker-compose` / infrastructure** — needs Redis service definition
- **`test` infrastructure** — integration tests need Redis or a mock

## Technical Approach

### `session` module
- Current state: Stores sessions in a process-local map. Synchronous read/write.
- Target state: Stores sessions in Redis via connection pool. Async read/write. Falls back
  to in-memory store when Redis is not configured.
- Nature of change: Refactor — replace storage backend, preserve public interface shape.

### `config` module
- Current state: No Redis configuration.
- Target state: Reads `REDIS_URL`, pool size, and timeout from environment.
- Nature of change: New code — add config struct and validation.

### `auth` middleware
- Current state: Calls session store synchronously.
- Target state: Calls session store asynchronously (if session interface changes to async).
- Nature of change: Refactor — adapt to async session interface.

### Infrastructure
- Current state: No Redis dependency.
- Target state: Redis service in docker-compose; health check before app starts.
- Nature of change: Configuration.

## Tool and Technology Decisions

- **redis client library (ioredis / go-redis / etc.)** — official client for the project's
  language runtime; well-maintained, supports connection pooling natively.

## Dependencies and Sequencing

```
config module (no dependencies)
    ↓
session module (depends on config)
    ↓
auth middleware (depends on session interface)

Infrastructure (parallel, no code dependencies)
Test infrastructure (parallel, needed before integration tests)
```

## Risks and Assumptions

- **Risk:** Session serialization format change may invalidate active sessions during deploy.
- **Assumption:** Current session interface is narrow enough that async migration is contained
  to the auth middleware (no other direct consumers).

## Scope Boundaries

**In scope:** Redis integration, config, session module refactor, auth middleware adaptation,
local dev fallback, docker-compose update.

**Out of scope:** Session encryption at rest, Redis Sentinel/Cluster HA setup, session
analytics.
</technical_design_output>
</example>

Note what this example does right: it names modules, not functions. It describes current/target
state per component. It justifies tool selection. The dependency graph covers every component.
Scope boundaries are explicit. No production code appears anywhere.

## Application

**When creating:** Apply all rules silently. Follow the workflow steps, identify components
at the module level, describe current/target state per component, map dependencies
exhaustively, and set explicit scope boundaries. Do not narrate which rules you are
following.

<enforcement>

**When reviewing or working with an existing technical design**, evaluate it against every
rule below. Report violations explicitly — do not silently accept a non-compliant document.

**Violations to check:**

1. **Design document link.** Must reference the source design document. If missing, the
   technical design has no traceable origin.
2. **Component granularity.** Components must be at the module/package/service level — not
   individual functions or classes. If function signatures or class names appear in the
   Affected Components section, cite the violation.
3. **Implementation details.** Production code, function signatures, or detailed class
   hierarchies do not belong here. Pseudocode is acceptable for logical changes only.
   The test: "Does this read like a code review?" If yes, it's too detailed.
4. **Component coverage.** Every component affected by the design document's decision must
   appear. Cross-reference the design document — if it mentions a system or module that
   doesn't appear here, that's a gap.
5. **Dependency completeness.** Every component from Affected Components must appear in
   Dependencies and Sequencing. A component listed but not sequenced produces tasks that
   block each other or start before prerequisites are ready.
6. **Tool justification.** Tool and technology selections must include brief justification.
   "We'll use Redis" without "because X" is a violation.
7. **Scope boundaries.** In-scope and out-of-scope must be explicit. Vague boundaries
   ("and other related changes") are violations.
8. **Risks and assumptions.** Must be documented. A technical design with zero risks listed
   hasn't been critically examined.
9. **File naming.** Must follow `NN-short-description.technical-design.md` convention with
   the same number prefix as the parent design document.

**Reporting format:** For each violation, state:
- Which rule was violated
- Quote or cite the problematic section
- What the fix is

Do not present a summary like "overall looks good with minor issues." List every violation.
If there are no violations, state that explicitly.

</enforcement>

## After Completion

When the user approves the technical design:

1. Run the Quality Checklist against the document. For each item that fails, report it
   to the user with the specific violation and proposed fix. Do not proceed until all
   checklist items pass.
2. Once the checklist passes, prompt the user to proceed with task decomposition:
   > The technical design is complete and passes all quality checks. The next step is
   > decomposing it into actionable tasks. Would you like to proceed with task
   > decomposition?
3. On confirmation, invoke the `task-decomposition` skill.

## Related Skills

- **design-documents** — Produces the input for this skill: the decided solution with rationale
- **task-decomposition** — Consumes this skill's output: decomposes the technical design into
  tracked work items
- **task-creation** — Creates individual tasks from decomposition output

## Quality Checklist

Before considering a technical design complete:

- [ ] Links to the source design document
- [ ] All affected components identified at the module level
- [ ] Technical approach described per component (current state → target state)
- [ ] No implementation details — no production code, no function signatures (pseudocode
  acceptable for logical changes)
- [ ] Tool selections justified
- [ ] Dependencies and sequencing mapped — every component appears in the dependency graph
- [ ] Risks and assumptions documented
- [ ] Scope boundaries explicit
- [ ] User approved the document (Step 8) before proceeding to task decomposition
- [ ] An agent or colleague could decompose this into tasks without further clarification
