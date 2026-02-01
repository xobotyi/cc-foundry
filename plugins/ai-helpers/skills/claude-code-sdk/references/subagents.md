# Subagents Reference

> **Action Required:** When creating, editing, or improving subagents, invoke
> the `ai-helpers:subagent-engineering` skill first.

Subagents are isolated AI assistants that handle specific tasks. Each runs in
its own context with a custom system prompt, tool restrictions, and independent
permissions. Claude delegates based on the subagent's description.

## Built-in Subagents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| Explore | Haiku | Read-only | File discovery, code search, codebase exploration |
| Plan | Inherit | Read-only | Research during plan mode |
| general-purpose | Inherit | All | Complex multi-step tasks requiring exploration and action |
| Bash | Inherit | Bash | Terminal commands in separate context |
| Claude Code Guide | Haiku | Read-only | Questions about Claude Code features |

Explore supports thoroughness levels: `quick`, `medium`, `very thorough`.

## Subagent Structure

```
agent-name.md
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

Body becomes the system prompt. Subagents receive only this prompt plus basic
environment details—not the full Claude Code system prompt.

## Locations (Priority Order)

| Location | Scope | Priority |
|----------|-------|----------|
| `--agents` CLI flag | Current session | 1 (highest) |
| `.claude/agents/` | Current project | 2 |
| `~/.claude/agents/` | All your projects | 3 |
| Plugin `agents/` | Where plugin enabled | 4 (lowest) |

When multiple subagents share a name, higher-priority location wins.

## Frontmatter Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | When Claude should delegate to this subagent |
| `tools` | No | Allowlist of tools. Inherits all if omitted |
| `disallowedTools` | No | Denylist removed from inherited/specified tools |
| `model` | No | `sonnet`, `opus`, `haiku`, or `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `skills` | No | Skills to inject at startup (full content, not just available) |
| `hooks` | No | Lifecycle hooks scoped to this subagent |

## Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Standard permission prompts |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny prompts (allowed tools still work) |
| `bypassPermissions` | Skip all permission checks |
| `plan` | Read-only exploration |

Parent `bypassPermissions` takes precedence and cannot be overridden.

## Tool Control

**Allowlist:**
```yaml
tools: Read, Grep, Glob, Bash
```

**Denylist:**
```yaml
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
```

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

Skills are injected as content, not just made available. Subagents don't
inherit skills from parent—list them explicitly.

## Hooks in Subagents

### In Frontmatter (runs while subagent active)

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

`Stop` hooks in frontmatter auto-convert to `SubagentStop`.

### In settings.json (subagent lifecycle events)

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

`SubagentStart` supports matchers. `SubagentStop` fires for all completions.

## CLI-Defined Subagents

Session-only, not saved to disk:

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

Use `prompt` for system prompt (equivalent to markdown body in files).

## Foreground vs Background

**Foreground:** Blocks main conversation. Permission prompts pass through.

**Background:** Runs concurrently. Permissions requested upfront, auto-denies
anything not pre-approved. `AskUserQuestion` calls fail but subagent continues.
MCP tools unavailable.

- Ask Claude to "run this in the background"
- Press **Ctrl+B** to background a running task
- Disable: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`

## Resume Subagents

Each invocation starts fresh. To continue previous work:

```
Use the code-reviewer subagent to review auth module
[Agent completes]

Continue that review and analyze authorization logic
[Claude resumes with full previous context]
```

Transcripts stored at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`.

## Auto-Compaction

Triggers at ~95% capacity by default. Override with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.

## Disable Specific Subagents

In settings:
```json
{
  "permissions": {
    "deny": ["Task(Explore)", "Task(my-custom-agent)"]
  }
}
```

Or CLI:
```bash
claude --disallowedTools "Task(Explore)"
```

## Conditional Validation with Hooks

Allow Bash but block write operations:

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

if echo "$COMMAND" | grep -iE '\b(INSERT|UPDATE|DELETE|DROP)\b' > /dev/null; then
  echo "Blocked: Only SELECT queries allowed" >&2
  exit 2
fi
exit 0
```

## When to Use Subagents vs Main Conversation

**Use main conversation:**
- Frequent back-and-forth or iterative refinement
- Multiple phases sharing context
- Quick, targeted changes
- Latency-sensitive tasks

**Use subagents:**
- Verbose output you don't need in main context
- Enforce specific tool restrictions
- Self-contained work returning a summary

**Consider skills instead** when you want reusable prompts in main context
rather than isolated subagent context.

## Subagent Limitations

- Subagents cannot spawn other subagents
- For nested delegation, use skills or chain subagents from main conversation
