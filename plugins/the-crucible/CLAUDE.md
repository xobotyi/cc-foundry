# the-crucible Plugin

Code quality validation pipeline enforcing task completion criteria and orchestrating multi-agent
code evaluation.

## Skills

| Skill | Purpose |
|-------|---------|
| `quality-validation` | Verify task deliverables match original requirements before completion |
| `code-quality-evaluation` | Orchestrate 8 specialized review agents for comprehensive code analysis |
| `review-output` | Standardized report format for review agents (not user-invocable) |

## How It Works

### Two-Level Validation

1. **quality-validation** — Task completion gate. Compares deliverables against original request.
   Applies to code changes, documentation, research, and refactoring tasks. Validates before
   reporting completion.

2. **code-quality-evaluation** — Multi-agent code review pipeline. Runs after quality validation
   for coding tasks, before commit. Eight specialized agents evaluate code in parallel, report
   findings using standardized format, then developer addresses issues.

### Multi-Agent Code Review Pipeline

**Phase 1: Parallel Evaluation**
- 7 agents run in background simultaneously:
  - `namer` — vague, misleading, type-focused identifiers
  - `code-simplifier` — duplication, deep nesting, verbose patterns
  - `comment-cleaner` — comment noise, redundancy, missing doc comments
  - `test-reviewer` — test quality, strategy, leanness, locality
  - `error-handling-reviewer` — error creation, propagation, silent swallowing
  - `security-reviewer` — secrets, injection, validation, crypto, auth
  - `observability-reviewer` — logging, metrics, tracing, context propagation

**Phase 2: Findings Presentation**
- Aggregate reports by severity (Critical / Issues / Recommendations)
- Present to developer for triage

**Phase 3: Apply Fixes**
- Developer addresses findings in priority order
- Iterative fix-verify loop

**Phase 4: Documentation Review**
- `documenter` runs last after code fixes complete
- Evaluates API documentation against final state

**Phase 5: Cleanup**
- Remove temporary `.reviews/` directory

All agents are read-only and write reports to `{target}/.reviews/{timestamp}/`. Developer decides
which findings to address.

## Hooks

| Event | Type | Purpose |
|-------|------|---------|
| `Stop` | `agent` | Automatic quality gate blocking premature task completion |

The Stop hook fires when Claude finishes responding. An agent reads the `quality-validation` skill
criteria and evaluates whether deliverables match the original request. Returns `{"ok": false}`
for incomplete work, forcing continuation. Returns `{"ok": true}` for complete work or non-task
interactions.

The skill is the single source of truth — the hook reads SKILL.md at evaluation time rather than
duplicating validation logic.

**Infinite loop prevention:** Hook checks `stop_hook_active` input flag. When true (already a
follow-up from previous rejection), always approves to prevent loops.

## Relationship to the-blueprint

the-blueprint produces the plan. the-crucible validates the execution.

```
the-blueprint: design → technical design → task decomposition → task creation
the-crucible:  quality-validation → code-quality-evaluation
```

## Conventions

**Report Storage:**
- All review reports written to `{target}/.reviews/{timestamp}/`
- Reports directory must be inside target directory (agent write scope)
- Cleanup reports after completion

**Agent Coordination:**
- Launch background agents with `run_in_background=true`
- Never use TaskOutput tool — read report files directly
- Wait for completion notifications before reading reports
- Pass report file paths in agent prompts

**Review Format:**
- All agents use `review-output` skill for consistent structure
- `file:line` format for all findings
- Severity levels: Critical (must fix) / Issues (should fix) / Recommendations (consider)
