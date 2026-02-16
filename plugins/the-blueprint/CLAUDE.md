# the-blueprint Plugin

## Philosophy

The blueprint is the deliverable, not the process.

These skills produce structured artifacts — design documents, technical
designs, and decomposition documents — that initiate work for both humans
and agents. A design document defines what to build and why. A technical
design maps that decision onto the codebase: affected components, tool
selection, sequencing. A decomposition document breaks the technical
design into tracked, actionable tasks.

The artifacts are the interface between thinking and doing. They must be
equally useful to a person reading them and to an agent consuming them
to plan implementation. This dual-audience constraint shapes everything:
clear structure, explicit decisions, linked task references.

## Skills

| Skill | Purpose |
|-------|---------|
| `design-documents` | Problem analysis, solution exploration, architectural decisions |
| `technical-design` | Affected components, tool selection, approach, sequencing |
| `task-decomposition` | Break technical design into actionable task hierarchies |
| `task-creation` | Create individual tasks in issue trackers |

## Skill Flow

```
design-documents (analysis → decisions)
    ↓
technical-design (decision → components, tools, sequencing)
    ↓
task-decomposition (technical design → structured subtasks)
    ↓
task-creation (subtasks → tracked work items)
```

Each skill prompts the user to proceed to the next stage on completion.
User approval is required at every stage before advancing.

The pipeline produces three deliverables: the design document (what and why),
the technical design (how at the component level), and the decomposition
document with links to actionable tasks in the issue tracker.

## Conventions

**Design documents:** `design-docs/` directory, numbered naming
(`NN-short-description.md`), moved to `completed/` when implemented.

**Technical designs:** Pair with their design doc using the same number prefix
(`NN-short-description.technical-design.md`).

**Decomposition documents:** Pair with their design doc using the same number
prefix (`NN-short-description.decomposition.md`), contain task descriptions
and links to issue tracker items.

**Completed artifacts:** All three documents move together to
`design-docs/completed/` when implemented.