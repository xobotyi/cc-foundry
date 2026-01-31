# Output Styles vs Other Customization Methods

## Quick Comparison

| Method | What It Does | When to Use |
|--------|--------------|-------------|
| **Output Styles** | Replaces system prompt | Different persona or domain |
| **CLAUDE.md** | Adds project context | Project-specific rules |
| **--append-system-prompt** | Appends to system prompt | Session-specific additions |
| **Custom Agents** | Isolated specialists | Task delegation |
| **Skills** | Task-specific workflows | Reusable procedures |

## Output Styles

**Mechanism:** Completely replaces Claude Code's default system prompt.

**What stays:**
- All tools (Read, Write, Bash, etc.)
- CLAUDE.md project context
- MCP integrations
- Sub-agent delegation
- TODO tracking

**What changes:**
- Personality and communication style
- Domain assumptions
- Task prioritization
- Response formatting

**Best for:**
- Non-coding domains (research, writing, analysis)
- Modified coding personalities (explanatory, learning)
- Consistent persona across all interactions

**Example use:** Transform Claude into a research assistant that tracks
hypotheses and cites sources, while still having file system access.

## CLAUDE.md

**Mechanism:** Added as high-priority context after the system prompt.

**What it provides:**
- Project-specific conventions
- Codebase context
- Team workflows
- Technology constraints

**What it doesn't do:**
- Change Claude's core personality
- Remove software engineering assumptions
- Override system prompt behavior

**Best for:**
- Project documentation and conventions
- Team-wide standards
- Codebase-specific instructions

**Example use:** Document that this project uses specific linting rules,
testing frameworks, or architectural patterns.

## --append-system-prompt

**Mechanism:** Appends content to the end of the system prompt.

**What it provides:**
- Session-specific behavioral adjustments
- Temporary priority changes
- One-off constraints

**What it doesn't do:**
- Persist across sessions
- Replace default behaviors
- Work with non-coding domains

**Best for:**
- Temporary focus (security review, performance audit)
- Session-specific rules
- Quick behavioral tweaks

**Example use:** `claude --append-system-prompt "Focus on security
vulnerabilities. Flag any unsafe patterns."`

## Custom Agents

**Mechanism:** Isolated contexts with custom system prompts and tools.

**What they provide:**
- Task-specific specialists
- Isolated context (no pollution)
- Custom tool access
- Different models per agent

**What they don't do:**
- Change the main conversation's personality
- Persist after task completion
- Share context with main agent

**Best for:**
- Parallel task execution
- Specialized analysis
- Multi-perspective review

**Example use:** Delegate security review to a security-focused agent
while main agent continues feature work.

## Skills

**Mechanism:** Task-specific prompts loaded on demand.

**What they provide:**
- Reusable workflows
- Bundled scripts and references
- Consistent procedures

**What they don't do:**
- Change overall personality
- Persist beyond the task
- Replace system prompt

**Best for:**
- Repeatable procedures (commit, review, deploy)
- Complex multi-step workflows
- Standardized operations

**Example use:** A `/review-pr` skill that runs through a consistent
checklist every time.

## Decision Guide

**"I want Claude to behave differently overall"**
→ Output Style

**"I need project-specific context and rules"**
→ CLAUDE.md

**"I want to focus on something just for this session"**
→ --append-system-prompt

**"I need a specialist for a specific task"**
→ Custom Agent

**"I want a reusable workflow"**
→ Skill

## Combining Methods

These methods stack:

```
Output Style (base personality)
    ↓
CLAUDE.md (project context)
    ↓
--append-system-prompt (session focus)
    ↓
Skills (task workflows)
    ↓
Agents (delegated tasks)
```

Example combination:
- Output style: Research Assistant (persona)
- CLAUDE.md: "This repo contains academic papers in /papers"
- Skill: `/analyze-paper` workflow for consistent analysis
