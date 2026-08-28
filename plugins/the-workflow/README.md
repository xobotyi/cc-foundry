# the-workflow

Agentic workflow mechanics: the foundational skills that make working with Claude Code effective across sessions,
projects, and teams.

## The Problem

Two workflow problems compound across every project that uses agentic coding:

**Persistent context degrades.** CLAUDE.md files grow until Claude ignores half the instructions. Rules get buried in
noise, drift from reality, or sit at the wrong abstraction level. Some never reach the session at all — a nested file
that only loads when Claude reads something beside it, a path-scoped rule that never matched, an instruction dropped at
the last compaction. The file exists, but compliance drops, and the cause is rarely the one it looks like.

**Context transfer loses state.** When work crosses a context boundary — session restart, teammate delegation, async
resumption — the handoff is either a wall of text that overloads the receiver, or a paragraph that loses decisions,
constraints, and resource identifiers. The receiving agent wastes tokens re-deriving information that was already known.

## The Solution

the-workflow provides skills for the two sides of agentic workflow quality:

### claude-md

The CLAUDE.md and `.claude/rules/` artifacts — writing them, routing content between them, and working out why a rule
that is plainly written in the file is not being followed.

It starts from the loading model, because most advice about CLAUDE.md is wrong in a way that only shows up there. A file
in a subdirectory is not in context until Claude reads something beside it. `@path` imports expand at launch, so
splitting a long file into imports organizes it without reclaiming a single token. Only a `paths`-scoped rule actually
reduces what loads every session. Compaction keeps the project-root file and drops the rest until they are triggered
again. Decisions about where a rule should live follow from those mechanics, not from taste.

Covers:

- **What loads when** — launch versus on demand, layer scope and precedence, imports, `claudeMdExcludes`, what survives
  compaction
- **Layer routing** — CLAUDE.md vs `.claude/rules/` vs skills vs hooks vs settings vs auto memory, and why prose is
  never enforcement
- **What belongs in the file** — the deletion test, the inferability test, and the content that keeps creeping back in
- **Writing and trimming** — concrete instructions, present tense, the 200-line target, and which content stays no
  matter how rarely it applies
- **Diagnosis** — the ordered list of causes for an ignored rule, mechanical ones first

The bundled scaffold reference carries the canonical section order with worked examples, a creation workflow, and
monorepo layouts.

### handoff

Structured context transfer across session boundaries. Produces a prompt-quality transfer document by triaging the
agent's conversation context into "preserve" (decisions, constraints, resource IDs, verification state) and "drop"
(exploration paths, failed approaches, raw tool output).

Two modes handle different receivers, selected by argument:

- **`/handoff`** — for session restarts. Task state and decisions; the receiver already knows the project.
- **`/handoff teammate`** — for delegation. Adds codebase orientation, skill pointers, and conventions.

Three of its sections exist because handoffs reliably omit them. Clinical handoff research built the I-PASS protocol
around the elements observers found missing from real shift changes — severity, contingency planning, and read-back by
the receiver — and the same three were missing here. So the document opens with a state grade (clean, watch, blocked)
that tells the receiver what to do first, carries a Contingencies section for the failure modes the sender can foresee
and the receiver cannot, and closes by asking the receiver to restate the task and flag anything ambiguous before
acting. Triage runs in two passes, recall before precision, because sorting for brevity first is what loses the detail
that turns out to matter.

Designed for late-session use when context is nearly full — reads only from the conversation window, gathers nothing
new, and targets 500-2000 token output.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-workflow
```

## License

MIT
