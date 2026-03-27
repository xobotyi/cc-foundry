# Subagent Patterns

Common patterns and real-world examples for effective subagent design.

---

## Table of Contents

- [Architecture Patterns](#architecture-patterns)
- [Example Agents](#example-agents)
- [Human-in-the-Loop Patterns](#human-in-the-loop-patterns)
- [Multi-Agent Coordination](#multi-agent-coordination)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Architecture Patterns

### Single-Purpose Agents

Each agent does ONE thing well.

```
code-reviewer    → Reviews code quality
security-auditor → Checks for vulnerabilities
test-runner      → Executes and analyzes tests
debugger         → Diagnoses and fixes issues
```

**Benefits:**

- Clear triggers
- Focused prompts
- Predictable behavior

**Anti-pattern:** Swiss Army knife agent that "helps with everything."

### Pipeline Pattern

Chain agents for complex workflows (PM → Architect → Implementer).

```
1. pm-spec         → Writes requirements, asks questions
2. architect       → Validates design, produces ADR
3. implementer     → Writes code, runs tests
```

**Handoff mechanism:**

```markdown
## Status Management
- Set status to READY_FOR_ARCH when spec complete
- Architect picks up items with READY_FOR_ARCH status
- Set status to READY_FOR_BUILD when ADR complete
```

Use hooks to suggest next steps:

```yaml
# In settings.json
hooks:
  SubagentStop:
    - hooks:
        - type: command
          command: "./scripts/suggest-next-agent.sh"
```

### Parallel Research

Spawn multiple agents to investigate independently.

```
Research authentication, database, and API modules in parallel
```

**Main agent delegates:**

```
Task(Explore) → auth module
Task(Explore) → database module
Task(Explore) → API module
```

Each returns a summary; main agent synthesizes.

**Caution:** Many parallel agents returning detailed results can consume significant context. Design agents to return
concise summaries.

### Master-Clone Pattern

Use general-purpose clones instead of specialized agents.

```
Main agent → Task(general-purpose) → Clone handles subtask
         → Task(general-purpose) → Another clone
```

**Benefits:**

- Clones inherit full context from CLAUDE.md
- Main agent decides delegation dynamically
- No need to predefine specialized agents

**When to use:**

- Tasks vary widely
- Can't predict specializations needed
- Want maximum flexibility

**When to use specialized agents instead:**

- Consistent task types
- Need strict tool restrictions
- Want optimized prompts for domain

### Read-Only Explorer

Exploration agent that cannot modify files.

```yaml
---
name: codebase-explorer
description: "Explores and explains codebase structure. Use for understanding
  code, finding files, or answering questions about the codebase."
tools: Read, Grep, Glob, Bash
permissionMode: plan
---

=== CRITICAL: READ-ONLY MODE ===
You are STRICTLY PROHIBITED from:
- Creating new files
- Modifying existing files
- Running commands that change state

Your role is EXCLUSIVELY to search and analyze existing code.
```

### Domain Expert

Agent specialized in a technology/domain.

```yaml
---
name: postgres-expert
description: "PostgreSQL specialist for query optimization, schema design,
  and database performance. Use when working with .sql files or database issues."
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a PostgreSQL expert with deep knowledge of:
- Query optimization and EXPLAIN ANALYZE
- Index design and maintenance
- Schema normalization
- Performance tuning
- pg_stat views and monitoring

When asked about database issues:
1. Understand the problem context
2. Analyze relevant SQL/schemas
3. Provide specific, actionable recommendations
4. Include example queries when helpful
```

## Example Agents

These examples demonstrate effective prompt structure. Apply `prompt-engineering` techniques: numbered steps,
checklists, explicit output format, and XML tags for complex inputs.

### Code Reviewer

```yaml
---
name: code-reviewer
description: "Expert code review specialist. Proactively reviews code for
  quality, security, and maintainability. Use immediately after writing
  or modifying code."
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer ensuring high standards of code quality.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code is clear and readable
- Functions and variables are well-named
- No duplicated code
- Proper error handling
- No exposed secrets or API keys
- Input validation implemented
- Good test coverage
- Performance considerations addressed

Provide feedback organized by priority:
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)

Include specific examples of how to fix issues.
```

### Debugger

```yaml
---
name: debugger
description: "Debugging specialist for errors, test failures, and unexpected
  behavior. Use proactively when encountering any issues."
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger specializing in root cause analysis.

When invoked:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate the failure location
4. Implement minimal fix
5. Verify solution works

Debugging process:
- Analyze error messages and logs
- Check recent code changes
- Form and test hypotheses
- Add strategic debug logging
- Inspect variable states

For each issue, provide:
- Root cause explanation
- Evidence supporting the diagnosis
- Specific code fix
- Testing approach
- Prevention recommendations

Focus on fixing the underlying issue, not the symptoms.
```

### Security Auditor

```yaml
---
name: security-auditor
description: "Security vulnerability scanner for code and configurations.
  Use proactively after changes to auth, API, or data handling code."
tools: Read, Grep, Glob
model: opus
permissionMode: plan
---

You are a security specialist performing vulnerability assessment.

=== READ-ONLY MODE ===
Do NOT modify any files. Report findings only.

Security checklist:
- [ ] Authentication/authorization flaws
- [ ] Injection vulnerabilities (SQL, XSS, command)
- [ ] Sensitive data exposure
- [ ] Security misconfigurations
- [ ] Insecure dependencies
- [ ] Cryptographic issues
- [ ] Logging/monitoring gaps

For each vulnerability:
- Severity: Critical / High / Medium / Low
- Location: File and line number
- Description: What the vulnerability is
- Impact: What could happen if exploited
- Remediation: Specific fix with code example

Output format:
## Critical
- [Vulnerability] at [location]: [description]
  Impact: [impact]
  Fix: [remediation]

## High
...
```

### Test Runner

```yaml
---
name: test-runner
description: "Executes tests and analyzes results. Use proactively after
  writing or modifying code to verify correctness."
tools: Bash, Read, Grep, Glob
---

You are a testing specialist ensuring code quality through comprehensive testing.

When invoked:
1. Identify the test framework and commands
2. Run the relevant test suite
3. Analyze results
4. Report findings

Test execution guidelines:
- Run tests related to changed files first
- Capture full output including stack traces
- Note flaky tests vs. consistent failures

Report format:
## Test Results
- Passed: X
- Failed: Y
- Skipped: Z

## Failures
### [Test Name]
- Location: [file:line]
- Error: [message]
- Likely cause: [analysis]
- Suggested fix: [recommendation]

## Coverage Notes
[If coverage data available]
```

### Documentation Writer

```yaml
---
name: doc-writer
description: "Technical documentation specialist. Use when creating or
  updating README, API docs, or code documentation."
tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

You are a technical writer creating clear, accurate documentation.

Documentation principles:
- Start with the "why" before the "how"
- Use concrete examples
- Keep language simple and direct
- Structure for scannability (headers, lists)
- Include code samples that actually work

When documenting code:
1. Read the code to understand functionality
2. Identify the audience (users vs. developers)
3. Draft documentation following conventions
4. Include examples and edge cases
5. Review for accuracy and completeness

Output should be:
- Accurate (matches actual behavior)
- Complete (covers important use cases)
- Clear (understandable by target audience)
- Consistent (follows project conventions)
```

### Database Query Validator

```yaml
---
name: db-reader
description: "Execute read-only database queries. Use when analyzing data
  or generating reports. Cannot modify data."
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---

You are a database analyst with READ-ONLY access.

Execute SELECT queries to answer questions about the data.

When asked to analyze data:
1. Identify which tables contain relevant data
2. Write efficient SELECT queries with appropriate filters
3. Present results clearly with context

You CANNOT modify data. If asked to INSERT, UPDATE, DELETE, or modify
schema, explain that you only have read access and suggest alternatives.

Query guidelines:
- Use appropriate indexes
- Limit result sets
- Include comments for complex queries
- Format output for readability
```

Hook script (`./scripts/validate-readonly-query.sh`):

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -iE '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b' > /dev/null; then
  echo "Blocked: Write operations not allowed. Use SELECT queries only." >&2
  exit 2
fi

exit 0
```

## Human-in-the-Loop Patterns

### Approval Gates

Hook suggests next step; human approves:

```bash
# Hook prints suggestion
echo "Use the architect-review subagent on 'feature-x'."
# Human copies and pastes to approve
```

### Status-Based Workflow

```markdown
## Queue File: enhancements/_queue.json
{
  "feature-a": "READY_FOR_ARCH",
  "feature-b": "READY_FOR_BUILD",
  "feature-c": "DONE"
}
```

Agents check status before starting; update status when done.

### Review Checkpoints

```markdown
## Pre-Implementation Checkpoint
Before implementing, human signs off on ADR.

## Pre-PR Checkpoint
Before creating PR, human reviews implementation summary.
```

## Multi-Agent Coordination

### Sequential Chain

```
Task 1 → Agent A → Output 1
                      ↓
Task 2 → Agent B → Output 2
                      ↓
Task 3 → Agent C → Final Result
```

### Parallel Fan-Out

```
           → Agent A → Summary A
          /                      \
Main Task → Agent B → Summary B → Synthesize
          \                      /
           → Agent C → Summary C
```

### Specialist + Generalist

```
Specialist agents for known task types
         ↓
Generalist (Task) for everything else
```

## Agent Teams

Agent teams coordinate multiple agents across separate sessions with a shared task list. Unlike standalone subagents
(which return full output to the caller's context), teammates communicate via short `SendMessage` summaries.

### When Teams Beat Standalone Subagents

- **Context budget** — Standalone subagents inject full output via `TaskOutput`. Three verbose subagents can exhaust the
  caller's context. Teammates return only what they choose to `SendMessage`.
- **Sustained parallelism** — Standalone subagents block the caller (foreground) or run independently (background) with
  no coordination primitive. Teammates share a task list and can hand off work.
- **Cross-task dependencies** — `blockedBy` lets you express "task B waits for task A" declaratively. Standalone
  subagents require the caller to orchestrate sequencing manually.

### Team Lifecycle

```
1. TeamCreate("my-team")
2. TaskCreate(subject, description, team_name="my-team")
   TaskCreate(subject, description, team_name="my-team", blockedBy=["task-1"])
3. Agent(prompt, team_name="my-team")  — spawns teammate
   Agent(prompt, team_name="my-team")  — spawns another
4. Teammates claim tasks, work, SendMessage summaries
5. TeammateIdle fires when no unclaimed tasks remain
6. TaskCompleted hooks can validate before marking done
```

### Task Design for Teams

Each task must be **self-contained** — teammates don't share conversation history. The task description is all context a
teammate gets (plus its own agent prompt and any CLAUDE.md/skills).

**Good task description:**

```
Refactor the authentication middleware in src/middleware/auth.ts.
Replace the session-based auth with JWT validation.
The JWT secret is in process.env.JWT_SECRET.
Existing tests are in src/middleware/__tests__/auth.test.ts — update them.
```

**Bad task description:**

```
Fix the auth thing we discussed.
```

**Task decomposition rules:**

- Each task should be completable by a single agent in a single session
- Include file paths, function names, and concrete acceptance criteria
- If task B depends on task A's output, use `blockedBy` and describe what task B should find when it starts
- Avoid tasks that require reading another teammate's conversation — the output won't be available

### Coordination via SendMessage

Teammates use `SendMessage` to communicate findings, request help, or report blockers. Messages are injected into the
recipient's context.

**Rules:**

- Keep messages under ~500 tokens — they consume recipient context
- Lead with the actionable information: "Found 3 broken imports in auth module: [list]"
- Don't use SendMessage for status updates that nobody acts on
- The main agent (team creator) receives messages too — useful for progress summaries

### Team Hooks

Two hook events support team coordination:

- **`TeammateIdle`** — fires when a teammate has no unclaimed tasks. Exit 2 + stderr gives the teammate new
  instructions. `{"continue": false, "stopReason": "..."}` stops the teammate. Use this to inject follow-up tasks
  discovered during execution.
- **`TaskCompleted`** — fires when a task is marked complete. Exit 2 blocks completion and feeds stderr as feedback
  (e.g., "tests not passing, task not done"). Use this as a quality gate.

### Team Patterns

**Independent parallel work:**

```
Team: "refactor-team"
├── Task: "Refactor auth middleware" (no dependencies)
├── Task: "Refactor logging middleware" (no dependencies)
└── Task: "Refactor rate-limit middleware" (no dependencies)

3 teammates, each claims one task, work in parallel.
```

**Pipeline with dependencies:**

```
Team: "feature-team"
├── Task 1: "Design API schema for /users endpoint"
├── Task 2: "Implement API handlers" (blockedBy: [1])
└── Task 3: "Write integration tests" (blockedBy: [2])

1-2 teammates; task 2 waits for task 1's completion.
```

**Research fan-out with synthesis:**

```
Team: "research-team"
├── Task 1: "Analyze authentication patterns in codebase"
├── Task 2: "Analyze authorization patterns in codebase"
├── Task 3: "Analyze session management patterns"
└── Task 4: "Synthesize findings into security report" (blockedBy: [1, 2, 3])

3 teammates for research, task 4 picks up after all complete.
```

### Team Anti-Patterns

- **Too many teammates** — Each teammate consumes API quota. 2-4 is typical; beyond 6 rarely helps.
- **Tasks too small** — Overhead of spawning a teammate exceeds the work. If a task takes <30 seconds, batch it with
  related work.
- **Tasks too large** — If a task exceeds a teammate's context window, it fails silently or produces partial results.
  Decompose further.
- **Missing dependencies** — Two teammates modifying the same files without `blockedBy` causes merge conflicts in
  worktree isolation or overwrites without it.
- **Verbose SendMessage** — Injecting 2000-token messages into every teammate's context degrades everyone's reasoning.

## Anti-Patterns to Avoid

### God Agent

Agent that does everything. Hard to trigger correctly, poor at all tasks.

### Vague Description

"Helps with code" — over-triggers, unclear when to use.

### Execution in Description

"Steps: 1. Read 2. Analyze 3. Report" — belongs in body, not description.

### Over-Scoped Tools

Granting Write/Edit to read-only reviewers.

### No Output Format

Agent returns inconsistent, unparseable results.

### Infinite Loop Risk

Agent that spawns agents that spawn agents. (Subagents cannot spawn subagents.)

### Context Hogging

Agent that reads entire codebase for simple queries.
