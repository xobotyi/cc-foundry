# Creating Subagents

Step-by-step guide to creating effective subagents.

---

## Table of Contents
- [Two Approaches](#two-approaches)
- [Creation Process](#creation-process)
- [Common Agent Types](#common-agent-types)
- [Proactive Delegation](#proactive-delegation)
- [Validation Before Deployment](#validation-before-deployment)

---

## Two Approaches

### 1. Interactive (`/agents` command)

Recommended for getting started:

```
/agents
→ Create new agent
→ Project-level or User-level
→ Generate with Claude (describe what you want)
→ Select tools
→ Select model
→ Choose color
→ Save
```

Claude generates the system prompt based on your description.
Press `e` to open in editor and customize.

### 2. Manual (write the file)

Create a markdown file directly:

```bash
# Project-level (current repo only)
mkdir -p .claude/agents
touch .claude/agents/my-agent.md

# User-level (all projects)
mkdir -p ~/.claude/agents
touch ~/.claude/agents/my-agent.md
```

**Note:** Manually created agents load on session start. Use `/agents`
to load immediately without restart.

## Creation Process

### Step 1: Define the Purpose

Answer these questions:
- What specific task does this agent handle?
- When should Claude delegate to it?
- What tools does it need?
- What output format should it produce?

**Single responsibility principle:** Each agent should excel at ONE task.
If you're listing multiple unrelated capabilities, split into separate agents.

### Step 2: Write the Description

The description is CRITICAL. Claude uses ONLY `name` and `description`
to decide whether to delegate.

**Template:**
```
[What it does in 1 sentence]. [When to use it].
```

**Examples:**
```yaml
# Good: specific role + clear trigger
description: "Expert code review specialist. Proactively reviews code for
  quality, security, and maintainability. Use immediately after writing
  or modifying code."

# Good: domain-specific + use case
description: "PostgreSQL database expert for query optimization and schema
  design. Use when working with .sql files or database performance issues."

# Good: action-oriented + context
description: "Debugging specialist for errors, test failures, and unexpected
  behavior. Use proactively when encountering any issues."
```

**Anti-patterns:**
```yaml
# Bad: too vague
description: "Helps with code"

# Bad: execution details (belongs in body)
description: "Review code. Steps: 1. Read 2. Analyze 3. Report"

# Bad: keyword stuffing
description: "Code review. Keywords: review, quality, lint, security"
```

### Step 3: Select Tools

**Principle:** Grant minimum necessary permissions.

| Agent Type | Recommended Tools |
|------------|-------------------|
| Read-only (reviewers, analysts) | `Read, Grep, Glob` |
| Research (with web) | `Read, Grep, Glob, WebFetch, WebSearch` |
| Code writers | `Read, Write, Edit, Bash, Glob, Grep` |
| Documentation | `Read, Write, Edit, Glob, Grep, WebFetch` |

**If omitted:** Inherits ALL tools from main conversation (including MCP).
Be intentional — don't leave it blank unless you want full access.

### Step 4: Choose the Model

| Model | When to Use |
|-------|-------------|
| `haiku` | Quick searches, docs, simple analysis |
| `sonnet` | Everyday coding, debugging, refactoring |
| `opus` | Architecture decisions, security audits, complex reasoning |
| `inherit` | Match parent (default) |

**Cost consideration:** Haiku is significantly cheaper. Use it for
high-volume, straightforward tasks.

### Step 5: Write the System Prompt

The system prompt is where prompt engineering matters most. Apply
techniques from `prompt-engineering` skill: clear structure, numbered
steps, XML tags for complex inputs, examples for format compliance.

Structure your prompt clearly:

```markdown
---
name: agent-name
description: What it does. When to use it.
tools: Read, Grep, Glob
model: sonnet
---

You are a [role] specializing in [domain].

## When Invoked
1. [First action]
2. [Second action]
3. [Continue until complete]

## Guidelines
- [Guideline 1]
- [Guideline 2]

## Output Format
[Specify exact structure]

[Include examples if helpful]
```

**Best practices:**
- Start with clear role definition
- Use numbered steps for workflow
- Include checklists for consistency
- Specify output format explicitly
- Add constraints to prevent scope creep

### Step 6: Test and Iterate

Test with various inputs:
```
Use the [agent-name] subagent to [task]
```

Observe:
- Does Claude delegate correctly?
- Does the agent follow the workflow?
- Is the output format correct?
- Are there edge cases that fail?

Iterate on the system prompt based on failures.

## Common Agent Types

For full examples with complete prompts, see [patterns.md](patterns.md).

Common patterns:
- **Code Reviewer** — Read-only analysis after code changes
- **Debugger** — Root cause analysis with edit permissions
- **Security Auditor** — Vulnerability scanning (read-only, opus model)
- **Domain Expert** — Specialized knowledge (SQL, APIs, etc.)
- **Test Runner** — Execute and analyze test results

**Template (compact):**

```markdown
---
name: [role]-[action]
description: "[What it does]. Use [when/proactively]."
tools: [minimal set]
model: [haiku|sonnet|opus|inherit]
---

You are a [role] specializing in [domain].

When invoked:
1. [First action]
2. [Analysis/work]
3. [Compile results]

Checklist:
- [ ] [Key check 1]
- [ ] [Key check 2]

Output format:
## [Section 1]
- [Finding]: [Location] - [Recommendation]
```

## Proactive Delegation

Include "use proactively" in descriptions to encourage automatic delegation:

```yaml
description: "Code reviewer. Use proactively after code changes."
description: "Debugger. Use proactively when encountering errors."
description: "Test runner. Use proactively after implementation."
```

Claude will delegate automatically when it recognizes matching contexts.

## Validation Before Deployment

- [ ] Name is lowercase with hyphens
- [ ] Description explains what AND when
- [ ] Tools are minimal (only what's needed)
- [ ] Model matches task complexity
- [ ] System prompt has clear workflow
- [ ] Output format is specified
- [ ] Tested with representative tasks
