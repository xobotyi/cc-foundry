# Creating Subagents

Step-by-step guide for building effective Claude Code subagents: when to use them, how to configure them, and common
patterns that work.

---

## When to Use a Subagent

Subagents are not always the right tool. Pick the right primitive for the job:

**Use a subagent when:**

- The task needs context isolation (large file analysis, deep research that would pollute the main context)
- Work can run in parallel alongside other tasks
- A specialized model or restricted toolset is required for that task
- The task is one-off within a session and doesn't need reuse across projects

**Use a skill instead when:**

- You need reusable prompt instructions, not a separate context window
- The task is a prompt template or behavioral modifier for the main conversation
- No context isolation benefit exists

**Use an agent team instead when:**

- Multiple coordinated agents need to share a task list and communicate
- Work requires a lead/worker structure with `SendMessage` coordination
- Tasks have dependencies and need synchronized handoffs

---

## Two Creation Methods

### Interactive: `/agents` command

Recommended for first-time creation:

```
/agents
→ Library tab → Create new agent
→ Personal (user-level) or Project (project-level)
→ Generate with Claude — describe the subagent in plain language
→ Select tools
→ Select model
→ Choose color
→ Configure memory (optional)
→ Save (s/Enter) or Save + edit (e)
```

The subagent is available immediately. No session restart required.

### Manual: write the file directly

```bash
# Project-level — committed to version control, team-shared
.claude/agents/my-agent.md

# User-level — available in all your projects
~/.claude/agents/my-agent.md
```

Manually created files are loaded on session start. Use `/agents` to load without restart.

---

## Scope and Priority

When multiple agents share the same name, higher-priority location wins:

- `managed settings` — organization-wide, highest priority
- `--agents` CLI flag — current session only (JSON, not persisted)
- `.claude/agents/` — current project
- `~/.claude/agents/` — all your projects
- plugin `agents/` directory — lowest priority

**Project subagents** (`.claude/agents/`) should be checked into version control so the team shares and improves them.

---

## File Structure

Subagent files use YAML frontmatter + markdown body:

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices. Use proactively after code changes.
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer specializing in [domain].

When invoked:

1. [First action]
2. [Analysis step]
3. [Compile and return results]

Guidelines:

- [Key guideline 1]
- [Key guideline 2]

Output format:

## Issues Found

- [Issue]: [Location] — [Recommendation]
```

Only `name` and `description` are required. Everything else is optional.

---

## Frontmatter Fields

**Required:**

- `name` — lowercase letters and hyphens, unique identifier
- `description` — when Claude should delegate; this is the routing signal

**Common optional fields:**

- `tools` — allowlist of tools; inherits all tools if omitted
- `disallowedTools` — denylist applied to inherited tools
- `model` — `sonnet`, `opus`, `haiku`, full model ID, or `inherit` (default)
- `permissionMode` — `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`
- `maxTurns` — hard cap on agentic turns
- `skills` — skills to inject into subagent context at startup
- `mcpServers` — MCP servers scoped to this subagent only
- `hooks` — lifecycle hooks scoped to this subagent
- `memory` — `user`, `project`, or `local` for persistent cross-session learning
- `isolation` — `worktree` gives the subagent an isolated git worktree copy
- `background` — `true` to always run as a background task
- `effort` — `low`, `medium`, `high`, `max` (Opus 4.6 only)
- `color` — UI color: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`

**Tool resolution rules:**

- If both `tools` and `disallowedTools` are set: denylist is applied first, then allowlist resolves against the
  remaining pool
- A tool in both lists is removed
- Plugin subagents cannot use `hooks`, `mcpServers`, or `permissionMode` (silently ignored)

---

## Writing an Effective Description

The description is the routing signal — Claude uses only `name` and `description` to decide whether to delegate. It must
answer two questions: what does this agent do, and when should it be invoked.

**Formula:** `[Role/what it does]. [When to invoke it].`

Good examples:

- `description: Expert code reviewer. Use proactively after code changes.`
- `description: PostgreSQL expert for query optimization and schema design. Use when working with .sql files or database performance issues.`
- `description: Debugging specialist for errors and test failures. Use proactively when encountering any issues.`

Bad patterns:

- Too vague: `"Helps with code"` — no routing signal
- Execution steps in description: belongs in the body, not here
- Keyword stuffing: `"review, quality, lint, security"` — not how routing works

**Proactive delegation:** Include "use proactively" to have Claude delegate automatically when it recognizes matching
context, without waiting for an explicit instruction.

---

## Choosing Tools

Grant minimum necessary permissions. Do not leave `tools` blank unless full tool access is intentional.

Common tool sets by agent type:

- Read-only reviewer/analyst — `Read, Grep, Glob`
- Research with web access — `Read, Grep, Glob, WebFetch, WebSearch`
- Code writer/implementer — `Read, Write, Edit, Bash, Glob, Grep`
- Documentation writer — `Read, Write, Edit, Glob, Grep, WebFetch`
- Test runner — `Read, Bash, Glob, Grep`

---

## Choosing a Model

Model selection by task complexity:

- `haiku` — quick lookups, simple doc generation, high-volume low-cost tasks
- `sonnet` — everyday coding, debugging, refactoring, most analysis
- `opus` — architecture decisions, security audits, complex multi-step reasoning
- `inherit` — match the parent conversation model (default when omitted)

Model resolution order when Claude invokes a subagent:

1. `CLAUDE_CODE_SUBAGENT_MODEL` environment variable
2. Per-invocation `model` parameter from Claude
3. Subagent definition's `model` frontmatter
4. Main conversation model

---

## Writing the System Prompt

The body becomes the subagent's system prompt. The subagent receives **only** this prompt plus basic environment details
— not Claude Code's full system prompt.

Structure that works:

```markdown
You are a [role] specializing in [domain].

When invoked:

1. [First action — gather context]
2. [Second action — analysis or work]
3. [Third action — compile results]
4. [Return findings in specified format]

Guidelines:

- [Behavioral constraint 1]
- [Behavioral constraint 2]
- Be direct and critical — override default agreeable LLM behavior

Output format:

## [Section heading]

[Specify exact structure here. Examples help format compliance.]
```

Key principles:

- Role first — establishes the persona immediately
- Numbered workflow steps — explicit sequence prevents drift
- Constraints section — narrows scope, prevents feature creep
- Output format section — eliminates formatting ambiguity
- Challenge the user — include "ask follow-up questions" or "be critical" to prevent sycophantic behavior

---

## Common Agent Types

**Read-only reviewer** (code, docs, security):

```markdown
---
name: code-reviewer
description: Reviews code for quality, security, and maintainability. Use proactively after
  writing or modifying any code.
tools: Read, Grep, Glob
model: sonnet
---

You are a code reviewer focused on quality and security.

When invoked:

1. Identify the files changed or specified
2. Read each file and analyze for: correctness, security issues, naming, complexity
3. Report findings with file paths and line numbers

Output format:

## Issues

- [Severity]: [file:line] — [description and recommendation]

## Summary

[1-2 sentence overall assessment]
```

**Debugging specialist** (errors, test failures):

```markdown
---
name: debugger
description: Root cause analysis for errors, test failures, and unexpected behavior. Use
  proactively when encountering any runtime or test issue.
tools: Read, Bash, Grep, Glob
model: sonnet
---

You are a methodical debugger.

When invoked:

1. Ask: when did this last work? What changed recently?
2. Read error messages and stack traces
3. Trace to root cause — do not stop at symptoms
4. Propose a minimal fix with explanation

Do not guess. If uncertain, say so and ask clarifying questions.
```

**Research agent** (web + file analysis):

```markdown
---
name: researcher
description: Investigates technical topics, library APIs, and best practices using web search
  and local docs.
tools: Read, Grep, Glob, WebFetch, WebSearch
model: sonnet
---

You are a research specialist.

When invoked:

1. Clarify the research question
2. Search relevant sources — prefer official docs over secondary sources
3. Cross-reference findings
4. Return a structured summary with source citations

Flag uncertainty explicitly. Do not fabricate API details.
```

**Documentation writer**:

```markdown
---
name: doc-writer
description: Writes and updates technical documentation, READMEs, and inline comments. Use
  when documentation is missing, outdated, or unclear.
tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

You are a technical documentation specialist.

When invoked:

1. Read the code or feature being documented
2. Identify the audience (end user vs. contributor)
3. Write clear, minimal documentation — no padding
4. Update existing docs if present, create new files only if necessary

Prefer editing over creating. Match the existing style and voice.
```

---

## Validation Checklist

Before using a subagent in production:

- [ ] `name` is lowercase with hyphens
- [ ] `description` answers what AND when (routing signal is clear)
- [ ] `tools` is minimal — only what the task requires
- [ ] `model` matches task complexity (don't use opus for simple lookups)
- [ ] System prompt has explicit role, numbered workflow, and output format
- [ ] Agent has a single responsibility — if listing unrelated capabilities, split it
- [ ] Tested with representative inputs: does Claude delegate correctly?
- [ ] Output format is consistent and useful to the parent conversation
