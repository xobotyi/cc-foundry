# the-blueprint Plugin

Structured planning pipeline that converts problem analysis into tracked work items.

## Skills

| Skill                | Purpose                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| `discovery`          | Adversarial requirements elicitation — stress-test ideas before design         |
| `design-documents`   | Decision records: problem analysis, solution exploration, committed decisions  |
| `technical-design`   | Map chosen solution to codebase components, tools, sequencing                  |
| `task-decomposition` | Break technical design into actionable task hierarchies                        |
| `task-creation`      | Create individual tasks in issue trackers with proper categorization           |
| `youtrack`           | YouTrack domain knowledge — data model, fields, queries, commands, linking     |
| `diagramming`        | Technical diagram creation with visual design principles (Excalidraw, Mermaid) |

## Skill Flow

```
discovery (idea → shared understanding via adversarial questioning)
    ↓
design-documents (understanding → analysis → decision)
    ↓
technical-design (solution → components, tools, sequencing)
    ↓
task-decomposition (technical design → task hierarchies with acceptance criteria)
    ↓
task-creation (tasks → tracked work items)

diagramming ← invoked alongside design-documents or technical-design when visual artifacts are needed
```

Each pipeline skill prompts the user to proceed to the next stage on completion. User approval is required at every
stage before advancing.

## Pipeline Usage

**From idea to tasks:** Start with `discovery` to stress-test the idea, then follow the prompts through each stage. The
pipeline produces three deliverables: the design document (what was decided and why), the technical design (how at the
component level), and the decomposition document with links to tracked tasks.

**Standalone task creation:** Invoke `task-creation` directly when creating individual tasks outside the pipeline
context.

**YouTrack-specific work:** The `youtrack` skill provides domain knowledge for YouTrack's data model, custom fields,
query language, commands, and linking. It complements `task-creation` (which is tracker-agnostic) with YouTrack-specific
field handling and conventions. Invoke both when creating issues in YouTrack.

**Diagrams:** The `diagramming` skill is a cross-cutting companion — not a pipeline stage. Invoke it alongside
`design-documents` or `technical-design` when creating architecture diagrams, flowcharts, sequence diagrams, or any
visual artifact. It covers format selection (Excalidraw vs Mermaid), visual design principles, and layout strategies
that compensate for LLM spatial reasoning limitations.

## Conventions

**Design documents:** Store in `design-docs/` directory with numbered naming (`NN-short-description.md`). Move to
`design-docs/completed/` when implemented.

**Technical designs:** Pair with their design doc using the same number prefix
(`NN-short-description.technical-design.md`).

**Decomposition documents:** Pair with their design doc using the same number prefix
(`NN-short-description.decomposition.md`), contain task descriptions and links to issue tracker items.

**Completed artifacts:** All three documents move together to `design-docs/completed/` when the work is implemented.
