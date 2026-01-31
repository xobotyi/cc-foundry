# Subagent Specification

Complete reference for subagent frontmatter fields and constraints.

---

## Table of Contents
- [File Format](#file-format)
- [Required Fields](#required-fields)
- [Optional Fields](#optional-fields)
- [System Prompt (Body)](#system-prompt-body)
- [Storage Locations](#storage-locations)
- [CLI-Defined Agents](#cli-defined-agents)
- [Validation Checklist](#validation-checklist)

---

## File Format

Subagents are Markdown files with YAML frontmatter:

```markdown
---
name: agent-name
description: What it does and when to use it
tools: Read, Grep, Glob
model: sonnet
---

System prompt content here...
```

The frontmatter defines metadata and configuration. The body becomes the
system prompt that guides the subagent's behavior.

## Required Fields

### `name`
Unique identifier for the subagent.

**Constraints:**
- Lowercase letters and hyphens only
- Max 64 characters
- No `<` or `>` characters
- Cannot contain "anthropic" or "claude"

```yaml
# Valid
name: code-reviewer
name: db-query-validator

# Invalid
name: Code_Reviewer      # uppercase, underscore
name: my<agent>          # special characters
name: claude-helper      # contains "claude"
```

### `description`
When Claude should delegate to this subagent. This is the ONLY thing
Claude sees when deciding whether to use the agent.

**Constraints:**
- Max 1024 characters
- No `<` or `>` characters

**Must include:**
- What the subagent does (1 sentence)
- When to use it (specific contexts, triggers)

**Should NOT include:**
- Execution instructions (belongs in body)
- Keywords lists (redundant if well-written)
- Success criteria (belongs in body)

```yaml
# Bad: vague
description: Helps with code

# Bad: execution details in description
description: "Review code. Steps: 1. Read files 2. Find issues 3. Report"

# Good: clear trigger conditions
description: "Expert code review specialist. Proactively reviews code for
  quality, security, and maintainability. Use immediately after writing
  or modifying code."
```

## Optional Fields

### `tools`
Allowlist of tools the subagent can use. If omitted, inherits all tools
from the main conversation (including MCP tools).

```yaml
# Read-only agent
tools: Read, Grep, Glob

# Full access (explicit)
tools: Read, Write, Edit, Bash, Glob, Grep

# With specific MCP tools
tools: Read, Grep, mcp__slack__search_messages
```

**Available built-in tools:**
- `Read` — Read files
- `Write` — Create/overwrite files
- `Edit` — Modify existing files
- `Bash` — Execute shell commands
- `Glob` — Find files by pattern
- `Grep` — Search file contents
- `WebFetch` — Fetch web content
- `WebSearch` — Search the web
- `Task` — Spawn subagents (main agent only)
- `NotebookEdit` — Edit Jupyter notebooks

### `disallowedTools`
Denylist of tools to remove from inherited or specified list.

```yaml
# Inherit all tools except Write and Edit
disallowedTools: Write, Edit
```

Use `disallowedTools` when you want most tools but need to exclude a few.

### `model`
Which Claude model the subagent uses.

| Value | Behavior |
|-------|----------|
| `sonnet` | Use Claude Sonnet |
| `opus` | Use Claude Opus |
| `haiku` | Use Claude Haiku (fast, cheap) |
| `inherit` | Use same model as main conversation |
| (omitted) | Defaults to `inherit` |

```yaml
# Fast exploration
model: haiku

# Complex reasoning
model: opus

# Match parent
model: inherit
```

**Model selection guidelines:**
- `haiku` — Quick tasks, search, documentation
- `sonnet` — Everyday coding, debugging, refactoring
- `opus` — Deep reasoning, architecture, security audits

### `permissionMode`
How the subagent handles permission prompts.

| Mode | Behavior |
|------|----------|
| `default` | Standard permission checking |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny prompts (allowed tools still work) |
| `bypassPermissions` | Skip all permission checks |
| `plan` | Plan mode (read-only exploration) |

```yaml
# Read-only exploration
permissionMode: plan

# Auto-accept edits (use with caution)
permissionMode: acceptEdits
```

**⚠️ Security Warning:**
- `bypassPermissions` skips ALL permission checks including file writes
  and command execution. Only use for trusted, well-tested agents in
  controlled environments.
- `acceptEdits` auto-accepts file modifications — ensure the agent's
  tools and prompt are sufficiently constrained.
- If parent uses `bypassPermissions`, child agents inherit it and
  cannot override to a more restrictive mode.
- Prefer `plan` mode for read-only agents to enforce safety at the
  permission level, not just in the prompt.

### `skills`
Skills to inject into the subagent's context at startup.

```yaml
skills:
  - api-conventions
  - error-handling-patterns
```

The full skill content is injected, not just made available for invocation.
Subagents don't inherit skills from parent; list them explicitly.

### `hooks`
Lifecycle hooks scoped to this subagent.

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

**Supported events in frontmatter:**
- `PreToolUse` — Before tool execution (matcher = tool name)
- `PostToolUse` — After tool execution (matcher = tool name)
- `Stop` — When subagent finishes (converted to `SubagentStop`)

See Claude Code hooks documentation for full schema.

## System Prompt (Body)

Everything after the frontmatter becomes the subagent's system prompt.
Subagents receive ONLY this prompt plus basic environment details,
not the full Claude Code system prompt.

**Best practices:**
- Start with role definition
- Include clear workflow steps
- Specify output format
- Add checklists for consistency
- Keep focused on single responsibility

```markdown
---
name: code-reviewer
description: Reviews code for quality and security
tools: Read, Grep, Glob, Bash
---

You are a senior code reviewer ensuring high standards.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code is clear and readable
- No exposed secrets or API keys
- Proper error handling
- Good test coverage

Provide feedback organized by priority:
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)

Include specific examples of how to fix issues.
```

## Storage Locations

| Location | Scope | Priority |
|----------|-------|----------|
| `--agents` CLI flag | Session only | 1 (highest) |
| `.claude/agents/` | Current project | 2 |
| `~/.claude/agents/` | All projects | 3 |
| Plugin `agents/` | Where plugin enabled | 4 (lowest) |

When multiple agents share the same name, higher priority wins.

## CLI-Defined Agents

Pass agents as JSON when launching Claude Code:

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after changes.",
    "prompt": "You are a senior code reviewer...",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

Use `prompt` for the system prompt (equivalent to markdown body).
Session-only, not saved to disk.

## Validation Checklist

Before deploying a subagent:

- [ ] `name` is lowercase with hyphens only
- [ ] `name` doesn't contain "anthropic" or "claude"
- [ ] `description` explains what AND when (under 1024 chars)
- [ ] `description` has no execution instructions
- [ ] `tools` is minimal (only what's needed)
- [ ] `model` matches task complexity
- [ ] System prompt is focused on single responsibility
- [ ] Output format is clearly specified
