# the-workflow

Workflow mechanics: crossing context boundaries without losing critical state.

## The Problem

When work must cross a context boundary — session restart, teammate delegation, or async resumption — the handoff is
either a wall of text that overloads the receiver, or a paragraph that loses decisions, constraints, and resource
identifiers. Either way, the receiving agent wastes tokens re-deriving information that was already known.

The root cause: no structured mechanism exists to separate state that must survive a boundary crossing (decisions,
constraints, resource IDs, verification state) from state that should be dropped (intermediate exploration, failed
paths, raw tool outputs).

## The Solution

the-workflow provides structured handoff — a triage-based approach that produces a prompt-quality transfer document. The
handoff skill guides the agent through categorizing its context into "preserve" (high-value state) and "drop" (noise),
then generates a structured markdown document targeting 500-2000 tokens.

Two modes handle different receivers:

- **Self-handoff** — for continuing your own work after a session restart. Focuses on task state, decisions, and
  remaining work.
- **Teammate handoff** — for delegating to another agent. Adds codebase orientation, skill recommendations, and
  convention pointers.

The skill is designed for late-session use when context is nearly full — it reads only from the conversation window,
makes no tool calls during triage, and keeps its own footprint minimal.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-workflow
```

## Skills

### handoff

Produces a structured transfer document by triaging the agent's conversation context. Invoke with `/handoff` or ask the
agent to prepare a handoff.

**Output includes:**

- Decisions made and their rationale
- Discovered constraints
- External resource identifiers (URLs, issue IDs, branch names)
- Remaining work in priority order
- Verification state
- Open questions

**Self-check:** After generating the document, the skill verifies that critical sections (Decisions, Remaining Work) are
populated and that no raw tool output leaked through.

## Future Direction

the-workflow is scoped broadly to workflow mechanics. Future skills may cover coordination patterns, checkpointing, or
structured work intake — but only when genuine needs emerge.

## License

MIT
