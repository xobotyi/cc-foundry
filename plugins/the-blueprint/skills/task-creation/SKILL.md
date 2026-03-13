---
name: task-creation
description: >-
  Task creation for issue trackers — structured descriptions, acceptance criteria, field
  categorization, and tracker linking. Invoke whenever task involves creating work items in any
  issue tracker — bugs, features, stories, tasks, or any tracked work from standalone requests
  or decomposition documents.
---

# Task Creation

Create well-formed tasks in an issue tracker. The input is either a decomposition document (from the pipeline) or a
standalone request from a user. The output is a tracked task with enough context for an implementer to start work
without asking questions.

## Why Task Creation Matters

A task is the handoff point — where planning ends and implementation begins. The sweet spot is a description that
communicates intent, scope, and completion criteria without dictating how to get there. Tasks also serve as
institutional memory: months later, the description and linked design documents reconstruct the reasoning behind a
change.

## When to Use

**From the pipeline:** After task-decomposition produces a decomposition document with task descriptions, this skill
handles creating those tasks in the issue tracker with proper fields, categorization, and linking.

**Standalone:** When a user requests a task directly — "create a bug for the pagination issue" or "add a task to upgrade
the dependency." No decomposition document needed; gather context from the conversation.

## Creating a Task

### Step 1: Gather Context

This is an active discovery step — use available tools, don't rely on inference.

1. **Identify the tracker** — Check which task tracking tools are available (MCP servers, APIs, CLI integrations). If
   multiple trackers are present, ask the user which one to use. Don't assume.
2. **Discover the project** — Use the tracker's project listing or configuration tools to find the target project. Infer
   from conversation context (directory, subsystem, prior tasks) when possible, but validate against the tracker. If
   ambiguous, ask the user.
3. **Explore project configuration** — Query the tracker for the project's field setup:
   - What fields exist (type, priority, severity, component, sprint, etc.)
   - Which fields are required vs optional
   - What values are valid for each field (the tracker defines these, not this skill) Don't hardcode assumptions — field
     names, types, and valid values differ across projects and trackers.
4. **Determine task type** — Based on the user's intent and the project's available types, select the closest match:
   - Something is broken → bug/defect type
   - Implementation work → task/story type
   - New capability → feature/story type The exact type name comes from the tracker, not from a universal list.
5. **Identify source material** — Link to decomposition document, design document, or technical design if available. If
   standalone, the conversation is the source.

### Step 2: Draft the Task

1. **Write the title.** The title is what people see in lists, boards, and notifications:
   - **Imperative mood:** "Add pagination to search results" not "Pagination was added"
   - **Specific:** "Fix negative offset in paginator navigation" not "Fix pagination bug"
   - **5-10 words:** Long enough to be meaningful, short enough to scan
   - **No tracker noise:** Don't prefix with project codes, parent references, or type labels — the tracker handles
     metadata

2. **Write the description.** Structure depends on task type, but every description needs:

   **Context** — Why this task exists. Connect it to the larger effort. Link to the design document or technical design
   if one exists. One or two sentences.

   **What to do** — The specific work. Concrete enough that the implementer knows the scope, abstract enough that they
   choose the approach. Describe the change, not the code.

   **Acceptance criteria** — How to know it's done. See the dedicated section below.

   **References** — Links to design documents, technical designs, relevant code paths, mockups, or similar
   implementations. Only external resources belong here — never references to other tasks in the same tracker.
   Inter-task relationships (blocks, depends-on, parent-child, relates-to) are handled exclusively through native
   tracker links in Step 4.

   Every task needs a description. Extract intent, structure it, and link to the conversation if someone needs the raw
   thread — never copy-paste chat messages directly.

3. **Set fields** based on what you discovered in Step 1. Carry over estimates from the decomposition document if
   available. Only set fields that the tracker supports and the project uses — don't invent metadata.

### Step 3: Present the Draft

1. Show the complete task to the user before creating it. Include all fields using actual field names and values from
   the project configuration:

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

2. Wait for explicit approval. Tasks are visible to the entire team once created — a wrong task creates noise and
   confusion.
3. If the user requests changes, revise and present again.

### Step 4: Create in Tracker

After approval:

1. Create the task using the tracker's API or integration.
2. Set all agreed fields.
3. Establish relationships between tasks:
   - Use the tracker's native linking for all relationships (parent-child, blocks/blocked-by, depends-on, relates-to,
     duplicates). A single pair of tasks can have more than one relationship — create every one that applies.
   - Always prefer native links over description text. Native links are visible in dedicated UI, enable dependency
     tracking, and stay current when tasks move or rename.
   - Fallback to description-based references only if the tracker's tools genuinely lack linking capabilities. Check the
     available tools first.
4. Report the created task ID and URL back to the user.

## Acceptance Criteria

Acceptance criteria are the most important part of a task description after context. They transform vague intent ("make
search faster") into verifiable conditions ("search returns results within 200ms for queries under 50 characters").

### What Makes Good Criteria

**Testable** — Each criterion has a clear pass/fail outcome. "User experience is improved" fails this test. "Page loads
in under 2 seconds on 3G" passes.

**Outcome-focused** — Describe what the system does, not how it's built. "Search returns partial matches for inputs of
3+ characters" — not "implement a LIKE query with wildcard prefix."

**Independent** — Each criterion can be verified on its own. If criterion B can only be tested after criterion A,
consider whether they're really one criterion.

**Measurable** — Quantify when possible. Response times, character limits, item counts, error rates. Numbers eliminate
ambiguity. Replace vague conditions like "should be fast" or "user-friendly interface" with measurable thresholds.

### Two Formats

**Rule-oriented (checklist)** — Best for most engineering tasks. Simple, scannable, directly translatable to test cases:

```markdown
- [ ] Search field appears in the top navigation bar
- [ ] Search triggers on button click or Enter key
- [ ] Input accepts up to 200 characters
- [ ] Results display within 500ms for datasets under 10,000 records
- [ ] Empty query shows recent items instead of empty state
```

**Scenario-oriented (Given/When/Then)** — Best for complex user flows where preconditions and sequences matter:

```markdown
Given the user is on the search page with an empty query
When they type 3 or more characters
Then results appear as a dropdown below the search field

Given the user has selected a filter
When they clear the search field
Then the filter remains applied and results update accordingly
```

Use rule-oriented by default. Switch to scenario-oriented when the behavior depends on specific preconditions or
multi-step sequences.

### Common Mistakes

**Too vague:** "Works correctly" or "handles edge cases" — what does correctly mean? Which edge cases? Every criterion
needs a clear pass/fail outcome.

**Too prescriptive:** "Use a Redis cache with TTL of 300 seconds" — that's implementation, not acceptance. Say "repeated
queries return cached results" and let the implementer choose the mechanism.

**Missing negative cases:** Only describing the happy path. Include: what happens with invalid input, empty states,
error conditions, permission boundaries.

## Task Description Patterns

Different types of work call for different description structures. These patterns can be combined.

### Pattern 1: Bug Report

For broken functionality. The reader needs to understand what's wrong, how to see it, and what should happen instead.

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

Include screenshots, error messages, or log excerpts when they clarify the problem. Omit when the description is
self-explanatory.

### Pattern 2: Implementation Task

For building or changing functionality. The standard pattern — most tasks from a decomposition document follow this
structure.

```markdown
## Context
[Why this task exists, link to design/technical design]

## What to Do
- [Specific work items]

## Acceptance Criteria
- [ ] [Verifiable conditions]

## References
- [Links to design docs, code paths, mockups — never other tasks]
```

### Pattern 3: Investigation Task

For work where the outcome is understanding, not code. Debugging, research, feasibility analysis.

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

For code improvements that don't change behavior. The reader needs to understand what's being restructured and why,
despite no user-visible change.

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

## Example: Standalone Task Creation

**User request:** "Create a bug for the search — it returns 500 when the query has special characters like & or %"

**Step 1 (Gather Context):** Query the tracker for the project's field configuration. Discover available types (Bug,
Task, Story), required fields (Priority, State), and valid values.

**Step 2 (Draft):**

```markdown
## Task Draft

**Project:** SEARCH
**Type:** Bug
**Priority:** High

**Title:** Fix 500 error on search queries containing special characters

**Description:**

## Context
The search API returns HTTP 500 when queries contain URL-significant characters (& , %, =). This
affects all clients using the search endpoint.

## Problem
Special characters in the search query are passed to the backend unescaped, causing the query parser
to fail with an unhandled exception.

## Steps to Reproduce
1. Open the search page
2. Enter a query containing `&` or `%` (e.g., "R&D budget")
3. Submit the search

## Expected Behavior
Search returns results matching the literal query text.

## Actual Behavior
HTTP 500 response. No results displayed.

## Acceptance Criteria
- [ ] Search queries containing &, %, =, and + return correct results
- [ ] Invalid UTF-8 sequences return HTTP 400 with a descriptive error message
- [ ] Existing search functionality is unaffected (run search test suite)
```

**Step 3 (Present):** Show draft to user, wait for approval.

**Step 4 (Create):** Create in tracker, set fields, link to parent epic via native tracker link if applicable, report
task ID and URL.

## Writing Rules

Two rules from the decomposition skill apply equally here:

**Descriptions are plans, not reports.** Write every description as if the work has not started. "Add pagination to the
search results" — not "Added pagination" or "Pagination was implemented." The implementer reads this fresh. Tell them
what to do, not what was done.

**No implementation in descriptions.** Describe WHAT should change and what "done" looks like. No production code, no
function signatures, no class names to create. Pseudocode is acceptable for complex logic. Configuration samples are
acceptable when configuration is the deliverable. Describe the capability needed, not the code to write.

## Application

**When creating:** Apply all rules silently. Follow the workflow steps, discover project configuration before drafting,
write titles in imperative mood, structure descriptions with Context/What to do/Acceptance criteria/References, and use
native tracker links for all inter-task relationships. Do not narrate which rules you are following.

**When reviewing:** Evaluate existing tasks against the Quality Checklist. For each violation, cite the specific rule,
quote the problematic section, and show the fix inline. Common review findings:

- Title is vague or past-tense ("Fixed X" instead of "Fix X")
- Missing or untestable acceptance criteria
- Description contains implementation prescriptions (code, class names, function signatures)
- Inter-task relationships written in description text instead of native tracker links
- References section lists other tasks instead of external resources (design docs, code)
- Fields set with values not matching the project's configuration

## After Completion

When all tasks are created:

- Report created task IDs and URLs to the user.
- Flag any tasks that need manual linking not supported by the tracker's tools.
- If working from a decomposition document, list any remaining items not yet created.
- Update the decomposition document if task descriptions changed during creation.

## Related Skills

- **task-decomposition** — Produces the input for pipeline-mode task creation
- **technical-design** — Source material referenced in task descriptions
- **design-documents** — The origin of the pipeline: problem analysis and solution decision

## Quality Checklist

Before creating a task in the tracker:

- [ ] Title is imperative, specific, and 5-10 words
- [ ] Description includes context linking to the larger effort
- [ ] Work items are concrete but don't prescribe implementation
- [ ] Acceptance criteria are testable with clear pass/fail outcomes
- [ ] Negative cases and error conditions are covered where relevant
- [ ] References link to external resources (design docs, code) — no task-to-task refs
- [ ] Inter-task relationships use native tracker links, not description text
- [ ] All tracker fields match the project's configuration
- [ ] User approved the draft before creation
- [ ] Task reads as a plan for future work, not a report of past work
