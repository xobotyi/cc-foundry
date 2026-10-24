# the-blueprint Plugin

Structured planning pipeline implementing the **DRAFT** methodology (Discovery → Research → Alignment → Frame → Tasks),
plus the standalone planning skills the pipeline hands off to.

## Skills

Pipeline stages in order, each owning one artifact:

- **`discovery`** — the brief
- **`research`** — the research document, compiled by the lead from teammate findings
- **`alignment`** — the alignment document and the glossary; hands each settled decision to `adr`
- **`frame`** — the frame document
- **`tasks`** — the task breakdown: sizing, dependencies, phase coverage, AFK/HITL, the tasks-document format

Standalone, invocable outside the pipeline:

- **`task-creation`** — what a written work item contains: the reader it targets, the verification behind every claim,
  the location, the acceptance criteria, and the approval gate before anything is created; the pipeline's terminus
  (`tasks` hands off to it) and a direct entry point
- **`glossary`** — the vocabulary contract; read by `discovery`, written by `alignment`
- **`adr`** — the decision records and their index: what earns a record, its shape and identity, rewriting and deleting
  it, pending implementation, and the index every session imports; invoked by `alignment` and directly during
  implementation
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
- **`adr` owns the ADRs and the ADR index; `alignment` writes them only through it.** Alignment states no ADR rule of
  its own — a local variant in alignment is the drift this split exists to prevent. `alignment` is the sole writer of
  the glossary. ADRs, the index, and the glossary outlive the initiative and never move to `completed/`. Changing the
  `design-docs/adr/{N.M}-topic.md` path or the numbering touches `adr`, its two templates, and `alignment`'s Phase 4
  together.
- **Persistence tiers differ by artifact.** `alignment`, `frame`, ADRs, and the ADR index always write to disk; brief,
  research, and tasks are optional and may stay in conversation context — which is why every loader checks context
  first.
- **User approval gates every stage transition.** A stage that advances on its own removes the correction point the
  pipeline exists to provide.
- **One rule has one home across `tasks`, `task-creation`, and `youtrack`.** `task-creation` owns work-item content,
  `tasks` owns decomposition, `youtrack` owns tracker mechanics. Never restate a content rule in `tasks`, a sizing rule
  in `task-creation`, or a YouTrack mechanic in either — name the owning skill and stop. A rule that lives in two files
  is a defect, not redundancy: the copies drift apart under separate edits, and the reader obeys whichever one loaded.

## Conventions

- **`adr` keeps ADRs living — rewritten in place and deleted once they stop holding — because an agent follows a
  superseded ADR it can find.** Do not reintroduce statuses, supersession lines, amendment blocks, tombstones, or
  proposals in the ADR directory ([ADR 1.10](/design-docs/adr/1.10-decision-record-lifecycle.md)).
- **An ADR index line carries only number, title, and link** — the index is imported into every session, so every added
  field is paid for in every session ([ADR 1.11](/design-docs/adr/1.11-decision-record-index.md)).

## Critical Constraints

- **The information barrier is the load-bearing invariant.** Research teammates never see the brief, the ticket, or user
  intent — spawn prompts and task descriptions carry questions and scope only, and the brief reaches disk only in
  `research` Phase 3 after every wave completes. It is enforced across `discovery`, `research`, and the
  `codebase-researcher` agent; changing one without the others opens it.
- **`research` requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and an interactive session.** Its preflight stops the
  skill when the flag is missing. Under `claude -p` a named spawn degrades to an ordinary subagent, so findings return
  as results instead of by `SendMessage`.
