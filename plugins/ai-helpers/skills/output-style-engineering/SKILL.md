---
name: output-style-engineering
description: "Design Claude Code output styles: persona, tone, and behavioral rules that replace the default system prompt. Invoke whenever task involves any interaction with output styles — creating, editing, evaluating, or changing how Claude communicates."
---

# Output Style Engineering

Output styles replace Claude Code's system prompt, transforming the main agent's personality while retaining all tools
and capabilities.

<prerequisite>
**Output styles are system prompts.** Before creating or improving
an output style, invoke `prompt-engineering` to load instruction design techniques.

```
Skill(ai-helpers:prompt-engineering)
```

Skip only for trivial edits (typos, formatting).

</prerequisite>

## Route to Reference

- **File format, frontmatter, storage, activation** — [`${CLAUDE_SKILL_DIR}/references/spec.md`] Frontmatter field
  details, replace-vs-preserve semantics, storage paths, activation methods, scope priority, session timing and
  reminders, token impact, built-in styles catalog, feature comparison table, Agent SDK system prompt approaches (4
  methods)
- **Creating a style from scratch** — [`${CLAUDE_SKILL_DIR}/references/creation.md`] Replace-not-augment principle,
  creation methods (manual, SDK), creation workflow, style pattern templates (direct professional, domain specialist
  with non-coding use cases, interaction mode, learning/educational with voice-first design), token impact, common
  failure modes
- **Evaluating style quality** — [`${CLAUDE_SKILL_DIR}/references/evaluation.md`] Scope appropriateness pre-check,
  per-dimension scoring rubrics (1-10), weighted scoring formula, testing protocol (4 core + 3 persistence + 1 domain),
  deployment readiness go/no-go, red flags
- **Style not working, needs refinement** — [`${CLAUDE_SKILL_DIR}/references/iteration.md`] Mechanism mismatch
  diagnosis, diagnostic symptom→fix mapping with community evidence, refinement techniques (repetition, contrast,
  consolidation), escalation patterns, rewrite vs iterate criteria
- **Real-world examples with analysis** — [`${CLAUDE_SKILL_DIR}/references/examples.md`] 5 complete styles with
  dimensional scoring and improvement notes — includes non-coding examples (SaaS analyst, content strategist)

## What Output Styles Change

Output styles **replace** the default system prompt — they don't augment it.

**Replaced:**

- System prompt personality and domain assumptions
- Task prioritization and interaction patterns
- Response formatting and tone
- Coding instructions (unless `keep-coding-instructions: true`)

**Preserved (regardless of style):**

- All tools (Read, Write, Bash, Grep, etc.)
- CLAUDE.md project context system
- Subagent delegation and skills
- MCP integrations
- Environment context (working directory, git status)

**Key distinction from other features:**

- **Output style** — replaces the default system prompt; file on disk
- **CLAUDE.md** — added as user message after the system prompt; does not modify it
- **`--append-system-prompt`** — appends to system prompt without removing anything
- **Custom `systemPrompt` (SDK)** — full replacement in code; use for specialized agents

Output styles are the ONLY file-based way to change the main agent's core personality.

## `keep-coding-instructions`

Controls whether Claude retains its software engineering guidance.

- `false` (default) — removes coding workflow instructions. Use for non-coding domains (research, content, UX design)
- `true` — preserves safety, code quality, and test verification guidance. Use when the style is a personality overlay
  for coding work (different tone, domain-specific conventions)

**Rule:** if the style is for someone who writes code, set `true`. If the style replaces coding with another domain, set
`false`.

## File Structure

```
~/.claude/output-styles/           # User-level (all projects)
    my-style.md
.claude/output-styles/             # Project-level (this repo)
    team-style.md
```

Filename becomes the style identifier (without `.md`). Activate via `/config` → **Output style**, or the `outputStyle`
setting — the standalone `/output-style` command was removed in v2.1.91. Project-level styles shadow user-level styles
with the same name.

Full format details, frontmatter fields, activation methods, Agent SDK integration: see
[`${CLAUDE_SKILL_DIR}/references/spec.md`].

## Writing Style Instructions

Output styles are system prompts. Five components determine quality:

### 1. Define Persona Clearly

The persona is the highest-leverage element. A vague persona produces inconsistent behavior; a clear one anchors every
response.

**Vague (fails):** "Be helpful and professional."

**Clear (works):** "You are a senior technical architect who communicates directly and values precision over
politeness."

The test: could two people reading this persona imagine the same character? If not, add specificity.

### 2. Specify Concrete Behaviors

Abstract instructions ("communicate clearly") get ignored. Concrete behaviors are testable and unambiguous.

```markdown
## Communication Rules

- Acknowledge valid points with "Correct" or "Valid point"
- State disagreements as "I see it differently because..."
- Never use "I'd be happy to" or "Great question"
- Open with the answer, not pleasantries
```

Each rule should be verifiable: you can check whether a response complies.

### 3. Include Tone Examples

Examples are the most reliable way to communicate expected behavior. Show contrast between default Claude and the target
style:

```markdown
## Tone Examples

User: "Can you help me with this code?"

Default Claude (avoid):
"Of course! I'd be happy to help you with your code.
Let me take a look at what you've got..."

This Style (use):
"Looking at the code now. Three issues:
1. [specific issue]..."
```

Include at least one contrast example. Cover interaction types most likely to trigger default behavior.

### 4. Specify Output Format

Without format guidance, response structure varies. Provide templates for common response types.

### 5. Add Consistency Safeguards

Styles drift mid-conversation. Explicit persistence language prevents reversion:

```markdown
## Consistency

Maintain this style throughout the entire conversation. Do not revert
to default patterns even if:
- The topic changes
- The user asks follow-up questions
- Multiple turns have passed
- The task becomes complex or frustrating

If uncertain, default to MORE adherence to this style, not less.
```

### Place Critical Rules at End

Instructions near the end of the prompt are followed more reliably. Place the rules you cannot afford to have ignored
last.

### Establish Priority Hierarchy

When a style has rules that could conflict, add an explicit priority order.

## Common Style Patterns

- **Direct Professional** — remove sycophancy, focus on substance. Set `keep-coding-instructions: true`.
- **Domain Specialist** — replace coding expertise with domain knowledge. Set `keep-coding-instructions: false`.
- **Interaction Mode** — change engagement style (voice-first, quiz, pair programming). Set `keep-coding-instructions`
  based on whether the mode involves coding.
- **Learning/Educational** — collaborative mentoring with guided exercises. Set `keep-coding-instructions: true`.

Full templates for each pattern: see [`${CLAUDE_SKILL_DIR}/references/creation.md`]. Scored examples: see
[`${CLAUDE_SKILL_DIR}/references/examples.md`].

## Evaluating Style Quality

**First: verify scope appropriateness.** Before scoring dimensions, confirm the style needs to be an output style — not
CLAUDE.md, not `--append-system-prompt`, not a skill. If the style body could work identically as CLAUDE.md content, it
should not be a style.

Six dimensions, three weighted 2x (high-leverage):

- **Persona Clarity (2x)** — can you describe the persona in one sentence? Would two readers imagine the same character?
- **Behavioral Specificity (2x)** — is every rule verifiable? Are there concrete do/don't examples?
- **Example Quality (2x)** — do examples show contrast (default vs this style)? Do they cover key interaction types?
- **Output Format (1x)** — would Claude know exactly how to structure responses?
- **Consistency Safeguards (1x)** — are default behaviors explicitly forbidden with alternatives?
- **Scope (1x)** — is `keep-coding-instructions` set right? Does the style know what it's for?

**Must have:** persona defined, core behaviors listed, at least one contrast example, output format specified.

Detailed per-dimension scoring rubrics and testing protocol: see [`${CLAUDE_SKILL_DIR}/references/evaluation.md`].

## Iterating on Styles

### Iteration Cycle

```
Observe → Diagnose → Hypothesize → Modify (ONE change) → Test → Repeat
```

Make ONE targeted change per iteration. Multiple changes make debugging impossible.

### First: Check for Mechanism Mismatch

Before iterating on the style, verify the right mechanism is in use. If instructions are in CLAUDE.md or a hook instead
of an output style, they lose influence over multiple turns — iteration cannot fix a mechanism mismatch.

### Common Issues and Fixes

- **Reverts to sycophantic tone** — weak persona, no anti-patterns. Add explicit "Never use..." list with replacements.
- **Ignores format** — format buried in text. Move to dedicated section, add response template.
- **Inconsistent between turns** — no persistence language. Add "maintain throughout" with scenario list.
- **Works initially, drifts later** — no reinforcement. Reinforce critical rules across multiple sections.
- **Too verbose** — no length constraints. Add explicit length limits.
- **Wrong tone in edge cases** — missing example coverage. Add contrast example for the failing scenario.
- **Contradictory behavior** — conflicting instructions. Add priority hierarchy.
- **SE assumptions leak** — `keep-coding-instructions` not set to `false` for non-coding style.

Detailed fix patterns with before/after: see [`${CLAUDE_SKILL_DIR}/references/iteration.md`].

## Built-in Styles

- **Default** — standard Claude Code system prompt. Software engineering focus. Active when no style selected.
- **Proactive** — executes immediately, assumes instead of pausing on routine decisions, prefers action over planning.
  Works without changing the permission mode.
- **Explanatory** — inserts educational "Insight" blocks alongside task completion. Explains implementation choices.
- **Learning** — collaborative learn-by-doing mode. Adds `TODO(human)` markers for hands-on practice.

## Quick Start

```bash
mkdir -p ~/.claude/output-styles
```

Create `style-name.md`:

```markdown
---
name: Style Display Name
description: Brief description for the menu
keep-coding-instructions: true
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

Activate: `/config` → **Output style** → pick the style (or set `outputStyle` in settings).

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

## Related Skills

- `prompt-engineering` — load first for instruction design techniques (output styles are system prompts)
- `skill-engineering` — skills and output styles complement each other; skills extend, styles replace
- `subagent-engineering` — subagents have their own system prompts; output styles govern the main agent only
- `claude-code-sdk` — consult for Agent SDK system prompt modification approaches
