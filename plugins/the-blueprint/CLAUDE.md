# the-blueprint Plugin

Structured planning pipeline implementing the **DRAFT** methodology (Discovery → Research → Alignment → Frame → Tasks),
plus the standalone planning skills the pipeline hands off to.

## Skills

Pipeline stages in order, each owning one artifact:

- **`discovery`** — the brief
- **`research`** — the research document, compiled by the lead from teammate findings
- **`alignment`** — the alignment document, the ADRs, the ADR index, the glossary
- **`frame`** — the frame document
- **`tasks`** — the task breakdown: sizing, dependencies, phase coverage, AFK/HITL, the tasks-document format

Standalone, invocable outside the pipeline:

- **`task-creation`** — what a written work item contains: the reader it targets, the verification behind every claim,
  the location, the acceptance criteria, and the approval gate before anything is created; the pipeline's terminus
  (`tasks` hands off to it) and a direct entry point
- **`glossary`** — the vocabulary contract; read by `discovery`, written by `alignment`
- **`youtrack`** — YouTrack behavior: what a project configures, what a write changes besides the field it names, and
  which failures report success. Carries no tool inventory and no endpoint reference — the MCP server documents its own
  tools and JetBrains documents its own API; both drift. Depth routed to `references/` for the query and command
  languages only
- **`diagramming`** — cross-cutting; invoked alongside `alignment` or `frame`

## Agents

- **`codebase-researcher`** — read-only teammate spawned by `research` with `subagent_type: "codebase-researcher"`. Its
  `SendMessage` finding format is the input `research` compiles; the two move together.

## Skill Dependencies

- **The artifact chain is path-coupled.** Every stage loads its predecessor from `design-docs/NN-name.{stage}.md`,
  checking conversation context before disk. Renaming the scheme in one skill breaks every downstream loader.
- **`alignment` is the sole writer of ADRs, the ADR index, and the glossary.** All three outlive the initiative and
  never move to `completed/`. Changing the `design-docs/adr/{N.M}-slug.md` path, the numbering, or the index grouping
  touches `alignment` and `glossary` together.
- **Persistence tiers differ by artifact.** `alignment`, `frame`, ADRs, and the ADR index always write to disk; brief,
  research, and tasks are optional and may stay in conversation context — which is why every loader checks context
  first.
- **User approval gates every stage transition.** A stage that advances on its own removes the correction point the
  pipeline exists to provide.
- **One rule has one home across `tasks`, `task-creation`, and `youtrack`.** `task-creation` owns work-item content,
  `tasks` owns decomposition, `youtrack` owns tracker mechanics. Never restate a content rule in `tasks`, a sizing rule
  in `task-creation`, or a YouTrack mechanic in either — name the owning skill and stop. A rule that lives in two files
  is a defect, not redundancy: the copies drift apart under separate edits, and the reader obeys whichever one loaded.

## Critical Constraints

- **The information barrier is the load-bearing invariant.** Research teammates never see the brief, the ticket, or user
  intent — spawn prompts and task descriptions carry questions and scope only, and the brief reaches disk only in
  `research` Phase 3 after every wave completes. It is enforced across `discovery`, `research`, and the
  `codebase-researcher` agent; changing one without the others opens it.
- **`research` requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and an interactive session.** Its preflight stops the
  skill when the flag is missing. Under `claude -p` a named spawn degrades to an ordinary subagent, so findings return
  as results instead of by `SendMessage`.
