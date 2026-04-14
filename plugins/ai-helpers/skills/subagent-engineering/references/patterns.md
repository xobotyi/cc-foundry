# Subagent Patterns

Architecture patterns, coordination models, and real examples for multi-agent workflows.

---

## Pattern Selection

Choose the right structure before building. Wrong pattern choice is the most common cause of over-engineered or
underperforming agent systems.

**Decision questions:**

- Do agents need to share findings with each other? → Agent Teams
- Is work sequential (B depends on A's output)? → Pipeline
- Is work independent and parallelizable? → Parallel fan-out or Teams
- Is the task long-running and user shouldn't wait? → Background execution
- Is the code change experimental or risky? → Worktree isolation
- Is this headless CI/CD automation? → Agent SDK

**Pattern summary:**

- Independent tasks, no coordination needed → standalone parallel subagents
- Tasks need to share findings across agents → Agent Teams with shared task list
- Sequential transformation (output feeds next stage) → pipeline pattern
- Long-running work user shouldn't wait for → background execution
- Experimental code changes that may be discarded → worktree isolation
- Headless automation (CI/CD, scripting) → Agent SDK programmatic orchestration

---

## Classic Patterns

### Pipeline (Sequential Chain)

Agents execute in order. Each agent's output is the next agent's input.

```
pm-spec → architect → implementer → test-runner
```

**Handoff mechanism:** Write status to a shared file or task description so the next agent knows where to pick up.

```markdown
## Status
Set status to READY_FOR_ARCH when spec is complete.
Architect: pick up items with READY_FOR_ARCH status.
Set status to READY_FOR_BUILD when ADR is complete.
```

**When to use:**

- Work has strict ordering (design before code, code before tests)
- Each stage transforms the previous output
- Stages use different tool sets or models (e.g., Opus for design, Sonnet for implementation)

**When not to use:**

- Stages are independent — use parallel fan-out instead
- Total latency matters — sequential chains multiply wait time

**Hook pattern:** Use `SubagentStop` to suggest the next agent automatically:

```json
{
  "hooks": {
    "SubagentStop": [
      { "hooks": [{ "type": "command", "command": "./scripts/suggest-next-agent.sh" }] }
    ]
  }
}
```

### Parallel Fan-Out

Spawn multiple subagents for independent subtasks. Main agent synthesizes results.

```
                → subagent-A → summary-A
main agent →    → subagent-B → summary-B  → synthesize
                → subagent-C → summary-C
```

**Example prompt:**

```
Research the authentication, database, and API modules in parallel using separate subagents.
```

**Context cost warning:** Each subagent's result returns to the main conversation. Three verbose subagents can exhaust
the caller's context. Design each to return concise summaries, not raw file contents.

**When to use:** Independent investigations where research paths don't depend on each other.

**When standalone subagents beat Agent Teams here:** For simple one-shot research with no cross-agent coordination,
standalone parallel subagents are cheaper and simpler. Teams add overhead (team creation, task claiming) that isn't
justified for small fan-outs.

### Master-Clone (General-Purpose Delegation)

Main agent delegates to general-purpose clones rather than specialized agents.

```
main agent → clone (handles subtask A)
           → clone (handles subtask B)
           → clone (handles subtask C)
```

**Benefits:**

- Clones inherit full context from CLAUDE.md and session settings
- Main agent decides delegation scope dynamically — no need to predefine specializations
- Effective when task shapes vary widely

**When to use specialized agents instead:**

- Consistent, repeated task types (security review, test running)
- Need strict tool restrictions
- Domain prompt optimization matters (e.g., DB expert with SQL knowledge preloaded)

### Orchestrator-Workers

Lead agent breaks down work and assigns to specialized workers. Workers have narrow scopes.

```
orchestrator
├── code-reviewer (Read, Grep, Glob only)
├── security-auditor (Read, Grep, Glob, plan mode)
└── test-runner (Bash, Read)
```

The orchestrator's job is task decomposition and synthesis. Workers should be focused enough that their description is
unambiguous — Claude delegates based on the `description` field, so vague descriptions cause mis-routing.

---

## 2026 Patterns

### Agent Teams

The built-in multi-agent orchestration system. Unlike standalone subagents (which inject full output into the caller's
context), teammates communicate via short `SendMessage` summaries and share a task list.

**When teams beat standalone subagents:**

- Context budget — standalone subagents inject full output via TaskOutput; three verbose subagents can exhaust the
  caller. Teammates return only what they choose to send.
- Sustained parallelism — teammates share a task list with `blockedBy` dependencies; standalone subagents require manual
  sequencing.
- Cross-task coordination — teammates can message each other directly without going through the lead.

**Enable Agent Teams** (requires v2.1.32+):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Team lifecycle:**

```
1. TeamCreate("team-name")
2. TaskCreate(subject, description, team_name="team-name")
   TaskCreate(subject, description, team_name="team-name", blockedBy=["task-1"])
3. Agent(prompt, team_name="team-name")  — spawns teammate
   Agent(prompt, team_name="team-name")  — spawns another
4. Teammates claim tasks, work, SendMessage short summaries
5. TeammateIdle fires when no unclaimed tasks remain
6. TaskCompleted hooks can validate before marking done
```

**Navigation:** In the terminal, use `Shift+Down` to cycle through teammates. In tmux/iTerm2, each teammate can open in
its own split pane.

**Team patterns:**

_Independent parallel work:_

```
Team: "refactor-team"
├── Task: "Refactor auth middleware"        (no dependencies)
├── Task: "Refactor logging middleware"     (no dependencies)
└── Task: "Refactor rate-limit middleware"  (no dependencies)

3 teammates, each claims one task, work in parallel.
```

_Pipeline with dependencies:_

```
Team: "feature-team"
├── Task 1: "Design API schema for /users endpoint"
├── Task 2: "Implement API handlers"         (blockedBy: ["1"])
└── Task 3: "Write integration tests"        (blockedBy: ["2"])

Task 2 cannot start until Task 1 completes.
```

_Research fan-out with synthesis:_

```
Team: "research-team"
├── Task 1: "Analyze authentication patterns"
├── Task 2: "Analyze authorization patterns"
├── Task 3: "Analyze session management patterns"
└── Task 4: "Synthesize into security report"  (blockedBy: ["1","2","3"])

3 research teammates; synthesis picks up after all three complete.
```

**Task design rules:**

- Each task must be self-contained — teammates don't share conversation history
- Include file paths, function names, and concrete acceptance criteria
- If task B depends on task A's output, use `blockedBy` and describe what B finds on start
- Avoid tasks that require reading another teammate's conversation

Good task description:

```
Refactor the authentication middleware in src/middleware/auth.ts.
Replace session-based auth with JWT validation.
JWT secret is in process.env.JWT_SECRET.
Existing tests are in src/middleware/__tests__/auth.test.ts — update them.
```

Bad task description:

```
Fix the auth thing we discussed.
```

**SendMessage rules:**

- Keep messages under ~500 tokens — they consume recipient context
- Lead with actionable information: "Found 3 broken imports in auth module: [list]"
- Don't send status updates that nobody acts on
- The team lead (main agent) also receives messages — useful for progress summaries

**Team hooks:**

- `TeammateIdle` — fires when a teammate has no unclaimed tasks. Exit 2 + stderr gives the teammate new instructions;
  `{"continue": false}` stops it. Use to inject follow-up tasks.
- `TaskCompleted` — fires when a task is marked complete. Exit 2 blocks completion and feeds stderr as feedback (e.g.,
  "tests not passing, task not done"). Use as a quality gate.

**Team anti-patterns:**

- Too many teammates — 2-4 is typical; beyond 6 rarely helps, just burns quota
- Tasks too small — overhead of spawning a teammate exceeds the work; batch related tasks
- Tasks too large — if a task exceeds a teammate's context, it fails silently; decompose
- Missing dependencies — two teammates modifying the same files without `blockedBy` causes conflicts or overwrites
- Verbose SendMessage — 2000-token messages injected into every teammate's context degrades everyone's reasoning quality

### Worktree Isolation

Gives a subagent an isolated copy of the repository. Safe for experimental or risky changes.

**Configure in frontmatter:**

```yaml
---
name: experimental-refactor
description: Tries a large refactor safely in an isolated worktree
isolation: worktree
tools: Read, Edit, Write, Bash
---
```

**Behavior:**

- Claude Code creates a temporary git worktree for the subagent
- Subagent works on the isolated copy without touching the main branch
- Auto-cleaned up if the subagent makes no changes
- If changes exist: branch and path are returned so the main agent can inspect or merge

**When to use:**

- Experimental changes that may be discarded
- Large-scale refactors where mid-process state would be messy
- Two subagents modifying overlapping files in parallel (give each its own worktree)

Note: Worktree isolation is per-subagent, not per-team. For team-level isolation, include `isolation: worktree` in the
subagent definition used as the teammate template.

### Background Execution

Subagent runs concurrently while the main conversation continues.

**Configure in frontmatter:**

```yaml
---
name: long-running-migration
description: Runs database migration in background
background: true
tools: Bash, Read
---
```

**Or request at runtime:**

```
Run the test suite in the background and let me know when it's done.
```

**Or press Ctrl+B** to background a running task.

**Behavior:**

- Before launching, Claude Code prompts for tool permissions the subagent will need
- Once running, the subagent inherits those permissions and auto-denies anything not pre-approved
- Main conversation is unblocked immediately
- Notification fires on completion
- If a background subagent needs to ask clarifying questions, that tool call fails but the subagent continues

**Disable globally:**

```json
{ "env": { "CLAUDE_CODE_DISABLE_BACKGROUND_TASKS": "1" } }
```

**When to use:**

- Long-running builds, migrations, large-scale analysis
- Tasks where the user can continue other work during execution
- CI-like checks (linting, test suite, type checking) that don't need interactive approval

**When not to use:**

- Tasks that require clarifying questions mid-execution (AskUserQuestion fails in background)
- Work where you need to redirect or course-correct as it runs

### Agent SDK Programmatic Orchestration

Python/TypeScript SDK for building agent loops outside the Claude Code CLI. Powers CI/CD pipelines, custom applications,
and production automation.

**Core usage:**

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Find and fix the bug in auth.py",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Bash"]),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: { allowedTools: ["Read", "Edit", "Bash"] },
})) {
  if ("result" in message) console.log(message.result);
}
```

**Key SDK options:**

- `allowedTools` — restrict which tools the agent can use
- `permissionMode: "bypassPermissions"` — skip all permission prompts (headless CI/CD)
- `settingSources: ["user", "project"]` — required to load Skills, CLAUDE.md, and project config from the filesystem;
  omitted by default
- `agents` — define custom subagents programmatically
- `mcpServers` — attach MCP servers for the session
- `resume` — continue a previous session by session ID
- `cwd` — set the working directory

**Skills in the SDK:** Skills must be filesystem artifacts (`SKILL.md` files). They are NOT loaded by default — you must
set `settingSources: ["user", "project"]` explicitly. Without this, even if `"Skill"` is in `allowedTools`, skills won't
be discovered.

```python
options = ClaudeAgentOptions(
    cwd="/path/to/project",
    setting_sources=["user", "project"],  # required for skills
    allowed_tools=["Skill", "Read", "Write", "Bash"],
)
```

**Defining subagents programmatically:**

```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Glob", "Grep", "Agent"],
    agents={
        "code-reviewer": AgentDefinition(
            description="Expert code reviewer for quality and security reviews.",
            prompt="Analyze code quality and suggest improvements.",
            tools=["Read", "Glob", "Grep"],
        )
    },
)
```

**SDK vs CLI:**

- Interactive development → CLI
- CI/CD pipelines → SDK
- Custom applications → SDK
- One-off tasks → CLI
- Production automation → SDK

Many teams use both: CLI for daily development, SDK for production pipelines.

---

## Example Subagents

These examples show the full pattern: frontmatter + system prompt structure. Apply prompt engineering principles —
numbered steps, checklists, explicit output format.

### Read-Only Codebase Explorer

```yaml
---
name: codebase-explorer
description: >
  Explores and explains codebase structure. Use for understanding code,
  finding files, or answering questions about the codebase. NEVER modifies files.
tools: Read, Grep, Glob, Bash
model: haiku
permissionMode: plan
---

=== READ-ONLY MODE ===
You are STRICTLY PROHIBITED from creating or modifying files.
Search and analyze only.

When invoked:
1. Identify what the user needs to understand
2. Search relevant files with Glob/Grep
3. Read specific files as needed
4. Return a structured summary with file paths and key findings
```

### Domain Expert (PostgreSQL)

```yaml
---
name: postgres-expert
description: >
  PostgreSQL specialist for query optimization, schema design, and performance.
  Use when working with .sql files or database performance issues.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a PostgreSQL expert. When invoked:

1. Understand the problem context
2. Analyze relevant SQL/schemas
3. Provide specific, actionable recommendations
4. Include example queries with EXPLAIN ANALYZE output format

Areas of expertise:
- Query optimization and index design
- Schema normalization
- pg_stat views and monitoring
- VACUUM, autovacuum tuning
```

### Code Reviewer (Read-Only)

```yaml
---
name: code-reviewer
description: >
  Expert code reviewer. Proactively reviews code for quality, security, and
  maintainability. Use immediately after writing or modifying code.
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately — do not ask for clarification

Review checklist:
- Clarity and readability
- Naming quality
- Duplicated code
- Error handling
- No secrets or credentials exposed
- Input validation
- Test coverage
- Performance considerations

Output format:
## Critical (must fix)
## Warnings (should fix)
## Suggestions (consider)

Include specific examples of how to fix each issue.
```

### Debugger (Read + Write)

```yaml
---
name: debugger
description: >
  Debugging specialist for errors, test failures, and unexpected behavior.
  Use proactively when encountering any issues.
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger specializing in root cause analysis.

When invoked:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate the failure location
4. Implement minimal fix
5. Verify the fix works

For each issue, provide:
- Root cause explanation
- Evidence supporting the diagnosis
- Specific code fix
- Testing approach
- Prevention recommendation

Fix the underlying issue, not the symptom.
```

### Security Auditor (Read-Only, Opus)

```yaml
---
name: security-auditor
description: >
  Security vulnerability scanner. Use proactively after changes to auth,
  API endpoints, or data handling code. Does NOT modify files.
tools: Read, Grep, Glob
model: opus
permissionMode: plan
---

=== READ-ONLY MODE — REPORT FINDINGS ONLY ===

Security checklist:
- [ ] Authentication/authorization flaws
- [ ] Injection vulnerabilities (SQL, XSS, command)
- [ ] Sensitive data exposure
- [ ] Security misconfigurations
- [ ] Insecure dependencies
- [ ] Cryptographic issues
- [ ] Logging gaps

For each vulnerability:
- Severity: Critical / High / Medium / Low
- Location: file:line
- Description: what the vulnerability is
- Impact: what could happen
- Remediation: specific fix with code example
```

### Database Query Validator (Hook-Gated)

```yaml
---
name: db-reader
description: >
  Execute read-only database queries for analysis and reporting.
  Cannot modify data — INSERT, UPDATE, DELETE are blocked.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---

You are a database analyst with READ-ONLY access.

When asked to analyze data:
1. Identify which tables contain relevant data
2. Write efficient SELECT queries with appropriate filters
3. Present results clearly with context

If asked to modify data, explain that you only have read access.
```

Hook script (`./scripts/validate-readonly-query.sh`):

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -iE '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE|MERGE)\b' > /dev/null; then
  echo "Blocked: Write operations not allowed. Use SELECT queries only." >&2
  exit 2
fi

exit 0
```

---

## Human-in-the-Loop Patterns

### Approval Gates

Hook prints a suggestion; human approves by copying the command:

```bash
# Hook output
echo "Suggested next step: Use the architect-review subagent on 'feature-x'."
```

### Status-Based Workflow

```json
{
  "feature-a": "READY_FOR_ARCH",
  "feature-b": "READY_FOR_BUILD",
  "feature-c": "DONE"
}
```

Agents check status before starting, update when done. Requires the description to prompt checking the queue file.

### Review Checkpoints

Encode checkpoints as explicit steps in the agent prompt:

```markdown
## Pre-Implementation Checkpoint

Before implementing, present the ADR for human sign-off.
Wait for confirmation before writing code.

## Pre-PR Checkpoint

Before creating the PR, output a summary of changes for human review.
```

---

## Anti-Patterns

**God agent** — Agent that does everything. Hard to trigger correctly, poor at all tasks. Single-purpose agents
outperform.

**Vague description** — "Helps with code." Over-triggers on unrelated requests. Be specific about task type and trigger
condition.

**Execution in description** — Steps belong in the body, not the description. The description is a routing signal;
Claude reads it to decide _whether_ to delegate, not _how_ to execute.

**Over-scoped tools** — Granting Write/Edit to read-only reviewers. Use `permissionMode: plan` or an explicit `tools`
allowlist to enforce read-only access.

**No output format** — Agent returns inconsistent, unparseable results. Specify output structure in the body: section
headers, severity levels, file:line format.

**Context hogging** — Agent reads entire codebase for simple queries. Scope the investigation in the prompt or use the
built-in Explore subagent (Haiku, read-only) for targeted lookups.

**Verbose SendMessage in teams** — Injecting 2000-token messages into every teammate's context degrades reasoning
quality. Keep teammate messages under ~500 tokens.

**Missing blockedBy in teams** — Two teammates modifying overlapping files without declared dependencies causes
conflicts. Always use `blockedBy` when task B consumes task A's output.

**Nested subagents** — Subagents cannot spawn other subagents. If your workflow requires nested delegation, use Skills
or chain subagents from the main conversation instead.
