# Creating Output Styles

## Why Output Styles Exist

Output styles hold two powers no additive mechanism has — the two reasons the Claude Code team kept them when
deprecation was reversed:

1. **They turn off parts of the default system prompt.** You cannot remove default behaviors by adding instructions on
   top of them — CLAUDE.md, `--append-system-prompt`, and hooks are purely additive, so the default response-style and
   coding instructions keep competing with yours.
2. **The harness reinforces them.** Styles trigger adherence reminders during the conversation; instructions in
   CLAUDE.md or a `UserPromptSubmit` hook need hand-built reinforcement to get the same effect.

Practitioners converge on the same split: tone and register rules moved from CLAUDE.md into an output style hold where
the CLAUDE.md version drifted.

## File Format

```markdown
---
name: My Style Name
description: One sentence shown in the /config picker
keep-coding-instructions: false
---

# Role and Identity

[Who Claude is in this style]

## Tone and Communication

[How Claude speaks, what it avoids, phrasing patterns]

## Response Structure

[Format rules, section ordering, length guidelines]

## Specific Behaviors

[Edge cases, what to do and not do]
```

### Frontmatter Fields

- **`name`** — display name; defaults to filename (without `.md`) if omitted
- **`description`** — shown in `/config` picker; make it scannable
- **`keep-coding-instructions`** — `true` preserves the default coding system prompt alongside your style instructions;
  `false` (default) removes it
- **`force-for-plugin`** — plugin-shipped styles only: auto-applies the style while the plugin is enabled, overriding
  the user's `outputStyle` setting

### File Locations

- **User-level** (all projects) — `~/.claude/output-styles/`
- **Project-level** (current project) — `.claude/output-styles/`
- **Plugin-shipped** — `output-styles/` directory inside the plugin

## Creation Methods

### Manual file creation (primary)

Create a `.md` file directly in one of the storage locations above. The `/output-style:new` scaffolding command was
removed in v2.1.91 along with `/output-style` — writing the file yourself is the only interactive path. To scaffold a
draft, ask Claude in-session to write the file, then review and tighten before use.

### SDK programmatic creation

For Agent SDK integrations, write the style file to `~/.claude/output-styles/` or `.claude/output-styles/`
programmatically, then reference it via `settingSources` in SDK options. Details in
[`${CLAUDE_SKILL_DIR}/references/spec.md`] under Agent SDK Integration.

## Creation Workflow

### Step 1: Clarify purpose

Answer before writing:

- What is the user _not_ getting from the default style?
- What role does this style play? (teacher, critic, domain specialist, persona)
- Does the user need coding instructions preserved?
- Is this a coding use case or a non-coding domain (business analysis, content strategy, research)?

### Step 2: Choose a pattern

Select the pattern that matches the use case. Each pattern has different structural requirements — see Style Patterns
below.

### Step 3: Draft

Write the file manually (see Creation Methods) and apply the pattern's structural requirements. Draft lean: role as
outcome and perspective, a voice description built on adjective contrasts, intent-carrying rules, one or two tone
contrast pairs, response formats. Do not draft persistence sections, repeated rules, or MUST/CRITICAL emphasis — the
harness reminders and the model's instruction adherence make them counterproductive.

### Step 4: Activate and test

Run `/config`, select **Output style**, pick the style. Or set directly in `.claude/settings.local.json`:

```json
{ "outputStyle": "MyStyleName" }
```

The style is applied once at session start — it cannot change mid-session. Run `/clear` or start a new session to pick
up changes.

### Step 5: Iterate

First verify injection with a canary (the loader silently drops the body on a filename/`name` case mismatch — see
[`${CLAUDE_SKILL_DIR}/references/spec.md`]). Then test with representative prompts covering normal use and edge cases.
Adjust instructions where behavior diverges from intent — and prefer deleting an instruction over adding one. Keep the
file under ~200 lines. Make one change per iteration — multiple changes make debugging impossible.

### Step 6: Recalibrate per model generation

A style tuned for one model generation ages: instructions compensating for an old model's failure modes execute with
precision on a newer one and distort output (a production voice profile measured as improving one generation's output
degraded the previous one's). On every model migration, re-run the style's tests before editing, then subtract stale
compensations before adding anything. Check the target model's own prompting guide for its defaults — verbosity, tool
eagerness, output length.

## Style Patterns

### Direct Professional

**Purpose:** Strip sycophancy and filler, focus on precision.

**`keep-coding-instructions`:** `true` — this is a tone overlay, not a domain switch.

**Key instructions:**

- Never use openers like "Great question!", "Certainly!", "I'd be happy to..."
- State conclusions before reasoning
- No trailing summaries of work just done
- Professional tone without warmth padding
- No hedging phrases ("it's worth noting that...", "might potentially")

**Risk profile:** Current models follow phrase blocklists faithfully — the harness reminders carry persistence, so
anti-reversion anchors are dead weight. The live risk is over-correction: a style built purely from "never" rules
produces curt, stilted output on complex tasks. Pair the blocklist with a positive description of the target register
(what a good opener looks like, how depth scales with task complexity).

### Domain Specialist

**Purpose:** Claude acts as a named expert role, replacing the software engineering identity with domain knowledge.

**`keep-coding-instructions`:** `false` — the style replaces coding expertise with domain expertise.

**Key instructions:**

- Define the expert identity and knowledge scope
- Specify what the role _does not_ do (scope boundaries)
- Set the vocabulary register (jargon level, abbreviations allowed)
- Define how the role handles requests outside its domain
- Script the boundary response: "That's outside my [role]. Here's the direction: [guidance]."

**Non-coding use cases** — the most common reason users create domain specialist styles:

- **Business analysis** — upload CSV churn data, get consultant-level insights on MRR, churn rate, LTV, CAC without
  software engineering assumptions
- **Content strategy** — YouTube analytics, brand voice consistency, audience engagement patterns
- **Research** — academic paper processing, citation management, literature review
- **Design** — SVG modification, design system maintenance, visual hierarchy feedback
- **DevOps** — YAML configurations, structured data generation, infrastructure documentation

For all non-coding domain specialists, set `keep-coding-instructions: false` to strip the software engineering
assumptions that would otherwise contaminate domain-specific advice.

### Interaction Mode

**Purpose:** Change how Claude and user _collaborate_, not just how Claude speaks.

**`keep-coding-instructions`:** Based on whether the mode involves coding.

**Examples:**

- **Pair programmer** — Claude assigns tasks to the user with `TODO(human)`, gives guidance but doesn't implement
- **Socratic tutor** — guides via questions rather than answers, waits for user response before continuing
- **Code reviewer** — evaluates submitted code rather than writing it, structures feedback by severity

**Required structure for interaction modes:**

- **Turn structure** — who acts, who responds, in what order
- **Wait signals** — how Claude signals it's waiting for user input
- **Skip handling** — what Claude does if user skips a step or asks to bypass the exercise
- **Scope of action** — what Claude handles vs. what the user handles

### Learning / Educational

**Purpose:** Teach concepts through engagement, not passive explanation.

**`keep-coding-instructions`:** `true` if teaching coding concepts, `false` for non-coding education.

The built-in `learning` style uses `TODO(human)` markers for hands-on coding. Custom learning styles can go further:

- **Voice-first / dictation design** — all questions answerable by speaking (letter choices, true/false, verbal
  explanation). The strongest design constraint: if the user can't answer by talking, the question is poorly designed.
- **Question types** — multiple choice, true/false, scenario-based, verbal explanation
- **Adaptive pacing** — one question at a time, progress checks every 5 questions, confusion handling
- **Feedback format** — correct/incorrect with explanation, next step. No superlative feedback words (perfect, amazing,
  excellent).

Learning styles produce longer output tokens by design — this is intentional, not a problem to optimize away.

## Token Impact

- **`keep-coding-instructions: false`** — reduces input tokens by removing the default coding prompt from the system
  message
- **`keep-coding-instructions: true`** — adds both the default coding prompt AND your style instructions, increasing
  input token count
- **Prompt caching** — after the first request in a session, the system prompt (including the output style) is cached,
  reducing latency and cost for subsequent requests. Since the style is fixed per session, the cache hit rate is high.
- **Explanatory / verbose styles** — produce longer output tokens by design. Learning and educational styles are the
  highest token consumers. Factor this into cost estimates.

## Comparison: Output Styles vs. Related Features

- **`CLAUDE.md`** — added as a user message after the system prompt; project/user context, not persona
- **`--append-system-prompt`** — appends to the system prompt; preserves default coding behavior
- **Output styles** — remove default prompt sections and append their own, with harness-reinforced adherence; fullest
  file-based control over role and register
- **Subagents** — separate invocations with their own tools/model; output styles affect the main loop only
- **Skills** — invoked on-demand for specific workflows; output styles are always-on once selected

Detailed comparison table with persistence and scope dimensions: see [`${CLAUDE_SKILL_DIR}/references/spec.md`] under
Comparison.

## Common Failure Modes

**Style silently not applied** — the loader matches frontmatter `name` against the filename case-sensitively and drops
the body on mismatch while the UI shows the style active. Fix: keep filename and `name` identical and lowercase; verify
with a canary rule before iterating on content.

**Style over-applied** — aggressive emphasis (MUST, CRITICAL, "always/never" without a real failure mode behind it)
overtriggers on current models: unusably curt answers, refusing depth where depth is wanted. Fix: dial the language back
to plain conditions and describe the target register positively.

**Coding capability lost** — `keep-coding-instructions: false` (the default) removes all coding guidance. Users who
create a tone-only style (e.g., "be more direct") accidentally lose coding capability. Fix: set
`keep-coding-instructions: true` for any style that should augment coding behavior rather than replace it.

**Instructions too vague** — "Be professional" is underspecified — two readers would imagine different behaviors. Fix:
list concrete behaviors ("never use emoji", "always give verdict before rationale", "no hedging phrases") rather than
adjectives. Every instruction should be verifiable: you can check whether a response complies.

**Style ignored in tool output** — Style controls Claude's prose — how it frames and presents information — not the
output of bash commands, file reads, or MCP tool results.
