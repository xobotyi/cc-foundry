# the-workflow

Rules in CLAUDE.md that Claude follows, handoffs that carry decisions across a session boundary, and corrections that
become rules instead of being given again next session.

## The Problem

**Persistent context degrades.** CLAUDE.md files grow until Claude ignores half the instructions. Rules get buried in
noise, drift from reality, or sit at the wrong abstraction level. Some never reach the session at all — a nested file
that only loads when Claude reads something beside it, a path-scoped rule that never matched, an instruction dropped at
the last compaction. The file exists, but compliance drops, and the cause is rarely the one it looks like.

**Context transfer loses state.** When work crosses a context boundary — session restart, teammate delegation, async
resumption — the handoff is either a wall of text that overloads the receiver, or a paragraph that loses decisions,
constraints, and resource identifiers. The receiving agent wastes tokens re-deriving information that was already known.

**Corrections do not outlive the session.** The user corrects the agent, and the agent complies until the session ends.
The next session starts without the correction, and the user gives it again. The lesson sits in a transcript nobody
reads, until Claude Code deletes it.

## The Solution

the-workflow provides a skill for each of them:

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
(exploration paths, raw tool output). A failed attempt counts as a decision while its reason still constrains the work;
only the attempts that constrain nothing are dropped.

Two modes handle different receivers, selected by argument:

- **`/the-workflow:handoff`** — for session restarts. Task state and decisions; the receiver already knows the project.
- **`/the-workflow:handoff teammate`** — for delegation. Adds codebase orientation, skill pointers, and conventions.

The short form `/handoff` works too, unless another skill or command already uses the name.

Three of its sections exist because handoffs reliably omit them. Clinical handoff research built the I-PASS protocol
around the elements observers found missing from real shift changes — severity, contingency planning, and read-back by
the receiver — and the same three were missing here. So the document opens with a state grade (clean, watch, blocked)
that tells the receiver what to do first, carries a Contingencies section for the failure modes the sender can foresee
and the receiver cannot, and closes by asking the receiver to restate the task and flag anything ambiguous before
acting. Triage runs in two passes, recall before precision, because sorting for brevity first is what loses the detail
that turns out to matter.

Designed for late-session use when context is nearly full — reads only from the conversation window, gathers nothing
new, and targets 500-2000 token output.

### debrief

Turns the user's corrections into instructions the agent reads next time. `/the-workflow:debrief` reads the session
transcripts that Claude Code keeps under `~/.claude/projects/`, finds the places where the user corrected the agent, and
keeps the lessons that would change the agent's work on a different task. For each one it proposes a rule and the file
the rule belongs in: the project's CLAUDE.md or a document it links, a `.claude/rules/` file, the personal
`~/.claude/CLAUDE.md`, or the skill that prescribed the behavior. A lesson that forbids an action, or wants it confirmed
first, can also become a `deny` or `ask` permission rule, which Claude Code enforces instead of merely reading. When the
decision depends on a flag or a path, the lesson becomes a `PreToolUse` hook instead, and the skill runs that hook on
the tool calls the sessions recorded, so the proposal shows which past calls it would have stopped and that it lets the
rest through. Nothing is written until the user approves that item.

A bundled script does the extraction without a model. It marks the moments that carry the most evidence — a refused tool
call, an interrupt, a rewind, a message typed while the agent was still working — and attaches what the agent had just
said and done and which skills were loaded, so each correction is judged against the action it answered. It skips what
only looks like the user: compaction summaries, messages from teammate agents, history a resumed session copied from its
parent, and background sessions driven through the SDK.

More sources feed the same review. An error the agent hit and fixed on its own, then hit again in later sessions,
arrives with the failing call and the call that worked. Bash commands that ran and exited non-zero stay out, because
that is ordinary work, except for shell dialect errors such as a zsh glob that matched nothing or a GNU flag passed to
BSD `sed`: those mean the agent picked the wrong command again. The agent's own retractions count, and so do the places
where it reread its own transcript after a compaction to recover what the summary dropped. A run of steps the agent
repeated in six or more sessions arrives as a procedure, which debrief proposes as a skill to write and never writes
itself. And where auto memory is on, the notes Claude Code saved from earlier corrections are read too, so a note that
turns out to be a standing rule can move into the file where the whole team sees it.

The argument sets the scope:

- **`/the-workflow:debrief`** — this session.
- **`/the-workflow:debrief 14d`** — this repository over a window. A date works too, and `all` takes every transcript.
- **`/the-workflow:debrief 14d api web`** — the named repositories instead of this one.
- **`/the-workflow:debrief 7d everywhere`** — every repository with transcripts. A correction that recurs across
  repositories becomes a personal rule rather than a project one.

The short form `/debrief` works too, unless another skill or command already uses the name.

A wide scope can turn up hundreds of candidates. The agent then reads a one-line index of all of them first and opens in
full only the ones that can hold a lesson, so a run over every repository and the whole retained history still fits in
one session.

Before it proposes a rule, the skill reads the target file end to end, because the usual case is a rule that already
says the same thing in other words. Each correction also names the instruction files that were loaded when the user made
it. A rule that was in context and still failed is no reason to drop the lesson, so the skill proposes to sharpen that
rule, move it out of auto memory, enforce it with a hook, or replace it when the rule itself produced the corrected
behavior, and it reports pairs of loaded rules that contradict each other. It runs on a bare Claude Code install. When
the session has a memory server, a search server, or an issue tracker, it also checks each lesson against the decisions
recorded there. Claude Code deletes transcripts after `cleanupPeriodDays`, 30 days by default, so a run sees only what
is still on disk.

When the user corrected the first thing the agent did in a turn, the user can ask the skill to verify a proposed rule
before deciding on it. The skill replays that turn from a copy of the transcript three times with the rule written into
the instructions the session had loaded, and three times with a meaningless edit in its place, then shows what each run
did first. A replay changes nothing: a run may load a skill or a tool definition, every other tool call is stopped
before it runs, and no run is saved as a session. It costs six runs of up to eight turns each, on the session's model
with the session's full context, which is why it runs only on request.

## Installation

```
/plugin install the-workflow --marketplace xobotyi/cc-foundry
```

Installing the-workflow also installs `ai-helpers`, because the `claude-md` skill loads its `prompt-engineering` skill
first.

The `debrief` skill runs its scripts with the `node` on your `PATH`, which must be Node.js 26 or later: the scripts are
written in TypeScript, and Node strips the types itself, so nothing is built at install time. Verifying a rule by replay
also runs `claude` from your `PATH`. The other skills run no script.

## License

MIT
