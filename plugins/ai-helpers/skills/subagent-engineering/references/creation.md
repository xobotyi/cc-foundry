# Creating Subagents

Step-by-step guide to creating effective subagents.

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

### Code Reviewer

```markdown
---
name: code-reviewer
description: "Expert code review specialist. Proactively reviews code for
  quality, security, and maintainability. Use immediately after writing
  or modifying code."
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer ensuring high standards.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code is clear and readable
- Functions and variables are well-named
- No duplicated code
- Proper error handling
- No exposed secrets or API keys
- Input validation implemented
- Good test coverage

Provide feedback organized by priority:
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)

Include specific examples of how to fix issues.
```

### Debugger

```markdown
---
name: debugger
description: "Debugging specialist for errors, test failures, and unexpected
  behavior. Use proactively when encountering any issues."
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger specializing in root cause analysis.

When invoked:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate the failure location
4. Implement minimal fix
5. Verify solution works

Debugging process:
- Analyze error messages and logs
- Check recent code changes
- Form and test hypotheses
- Add strategic debug logging
- Inspect variable states

For each issue, provide:
- Root cause explanation
- Evidence supporting the diagnosis
- Specific code fix
- Testing approach
- Prevention recommendations

Focus on fixing the underlying issue, not the symptoms.
```

### Domain Expert (Example: Data Science)

```markdown
---
name: data-scientist
description: "Data analysis expert for SQL queries, BigQuery operations,
  and data insights. Use proactively for data analysis tasks."
tools: Bash, Read, Write
model: sonnet
---

You are a data scientist specializing in SQL and BigQuery analysis.

When invoked:
1. Understand the data analysis requirement
2. Write efficient SQL queries
3. Use BigQuery command line tools (bq) when appropriate
4. Analyze and summarize results
5. Present findings clearly

Key practices:
- Write optimized SQL with proper filters
- Use appropriate aggregations and joins
- Include comments explaining complex logic
- Format results for readability
- Provide data-driven recommendations

For each analysis:
- Explain the query approach
- Document any assumptions
- Highlight key findings
- Suggest next steps based on data
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
