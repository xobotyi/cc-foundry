# the-blueprint

Structured planning pipeline that converts problem analysis into tracked work items.

## The Problem

**Planning work is either too shallow or too detailed.** Shallow planning produces vague tasks
that force implementers to reverse-engineer intent from chat history or institutional memory.
Detailed planning wastes effort prescribing implementation before understanding is complete,
resulting in rework when reality diverges from assumptions.

The gap between "we should build this" and "here are the tasks to do it" is filled with
ad-hoc decisions made during implementation — decisions that could have been caught earlier,
shared with the team, and preserved as architecture decision records.

**Agent-driven workflows make this worse.** An agent implementing from a vague task drifts
from the intended solution. An agent implementing from an overly prescriptive task follows
outdated instructions instead of adapting to the codebase as discovered.

## The Solution

the-blueprint provides a four-stage pipeline that produces artifacts consumable by both humans
and agents: design documents (problem analysis and solution recommendation), technical designs
(component mapping and sequencing), decomposition documents (actionable task hierarchies), and
issue tracker tasks with acceptance criteria.

Each stage builds on the previous one with explicit user approval gates. The pipeline
preserves the reasoning behind decisions, making them discoverable months later when someone
asks "why did we build it this way?"

The artifacts serve dual purposes: humans read them to understand context and trade-offs;
agents consume them to plan implementation without drifting from intent.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-blueprint
```

## Skills

### design-documents

Problem analysis, solution exploration, and architectural decisions. Produces design documents
with options comparison, recommendation, and cross-cutting concerns.

**Use when:** Creating, updating, reviewing, or asking questions about design documents. Start
here when beginning the planning pipeline.

### technical-design

Maps a chosen solution onto the codebase: affected components, tool selection, dependencies,
sequencing, and scope boundaries.

**Use when:** A design document has been created and a solution was chosen. This skill
translates strategic decisions into component-level planning.

### task-decomposition

Breaks technical designs into estimated, dependency-mapped task hierarchies with detailed
descriptions and acceptance criteria. Validates that no leaf task exceeds 8 hours.

**Use when:** A technical design is complete and needs to be converted into actionable work
items. Produces the decomposition document that connects planning to execution.

### task-creation

Creates individual tasks in issue trackers with tracker-agnostic field discovery, proper
categorization, and native linking between related tasks.

**Use when:** Creating tasks from a decomposition document (pipeline mode) or creating
standalone tasks outside the pipeline context.

### youtrack

YouTrack issue tracker domain knowledge — data model, custom fields, query language,
commands, linking, state machines, and tags. Provides the tracker-specific knowledge that
task-creation lacks: field type taxonomy, required field mechanics, state machine constraints,
and YouTrack's query/command syntax.

**Use when:** Creating, searching, or updating issues in YouTrack. Use alongside task-creation
for issue creation — task-creation handles description quality, youtrack handles field
correctness.

## Skill Relationships

The skills form a linear pipeline with user approval gates at each transition:

```
design-documents → technical-design → task-decomposition → task-creation
```

Each skill prompts the user to proceed to the next stage on completion. Approval is required
before advancing.

task-creation can also be invoked standalone for creating individual tasks without going
through the full pipeline. When working with YouTrack specifically, the youtrack skill
complements task-creation with tracker-specific domain knowledge.

## Document Conventions

All artifacts are stored in the `design-docs/` directory with consistent numbering:

- Design document: `02-cache-layer-redesign.md`
- Technical design: `02-cache-layer-redesign.technical-design.md`
- Decomposition: `02-cache-layer-redesign.decomposition.md`

When implementation is complete, all three documents move together to
`design-docs/completed/`.

## License

MIT
