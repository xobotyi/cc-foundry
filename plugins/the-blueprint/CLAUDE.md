# the-blueprint Plugin

Structured planning pipeline that converts problem analysis into tracked work items.

## Skills

| Skill | Purpose |
|-------|---------|
| `design-documents` | Problem analysis, solution exploration, architectural decisions |
| `technical-design` | Map chosen solution to codebase components, tools, sequencing |
| `task-decomposition` | Break technical design into actionable task hierarchies |
| `task-creation` | Create individual tasks in issue trackers with proper categorization |

## Skill Flow

```
design-documents (problem → analysis → recommendation)
    ↓
technical-design (solution → components, tools, sequencing)
    ↓
task-decomposition (technical design → task hierarchies with acceptance criteria)
    ↓
task-creation (tasks → tracked work items)
```

Each skill prompts the user to proceed to the next stage on completion. User approval is
required at every stage before advancing.

## Pipeline Usage

**From problem to tasks:** Start with `design-documents` and follow the prompts through each
stage. The pipeline produces three deliverables: the design document (what and why), the
technical design (how at the component level), and the decomposition document with links to
tracked tasks.

**Standalone task creation:** Invoke `task-creation` directly when creating individual tasks
outside the pipeline context.

## Conventions

**Design documents:** Store in `design-docs/` directory with numbered naming
(`NN-short-description.md`). Move to `design-docs/completed/` when implemented.

**Technical designs:** Pair with their design doc using the same number prefix
(`NN-short-description.technical-design.md`).

**Decomposition documents:** Pair with their design doc using the same number prefix
(`NN-short-description.decomposition.md`), contain task descriptions and links to issue tracker
items.

**Completed artifacts:** All three documents move together to `design-docs/completed/` when
the work is implemented.
