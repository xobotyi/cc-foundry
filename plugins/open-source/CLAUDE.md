# open-source Plugin

Open-source contribution discipline: structured issue creation and pull request submission for external projects.

## Skills

- **`issue-writing`** — issue creation for external repos: routing the report to the right channel, meeting the
  project's evidence bar, bug and feature and vulnerability shapes, template and form mechanics
- **`pr-contribution`** — PR submission for external repos: finding and obeying the project's AI-contribution rules,
  earning a reviewer, sizing the change, titles and descriptions, disclosure trailers, fork mechanics

## Skill Dependencies

The two skills are complementary but independent — neither is a prerequisite of the other, and each reads the target
project's rules for itself.

## Plugin Scope

This plugin covers the external-facing communication artifacts of open-source contribution — the issues and pull
requests that maintainers see. It does not cover:

- Code generation or implementation (the-coder and the language plugins)
- Commit message formatting (git-commit's domain)
- Internal issue tracking (the-blueprint's domain)
- Maintaining your own OSS projects (out of scope)

## Conventions

- Never add a rule that treats machine authorship as a quality signal, and never add one that asks an agent to sound
  human. Both skills target unreviewed output instead — the objection maintainers state
- Style-based AI detection belongs to `the-writer:humanize`, which owns prose quality and retired em-dash density and
  word blacklists on corpus evidence. A detection marker added here contradicts it
- Rules classify into refuse, disclose, verify, and handoff. A new rule shape joins one of those four or it does not go
  in
- Never soften refuse and handoff into guidance — agents comply with neither unaided, and steering does not recover them
- Every threshold traces to a measurement in the owning skill's `references/evidence.md`, with its corpus and caveat. A
  number with no source does not go in; two studies that disagree are recorded as contested
- Named projects are illustrations of rule shapes, never a lookup table. Keep them dated, keep them in the reference,
  and route every decision to the repository being contributed to
- Acceptance and rejection figures carry the caveat that the corpora measure agents working inside repositories that
  invited them — not the outside contribution this plugin covers
- Re-ground a skill's references by refreshing its `.dev/reference-inventory.json` and running
  `cd .dev && yarn cli docs-fetch ../plugins/open-source/skills/<skill>/.dev/reference-inventory.json`
