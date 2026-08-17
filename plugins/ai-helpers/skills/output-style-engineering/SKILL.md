---
name: output-style-engineering
description: "Design Claude Code output styles: role, voice, and behavioral rules injected into the system prompt. Invoke whenever task involves any interaction with output styles — creating, editing, evaluating, or changing how Claude communicates."
---

# Output Style Engineering

Output styles modify Claude Code's system prompt. A custom style removes the default software engineering section
(unless `keep-coding-instructions: true`), then appends its own instructions to the end of the prompt. Styles hold two
powers no alternative has: they turn part of the default prompt off, and the harness reinforces them with adherence
reminders during the conversation.

<prerequisite>
**Output styles are system prompts.** Before creating or improving
an output style, invoke `prompt-engineering` to load instruction design techniques.

```
Skill(ai-helpers:prompt-engineering)
```

Skip only for trivial edits (typos, formatting).

</prerequisite>

## Route to Reference

- **File format, frontmatter, storage, activation** — [`${CLAUDE_SKILL_DIR}/references/spec.md`] Frontmatter fields
  (incl. `force-for-plugin`), remove-vs-preserve semantics, storage paths and nested resolution, activation methods,
  scope priority, session timing, adherence reminders, compaction behavior, token impact, built-in styles catalog,
  feature comparison table, Agent SDK system prompt approaches (4 methods)
- **Creating a style from scratch** — [`${CLAUDE_SKILL_DIR}/references/creation.md`] Why styles beat additive
  mechanisms, creation methods (manual, SDK), creation workflow with subtraction discipline, style pattern templates
  (direct professional, domain specialist with non-coding use cases, interaction mode, learning/educational with
  voice-first design), per-model calibration, token impact, common failure modes
- **Evaluating style quality** — [`${CLAUDE_SKILL_DIR}/references/evaluation.md`] Scope appropriateness pre-check,
  per-dimension scoring rubrics (1-10) incl. scaffolding debt, weighted scoring formula, injection canary, testing
  protocol, deployment readiness go/no-go, red flags
- **Style not working, needs refinement** — [`${CLAUDE_SKILL_DIR}/references/iteration.md`] Injection and mechanism
  checks, diagnostic symptom→fix mapping (overtriggering, over-verification, contradiction instability, drift),
  refinement techniques (contrast, consolidation, subtraction), migration discipline, rewrite vs iterate criteria
- **Real-world examples with analysis** — [`${CLAUDE_SKILL_DIR}/references/examples.md`] 5 complete styles with
  dimensional scoring and improvement notes — includes non-coding examples (SaaS analyst, content strategist)
- **Exactly what `keep-coding-instructions` removes** — [`${CLAUDE_SKILL_DIR}/references/coding-instructions.md`]
  Verbatim `# Doing tasks` section extracted from the binary (v2.1.233), the sections the flag cannot touch, the
  classic-vs-lean prompt split and the model list where the flag is inert, re-derivation procedure for newer versions

## What Output Styles Change

**Removed from the system prompt:**

- The `# Doing tasks` section (SE task framing, scope discipline, comment policy, UI verification) — removed by custom
  styles unless `keep-coding-instructions: true`. This is the only removal, and it does not happen at all on lean-prompt
  models (Opus 4.8, Opus 5, Fable 5) — see `references/coding-instructions.md`

**Added:**

- The style body, appended to the end of the system prompt
- Harness-injected adherence reminders during the conversation — delivery varies by model (Sonnet 5 sessions stopped
  using the mid-conversation `system` role in v2.1.201)

**Preserved regardless of style:**

- `# Tone and style` — including "responses should be short and concise" and the no-emoji rule. Not removable by any
  style; override it in the style body if you need different behavior
- `# Executing actions with care` — destructive-action caution and confirmation defaults
- `# System` and `# Using your tools` — output rendering, permission modes, prompt-injection warning, tool selection
- All tools (Read, Write, Bash, Grep, etc.)
- CLAUDE.md project context system
- Subagent delegation and skills
- MCP integrations
- Environment context (working directory, git status)

**Scope and lifetime:**

- Main conversation only — a subagent runs its own system prompt; a fork inherits the parent's full prompt, style
  included
- Fixed at session start for prompt-cache prefix stability; changes take effect after `/clear` or a new session
- Immune to compaction — the style lives in the system prompt, unlike skill instructions in conversation history

**Key distinction from other features:**

- **Output style** — modifies the system prompt: removes default sections, appends instructions; harness reinforces
  adherence
- **CLAUDE.md** — added as a user message after the system prompt; cannot remove default behaviors
- **`--append-system-prompt`** — appends without removing anything
- **Agents (subagents)** — separate system prompt, model, and tools for a scoped task
- **Skills** — task-scoped instructions loaded on demand; subject to compaction

Output styles are the only file-based way to remove parts of the default system prompt.

## `keep-coding-instructions`

Controls one section of the default prompt: `# Doing tasks` — SE task framing, scope discipline, comment policy, UI
verification. Verbatim text: [`${CLAUDE_SKILL_DIR}/references/coding-instructions.md`].

- `false` (default) — removes that section. Use for non-coding domains (research, content, UX design)
- `true` — keeps it. Use when the style changes how Claude communicates but it still codes

**Rule:** if the style is for someone who writes code, set `true`. If the style replaces coding with another domain, set
`false`.

**It does not remove safety or tone guidance** — destructive-action caution and the conciseness rules live in sections
no style can touch.

**It is inert on lean-prompt models** — Opus 4.8, Opus 5, and Fable 5 never receive `# Doing tasks`, so neither value
changes their prompt. Sonnet 5 and Haiku still get the classic prompt, so the flag is live there. A non-coding style
must carry its own domain switch in the body rather than relying on removal.

## File Structure

```
~/.claude/output-styles/           # User-level (all projects)
.claude/output-styles/             # Project-level (nested dirs load too)
<managed settings dir>/.claude/output-styles/  # Managed policy
<plugin>/output-styles/            # Plugin-shipped
```

Filename becomes the style identifier (without `.md`) unless frontmatter `name` overrides it. Every
`.claude/output-styles/` between the working directory and the repository root loads; on a name conflict the directory
closest to the working directory wins (v2.1.178+). Plugin styles can auto-apply via `force-for-plugin`. Activate via
`/config` → **Output style**, or the `outputStyle` setting — the standalone `/output-style` command was removed in
v2.1.91.

**Loader bug (open as of v2.1.205, issue #47482):** the frontmatter `name` is matched against the filename
case-sensitively; on mismatch the body is silently dropped while the UI still shows the style active. Keep the filename
and `name` identical and lowercase. Verify injection with a canary: add a marker rule, run `claude -p "say ok"`, confirm
the marker fires.

Full format details, frontmatter fields, activation methods, Agent SDK integration: see
[`${CLAUDE_SKILL_DIR}/references/spec.md`].

## Writing Style Instructions

An output style body is a system prompt for a frontier model. Current models follow the system prompt closely and
literally — every instruction executes with precision, including stale ones, and contradictions produce instability, not
averaging. The craft is subtraction and clarity, not scaffolding.

### 1. Frame the Role as Outcome and Perspective

Skip persona theater — invented credentials add nothing and can over-constrain. State what Claude is doing, for whom,
and from what perspective.

**Persona theater (cut):** "You are a world-class senior architect with 12+ years of experience."

**Outcome and perspective (works):** "You review designs for operational risk. The reader is the on-call engineer;
optimize for what they must know before deploying."

For voice, describe it in 5–7 sentences of adjective contrasts — they beat trait lists: "Sharp and warm, not chirpy.
Direct without being curt. Uses contractions. Never opens with an apology."

### 2. Write Rules That Carry Intent

State the outcome you want and why — intent survives model upgrades; compensations for old failure modes don't.

**Compensation (ages badly):** "Never write multi-paragraph explanations. One short line max."

**Intent (holds):** "Match explanation depth to what the reader needs to act — a lookup gets a line, a tradeoff gets a
paragraph."

Reserve "never X" for a demonstrated failure mode the model cannot reason its way out of. Dial back aggressive language:
"CRITICAL: You MUST..." causes overtriggering on current models — "Do X when Y" is enough.

### 3. Use Tone Exemplars, Not Behavior Demos

Contrast pairs still calibrate voice — show the same input answered in-style and in the generic default register, and
cover the interaction most likely to pull toward the default (emotional pressure, disagreement). Worked examples of
_behavior_ — tool use, workflows, step sequences — constrain exploration on current models; encode behavior in rules and
interfaces instead.

### 4. Specify Output Format

Define the response shape per response type. Format contracts are followed literally — specify only what you want
applied everywhere, and state scope explicitly ("every section, not just the first").

### 5. State Each Rule Once, Where It Belongs

The harness reminds Claude to adhere to the style — persistence blocks, "maintain throughout" clauses, and rules
repeated across sections duplicate that mechanism and cause overtriggering or contradiction. Add a priority hierarchy
only when rules genuinely conflict; prefer removing the conflict. Rules that must never break (no emoji in output,
banned commands) belong in hooks — deterministic enforcement, not prose.

### Subtract Before Adding

Apply the deletion test to every instruction: if removing it doesn't change output, remove it. Legacy scaffolding —
persistence blocks, thoroughness nudges, verification directives, anti-laziness modifiers — actively harms current
models: over-verification, overtriggering, stilted output. Keep the body lean; a style under ~200 lines outperforms a
manual. Calibrate to the target model: each release ships a prompting guide documenting its defaults (verbosity, tool
eagerness); check it before tuning.

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

- **Role & Voice Clarity (2x)** — is the role framed as outcome and perspective? Does a voice description with contrasts
  pin the register?
- **Rule Intent (2x)** — does each rule state the desired outcome (with rationale where non-obvious)? Are "never" rules
  backed by demonstrated failure modes?
- **Exemplar Quality (2x)** — do tone contrast pairs cover the interactions most likely to pull toward the default
  register?
- **Output Format (1x)** — would Claude know how to structure each response type?
- **Scaffolding Debt (1x, inverse)** — persistence blocks, repeated rules, verification directives, MUST/CRITICAL
  language: each present item lowers the score
- **Scope (1x)** — is `keep-coding-instructions` set right? Does the style know what it's for?

**Must have:** role framed, rules carry intent, at least one tone contrast pair, output format specified, injection
verified (canary).

Detailed per-dimension scoring rubrics and testing protocol: see [`${CLAUDE_SKILL_DIR}/references/evaluation.md`].

## Iterating on Styles

### Iteration Cycle

```
Observe → Diagnose → Hypothesize → Modify (ONE change) → Test → Repeat
```

Make ONE targeted change per iteration. Multiple changes make debugging impossible.

### First: Verify Injection and Mechanism

Before touching the body: confirm the style actually loads (canary test — the loader silently drops the body on a
filename/`name` case mismatch), and confirm the right mechanism is in use — instructions in CLAUDE.md or a hook lose
influence over turns and cannot remove default behaviors; iteration cannot fix a mechanism mismatch.

### Common Issues and Fixes

- **Style not applied at all** — body never injected. Run the canary; fix filename/`name` case parity.
- **Reverts to default register** — voice underspecified. Add a contrast-based voice description and a tone exemplar for
  the failing interaction — not repetition.
- **Rule followed too literally / over-applied** — aggressive language (MUST, CRITICAL, "always") overtriggers. Dial
  back to plain conditions.
- **Over-verification, stalling, self-checking loops** — legacy verification or thoroughness directives. Delete them;
  the model verifies by default.
- **Contradictory behavior** — duplicated or conflicting rules. Remove the duplicate rather than adding a hierarchy;
  hierarchy only for genuine tradeoffs.
- **Too verbose / dense jargon** — describe the target register positively (audience, depth per response type) rather
  than stacking "don't" rules; request length explicitly.
- **Ignores format** — format buried in prose. Move to a dedicated section with a response template.
- **SE assumptions leak** — `keep-coding-instructions` not set to `false` for a non-coding style.

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

Create `style-name.md` (keep filename and `name` identical and lowercase):

```markdown
---
name: style-name
description: Brief description for the /config picker
keep-coding-instructions: true
---

# Style Name

[What Claude is doing, for whom, from what perspective]

## Voice

[5–7 sentences of adjective contrasts]

## Rules

- [Outcome-stating rules, each with intent]

## Tone Examples

[One contrast pair: in-style vs default register]

## Response Format

[Shape per response type]
```

Activate: `/config` → **Output style** → pick the style (or set `outputStyle` in settings). Verify injection with a
canary before iterating on content.

## Quick Checks

Before deploying:

- [ ] Role framed as outcome and perspective (no invented credentials)
- [ ] Voice described with adjective contrasts
- [ ] Every rule states intent; "never" rules backed by observed failures
- [ ] At least one tone contrast pair covering a default-pulling interaction
- [ ] Output format specified per response type
- [ ] No persistence blocks, repeated rules, or MUST/CRITICAL language
- [ ] Deletion test passed — every instruction changes output
- [ ] `keep-coding-instructions` set explicitly
- [ ] Filename and frontmatter `name` identical (case-sensitive loader)
- [ ] Injection verified with a canary; tested with varied prompts (simple, complex, emotional)

## Related Skills

- `prompt-engineering` — load first for instruction design techniques (output styles are system prompts); its
  model-behavior reference carries per-model steering patterns
- `skill-engineering` — skills and output styles complement each other; skills load on demand, styles are always-on
- `subagent-engineering` — subagents have their own system prompts; output styles govern the main agent only
- `claude-code-sdk` — consult for Agent SDK system prompt modification approaches
