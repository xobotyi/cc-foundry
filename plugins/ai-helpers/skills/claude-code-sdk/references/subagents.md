# Subagents Reference

> **Action Required:** When creating, editing, or improving subagents, invoke
> the `ai-helpers:subagent-engineering` skill first.

Subagents are isolated AI assistants that handle specific tasks. Each runs in its own context
with a custom system prompt, tool restrictions, and independent permissions. Claude delegates
based on the subagent's description. Subagents work within a single session; for cross-session
coordination between multiple agents, use agent teams instead.

## Built-in Subagents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| Explore | Haiku | Read-only | File discovery, code search, codebase exploration |
| Plan | Inherit | Read-only | Research during plan mode |
| general-purpose | Inherit | All | Complex multi-step tasks requiring exploration and action |
| Bash | Inherit | Bash | Terminal commands in separate context |
| statusline-setup | Sonnet | — | Configures status line via `/statusline` |
| Claude Code Guide | Haiku | — | Questions about Claude Code features |

Explore supports thoroughness levels: `quick`, `medium`, `very thorough`.

Subagents cannot spawn other subagents. The Plan subagent exists specifically to avoid
infinite nesting during plan mode research.

## Subagent File Structure

```
.claude/agents/agent-name.md   # project scope
~/.claude/agents/agent-name.md # user scope
```

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

Body becomes the system prompt. Subagents receive only this prompt plus basic environment
details (working directory etc.) — not the full Claude Code system prompt.

**Loading:** Subagents load at session start. Manually added files require a session restart
or `/agents` to load immediately.

## Locations (Priority Order)

| Location | Scope | Priority |
|----------|-------|----------|
| `--agents` CLI flag | Current session only | 1 (highest) |
| `.claude/agents/` | Current project | 2 |
| `~/.claude/agents/` | All your projects | 3 |
| Plugin `agents/` directory | Where plugin is enabled | 4 (lowest) |

When multiple subagents share a name, higher-priority location wins.

## The /agents Command

Run `/agents` to manage subagents interactively:

- View all available subagents (built-in, user, project, plugin)
- Create new subagents with guided setup or Claude generation
- Edit existing subagent configuration and tool access
- Delete custom subagents
- See which subagent is active when duplicates exist

Recommended way to create and manage subagents.

## Frontmatter Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | When Claude should delegate to this subagent |
| `tools` | No | Allowlist of tools. Inherits all if omitted |
| `disallowedTools` | No | Denylist removed from inherited/specified tools |
| `model` | No | `sonnet`, `opus`, `haiku`, or `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Maximum agentic turns before subagent stops |
| `skills` | No | Skills to inject at startup (full content, not just available) |
| `mcpServers` | No | MCP servers: name referencing configured server, or inline definition |
| `hooks` | No | Lifecycle hooks scoped to this subagent |
| `memory` | No | Persistent memory scope: `user`, `project`, or `local` |
| `background` | No | `true` to always run as background task. Default: `false` |
| `isolation` | No | `worktree` for git worktree isolation; auto-cleaned if no changes |

## Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Standard permission prompts |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny prompts (explicitly allowed tools still work) |
| `bypassPermissions` | Skip all permission checks |
| `plan` | Read-only exploration |

Parent `bypassPermissions` takes precedence and cannot be overridden by subagent config.

## Tool Control

**Allowlist** (restrict to specific tools):
```yaml
tools: Read, Grep, Glob, Bash
```

**Denylist** (remove from inherited set):
```yaml
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
```

### Restrict Spawnable Subagents

When an agent runs as main thread with `claude --agent`, use `Task(agent_type)` in `tools`
to allowlist which subagents it can spawn:

```yaml
---
name: coordinator
description: Coordinates work across specialized agents
tools: Task(worker, researcher), Read, Bash
---
```

- `Task(worker, researcher)` — only `worker` and `researcher` can be spawned
- `Task` (no parentheses) — any subagent can be spawned
- Omit `Task` entirely — cannot spawn any subagents

This restriction only applies to agents running as main thread. Subagents cannot spawn
other subagents regardless of configuration.

### Disable Specific Subagents

In `settings.json`:
```json
{
  "permissions": {
    "deny": ["Task(Explore)", "Task(my-custom-agent)"]
  }
}
```

Or via CLI:
```bash
claude --disallowedTools "Task(Explore)"
```

Works for both built-in and custom subagents.

## Preload Skills

Inject skill content into subagent context at startup:

```yaml
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---

Implement API endpoints. Follow the conventions from preloaded skills.
```

Skills are injected as content, not just made available. Subagents don't inherit skills from
the parent — list them explicitly.

## Persistent Memory

The `memory` field gives the subagent a persistent directory that survives across sessions.
The subagent builds knowledge over time: codebase patterns, debugging insights, architectural
decisions.

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
memory: user
---

As you review code, update your agent memory with patterns, conventions, and recurring issues
you discover. This builds institutional knowledge across conversations.
```

### Memory Scopes

| Scope | Location | Use when |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<agent-name>/` | Learnings apply across all projects |
| `project` | `.claude/agent-memory/<agent-name>/` | Knowledge is project-specific, shareable via VCS |
| `local` | `.claude/agent-memory-local/<agent-name>/` | Project-specific, not checked into VCS |

`user` is the recommended default.

### How Memory Works

When memory is enabled:

- System prompt includes instructions for reading/writing the memory directory
- First 200 lines of `MEMORY.md` in the memory directory are included in prompt; subagent
  is instructed to curate `MEMORY.md` if it exceeds 200 lines
- Read, Write, and Edit tools are automatically enabled for memory management

## Worktree Isolation

Set `isolation: worktree` to run the subagent in a temporary git worktree — an isolated copy
of the repository. The worktree is automatically cleaned up if the subagent makes no changes.

```yaml
---
name: risky-refactor
description: Performs large refactoring in an isolated environment
isolation: worktree
---
```

## Hooks in Subagents

### In Frontmatter (scoped to subagent's active duration)

```yaml
---
name: code-reviewer
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
---
```

All hook events are supported. `Stop` hooks in frontmatter auto-convert to `SubagentStop`
at runtime.

### In settings.json (subagent lifecycle events)

| Event | Matcher input | When it fires |
|-------|--------------|---------------|
| `SubagentStart` | Agent type name | When a subagent begins execution |
| `SubagentStop` | Agent type name | When a subagent completes |

Both support matchers to target specific agent types by name:

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [
          { "type": "command", "command": "./scripts/setup-db.sh" }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          { "type": "command", "command": "./scripts/cleanup.sh" }
        ]
      }
    ]
  }
}
```

### Conditional Validation with Hooks

Use `PreToolUse` hooks to allow a tool but restrict specific operations — finer control
than the `tools` field:

```yaml
---
name: db-reader
description: Execute read-only database queries
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---
```

Validation script reads JSON from stdin, exits 2 to block:

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -iE '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b' > /dev/null; then
  echo "Blocked: Only SELECT queries allowed" >&2
  exit 2
fi
exit 0
```

Exit code 2 blocks the operation and returns stderr to Claude as the error reason.

## CLI-Defined Subagents

Session-only, not saved to disk. Useful for quick testing or automation scripts:

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer...",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

Use `prompt` for system prompt (equivalent to markdown body in files). Supports all
frontmatter fields: `description`, `prompt`, `tools`, `disallowedTools`, `model`,
`permissionMode`, `mcpServers`, `hooks`, `maxTurns`, `skills`, `memory`.

## Automatic Delegation

Claude decides when to delegate based on:

- Task description in your request
- `description` field in subagent configurations
- Current context

To encourage proactive delegation, include phrases like "use proactively" in the description.
You can also request a specific subagent explicitly by name:

```
Use the code-reviewer subagent to look at my recent changes
```

## Foreground vs Background

**Foreground:** Blocks main conversation until complete. Permission prompts and
`AskUserQuestion` calls pass through.

**Background:** Runs concurrently while you continue working. Permissions are requested
upfront before launch; subagent auto-denies anything not pre-approved. `AskUserQuestion`
calls fail but the subagent continues. MCP tools unavailable.

Set `background: true` in frontmatter to always run as background. Failed background
subagents can be resumed in foreground for interactive prompts.

Controls:
- Ask Claude to "run this in the background"
- Press **Ctrl+B** to background a running task
- Disable all background tasks: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`

## Resume Subagents

Each invocation starts fresh by default. To continue previous work with full context:

```
Use the code-reviewer subagent to review auth module
[Agent completes]

Continue that review and analyze authorization logic
[Claude resumes with full previous context including all tool calls and reasoning]
```

Claude receives the agent ID on completion. Find IDs in transcript files at:
`~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`

### Transcript Behavior

- **Compaction:** Main conversation compaction does not affect subagent transcripts (separate
  files)
- **Session persistence:** Transcripts persist within their session; resumable after restarting
  Claude Code by resuming the same session
- **Auto-compaction:** Triggers at ~95% capacity. Override with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
- **Cleanup:** Based on `cleanupPeriodDays` setting (default: 30 days)

## Common Patterns

### Parallel Research

Spawn multiple subagents for independent investigations:

```
Research the authentication, database, and API modules in parallel using separate subagents
```

Works best when research paths don't depend on each other. Results return to main conversation
— many detailed returns can consume significant context.

### Chaining Subagents

Use subagents in sequence — each completes and returns results to Claude, which passes
relevant context to the next:

```
Use the code-reviewer to find performance issues, then use the optimizer to fix them
```

### Isolating High-Volume Operations

Delegate operations that produce large output (test runs, doc fetches, log processing) to
a subagent. Verbose output stays in subagent context; only the summary returns:

```
Use a subagent to run the test suite and report only failing tests with error messages
```

## When to Use Subagents vs Alternatives

**Use main conversation when:**
- Frequent back-and-forth or iterative refinement needed
- Multiple phases share significant context
- Quick, targeted changes
- Latency-sensitive (subagents start fresh, may need time to gather context)

**Use subagents when:**
- Output is verbose and doesn't need to live in main context
- Enforcing specific tool restrictions or permissions
- Work is self-contained and can return a summary

**Use skills instead** when you want reusable prompts or workflows running in the main
conversation context (not isolated).

**Use agent teams instead** when work exceeds your context window, needs sustained
parallelism, or requires cross-session coordination.

## Subagent Limitations

- Subagents cannot spawn other subagents
- For nested delegation, use skills or chain subagents from the main conversation
- MCP tools unavailable in background subagents
- Background subagents cannot ask clarifying questions (calls fail silently, subagent continues)
