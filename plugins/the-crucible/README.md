# the-crucible

Code quality validation pipeline: task completion checks and multi-agent code evaluation.

## The Problem

**You finish a task, report it complete, and discover later you forgot a requirement.** Or the code
works but violates project conventions. Or tests pass but error handling silently swallows
failures. Manual validation is tedious and inconsistent — you skip it when under pressure, exactly
when quality matters most.

Without systematic validation, "done" becomes subjective. Does done mean "compiles"? "Tests pass"?
"Matches the original request"? "Follows security best practices"? Each developer defines it
differently, leading to incomplete deliverables and preventable defects.

## The Solution

the-crucible enforces completion criteria and automates comprehensive code review through
specialized agents.

**quality-validation** runs before task completion. It compares your deliverable against the
original request — did you actually deliver what was asked? For code, it runs tests or traces
logic. For documentation, it checks completeness and consistency. Partial completion is not
completion.

**code-quality-evaluation** orchestrates eight specialized review agents that examine code in
parallel across naming, complexity, comments, tests, error handling, security, observability, and
documentation. All agents are read-only and report findings without modifying code. You decide
which issues to address.

A Stop hook automatically validates task completion before Claude reports work as done. If
incomplete, Claude continues working. This prevents premature completion while allowing normal
conversation to flow uninterrupted.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-crucible
```

## Skills

### quality-validation

Validates task deliverables match original requirements before completion. Applies to any task
involving work for the user — code changes, documentation, research, refactoring.

**Use when:** Before reporting any task as complete. The Stop hook invokes this automatically, but
you can call it manually for explicit validation.

Validation logic varies by task type:
- **Code changes** — run tests if available, otherwise trace logic paths and check edge cases
- **Documentation** — verify all requested sections present, check logical consistency and
  completeness
- **Research** — confirm question coverage, evidence basis, gaps acknowledged
- **Refactoring** — verify behavior preservation, scope adherence, no regressions

### code-quality-evaluation

Orchestrates eight specialized review agents for comprehensive code analysis. Runs in phases:
parallel evaluation → findings presentation → apply fixes → documentation review → cleanup.

**Use when:**
- Before committing code changes
- Reviewing pull requests
- Evaluating code quality for any implementation
- After completing coding tasks but before final commit

**Review dimensions:**
- **namer** — identifiers that fail to reveal behavior and purpose
- **code-simplifier** — duplication, deep nesting, verbose patterns
- **comment-cleaner** — comment noise, redundancy, missing doc comments
- **test-reviewer** — test quality, strategy, leanness, locality, clarity
- **error-handling-reviewer** — error creation, propagation, handling, silent swallowing
- **security-reviewer** — secrets, injection, input validation, crypto, authentication
- **observability-reviewer** — logging, metrics, tracing, context propagation
- **documenter** — missing, outdated, or insufficient API documentation

All agents write findings to `{target}/.reviews/{timestamp}/` directory. Reports use standardized
format with Critical / Issues / Recommendations severity levels and `file:line` locations. The
reports directory is automatically cleaned up after review completion.

## Related Plugins

**the-blueprint** — Produces the plan that the-crucible validates. Blueprint handles design and
task decomposition; crucible validates execution and code quality.

## License

MIT
