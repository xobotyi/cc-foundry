# skill-enforcer Plugin

Injects skill-discipline reminders at lifecycle checkpoints so matching skills get invoked proactively and their
phase-relevant references get read — not skipped.

## Components

- **`hooks/sef-hook.js`** — the whole implementation, one Node script dispatched by a CLI action argument.
- **`hooks/hooks.json`** — the event wiring below.

## Checkpoints

`hooks/hooks.json` maps each lifecycle event to `node ${CLAUDE_PLUGIN_ROOT}/hooks/sef-hook.js <action>` with a 5-second
timeout; the action argument selects the payload. Event names and matchers are exact strings — a mismatch fires nothing
and reports nothing.

- `SessionStart`, matcher `startup|resume|clear|compact` -> `session-start` — the full SEF framework
- `PreCompact`, no matcher -> `pre-compact` — compaction instructions
- `UserPromptSubmit`, no matcher -> `prompt` — `USER-PROMPT` reminder
- `PostToolUse`, matcher `Read` -> `read` — `EVALUATION` reminder
- `PostToolUse`, matcher `Edit|Write` -> `write` — `PHASE-CHANGE` reminder
- `PostToolUse`, matcher `Skill` -> `skill` — `SKILL-LOAD` reminder

The action argument and the phase name differ (`read` -> `EVALUATION`, `write` -> `PHASE-CHANGE`). `RESPONSES` in
`sef-hook.js` holds that mapping.

## Conventions

**Single source of truth:**

- Each checkpoint's rule lives once in the `STAGES` object in `sef-hook.js`. `STAGES[phase].rule` feeds both the
  session-start framework list and the per-checkpoint reminder.
- Add or rename a checkpoint by editing `STAGES`; the framework and reminder update together. Do not duplicate rule text
  elsewhere.

**Self-contained reminders:**

- Every reminder carries its full rule, never a pointer back to the session-start framework — at 1M-token scale the
  framework sits in the low-attention middle, so the reminder is the operational contract.

**Anti-leak contract:**

- Every reminder ends with the shared `SILENT` clause: act on the rule, never echo the reminder or narrate the check.
  Guards both failure modes — tag-echo and narration.
- Injected payloads carry no artifact the model is asked to reproduce. Never reintroduce a `<thinking>` or `<sef-eval>`
  template into injected output — see
  [ADR 0004](../../docs/adr/0004-declarative-rules-over-emitted-reasoning-artifacts.md).

**Token cost:**

- Framework ~600 tokens once per session; each reminder ~80-120 tokens, byte-identical across firings so KV-cache reuses
  them after the first occurrence. Rule text added to `STAGES` is paid at every firing.

**Compaction handling:**

- PreCompact strips the framework and reminders (auto-reinjected on SessionStart) and preserves the flat list of
  references read, for restoration after compaction.
