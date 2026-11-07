# Research: Auto-memory maintenance

- **Date:** 2026-11-06
- **Teammates:** 7, plus one deep-research run and one page-verification agent
- **Scopes investigated:** built-in auto memory (runtime and docs); hooks-module ("mods") API; memory stores on this
  machine; session transcripts; debrief research output; Claude Code memory ecosystem; external agent-memory systems and
  research
- **Privacy:** this repository is public. Memory stores other than cc-foundry carry labels S1–S17 (ordered by entry
  count). Work-project content is paraphrased, not quoted. Runtime facts come from read-only inspection of the installed
  Claude Code 2.1.319 executable and are described, not reproduced.

Store labels: S1 (work, 106 entries), S2 (personal infrastructure, 17), S3 (work, 14), cc-foundry (11), S5 (work, 7), S6
(personal writing vault, 7), S7 (work, 5), S8 (work, 5), S9 (work, 4), S10 (work, 3), S11–S15 (1–2 each), S16–S17 (index
only).

## 1. Built-in auto memory (Claude Code 2.1.319)

### Sources

- Installed executable `~/.local/share/claude/versions/2.1.319` (embedded JavaScript, inspected read-only)
- https://code.claude.com/docs/en/memory.md, `settings-reference.md`, `errors.md`, `sub-agents.md`,
  `claude-directory.md`
- `CHANGELOG.md` of github.com/anthropics/claude-code (latest 2.1.319)
- `~/.claude.json` (cached server flags), `~/.claude/settings.json`

### Findings

**Storage and path.** The directory is `~/.claude/projects/<key>/memory/`. The key is the git root (else the
working-copy or project root) with every non-alphanumeric character replaced by `-`; a key over 200 characters is cut
and given a hash suffix. Git worktrees share one directory (docs; changelog 2.1.63). Overrides: `autoMemoryDirectory`
(read from policy, flag, and user settings; project and local settings only under an internal gate),
`CLAUDE_COWORK_MEMORY_PATH_OVERRIDE`, `CLAUDE_CODE_REMOTE_MEMORY_DIR`, `CLAUDE_CONFIG_DIR`. The runtime creates the
directory when it builds the system prompt: this machine has 120 memory directories, 17 of which hold files.

**Enable and disable.** `autoMemoryEnabled` defaults to true. `CLAUDE_CODE_DISABLE_AUTO_MEMORY` set truthy turns memory
off; set explicitly falsy (`0`, `false`) it forces memory on over the setting. `--bare` / `CLAUDE_CODE_SIMPLE`, safe
mode, and a server kill-switch also turn it off. With memory off, the runtime omits the memory system-prompt section.
Issue #63903 (closed 2026-05-30) reported that an earlier version kept an 11–16k-token preamble with memory disabled.
Agent memory turns off with auto memory.

**System-prompt section.** The section is composed under the name `memory`. Seven variants exist, selected by
environment variables, configured memory stores, a per-model "lean" capability, and server flags. This session runs the
lean variant; its text matches the session's system prompt byte for byte. The lean variant:

- defines `feedback` as "guidance the user has given on how you should work, both corrections and confirmed approaches;
  include the why" and `project` as "ongoing work, goals, or constraints not derivable from the code or git history";
- states the scope test as "Don't save what the repo already records (code structure, past fixes, git history,
  CLAUDE.md) or what only matters to this conversation";
- states "Recalled memories ... reflect what was true when written. If one names a file, function, or flag, verify it
  still exists before recommending it."

The classic (non-lean) variant adds "If the user explicitly asks you to remember something, save it immediately" and a
"What NOT to save" list that includes "Ephemeral task details: in-progress work, temporary state, current conversation
context", applied "even when the user explicitly asks you to save". `CLAUDE_COWORK_MEMORY_GUIDELINES` replaces the
section body; `CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES` appends to it.

**Loading.**

- `MEMORY.md` loads through the instruction-file loader, last in order. It is labeled "(user's auto-memory, persists
  across conversations)" inside the block headed "Codebase and user instructions are shown below. ... IMPORTANT: These
  instructions OVERRIDE any default behavior and you MUST follow them exactly as written."
- Limits: 200 lines and 25,000 characters, hard-coded. Past either, the content is cut and a warning naming the cut is
  appended. A write that leaves the index at 80% of a limit returns a request to compact it to 70%; a write over the
  limit succeeds and returns an error.
- When `MEMORY.md` is missing and topic files exist, the runtime writes an index from the files' descriptions.
- Topic files never load at session start; the model reads them on demand. A recall selector (a Sonnet side query, up to
  5 files per turn) runs only in index-less or hosted account modes. A Read of a memory file returns an age note ("This
  memory is N days old").
- `CLAUDE_COWORK_MEMORY_INDEX_CONTENT` replaces the `MEMORY.md` content. The classic `InstructionsLoaded` hook never
  fires for `MEMORY.md`.

**Writing.** Local memory has no dedicated tool; the agent uses Write and Edit. For a memory write the order is:
PreToolUse hooks, then deny and ask rules, then an auto-allow for `.md` files under the memory directory (no permission
prompt; paths through `skills/`, `agents/`, `.git/` and similar segments are excluded), then the tool: an optional
content lint (server-gated, off by default), a secret scan (team and synced memory only), frontmatter stamping, the
write. A PreToolUse deny blocks a memory write like any other write.

**Provenance stamping.** On each Write or Edit of a `.md` file with frontmatter under the memory directory:

- `metadata.originSessionId` is set to the current session only when absent;
- `metadata.modified` is refreshed with an ISO timestamp;
- the first full rewrite adds `metadata.node_type: memory`, re-serializes the frontmatter, and moves top-level keys
  under `metadata`.

Hooks see the content before stamping. Writes made through Bash are not stamped and do not pass Write or Edit hooks. The
runtime also holds a richer provenance record used only by hosted account memory: it records whether an item was typed
by the user or inferred, a consent state, and person or repository scope.

**Background processing.** Two background writers exist. Both are forks of the main conversation on the main model, run
only from the main thread, and skip their pass when any deny or ask rule covers memory writes. A PreToolUse "ask" turns
into a deny inside them.

- Post-turn extraction reads the recent messages after each turn and writes memory files (at most 5 turns per run).
  Server-gated; the cached flags on this machine read `false`.
- Auto-dream consolidation runs when at least 24 hours passed since the last run and enough newer sessions exist (cached
  payload: `minSessions: 3`), under `<memdir>/.consolidate-lock` (stale after 1 hour). Its prompt walks four phases:
  orient, gather recent signal (including grep over transcripts), consolidate, prune and index. It reconciles memory
  against CLAUDE.md: "CLAUDE.md is the maintained, checked-in source. Delete the memory, or rewrite it to agree"; it
  never edits CLAUDE.md and annotates a memory "contradicts CLAUDE.md — verify which is current". The `autoDreamEnabled`
  setting takes effect only when the server flag marks the feature available. On this machine the cached flag reads
  `enabled: false` with no availability, so the setting has no effect.
- Neither feature appears in the docs or the changelog. Issues #38461, #39135, and #50694 discuss `/dream` and a stale
  `.consolidate-lock` that disables it.

**Other stores.**

- Agent memory: `memory: user | project | local` on an agent definition gives the agent its own directory
  (`~/.claude/agent-memory/<type>/`, `.claude/agent-memory/<type>/`, `.claude/agent-memory-local/<type>/`) with its own
  `MEMORY.md` under the same limits. It is not stamped and gets no background processing.
- Team, synced user, account, and organization stores need a host-set `CLAUDE_MEMORY_STORES` or server flags plus a
  claude.ai login. The built-in tools `memory_list`, `memory_read`, `memory_write` (versioned, compare-and-swap through
  `if_version`) serve those stores.
- A stock install has no cross-project user-level auto memory. The cross-project instruction layer is
  `~/.claude/CLAUDE.md` and `~/.claude/rules/`.

**Instruction-file loading.** Order: Managed, User (`~/.claude/CLAUDE.md`, `~/.claude/rules/`), then for each directory
from the filesystem root to the working directory `CLAUDE.md`, `.claude/CLAUDE.md`, unconditional `.claude/rules/`,
`CLAUDE.local.md`; then SDK files, `--add-dir` directories, `MEMORY.md`.

- `.claude/CLAUDE.md` loads as a Project file labeled "(project instructions, checked into the codebase)" whether or not
  git tracks it. `CLAUDE.local.md` is labeled "(user's private project instructions, not checked in)".
- A `.claude/rules/` file with `paths:` frontmatter loads only when a matching file is touched.
- AGENTS.md is not loaded. `claudeMdExcludes` applies to User, Project, and Local files.

**Transcript retention.** `cleanupPeriodDays` defaults to 30. A sweep runs at most once per 24 hours and deletes
transcripts and per-session artifacts by modification time. It never touches memory topic files or `MEMORY.md`. This
machine sets no value. During the investigation one transcript disappeared between 19:38 and 19:43; the oldest remaining
transcript files are dated 2026-10-08.

### Patterns

- Every memory path into a session passes a surface a plugin can reach: the system-prompt section, the instruction-file
  list, attachments, and the Write and Edit tool calls.
- Writes that bypass every hook: the runtime's own index backfill and lock file, and memory edits made through Bash.

### Integration points

- Memory writes are ordinary tool calls: classic PreToolUse hooks and mods `tool.call` see them.
- `MEMORY.md` is an instruction file of kind `memory`: mods `prompt.context` sees it.
- The memory prompt is the section `memory`: mods `prompt.section` sees it.

### Open gaps

- Whether PostToolUse fires inside the background forks (likely; not traced).
- The producer of `~/.claude/projects/*/tiny_memory/`.

## 2. Hooks-module ("mods") API

### Files Investigated

- `plugins/plugin-rollcall/.claude-plugin/types/claude-code/index.d.ts` — engine types; line 1 reads "Written by Claude
  Code 2.1.310", lines 4–8 "EARLY ACCESS: this surface may change between releases without notice"
- `plugins/plugin-rollcall/.claude-plugin/types/claude-code-tools/index.d.ts` — per-tool inputs and results (73 tools)
- `plugins/plugin-rollcall/hooks/register.ts`, `plugins/plugin-rollcall/tests/register.test.ts` — the one mod in the
  repository
- https://code.claude.com/docs/en/plugins/mods/ (overview, create, reference, interface, events, api, test,
  troubleshoot, admin) — official documentation

### Findings

**Registration.** `hooks/hooks.json` lists `"modules": ["./register.ts"]`; the module exports `register(on, options)`
(`options` holds `userConfig` values). `on(pattern, [matcher,] ($, e, next) => …)` returns a registration with
`.catch(handler)`. A hook that throws, exceeds its 10-second budget, or returns a wrong shape is skipped and the event
proceeds (index.d.ts:4063-4068, 5268-5294). Time spent waiting on a `$` call does not count against the budget
(index.d.ts:5258-5266).

**Events.** 47 engine events, 33 `classic.<Name>` events (the settings-hook events), and 64 op events, one per `$` call
(index.d.ts:4070-4619, 5328, 7019-7378).

**Tool calls.** `tool.call` wraps a tool's whole execution (index.d.ts:4071-4082, 13566-13655):

- before `next(e)`: rewrite the input (`tool`, `tool_use_id`, `agentId` are reserved), return `{deny}` (the model reads
  the text as an error result), or return `{result}` without running the tool;
- after `next(e)`: replace the output, withhold it, or add `context` strings that the model reads and the user does not
  see (index.d.ts:13592-13600).

`tool.check` returns allow, ask, or deny. `tool.describe` rewrites a tool's description and deferral. `$.tool.register`
adds a tool named `mcp__<plugin>__<name>`, served by a `tool.call` hook (index.d.ts:3122-3137). No API renames an
existing tool or changes its input schema.

**Prompt text.**

- `prompt.section` fires per named system-prompt section with `{name, text}`; returning `{text: null}` drops the
  section. The types carry the example `on("prompt.section", {name: "memory"}, () => ({text: null}))` (index.d.ts:4297).
- `prompt.compose` appends, replaces, reorders, or drops sections (index.d.ts:4312-4320).
- `prompt.context` receives `{blocks, instructionFiles}`; each instruction file has `kind` managed, user, project,
  local, or memory, and a hook can add, drop, or rewrite them (index.d.ts:4300-4311, 5688-5725).
- `prompt.attachment` rewrites or drops injected attachments, including `nested_memory` and `instructions`
  (index.d.ts:4321-4332, 15498-15540).
- `prompt.submit` adds hidden per-prompt context; `$.session.append` appends conversation rows.

**Model and agents.**

- `$.model.complete` — one completion with no tools or history (`maxTokens` default 1024, up to 64k).
- `$.model.fork({prompt})` — "one tool-less completion over the main thread's last request": its model, system prompt,
  tools, and messages, with `prompt` appended (index.d.ts:2644-2710).
- `$.model.classify(text, labels)` — returns a label.
- These three return their result directly. `$.agent.spawn` starts a background subagent and returns once it starts; its
  answer arrives through `turn.complete`. `$.agent.register` defines an agent type, including a `memory` field.
  `$.command.run` is queued until the session is idle and rejects inside a hook the turn waits on.

**Other surfaces.** `$.ui.notify`, `$.ui.toast`, `$.ui.log` (a transcript line not sent to the model); `$.store` (JSON
persisted across sessions, shared by every session on the machine, 4 MiB); `$.state` (session-scoped); `$.fs` read,
write, list, stat (4 MiB per file); `$.clock.after` and `$.clock.every`; `$.process.run` (30 s default, 10 min maximum);
`$.http.fetch`; `$.settings.read`; `$.session.messages` (newest 4,096 entries); `$.session.id`.

**Memory in the API.** No event or `$` namespace is memory-specific. Memory appears as the instruction-file kind
`memory`, the section `memory`, the attachment `nested_memory`, `ContextMemoryFile` in the usage breakdown,
`AgentSpec.memory`, and the tools `memory_list`, `memory_read`, `memory_write`. The mods docs mention memory only
through the built-in `cc-plugin-agents-md` mod, which loads AGENTS.md.

**The existing mod.** register.ts hooks `session.start`, `session.end`, `session.compact`, and `tool.call`, and defers
`$.command.run` with `$.clock.after(0, …)`. Its 28 tests run under `claude plugin test` with `mock.env`, `mock.clock`,
and stubs beneath the plugin. `claude plugin validate` reads `$` calls statically, so each call is written in full
(plugin-rollcall `CLAUDE.md:78-80`).

**Ordering against other plugins.** A managed-tier plugin can pass events past every mod. plugin-rollcall `CLAUDE.md`
records `classic.*` and `session.compact` passed on one machine (verified on 2.1.316). This session's notifications show
the same for other mods' `classic.UserPromptSubmit` and `session.compact` hooks.

### Patterns

- Every `$` call is also an event other plugins can hook.
- Declarations follow register-then-serve: a tool is served by `tool.call`, a command by `command.run`.

### Integration points

- The mods surfaces in section 1's integration points: `tool.call` for writes, `prompt.context` for `MEMORY.md`,
  `prompt.section` for the memory prompt, `prompt.attachment` for recalled memories.

### Open gaps

- Runtime behavior on 2.1.319 of `prompt.section` for `memory`, `prompt.context` for memory files, and `tool.call` on
  memory writes is unverified: the types are from 2.1.310 and marked early access.
- What a turn sees after the first message when `prompt.context` changes mid-conversation is stated only loosely.

## 3. Memory stores on this machine

### Files Investigated

- `~/.claude/projects/*/memory/` — 185 entry files and 17 `MEMORY.md` indexes, each read in full
- Project roots of each store — `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/`, and files named by entries

### Findings

**Counts.** 17 directories hold files: 15 with entries, 2 with an index only. S1 holds 106 of 185 entries (57%); three
stores hold 137. `.consolidate-lock` exists in 4 directories (S1, cc-foundry, S3, S6).

**Frontmatter.** All 185 entries carry `name`, `description`, `type`. 178 nest `type` under `metadata`.
`originSessionId` is on 166, `modified` on 153, `node_type: memory` on 159. Seven frontmatter shapes occur; 148 files
share the dominant one. `name` formats mix kebab-case (124), snake_case (55), and Title Case (6); `name` often differs
from the filename.

**Types and dates.** 125 `feedback`, 54 `reference`, 6 `user`, 0 `project`. `modified` runs from 2026-07-31 to
2026-11-05; 130 of 153 dated files fall in October–November. Batch rewrites show as timestamp clusters (39 S1 files
within four minutes on 2026-11-05; 25 S1 files in three bursts on 2026-10-08). Bodies cite events from as early as
2026-03-26, before their `modified` dates.

**Indexes.** Every index line resolves to an existing file, and every entry is indexed exactly once. 12 indexes carry
the preamble "**Memory = durable facts true across projects**: behavioral rules ("always X" / "never Y"), user facts,
and external-world contracts. Project factology belongs in the project itself ... Never index either here."; S1 carries
a variant. Three entries sit under an index section that does not match their content.

**Same-subject groups** (all stores, read in full). 18 groups: 11 agree, 7 differ.

- One contradiction inside one store: S1's commit-cadence entry versus another S1 entry that summarizes the superseded
  ruling.
- Six differences span stores, most scoped to a repository or task type: whether opening a PR needs confirmation
  (cc-foundry: no; S13: ask), exceptions to the pre-push local review, test-file section separators, how to restore
  removed behavior, delegating code reading, and verification depth for configuration changes.
- Groups that agree across stores include: propose instead of asking, mutation-proving a test, measure before stating a
  cause, preserve the Change-Id trailer, never print secrets.
- No `[[...]]` link crosses stores.

**Time scope.** No entry has one session, task, branch, or ticket as its whole subject. 6 entries describe the state of
ongoing work; 12 more are rules carrying ongoing-state or open-question clauses; 167 have no time scope, about half of
them anchoring their evidence to a dated incident. Several entries record that they generalize one ruling, in their own
words: "My interpretation, not the user's words" (and variants) occurs in S5, S6, and S1.

**Entries against the project's own instruction files.** 32 entries share a subject with their own project's instruction
files: 26 agree (they restate the file), 4 differ (6 points, all in S1), 2 partly agree. 5 further entries conflict with
a different project's instruction files; one example is S1's "make every change in a worktree" against S10's "commit on
master itself".

**Named items exist today.** Of 50 checked entries (all 11 of cc-foundry), 43 name items that exist as stated. The clear
mismatches: an S1 entry lists a settings key the repository's settings lack, and cc-foundry `feedback_prompt_hooks.md`
describes a hook type no shipped plugin uses (every `plugins/*/hooks/hooks.json` entry is `"type": "command"`).

**Duplication across stores.** No entry file is copied whole. Five facts are restated in two stores each, without links.

**Subject kinds.** 115 agent rules (82 working-process, 33 artifact conventions), 58 external tool or service behavior,
6 user facts, 2 project code or architecture facts, 2 resource pointers, 2 machine-environment facts, 0 work status. 15
entries carry a `type` that does not match this reading.

### Patterns

- `feedback` dominates (68%). No store uses `project`.
- Disagreement concentrates in S1, the largest store.

### Integration points

- Entries cite `~/.claude/CLAUDE.md` blocks and skills; 20+ entries restate rules a repository already states.

### Open gaps

- Subject grouping and kind assignment are one reader's judgment; boundary moves change counts by 1–2.
- File modification times were not readable with the teammate's tools.

## 4. Session transcripts: memory writes and use

### Files Investigated

- `~/.claude/projects/*/*.jsonl` and `*/subagents/*.jsonl` — 2,823 files, 2.3 GB, searched with Grep
- Examples (cc-foundry): `b58e62bf-…jsonl:16490-16600`, `55dae9dd-…jsonl:1454-1482`, `1a0c9b6f-…jsonl:34, 1020-1052`

### Findings

**Record shapes.** A memory write appears as a Write or Edit tool call. Write leaves a `file-history-delta` record, the
`tool_use`, and a result with `toolUseResult.memdirStamped: true`. Bash writes (`perl -pi`, `mv`, scripts) leave
neither. Session start records an `instructions` attachment with `MEMORY.md` as type `AutoMem`. `api-request-blob`
records repeat each call, so a plain grep counts every write twice. User messages sent mid-turn arrive inside tool
results ("The user sent a new message while you were working"), not as prompt records.

**Provenance coverage.** Of 166 entries with `originSessionId` (104 distinct sessions): 79 have a transcript containing
the write, 0 have a transcript without it, 87 point to a transcript that no longer exists. `originSessionId` names the
first session that stamped the file, which can be a later editor; a file moved away and written again gets a new value;
an agent can carry an old value forward in its own Write content.

**Write triggers.** For 27 Write-tool creates in 15 sessions across 8 projects, the user messages in the five turns
before each write:

- (A) the user asked to save: **0**
- (B) the user corrected or instructed without asking to save: **13**
- (C) no user message related to the content: **14**

A corpus-wide search for requests to remember finds none aimed at memory. 10 of 11 sampled `feedback_*` files are B; all
10 sampled `reference_*` files are C. In one B case the agent states the trigger: "I'm saving the rule you just
enforced" (`b58e62bf:16576`).

**Writers.** All 117 Write calls on memory files are in main-session transcripts. Teammates edited memory only in one
user-requested pruning fan-out (11 teammates, Edit only); files edited only by those teammates carry no stamp. Plain
subagents only read memory. 33 entries have no Write or Edit call in any surviving transcript.

**Use in later sessions.** Every session loads the index. Observed cases:

- a rule written in one session was followed three hours later in another, without a prompt asking for it (the agent did
  not cite the memory);
- an agent read its memory notes as a procedure source and said so;
- in two cases a memory rule caused behavior the user then corrected, and the agent rewrote the rule
  (`55dae9dd:1454-1475`).

Explicit attribution of behavior to memory is rare in assistant text.

**Date range.** The oldest record is 2026-09-22; the newest is today. The current session and its teammates now appear
in the corpus.

### Open gaps

- Bash-based writes are found only by command text; that search is not exhaustive.
- Why teammate edits left no stamp, when the runtime stamps every Write and Edit, is undetermined (see Unresolved
  questions).

## 5. Debrief research output

### Files Investigated

- `~/.claude/skills/debrief/SKILL.md`, `scripts/extract-corrections.mjs` — the debrief skill
- `~/.claude/debrief-research/REPORT.md`, `CONTEXT.md`, `synthesis/notes.md`, `synthesis/classes.md` — its research
  output

### Findings

- The skill reads transcripts and the auto-memory directory, and emits candidates with seven signals (five correction
  kinds, `tool-error`, `memory`). It routes lessons to a CLAUDE.md, a skill, settings, or a code note with per-item
  approval; when a memory already holds the rule it moves it out of memory (`SKILL.md:94-96, 138-139`).
- `REPORT.md:12`: "Auto memory is the weak layer — 19 of 27 violated rules lived there, and 6 corrections were caused by
  a memory." Of 86 judged corrections, 47 had a loaded rule: 27 violated it, 13 followed a loaded rule saying the
  opposite, 2 hit conflicting rules (`REPORT.md:19-21`).
- One S1 memory ("main checkout, never a side worktree") produced 4 worktree corrections (`REPORT.md:22-23`).
- Five recorded cases where a memory existed before the same mistake recurred; the memory was read only after the
  damage, or not at all (`synthesis/notes.md:102-103, 121-122, 128-131, 156-157, 204-206`). No case shows a memory that
  demonstrably prevented a later error.
- `known-lesson-recurs`: 14 sessions, 9 repositories; debrief catches 13% (`REPORT.md:27-28`). A shell-dialect lesson
  lived only in one store while its failures spanned 9 repositories (`REPORT.md:42, 81`).
- A rule-staleness pass found 37 conflicts in 5 repositories: 19 true, 12 plausible, 6 false (`notes.md:213-217`).
- Auto-dream ran on this machine from 29 March to 8 April 2026; 0 of 183 memory files carried its annotation
  (`notes.md:226-227`).
- Replay: the rule "memory is not a place to write anything, we're just talking" flipped an interrupt case 3/3 with the
  rule versus 1/6 without (one-sided Fisher p=0.048) (`notes.md:246-250`).
- A review rule lives in three copies: CLAUDE.md, a `MEMORY.md` line, and a skill description (`notes.md:252-253`).

### Open gaps

- Counts are lead-authored with a single judge (`REPORT.md:91`). Quotes were not re-verified against the rendered
  transcripts.

## 6. Claude Code memory ecosystem

### Sources

- Deep-research survey (web search, 2026-11-06); several links point to forks rather than canonical repositories
- GitHub issues of anthropics/claude-code (search API, 2026-11-06); #105867 and #107555 read in full
- Practitioner posts

### Findings

**Third-party tools** (survey-level; not individually verified):

- claude-mem — plugin with hooks, skills, background worker, SQLite (v15.9.0, 2026-11-02).
- Basic Memory Claude Code plugin — markdown notes in a Basic Memory project, PreCompact checkpoint, capture skills,
  3-day recall window.
- Mem0 / OpenMemory plugin — hooks, MCP add/search/update/delete.
- mcp-memory-service — vector store with consolidation and quality scoring (v12.6.0, 2026-11-05).
- Serena — markdown under `.serena/memories/`, with `serena memories check` for references.
- memem — Obsidian vault, FTS5, transcript mining.
- cross-agent-memory-kit — post-session distillation hook.
- Linters for CLAUDE.md: claudelint, claudemd-lint, ccmd.

Across the surveyed tools, conflict policy, stale-entry retirement, per-entry provenance, and per-write approval are
mostly undocumented.

**Issues.** Selected:

- #82056 (open, 75 comments) — a session cannot tell whether its index loaded whole.
- #63903 (closed) — disabled memory still sent its preamble.
- #99403, #57574, #40210 — truncation drops entries silently, newest first.
- #85075 — months-old memory loads with no freshness signal.
- #78795 — triggered loading for topic files.
- #78569 — the memory instructions and the read-before-write gate loop.
- #62336 — a background write invalidates an Edit snapshot.
- #107519 — the model silently resolves CLAUDE.md-versus-memory conflicts.
- **#105867** (open, read in full) — a `feedback` output rule was followed in 279/385 = 72% of turns when only its
  `MEMORY.md` index line was in context, and 41/43 = 95% when the full file was loaded; flat across turn index and
  compaction; workaround: a `Stop` hook that enforces the rule.
- **#107555** (open, 2026-11-05, read in full) — "Turns a one-off correction into a permanent rule (memory, skills) and
  later cites it as the user's decision". Expected behavior per the reporter: a correction about one case applies to
  that case only; before saving a standing rule the model asks "Is this for this case only, or a standing rule?"; a
  saved memory quotes the user's words and what they were about; the model never presents its own note as the user's
  decision. Workaround: a `UserPromptSubmit` hook injecting "one case is not a rule".

**Practitioners running without auto memory.**

- An X post (June 2026, read from a search snippet) recommends disabling it because stale memory misleads, the agent
  trusts memory over current lookup, and the store is Claude-only; it suggests AGENTS.md instead.
- A blog post ("An Hour Down Claude Code's Memory Hole", April 2026, read in full) measured the memory section at 12,540
  characters, 46.9% of the system prompt on 2.1.114; the author judged "not one" saved memory accurate.
- No measured quality comparison of memory on versus off was found.

## 7. External agent-memory systems and research

### Sources

- Web survey from search excerpts (no full-page reads). Items marked **verified** were read on the primary page during a
  second wave.

### Findings

**Systems.**

- **GitHub Copilot memory (verified, docs page).** Copilot creates memories itself; the app and the interactive CLI "can
  ask you to approve storing a memory", while the cloud agent and code review do not. Repository facts carry citations
  to code; user preferences may quote the user. "Copilot is instructed to check the citations provided with each memory
  before using it" — "a judgment Copilot makes, rather than a guarantee enforced by the system". Upvotes and downvotes
  steer use; heavily downvoted memories stop being used. Expiry defaults to 90 days, starts at creation, and resets on
  an upvote, not on retrieval; owners can set 7–180 days for repository facts. Repository facts apply only to their
  repository; user preferences follow the user. When scope intent is ambiguous, Copilot asks.
- Gemini CLI `save_memory` appends a bullet under "## Gemini Added Memories" in `~/.gemini/GEMINI.md` when the user
  asks; no reconciliation is documented.
- OpenAI Codex CLI memories are off by default; third-party descriptions report per-session summaries and a global
  consolidation phase. A Codex discussion (#24717) suggests keeping authoritative instructions outside memory.
- Cursor separates Rules (files) from Memories (auto-generated; current status unclear). Windsurf auto-generates
  workspace-scoped memories behind a toggle. Cline Memory Bank keeps markdown in the repository, refreshed by an
  explicit full-review command.
- Letta keeps always-in-context memory blocks; experimental sleep-time agents edit shared blocks between turns.
- Anthropic's Claude API memory tool is client-side file operations under `/memories`. Managed Agents memory stores
  (beta) create an immutable version on every change, offer read-only or read-write mounts, and attribute agent writes
  to the session.
- ChatGPT keeps saved memories and chat-history reference; the user can view and delete them; a sources view shows which
  memories informed a response.

**Conflict mechanisms.**

- mem0 asks an LLM to choose ADD, UPDATE, DELETE, or NOOP for each candidate against similar memories.
- Zep / Graphiti stores facts bi-temporally; a contradicted fact is kept with an invalid time, not deleted; an LLM
  detects the contradiction.
- LangMem consolidates through an LLM on a hot path or a background manager.
- A-MEM links and updates notes at write time.

**Research.**

- **Supersede** (Patel, arXiv 2606.27472, verified abstract). On LongMemEval knowledge updates, bounded self-maintained
  memory drops accuracy from 92% to 77% (gpt-5.4, McNemar p<0.005), and from 68% to 28% as the conversation grows 24x.
  "The bottleneck is therefore memory maintenance, not comprehension, and is not closed by a stronger model."
- **Reliable Post-Retrieval Assembly for Agent Memory** (Reddy and Challaram, arXiv 2606.01435, verified abstract).
  Separating evidence extraction from answer-policy execution improves single-hop accuracy by 10.8 points on average (21
  at 262K); swapping only the freshness operator contributes 2.0 points on average. The result is bounded "to
  current-value questions with explicit version metadata"; on LongMemEval the difference is not significant.
- **Reading MemoryAgentBench's conflict scores against a frozen last-write resolver** (Pakhomov and Nijkamp, arXiv
  2610.09193, verified). A rule-based, no-LLM resolver scores 94.0% single-hop and 66.5% multi-hop; the authors state
  this is "true of this split, not of conflict resolution in general".
- **MemConflict** (Tao et al., arXiv 2605.20926, partly verified). Dynamic, static, and conditional conflicts across six
  systems; answer correctness diverges from retrieval; Mem0 scores lowest on dynamic conflicts (answer accuracy 0.12).
- arXiv 2608.13921 (excerpt only): preservation of irreducible conflicts — Letta 91.7%, Mem0 69.1%, A-Mem 47.0%.
- Foundational: generative-agents reflection (2304.03442), MemoryBank decay (2305.10250), LongMemEval (2410.10813),
  sleep-time compute (2504.13171), MemoryAgentBench (2507.05257).

### Open gaps

- Unverified survey items rest on search excerpts. The survey's 28-day Copilot expiry was wrong (verified: 90 days), and
  its title and framing for 2606.01435 were wrong (corrected above).

## Cross-Cutting Observations

- **Who writes.** On this machine, both background writers are off (cached flags), and every memory create comes from a
  main-session agent. In the 27-write sample, no write followed a request to save; 13 followed a correction or
  instruction, 14 followed the agent's own findings.
- **Authority.** `MEMORY.md` loads in the same block as CLAUDE.md, under "These instructions OVERRIDE any default
  behavior and you MUST follow them exactly as written". Topic-file bodies load only on demand; #105867 measures 72%
  compliance with only the index line in context versus 95% with the body.
- **Instruction sources.** Three texts govern writes: the built-in lean prompt (which defines a `project` type and names
  "corrections" as `feedback`), the `<memory-discipline>` block of `~/.claude/CLAUDE.md`, and the preamble copied into
  13 indexes. No store holds a `project` entry.
- **Provenance and retention.** The runtime stamps `originSessionId` and `modified` already. Transcripts live 30 days by
  default, so 87 of 166 origin references point to deleted sessions; an origin names the first stamper, not necessarily
  the author; Bash writes carry no stamp.
- **What goes wrong.** Dead references are rare (43 of 50 checked entries name items that exist). Recorded failures are
  rules applied beyond their scope (debrief: 6 corrections caused by memory; #107555), rules restated from or
  conflicting with CLAUDE.md (26 restate, 4 differ), lessons isolated per store, and memories not consulted at action
  time.
- **Interception points.** A PreToolUse hook sees a memory write before stamping and can deny it; a mod can also rewrite
  the memory prompt section, the loaded index, and recalled attachments, and can run a tool-less completion over the
  session transcript inside the hook.
- **Prior art for distillation.** Anthropic's auto-dream already performs a consolidation pass with CLAUDE.md
  reconciliation, server-gated and off here. Copilot validates citations at use time and expires unreinforced entries;
  Zep keeps superseded facts with an invalid time; Managed Agents stores keep immutable versions.

## Unresolved Questions

- Runtime behavior of the mods surfaces on 2.1.319 (types from 2.1.310, early access): `prompt.section` for `memory`,
  `prompt.context` for memory files, `tool.call` on memory writes, `$.model.fork` inside a `tool.call` hook.
- Why edits made by in-process teammates carry no stamp, when the runtime stamps every Write and Edit of a memory file.
- A measured comparison of agent behavior with auto memory on versus off: none found publicly.
- The producer of `tiny_memory/` directories.
