---
name: design-documents
description: >-
  Technical design documents — problem analysis, solution exploration,
  architectural decisions. Invoke whenever task involves any interaction
  with design documents — creating, updating, reviewing, comparing options,
  or capturing architectural decisions.
---

# Design Documents

Decision records that explore problems and commit to solutions before implementation.
A design document serves three purposes:

1. **Thinking tool.** Writing forces the author to plan before coding — understanding
   the problem, evaluating options, and committing to a direction.
2. **Review artifact.** A deliverable others can evaluate before implementation starts,
   catching design flaws when they cost minutes to fix, not days.
3. **Decision record.** Preserves what was decided and why — an architecture decision
   record (ADR) that future readers can reference without re-doing the analysis.

The deliverable must be equally useful to a person reading it and to an agent consuming
it to plan implementation.

## When to Write

Write a design doc when 3+ of these apply:

- You're uncertain about the right design
- The design is ambiguous or contentious
- Multiple valid approaches exist with meaningful trade-offs
- Cross-cutting concerns (security, privacy, observability) are involved
- The decision rationale should be preserved as an architecture decision record
- The knowledge should be shared across the team, not kept in one person's head

**Don't write one when:**
- The solution is unambiguous with no trade-offs
- Rapid prototyping is more valuable than upfront analysis
- The change is small enough that code review covers it

## Creating a New Design Document

### Step 1: Understand the Problem

1. Answer these before drafting:
   - What's broken or missing?
   - Who is affected and how?
   - What's the root cause (not just the symptom)?
2. Gather context: read related code, check for prior attempts, review existing issues.
3. If any answer is unclear, ask the user clarifying questions. Do not assume requirements.

### Step 2: Research Current State

Document how the affected system works today:
- Architecture and data flow
- Current limitations
- Why it was built this way (if known)

Verify against source code and configuration — don't rely on secondhand descriptions.

### Step 3: Define Goals and Non-Goals

- List goals: what this change must achieve. Use bullet points.
- List non-goals: scope deliberately excluded.
  - Non-goals are things that *could reasonably be goals* but aren't for this effort.
  - "Shouldn't crash" is not a non-goal — it's a basic expectation.
  - "ACID compliance" for a cache layer is a non-goal.

### Step 4: Generate Options

1. Explore whether multiple approaches exist before committing to one.
2. For each option: describe the approach, list pros, list cons.
3. If genuinely only one viable option exists after honest exploration, document it as the
   single proposed solution and explain why alternatives don't apply.

A single option is acceptable when it results from exploration — not when exploration
was skipped.

### Step 5: Compare and Decide

1. Create a comparison table on key dimensions (complexity, risk, timeline, cost, etc.).
2. Pick one option and state the decision with justification.
3. A design document ends with a decision, not a recommendation. "We decided X because Y"
   — not "We recommend X, but consider Z." If you cannot commit, the analysis is incomplete.

### Step 6: Address Cross-Cutting Concerns

Review cross-cutting concerns relevant to the project:
- Security implications
- Privacy and data handling
- Observability (logging, metrics, tracing)
- Performance impact
- Backward compatibility

Not all apply to every document. Include only those relevant to the decision scope.

### Step 7: Verify Completeness

Before presenting the document:
1. Confirm there are no unresolved questions. If something is unknown, resolve it now —
   research, ask the user, or make a decision and document the rationale.
2. Verify every section of the document supports the decision. Remove anything that
   doesn't contribute.
3. A completed design document has zero open questions. If items remain open, the
   document is not done.

### Step 8: Write and Present the Document

1. Compose the design document using the Document Template below, incorporating research
   from Steps 1-7.
2. Save to `design-docs/` following the file conventions.
3. Present the document to the user for review.
4. If the user requests changes, revise and present again. Do not proceed to After
   Completion until approved.

## Updating an Existing Document

**When to update:**
- New information invalidates assumptions
- Stakeholder feedback changes direction
- Implementation revealed something unexpected
- Decision was revised (document the new decision and what caused the shift)

**How to update:**

1. Add an "Update (YYYY-MM-DD)" section at the bottom
2. State what changed and why
3. Revise affected sections (don't just append — keep doc coherent)
4. If the decision changed, explain what new information caused the shift

**Never silently edit** — the update trail shows how thinking evolved.

## Document Template

The template below defines the structural frame. Not every section applies to every
document — the level of detail is driven by what needs to be decided. A design document
for a focused subsystem may omit sections that don't apply. A design document for a
cross-cutting architectural change may need all of them and more.

The required sections are: Problem Statement, Goals, Decision, and Cross-Cutting Concerns.
Everything else is included when it serves the decision.

```markdown
# [Problem/Feature Name]

## Problem Statement
What's broken or needed. Include root cause and impact — not just symptoms.

## Current State
How it works now. Architecture, data flow, limitations, and why it was built this way.

## Goals
- [What this effort must achieve]

## Non-Goals
- [What is deliberately excluded and why]

## Key Insight
(Optional) The realization that shapes the solution space.

## Proposed Solutions

### Option 1: [Name]
[Description]

**Pros:**
- ...

**Cons:**
- ...

### Option 2: [Name]
[Description]

**Pros:**
- ...

**Cons:**
- ...

## Comparison

| Aspect | Option 1 | Option 2 |
|--------|----------|----------|
| ...    | ...      | ...      |

## Decision
Which option was chosen and why. This is a commitment, not a suggestion.

## Cross-Cutting Concerns
Security, privacy, observability, performance, compatibility — as relevant.

## Updates
(Added as document evolves)

### Update (YYYY-MM-DD)
What changed and why.
```

## Detail Level

The document includes whatever analysis is necessary to make the decision defensible.
This is not about "high-level vs. low-level" — it's about "decided vs. not yet decided."

**Include** details when they are the subject of the decision:
- Data source quality analysis when choosing which signals to use
- Matching algorithm semantics when deciding how attribution works
- Validation boundaries when deciding where validation happens
- API contract shapes when deciding how services communicate

**Exclude** details that belong to implementation, not decision-making:
- Package layouts and file structures (→ technical design)
- Function signatures and class hierarchies (→ technical design)
- Pseudocode for algorithms whose logic is already decided (→ technical design)
- Deployment procedures (→ task decomposition)

The test: "Is this detail needed to evaluate whether the decision is correct?" If yes,
include it. If it's needed to *implement* the decision, it belongs in the technical design.

## Parent-Child Documents

Design documents can reference parent decisions. A parent document may decide the overall
direction ("we will build an attribution system"); a child document decides the specifics
of a subsystem ("how the attribution engine matches regions").

When writing a child document:
- Link to the parent document in the header
- Do not re-justify the parent decision — reference it
- The child document is still a complete decision record for its scope
- Options exploration applies to the child's decision space, not the parent's

## Scale Guidance

- **Mini design doc (1-3 pages):** Incremental improvements, single-system changes,
  well-understood problem space.
- **Full design doc (5-15 pages):** New systems, cross-team changes, significant
  architectural decisions.
- If a doc exceeds 15 pages, split the problem into sub-problems with their own docs.

## Example: Good Problem Statement

**Weak:**
> Users complain about slow search.

**Strong:**
> Search latency p95 is 3.2s, up from 800ms after the October data migration. Root cause:
> the new schema lacks a compound index on (tenant_id, created_at), forcing full table scans.
> Impact: enterprise customers (40% of revenue) report degraded experience; 3 support tickets
> this week.

The strong version includes: metric, timeline, root cause, and business impact.

## Example: Mini Design Doc (Condensed)

```markdown
# Search Performance Regression

## Problem Statement
Search latency p95 is 3.2s, up from 800ms after the October data migration.
Root cause: the new schema lacks a compound index on (tenant_id, created_at),
forcing full table scans. Impact: enterprise customers (40% of revenue) report
degraded experience; 3 support tickets this week.

## Current State
Search queries hit PostgreSQL directly. The October migration changed the
tenant isolation model from schema-per-tenant to shared table with tenant_id
column. No index was added for the new access pattern.

## Goals
- Restore search p95 to under 1s
- No downtime during fix

## Non-Goals
- Full-text search improvements (separate effort)
- Migrating search to a dedicated search engine

## Proposed Solutions

### Option 1: Add Compound Index
Add (tenant_id, created_at DESC) index. Estimated build time: ~20 min on
production with CONCURRENTLY.

**Pros:** Minimal change, directly addresses root cause, no downtime.
**Cons:** Index adds ~2GB storage, slows writes marginally.

### Option 2: Materialized View
Pre-compute recent results per tenant in a materialized view, refresh on schedule.

**Pros:** Faster reads, could support future search features.
**Cons:** Stale data between refreshes, operational complexity, overkill for this problem.

## Comparison

| Aspect        | Compound Index    | Materialized View    |
|---------------|-------------------|----------------------|
| Complexity    | Low               | Medium               |
| Risk          | Low               | Medium (staleness)   |
| Timeline      | Hours             | Days                 |
| Maintenance   | None              | Refresh scheduling   |

## Decision
Compound Index. Directly addresses root cause with minimal risk. The materialized
view adds operational complexity that is not justified for a single query pattern.
We would revisit this decision only if we planned to migrate search to a dedicated
engine within 3 months — in that case, neither option would be worth the investment.

## Cross-Cutting Concerns
- **Performance:** Index build with CONCURRENTLY avoids table locks.
- **Observability:** Add p95 latency alert threshold at 1.5s.
```

## File Conventions

- **Location:** `design-docs/` within project directory
- **Naming:** `NN-short-description.md` (e.g., `02-cache-layer-redesign.md`)
- **Completed:** Move to `design-docs/completed/` when implemented
- **Superseded:** If a new doc replaces an old one, mark the old doc with a header linking to
  the replacement

## Application

**When creating:** Follow the workflow steps (1-8) silently. Use the document template,
enforce goals/non-goals separation, generate multiple options, produce a comparison, and
land on a decision — not a recommendation. Verify completeness (Step 7) before presenting.
Do not narrate which rules you are following.

<enforcement>

**When reviewing or working with an existing design document**, evaluate it against every
rule below. Report violations explicitly — do not silently accept a non-compliant document.

**Violations to check:**

1. **File naming.** Must follow `NN-short-description.md` convention. Report the expected
   name if it doesn't match.
2. **Problem statement.** Must contain root cause and impact — not just symptoms. If it
   reads "X is broken" without explaining why or who is affected, cite the violation.
3. **Goals and non-goals.** Both must be present and explicit. Non-goals must be things
   that could reasonably be goals, not basic expectations.
4. **Options exploration.** At least two options must be presented, or a single option must
   explicitly address why alternatives don't apply. If only one option appears without
   exploration rationale, this is a violation.
5. **Decision vs. recommendation.** The document must contain a decision ("we decided X
   because Y"), not a recommendation ("we recommend X"). Conditional language ("consider",
   "might", "could potentially") in the decision section is a violation.
6. **No open questions.** A completed document has zero unresolved items. "Open Items",
   "TBD", "to be determined", or questions without answers are violations. Each must be
   resolved or explicitly moved to a separate follow-up document.
7. **Cross-cutting concerns.** Must be addressed — at minimum, a statement of which
   concerns were evaluated and which don't apply.
8. **Implementation details.** Package layouts, file structures, function signatures,
   and pseudocode for decided algorithms belong in the technical design, not here.
   The test: "Is this needed to evaluate the decision, or to implement it?"
9. **Detail sufficiency.** The document must contain enough analysis to make the decision
   defensible. Data source quality, algorithm semantics, validation boundaries — if these
   are the subject of the decision, they must be analyzed, not assumed.
10. **Template structure.** Required sections: Problem Statement, Goals, Decision,
    Cross-Cutting Concerns. Missing required sections are violations.

**Reporting format:** For each violation, state:
- Which rule was violated
- Quote or cite the problematic section
- What the fix is

Do not present a summary like "overall looks good with minor issues." List every violation.
If there are no violations, state that explicitly.

</enforcement>

## Anti-Patterns

**Implementation manuals:**
Design docs explore WHAT and WHY, not HOW. A doc that reads "this is how we implement it"
— with package layouts, function signatures, or pseudocode — without exploring trade-offs
is not a design doc. It's a task description wearing a design doc's structure.

This does not mean design docs must stay abstract. A design doc that analyzes data source
reliability, defines matching semantics, or specifies validation boundaries is making
decisions at the right level. The distinction is: **design specificity** (analyzing options
to make a decision) vs. **implementation detail** (describing how to code the decision).

**Analysis without commitment:**
A document that presents options and says "we recommend X, but conditions might change"
is not a decision record — it's a report. The document must commit. If conditions later
change, update the document with a new decision and the rationale for the shift.

**Premature completeness:**
Marking a document complete while it contains "TBD", "open items", or unresolved questions.
If you can't decide, the analysis is incomplete — do more research, ask stakeholders, or
narrow the scope until you can commit.

## After Completion

When the user approves the design document:

1. Run the Quality Checklist against the document. For each item that fails, report it
   to the user with the specific violation and proposed fix. Do not proceed until all
   checklist items pass.
2. Once the checklist passes, prompt the user to proceed with the technical design:
   > The design document is complete and passes all quality checks. The next step is
   > creating a technical design that maps the decided solution onto the codebase —
   > affected components, tool selection, and sequencing. Would you like to proceed
   > with the technical design?
3. On confirmation, invoke the `technical-design` skill.

## Related Skills

- **technical-design** — Next step after design doc: maps the decided solution onto
  the codebase
- **task-decomposition** — After technical design, breaks it into tracked work items
- **task-creation** — Creates individual tasks from decomposition output

## Quality Checklist

Before considering a design doc complete:

- [ ] File follows naming convention (`NN-short-description.md`)
- [ ] Problem has root cause, not just symptoms
- [ ] Current state explains why things are this way
- [ ] Goals and non-goals are explicit
- [ ] Alternatives were explored (single option acceptable if alternatives were considered
  and dismissed with rationale)
- [ ] Each option has pros AND cons (no perfect solutions)
- [ ] Comparison covers key dimensions
- [ ] Decision is explicit — a commitment, not a recommendation
- [ ] Cross-cutting concerns addressed
- [ ] Zero open questions — all items resolved or scoped out to separate documents
- [ ] Detail level matches decision scope (enough to evaluate, not enough to implement)
- [ ] User approved the document (Step 8) before proceeding to technical design
- [ ] Reader can make an informed judgment without asking questions
