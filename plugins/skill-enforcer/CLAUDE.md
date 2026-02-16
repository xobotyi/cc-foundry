# skill-enforcer Plugin

Enforces skill invocation and reference reading via lifecycle hooks.

## How It Works

The plugin injects a Skill Enforcement Framework (SEF) at session start, then uses XML tag
checkpoints to force evaluation at key lifecycle events. The framework treats skills as
non-atomic — a skill isn't exhausted until all phase-relevant references have been read.

**Lifecycle flow:**

1. **Session start** — inject full framework definition (~1050 tokens)
2. **User prompt** — inject `<SEF phase="USER-PROMPT">` tag
3. **After Read** — inject `<SEF phase="EVALUATION">` tag
4. **After Edit/Write** — inject `<SEF phase="PHASE-CHANGE">` tag
5. **After Skill** — inject `<SEF phase="SKILL-LOAD">` tag

Each tag triggers a mandatory evaluation that must be output in the reasoning stage using
`<sef-eval>` XML structure. Silent acknowledgment = violation.

**Enforcement mechanism:**

- Skills that match the task MUST be invoked (no "I already know" excuses)
- Phase shifts (coding → testing) MUST trigger re-evaluation of loaded skills for unread refs
- Each evaluation MUST enumerate loaded skills, unread refs, and reach explicit decision
- The evaluation MUST appear inside `<think><sef-eval>...</sef-eval></think>`

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
- Framework loaded once per session: ~1050 tokens
- Per-checkpoint cost: ~15 tokens per tag
- Trade-off: higher upfront cost, minimal per-action overhead

**Compaction handling:**
- PreCompact hook injects instructions to strip SEF tags and evaluation blocks
- Preserves list of read references for restoration after compaction
- Framework re-injected automatically on SessionStart after compaction
