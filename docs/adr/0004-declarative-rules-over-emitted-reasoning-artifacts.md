# 0004 — Behavioral nudges as declarative rules, not emitted reasoning artifacts

- **Status:** accepted
- **Date:** 2026-06-29

## Context

skill-enforcer (SEF) injects a reminder at lifecycle checkpoints to keep skills invoked and references read. Through
v1.5.0 each reminder handed the model a `<thinking><sef-eval>...fields...</thinking>` skeleton and told it to reproduce
a structured evaluation in its reasoning stream, never in visible output.

On reasoning models (Opus 4.8+) the tags leaked into the visible reply. Two causes:

- The native reasoning channel is not addressable by typing `<thinking>`. Handed a tag-shaped template, the model
  completed it into the only channel it controls by emitting text — visible output.
- At low/medium effort the model may not enter a thinking block on a given step, so "emit in thinking" had nowhere to
  land: the eval spilled to visible or was skipped.

The `prompt-engineering` discipline names both failure modes: reasoning models should not be given prescriptive CoT
scaffolding (it causes "double thinking" and degrades instruction-following), and behavioral constraints are followed
more reliably when stated declaratively than performed as a procedural self-Q&A. The structured artifact was never the
goal — it was a broken proxy for the behavior "invoke matching skills."

## Decision

A checkpoint nudge states one declarative behavioral rule that constrains the action. It does not ask the model to emit
any artifact — no `<sef-eval>`, no `<thinking>` template, no fill-in fields, no scripted self-questions.

- Injected payloads carry nothing the model is asked to reproduce.
- Each reminder ends with a silent-apply contract: act on the rule, never echo it or narrate the check.
- The observable signal is the action itself — a Skill invocation or a Read — not a narrated evaluation.

This generalizes: do not author skill or hook nudges that make the model perform a structured reasoning artifact in a
named channel. State the rule; let the model reason however it does.

## Consequences

- Removes the leak vector (no tag-shaped artifact to complete) and the no-think failure (a rule needs no thinking block
  to apply).
- Loses the visible eval block that confirmed a checkpoint fired; the only evidence is whether skills actually get
  invoked. Accepted — the block was theater.
- Trade-off to watch: a declarative nudge can under-trigger relative to a forced ceremony. When tuning, validate the
  skill-invocation rate, not just the absence of leaks.

Shipped in skill-enforcer v1.6.0 (commit ee8669e).
