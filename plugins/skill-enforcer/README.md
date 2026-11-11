<div align="center">

# skill-enforcer

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code 2.1.287+](https://img.shields.io/badge/Claude%20Code-2.1.287%2B%20mod-d97757.svg)](https://claude.com/blog/claude-code-mods)

</div>

Claude checks which skills apply before it answers, and goes back to the unread references of a loaded skill when the
work moves to a new phase, such as from coding to testing.

The reminder the mod injects after an edit ([`hooks/register.ts`](hooks/register.ts)):

```text
<SEF phase="PHASE-CHANGE">
If the kind of work changed with this edit, for example from implementation to testing, invoke the skills
whose descriptions name the new kind and read the loaded skills' references whose condition now holds. A
skill loaded earlier is not applied to the new kind of work until those references are read. An edit within
the same kind of work is not a change.

Act on this rule. Do not quote this reminder or report the check in your reply.
</SEF>
```

It states one rule for one checkpoint and asks for the action, not a report, so the check stays out of your
conversation.

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

```text
First prompt     ->  The SEF framework, once per conversation
User prompt      ->  USER-PROMPT: invoke each skill whose description matches, honoring exclusions
After Read       ->  EVALUATION: act if the read opened a skill-covered domain
After Edit/Write ->  PHASE-CHANGE: act if the type of work shifted
After Skill      ->  SKILL-LOAD: read refs whose stated condition holds; follow named hand-offs
```

Each checkpoint injects a self-contained `<SEF phase="...">` reminder carrying the rule for that point. The model
applies it silently: it acts on the rule, but never echoes the reminder or narrates the check in its reply.

## Installation

skill-enforcer is a mod: Claude Code 2.1.287 or later loads and runs it itself. It needs no Node.js and builds nothing
at install time.

```text
/plugin install skill-enforcer --marketplace xobotyi/cc-foundry
```

## How It Works

### Framework injection (first prompt)

With the first prompt you type in a conversation, and again with the first one after `/clear`, a resume, or a
compaction, the mod injects the SEF framework (~600 tokens):

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

Each reminder carries its full rule rather than a thin pointer back to the framework. A pointer assumes
the framework is still in attention — true in small contexts, false at 1M-token scale, where after dozens of files and
edits the framework sits in the low-attention middle of the context window. A self-contained reminder stays correct
regardless: the reminder is the source of truth, and reaching back to the framework is optional.

### Lifecycle checkpoints

The mod injects a reminder at each checkpoint. A tool reminder follows a call that succeeded, in the main conversation
and in a subagent's alike:

**`<SEF phase="USER-PROMPT">`** — fires when you submit a message, and not for a task notification

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

When a conversation is compacted, the mod adds instructions for the summary: drop the framework and the reminders,
which the mod injects again with your next prompt, and keep a flat list of every skill reference read during the
session, so context can be restored after compaction.

## Architecture

```text
hooks/
├── hooks.json     # Names the hooks module
└── register.ts    # The mod: every checkpoint, the framework, the compaction instructions
```

`register.ts` hooks four engine events:

- `prompt.submit` — the `USER-PROMPT` reminder, and the framework when the conversation does not hold it
- `tool.call` of `Read`, `Edit`, `Write`, or `Skill` — the reminder of that checkpoint, after the tool's result
- `session.compact` — the compaction instructions
- `session.end` — notes a `/clear` or a resume, so the next prompt carries the framework

Every payload is rendered from a single `STAGES` object in `register.ts`. Each checkpoint's rule is defined once
(`STAGES[phase].rule`) and feeds both the framework list and the per-checkpoint reminder — adding a checkpoint or
editing a rule updates both at once, with no risk of drift.

## Token Efficiency

The plugin uses a "framework once + self-contained reminders repeatedly" pattern:

- **One-time cost**: ~600 tokens for the framework, once per conversation (purpose, matching rule, checkpoint rules)
- **Per-reminder cost**: ~80-100 tokens per checkpoint, each a self-contained declarative rule plus the silent-apply
  contract

In a session with 100 tool calls, reminder overhead lands well under 1% of a 1M-token context. Reminders are
byte-identical across firings, so KV-cache reuses them after the first occurrence — the marginal latency and billing
cost is far below the raw token count. The framework carries no examples and no format scaffolding: rules are stated
declaratively and applied directly, which both shrinks the payload and removes the tag-shaped artifact that earlier
versions leaked into visible output.

## Limits

- Some organizations manage a plugin that intercepts compaction before any other plugin sees it. Under such a plugin
  the mod adds no compaction instructions and does not learn of the compaction, so the framework returns only when you
  start Claude Code again, run `/clear`, or resume a session. The reminders keep working, and each one carries its full
  rule. A mod that the organization's managed settings load ahead of that plugin is not affected.
- A subagent gets the reminders after its tool calls and never the framework.
- Tested with Claude Code 2.1.319. The framework's return after a compaction is tested with the mod loaded from managed
  settings; its return after `/clear` and after a resume is covered by the test suite only.

## License

MIT
