# better-memory Plugin

A Claude Code mod that keeps auto memory to facts that still hold: the model writes and removes auto-memory entries only
through the mod's tools, which save an entry only when an anchor the session shows backs it, and sift, a separate
judging run, takes candidates, older entries, and entries whose anchors broke when an interactive session goes idle. The
`sift` skill runs the same pass by hand with the user, and works with the mod off. The design and what is deferred:
[design-docs/01-memory-maintenance.alignment.md](/design-docs/01-memory-maintenance.alignment.md).

## Skills

- **`sift`** — review and prune the auto-memory store with the user: judge every entry, consolidate instructions into
  CLAUDE.md lines the user approves, and work off `better-memory/review.md`. It writes through the mod's tools when they
  are present and edits the files directly when the mod is off.

## Mod

Run every command in this file from the repository root.

- **`hooks/register.ts`** — the mod, loaded through `modules` in `hooks/hooks.json`.
  `claude plugin validate plugins/better-memory` lists its hooks.
- **`tests/register.test.ts`** — the test-kit suite. Run `claude plugin test plugins/better-memory` after any change to
  the module.
- **`types/tools.d.ts`** — declares the inputs of the mod's three tools for the type checker.
- **`tsconfig.json`** — extends `.claude-plugin/types/tsconfig.json`, which Claude Code generates for its own version
  and gitignores. Start `claude --plugin-dir plugins/better-memory` interactively once to generate it, then type-check
  with `yarn dlx -p typescript tsc -p plugins/better-memory`.

## How It Works

- Two `userConfig` booleans, both on by default, arrive as `register`'s `options`. `enabled` off registers no hook at
  all, so Claude Code's own memory runs unchanged and only the skill remains. `sift` off keeps the tools and the gate,
  never starts sift, lists candidates in `MEMORY.md` because nothing would promote them, and drops the "unverified"
  note.

- The memory directory is the `autoMemoryDirectory` setting, else `<config dir>/projects/<key>/memory`. The key is the
  git root (the main worktree's for a worktree) with every non-alphanumeric character replaced by `-`. A key over 200
  characters is matched by prefix among the existing project directories, because Claude Code suffixes a hash that no
  plugin API exposes.
- The project directory is `<config dir>/projects/<key>`, where Claude Code keeps the project's transcripts as
  `<session id>.jsonl`.
- Plugin data sits beside the memory directory in `better-memory/`: `records.json` (each entry's state, origin anchor,
  evidence anchors, and reads, plus instruction proposals), `reports/`, and `errors.log` for headless failures.
  `parseRecords` migrates records that hold the older `evidence` and `premise` fields.
- Retention follows Claude Code's `cleanupPeriodDays` (30 days when unset): at session start the mod deletes reports
  older than it and drops instruction proposals answered before it. A report is the only copy of a deleted entry's text,
  so a wrong removal stays recoverable for as long as the transcripts that could show it is wrong.
- The mod registers its tools at session start, schemas in the tool list rather than behind ToolSearch, and answers
  `tool.check` with `allow` for all three, so none raises a permission prompt in any mode but plan mode.
  - `write_entry` takes a name, a type of `user`, `project`, or `reference`, a one-line description, the fact, and at
    least one anchor: a quote of the user's words, a file the session read with Read or Grep, a page it fetched with
    WebFetch, or a command it ran. The mod confirms each anchor against `$.session.messages()`, the subagent's own
    transcript included, and refuses the entry when none holds. Whether an anchor shows the fact is sift's judgment,
    never the write's. A saved entry is a candidate, with the anchors that held and its origin anchor: the session id,
    the round from `$.session.turns()`, the call's `tool_use_id`, and the `agentId` when a subagent wrote it. A command
    anchor keeps the call's input and the passages of its output that share the most words with the fact.
  - A type of `feedback` is refused with a pointer to CLAUDE.md.
  - `remove_entry` writes a report with the reason and the entry's text, then deletes the entry.
- The gate:
  - A Write or Edit of any file in the memory directory, `MEMORY.md` included, is refused with a pointer to the tools.
  - A Bash command that names the memory directory, or names the project directory beside a `memory` path segment as a
    `cd` into it does, and that the engine does not mark `isReadOnly` is refused by a `tool.check` hook, the one event
    that carries the engine's read-only verdict before a call runs. `better-memory/` is no `memory` segment, so the
    `sift` skill can delete `review.md` from the shell. Reads pass, and so does any command on another project's store:
    that project's next session reconciles its records and sift judges the changed files. The managed
    `cc-plugin-sec-default` announces the refusal as a skipped `tool.check` hook in the session, while the refusal
    stands (verified on 2.1.319).
  - A Read of an entry counts toward its reads; an entry that sift has not promoted gets an "unverified" note after the
    result.
  - A failure inside the gate refuses a memory write and passes any other call.
- The write rules are the `write_entry` description; Write and Edit carry a one-line pointer to the tools through
  `tool.describe`. Claude Code's own auto-memory section of the system prompt tells the model to write entries with
  Write, and a mod cannot change it: on a machine with managed settings, the built-in `cc-plugin-sec-default` passes
  `prompt.section`, `prompt.context`, `prompt.compose`, and `prompt.attachment` past every mod, and the engine announces
  each skipped hook in the session (verified on 2.1.319).
- Sift is a child `claude -p` process the mod starts with `$.process.spawn`: no setting sources, no MCP servers, auto
  memory off, Read, Grep, and Glob as its only tools under `bypassPermissions`, Opus at medium effort, a $5 budget, and
  `SIFT_PROMPT` as its whole system prompt. It is not an agent of the session because Claude Code runs a mod's agent
  under the mod's origin: the mod's own hooks never see its calls, and its completion notice starts a main-loop turn the
  model answers to the user (verified on 2.1.319). The child's stream-json output gives the answer and every path it
  read.
  - Due entries: no record, a candidate, a promoted entry changed since its sift, a promoted entry with no anchor, or a
    promoted entry whose file or source anchor no longer exists or changed after its sift.
  - Only an interactive session starts sift, 30 seconds after a main-loop turn ends; the next turn cancels the wait. A
    headless run never does: a mod's child process ends when its module unloads, and a headless run unloads with its
    turn.
  - A run takes up to 12 entries, and a session chains up to 6 runs. A lock in `$.store`, keyed by the memory directory
    and stale after 20 minutes, keeps two sessions from sifting one store at once.
  - The task message carries the CLAUDE.md and rules files in force, the kept entries, one block of user prompts per
    writing session, the pages the entries link, and the entries, each with the anchors recorded with it. Sift answers
    one JSON verdict per entry: promote, propose-instruction, or remove.
  - The writing session is the record's origin, else the `originSessionId` Claude Code stamps in an entry's frontmatter.
    The mod streams that session's transcript through `cat`, because `$.fs.read` refuses a file over 4 MiB, and keeps
    the last 40 user prompts before the entry's write, each cut to 4,000 characters. A session whose transcript Claude
    Code has deleted gives none.
  - A user prompt, here and in the quote check at a write, is only what the user typed. Claude Code stores compaction
    summaries, messages from other Claude sessions, task notifications, and reminders as user messages too, and
    `$.session.messages()` flags none of them, so `NOT_TYPED` matches their opening text; the transcript also marks a
    summary with `isCompactSummary`. Model-written text that passed as the user's words would back any instruction.
  - The mod fetches the pages itself with `$.http.fetch`, at most 6 a run, a GitHub file page from its raw content, and
    hands sift the passages that share the most words with the entry. Sift has no network, so an entry's text cannot
    make it send data out.
- The mod confirms each anchor a promotion cites and drops the rest; a promotion with no anchor left becomes a removal.
  A recorded quote or command anchor holds as recorded. A cited quote must appear in the prompts of the entry's session.
  A file, cited or recorded, must be one sift opened with Read, searched with Grep, or saw lines of in Grep's output in
  its run, and a URL, cited or recorded, one of the run's pages. A file or source anchor must exist.
- An instruction proposal needs the user's words: a quote anchor, recorded or cited, that holds. One without becomes a
  removal, and the report lists its instruction under "Instructions without the user's words", so the user answers no
  question for an instruction nothing shows they gave. When the entry is legacy (no record, or `unsifted`: written
  before the plugin or while it was off), the mod first appends the instruction and the entry's text to
  `better-memory/review.md`, which never expires and which `MEMORY.md` points the agent to once per session until the
  `sift` skill works it off. A legacy store's first run would otherwise drop rules the user relies on whose transcripts
  are already gone.
- The mod applies every verdict and writes a report of the run to `reports/`, with the full text of each entry. A
  promotion is recorded. A removal deletes the entry. An instruction proposal deletes the entry and records the
  instruction, with its quotes, for the project or the user CLAUDE.md. An entry that changed while sift ran is skipped.
  The first write of `MEMORY.md` saves the existing one to `reports/`.
- `MEMORY.md` lists promoted entries and entries no sift has judged yet; candidates stay out until promoted. Up to five
  open instruction proposals follow, with a count of the rest, and at session start the mod registers
  `mcp__better-memory__answer_instruction_proposal` when one is open.

- A plugin reload (`/reload-plugins`, an update, or an edit of a `--plugin-dir` module) runs `register` again in the
  live session, and `session.start` does not fire again. The mod restores the session at the next `turn.start`, taking
  interactivity from `$.session.surfaces()`, which is empty in a `-p` run. A sift running at the reload dies with the
  old module; the session's own lock does not block it, so the next idle wait starts a fresh run.

## Known Limits

- Sift needs the `claude` command on the session's `PATH`; without it every run fails and logs the failure.
- Within a session the mod changes each of its files, and each entry, one change at a time, because hooks interleave at
  every await: a file is rewritten whole, and a verdict must not delete an entry written after sift checked it. Across
  sessions `records.json` and the lock are last-writer-wins: two sessions on one project that write in the same moment
  can lose one record update, and the mods API offers no lock that spans them.
- The shell gate matches text. A command that reaches the memory directory through a variable or a script passes it.
- An entry written before the plugin has no recorded anchors, so it stays only when its session transcript, a file sift
  reads, or a page the entry links backs it.
- An anchor in a transcript part that compaction replaced no longer holds at a write, because `$.session.messages()`
  returns the compacted transcript.

## Plugin Scope

- The-workflow's `debrief` skill owns routing session lessons into instruction files; better-memory owns the auto-memory
  store and the instruction proposals sift files from it.
- Other memory systems are out of scope: the plugin never writes to one and never applies its rules to one.
- Machine memory (facts that hold across projects) and decay by usefulness are deferred; sift marks a machine-wide fact
  with `scope: machine` and keeps it in project memory.

## Conventions

- `SIFT_PROMPT` in `register.ts` and `skills/sift/SKILL.md` state the same verdicts for one store; change them together.

- Hook engine events, never `classic.*` or `prompt.*`: a managed-tier plugin first in a chain can pass them past every
  mod.
- Write each mods API call in full as `$.namespace.method(...)`, and pass `$` only to top-level functions in
  `register.ts`. `claude plugin validate` reads the calls off the source.
- Never call `$.ui.log` in a headless session: a log line after the result breaks `claude -p --output-format json`.
  Headless failures go to `errors.log`.
- The plugin never edits an entry's content. It writes entries through `write_entry`, deletes an entry only after a
  report holds its text, writes `MEMORY.md`, and writes its own data directory.
