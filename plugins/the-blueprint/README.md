# the-blueprint

Structured planning pipeline: from problem analysis to tracked work items.

Produces artifacts consumable by both humans and agents — design documents, technical
designs, decomposition documents, and issue tracker tasks. Each skill in the pipeline
hands off to the next, with user approval gates at every stage.

## Pipeline

```
design-documents (problem → analysis → recommended solution)
    ↓
technical-design (solution → affected components, tools, sequencing)
    ↓
task-decomposition (components → actionable task hierarchies)
    ↓
task-creation (tasks → tracked work items in issue tracker)
```

## Skills

- **design-documents** — Problem analysis, solution exploration, architectural decisions.
  Produces design documents with options comparison, recommendation, and cross-cutting
  concerns. Outputs to `design-docs/NN-short-description.md`.
- **technical-design** — Maps a chosen solution onto the codebase: affected components,
  tool selection, dependencies, sequencing, and scope boundaries. Outputs to
  `design-docs/NN-short-description.technical-design.md`.
- **task-decomposition** — Breaks technical designs into estimated, dependency-mapped task
  hierarchies with detailed descriptions and acceptance criteria. Outputs to
  `design-docs/NN-short-description.decomposition.md`.
- **task-creation** — Creates individual tasks in issue trackers with tracker-agnostic
  field discovery, proper categorization, and native linking. Works standalone or from
  the pipeline.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-blueprint
```
