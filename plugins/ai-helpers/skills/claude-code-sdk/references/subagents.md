# Subagents Reference

> **Action Required:** When creating, editing, or improving subagents, invoke the `ai-helpers:subagent-engineering`
> skill first.

Subagents are isolated AI assistants that handle specific tasks. Each runs in its own context with a custom system
prompt, tool restrictions, and independent permissions. Claude delegates based on the subagent's description. Subagents
work within a single session; for cross-session coordination between multiple agents, use agent teams instead.

## Built-in Subagents

- **Explore** -- Model: Haiku. Tools: Read-only. Purpose: File discovery, code search, codebase exploration. Supports
  thoroughness levels: `quick`, `medium`, `very thorough`.
- **Plan** -- Model: Inherit. Tools: Read-only. Purpose: Research during plan mode. Exists to avoid infinite nesting
  (subagents cannot spawn subagents).
- **general-purpose** -- Model: Inherit. Tools: All. Purpose: Complex multi-step tasks requiring exploration and action.
- **Bash** -- Model: Inherit. Tools: Bash. Purpose: Terminal commands in separate context.
- **statusline-setup** -- Model: Sonnet. Purpose: Configures status line via `/statusline`.
- **Claude Code Guide** -- Model: Haiku. Purpose: Questions about Claude Code features.

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

Body becomes the system prompt. Subagents receive only this prompt plus basic environment details (working directory
etc.) -- not the full Claude Code system prompt.

**Loading:** Subagents load at session start. Manually added files require a session restart or `/agents` to load
immediately.

## Locations (Priority Order)

- `--agents` CLI flag -- Scope: Current session only. Priority: 1 (highest).
- `.claude/agents/` -- Scope: Current project. Priority: 2.
- `~/.claude/agents/` -- Scope: All your projects. Priority: 3.
- Plugin `agents/` directory -- Scope: Where plugin is enabled. Priority: 4 (lowest).

When multiple subagents share a name, higher-priority location wins.

## The /agents Command

Run `/agents` to manage subagents interactively: view all available subagents (built-in, user, project, plugin), create
new subagents with guided setup or Claude generation, edit existing configuration and tool access, delete custom
subagents, see which subagent is active when duplicates exist.

Run `claude agents` from the command line to list all configured subagents without starting an interactive session.

## Frontmatter Reference

- `name` -- Required. Unique identifier (lowercase, hyphens).
- `description` -- Required. When Claude should delegate to this subagent.
- `tools` -- Allowlist of tools. Inherits all if omitted.
- `disallowedTools` -- Denylist removed from inherited/specified tools.
- `model` -- `sonnet`, `opus`, `haiku`, a full model ID (e.g., `claude-opus-4-6`, `claude-sonnet-4-6`), or `inherit`
  (default). Accepts same values as `--model` flag.
- `permissionMode` -- `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`.
- `maxTurns` -- Maximum agentic turns before subagent stops.
- `skills` -- Skills to inject at startup (full content, not just available). Subagents don't inherit parent skills.
- `mcpServers` -- MCP servers: string referencing configured server, or inline definition with server name as key and
  full MCP config as value.
- `hooks` -- Lifecycle hooks scoped to this subagent.
- `memory` -- Persistent memory scope: `user`, `project`, or `local`.
- `background` -- `true` to always run as background task. Default: `false`.
- `effort` -- Effort level override: `low`, `medium`, `high`, `max` (Opus 4.6 only). Default: inherits from session.
- `isolation` -- `worktree` for git worktree isolation; auto-cleaned if no changes.

## Plugin Subagent Restrictions

Plugin subagents do not support `hooks`, `mcpServers`, or `permissionMode` -- these fields are ignored when loading
agents from a plugin. To use them, copy the agent file into `.claude/agents/` or `~/.claude/agents/`.

## Permission Modes

- `default` -- Standard permission prompts
- `acceptEdits` -- Auto-accept file edits
- `dontAsk` -- Auto-deny prompts (explicitly allowed tools still work)
- `bypassPermissions` -- Skip all permission checks (writes to `.git`, `.claude`, `.vscode`, `.idea` still prompt,
  except `.claude/commands`, `.claude/agents`, `.claude/skills`)
- `plan` -- Read-only exploration

Parent `bypassPermissions` takes precedence and cannot be overridden by subagent config.

## Tool Control

**Allowlist** (restrict to specific tools):

```yaml
tools: Read, Grep, Glob, Bash
```

**Denylist** (remove from inherited set):

```yaml
disallowedTools: Write, Edit
```

If both are set, `disallowedTools` is applied first, then `tools` is resolved against the remaining pool.

### Restrict Spawnable Subagents

When an agent runs as main thread with `claude --agent`, use `Agent(agent_type)` in `tools` to allowlist which subagents
it can spawn:

```yaml
tools: Agent(worker, researcher), Read, Bash
```

- `Agent(worker, researcher)` -- only `worker` and `researcher` can be spawned
- `Agent` (no parentheses) -- any subagent can be spawned
- Omit `Agent` entirely -- cannot spawn any subagents

In v2.1.63, the Task tool was renamed to Agent. Existing `Task(...)` references in settings and agent definitions still
work as aliases.

This restriction only applies to agents running as main thread. Subagents cannot spawn other subagents regardless of
configuration.

### Disable Specific Subagents

In `settings.json`:

```json
{
  "permissions": {
    "deny": ["Agent(Explore)", "Agent(my-custom-agent)"]
  }
}
```

Or via CLI:

```bash
claude --disallowedTools "Agent(Explore)"
```

## MCP Server Scoping

Use `mcpServers` to give a subagent access to MCP servers not in the main conversation. Inline servers connect when the
subagent starts and disconnect when it finishes. String references share the parent session's connection.

```yaml
mcpServers:
  # Inline definition: scoped to this subagent only
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  # Reference by name: reuses already-configured server
  - github
```

Inline definitions use the same schema as `.mcp.json` server entries (`stdio`, `http`, `sse`, `ws`), keyed by server
name. Define MCP servers inline to keep their tool descriptions out of the main conversation context.

## Preload Skills

Inject skill content into subagent context at startup:

```yaml
skills:
  - api-conventions
  - error-handling-patterns
```

Skills are injected as full content, not just made available. Subagents don't inherit skills from the parent -- list
them explicitly. This is the inverse of running a skill with `context: fork` (where the skill controls injection into a
specified agent).

## Persistent Memory

The `memory` field gives the subagent a persistent directory that survives across sessions.

### Memory Scopes

- `user` -- Location: `~/.claude/agent-memory/<agent-name>/`. Use when: Learnings apply across all projects.
- `project` -- Location: `.claude/agent-memory/<agent-name>/`. Use when: Knowledge is project-specific, shareable via
  VCS. Recommended default.
- `local` -- Location: `.claude/agent-memory-local/<agent-name>/`. Use when: Project-specific, not checked into VCS.

### How Memory Works

When memory is enabled:

- System prompt includes instructions for reading/writing the memory directory
- First 200 lines of `MEMORY.md` in the memory directory are included in prompt; subagent is instructed to curate
  `MEMORY.md` if it exceeds 200 lines
- Read, Write, and Edit tools are automatically enabled for memory management

## Invoking Subagents

### Automatic Delegation

Claude decides when to delegate based on the task description, `description` field in configs, and current context. To
encourage proactive delegation, include phrases like "use proactively" in the description.

### Natural Language

Name the subagent in your prompt; Claude decides whether to delegate:

```
Use the code-reviewer subagent to look at my recent changes
```

### @-mention

Type `@` and pick the subagent from the typeahead to guarantee it runs. Your full message still goes to Claude, which
writes the subagent's task prompt:

```
@"code-reviewer (agent)" look at the auth changes
```

Plugin subagents appear as `<plugin-name>:<agent-name>`. Manual syntax: `@agent-<name>` for local subagents,
`@agent-<plugin-name>:<agent-name>` for plugin subagents.

### --agent Session Mode

Run the whole session as a subagent -- the main thread takes on the subagent's system prompt, tool restrictions, and
model:

```bash
claude --agent code-reviewer
```

The subagent's system prompt replaces the default Claude Code system prompt entirely (like `--system-prompt`).
`CLAUDE.md` files and project memory still load normally. The agent name appears as `@<name>` in the startup header.

For plugin subagents: `claude --agent <plugin-name>:<agent-name>`.

To set as project default in `.claude/settings.json`:

```json
{
  "agent": "code-reviewer"
}
```

CLI flag overrides the setting if both are present. Choice persists when resuming the session.

## Foreground vs Background

**Foreground:** Blocks main conversation until complete. Permission prompts and `AskUserQuestion` calls pass through.

**Background:** Runs concurrently. Permissions are requested upfront before launch; subagent auto-denies anything not
pre-approved. `AskUserQuestion` calls fail but the subagent continues.

Set `background: true` in frontmatter to always run as background. Failed background subagents can be retried in
foreground for interactive prompts.

Controls:

- Ask Claude to "run this in the background"
- Press **Ctrl+B** to background a running task
- Disable all background tasks: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`

## Worktree Isolation

Set `isolation: worktree` to run the subagent in a temporary git worktree -- an isolated copy of the repository. The
worktree is automatically cleaned up if the subagent makes no changes.

## Hooks in Subagents

### In Frontmatter (scoped to subagent's active duration)

All hook events are supported. `Stop` hooks in frontmatter auto-convert to `SubagentStop` at runtime.

```yaml
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
```

### In settings.json (subagent lifecycle events)

- `SubagentStart` -- matcher: agent type name. Fires when a subagent begins execution.
- `SubagentStop` -- matcher: agent type name. Fires when a subagent completes.

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [{ "type": "command", "command": "./scripts/setup-db.sh" }]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [{ "type": "command", "command": "./scripts/cleanup.sh" }]
      }
    ]
  }
}
```

### Conditional Validation with Hooks

Use `PreToolUse` hooks for finer control than the `tools` field -- allow a tool but restrict specific operations:

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
```

Validation script reads JSON from stdin (`tool_input.command`), exits 2 to block. Stderr is returned to Claude as the
error reason.

## Resume Subagents

Each invocation starts fresh by default. To continue previous work with full context (all tool calls, results,
reasoning), ask Claude to continue:

```
Continue that review and analyze authorization logic
```

Claude receives the agent ID on completion and uses `SendMessage` with the agent's ID as the `to` field to resume. If a
stopped subagent receives a `SendMessage`, it auto-resumes in the background without a new `Agent` invocation.

Find transcript IDs at: `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`

### Transcript Behavior

- **Compaction:** Main conversation compaction does not affect subagent transcripts (separate files)
- **Session persistence:** Transcripts persist within their session; resumable after restarting Claude Code
- **Auto-compaction:** Triggers at ~95% capacity. Override with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
- **Cleanup:** Based on `cleanupPeriodDays` setting (default: 30 days)

## CLI-Defined Subagents

Session-only, not saved to disk. Useful for quick testing or automation:

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

Use `prompt` for system prompt (equivalent to markdown body in files). Supports all frontmatter fields: `description`,
`prompt`, `tools`, `disallowedTools`, `model`, `permissionMode`, `mcpServers`, `hooks`, `maxTurns`, `skills`, `memory`,
`effort`, `background`, `isolation`.

## Common Patterns

### Parallel Research

Spawn multiple subagents for independent investigations. Results return to main conversation -- many detailed returns
can consume significant context.

### Chaining Subagents

Use subagents in sequence -- each completes and returns results to Claude, which passes relevant context to the next.

### Isolating High-Volume Operations

Delegate operations producing large output (test runs, doc fetches, log processing) to a subagent. Verbose output stays
in subagent context; only the summary returns.

## When to Use Subagents vs Alternatives

**Use main conversation when:** frequent back-and-forth needed, multiple phases share context, quick targeted changes,
latency-sensitive work.

**Use subagents when:** output is verbose and doesn't need to live in main context, enforcing tool restrictions, work is
self-contained.

**Use skills instead** for reusable prompts/workflows running in the main conversation context (not isolated).

**Use agent teams instead** when work exceeds context window, needs sustained parallelism, or requires cross-session
coordination.

**Use `/btw`** for quick questions about existing context -- sees full context, no tool access, answer discarded.

## Subagent Limitations

- Subagents cannot spawn other subagents
- For nested delegation, use skills or chain subagents from the main conversation
- Background subagents cannot ask clarifying questions (calls fail silently, subagent continues)
