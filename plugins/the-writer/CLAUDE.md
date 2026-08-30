# the-writer Plugin

Prose discipline for agent-authored text. Makes articles, docs, and communication written by agents read naturally for
humans.

## Skills

- **`humanize`** — remove AI-writing tells from prose, and prevent them while drafting, without flattening the author

## Plugin Scope

Out of scope: detector evasion (the skill fixes writing for readers, never for detectors), instruction text (covered by
ai-helpers:prompt-engineering), code comments and commit messages (covered by the-coder and git-commit), CLAUDE.md
quality (covered by the-workflow).

## Conventions

- `humanize` groups tells by the post-training pressure that produces them — performed helpfulness, unearned
  significance, hedged commitment, markdown in prose, assembly over composition, machine residue. A new pattern joins a
  mechanism; a tell with no mechanism behind it ships in neither the skill nor the catalog
- Every threshold the skill states traces to a measurement in `skills/humanize/references/baselines.md`, with its corpus
  size and the author's own caveat. A number with no source does not go in, and a marker that failed to replicate is
  recorded as failed rather than dropped
- Vocabulary lists are scoped to model eras and decay fastest of anything here; re-verify against current corpus data
  before editing them
- When editing the skill, never weaken the Hard Constraints block (never fabricate, never inject, conserve substance,
  match voice, house style wins, secondhand text immune) — every edit path depends on it
- Re-ground the references by refreshing `skills/humanize/.dev/reference-inventory.json` and running
  `cd .dev && yarn cli docs-fetch ../plugins/the-writer/skills/humanize/.dev/reference-inventory.json`
