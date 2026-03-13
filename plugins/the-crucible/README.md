# the-crucible

Code quality validation pipeline: task completion checks and multi-agent code evaluation.

## The Problem

Claude finishes a task and reports it complete — but did it actually deliver what was asked? Maybe it solved a slightly
different problem. Maybe it changed 8 files but forgot to update the documentation that the project conventions require.
Maybe the code works but silently swallows errors, has SQL injection vectors, or uses vague names that will confuse the
next developer.

Without systematic validation, "done" is whatever the agent decides it is. Quality checks get skipped under pressure —
exactly when they matter most. And code review requires expertise across multiple dimensions simultaneously: naming,
security, test quality, error handling, observability — no single reviewer consistently covers all of them.

## The Solution

the-crucible provides two levels of validation that work together: task completion checking (quality-validation) and
multi-agent code review (code-quality-evaluation).

### Multi-Agent Code Review

When deeper review is warranted, the code-quality-evaluation skill orchestrates eight specialized agents that examine
code in parallel. Each agent is a focused expert that reads the code, identifies issues in its domain, and reports
findings back. You decide which issues to address.

The agents cover complementary dimensions:

| Agent                       | What it catches                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **namer**                   | Names that mislead: `processData` (what does it process?), `store` for a string, inconsistent terminology across related concepts                       |
| **complexity-reviewer**     | Unnecessary complexity: deep nesting, flag arguments that fork behavior, premature abstractions with one implementation                                 |
| **comment-reviewer**        | Comment problems — and what they signal: section-dividing comments that reveal a function should be split, stale comments that contradict code          |
| **test-reviewer**           | Tests that give false confidence: tautological assertions mirroring production code, mystery guest setups hiding cause-and-effect, flakiness indicators |
| **error-handling-reviewer** | Silent failures: swallowed errors, fire-and-forget async calls that lose errors, resource leaks on error paths, missing error context                   |
| **security-reviewer**       | Vulnerabilities aligned to OWASP: injection, broken access control, IDOR, hardcoded secrets, mass assignment, race conditions, unsafe deserialization   |
| **observability-reviewer**  | Production blind spots: missing logging at boundaries, metric cardinality explosions, broken trace context propagation, sensitive data in telemetry     |
| **docs-auditor**            | Documentation gaps: missing API docs, stale docs that actively mislead, undocumented contracts (preconditions, error conditions, side effects)          |

All agents are read-only — they analyze and report, never modify code. They run as teammates communicating through the
message bus, so findings arrive as structured messages without intermediate file storage.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-crucible
```

## Skills

### quality-validation

Validates task deliverables match original requirements. Applies to any task type — code changes, documentation,
research, refactoring. Invoke manually when you want to verify your work before committing or reporting completion.

Validation varies by task type:

- **Code changes** — run tests if available, trace logic paths, check edge cases and error conditions
- **Documentation** — verify all requested sections present, check logical consistency
- **Research** — confirm question coverage, evidence basis, gaps acknowledged
- **Refactoring** — verify behavior preservation, scope adherence, no regressions

### code-quality-evaluation

Orchestrates eight specialized review agents as a team. Creates a review team, spawns all agents in parallel, aggregates
their findings by severity, and presents them for triage. You choose which issues to fix.

**Use when:** Before committing significant code changes, reviewing pull requests, or evaluating code quality on any
implementation.

## Related Plugins

**the-blueprint** — Produces the plan that the-crucible validates. Blueprint handles design and task decomposition;
crucible validates execution and code quality.

## License

MIT
