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

- **Discovery** — stress-test the idea through adversarial questioning, against the project glossary → brief
- **Research** — parallel codebase investigation blind to intent → research document
- **Alignment** — surface patterns, align on end state, write standalone ADRs, maintain the glossary → alignment
  document
- **Frame** — vertical slice phases with per-phase testing strategy → frame document
- **Tasks** — decompose phases into sized, dependency-mapped work items → task breakdown
- **task-creation** (standalone) — create tracked items in issue tracker

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

Requirements elicitation and validation that stress-tests ideas before committing to design. The agent extracts the
user's domain expertise through structured questioning — first listening to understand intent, then challenging
assumptions, finding gaps, and pressuring vague reasoning. Explores dimensions across motivation, goals, scope,
constraints, risks, and prior art.

Discovery loads the project glossary (`docs/glossary.md`) before starting so questions are framed in the project's
language. In Phase 1, terminology gets clarified inline — synonyms surfaced ("when you said buyer, did you mean
`Customer`?"), new concepts flagged for alignment, glossary contradictions surfaced as signals the glossary may need
updating. Architecture-shaped knowledge (CLAUDE.md, ADRs, prior design docs, code) stays out — that's research's job.

The primary output isn't a document — it's the primed conversation context. The agent's enriched understanding carries
into whatever comes next. A brief verification summary crystallizes the shared understanding for the user to confirm,
and lists any flagged term ambiguities for alignment to resolve.

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

Human-agent alignment on solution direction before implementation begins. The agent reads the brief, research, and
glossary, extracts codebase patterns with prevalence data, and declares which patterns it intends to follow and why. The
user reviews this pattern catalog and corrects wrong assumptions — "that's the old way, go find the new way" — before
any code is planned. This pattern-surfacing step is the critical piece that was missing from the old pipeline.

After patterns are corrected, the agent presents a current state → desired end state proposal with open questions.
Before completing the end-state phase, alignment maintains the glossary — resolving ambiguities discovery flagged,
sharpening definitions, and (on the first iteration) creating the glossary if none exists. When genuine trade-offs
surface, alignment writes standalone ADRs to `design-docs/adr/{N.M}-slug.md` and updates the `design-docs/ADR.md` index.
ADRs are gated by a strict three-part test: hard-to-reverse, surprising-without-context, and a real trade-off. ADRs
outlive their parent initiative — they stay in `design-docs/adr/` even when the initiative moves to `completed/`.

**Use when:** Research findings are available and you need to align on solution direction before implementation. This is
where you correct the agent's understanding before it writes 2,000 lines of code based on wrong assumptions.

### frame

Converts the aligned solution into vertical slice phases with per-phase testing strategy. Structurally prevents
horizontal layering — models default to completing one layer at a time (all DB, then all API, then all UI), which defers
integration and hides bugs. Frame enforces vertical structure where each phase crosses all affected layers, producing a
testable integrated path. Phase 1 is always the tracer bullet: the thinnest end-to-end slice.

**Use when:** An alignment document exists and you need to plan implementation as vertical phases before coding begins.

### tasks

Decomposes frame phases into individually trackable work items. Each task gets a title, estimate, dependencies, expected
artifact, and an AFK/HITL classification indicating whether it can run autonomously or needs a human at the keyboard.
The task breakdown bridges the frame's vertical phases to the mechanical task creation in an issue tracker.

**Use when:** A frame document exists and you need to break phases into assignable, sized work items before creating
tracker tasks.

### task-creation

Creates individual tasks in issue trackers with tracker-agnostic field discovery, proper categorization, and native
linking between related tasks. Standalone skill — not a DRAFT pipeline stage, but the natural next step after frame.

**Use when:** Creating tasks from frame phases (pipeline mode) or creating standalone tasks outside the pipeline
context.

### glossary

Creates and maintains a project glossary — a shared vocabulary consumable by both humans and AI agents. Based on
Domain-Driven Design's Ubiquitous Language: each term gets a definition and a rationale-bearing `Avoid` line listing the
wrong names a reviewer or agent would plausibly reach for. Entries are gated by the trap test — if no plausible wrong
name exists, the term doesn't belong. The glossary lives alongside CLAUDE.md as structural context, preventing agents
from inventing synonyms or using generic terms where the project has specific ones.

Inside the DRAFT pipeline, glossary maintenance is `alignment`'s responsibility — `discovery` loads the glossary but
never updates it, and `alignment` invokes this skill on the first iteration to create the glossary and on subsequent
iterations to resolve ambiguities discovery flagged.

**Use when:** Starting a new project, encountering naming inconsistencies, or when agents keep using the wrong terms for
domain concepts. Inside DRAFT, it runs automatically — invoked from `alignment` Phase 3.

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
discovery → research → alignment → frame → tasks → task-creation
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

Initiative artifacts are stored in `design-docs/` with consistent numbering:

- Brief: `02-cache-layer-redesign.brief.md`
- Research: `02-cache-layer-redesign.research.md`
- Alignment: `02-cache-layer-redesign.alignment.md`
- Frame: `02-cache-layer-redesign.frame.md`
- Tasks: `02-cache-layer-redesign.tasks.md`

ADRs and the glossary live alongside but on different lifecycles:

- ADR: `design-docs/adr/{N.M}-slug.md` — `N` is the initiative number that birthed the ADR, `M` is the sequence within
  that initiative (initiative `04` writing two ADRs creates `4.1-*.md` and `4.2-*.md`).
- ADR index: `design-docs/ADR.md` — flat index grouped by status (Accepted / Deprecated / Superseded), updated by
  `alignment` on every ADR write.
- Glossary: `docs/glossary.md` — created by `alignment` when missing, updated as terms are resolved during alignment.

Brief, research, and tasks have optional file persistence — the user may keep them in conversation context only.
Alignment, frame, ADRs, and the ADR index always persist to disk.

When implementation is complete, brief / research / alignment / frame / tasks for an initiative move together to
`design-docs/completed/`. **ADRs, the ADR index, and the glossary never move** — they are system-wide and outlive any
single initiative.

## License

MIT
