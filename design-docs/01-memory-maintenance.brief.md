# Brief: Auto-memory maintenance

## Motivation

Project auto memory degrades over time. It collects contradictory entries, session-specific entries, and false claims,
and the agent acts on them against the project. Writes are silent, so the user sees an entry only when it backfires: in
one session the user asked the agent to work in main instead of a worktree; the agent saved that as a standing rule,
behavior changed for three or four sessions, and an investigation was needed to find the cause. Repeated manual cleanups
do not hold — the store fills again. Recent debrief runs show the pattern extensively. Three instruction sources
disagree: Anthropic's built-in memory prompt, the memory-discipline block in the user's global CLAUDE.md, and practice.
As a workaround, each project carries a git-excluded `.claude/CLAUDE.md` holding how the user works on it, because the
user can see and edit it by hand.

## Goals

- The store holds no contradictions and no session-specific entries, and every entry is still true.
- An instruction for the current session never becomes memory. When its scope is ambiguous and it contradicts default
  behavior, the agent asks before saving.
- Each fact lands where its lenses place it: the root CLAUDE.md (how the project works), project memory (how the user
  works on this project), user-level memory (how the user works across projects), or nowhere (session-only).
- Each entry records the session that created it, so its premise can be traced and checked.
- New entries may wait as candidates in a temporary tier; a distillation pass moves the ones that hold into durable
  storage.
- Distillation runs a dry run first (what would move, merge, or go), then programmatic checks of whether each premise
  still holds.
- The plugin uses other memory systems only when the session shows they are present.

## Non-goals

- Asking the user to review or approve memory changes in normal operation.
- Blocking escalations.
- Protecting every true entry from removal — losing one costs rediscovery, except gate entries.

## Constraints

- A dedicated cc-foundry marketplace plugin; works on a bare Claude Code install.
- The skill is part of the deliverable regardless. The write-time gate is a mod only if a mod can do it.
- Escalation only on hard conflicts and destructive changes, and never blocking.
- Trialed locally before release. Pass condition: an analysis of every change it makes, against this machine's
  long-lived stores and local session transcripts.

## Key risks

- Keeping a false or contradictory entry is the worst failure; under doubt, removal is the safer error.
- Merging contradictory entries can produce a claim no session ever made — the worst failure in a new form.
- Removing a gate entry silently skips a process step.
- The plugin's rules become a fourth instruction source alongside the built-in prompt and the memory-discipline block.

## Flagged term ambiguities

- "Durable": the user's global CLAUDE.md defines it as true across projects; here it means the entry stays true after
  the session that wrote it ends — a value on the longevity lens, independent of subject.
- "Temporary storage" / "candidate": new concept, name not settled.
- "Distillation" / "dream" / "REM phase": three names for one pass; Anthropic's own term may differ.
- "Promotion": used for moving up to user-level memory; moving out to the root CLAUDE.md may be a second concept under
  the same name.
- "Gate entry": an entry that enforces a process step. New concept.
- "Lens": a dimension that places a fact. Two named so far: longevity (session-only, candidate, durable) and subject
  (how the project works, how the user works on it, how the user works across projects).

## Questions for research

- What Anthropic's built-in auto-memory prompt instructs the agent to save, and whether a plugin can override or extend
  it.
- What a Claude Code mod can do today: see or intercept a write to the auto-memory directory and run a subagent on it;
  inject into the process with new tools or altered ones. What hooks can do here.
- Whether Anthropic's memory feature has a consolidation ("dream") phase, and what it does.
- Whether an entry can be linked to the session and transcript that wrote it, and how long transcripts are kept.
- What the debrief findings show about memory failure classes and their frequency.
- In this machine's stores: entry counts, how many the user asked for explicitly, how many contradict each other or a
  CLAUDE.md, how many are session-specific.
- Which premises can be checked programmatically: file or symbol existence, config values, CLAUDE.md rules, git history.
- Where user-level memory lives in Claude Code, and how git-excluded and local CLAUDE.md files load.
- Existing plugins and skills that improve or replace auto memory, and markdown-based memory systems outside Claude Code
  that work the same way.
- Why some practitioners run with auto memory disabled.

## Not yet specified

- The full set of lenses beyond longevity and subject.
- The conflict policy: merge with removal as fallback, or re-evaluate and rewrite.
- What counts as a hard conflict or a destructive change, and where a non-blocking escalation lands.
- The fate of the git-excluded `.claude/CLAUDE.md` — depends on feasibility.
- The reach of "do more" beyond auto memory.
- Whether to run with auto memory disabled as an experiment: the user leans toward trying it, after the current state is
  understood.
