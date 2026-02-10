---
name: task-creation
description: >-
  Create individual tasks in issue trackers with clear descriptions,
  acceptance criteria, and proper categorization. Use when creating
  tasks, bug reports, or feature requests in any tracker.
---

# Task Creation

Create well-formed tasks in an issue tracker. The input is either a decomposition
document (from the pipeline) or a standalone request from a user. The output is a
tracked task with enough context for an implementer to start work without asking
questions.

## Why Task Creation Matters

A task is the atomic unit of tracked work. It's the handoff point — where planning
ends and implementation begins. Everything upstream in the pipeline (design documents,
technical designs, decomposition) converges here into a concrete assignment that someone
picks up and completes.

Bad tasks waste more time than they save. A vague title with no description forces the
implementer to reverse-engineer the intent from chat history, commit logs, or the
person who created it — if that person is still available. A task that's too detailed
prescribes implementation and removes the judgment that makes skilled developers
effective. The sweet spot is a description that communicates intent, scope, and
completion criteria without dictating how to get there.

Tasks also serve as institutional memory. Months later, when someone asks "why did we
change the authentication flow?", the task description, its linked design document, and
its acceptance criteria reconstruct the reasoning. If the task was just a title, that
context is lost.

## When to Use

**From the pipeline:** After task-decomposition produces a decomposition document with
task descriptions, this skill handles creating those tasks in the issue tracker with
proper fields, categorization, and linking.

**Standalone:** When a user requests a task directly — "create a bug for the pagination
issue" or "add a task to upgrade the dependency." No decomposition document needed;
gather context from the conversation.

## Creating a Task

### Step 1: Gather Context

Determine what you need before drafting. This is an active discovery step — don't rely
solely on inference. Use available tools to learn what the tracker expects.

**Identify the tracker** — Check which task tracking tools are available (MCP servers,
APIs, CLI integrations). If multiple trackers are present, ask the user which one to
use for this task. Don't assume.

**Discover the project** — Use the tracker's project listing or configuration tools to
find the target project. Infer from conversation context (directory, subsystem, prior
tasks) when possible, but validate against the tracker. If ambiguous, ask the user.

**Explore project configuration** — Query the tracker for the project's field setup:
- What fields exist (type, priority, severity, component, sprint, etc.)
- Which fields are required vs optional
- What values are valid for each field (the tracker defines these, not this skill)

This matters because field names, types, and valid values differ across projects and
trackers. "Type" might offer Bug/Task/Feature in one project and
Defect/Story/Epic/Spike in another. "Priority" might be Critical/Major/Minor or
P0/P1/P2/P3. Don't hardcode assumptions — read them from the tracker.

**Determine task type** — Based on the user's intent and the project's available types,
select the closest match. Common patterns:
- Something is broken → bug/defect type. Needs: what's wrong, reproduction path,
  expected behavior.
- Implementation work → task/story type. Needs: what to do, why, acceptance criteria.
- New capability → feature/story type. Needs: user-facing description, scope,
  acceptance criteria.

The exact type name comes from the tracker, not from a universal list.

**Source material** — Is there a decomposition document, design document, or technical
design to reference? Link to it. If this is a standalone task, the conversation itself
is the source.

### Step 2: Draft the Task

Compose the task and present it to the user for approval before creating it in the
tracker.

#### Title

The title is what people see in lists, boards, and notifications. It must communicate
the task at a glance.

- **Imperative mood:** "Add pagination to search results" not "Pagination was added"
- **Specific:** "Fix negative offset in paginator navigation" not "Fix pagination bug"
- **5-10 words:** Long enough to be meaningful, short enough to scan
- **No tracker noise:** Don't prefix with project codes, parent references, or type
  labels — the tracker handles metadata

#### Description

The description is the contract between the person who defined the work and the person
who will do it. Structure depends on the task type, but every description needs at
minimum:

**Context** — Why this task exists. Connect it to the larger effort. Link to the design
document or technical design if one exists. One or two sentences — enough to orient,
not enough to re-explain everything.

**What to do** — The specific work. Concrete enough that the implementer knows the
scope, abstract enough that they choose the approach. Describe the change, not the
code.

**Acceptance criteria** — How to know it's done. See the dedicated section below.

**References** — Links to design documents, technical designs, relevant code paths,
mockups, or similar implementations. The implementer should find everything they need
without leaving the task.

#### Fields

Set fields based on what you discovered in Step 1. The project configuration tells you
which fields exist, which are required, and what values are valid. Carry over estimates
from the decomposition document if available. Only set fields that the tracker supports
and the project uses — don't invent metadata.

### Step 3: Present the Draft

Show the complete task to the user before creating it. Include all fields you plan to
set, using the actual field names and values from the project configuration:

```markdown
## Task Draft

**Project:** [project name]
**Type:** [value from tracker]

**Title:** [title]

**Description:**
[full description with context, what to do, acceptance criteria, references]

**Fields:**
[list each field you plan to set with its value, based on project config]
```

**Ask the user for approval.** Tasks are visible to the entire team once created. A
wrong task creates noise and confusion. Wait for explicit confirmation.

### Step 4: Create in Tracker

After approval:

1. Create the task using the tracker's API or integration
2. Set all agreed fields
3. Establish relationships between tasks (see below)
4. Report the created task ID and URL back to the user

#### Task Linking

If the tracker's tools support linking between tasks, use them. Tasks relate to each
other in multiple ways — parent-child, blocks/blocked-by, depends-on, relates-to,
duplicates — and a single pair of tasks can have more than one relationship. Create
every relationship that applies.

**Always prefer the tracker's native linking** over mentioning relationships in the
description text. Native links are visible in dedicated UI, enable dependency tracking
and blocking detection, and stay current when tasks move or rename. Description text
becomes stale.

**Fallback:** If the tracker's tools genuinely lack linking capabilities, then
referencing related tasks in the description is acceptable. But this is the exception,
not the default. Check the available tools before falling back to description-based
references.

## Acceptance Criteria

Acceptance criteria are the most important part of a task description after context.
They transform vague intent ("make search faster") into verifiable conditions ("search
returns results within 200ms for queries under 50 characters").

### What Makes Good Criteria

**Testable** — Each criterion has a clear pass/fail outcome. "User experience is
improved" fails this test. "Page loads in under 2 seconds on 3G" passes.

**Outcome-focused** — Describe what the system does, not how it's built. "Search
returns partial matches for inputs of 3+ characters" — not "implement a LIKE query
with wildcard prefix."

**Independent** — Each criterion can be verified on its own. If criterion B can only be
tested after criterion A, consider whether they're really one criterion.

**Measurable** — Quantify when possible. Response times, character limits, item counts,
error rates. Numbers eliminate ambiguity.

### Two Formats

**Rule-oriented (checklist)** — Best for most engineering tasks. Simple, scannable,
directly translatable to test cases:

```markdown
- [ ] Search field appears in the top navigation bar
- [ ] Search triggers on button click or Enter key
- [ ] Input accepts up to 200 characters
- [ ] Results display within 500ms for datasets under 10,000 records
- [ ] Empty query shows recent items instead of empty state
```

**Scenario-oriented (Given/When/Then)** — Best for complex user flows where
preconditions and sequences matter:

```markdown
Given the user is on the search page with an empty query
When they type 3 or more characters
Then results appear as a dropdown below the search field

Given the user has selected a filter
When they clear the search field
Then the filter remains applied and results update accordingly
```

Use rule-oriented by default. Switch to scenario-oriented when the behavior depends on
specific preconditions or multi-step sequences.

### Common Mistakes

**Too vague:** "Works correctly" or "handles edge cases" — what does correctly mean?
Which edge cases?

**Too prescriptive:** "Use a Redis cache with TTL of 300 seconds" — that's
implementation, not acceptance. Say "repeated queries return cached results" and let
the implementer choose the mechanism.

**Missing negative cases:** Only describing the happy path. Include: what happens with
invalid input, empty states, error conditions, permission boundaries.

**Untestable conditions:** "Should be fast" or "user-friendly interface." Replace with
measurable thresholds.

## Task Description Patterns

Different types of work call for different description structures. These patterns
can be combined.

### Pattern 1: Bug Report

For broken functionality. The reader needs to understand what's wrong, how to see it,
and what should happen instead.

```markdown
## Context
[What feature is affected and how it relates to the system]

## Problem
[What's broken — observable symptoms, not root cause speculation]

## Steps to Reproduce
1. [Step one]
2. [Step two]
3. [Step three]

## Expected Behavior
[What should happen]

## Actual Behavior
[What happens instead]

## Acceptance Criteria
- [ ] [Verifiable fix condition]
- [ ] [Regression prevention]
```

Include screenshots, error messages, or log excerpts when they clarify the problem.
Omit when the description is self-explanatory.

### Pattern 2: Implementation Task

For building or changing functionality. The standard pattern — most tasks from a
decomposition document follow this structure.

```markdown
## Context
[Why this task exists, link to design/technical design]

## What to Do
- [Specific work items]

## Acceptance Criteria
- [ ] [Verifiable conditions]

## References
- [Links to design docs, code, similar implementations]
```

### Pattern 3: Investigation Task

For work where the outcome is understanding, not code. Debugging, research, feasibility
analysis.

```markdown
## Context
[What prompted the investigation]

## Symptoms / Evidence
[What was observed — logs, error messages, metrics, user reports]

## Goal
[What answer or decision this investigation should produce]

## Acceptance Criteria
- [ ] Root cause identified and documented
- [ ] Recommended fix or next steps proposed
```

### Pattern 4: Refactoring / Cleanup

For code improvements that don't change behavior. The reader needs to understand what's
being restructured and why, despite no user-visible change.

```markdown
## Context
[What motivates the refactoring — upcoming feature, tech debt, performance]

## What to Do
- [Specific restructuring work]

## Constraints
- [Behavior must not change]
- [Backward compatibility requirements]

## Acceptance Criteria
- [ ] Existing tests pass without modification
- [ ] [Specific structural improvements verifiable in code review]
```

## Writing Rules

Two rules from the decomposition skill apply equally here:

**Descriptions are plans, not reports.** Write every description as if the work has
not started. "Add pagination to the search results" — not "Added pagination" or
"Pagination was implemented." The implementer reads this fresh. Tell them what to do,
not what was done.

**No implementation in descriptions.** Describe WHAT should change and what "done"
looks like. No production code, no function signatures, no class names to create.
Pseudocode is acceptable for complex logic. Configuration samples are acceptable when
configuration is the deliverable.

## Quality Checklist

Before creating a task in the tracker:

- [ ] Title is imperative, specific, and 5-10 words
- [ ] Description includes context linking to the larger effort
- [ ] Work items are concrete but don't prescribe implementation
- [ ] Acceptance criteria are testable with clear pass/fail outcomes
- [ ] Negative cases and error conditions are covered where relevant
- [ ] References link to design docs, technical designs, or relevant code
- [ ] All tracker fields match the project's configuration
- [ ] User approved the draft before creation
- [ ] Task reads as a plan for future work, not a report of past work

## Anti-Patterns

**Title-only tasks:**
"Fix the bug" or "Update the API" with no description. After a day, nobody —
including the author — remembers the context. Every task needs a description.

**Copy-pasted chat messages:**
Dumping a conversation thread into a task description. Chat messages lack structure,
contain tangents, and age poorly. Extract the intent, structure it, and link to the
conversation if someone needs the raw thread.

**Implementation prescriptions:**
"Create a file called cache_handler.go with a struct CacheHandler that has methods
Get and Set." This is code review territory, not task description. Describe the
capability needed, not the code to write.

**Missing acceptance criteria:**
A description that says what to do but never defines done. The implementer finishes
"when it seems right" — which may not match what was intended.

**Stale descriptions:**
Tasks written weeks ago with outdated assumptions. If the context changed between
creation and implementation, update the description. Don't let implementers discover
stale requirements mid-work.

**Relationships in descriptions instead of native links:**
"Subtask of PROJ-456. See also PROJ-123." When the tracker supports linking, use it —
native links are visible in dedicated UI and stay current. Description-based references
are only acceptable when the tracker's tools lack linking capabilities.

## After Completion

When tasks are created, report:
- Created task IDs and URLs
- Any tasks that need manual linking (parent-child, dependencies)
- Remaining untracted items from the decomposition, if any

## Related Skills

- **task-decomposition** — Produces the input for pipeline-mode task creation
- **technical-design** — Source material referenced in task descriptions
- **design-documents** — The origin of the pipeline: problem analysis and solution decision
