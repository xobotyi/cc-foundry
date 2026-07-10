# the-blueprint Plugin

Structured planning pipeline implementing the **DRAFT** methodology (Discovery → Research → Alignment → Frame → Tasks).

## Skills

DRAFT pipeline skills (D → R → A → F → T):

- **`discovery`** — Requirements elicitation and validation through structured questioning
- **`research`** — Objective codebase investigation via agent teams; produces factual findings
- **`alignment`** — Solution direction synthesis; design opinions for human correction, decision capture
- **`frame`** — Vertical-slice implementation planning with per-phase testing
- **`tasks`** — Work item decomposition with sizing, dependencies, AFK/HITL classification

Standalone skills (not pipeline stages, invocable independently):

- **`task-creation`** — Creates individual tasks in issue trackers with structured descriptions and acceptance criteria
- **`glossary`** — Project vocabulary consumable by humans and agents; prevents naming drift with prohibited aliases
- **`youtrack`** — YouTrack domain knowledge: data model, fields, queries, commands, linking
- **`diagramming`** — Technical diagram creation with visual design principles (Excalidraw, Mermaid)

## Agents

- **`codebase-researcher`** — Read-only teammate spawned by `research`; investigates one scope, returns factual findings
  with pattern prevalence signals

## Skill Flow

```
discovery (idea + glossary → shared understanding + flagged terms + research questions + not-yet-specified fog)
    ↓
research (brief → parallel codebase investigation → objective findings)
    ↓
alignment (research + brief + glossary → pattern surfacing → end state →
           glossary update + standalone ADRs → alignment.md)
    ↓
frame (alignment → vertical slice phases → per-phase testing → frame.md)
    ↓
tasks (frame phases → sized work items with artifacts, deps, AFK/HITL classification)
    ↓
task-creation (task descriptions → tracked work items in issue tracker)

glossary    ← loaded by discovery on every iteration after the first; created/updated by alignment
diagramming ← invoked alongside alignment or frame when visual artifacts are needed
```

Each pipeline skill prompts the user to proceed to the next stage on completion. User approval is required at every
stage before advancing. `task-creation` is standalone — Frame transitions to it, but it can also be invoked directly.

## Requirements

`research` requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (Claude Code v2.1.32+). The skill fails fast with
enablement instructions when the flag is missing.

## Pipeline Usage

**From idea to tasks:** Start with `discovery` to stress-test the idea, then follow the prompts through each stage. The
pipeline produces deliverables at each stage: the brief (discovery), the research document (objective findings), the
alignment document (pattern decisions, end state, conditional ADRs), the frame document (vertical slice phases with
testing strategy), and the task breakdown (sized work items with artifacts and dependencies). Finally, invoke
`task-creation` to create tracked items in the issue tracker.

**Standalone task creation:** Invoke `task-creation` directly when creating individual tasks outside the pipeline
context.

**YouTrack-specific work:** The `youtrack` skill complements `task-creation` with YouTrack-specific field handling and
conventions. Invoke both when creating issues in YouTrack.

**Diagrams:** The `diagramming` skill is a cross-cutting companion. Invoke alongside `alignment` or `frame` when
creating architecture diagrams, flowcharts, or any visual artifact.

## Conventions

**Artifact mutability:**

- **Brief** (`brief.md`) and **research** (`research.md`) are **immutable** snapshots — they capture what was true at a
  point in time and do not change after creation.
- **Alignment** (`alignment.md`) and **frame** (`frame.md`) are **living artifacts** — they may be updated throughout
  development as new information emerges. Immutable only when moved to `completed/`.

**Artifact persistence:**

- **Brief** and **research** have **optional** file persistence. The user may choose to keep them in conversation
  context only, or write to disk. When not written to disk, the full content is output to conversation as a context
  checkpoint.
- **Alignment** and **frame** have **mandatory** file persistence. They always write to `design-docs/`. Tasks link back
  to frame.md; alignment references standalone ADR files in `design-docs/adr/`.
- **ADRs** have **mandatory** file persistence. Each ADR is a standalone file at `design-docs/adr/{N.M}-slug.md`. The
  `design-docs/ADR.md` index is maintained on every ADR write.

**Briefs:** Output of `discovery`. Store in `design-docs/` as `NN-short-description.brief.md`. When discovery hands off
directly to research, the brief is held in conversation context and persisted by `research` after investigation
completes — never written to disk while teammates are running, or they could read it.

**Research documents:** Output of `research`. Pair with the brief using the same number prefix
(`NN-short-description.research.md`). Compiled by the research lead from teammate findings.

**Alignment documents:** Output of `alignment`. Pair with the brief and research using the same number prefix
(`NN-short-description.alignment.md`). Contains pattern decisions, current→desired end state, resolved questions, and
cross-references to any ADRs recorded during this alignment. ADR content lives in the ADR files, not in `alignment.md`.

**ADRs:** Standalone files at `design-docs/adr/{N.M}-slug.md`. The number tracks the initiative that birthed the ADR
(initiative `04` writing its first ADR creates `4.1-{slug}.md`; second is `4.2-{slug}.md`). The ADR itself is
system-wide and **never moves to `completed/`** when its parent initiative does — lifecycle is decoupled. Each ADR has a
`Status` field (`accepted | deprecated | superseded by N.M`). Written and updated by the `alignment` skill.

**ADR index:** `design-docs/ADR.md` lists all ADRs grouped by status (Accepted, Deprecated, Superseded). Sibling to the
`adr/` folder. Maintained by the `alignment` skill on every ADR write. Index never moves to `completed/`.

**Glossary:** `docs/glossary.md` is loaded by `discovery` (vocabulary contract) and maintained by `alignment` (terms
sharpened, ambiguities resolved, new entries added per the `glossary` skill's trap test). First iteration may run
without a glossary; alignment creates one as a sibling artifact at the end of Phase 3.

**Frame documents:** Output of `frame`. Pair with alignment using the same number prefix
(`NN-short-description.frame.md`). Contains vertical slice phases with components, testing strategy, verification gates,
and acceptance criteria per phase.

**Task documents:** Output of `tasks`. Optional persistence — write as `NN-short-description.tasks.md` when
cross-session continuity matters. Contains sized work items grouped by frame phase, with artifacts, dependencies, and
AFK/HITL classification. Immutable snapshot — the tracked tasks in the issue tracker become the source of truth after
creation.

**Completed artifacts:** Brief, research, alignment, frame, and tasks for an initiative move together to
`design-docs/completed/` when the work is implemented. ADRs and the ADR index **never move** — they remain at
`design-docs/adr/` and `design-docs/ADR.md` regardless of which initiatives have completed.
