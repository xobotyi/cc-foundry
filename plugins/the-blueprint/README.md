# the-blueprint

Structured planning pipeline that converts problem analysis into tracked work items.

## The Problem

**Planning work is either too shallow or too detailed.** Shallow planning produces vague tasks that force implementers
to reverse-engineer intent from chat history or institutional memory. Detailed planning wastes effort prescribing
implementation before understanding is complete, resulting in rework when reality diverges from assumptions.

The gap between "we should build this" and "here are the tasks to do it" is filled with ad-hoc decisions made during
implementation — decisions that could have been caught earlier, shared with the team, and preserved as architecture
decision records.

**Agent-driven workflows make this worse.** An agent implementing from a vague task drifts from the intended solution.
An agent implementing from an overly prescriptive task follows outdated instructions instead of adapting to the codebase
as discovered. And critically — an agent that silently adopts legacy codebase patterns without human review embeds
mistakes no one asked for.

## The Solution

the-blueprint provides a pipeline that produces artifacts consumable by both humans and agents, implementing the
**DRAFT** methodology (Discovery → Research → Alignment → Frame → Tasks). DRAFT separates intent gathering from
objective investigation, surfaces codebase patterns for human correction before implementation, and enforces vertical
slice planning.

- **Discovery** — stress-test the idea through adversarial questioning → brief
- **Research** — parallel codebase investigation blind to intent → research document
- **Alignment** — surface patterns, align on end state, conditional ADRs → alignment document
- **Frame** — vertical slice phases with per-phase testing strategy → frame document
- **task-creation** (standalone) — convert frame phases into tracked work items

Each stage builds on the previous one with explicit user approval gates. The pipeline preserves the reasoning behind
decisions, making them discoverable months later when someone asks "why did we build it this way?"

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-blueprint
```

### Optional: enable agent teams for parallel research

The `research` skill uses Claude Code agent teams to investigate the codebase in parallel. Agent teams are experimental
and disabled by default. Enable them by adding to your settings:

```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

Requires Claude Code v2.1.32+. Without this flag, `research` will fail fast with these instructions.

## Skills

### discovery

Adversarial requirements elicitation that stress-tests ideas before committing to design. The agent acts as a critic —
challenging assumptions, finding gaps, and pressuring vague reasoning until the user's thinking holds up. Explores
dimensions across problem, goals, scope, constraints, risks, and prior art.

The primary output isn't a document — it's the primed conversation context. The agent's enriched understanding carries
into whatever comes next. A brief verification summary crystallizes the shared understanding for the user to confirm.

**Use when:** Starting a new initiative, exploring a product idea, stress-testing a plan, or beginning the pipeline.

### research

Parallel codebase investigation that produces objective findings, blind to the intent expressed in the discovery brief.
The lead generates factual research questions from the brief, dispatches a team of read-only `codebase-researcher`
teammates each scoped to a different area of the codebase, collects their structured findings via SendMessage, and
compiles them into a single research document. Teammates never see the brief, the ticket, or the user's goals — only the
questions and their assigned scope. This information barrier prevents intent leakage that would taint investigation with
opinion.

Investigation runs in waves: dispatch, wait for all findings, decide whether new scopes or follow-up questions emerged,
dispatch another wave if needed. The lead is sole author of the research document — no teammate writes files.

**Use when:** A brief has been produced (from `discovery` or otherwise) and you need objective codebase findings before
making design decisions. Requires the agent teams experimental flag (see Installation).

### alignment

Human-agent alignment on solution direction before implementation begins. The agent reads the brief and research,
extracts codebase patterns with prevalence data, and declares which patterns it intends to follow and why. The user
reviews this pattern catalog and corrects wrong assumptions — "that's the old way, go find the new way" — before any
code is planned. This pattern-surfacing step is the critical piece that was missing from the old pipeline.

After patterns are corrected, the agent presents a current state → desired end state proposal with open questions. When
genuine trade-offs surface, conditional ADR sections capture committed decisions with options, rationale, and
consequences. The alignment document is a living artifact — it may be updated throughout development and becomes
immutable only when the initiative is completed.

**Use when:** Research findings are available and you need to align on solution direction before implementation. This is
the "brain surgery" step — where you correct the agent's understanding before it writes 2,000 lines of code.

### frame

Converts the aligned solution into vertical slice phases with per-phase testing strategy. Structurally prevents
horizontal layering — models default to completing one layer at a time (all DB, then all API, then all UI), which defers
integration and hides bugs. Frame enforces vertical structure where each phase crosses all affected layers, producing a
testable integrated path. Phase 1 is always the tracer bullet: the thinnest end-to-end slice.

**Use when:** An alignment document exists and you need to plan implementation as vertical phases before coding begins.

### task-creation

Creates individual tasks in issue trackers with tracker-agnostic field discovery, proper categorization, and native
linking between related tasks. Standalone skill — not a DRAFT pipeline stage, but the natural next step after frame.

**Use when:** Creating tasks from frame phases (pipeline mode) or creating standalone tasks outside the pipeline
context.

### youtrack

YouTrack issue tracker domain knowledge — data model, custom fields, query language, commands, linking, state machines,
and tags. Provides the tracker-specific knowledge that task-creation lacks: field type taxonomy, required field
mechanics, state machine constraints, and YouTrack's query/command syntax.

**Use when:** Creating, searching, or updating issues in YouTrack. Use alongside task-creation for issue creation —
task-creation handles description quality, youtrack handles field correctness.

### diagramming

Technical diagram creation with visual design principles. Covers format selection (Excalidraw for precise spatial
control, Mermaid for portable markdown-embedded diagrams), Gestalt-based layout rules, semantic color palettes,
complexity budgets, and layout templates that compensate for LLM spatial reasoning limitations.

**Use when:** Creating, reviewing, or improving any visual diagram — architecture diagrams, flowcharts, sequence
diagrams, ER diagrams, mind maps, or any visual representation of systems and processes.

## Skill Relationships

The DRAFT pipeline skills form a linear flow with user approval gates at each transition:

```
discovery → research → alignment → frame → task-creation
```

Each DRAFT skill prompts the user to proceed to the next stage on completion. Approval is required before advancing.
Discovery is optional — start there to stress-test an idea, or skip to alignment when the problem is already
well-understood. Research is also optional — invoke when objective codebase findings are needed.

task-creation is standalone — the natural endpoint of the pipeline, but also invocable directly for creating individual
tasks without the full DRAFT flow. When working with YouTrack, the youtrack skill complements task-creation with
tracker-specific domain knowledge.

diagramming is a cross-cutting companion — not a pipeline stage. Invoke alongside alignment or frame when creating
visual artifacts, or standalone for any diagramming task.

## Document Conventions

All artifacts are stored in the `design-docs/` directory with consistent numbering:

- Brief: `02-cache-layer-redesign.brief.md`
- Research: `02-cache-layer-redesign.research.md`
- Alignment: `02-cache-layer-redesign.alignment.md`
- Frame: `02-cache-layer-redesign.frame.md`

Brief and research have optional file persistence — the user may keep them in conversation context only. Alignment and
frame always persist to disk as living artifacts.

When implementation is complete, all artifacts for an initiative move together to `design-docs/completed/`.

## License

MIT
