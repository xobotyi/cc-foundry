# the-workflow Plugin

Workflow mechanics for crossing context boundaries — session restarts, teammate delegation, and async resumption.

## Skills

| Skill     | Purpose                                                         |
| --------- | --------------------------------------------------------------- |
| `handoff` | Triage conversation context into a structured transfer document |

## How It Works

The handoff skill guides the agent through a structured triage of its own context, producing a prompt-quality document
that a receiving agent (or the same agent in a new session) can use as a cold-start instruction set.

Two modes serve different receivers:

- **Self-handoff** — for session restarts. Assumes shared project knowledge, focuses on task state and decisions.
- **Teammate handoff** — for delegation. Adds codebase orientation and skill recommendations for a receiver with less
  project context.

The skill is designed for low token budgets — it reads only from the conversation context (no file reads, no memory
queries) and targets 500-2000 token output.

## Design Rationale

The plugin deliberately launches with a single skill, breaking the 2-3 skill minimum convention. The convention exists
to prevent plugin fragmentation, but forcing artificial companion skills would dilute quality. Future workflow skills
(coordination, checkpointing, intake) will join when genuine needs emerge.

Design document: `design-docs/01-handoff-skill.md`

## Conventions

- The handoff skill must remain self-contained: no references, no external dependencies
- SKILL.md must stay under 200 lines to minimize token cost when context is nearly full
- The skill produces a standalone document — it must make sense without access to the originating conversation
