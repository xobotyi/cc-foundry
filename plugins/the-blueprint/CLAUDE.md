# the-blueprint Plugin

Structured planning pipeline that converts problem analysis into tracked work items. The pipeline is being migrated to
the **DRAFT** methodology (Discovery → Research → Alignment → Frame → Tasks) — see issue #8.

## Skills

DRAFT pipeline skills live in `skills/DRAFT/`, numbered by stage:

- **`discovery`** (`DRAFT/01-discovery`) — Adversarial requirements elicitation; stress-tests ideas before design
- **`research`** (`DRAFT/02-research`) — Parallel codebase investigation via agent teams; produces objective findings
- **`alignment`** (`DRAFT/03-alignment`) — Human-agent alignment on solution direction; surfaces patterns for
  correction, conditional ADR sections

Remaining pipeline skills retain current names until reworked into DRAFT stages:

- **`technical-design`** — Maps chosen solution to codebase components, tools, sequencing (future: `frame`)
- **`task-decomposition`** — Breaks technical design into actionable task hierarchies (future: merged into `frame`)
- **`task-creation`** — Creates individual tasks in issue trackers with proper categorization (future: `tasks`)

Cross-cutting skills (not pipeline stages):

- **`youtrack`** — YouTrack domain knowledge: data model, fields, queries, commands, linking
- **`diagramming`** — Technical diagram creation with visual design principles (Excalidraw, Mermaid)

## Agents

- **`codebase-researcher`** — Read-only teammate spawned by `research`; investigates one scope, returns factual findings
  with pattern prevalence signals

## Skill Flow

```
discovery (idea → shared understanding via adversarial questioning)
    ↓
research (brief → parallel codebase investigation → objective findings)
    ↓
alignment (research + brief → pattern surfacing → end state → conditional ADR → alignment.md)
    ↓
technical-design (solution → components, tools, sequencing)  [future: frame]
    ↓
task-decomposition (technical design → task hierarchies)  [future: merged into frame]
    ↓
task-creation (tasks → tracked work items)  [future: tasks]

diagramming ← invoked alongside alignment or technical-design when visual artifacts are needed
```

Each pipeline skill prompts the user to proceed to the next stage on completion. User approval is required at every
stage before advancing.

## Requirements

`research` requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (Claude Code v2.1.32+). The skill fails fast with
enablement instructions when the flag is missing.

## Pipeline Usage

**From idea to tasks:** Start with `discovery` to stress-test the idea, then follow the prompts through each stage. The
pipeline produces deliverables at each stage: the brief (problem statement from discovery), the research document
(objective codebase findings), the alignment document (pattern decisions, end state, conditional ADRs), the technical
design (how at the component level), and the decomposition document with links to tracked tasks.

**Standalone task creation:** Invoke `task-creation` directly when creating individual tasks outside the pipeline
context.

**YouTrack-specific work:** The `youtrack` skill provides domain knowledge for YouTrack's data model, custom fields,
query language, commands, and linking. It complements `task-creation` (which is tracker-agnostic) with YouTrack-specific
field handling and conventions. Invoke both when creating issues in YouTrack.

**Diagrams:** The `diagramming` skill is a cross-cutting companion — not a pipeline stage. Invoke it alongside
`alignment` or `technical-design` when creating architecture diagrams, flowcharts, sequence diagrams, or any visual
artifact.

## Conventions

**Artifact mutability:**

- **Brief** (`brief.md`) and **research** (`research.md`) are **immutable** snapshots — they capture what was true at a
  point in time and do not change after creation.
- **Alignment** (`alignment.md`) is a **living artifact** — it may be updated throughout development as new information
  emerges. It becomes immutable only when moved to `completed/`.

**Artifact persistence:**

- **Brief** and **research** have **optional** file persistence. The user may choose to keep them in conversation
  context only, or write to disk. When not written to disk, the full content is output to conversation as a context
  checkpoint.
- **Alignment** has **mandatory** file persistence. It always writes to `design-docs/` — there is no "skip file" option.

**Briefs:** Output of `discovery`. Store in `design-docs/` as `NN-short-description.brief.md`. When discovery hands off
directly to research, the brief is held in conversation context and persisted by `research` after investigation
completes — never written to disk while teammates are running, or they could read it.

**Research documents:** Output of `research`. Pair with the brief using the same number prefix
(`NN-short-description.research.md`). Compiled by the research lead from teammate findings.

**Alignment documents:** Output of `alignment`. Pair with the brief and research using the same number prefix
(`NN-short-description.alignment.md`). Contains pattern decisions, current→desired end state, resolved questions, and
conditional ADR sections when trade-offs were committed.

**Technical designs:** Pair with their alignment doc using the same number prefix
(`NN-short-description.technical-design.md`).

**Decomposition documents:** Pair with their alignment doc using the same number prefix
(`NN-short-description.decomposition.md`), contain task descriptions and links to issue tracker items.

**Completed artifacts:** All artifacts for an initiative move together to `design-docs/completed/` when the work is
implemented.
