# the-crucible Plugin

Code quality validation pipeline enforcing task completion criteria and orchestrating multi-agent
code evaluation.

## Skills

| Skill | Purpose |
|-------|---------|
| `quality-validation` | Verify task deliverables match original requirements before completion |
| `code-quality-evaluation` | Orchestrate 8 specialized review agents for comprehensive code analysis |

## Agents

The plugin provides 8 specialized review agents, each a standalone subagent definition. All are
read-only (Read, Grep, Glob, SendMessage only) and run on sonnet. The code-quality-evaluation
skill orchestrates them as a team.

| Agent | Focus |
|-------|-------|
| `namer` | Identifier naming: misleading, vague, type-encoded, scope-mismatched names |
| `complexity-reviewer` | Code complexity: nesting, flag arguments, duplication, premature abstraction |
| `comment-reviewer` | Comment quality: noise, staleness, refactoring signals, commented-out code |
| `test-reviewer` | Test quality: false confidence, implementation coupling, flakiness, coverage gaps |
| `error-handling-reviewer` | Error flow: silent swallowing, context loss, resource leaks, async error loss |
| `security-reviewer` | Security: injection, access control, secrets, crypto, data exposure (OWASP-aligned) |
| `observability-reviewer` | Observability: structured logging, metrics cardinality, tracing, context propagation |
| `docs-auditor` | Documentation: missing API docs, stale docs, contract gaps |

## How It Works

### Two-Level Validation

1. **quality-validation** — Task completion gate. Compares deliverables against original request.
   Applies to code changes, documentation, research, and refactoring tasks. Validates before
   reporting completion.

2. **code-quality-evaluation** — Multi-agent code review pipeline. Runs after quality validation
   for coding tasks, before commit. Eight specialized agents evaluate code in parallel, report
   findings via the message bus, then developer addresses issues.

### Multi-Agent Code Review Pipeline

The pipeline uses teammate agents communicating through the message bus. No file-based reports,
no intermediate storage — agents send findings directly to the leader.

**Phase 0: Team Setup**
- Create a "code-review" team with 8 tasks (one per agent)

**Phase 1: Parallel Evaluation**
- 8 teammate agents spawn simultaneously via their `subagent_type`
- Agent `.md` files define review expertise, patterns to detect, and false-positive prevention
- The `prompt` parameter only specifies the target path

**Phase 2: Findings Presentation**
- Aggregate messages by severity (Critical / Issues / Recommendations)
- Deduplicate overlapping findings across agents
- Present to developer for triage

**Phase 3: Apply Fixes**
- Developer addresses findings in priority order
- Iterative fix-verify loop

## Hooks

| Event | Type | Purpose |
|-------|------|---------|
| `Stop` | `prompt` | Triggers self-evaluation before task completion |

The Stop hook uses a **prompt hook on haiku** as a lightweight classifier. It reads
`last_assistant_message` and classifies it as either task completion or conversation. For task
completion, it returns `{"ok": false}` with a self-evaluation prompt that forces the **main
agent** — which has full conversation context — to compare its deliverable against the original
request before stopping.

This design exploits a key insight: the main agent already has everything needed to evaluate
completeness (full conversation history, file access, test runners). It just needs a nudge to
pause and check. The hook provides that nudge without trying to be the evaluator itself.

**How it works:**
1. Claude finishes responding → Stop hook fires
2. Haiku classifies `last_assistant_message` as task completion or conversation (15s timeout)
3. If conversation → `{"ok": true}` → Claude stops normally
4. If task completion → `{"ok": false}` with a reason prompting the main agent to:
   a. Invoke the **quality-validation** skill to verify the deliverable matches the request
   b. Assess whether the changes warrant the full **code-quality-evaluation** pipeline
      (8-agent review) based on scope, risk, and complexity
5. On second pass, `stop_hook_active` is true → `{"ok": true}` → prevents infinite loops

The hook does not embed evaluation logic — it delegates to the skills. The main agent decides
which level of validation is appropriate given its full context.

## Relationship to the-blueprint

the-blueprint produces the plan. the-crucible validates the execution.

```
the-blueprint: design → technical design → task decomposition → task creation
the-crucible:  quality-validation → code-quality-evaluation
```

## Conventions

**Agent Design:**
- Agent behavior is defined in `agents/*.md` files — these are the source of truth
- SKILL.md orchestrates agents, it does not duplicate their prompts
- All agents are read-only: tools limited to Read, Grep, Glob, SendMessage
- All agents run on sonnet model

**Agent Coordination:**
- Use TeamCreate + TaskCreate to set up review teams
- Spawn agents via `subagent_type` with `team_name` parameter
- Agents communicate via SendMessage — no file-based reports
- Leader aggregates findings from messages

**Review Quality:**
- Each agent has specific "Look for" patterns and "Skip" lists to prevent false positives
- Severity levels: Critical (must fix) / Issues (should fix) / Recommendations (consider)
- Deduplicate overlapping findings across agents before presenting to user
