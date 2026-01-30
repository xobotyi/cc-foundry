# Advanced Skill Patterns

## String Substitutions

Skills support dynamic value substitution in content:

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` | Specific argument by 0-based index |
| `$N` | Shorthand for `$ARGUMENTS[N]` (`$0`, `$1`, `$2`) |
| `${CLAUDE_SESSION_ID}` | Current session ID |

**Example: Positional Arguments**
```yaml
---
name: migrate-component
description: Migrate a component from one framework to another
---

Migrate the $0 component from $1 to $2.
Preserve all existing behavior and tests.
```

Usage: `/migrate-component SearchBar React Vue`

**Example: Session Logging**
```yaml
---
name: session-logger
description: Log activity for this session
---

Log the following to logs/${CLAUDE_SESSION_ID}.log:

$ARGUMENTS
```

## Dynamic Context Injection

The `!`command`` syntax runs shell commands **before** skill content is
sent to Claude. Output replaces the placeholder.

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

**How it works:**
1. Each `!`command`` executes immediately (preprocessing)
2. Output replaces the placeholder in skill content
3. Claude receives the fully-rendered prompt

This is **preprocessing**, not something Claude executes.

## Invocation Control Matrix

Two frontmatter fields control who can invoke a skill:

| Frontmatter | User | Claude | When loaded |
|-------------|------|--------|-------------|
| (default) | Yes | Yes | Description always, body on invoke |
| `disable-model-invocation: true` | Yes | No | Nothing until user invokes |
| `user-invocable: false` | No | Yes | Description always, body on invoke |

**When to use each:**

- **`disable-model-invocation: true`**: Side effects or timing-sensitive.
  Deploy, commit, send notifications. Prevent Claude from auto-triggering.

- **`user-invocable: false`**: Background knowledge, not actionable as
  a command. Legacy system context, domain rules. Claude uses when
  relevant, but `/skill-name` isn't meaningful.

```yaml
# User-only: don't let Claude auto-deploy
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---
```

```yaml
# Claude-only: background knowledge
---
name: legacy-system-context
description: Context about legacy authentication system
user-invocable: false
---
```

## Run Skills in Subagents

Add `context: fork` to run skill in isolated context. The skill content
becomes the subagent's prompt.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:

1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

**How it works:**
1. New isolated context created
2. Subagent receives skill content as prompt
3. `agent` field determines execution environment
4. Results summarized and returned to main conversation

**Agent options:**
- `Explore` — read-only, fast, for codebase exploration
- `Plan` — read-only, for planning and research
- `general-purpose` — full tools (default if omitted)
- Custom agent from `.claude/agents/`

**Skills + Subagents relationship:**

| Approach | System prompt | Task | Also loads |
|----------|---------------|------|------------|
| Skill with `context: fork` | From agent type | SKILL.md content | CLAUDE.md |
| Subagent with `skills` field | Subagent's body | Delegation message | Preloaded skills + CLAUDE.md |

## Visual Output Pattern

Skills can bundle scripts that generate interactive output.

**Structure:**
```
codebase-visualizer/
├── SKILL.md
└── scripts/
    └── visualize.py
```

**SKILL.md:**
```yaml
---
name: codebase-visualizer
description: Generate an interactive collapsible tree visualization of
  your codebase. Use when exploring a new repo or understanding structure.
allowed-tools: Bash(python *)
---

# Codebase Visualizer

Run the visualization script from your project root:

```bash
python ~/.claude/skills/codebase-visualizer/scripts/visualize.py .
```

This creates `codebase-map.html` in the current directory.
```

**Key pattern:**
- Skill instructs Claude to run bundled script
- Script generates output file (HTML, PDF, etc.)
- Claude can open result in browser or report location

**Common uses:**
- Dependency graphs
- Test coverage reports
- API documentation
- Database schema visualizations

## Restrict Tool Access

Limit tools when skill is active:

```yaml
---
name: safe-reader
description: Read files without making changes
allowed-tools: Read, Grep, Glob
---
```

Claude can only use listed tools without permission prompts.

## Skill-Scoped Hooks

Run hooks only while skill is active:

```yaml
---
name: secure-operations
description: Perform operations with security checks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
          once: true
---
```

**Supported events:** `PreToolUse`, `PostToolUse`, `Stop`

**`once: true`**: Run hook only once per session, then remove.

## Extended Thinking

To enable extended thinking in a skill, include "ultrathink" anywhere
in content:

```yaml
---
name: complex-analysis
description: Deep analysis of complex problems
---

Analyze this problem thoroughly. ultrathink

[Instructions...]
```

## Skill Distribution Scopes

| Scope | Path | Applies to |
|-------|------|------------|
| Enterprise | Managed settings | All org users |
| Personal | `~/.claude/skills/` | You, all projects |
| Project | `.claude/skills/` | This project only |
| Plugin | `<plugin>/skills/` | Where plugin is enabled |

**Priority:** enterprise > personal > project (higher wins on collision)

Plugin skills use namespace: `plugin-name:skill-name` (no conflicts)
