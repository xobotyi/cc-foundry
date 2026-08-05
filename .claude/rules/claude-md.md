---
paths:
  - "**/CLAUDE.md"
---

# CLAUDE.md Authoring

A CLAUDE.md is a prompt loaded into every session in its scope, so its defects are permanent and compounding: noise
buries the rules that matter, drift produces confidently wrong output. The goal is compliance, not completeness — a
short file that gets followed beats a full one that gets ignored.

Invoke the `the-workflow:claude-md` skill (and read its `references/scaffold.md`) before creating, auditing, or
restructuring a CLAUDE.md. The rules below are the shortlist; the skill carries the rationale, the diagnosis workflow
for ignored instructions, and the canonical scaffold. Subagents briefed to touch a CLAUDE.md are briefed to load it too.

## Editing an Existing File

- Edit surgically: add a rule into the section that already owns the topic. Wholesale rewrites, reflows, and section
  reshuffles of a working file are defects, not cleanups.
- Never delete or reword a rule without verifying against the code that it is stale.
- One canonical rule per concern. A nested CLAUDE.md states only what differs from the root — restating a root rule
  produces contradictory signals, not emphasis.

## What Goes In

- Deletion test, mandatory: if removing an instruction would not change output quality, cut it. Cut anything inferable
  from the codebase — directory trees, `ls`-reproducible listings, language fundamentals.
- Concrete and verifiable: exact paths, exact commands, exact patterns. If two agents could read a line differently, it
  is too vague to keep.
- Present tense. Decisions land as rules with at most a one-clause why; changelogs, migration narratives, review
  history, and abandoned approaches go to `git log`, the tracker, or a design doc. A described abandoned approach reads
  as an available option and gets resurrected.
- Bullets, not prose — prose only in the top 10–15% identity block. Lists over tables.

## Routing

- Project-universal rule → CLAUDE.md.
- Path- or filetype-scoped convention → `.claude/rules/` with glob `paths` (this directory, repo root only).
- Procedural workflow or domain expertise → a skill.
- Must-never-happen → hooks and permissions. Prose is not enforcement; models route around soft constraints.
- Ephemeral state (sprint goals, in-flight migrations) → the tracker.

## Structure and Size

- Placement follows the U-shaped attention curve: identity and capability map at the top, conventions in the middle,
  verification and critical constraints at the bottom. Restate a truly critical rule at both ends, worded differently.
- The capability map is an ownership map — which module owns what, where new code of each kind goes — never a directory
  tree.
- Past ~500 lines compliance degrades: classify each block keep / move-to-`.claude/rules/` / extract-to-skill / remove.
  Safety-critical, security-sensitive, and easy-to-violate content stays regardless of how rarely it applies.

## Formatting

- After editing - format the file using
  `vp dlx prettier --write --use-tabs --print-width 120 --parser markdown --prose-wrap always --bracket-same-line --html-whitespace-sensitivity strict <file-path>`
  command.
