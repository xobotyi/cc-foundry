---
name: subagent-engineering
description: "Claude Code subagent lifecycle: creation, configuration, evaluation, and troubleshooting. Invoke whenever task involves any interaction with Claude Code subagents — designing, debugging, iterating, or deciding when to delegate work to isolated agent contexts."
---

# Subagent Engineering

Manage the full lifecycle of Claude Code subagents: creation, evaluation, iteration, and troubleshooting.

<prerequisite>
**Subagent prompts are system prompts.** Before creating or improving
a subagent, invoke `prompt-engineering` to load instruction design techniques.

```
Skill(ai-helpers:prompt-engineering)
```

Skip only for trivial edits (typos, formatting).

</prerequisite>

## Route to Reference

- **Full frontmatter field reference** — [`${CLAUDE_SKILL_DIR}/references/spec.md`] All fields with constraints, Agent
  tool parameters, built-in agents, permission modes and inheritance, hooks schema, storage locations, SDK
  `settingSources` requirement
- **Step-by-step creation walkthrough** — [`${CLAUDE_SKILL_DIR}/references/creation.md`] Decision matrix (subagent vs
  skill vs team), frontmatter reference, description writing, tool sets, model selection, system prompt structure, 4
  agent type templates, validation checklist
- **Quality scoring and testing** — [`${CLAUDE_SKILL_DIR}/references/evaluation.md`] 5-dimension scoring rubric with
  weights, testing protocol (5 levels), benchmarking methodology, continuous monitoring
- **Improving an existing subagent** — [`${CLAUDE_SKILL_DIR}/references/iteration.md`] Prompt refinement techniques, A/B
  testing, version control, redesign criteria, description optimization
- **Diagnosing failures** — [`${CLAUDE_SKILL_DIR}/references/troubleshooting.md`] Diagnostic steps, Agent Teams issues,
  background agent debugging, worktree cleanup, SDK failures, hooks errors
- **Architecture and examples** — [`${CLAUDE_SKILL_DIR}/references/patterns.md`] Pipeline, parallel, orchestrator
  patterns, Agent Teams, worktree isolation, background execution, Agent SDK, 6 full agent examples

Read the relevant reference for extended depth. Rules below are sufficient for correct work without loading references.

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

**Use Agent Teams when:**

- Multiple agents need to coordinate via shared task list
- Work requires lead/worker structure with peer messaging
- Tasks have dependencies needing synchronized handoffs

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

- Managed settings (organization-wide)
- `--agents` CLI flag (session only)
- `.claude/agents/` (project)
- `~/.claude/agents/` (user)
- Plugin agents (lowest)

When names collide, higher priority wins.

## Required Frontmatter Fields

### `name`

- Lowercase letters, numbers, hyphens only
- Max 64 characters, no `<` or `>` characters
- Cannot contain "anthropic" or "claude"
- Must match filename (minus `.md`)

### `description`

Claude sees ONLY `name` and `description` when deciding to delegate. The body loads AFTER delegation — making the
description the highest-leverage field.

**Formula:** `[What it does in 1 sentence]. [When to use it — specific trigger context].`

**Rules:**

- Lead with what the agent does, not a slogan or tagline
- State when to use it — specific contexts and trigger conditions
- Include "use proactively" to encourage automatic delegation
- Keep execution instructions out of the description — those belong in the body
- Max 1024 characters, no `<` or `>` characters

**Good:**

```yaml
description: "Expert code review specialist. Use proactively after writing or modifying code."

description: "PostgreSQL expert for query optimization and schema design. Use when working
  with .sql files or database performance issues."
```

**Bad:**

```yaml
description: "Helps with code"                    # Too vague
description: "Review code. Steps: 1. Read 2..."   # Execution details
```

## Key Optional Fields

- **`tools`** — allowlist of tools the subagent can use. Inherits ALL parent tools if omitted. Principle: grant minimum
  necessary permissions.
- **`model`** — `haiku` (quick searches, cheap), `sonnet` (everyday coding), `opus` (complex reasoning), `inherit`
  (default)
- **`permissionMode`** — `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`. Subagents inherit
  parent permissions and can restrict further, but cannot escalate.
- **`skills`** — skills to inject into subagent context. Subagents don't inherit skills from parent.
- **`hooks`** — lifecycle hooks scoped to this subagent (PreToolUse, PostToolUse, Stop → SubagentStop)
- **`memory`** — `user`, `project`, or `local` for persistent cross-session storage
- **`isolation`** — `worktree` runs the subagent in a temporary git worktree (safe experimentation)
- **`background`** — `true` to always run as a background task (main agent continues working)
- **`effort`** — `low`, `medium`, `high`, `max` (Opus 4.6 only). Overrides session effort.

Full field reference with constraints: see [`${CLAUDE_SKILL_DIR}/references/spec.md`].

## Writing the System Prompt

Everything after the frontmatter becomes the subagent's system prompt. Subagents receive ONLY this prompt plus basic
environment details — not the full Claude Code system prompt.

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

- **Start with role definition.** "You are a [role] specializing in [domain]."
- **Use numbered steps for workflow.** Explicit ordering prevents skipped steps.
- **Specify output format explicitly.** Include a concrete example of the expected structure.
- **Add constraints to prevent scope creep.** "DO NOT modify files", "ONLY report findings."
- **Add completion criteria.** "Your task is COMPLETE when: [criteria]." Prevents both early termination and over-work.
- **Keep single responsibility.** If listing multiple unrelated capabilities, split into separate agents.
- **Add efficiency instructions.** "Use Grep to locate relevant code BEFORE reading entire files. Return concise
  summaries, not raw data."

## Built-in Subagents

- **Explore** — fast, read-only codebase search. Model: Haiku. Tools: read-only. Invoked with thoroughness level:
  `quick`, `medium`, or `very thorough`.
- **Plan** — read-only research for plan mode. Model: inherits. Cannot spawn subagents.
- **general-purpose** — complex multi-step tasks. Model: inherits. Tools: all. Default when no type specified.
- **Bash** — command execution in separate context. Model: inherits.
- **claude-code-guide** — questions about Claude Code features. Model: Haiku.

## Agent Teams

Agent Teams scale subagents into coordinated crews with a shared task list and peer messaging:

- **Team lead** creates the team with `TeamCreate`, creates tasks with `TaskCreate`, spawns teammates with `team_name`
- **Teammates** claim tasks, work independently, communicate via `SendMessage`, mark tasks completed
- **Shared task list** — all agents can read, update, and create tasks. Dependencies via `blockedBy`.
- **Idle notification** — teammates automatically notify the lead when idle. This is normal, not an error.

**When to use teams vs standalone subagents:**

- Standalone: tasks are fully independent, no coordination needed
- Teams: tasks share findings, have dependencies, or need lead/worker structure

Standalone subagents pollute the caller's context (TaskOutput injects full output). Teammates communicate via short
SendMessage summaries — much more context-efficient.

Architecture patterns and team examples: see [`${CLAUDE_SKILL_DIR}/references/patterns.md`].

## Evaluation Criteria

When evaluating a subagent, assess five dimensions:

- **Task Completion (30%)** — follows workflow, produces expected output
- **Trigger Accuracy (25%)** — delegates at the right times, not at wrong times
- **Output Quality (25%)** — clear, complete, actionable, format-compliant
- **Context Efficiency (10%)** — concise returns, no unnecessary tool calls
- **Tool Usage (10%)** — uses only granted tools, handles errors gracefully

Scoring: 4.5+ excellent, 3.5-4.4 good, 2.5-3.4 needs revision, <2.5 redesign.

Full rubric with testing protocol: see [`${CLAUDE_SKILL_DIR}/references/evaluation.md`].

## Common Issues and Fixes

- **Doesn't trigger** — description too narrow. Broaden description, add "use proactively", verify file loads with
  `/agents`.
- **Over-triggers** — description too vague or overlaps. Narrow scope, add explicit boundaries.
- **Wrong output format** — no format spec. Add `## Output Format` section with concrete example.
- **Incomplete execution** — workflow isn't explicit. Add numbered steps with completion criteria.
- **Scope creep** — tools too permissive. Restrict `tools` list and add `## Constraints` section.
- **Poor context efficiency** — no efficiency guidance. Add: "Use Grep before Read. Return concise summary (max 500
  words)."

Detailed diagnostics: see [`${CLAUDE_SKILL_DIR}/references/troubleshooting.md`].

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

- `prompt-engineering` — load first for instruction design techniques (subagent prompts are system prompts)
- `skill-engineering` — skills and subagents complement each other; skills run in main context, subagents in isolation
- `output-style-engineering` — output styles replace the system prompt; subagents extend it
- `claude-code-sdk` — consult for API/configuration details
