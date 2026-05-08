# the-blueprint Plugin

Structured planning pipeline that converts problem analysis into tracked work items.

## Skills

- **`discovery`** — Adversarial requirements elicitation; stress-tests ideas before design
- **`research`** — Parallel codebase investigation via agent teams; produces objective findings
- **`design-documents`** — Decision records: problem analysis, solution exploration, committed decisions
- **`technical-design`** — Maps chosen solution to codebase components, tools, sequencing
- **`task-decomposition`** — Breaks technical design into actionable task hierarchies
- **`task-creation`** — Creates individual tasks in issue trackers with proper categorization
- **`youtrack`** — YouTrack domain knowledge: data model, fields, queries, commands, linking
- **`diagramming`** — Technical diagram creation with visual design principles (Excalidraw, Mermaid)

## Agents

- **`codebase-researcher`** — Read-only teammate spawned by `research`; investigates one scope, returns factual findings

## Skill Flow

```
discovery (idea → shared understanding via adversarial questioning)
    ↓
research (brief → parallel codebase investigation → objective findings)
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

`research` is part of the DRAFT methodology migration (see issue #8) — the rest of the pipeline retains current names
until subsequent stages are reworked.

## Requirements

`research` requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (Claude Code v2.1.32+). The skill fails fast with
enablement instructions when the flag is missing.

## Pipeline Usage

**From idea to tasks:** Start with `discovery` to stress-test the idea, then follow the prompts through each stage. The
pipeline produces deliverables at each stage: the brief (problem statement from discovery), the research document
(objective codebase findings), the design document (what was decided and why), the technical design (how at the
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

**Briefs:** Output of `discovery`. Store in `design-docs/` as `NN-short-description.brief.md`. When discovery hands off
directly to research, the brief is held in conversation context and persisted by `research` after investigation
completes — never written to disk while teammates are running, or they could read it.

**Research documents:** Output of `research`. Pair with the brief using the same number prefix
(`NN-short-description.research.md`). Compiled by the research lead from teammate findings.

**Design documents:** Store in `design-docs/` directory with numbered naming (`NN-short-description.md`). Move to
`design-docs/completed/` when implemented.

**Technical designs:** Pair with their design doc using the same number prefix
(`NN-short-description.technical-design.md`).

**Decomposition documents:** Pair with their design doc using the same number prefix
(`NN-short-description.decomposition.md`), contain task descriptions and links to issue tracker items.

**Completed artifacts:** All artifacts for an initiative move together to `design-docs/completed/` when the work is
implemented.
