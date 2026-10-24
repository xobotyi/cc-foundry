# 0002 — No SKILL.md line cap

- **Status:** accepted
- **Date:** 2026-06-02

## Context

Some skill-authoring guidance caps SKILL.md at ~100 lines and pushes any overflow into reference files. cc-foundry holds
the opposite invariant: a SKILL.md must be **behaviorally self-sufficient** — an agent that reads only SKILL.md, loading
no references, must still do the job correctly. References provide depth (catalogs, extended examples, edge cases), not
behavior.

A hard line cap forces behavioral rules out of SKILL.md and into references the agent may never read, breaking
self-sufficiency to satisfy an arbitrary number.

## Decision

No line cap on SKILL.md. Knowledge and discipline skills may exceed 500 lines when every line is behavioral. Length is
governed by the deletion test — does removing this instruction change output? — not by a line budget.

## Consequences

- Reviews judge SKILL.md by behavioral self-sufficiency and the deletion test, not by line count.
- Content moves to references only when it is genuinely lookup-oriented depth, never to hit a length target.
- Per-skill length ceilings may still be set deliberately for a specific reason (e.g. `handoff` stays under 200 lines
  because it runs when context is nearly full) — those are documented exceptions, not a global rule.
