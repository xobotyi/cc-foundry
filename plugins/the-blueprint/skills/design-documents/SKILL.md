---
name: design-documents
description: >-
  Technical design documents — problem analysis, solution exploration,
  architectural decisions. Use when working with any design or design
  document task.
---

# Design Documents

Technical artifacts that explore problems and solutions before implementation.
The deliverable must be equally useful to a person reading it and to an agent
consuming it to plan implementation.

## Why Design Documents Matter

Design docs catch mistakes when they're cheapest to fix — before code exists. Writing forces
clarity: vague ideas that sound reasonable in conversation fall apart when you have to commit
them to structured prose. The act of exploring alternatives surfaces trade-offs that would
otherwise emerge as surprises during implementation or review.

They also become architecture decision records. Every design doc captures not just what was
decided, but what alternatives were considered and why they were rejected. When someone asks
"why did we build it this way?" six months later, the reasoning is preserved — not lost in
chat history or someone's memory.

For agent-driven workflows, design docs serve as the contract between human intent and agent
execution. An agent that implements from a design doc has explicit goals, non-goals, and
constraints — reducing drift from the intended solution.

## When to Write

Write a design doc when 3+ of these apply:

1. You're uncertain about the right design
2. The design is ambiguous or contentious
3. Multiple valid approaches exist with meaningful trade-offs
4. Cross-cutting concerns (security, privacy, observability) are involved
5. The decision rationale should be preserved as an architecture decision record
6. The knowledge should be shared across the team, not kept in one person's head

**Don't write one when:**
- The solution is unambiguous with no trade-offs
- Rapid prototyping is more valuable than upfront analysis
- The change is small enough that code review covers it

## Creating a New Design Document

### Step 1: Understand the Problem

Don't start writing until you can answer:
- What's broken or missing?
- Who is affected and how?
- What's the root cause (not just the symptom)?

**Gather context:** Read related code, talk to stakeholders, check for prior attempts. If acting
as an agent, interview the user — ask clarifying questions before drafting. Don't assume
requirements.

### Step 2: Research Current State

Document how things work now:
- Architecture and data flow
- Current limitations
- Why it was built this way (if known)

This section prevents solutions that ignore existing constraints.

### Step 3: Define Goals and Non-Goals

**Goals:** What this change must achieve. Bullet points.

**Non-Goals:** Scope deliberately excluded. Non-goals are things that *could reasonably be goals*
but aren't for this effort. "Shouldn't crash" is not a non-goal — it's a basic expectation.
"ACID compliance" for a cache layer is a non-goal.

This section prevents scope creep and misaligned expectations.

### Step 4: Generate Options

Always explore whether multiple approaches exist. Think through alternatives before committing
to one — the act of looking often surfaces edge cases or trade-offs you'd miss otherwise.

If genuinely only one viable option exists after honest exploration, that's fine — document it
as the single proposed solution and explain why alternatives don't apply. A single option is not
an anti-pattern when it's the result of exploration. It's an anti-pattern when exploration was
skipped.

For each option: describe the approach, list pros, list cons.

### Step 5: Compare and Recommend

Create a comparison table on key dimensions (complexity, risk, timeline, cost, etc.).

Pick one option. Justify why. State conditions that might change your recommendation.

### Step 6: Identify Gaps and Cross-Cutting Concerns

What's still unknown? What needs validation before implementation?

Review cross-cutting concerns relevant to the project:
- Security implications
- Privacy and data handling
- Observability (logging, metrics, tracing)
- Performance impact
- Backward compatibility

This becomes the "Next Steps" section.

## Updating an Existing Document

**When to update:**
- New information invalidates assumptions
- Stakeholder feedback changes direction
- Implementation revealed something unexpected
- Decision was made (document the outcome)

**How to update:**

1. Add an "Update (YYYY-MM-DD)" section at the bottom
2. State what changed and why
3. Revise affected sections (don't just append — keep doc coherent)
4. If decision changed, explain what new information caused the shift

**Never silently edit** — the update trail shows how thinking evolved.

## Document Template

```markdown
# [Problem/Feature Name]

## Problem Statement
What's broken or needed. Include root cause and impact.

## Current State
How it works now. Architecture, data flow, limitations.

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

## Recommendation
Which option and why. Include conditions that might change this.

## Cross-Cutting Concerns
Security, privacy, observability, performance, compatibility — as relevant.

## Next Steps
What remains to decide or do before implementation.

## Updates
(Added as document evolves)

### Update (YYYY-MM-DD)
What changed and why.
```

## Scale Guidance

- **Mini design doc (1-3 pages):** Incremental improvements, single-system changes,
  well-understood problem space.
- **Full design doc (5-15 pages):** New systems, cross-team changes, significant
  architectural decisions.
- If a doc exceeds 15 pages, split the problem into sub-problems with their own docs.

## Quality Checklist

Before considering a design doc complete:

- [ ] Problem has root cause, not just symptoms
- [ ] Current state explains why things are this way
- [ ] Goals and non-goals are explicit
- [ ] Alternatives were explored (single option acceptable if alternatives were considered)
- [ ] Each option has pros AND cons (no perfect solutions)
- [ ] Comparison covers key dimensions
- [ ] Recommendation is explicit with justification
- [ ] Cross-cutting concerns addressed
- [ ] Next steps identify remaining unknowns
- [ ] Reader can make informed decision without asking questions

## Example: Good Problem Statement

**Weak:**
> Users complain about slow search.

**Strong:**
> Search latency p95 is 3.2s, up from 800ms after the October data migration. Root cause:
> the new schema lacks a compound index on (tenant_id, created_at), forcing full table scans.
> Impact: enterprise customers (40% of revenue) report degraded experience; 3 support tickets
> this week.

The strong version includes: metric, timeline, root cause, and business impact.

## File Conventions

- **Location:** `design-docs/` within project directory
- **Naming:** `NN-short-description.md` (e.g., `02-cache-layer-redesign.md`)
- **Completed:** Move to `design-docs/completed/` when implemented
- **Superseded:** If a new doc replaces an old one, mark the old doc with a header linking to
  the replacement

## Anti-Patterns

**Unexplored single-option documents:**
Presenting one solution is fine when alternatives were genuinely considered and found unviable.
It's a problem when the author skipped exploration and jumped to "the obvious answer."

**Implementation manuals:**
Design docs explore WHAT and WHY, not HOW. A doc that reads "this is how we implement it"
without exploring trade-offs is not a design doc — it's a task description. Save implementation
for task decomposition.

**No recommendation:**
Analysis without conclusion forces readers to re-do the thinking. Take a position.

**Stale documents:**
Outdated design docs mislead. Update or mark as superseded.

**Missing non-goals:**
Without explicit non-goals, scope creep is invisible. Readers assume everything related is
in scope.

## After Completion

When a design document is complete and the recommendation is accepted, prompt the user to
proceed with the technical design:

> The design document is complete. The next step is creating a technical design that maps the
> chosen solution onto the codebase — affected components, tool selection, and sequencing.
> Would you like to proceed with the technical design?

Invoke the `technical-design` skill when the user confirms.

## Related Skills

- **technical-design** — Next step after design doc: maps the chosen solution onto the codebase
- **task-decomposition** — After technical design, breaks it into tracked work items
- **task-creation** — Creates individual tasks from decomposition output
