---
paths:
  - "**/README.md"
---

# README Authoring

A README is user-facing documentation, and its audience is human. This is the inverse of a CLAUDE.md, which is terse
bullets written for a model.

- Frame the plugin around the problem it solves — "The Problem" / "The Solution" — then explain what each skill does,
  when to use it, and how the skills relate to each other.
- Explanatory prose is correct here. Do not compress a README into the bullet register a CLAUDE.md uses.
- Update the README in the same session as any change that alters what a user sees or installs.
- Format with `yarn dlx prettier --write <file>`; the repo config parses README.md as standard markdown. Never pass
  `--parser`.
