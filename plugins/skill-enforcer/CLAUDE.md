# skill-enforcer Plugin

Enforces skill invocation and reference reading via lifecycle hooks.

## How It Works

The plugin injects a Skill Enforcement Framework (SEF) at session start, then injects self-contained per-stage triggers
at key lifecycle events. Each trigger restates the format invariant, the required `<sef-eval>` field skeleton, and the
stage-specific decision rule — so it stays correctable even when the session-start framework has drifted into the
low-attention middle of a long context window. The framework treats skills as non-atomic — a skill isn't exhausted until
all phase-relevant references have been read.

**Lifecycle flow:**

1. **Session start** — inject full framework definition (~2300 tokens)
2. **User prompt** — inject self-contained `USER-PROMPT` trigger (~100 tokens)
3. **After Read** — inject self-contained `EVALUATION` trigger (~150 tokens)
4. **After Edit/Write** — inject self-contained `PHASE-CHANGE` trigger (~170 tokens)
5. **After Skill** — inject self-contained `SKILL-LOAD` trigger (~135 tokens)

Each trigger carries: format invariant (`emit inside thinking only`), the eval skeleton with required fields, and the
decision rule for the stage. Silent acknowledgment = violation.

**Enforcement mechanism:**

- Skills that match the task MUST be invoked (no "I already know" excuses)
- Phase shifts (coding → testing) MUST trigger re-evaluation of loaded skills for unread refs
- Each evaluation MUST enumerate loaded skills, unread refs, and reach explicit decision
- The evaluation MUST appear inside `<thinking><sef-eval>...</sef-eval></thinking>`

## Components

**`hooks/sef-hook.js`** — Unified Node.js script handling all hook events via command-line arg:

- `session-start` — outputs full framework definition
- `pre-compact` — outputs compaction instructions
- `prompt` — outputs USER-PROMPT tag
- `read` — outputs EVALUATION tag
- `write` — outputs PHASE-CHANGE tag
- `skill` — outputs SKILL-LOAD tag

**`hooks/hooks.json`** — Hook registration mapping lifecycle events to script invocations:

- `SessionStart` (startup|resume|clear|compact) → `session-start`
- `PreCompact` → `pre-compact`
- `UserPromptSubmit` → `prompt`
- `PostToolUse` (Read) → `read`
- `PostToolUse` (Edit|Write) → `write`
- `PostToolUse` (Skill) → `skill`

## Conventions

**Token efficiency:**

- Framework loaded once per session: ~2300 tokens
- Per-trigger cost: ~100–170 tokens (self-contained mini-spec, not a thin pointer)
- Triggers are byte-identical across firings, so KV-cache reuses them after first occurrence
- Trade-off: triggers stay correctable in 1M-context sessions where the session-start framework has drifted out of
  attention; per-trigger cost is ~10× the previous design but still <1% of context at scale

**Single source of truth:**

- All stage definitions, eval skeletons, and trigger payloads are rendered from the `STAGES` object in `sef-hook.js`
- Adding a stage or renaming a field updates both the framework block and the trigger payload by construction
- Do not duplicate stage content across the file; extend `STAGES` instead

**Compaction handling:**

- PreCompact hook injects instructions to strip SEF tags and evaluation blocks
- Preserves list of read references for restoration after compaction
- Framework re-injected automatically on SessionStart after compaction
