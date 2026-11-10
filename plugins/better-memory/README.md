<div align="center">

# better-memory

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code 2.1.319+](https://img.shields.io/badge/Claude%20Code-2.1.319%2B%20mod-d97757.svg)](https://claude.com/blog/claude-code-mods)

</div>

Your auto memory keeps only facts that still hold. One-session requests, notes on finished work, and claims that went
stale leave the store instead of steering every later session.

## The Problem

The agent writes memory on its own judgment, and you rarely see an entry until it backfires. A request such as "just
work in main this time" can become a rule that changes behavior for weeks. A note about half-finished work stays after
the work is done. A memory and a CLAUDE.md rule can disagree, and memory loads with the same authority as CLAUDE.md.
Cleaning the store by hand does not last: it fills again.

## The Solution

Memory holds facts: about you, about the project's situation, about external systems. Instructions on how to work belong
in CLAUDE.md, where you can see and edit them. The plugin acts at three points.

**When the agent writes memory.** The agent saves and removes memory entries only through two tools the plugin adds; the
plugin refuses any other write to the memory directory. The save tool takes the entry together with its anchors, what in
the session shows the fact: your exact words, a file the session read, a page it fetched, or a command it ran. The
plugin confirms that each anchor is really in the session and refuses an entry with none it can find; whether an anchor
shows the fact is for sift to judge. The tool refuses guidance on how to work saved as `feedback`, the type Claude Code
gives it, and tells the agent instead to offer you a CLAUDE.md edit when you stated a rule as standing, to ask you when
the scope of a correction is unclear, and to save nothing for a one-task request. Guidance saved under another type
reaches sift like any other entry. Every saved entry is a candidate. The agent is also told that progress notes and
plans are not kept, so it does not promise to remember them.

**When an interactive session goes idle.** If the store holds candidates, entries the plugin has not judged yet, or
entries whose backing broke, a separate Claude process called sift judges up to twelve of them. Sift reads the anchors
recorded with each entry, your messages in the session that wrote it while Claude Code still keeps that session's
transcript, the CLAUDE.md files in force, the pages the entries link, and the project itself, and gives each entry one
verdict:

- **promote** — a fact that holds beyond the session, with at least one anchor that shows it: your exact words, a file,
  a page the entry links or the session fetched, or the output of a command the session ran;
- **propose an instruction** — an instruction that your own words gave as standing and that no CLAUDE.md states, offered
  to you as a CLAUDE.md line together with what you said;
- **remove** — everything else: task progress, one-session requests, stale or contradicted facts, duplicates of
  CLAUDE.md, and anything sift cannot back.

Removal is the safe error. An entry removed by mistake costs rediscovery; a false entry kept misleads every later
session. The plugin confirms every anchor sift cites: a file must be one sift read in its run, even when the entry
recorded it, because the file may have changed. A promotion left with no anchor is turned into a removal before it is
applied. A fact sift merely knows backs nothing. The same holds for instructions: one that nothing shows you gave, such
as a rule the agent saved on its own judgment, is never put to you as a question. If it was written before you installed
the plugin, it waits in a review file, because your words may simply be gone with an old transcript. Otherwise it is
removed, and the report of the run lists it.

Sift has read-only tools and no network: the plugin fetches the linked pages itself, so a memory entry cannot make sift
send your data anywhere. It runs apart from your conversation and never interrupts it.

**At the next session.** The plugin writes `MEMORY.md` itself: the promoted entries and the entries not judged yet. When
an interactive session starts, it also hands the agent a note with up to five open instruction proposals. The agent
lists those proposals to you together once the task at hand allows; your answer to each is recorded, and on yes the
agent makes the CLAUDE.md edit.

**When you ask for it.** `/better-memory:sift` runs the same pass by hand, with you in the loop. The agent reads every
entry and the waiting review file, checks the facts against the project, and merges rules that say the same thing. It
then shows you one plan: CLAUDE.md lines to accept, edit, or decline, entries to remove, and facts about you to confirm.
Nothing changes until you answer. On a store full of entries from before the plugin, this is the one review that sorts
out the rules nothing else can vouch for; later, ask for it whenever memory needs a cleanup.

## Installation

```text
/plugin install better-memory --marketplace xobotyi/cc-foundry
```

## Configuration

Two settings, both on by default. The installer offers them and may report them as not set; until you set one, its
default applies. Change them later in `/config` or with `/plugin configure`.

- **Guard auto memory** (`enabled`) — off, the plugin's mod does nothing: Claude Code's own memory runs as if the plugin
  were not installed, and only the `/better-memory:sift` skill remains, working on the memory files directly.
- **Sift when idle** (`sift`) — off, the tools and their checks stay, no separate Claude process ever runs, and new
  entries reach `MEMORY.md` at once. Cleanup is then whenever you run the skill.

The mod also does nothing in a session that has auto memory off (`autoMemoryEnabled` set to `false`), such as the
separate Claude process that sift runs, or that starts with no built-in tools (`--tools ""`).

## Where Things Live

Reports and the plugin's records live beside the memory directory, in `~/.claude/projects/<project>/better-memory/`.
Each sift run writes one report that lists every entry it judged with its full text, the verdict, the reason, the
anchors behind a promotion or an instruction proposal, and the session, round, and tool call that wrote it.

A removed entry is deleted, and its report is the only copy of its text. Reports and answered instruction proposals last
as long as Claude Code keeps transcripts, the `cleanupPeriodDays` setting (30 days by default), and the plugin deletes
them after that. To restore an entry removed by mistake, copy it from its report within that time. The review file,
`review.md`, never expires: it holds only rules from before the plugin, and the skill empties it.

The records keep only the anchors an entry cites: the quoted words, a file path, a page address, or a command with the
passages of its output that show the fact.

## What You See

Each save or removal shows in the conversation as one short row, such as
`Save memory(user-rust: "The user is new to Rust")`; ctrl+o shows the whole call. The plugin's tools never ask for
permission. Once the task at hand allows, the agent puts instruction proposals to you as one question in a later
interactive session, and while the review file holds rules, it mentions that `/better-memory:sift` can review them.

## Limits

- Sift costs an Opus run per batch of up to twelve entries, and runs only when the store holds entries to judge.
- A headless `claude -p` run never sifts. Its entries keep their anchors and are judged in your next interactive session
  in the project.
- In plan mode the plugin's tools get no automatic approval, because plan mode lets no hook approve a tool that writes.
- Sift runs the `claude` command, so it needs `claude` on the `PATH` of your session.
- Entries written before the plugin have no recorded anchors. Sift keeps a fact only when your messages in the
  transcript of the session that wrote it, a file it reads, or a page the entry links confirm it; once Claude Code has
  deleted that transcript, your words are gone from the evidence. Rules from that time wait for the skill instead.
- Facts that hold across all your projects stay in each project's memory for now; sift marks them, and a machine-wide
  store is planned.

## License

MIT
