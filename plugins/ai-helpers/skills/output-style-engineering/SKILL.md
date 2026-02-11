---
name: output-style-engineering
description: >-
  Design Claude Code output styles: persona, tone, and behavioral rules that replace the default
  system prompt. Invoke whenever task involves any interaction with output styles — creating,
  editing, evaluating, or changing how Claude communicates.
---

# Output Style Engineering

Output styles replace Claude Code's system prompt, transforming the
main agent's personality while retaining all tools and capabilities.

<prerequisite>
**Output styles are system prompts.** Before creating or improving
an output style, invoke `prompt-engineering` to load instruction design techniques.

```
Skill(ai-helpers:prompt-engineering)
```

Skip only for trivial edits (typos, formatting).
</prerequisite>

## Quick Start

```bash
mkdir -p ~/.claude/output-styles
```

Create `style-name.md`:

```markdown
---
name: Style Display Name
description: Brief description for the menu
---

# Style Name

[Who Claude is in this style]

## Core Behaviors
- [Explicit rules]

## Examples
[Input/output pairs showing tone]
```

Activate: `/output-style style-name`

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| File format, frontmatter, storage locations | [spec.md](references/spec.md) |
| Creating an output style from scratch | [creation.md](references/creation.md) |
| Evaluating style quality (review, audit) | [evaluation.md](references/evaluation.md) |
| Style not working as expected, needs refinement | [iteration.md](references/iteration.md) |
| Real-world examples with analysis | [examples.md](references/examples.md) |
| Need prompt engineering techniques | `prompt-engineering` skill |

Read the relevant reference before proceeding.

## What Output Styles Change

**Replaced:**
- System prompt personality and domain assumptions
- Task prioritization and interaction patterns
- Response formatting and tone
- Efficiency instructions (concise output)
- Coding instructions (unless `keep-coding-instructions: true`)

**Preserved:**
- All tools (Read, Write, Bash, Grep, etc.)
- CLAUDE.md project context system
- Sub-agent and custom agent delegation
- MCP integrations
- File system operations

## Output Style vs Other Features

| Feature | Purpose | System Prompt Impact |
|---------|---------|---------------------|
| **Output Style** | Replace main agent personality | Replaces entirely |
| CLAUDE.md | Add project context | Added as user message after |
| `--append-system-prompt` | Add instructions | Appends to system prompt |
| Custom Agents | Specialized sub-tasks | Separate agent context |
| Skills | On-demand task workflows | Loads when triggered |

**Key insight:** Output styles are the ONLY way to change the main
agent's core personality. Everything else adds to or delegates from it.

## Detailed Example

```markdown
---
name: Direct Engineer
description: Clear, professional communication without excessive deference
---

# Direct Engineering Communication

Maintain professional tone focused on facts and solutions.

## Core Behaviors

- Acknowledge valid points with neutral language: "Correct" or "Valid point"
- Provide solutions without unnecessary embellishment
- State assumptions explicitly
- Surface concerns immediately
```

Activate with `/output-style direct-engineer` or via `/output-style` menu.

## File Structure

```
~/.claude/output-styles/           # User-level (all projects)
    my-style.md
.claude/output-styles/             # Project-level (this repo)
    team-style.md
```

Filename becomes the style identifier (without `.md`).

## Frontmatter Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | No | Display name (defaults to filename) |
| `description` | No | Shown in `/output-style` menu |
| `keep-coding-instructions` | No | Keep coding parts of default prompt (default: false) |

## Writing Style Instructions

Output styles are system prompts. Apply prompt engineering fundamentals:

**Define the persona clearly:**
```markdown
You are a senior technical architect who communicates directly and
values precision over politeness.
```

**Use imperative instructions:**
```markdown
## Communication Rules

- State facts without hedging
- Provide rationale for recommendations
- Ask clarifying questions before assuming
```

**Specify output format:**
```markdown
## Response Format

When providing solutions:
1. State the problem as you understand it
2. List constraints and assumptions
3. Provide recommendation with rationale
4. Note alternatives considered
```

**Include examples for tone:**
```markdown
## Tone Examples

User: "Is this approach okay?"

Bad: "Great question! I'd be happy to review..."
Good: "The approach has two issues: [specific problems]"
```

## Built-in Styles

| Style | Purpose | Key Behavior |
|-------|---------|--------------|
| **Default** | Software engineering | Concise, code-focused |
| **Explanatory** | Teaching while coding | Adds "Insight" blocks |
| **Learning** | Collaborative mentoring | Adds `TODO(human)` markers |

## Common Patterns

**Direct Professional:**
Remove sycophancy, focus on substance over pleasantries.

**Domain Specialist:**
Replace coding expertise with domain-specific knowledge
(content strategy, research analysis, UX design).

**Interaction Mode:**
Change how Claude engages (voice-first, educational quiz,
pair programming mentor).

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Vague personality | Inconsistent behavior | Define specific persona with role and domain |
| No tone examples | Claude reverts to defaults | Add input/output pairs showing expected tone |
| Contradictory rules | Unpredictable responses | Establish priority hierarchy |
| Instructions too general | Style ignored under pressure | Use concrete behaviors, forbidden phrases |
| No output format | Inconsistent structure | Add response templates |

See [iteration.md](references/iteration.md) for detailed diagnostic patterns.

## Quick Checks

Before deploying:

- [ ] Persona defined clearly (who is Claude in this style?)
- [ ] Core behaviors listed explicitly
- [ ] Output format specified
- [ ] Tone examples included
- [ ] Tested with varied prompts
- [ ] `keep-coding-instructions` set appropriately for use case
