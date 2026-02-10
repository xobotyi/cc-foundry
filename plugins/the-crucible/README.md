# the-crucible

Code quality validation pipeline: task completion checks and multi-agent code evaluation.

Validates completed work at two levels — did you deliver what was asked, and is what you delivered
well-crafted? Eight specialized agents evaluate code across naming, complexity, comments, tests,
error handling, security, observability, and documentation.

## Skills

- **quality-validation** — Post-task completion check. Compares deliverables against original
  requirements. Applies to code, documentation, research, and refactoring tasks.
- **code-quality-evaluation** — Orchestrates 8 specialized review agents in parallel. Agents report
  findings using standardized format; developer decides which to address. Phased execution: parallel
  evaluation → fix → documentation review → cleanup.

## Agents

| Agent | Focus |
|-------|-------|
| namer | Identifiers that fail to reveal behavior and purpose |
| code-simplifier | Duplication, deep nesting, verbose patterns |
| comment-cleaner | Comment noise, redundancy, missing documentation |
| test-reviewer | Test quality, strategy, leanness |
| error-handling-reviewer | Error creation, propagation, handling |
| security-reviewer | Secrets, injection, input validation, crypto |
| observability-reviewer | Logging, metrics, tracing |
| documenter | Missing or insufficient API documentation |

All agents are read-only and recommendation-only.

## Hooks

- **Stop** — Automatic quality gate. When Claude finishes responding, an agent hook evaluates whether
  the deliverable matches the original request. If incomplete, Claude continues working. Skips
  validation for simple Q&A and conversations. Uses `stop_hook_active` to prevent infinite loops.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-crucible
```
