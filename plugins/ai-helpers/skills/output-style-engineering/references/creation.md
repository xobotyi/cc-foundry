# Creating Output Styles

## Why Output Styles Exist

Output styles **replace** Claude Code's system prompt — they don't augment it. This is the defining characteristic and
the reason they exist as a separate mechanism.

You cannot remove default behaviors by adding instructions on top of them. Users have repeatedly proven this:

- **CLAUDE.md** adds project context but cannot override the coding personality
- **`--append-system-prompt`** appends without substituting — default behaviors remain
- **Hooks** lose influence after several conversation rounds
- Users report "Claude's ingrained celebratory defaults seemingly overrode the style guidance" when using CLAUDE.md
  alone

Output styles are the only file-based mechanism that replaces the core personality. Everything else augments it.

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
  `false` (default) replaces it entirely

### File Locations

- **User-level** (all projects) — `~/.claude/output-styles/`
- **Project-level** (current project) — `.claude/output-styles/`
- **Plugin-shipped** — `output-styles/` directory inside the plugin

## Creation Methods

### `/output-style:new` (recommended start)

Run in Claude Code:

```
/output-style:new [name] [verbose description of desired behavior]
```

Claude generates a Markdown file in `~/.claude/output-styles/`. Treat this as a first draft — review and tighten before
using.

### Manual file creation

Create a `.md` file directly in one of the storage locations above. Full control from the start, but requires
understanding the file format and writing effective style instructions.

### SDK programmatic creation

For Agent SDK integrations, write the style file to `~/.claude/output-styles/` or `.claude/output-styles/`
programmatically, then reference it via `settingSources` in SDK options. Details in
[`${CLAUDE_SKILL_DIR}/references/spec.md`] under Agent SDK Integration.

## Creation Workflow

### Step 1: Clarify purpose

Answer before writing a single line:

- What is the user _not_ getting from the default style?
- What role does this style play? (teacher, critic, domain specialist, persona)
- Does the user need coding instructions preserved?
- Is this a coding use case or a non-coding domain (business analysis, content strategy, research)?

### Step 2: Choose a pattern

Select the pattern that matches the use case. Each pattern has different structural requirements — see Style Patterns
below.

### Step 3: Draft

Use `/output-style:new` for a starting point or write manually. Either way, apply the pattern's structural requirements.

### Step 4: Activate and test

```
/output-style [name]
```

Or set directly in `.claude/settings.local.json`:

```json
{ "outputStyle": "MyStyleName" }
```

The style is applied once at session start — it cannot change mid-session. Start a new session to pick up changes.

### Step 5: Iterate

Test with representative prompts covering normal use and edge cases. Adjust instructions where behavior diverges from
intent. Keep the file under ~300 lines; move detailed rules into referenced behaviors. Make one change per iteration —
multiple changes make debugging impossible.

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

**Reversion risk:** High. Default personality traits are deeply embedded — Claude acknowledges the instructions but
reverts to celebratory defaults mid-session. Mitigate with multiple consistency anchors distributed throughout the
style, not just one section at the end. Include explicit anti-reversion language: "If you notice yourself softening
tone, correct immediately."

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
- **Output styles** — replace the system prompt; fullest control over role and behavior
- **Subagents** — separate invocations with their own tools/model; output styles affect the main loop only
- **Skills** — invoked on-demand for specific workflows; output styles are always-on once selected

Detailed comparison table with persistence and scope dimensions: see [`${CLAUDE_SKILL_DIR}/references/spec.md`] under
Comparison.

## Common Failure Modes

**Style reverts mid-session** — Default personality traits are deeply embedded. A single consistency reminder at the end
is insufficient for long sessions. Fix: distribute anti-reversion language throughout the style — at least two anchors
in different sections. Include explicit scenario lists ("even if the topic changes, even if multiple turns have
passed"). Users who moved style instructions from CLAUDE.md to an output style specifically because of this problem
report that replacement is more effective than augmentation, but still requires reinforcement.

**Coding capability lost** — `keep-coding-instructions: false` (the default) removes all coding guidance. Users who
create a tone-only style (e.g., "be more direct") accidentally lose coding capability. Fix: set
`keep-coding-instructions: true` for any style that should augment coding behavior rather than replace it.

**Instructions too vague** — "Be professional" is underspecified — two readers would imagine different behaviors. Fix:
list concrete behaviors ("never use emoji", "always give verdict before rationale", "no hedging phrases") rather than
adjectives. Every instruction should be verifiable: you can check whether a response complies or not.

**Style ignored in tool output** — Style controls Claude's prose, not the output of bash commands, file reads, or MCP
tool results. Don't expect the style to reformat tool results — it governs how Claude frames and presents information,
not the raw output of tools.
