# the-crucible Plugin

## Philosophy

The crucible tests what the blueprint designs.

These skills validate completed work at two levels: task validation checks that deliverables match
original requirements, code quality evaluation subjects code to 8 specialized review agents covering
naming, complexity, comments, tests, error handling, security, observability, and documentation.

All review agents are read-only — they report findings without modifying code. The developer decides
which findings to address. This preserves human judgment while automating the tedious parts of
quality review.

## Skills

| Skill | Purpose |
|-------|---------|
| `quality-validation` | Verify task deliverables match original requirements |
| `code-quality-evaluation` | Orchestrate 8 specialized agents for code review |
| `review-output` | Standardized report format shared by all agents (not user-invocable) |

## Skill Flow

```
quality-validation (did you deliver what was asked?)
    ↓
code-quality-evaluation (is what you delivered well-crafted?)
    ↓
  ├── namer
    ├── code-simplifier
    ├── comment-cleaner
    ├── test-reviewer
    ├── error-handling-reviewer
    ├── security-reviewer
    ├── observability-reviewer
    └── documenter (runs last, after fixes)
```

`quality-validation` runs after any task completion.
`code-quality-evaluation` runs after coding tasks, before commit.

## Agents

All agents use sonnet model, read-only tools, and `review-output` skill for consistent report
formatting.

| Agent | Review Type | Focus |
|-------|-------------|-------|
| namer | Naming Review | Vague, misleading, type-focused identifiers |
| code-simplifier | Complexity Review | Duplication, nesting, verbose patterns |
| comment-cleaner | Comment Review | Noise comments, missing doc comments |
| test-reviewer | Test Suite | Strategy, leanness, locality, clarity |
| error-handling-reviewer | Error Handling | Creation, propagation, silent swallowing |
| security-reviewer | Security Review | Secrets, injection, validation, crypto |
| observability-reviewer | Observability | Logging, metrics, tracing, context |
| documenter | Documentation Review | Missing, outdated, insufficient API docs |

## Hooks

| Event | Type | Purpose |
|-------|------|---------|
| `Stop` | `agent` | Automatic quality gate — blocks premature task completion |

The Stop hook fires every time Claude finishes responding. An agent hook reads the
`quality-validation` skill (SKILL.md) and applies its criteria to evaluate whether the deliverable
matches the original request. Returns `{"ok": false, "reason": "..."}` if incomplete, forcing Claude
to continue. Returns `{"ok": true}` for complete work or non-task interactions.

The skill remains the single source of truth — the hook reads it at evaluation time rather than
duplicating criteria in the prompt.

**Infinite loop prevention:** The hook checks `stop_hook_active` in the input. When true (meaning
this is already a follow-up from a previous hook rejection), it always approves to prevent loops.

## Relationship to the-blueprint

the-blueprint produces the plan. the-crucible validates the execution.

```
the-blueprint: design → technical design → task decomposition → task creation
the-crucible:  quality-validation → code-quality-evaluation
```