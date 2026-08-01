# skill-enforcer Plugin

Injects skill-discipline reminders at lifecycle checkpoints so matching skills get invoked proactively and their
phase-relevant references get read — not skipped.

## How It Works

At session start the plugin injects the SEF framework (~600 tokens: purpose, matching rule, and the four checkpoint
rules). At each lifecycle event it injects a terse, self-contained `<SEF phase="...">` reminder carrying one declarative
behavioral rule plus a silent-apply contract. The reminder is the operational source of truth — it stays correct even
when the session-start framework has drifted into low-attention context.

**Lifecycle flow:**

1. **Session start** (startup|resume|clear|compact) — inject the full framework (~600 tokens)
2. **User prompt** — `USER-PROMPT` rule: invoke every matching skill before responding
3. **After Read** — `EVALUATION` rule: act if the read opened a skill-covered domain
4. **After Edit/Write** — `PHASE-CHANGE` rule: act if the type of work shifted
5. **After Skill** — `SKILL-LOAD` rule: read phase-relevant references; invoke sibling skills
6. **Pre-compact** — strip reminders, preserve the list of references read

Each reminder carries: one declarative rule for the checkpoint, plus the shared silent-apply contract (act on it, never
echo the reminder or narrate the check). Skill invocations (via the Skill tool) and reference reads (via Read) stay
visible; only the deliberation behind them is silent.

## Design: declarative rules, not an evaluation artifact

Each checkpoint injects ONE declarative rule that constrains the action — never a structured evaluation artifact (a
`<sef-eval>` block or `<thinking>` skeleton) for the model to reproduce. Do not introduce such templates; they fail two
ways:

- **Tag leak** — the native reasoning channel is not addressable by typing `<thinking>`; handed a tag-shaped template,
  the model completes it into the _visible_ reply.
- **No-think skip** — at low/medium effort the model may not enter a thinking block on a given step, so "emit in
  thinking" has nowhere to land; the evaluation gets skipped or spills into the visible reply.

A declarative rule constrains the action regardless of whether the model thinks on a given step, and carries no
tag-shaped artifact to echo.

## Components

**`hooks/sef-hook.js`** — single Node script dispatched by CLI argument:

- `session-start` — full framework
- `pre-compact` — compaction instructions
- `prompt` / `read` / `write` / `skill` — the four checkpoint reminders

**`hooks/hooks.json`** — maps lifecycle events to script invocations:

- `SessionStart` (startup|resume|clear|compact) -> `session-start`
- `PreCompact` -> `pre-compact`
- `UserPromptSubmit` -> `prompt`
- `PostToolUse` (Read) -> `read`
- `PostToolUse` (Edit|Write) -> `write`
- `PostToolUse` (Skill) -> `skill`

## Conventions

**Single source of truth:**

- Each checkpoint's rule lives once in the `STAGES` object in `sef-hook.js`. `STAGES[phase].rule` feeds both the
  session-start framework list and the per-checkpoint reminder.
- Add or rename a checkpoint by editing `STAGES`; the framework and reminder update together. Do not duplicate rule text
  elsewhere.

**Anti-leak contract:**

- Every reminder ends with the shared `SILENT` clause: act on the rule, never echo the reminder or narrate the check.
  Guards both failure modes — tag-echo and narration.
- Injected payloads carry no artifact the model is asked to reproduce. Never reintroduce a `<thinking>` or `<sef-eval>`
  template into injected output.

**Token cost:**

- Framework ~600 tokens once per session; each reminder ~80-100 tokens, byte-identical across firings so KV-cache reuses
  them after the first occurrence.

**Compaction handling:**

- PreCompact strips the framework and reminders (auto-reinjected on SessionStart) and preserves the flat list of
  references read, for restoration after compaction.
