---
name: subagent-engineering
description: >-
  Claude Code subagent lifecycle: creation, configuration, evaluation, and troubleshooting. Invoke
  whenever task involves any interaction with Claude Code subagents — designing, debugging,
  iterating, or deciding when to delegate work to isolated agent contexts.
---

# Subagent Engineering

Manage the full lifecycle of Claude Code subagents: creation, evaluation,
iteration, and troubleshooting.

<prerequisite>
**Subagent prompts are system prompts.** Before creating or improving
a subagent, invoke `prompt-engineering` to load instruction design techniques.

```
Skill(ai-helpers:prompt-engineering)
```

Skip only for trivial edits (typos, formatting).
</prerequisite>

## Route to Reference

| Situation | Reference | Contents |
|-----------|-----------|----------|
| Full frontmatter field reference | [spec.md](references/spec.md) | All fields with constraints, hooks schema, CLI-defined agents, storage locations |
| Step-by-step creation walkthrough | [creation.md](references/creation.md) | Detailed process, common agent type templates, proactive delegation |
| Quality scoring and testing | [evaluation.md](references/evaluation.md) | 5-dimension scoring rubric with weights, testing protocol (5 levels), benchmarking |
| Improving an existing subagent | [iteration.md](references/iteration.md) | Prompt refinement techniques, A/B testing, version control, redesign criteria |
| Diagnosing failures | [troubleshooting.md](references/troubleshooting.md) | Diagnostic steps, error message catalog, debug mode |
| Architecture and examples | [patterns.md](references/patterns.md) | Full agent examples, pipeline/parallel/master-clone patterns, multi-agent coordination |

Read the relevant reference for extended depth. The rules below are sufficient
for correct work without loading references.

## When to Use Subagents

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

**Use skills instead when:**
- You want reusable prompts in main conversation context
- Task benefits from full conversation history

## Subagent File Format

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

### Scope Priority (highest to lowest)

1. `--agents` CLI flag (session only)
2. `.claude/agents/` (project)
3. `~/.claude/agents/` (user)
4. Plugin agents (lowest)

When names collide, higher priority wins.

## Required Frontmatter Fields

### `name`

- Lowercase letters, numbers, hyphens only
- Max 64 characters, no `<` or `>` characters
- Cannot contain "anthropic" or "claude"
- Must match filename (minus `.md`)

### `description`

Claude sees ONLY `name` and `description` when deciding to delegate.
The body loads AFTER delegation. This makes the description the
highest-leverage field.

**Formula:**
```
[What it does in 1 sentence]. [When to use it — specific trigger context].
```

**Rules:**
1. Lead with what the agent does, not a slogan or tagline.
2. State when to use it — specific contexts and trigger conditions.
3. Include "use proactively" to encourage automatic delegation.
4. Keep execution instructions out of the description — those belong
   in the body.
5. No keyword lists, no second person ("you can..."), no vague verbs
   ("helps", "assists").
6. Max 1024 characters, no `<` or `>` characters.

**Good:**
```yaml
description: "Expert code review specialist. Proactively reviews code for
  quality, security, and maintainability. Use immediately after writing
  or modifying code."

description: "PostgreSQL database expert for query optimization and schema
  design. Use when working with .sql files or database performance issues."
```

**Bad:**
```yaml
description: "Helps with code"                    # Too vague
description: "Review code. Steps: 1. Read 2..."   # Execution details
description: "Code review. Keywords: review..."    # Keyword stuffing
```

## Optional Frontmatter Fields

### `tools`

Allowlist of tools the subagent can use. If omitted, inherits ALL tools
from the main conversation (including MCP tools). Be intentional — don't
leave it blank unless you want full access.

**Principle: grant minimum necessary permissions.**

| Agent Type | Recommended Tools |
|------------|-------------------|
| Read-only (reviewers, analysts) | `Read, Grep, Glob` |
| Research (with web) | `Read, Grep, Glob, WebFetch, WebSearch` |
| Code writers | `Read, Write, Edit, Bash, Glob, Grep` |
| Documentation | `Read, Write, Edit, Glob, Grep, WebFetch` |

Available built-in tools: `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`,
`WebFetch`, `WebSearch`, `Task` (main agent only), `NotebookEdit`.

Use `disallowedTools` when you want most tools but need to exclude a few.

### `model`

| Value | When to Use |
|-------|-------------|
| `haiku` | Quick searches, docs, simple analysis — fast and cheap |
| `sonnet` | Everyday coding, debugging, refactoring |
| `opus` | Architecture decisions, security audits, complex reasoning |
| `inherit` | Match parent model (default if omitted) |

### `permissionMode`

| Mode | Behavior |
|------|----------|
| `default` | Standard permission checking |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny prompts (allowed tools still work) |
| `bypassPermissions` | Skip all permission checks |
| `plan` | Plan mode (read-only exploration) |

**Security rules:**
- Prefer `plan` mode for read-only agents — enforce safety at the
  permission level, not just in the prompt.
- `bypassPermissions` skips ALL checks including file writes and command
  execution. Only use for trusted, well-tested agents.
- If parent uses `bypassPermissions`, child agents inherit it and
  cannot override to a more restrictive mode.

### `skills`

Skills to inject into the subagent's context at startup. Subagents don't
inherit skills from parent — list them explicitly.

```yaml
skills:
  - api-conventions
  - error-handling-patterns
```

### `hooks`

Lifecycle hooks scoped to this subagent. Supported events:
`PreToolUse`, `PostToolUse`, `Stop` (converted to `SubagentStop`).

Full hook schema and examples: see [spec.md](references/spec.md).

## Writing the System Prompt

Everything after the frontmatter becomes the subagent's system prompt.
Subagents receive ONLY this prompt plus basic environment details — not
the full Claude Code system prompt.

### Structure Template

```markdown
You are a [role] specializing in [domain].

## When Invoked
1. [First action]
2. [Second action]
3. [Continue until complete]

## Guidelines
- [Guideline 1]
- [Guideline 2]

## Constraints
- [Boundary 1 — what NOT to do]

## Output Format
[Specify exact structure with example]
```

### System Prompt Rules

1. **Start with role definition.** "You are a [role] specializing in
   [domain]."
2. **Use numbered steps for workflow.** Explicit ordering prevents
   skipped steps.
3. **Specify output format explicitly.** Include a concrete example of
   the expected output structure.
4. **Add constraints to prevent scope creep.** "DO NOT modify files",
   "ONLY report findings", "ASK for clarification if unclear."
5. **Include checklists for consistency.** Agents follow checklists
   more reliably than prose guidelines.
6. **Add completion criteria.** "Your task is COMPLETE when: [criteria]."
   Prevents both early termination and over-work.
7. **Keep single responsibility.** If listing multiple unrelated
   capabilities, split into separate agents.
8. **Add efficiency instructions.** "Use Grep to locate relevant code
   BEFORE reading entire files. Return concise summaries, not raw data."

## Core Design Principles

1. **Description is the trigger.** Claude sees ONLY `name` +
   `description` when deciding to delegate. Vague descriptions cause
   wrong triggers. Specific descriptions enable correct delegation.

2. **Single responsibility.** Each subagent excels at ONE task. Don't
   create Swiss Army knife agents — they're hard to trigger correctly
   and mediocre at everything.

3. **Minimal tool access.** Grant only necessary permissions. Read-only
   agents don't need Edit/Write. Excess tools invite scope creep.

4. **Clear handoffs.** Design subagents to return actionable summaries,
   not raw data dumps. The parent agent (or user) should be able to
   act on the output immediately.

5. **Context efficiency.** Subagents should use Grep before Read,
   stop when they have enough information, and return synthesized
   findings. Verbose returns consume parent context.

## Built-in Subagents

| Agent | Model | Purpose |
|-------|-------|---------|
| **Explore** | Haiku | Fast, read-only codebase exploration |
| **Plan** | Inherits | Research for plan mode |
| **general-purpose** | Inherits | Complex multi-step tasks |
| **Bash** | Inherits | Command execution in separate context |
| **claude-code-guide** | Haiku | Questions about Claude Code features |

## Evaluation Criteria

When evaluating a subagent, assess these five dimensions:

1. **Trigger Accuracy (25%)** — Does Claude delegate at the right times?
   Test with: direct invocation, implicit matching, and non-matching tasks.
2. **Task Completion (30%)** — Does the agent follow its workflow and
   produce the expected output? Test happy path, edge cases, and
   out-of-scope requests.
3. **Output Quality (25%)** — Is output clear, complete, actionable, and
   format-compliant? Red flags: raw data dumps, missing information,
   inconsistent formatting.
4. **Context Efficiency (10%)** — Does it return concise summaries? Does
   it avoid unnecessary tool calls and excessive file reads?
5. **Tool Usage (10%)** — Does it use only granted tools efficiently?
   Does it handle tool errors gracefully?

Scoring: 4.5+ excellent, 3.5-4.4 good, 2.5-3.4 needs revision, <2.5
redesign. Full rubric with testing protocol: see
[evaluation.md](references/evaluation.md).

## Common Issues and Fixes

### Agent doesn't trigger

Description is too narrow or name has a typo. Broaden the description,
add "use proactively", and verify the file loads with `/agents`.

### Agent over-triggers

Description is too vague or overlaps with other agents. Narrow the scope,
add explicit boundaries: "Security review for auth code only. NOT for
general code review."

### Wrong output format

No format specification in the prompt, or no example. Add an explicit
`## Output Format` section with a concrete example of the expected
structure.

### Incomplete task execution

Workflow isn't explicit enough. Add numbered steps with "IN ORDER",
a completion checklist ("Before returning, verify:"), and explicit
completion criteria.

### Scope creep

Tools are too permissive or prompt doesn't set boundaries. Restrict
the tools list and add a `## Constraints` section with explicit
prohibitions.

### Poor context efficiency

No efficiency guidance. Add: "Use Grep to locate relevant code BEFORE
reading entire files. Stop searching once you have sufficient information.
Return a concise summary (max 500 words)."

Detailed diagnostic steps, error messages, and debug mode: see
[troubleshooting.md](references/troubleshooting.md).

## Validation Checklist

Before deploying a subagent:

- [ ] `name` is lowercase with hyphens, no "anthropic" or "claude"
- [ ] `description` explains what AND when (under 1024 chars)
- [ ] `description` has no execution instructions
- [ ] `tools` is minimal (only what's needed)
- [ ] `model` matches task complexity
- [ ] System prompt starts with role definition
- [ ] System prompt has numbered workflow steps
- [ ] Output format is explicitly specified with example
- [ ] Constraints section prevents scope creep
- [ ] Completion criteria are defined
- [ ] Tested with representative tasks

## Related Skills

- `prompt-engineering` — Load first for instruction design techniques
  (subagent prompts are system prompts)
- `skill-engineering` — Skills and subagents complement each other;
  skills run in main context, subagents run in isolation
- `claude-code-sdk` — Consult for API/configuration details
