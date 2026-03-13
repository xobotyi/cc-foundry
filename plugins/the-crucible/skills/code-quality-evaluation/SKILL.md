---
name: code-quality-evaluation
description: >-
  Multi-agent code quality evaluation — orchestrates specialized review agents across naming,
  complexity, tests, security, and documentation dimensions. Invoke whenever task involves any
  interaction with code quality — reviewing implementations, evaluating pull requests, or
  assessing code before commits.
---

# Code Quality Evaluation

Orchestrate 8 specialized teammate agents for comprehensive code quality evaluation. Each agent is a plugin subagent —
spawn them as teammates and aggregate their findings.

## Agents

All agents are **read-only** — they analyze code and report findings via SendMessage.

| Subagent Type                          | Focus                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `the-crucible:namer`                   | Naming: misleading, vague, type-encoded, scope-mismatched identifiers      |
| `the-crucible:complexity-reviewer`     | Complexity: nesting, flag arguments, duplication, premature abstraction    |
| `the-crucible:comment-reviewer`        | Comments: noise, staleness, refactoring signals, commented-out code        |
| `the-crucible:test-reviewer`           | Tests: false confidence, implementation coupling, flakiness, coverage gaps |
| `the-crucible:error-handling-reviewer` | Errors: silent swallowing, context loss, resource leaks, async error loss  |
| `the-crucible:security-reviewer`       | Security: injection, access control, secrets, crypto, data exposure        |
| `the-crucible:observability-reviewer`  | Observability: logging, metrics, tracing, cardinality, context propagation |
| `the-crucible:docs-auditor`            | Documentation: missing API docs, stale docs, contract gaps                 |

## Workflow

### Phase 0: Create Team

Create a review team and 8 tasks — one per agent:

```
TeamCreate(name="code-review")

For each agent in the table above:
    TaskCreate(team_name="code-review", title="{agent_name}", description="Review {target}")
```

### Phase 1: Spawn Reviewers

Spawn all 8 agents in parallel as teammates using their `subagent_type`. The agent files define each reviewer's
expertise, patterns, and constraints — the `prompt` parameter only needs to specify the target and team context:

```
For each agent:
    Agent(
        subagent_type="{subagent_type}",
        prompt="Review all code in {target}. Send your findings to the leader via SendMessage.",
        team_name="code-review",
        task_id="{task_id}"
    )
```

### Phase 2: Aggregate and Present Findings

As teammates send messages, aggregate findings:

1. Collect all messages from the 8 reviewers
2. Deduplicate overlapping findings across agents
3. Present to user organized by severity (Critical > Issues > Recommendations)
4. Ask user which issues to address

### Phase 3: Apply Fixes

Address findings based on user direction:

1. Fix critical issues first, then issues, then recommendations
2. User may skip categories or individual findings
3. Continue until user says to stop or all addressed

## Usage

```
Run code quality evaluation on src/auth/
```

**Example interaction flow:**

1. User: "Run code quality evaluation on src/auth/"
2. Create team "code-review" with 8 tasks
3. Spawn 8 teammate agents by subagent_type
4. Teammates send findings via messages
5. Aggregate and present: "Found 2 critical, 5 issues, 3 recommendations. Which to address?"
6. User picks categories or specific findings to fix
7. Apply fixes iteratively

## Constraints

<constraints>
- Create the team and all tasks BEFORE spawning any agents
- Use `subagent_type` to spawn agents — their `.md` files define review behavior
- The `prompt` parameter provides only the target path and team instructions
- All agents are READ-ONLY — they report, the leader fixes
- Agents communicate via SendMessage — no file-based reports
- Deduplicate findings that overlap across agents before presenting
- Present findings organized by severity, not by agent
</constraints>
