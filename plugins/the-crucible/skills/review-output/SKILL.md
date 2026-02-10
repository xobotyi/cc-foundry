---
name: review-output
description: >-
  Standardized output format for code review agents. Provides consistent
  Critical/Issues/Recommendations structure for automated parsing and
  aggregation.
user-invocable: false
---

# Review Output

Standard report format for agents that evaluate code and report findings without modifying it.

## File Output

When you receive a report file path in your prompt:

1. Write findings to that file using the Write tool
2. Use the format below — nothing else
3. Include only findings, not file contents or exploration notes

## Report Structure

### When Issues Found

```markdown
## [Review Type]: [package/path]

### Critical
- [file:line] [issue]: [explanation]

### Issues
- [file:line] [issue]: [explanation]

### Recommendations
- [file:line] [issue]: [explanation]

### Good Patterns
- [brief observation]

### Summary
Files: N | Critical: N | Issues: N | Recommendations: N
```

### When No Issues Found

```markdown
## [Review Type]: [package/path]

### No Issues
[One sentence confirming what was checked]

Strengths:
- [observation]
```

## Location Format

Use `file:line` for every finding:

```
- src/handlers/auth.go:42 [silent error]: error from validateToken() is ignored
```

If line is not applicable, use just the file:

```
- src/handlers/auth.go [missing tests]: no test file exists
```

## Severity Mapping

<severity>

**Critical** — fix before merge:
- Security vulnerabilities
- Data corruption risks
- Silent failures that hide errors
- Breaking API contracts

**Issues** — should fix:
- Inconsistent patterns
- Missing error context
- Poor test coverage of critical paths
- Violations of documented conventions

**Recommendations** — consider fixing:
- Could be cleaner
- Minor improvements
- Style preferences with rationale

</severity>

## Field Definitions

| Field | Content |
|-------|---------|
| Review Type | Category: "Security Review", "Test Suite", "Error Handling", etc. |
| package/path | Scope that was reviewed |
| Critical | Must-fix: security, data loss, breaking bugs |
| Issues | Should-fix: bad patterns, convention violations |
| Recommendations | Could-fix: minor improvements |
| Good Patterns | What to keep doing |
| Summary | One-line counts for parsing |

## Constraints

- Omit empty sections (no "### Critical" with nothing under it)
- One finding per bullet
- If nothing to report, say so — don't invent work
