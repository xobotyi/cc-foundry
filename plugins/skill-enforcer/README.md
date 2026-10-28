# skill-enforcer

Keeps skills invoked proactively and their references read by phase, throughout a coding session.

## The Problem

**Skills get skipped.** Claude Code has access to skills — domain-specific instructions loaded via the Skill tool. But
facing a task, Claude often jumps straight to implementation without checking whether a relevant skill exists. The
skills are available; nothing triggers their evaluation.

**Skills are treated as atomic.** Once a skill is invoked, it's mentally checked off as "done." But skills often contain
multiple references — some for coding, some for testing, some for review. When the phase changes (implementation ->
testing), the relevant references from already-loaded skills never get read.

**Phase transitions go unnoticed.** Moving from coding to testing is a context shift that should trigger re-evaluation.
Without a nudge, Claude continues with whatever context it already has, missing both newly-applicable skills and unread
references from previously loaded ones.

## The Solution

This plugin injects a Skill Enforcement Framework (SEF): a small set of declarative rules delivered as reminders at key
lifecycle checkpoints. Each reminder states one rule — invoke matching skills, read phase-relevant references,
re-evaluate on a phase shift — and the model acts on it silently.

**Checkpoint flow:**

```
Session start    ->  Load the SEF framework
User prompt      ->  USER-PROMPT: invoke each skill whose description matches, honoring exclusions
After Read       ->  EVALUATION: act if the read opened a skill-covered domain
After Edit/Write ->  PHASE-CHANGE: act if the type of work shifted
After Skill      ->  SKILL-LOAD: read refs whose stated condition holds; follow named hand-offs
```

Each checkpoint injects a self-contained `<SEF phase="...">` reminder carrying the rule for that point. The model
applies it silently: it acts on the rule, but never echoes the reminder or narrates the check in its reply.

## Installation

The hook needs Node.js 26 or later as the `node` on your `PATH`. It is written in TypeScript, and Claude Code runs it
with `node`, which strips the types itself, so nothing is built at install time.

```
/plugin install skill-enforcer --marketplace xobotyi/cc-foundry
```

On Claude Code before 2.1.275, add the marketplace first:

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install skill-enforcer@foundry
```

## How It Works

### Framework injection (session start)

At session start (and after compaction) the plugin injects the SEF framework (~600 tokens):

- **Matching rule** — a skill matches when its description names the task, a file type in it, or a symptom it shows; a
  description that assigns the work to another skill is not a match
- **Reference rule** — invoking a skill loads its body, not its references; the skill is applied only once every
  reference whose stated condition holds has been read
- **Checkpoint rules** — the four declarative rules, listed once

This is shared background. The operational contract is restated by every checkpoint reminder, so behaviour stays correct
even after the framework drifts out of attention.

### Declarative rules, not an evaluation artifact

Earlier versions (<= 1.5.0) asked the model to emit a structured `<sef-eval>` block inside its reasoning at every
checkpoint. On reasoning models (Opus 4.8+) that backfired: the model either reproduced the `<thinking>`/`<sef-eval>`
tags in its _visible_ reply, or — on steps where it did not engage extended thinking — skipped the evaluation entirely.

SEF now states each checkpoint as a declarative behavioral rule that constrains the action directly. There is no
artifact to emit, nothing tag-shaped to reproduce, and no dependence on the model entering a thinking block on a given
step. Skill invocations (via the Skill tool) and reference reads (via Read) remain visible actions; only the
deliberation behind them is silent.

### Why reminders are self-contained

Each reminder carries its full rule rather than a thin pointer back to the session-start framework. A pointer assumes
the framework is still in attention — true in small contexts, false at 1M-token scale, where after dozens of files and
edits the framework sits in the low-attention middle of the context window. A self-contained reminder stays correct
regardless: the reminder is the source of truth, and reaching back to the framework is optional.

### Lifecycle checkpoints

Hooks inject a reminder at each tool-usage point:

**`<SEF phase="USER-PROMPT">`** — fires when the user submits a message

- Invoke each skill whose description names the task, a file type in it, or a symptom it shows. A description that
  assigns the work to another skill is not a match, and "could apply" is not a match: a skill body stays in context for
  the rest of the session

**`<SEF phase="SKILL-LOAD">`** — fires after a Skill invocation

- Invocation loads the body, not the references. The skill counts as applied only once every reference whose stated
  condition holds for the current work is read; invoke another skill only when the loaded skill assigns part of the task
  to it by name

**`<SEF phase="EVALUATION">`** — fires after a Read

- If the file is of a kind a skill's description names and that skill is not loaded, invoke it before acting on the
  file; a read alone does not change the kind of work

**`<SEF phase="PHASE-CHANGE">`** — fires after an Edit/Write

- If the kind of work changed with the edit (implementation -> testing, etc.), invoke the skills whose descriptions name
  the new kind and read the references whose condition now holds

### Compaction handling

The PreCompact hook tells Claude to drop the framework and reminders (re-injected automatically on the next
SessionStart) while preserving a flat list of every skill reference read during the session, so context can be restored
after compaction.

## Architecture

```
hooks/
├── hooks.json     # Hook configuration (event -> command mapping)
└── sef-hook.mts    # Unified hook module with an action parameter
```

The single `sef-hook.mts` script handles all hook events via a command-line argument:

```bash
node sef-hook.mts session-start  # Full framework (~600 tokens)
node sef-hook.mts pre-compact    # Compaction instructions
node sef-hook.mts prompt         # USER-PROMPT reminder
node sef-hook.mts read           # EVALUATION reminder
node sef-hook.mts write          # PHASE-CHANGE reminder
node sef-hook.mts skill          # SKILL-LOAD reminder
```

Every payload is rendered from a single `STAGES` object in `sef-hook.mts`. Each checkpoint's rule is defined once
(`STAGES[phase].rule`) and feeds both the session-start framework list and the per-checkpoint reminder — adding a
checkpoint or editing a rule updates both at once, with no risk of drift.

The `hooks.json` registers lifecycle events:

| Event            | Matcher                           | Action          |
| ---------------- | --------------------------------- | --------------- |
| SessionStart     | `startup\|resume\|clear\|compact` | `session-start` |
| PreCompact       | (all)                             | `pre-compact`   |
| UserPromptSubmit | (all)                             | `prompt`        |
| PostToolUse      | `Read`                            | `read`          |
| PostToolUse      | `Edit\|Write`                     | `write`         |
| PostToolUse      | `Skill`                           | `skill`         |

## Token Efficiency

The plugin uses a "framework once + self-contained reminders repeatedly" pattern:

- **One-time cost**: ~600 tokens for the framework at session start (purpose, matching rule, checkpoint rules)
- **Per-reminder cost**: ~80-100 tokens per checkpoint, each a self-contained declarative rule plus the silent-apply
  contract

In a session with 100 tool calls, reminder overhead lands well under 1% of a 1M-token context. Reminders are
byte-identical across firings, so KV-cache reuses them after the first occurrence — the marginal latency and billing
cost is far below the raw token count. The framework carries no examples and no format scaffolding: rules are stated
declaratively and applied directly, which both shrinks the payload and removes the tag-shaped artifact that earlier
versions leaked into visible output.

## License

MIT
