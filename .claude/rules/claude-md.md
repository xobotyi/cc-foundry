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

- Project-universal rule → CLAUDE.md. Universal means the fence leaks otherwise — a glob would match files the rule does
  not govern, or miss files it does — or the rule must hold before any file is read. Everything else that one glob
  fences cleanly goes to `.claude/rules/` on the way in, not once the file grows too long.
- Path- or filetype-scoped convention → `.claude/rules/` with glob `paths`. Every `.md` under a rules directory is
  discovered recursively, and nested `packages/*/.claude/rules/` directories load on demand — cc-foundry keeps all rules
  at the repo root by choice, not by constraint.
- Procedural workflow or domain expertise → a skill. Plugins cannot ship rules; conventions that must reach an install
  go in a skill.
- Must-never-happen → hooks and permissions. Prose is not enforcement; models route around soft constraints.
- Ephemeral state (sprint goals, in-flight migrations) → the tracker.

## Structure and Size

- Placement follows the U-shaped attention curve: identity and capability map at the top, conventions in the middle,
  verification and critical constraints at the bottom. Restate a truly critical rule at both ends, worded differently.
- The capability map is an ownership map — which module owns what, where new code of each kind goes — never a directory
  tree.
- Past 200 lines compliance degrades: classify each block keep / move-to-`.claude/rules/` / extract-to-skill / remove.
  Safety-critical, security-sensitive, and easy-to-violate content stays regardless of how rarely it applies.
- Only a `paths`-scoped rule reduces baseline context. A rule without `paths` loads at launch at the same priority as
  `.claude/CLAUDE.md`, and `@path` imports expand at launch — splitting a file into imports buys organization, not
  context.

## A Plugin's CLAUDE.md

- A plugin CLAUDE.md opens with a 1-3 sentence prose statement of what the plugin does, then goes structured: skill KV
  lists, dependency diagrams, bullet-list conventions.
- **Section order is fixed**, so a reader who knows one plugin's file can navigate every other:
  1. Component rosters — `## Skills`, then `## Agents`, `## Output Styles`, `## Scripts` as the plugin ships them. A
     plugin that ships no skills uses `## Components`.
  2. Plugin-specific sections where they earn a place — `## LSP Integration`, `## Validator Contract`,
     `## Known Limits`.
  3. `## Skill Dependencies` — relationships _inside_ this plugin: which skill is a prerequisite of which, which owns a
     shared concern, which defers to another.
  4. `## Plugin Scope` — what belongs to _other_ plugins, and what is deliberately out of scope.
  5. `## Conventions` — the rules for editing this plugin's artifacts.
  6. `## Critical Constraints` — the bottom reinforcement zone, only where something genuinely critical needs it.
- **Use those exact headings.** `Skill Relationships`, `Cross-Skill Contracts`, `Boundaries`, and `Scope` are the same
  two concepts under four more names; one name per concept applies to headings as much as to identifiers.
- It governs edits to the plugin's artifacts; it never re-teaches them. An agent editing a plugin reads its SKILL.md
  files too, so a conventions block paraphrasing a skill is a second, lower-fidelity copy that drifts.
- Keep what an editor cannot get from those artifacts: cross-plugin ownership boundaries, a term another plugin cites by
  name, measured budgets, and non-obvious Claude Code behavior.

## Formatting

- After editing, format the file with `yarn dlx prettier --write <file>`. The repo config picks the parser — never pass
  `--parser`, which forces the wrong one for CLAUDE.md and SKILL.md.
