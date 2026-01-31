---
name: subagent-engineering
description: >-
  Create, evaluate, and improve Claude Code subagents. Use when
  building custom agents, debugging agent behavior, optimizing agent pipelines,
  or deciding between subagents vs other approaches.
---

# Subagent Engineering

Manage the full lifecycle of Claude Code subagents: creation, evaluation,
iteration, and troubleshooting.

**Note:** Subagent prompts are system prompts. Apply `prompt-engineering`
skill techniques for better agents.

## What Are You Trying To Do?

| Goal | Read |
|------|------|
| Create a new subagent | [creation.md](references/creation.md) |
| Evaluate subagent quality | [evaluation.md](references/evaluation.md) |
| Improve an existing subagent | [iteration.md](references/iteration.md) |
| Debug a subagent that isn't working | [troubleshooting.md](references/troubleshooting.md) |
| Check frontmatter rules and constraints | [spec.md](references/spec.md) |
| See common patterns and examples | [patterns.md](references/patterns.md) |
| Apply prompt engineering techniques | `prompt-engineering` skill |

## What Good Looks Like

A well-designed subagent:
- Triggers correctly (not too often, not too rarely)
- Completes tasks without scope creep
- Returns concise, actionable summaries
- Uses minimal tools for its purpose

## Built-in Subagents

| Agent | Model | Purpose |
|-------|-------|---------|
| **Explore** | Haiku | Fast, read-only codebase exploration |
| **Plan** | Inherits | Research for plan mode |
| **general-purpose** | Inherits | Complex multi-step tasks |
| **Bash** | Inherits | Command execution in separate context |
| **claude-code-guide** | Haiku | Questions about Claude Code features |

## How Subagents Work

Subagents run in isolated context with custom system prompts and restricted
tools. Claude delegates based on `name` + `description` only — the body
loads after delegation. See [spec.md](references/spec.md) for technical details.

## Core Principles

**1. Description is the trigger**
Claude sees ONLY `name` and `description` when deciding to delegate.
The body loads AFTER delegation.

```yaml
# Bad: vague
description: Helps with code

# Good: specific what + when
description: "Reviews code for security vulnerabilities. Use proactively
  after code changes or when security review is needed."
```

**2. Single responsibility**
Each subagent should excel at ONE specific task. Don't create
Swiss Army knife agents.

**3. Minimal tool access**
Grant only necessary permissions. Read-only agents don't need Edit/Write.

**4. Clear handoffs**
Design subagents to return actionable summaries, not raw data dumps.

## Quick Decision Guide

**Use subagents when:**
- Task produces verbose output you don't need in main context
- You want to enforce specific tool restrictions
- Work is self-contained and can return a summary
- You need to parallelize independent research

**Use main conversation when:**
- Task needs frequent back-and-forth
- Multiple phases share significant context
- Making quick, targeted changes
- Latency matters (subagents start fresh)

**Use Skills instead when:**
- You want reusable prompts in main conversation context
- Task benefits from full conversation history

## Subagent Anatomy

```
.claude/agents/my-agent.md    # Project-level
~/.claude/agents/my-agent.md  # User-level
```

```markdown
---
name: my-agent
description: What it does. When to use it.
tools: Read, Grep, Glob
model: sonnet
---

You are a [role]. When invoked:
1. [First step]
2. [Second step]
3. [Final output format]
```

## Scope Priority (highest to lowest)

1. `--agents` CLI flag (session only)
2. `.claude/agents/` (project)
3. `~/.claude/agents/` (user)
4. Plugin agents (lowest)

When names collide, higher priority wins.

## Related Skills

- `prompt-engineering` — Subagent prompts are system prompts; apply
  prompting techniques for better agents
- `skill-engineering` — Skills and subagents complement each other;
  understand when to use which
