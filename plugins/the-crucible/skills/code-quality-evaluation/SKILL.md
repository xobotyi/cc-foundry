---
name: code-quality-evaluation
description: >-
  Multi-agent code quality evaluation — orchestrates specialized review agents
  for naming, complexity, comments, tests, error handling, security,
  observability, and documentation. Invoke after completing coding tasks
  or when asked to evaluate code quality.
---

# Code Quality Evaluation

Orchestrate 8 specialized agents for comprehensive code quality evaluation. All agents report
findings — you apply fixes.

## Agents

All agents are **recommendation-only** — they read code and report, never modify.

**Evaluation agents** (run in parallel, background):

| Agent | Focus |
|-------|-------|
| namer | Naming issues: vague, misleading, type-focused identifiers |
| code-simplifier | Complexity: duplication, deep nesting, verbose patterns |
| comment-cleaner | Comment noise, redundancy, missing documentation comments |
| test-reviewer | Test quality, strategy, leanness, locality |
| error-handling-reviewer | Error flow: creation, propagation, handling, silent swallowing |
| security-reviewer | Secrets, injection, input validation, crypto, auth |
| observability-reviewer | Logging, metrics, tracing, context propagation |

**Documentation agent** (runs last, after fixes):

| Agent | Focus |
|-------|-------|
| documenter | Missing, outdated, or insufficient API documentation |

## CRITICAL: Do Not Use TaskOutput

**Never call the `TaskOutput` tool during this workflow.**

How to wait for background agents:

1. Launch agent with `run_in_background=true`
2. Do nothing — literally output nothing and wait
3. System notifies you: "Background task completed"
4. Read the report FILE the agent wrote — not TaskOutput

TaskOutput destroys context efficiency for the entire workflow.

## Workflow

### Phase 0: Setup Reports Directory

Create reports directory inside the target:

```
mkdir -p {target}/.reviews/{timestamp}
```

Reports directory must be inside target — agents can only write within their review scope.

### Phase 1: Evaluate Code (Parallel, Background)

Launch all 7 evaluation agents in parallel:

```
For each agent in [namer, code-simplifier, comment-cleaner,
                   test-reviewer, error-handling-reviewer,
                   security-reviewer, observability-reviewer]:
    Task(agent, prompt="""
    Evaluate {target} and report findings.

    Write findings to: {reports_dir}/{agent}.md
    Do NOT modify any code — only report what should change.
    Do NOT include file contents in the report — only findings.
    """, run_in_background=true)
```

<agent-assumptions>
Communicate these to every agent:
- All tools are functional. Do not make exploratory calls.
- Only call a tool if required to complete the task.
- Focus on high-signal findings. False positives erode trust.
</agent-assumptions>

### Phase 2: Read Reports and Present Findings

After all evaluation agents complete:

1. Read all report files from `{reports_dir}/`
2. Aggregate into summary (Critical / Issues / Recommendations counts)
3. Present findings to user organized by severity
4. Ask user which issues to address

### Phase 3: Apply Fixes

Address findings based on user direction:

1. Fix critical issues first
2. Then issues, then recommendations
3. User may skip categories or individual findings
4. Continue until user says to stop or all addressed

This phase is iterative — fix, verify, repeat.

### Phase 4: Documentation Review (After Fixes)

Only after code fixes are complete, run documenter:

```
Task(documenter, prompt="""
Evaluate API documentation in {target}.

Write findings to: {reports_dir}/documenter.md
Do NOT modify any code — only report what documentation is missing.
Do NOT include file contents in the report — only findings.
""", run_in_background=true)
```

Documentation reviews the fixed code, not the original state. Running it earlier wastes effort on
outdated code.

### Phase 5: Cleanup

After all work complete:

```
rm -rf {reports_dir}
```

Remove the `.reviews/` directory — reports are temporary artifacts.

## Usage

```
Run code quality evaluation on [path]
```

## Constraints

<constraints>
- Create reports directory BEFORE launching any agents
- Reports directory MUST be inside target directory
- Pass reports directory path to EVERY agent in the prompt
- All agents are READ-ONLY — they report, caller fixes
- NEVER use TaskOutput tool — read report FILES directly
- Wait for background agents by doing nothing until notification
- Always cleanup `.reviews/` directory after completion
</constraints>
