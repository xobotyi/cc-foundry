# the-workflow

Agentic workflow mechanics: the foundational skills that make working with Claude Code effective across sessions,
projects, and teams.

## The Problem

Two workflow problems compound across every project that uses agentic coding:

**Persistent context degrades.** CLAUDE.md files grow until Claude ignores half the instructions. Rules get buried in
noise, drift from reality, or sit at the wrong abstraction level. The file exists, but compliance drops — and nobody
knows why Claude keeps getting things wrong.

**Context transfer loses state.** When work crosses a context boundary — session restart, teammate delegation, async
resumption — the handoff is either a wall of text that overloads the receiver, or a paragraph that loses decisions,
constraints, and resource identifiers. The receiving agent wastes tokens re-deriving information that was already known.

## The Solution

the-workflow provides skills for the two sides of agentic workflow quality:

### claude-md

CLAUDE.md instruction quality — writing, diagnosing, and improving project instructions. Applies prompt engineering
principles to the specific artifact that shapes every Claude Code session.

Covers:

- **What belongs where** — routing content to CLAUDE.md vs skills vs hooks vs settings vs memory
- **Writing effective instructions** — concrete over abstract, observable over aspirational, brevity = compliance
- **Multi-layer hierarchy** — global, project, subdirectory; what goes at each level
- **Diagnosing failures** — why Claude ignores rules (buried, vague, stale, contradictory, wrong artifact)
- **Systematic improvement** — deletion test, contradiction scan, specificity upgrade, attention restructuring

### handoff

Structured context transfer across session boundaries. Produces a prompt-quality transfer document by triaging the
agent's conversation context into "preserve" (decisions, constraints, resource IDs, verification state) and "drop"
(exploration paths, failed approaches, raw tool output).

Two modes handle different receivers:

- **Self-handoff** — for session restarts. Focuses on task state and decisions.
- **Teammate handoff** — for delegation. Adds codebase orientation and skill recommendations.

Designed for late-session use when context is nearly full — reads only from the conversation window and targets 500-2000
token output.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-workflow
```

## License

MIT
