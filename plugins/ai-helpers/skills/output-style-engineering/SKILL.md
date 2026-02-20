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

## Route to Reference

| Situation | Reference | Contents |
|-----------|-----------|----------|
| File format, frontmatter, storage, activation | [spec.md](references/spec.md) | Frontmatter field details, storage paths, activation methods, file naming rules |
| Creating a style from scratch | [creation.md](references/creation.md) | Full style templates by pattern, testing prompts, creation workflow steps |
| Evaluating style quality | [evaluation.md](references/evaluation.md) | Per-dimension scoring rubrics (1-10), weighted scoring formula, testing protocol |
| Style not working, needs refinement | [iteration.md](references/iteration.md) | Detailed fix patterns with before/after, refinement techniques, version control |
| Real-world examples with analysis | [examples.md](references/examples.md) | 5 complete styles with dimensional scoring and improvement notes |
| Prompt engineering techniques | `prompt-engineering` skill | Instruction design fundamentals |

## What Output Styles Change

Output styles **replace** the default system prompt — they don't augment it.

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

**Key distinction from other features:**

| Feature | Purpose | System Prompt Impact |
|---------|---------|---------------------|
| **Output Style** | Replace main agent personality | Replaces entirely |
| CLAUDE.md | Add project context | Added as user message after |
| `--append-system-prompt` | Add instructions | Appends to system prompt |
| Custom Agents | Specialized sub-tasks | Separate agent context |
| Skills | On-demand task workflows | Loads when triggered |

Output styles are the ONLY way to change the main agent's core personality.

## `keep-coding-instructions`

This field controls whether Claude retains its software engineering guidance.

| Use Case | Setting | Rationale |
|----------|---------|-----------|
| Non-coding domain (research, content) | `false` | Remove irrelevant coding guidance |
| Coding with different tone | `true` | Keep coding skills, change personality |
| Teaching/learning coding | `true` | Need coding knowledge for lessons |
| General assistant | `false` | Broader focus, no coding bias |

Default is `false`. Set `true` when the style is a personality adjustment
for coding work rather than a domain shift.

## File Structure

```
~/.claude/output-styles/           # User-level (all projects)
    my-style.md
.claude/output-styles/             # Project-level (this repo)
    team-style.md
```

Filename becomes the style identifier (without `.md`). Activate with
`/output-style style-name` or via settings. Project-level styles with
the same name override user-level.

Full format details, frontmatter fields, activation methods:
see [spec.md](references/spec.md).

## Writing Style Instructions

Output styles are system prompts. Five components determine quality:

### 1. Define Persona Clearly

The persona is the single highest-leverage element. A vague persona
produces inconsistent behavior; a clear one anchors every response.

**Vague (fails):** "Be helpful and professional."

**Clear (works):**
```markdown
You are a senior technical architect who communicates directly and
values precision over politeness.
```

The test: could two people reading this persona imagine the same
character? If not, add specificity.

### 2. Specify Concrete Behaviors

Abstract instructions ("communicate clearly") get ignored. Concrete
behaviors are testable and unambiguous.

```markdown
## Communication Rules

- Acknowledge valid points with "Correct" or "Valid point"
- State disagreements as "I see it differently because..."
- Never use "I'd be happy to" or "Great question"
- Open with the answer, not pleasantries
```

Each rule should be verifiable: you can check whether a response
complies or not. If you can't verify it, make it more specific.

### 3. Include Tone Examples

Examples are the most reliable way to communicate expected behavior.
Show contrast between default Claude and the target style:

```markdown
## Tone Examples

User: "Can you help me with this code?"

Default Claude (avoid):
"Of course! I'd be happy to help you with your code.
Let me take a look at what you've got..."

This Style (use):
"Looking at the code now. Three issues:
1. [specific issue]
2. [specific issue]
3. [specific issue]"
```

Include at least one contrast example. Cover the interaction types
most likely to trigger default behavior (greetings, requests for
help, disagreements).

### 4. Specify Output Format

Without format guidance, response structure varies unpredictably.
Provide templates for common response types:

```markdown
## Response Format

When providing solutions:
1. State the problem as you understand it
2. List constraints and assumptions
3. Provide recommendation with rationale
4. Note alternatives considered
```

### 5. Add Consistency Safeguards

Styles drift mid-conversation. Explicit persistence language prevents
reversion:

```markdown
## Consistency

Maintain this style throughout the entire conversation. Do not
revert to default patterns even if:
- The topic changes
- The user asks follow-up questions
- Multiple turns have passed
- The task becomes complex or frustrating

If uncertain, default to MORE adherence to this style, not less.
```

### Place Critical Rules at End

Instructions near the end of the prompt are followed more reliably.
Place the rules you absolutely cannot afford to have ignored last:

```markdown
## Critical Rules

These rules override all other guidance:
- Never apologize for limitations
- Never use emoji unless user does first
- Always surface concerns before proceeding
```

### Establish Priority Hierarchy

When a style has rules that could conflict (e.g., "be concise" vs.
"explain your reasoning"), add an explicit priority order:

```markdown
## Priority Hierarchy

When rules conflict, follow this order:
1. Safety and accuracy
2. Style persona
3. Format requirements
4. Length constraints
```

## Common Style Patterns

**Direct Professional:**
Remove sycophancy, focus on substance over pleasantries.
Set `keep-coding-instructions: true`.

**Domain Specialist:**
Replace coding expertise with domain-specific knowledge
(content strategy, research analysis, UX design).
Set `keep-coding-instructions: false`.

**Interaction Mode:**
Change how Claude engages (voice-first, educational quiz,
pair programming mentor). Set `keep-coding-instructions`
based on whether the mode involves coding.

Full templates for each pattern: see [creation.md](references/creation.md).
Scored examples: see [examples.md](references/examples.md).

## Evaluating Style Quality

Six dimensions, three weighted 2x (high-leverage):

| Dimension | Weight | What to Check |
|-----------|--------|---------------|
| **Persona Clarity** | 2x | Can you describe the persona in one sentence? Would two readers imagine the same character? |
| **Behavioral Specificity** | 2x | Is every rule verifiable? Are there concrete do/don't examples? |
| **Example Quality** | 2x | Do examples show contrast (good vs bad)? Do they cover key interaction types? |
| Output Format | 1x | Would Claude know exactly how to structure responses? |
| Consistency Safeguards | 1x | Are default behaviors explicitly forbidden with alternatives? |
| Scope | 1x | Is `keep-coding-instructions` set right? Does the style know what it's for? |

**Must have (critical):** Persona defined, core behaviors listed, at least one
tone example, output format specified.

**Should have:** Multiple contrast examples, explicit "avoid" list, format
templates, `keep-coding-instructions` considered.

Detailed per-dimension scoring rubrics and testing protocol:
see [evaluation.md](references/evaluation.md).

## Iterating on Styles

### Iteration Cycle

```
Observe → Diagnose → Hypothesize → Modify (ONE change) → Test → Repeat
```

Make ONE targeted change per iteration. Multiple changes make
debugging impossible.

### Diagnostic Table

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Reverts to sycophantic tone | Weak persona, no anti-patterns | Add explicit "Never use..." list with forbidden phrases |
| Ignores format | Format buried in text | Move format to end, add example |
| Inconsistent between turns | No persistence language | Add "maintain throughout" with scenario list |
| Works initially, drifts later | No reinforcement | Add consistency section with override language |
| Too verbose | No length constraints | Add explicit length limits |
| Wrong tone in edge cases | Missing example coverage | Add example for the failing scenario |
| Contradictory behavior | Conflicting instructions | Add priority hierarchy |
| Ignores some rules | Too many instructions | Consolidate overlapping rules, prioritize |

### Strengthening Techniques

1. **Repetition** — Reinforce critical rules across persona, behaviors,
   examples, and critical rules sections.
2. **Contrast examples** — Show default Claude (avoid) vs this style (use).
3. **Consolidation** — Merge overlapping rules into single authoritative
   statements. Five scattered "be direct" rules become one "Directness Rule"
   section.
4. **Escalation patterns** — For teaching/mentoring styles, define how
   behavior changes when the user is frustrated or explicitly requests
   a different mode.

### Rewrite vs Iterate

**Iterate** when the core concept is sound, issues are specific, and the
style works in most cases.

**Rewrite** when the persona is wrong for the use case, more than 50% of
tests fail, or conflicting rules have made the style unmaintainable.

Detailed fix patterns with before/after examples:
see [iteration.md](references/iteration.md).

## Built-in Styles

| Style | Purpose | Key Behavior |
|-------|---------|--------------|
| **Default** | Software engineering | Concise, code-focused |
| **Explanatory** | Teaching while coding | Adds "Insight" blocks |
| **Learning** | Collaborative mentoring | Adds `TODO(human)` markers |

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
[Input/output pairs showing tone contrast]

## Consistency
Maintain this style throughout the entire conversation.

## Critical Rules
[Most important rules — placement at end improves compliance]
```

Activate: `/output-style style-name`

## Quick Checks

Before deploying:

- [ ] Persona defined clearly (who is Claude in this style?)
- [ ] Core behaviors are concrete and verifiable
- [ ] At least one contrast example (default vs this style)
- [ ] Output format specified
- [ ] Consistency safeguards included
- [ ] Priority hierarchy established (if rules could conflict)
- [ ] Critical rules placed at end
- [ ] `keep-coding-instructions` set appropriately
- [ ] Tested with varied prompts (simple, complex, edge cases, emotional)
