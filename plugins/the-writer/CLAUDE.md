# the-writer Plugin

Prose discipline for agent-authored text. Makes articles, docs, and communication written by agents read naturally for
humans.

## Skills

| Skill      | Purpose                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| `humanize` | Remove AI-writing tells from prose (and prevent them when drafting) while preserving substance and voice |

## Plugin Scope

This plugin covers universal prose quality for human readers:

- Detecting and fixing AI-writing tells by generative mechanism, not flat pattern lists
- Write-time discipline (avoid producing slop) and edit-time cleanup (fix existing text)
- Reviewing text suspected of being AI-generated

Out of scope: detector evasion (the skill fixes writing for readers, never for detectors), code comments and commit
messages (covered by the-coder and git-commit), CLAUDE.md quality (covered by the-workflow).

## Conventions

- `humanize` organizes tells into six mechanism families (inflated importance, performed deliberation, leaked context,
  uniform texture, default formatting, machine residue) — new patterns join a family rather than extending a numbered
  list
- Vocabulary tiers in the skill decay as models change; re-verify against current corpus data before editing tier
  assignments (source notes in `skills/humanize/references/patterns.md`)
- When editing the skill, never weaken its Hard Constraints block (never fabricate, conserve substance, match voice,
  house style wins) — every edit path in the skill depends on it
