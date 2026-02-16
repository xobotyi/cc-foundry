---
name: quality-validation
description: >-
  Task completion validation — verify deliverables match original requirements. Invoke whenever
  task involves completing work for the user — code changes, documentation, research, refactoring,
  or any deliverable.
---

# Quality Validation

Compare deliverable against intake. The user asked for X — did you deliver X?

This skill applies after task execution, before reporting completion. Partial completion is not
completion.

## Validation by Task Type

### Code Changes

<code-validation>

**If tests exist and you can run them:**

1. Run the test suite (or relevant subset)
2. Verify no regressions introduced
3. Confirm new behavior is covered by tests

**If no tests or cannot run:**

1. Re-read the changed code
2. Trace the logic path for the requested change
3. Identify edge cases — are they handled?
4. Check error conditions — what happens when things fail?

**Always check:**

- Does the change do what was asked? (not more, not less)
- Are there obvious bugs visible in the diff?
- Does it follow existing patterns in the codebase?

</code-validation>

### Documentation / Design Tasks

<doc-validation>

1. Re-read the original request — what did the user actually ask for?
2. Compare against deliverable:
   - Are all requested sections present?
   - Does the structure match what was asked?
   - Is the level of detail appropriate?
3. Check logical consistency:
   - Do the parts fit together?
   - Are there contradictions?
   - Do conclusions follow from premises?
4. Check completeness:
   - Are there gaps or "TODO" placeholders?
   - Would someone else understand this without follow-up questions?

</doc-validation>

### Research / Analysis Tasks

<research-validation>

1. **Question coverage** — did you answer what was asked?
2. **Evidence basis** — are claims supported by what you found?
3. **Gaps acknowledged** — did you note what you couldn't find or verify?
4. **Actionable output** — can the user do something with this information?

</research-validation>

### Refactoring / Cleanup Tasks

<refactor-validation>

1. **Behavior preservation** — does it still do what it did before?
2. **Scope adherence** — did you change only what was requested?
3. **No regressions** — run tests if available
4. **Improvement achieved** — is the stated goal (readability, performance, etc.) actually better?

</refactor-validation>

## Common Validation Failures

<failures>

**Solved a different problem:**
User asked for X, you delivered Y because Y seemed better.
Fix: deliver X first, then suggest Y as improvement.

**Incomplete execution:**
Started the task but didn't finish all parts.
Fix: re-read request, check each requirement.

**Untested assumptions:**
"This should work" without verification.
Fix: actually test, run, or trace through the change.

**Scope creep unacknowledged:**
Did extra work without noting it.
Fix: clearly state what was requested vs. what was added.

</failures>

## When Validation Reveals Problems

1. **Don't report as complete** — partial completion is not completion
2. **Fix if possible** — address the gap before reporting
3. **Report honestly if blocked** — explain what's done, what isn't, and why

## Pre-Completion Checklist

Before reporting task complete:

- [ ] Re-read the original request
- [ ] Identify what "done" means for this specific task
- [ ] Compare deliverable against that definition
- [ ] For code: run tests or manually trace logic
- [ ] For docs: check logical consistency and completeness
- [ ] Note any deviations or partial completions honestly
