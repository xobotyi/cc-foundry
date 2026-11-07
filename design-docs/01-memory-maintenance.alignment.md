# Alignment: Auto-memory maintenance (`better-memory`)

- **Date:** 2026-11-06
- **Brief:** [01-memory-maintenance.brief.md](/design-docs/01-memory-maintenance.brief.md)
- **Research:** [01-memory-maintenance.research.md](/design-docs/01-memory-maintenance.research.md)
- **Glossary:** none; Resolved Questions fixes the terms

## Patterns Adopted

- **Dedicated plugin** — `plugins/better-memory`, separate from the-workflow. The `debrief` skill keeps routing
  corrections to instruction files; better-memory owns the auto-memory store.
- **Mod layout of plugin-rollcall** — `hooks/hooks.json` lists `modules`, the module exports `register(on, options)`,
  settings are `userConfig`, `claude plugin test` and `claude plugin validate` check it. Found in plugin-rollcall, the
  one mod in the repository.
- **Engine events only, never `classic.*`** — a managed plugin on this machine passes `classic.*` and `session.compact`
  past every mod (plugin-rollcall `CLAUDE.md`).
- **Plugin data in a plugin-owned file, not in frontmatter** — the model never reads or edits it. The mod's write tool
  writes each entry's frontmatter.
- **The gate fails closed** — a deviation from the fail-open hooks of wall-clock and plugin-rollcall: a write the gate
  cannot judge is a write that can poison the store.
- **No silent CLAUDE.md edit** — every promotion into an instruction file is an instruction proposal the user answers.
- **Bare install** — the plugin needs no other system. It never writes to another memory system; reading one as evidence
  is not in v1.
- **Skill authoring ADRs** (1.1, 1.2, 1.3, 1.4, 1.6, 1.9) apply to the sift skill.

## Current State

- Auto memory lives in `~/.claude/projects/<key>/memory/`. `MEMORY.md` loads after the CLAUDE.md files under the same
  header ("OVERRIDE any default behavior and you MUST follow them exactly as written"); topic files load on demand.
- The agent writes memory on its own judgment through Write and Edit, which stamp `metadata.originSessionId`; Bash
  writes are neither stamped nor hooked. Background extraction and auto-dream are server-gated and off on this machine.
- No machine-level memory exists; `~/.claude/CLAUDE.md` is the only cross-project layer.
- Transcripts are deleted after 30 days (`cleanupPeriodDays`); memory never is.
- Measured on this machine: 0 of 27 sampled memory creates were user-requested; 87 of 166 origin transcripts are gone;
  32 entries overlap their project's CLAUDE.md. Four sources govern memory writes and disagree: the built-in prompt, the
  global memory-discipline block, the index preambles, and practice. A one-session "work in main" request became a
  standing rule and changed behavior for several sessions.

## Desired End State

**Placement.** Memory holds facts; CLAUDE.md holds instructions. Instructions take precedence over facts; within each
kind the project level takes precedence over the machine level.

|                              | Facts (memory, written by agents) | Instructions (CLAUDE.md, approved by the user) |
| ---------------------------- | --------------------------------- | ---------------------------------------------- |
| This project                 | project memory                    | project CLAUDE.md                              |
| All projects on this machine | machine memory                    | user CLAUDE.md                                 |

**Lifecycle.**

1. Every memory write becomes a candidate. The plugin file records it; the index does not list it.
2. When the session goes idle and there is work, the mod starts sift as a separate agent — never a fork of the writing
   session — with the anchors recorded at each write. Sift removes each candidate or promotes it.
3. Promotion is one term; its target names the edge. Into project memory or machine memory, sift decides alone. Into a
   CLAUDE.md, sift records an instruction proposal; the next session's agent raises it with the user, and a declined one
   stays recorded.
4. Evidence decides, not age. A candidate whose evidence is gone may be removed: losing a true entry costs rediscovery,
   keeping a false one costs wrong behavior.
5. An explicit standing rule from the user is an instruction: the agent offers the CLAUDE.md edit at once.

**Components (v1).**

- **Mod** — owns the memory directory: entries are written and removed only through its tools, `write_entry` and
  `remove_entry`, which carry the write rules in their descriptions and which the mod allows without a permission
  prompt; refuses Write, Edit, and shell commands that change the directory (a managed plugin passes every `prompt.*`
  event past mods on this machine, so the built-in memory prompt that names Write stays); refuses entries of the
  guidance type; records candidates; fails closed; owns `MEMORY.md`; logs reads of memory files; lists open instruction
  proposals in `MEMORY.md`; triggers sift at idle when there is work.
- **Plugin file** — `~/.claude/projects/<key>/better-memory/`: entry records (state, scope, origin anchor, evidence
  anchors, reads), instruction proposals, and sift reports, which hold the text of every deleted entry.
- **Anchors** — the origin anchor records where an entry was written: the session, the round, and the Write call's
  `tool_use_id`. An evidence anchor records what shows a fact: a quote of the user, a project file, a source file
  outside the project, a URI, or a command and the output the session read. The writer cites anchors in `write_entry`;
  the mod confirms each is in the session's transcript, records the ones that are, and refuses an entry with none;
  whether an anchor shows the fact is sift's judgment. Sift cites a recorded anchor, a file from its own Read and Grep
  calls in the run, or a page the mod fetched; a recorded file or page holds only when sift reads it again. The mod
  drops what matches nothing. Sift has no network and never runs a command; a command anchor keeps its recorded output.
- **Sift** — a child `claude -p` process the mod starts in an interactive session, with Read, Grep, and Glob only. The
  mod writes a report of each run with every entry's text, then applies the verdicts; a removal deletes the entry.
- **The `sift` skill** — the same pass by hand, with the user answering one plan: consolidated CLAUDE.md lines,
  removals, and facts about the user to confirm. It works off the review file and runs with the mod off.
- **Settings** — `enabled` turns the whole mod off and leaves only the skill; `sift` turns off the idle pass and keeps
  the tools.

**Phasing.** Learning test of the mod surfaces on the installed release → tracer bullet (prompt, gate, candidate
records, idle sift dry run) → dry run over this machine's stores, analyzed change by change (the pass condition) → apply
→ custom tools → sift skill and the review of pre-plugin rules → machine memory.

## Resolved Questions

- "Durable" → the entry stays true after the session that wrote it ends; a value on the longevity lens, independent of
  subject.
- Lenses → independent dimensions; longevity and subject are named. Placement follows from subject.
- Scope of an instruction unclear and it contradicts default behavior → the agent asks before saving.
- User attention → none in normal operation; proposals and escalations reach the user through the next session, never
  blocking.
- Doubt → removal is the safer error.
- Name of the maintenance pass → **sift** (REM and distill rejected; dream is the built-in pass).
- Promotion → one concept; the target names the edge.
- The unjudged entry → **candidate**; "temporal part" retired, because the state lives in the plugin file, not a place.
- User-level memory → **machine memory** (stage 2): system state and user preferences that hold across projects.
- Candidate lifetime → bounded by evidence, not by a number. A leftover of a closed or headless session is judged in a
  later interactive session with the anchors recorded at its write.
- Entries written before the plugin → unsifted; sift may remove them unless the user's words in the transcript of the
  session that wrote them, a file it reads, or a URL the entry names backs them.
- Backing for an instruction proposal → the user's own words giving the rule as standing, from a quote anchor or the
  writing session's transcript; an instruction without them is removed and listed in the run's report, never put to the
  user as a question.
- When sift runs → at idle, only when there is work: entries changed since the last sift, a promoted entry with no
  anchor, or a file or source anchor whose path is gone or changed after its sift.
- Backing for a promotion → an anchor the mod confirms; a premise sift states without a check in the run backs nothing.
- Anchors from the writing agent → the writer cites them, and the mod confirms each against the session's transcript, so
  the writer cannot invent one; an entry with no anchor in the session is refused at the write, the earliest removal.
- Memory writes → only through the mod's tools; Write, Edit, and shell writes are refused on the session's own memory
  directory. Reads stay open, the shell's included, so analysis works; another project's store stays open too, and its
  own sessions reconcile it.
- The judge → a separate process, never the writer: an agent of the session would run under the mod's origin, invisible
  to the mod's hooks, and its completion notice would start a turn the model answers to the user.
- Headless runs → never sift; a mod's child process ends with the run.
- Other memory systems → never written to, never governed by this plugin's rules.
- Plugin data → a plugin-owned file in v1; read tracking starts in v1 for the later decay work.
- An explicit standing rule → the agent offers the CLAUDE.md edit at once.
- A setting that switches sift to report only → none; its reports keep the text of every removal. Sift can be switched
  off, and the mod with it, for a user who wants only the skill.
- The first run on a full store → evidence cannot decide a rule written before the plugin once its transcript is gone,
  and asking about each one costs too much attention. Such a rule leaves memory into `better-memory/review.md`, which
  never expires, and the `sift` skill reviews the whole file with the user once, merging rules that say the same thing.
- Retention of reports and answered instruction proposals → the mod deletes them once Claude Code's `cleanupPeriodDays`
  has passed, the life of the transcripts that could show a removal was wrong; no archive, because nothing reads one.
- What sift files for a CLAUDE.md → an **instruction proposal**, never "proposal" alone, so no reader takes it for a
  memory entry.
- Instruction proposals per session → up to five, listed to the user together in one message; the rest wait.

## Not Yet Specified

- Decay and eviction by usefulness — reads are the likely signal; a read shows the agent looked, not that it helped.
- Machine memory — location, loading, and conflicts with project memory.
- Reading other memory systems as evidence — reopens if sift reports many entries it cannot check.
- The git-excluded `.claude/CLAUDE.md` — its role once project memory holds.
- Conflict policy beyond "merge only agreeing entries" — rewrite on contradiction, or remove.
- Lenses beyond longevity and subject — "worth keeping" is a candidate third.
- A read tool — reopens with machine memory, a store Claude Code does not load.
