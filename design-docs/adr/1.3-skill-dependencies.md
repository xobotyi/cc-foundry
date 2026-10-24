# 0003 — Skill dependencies: soft vs hard tiers

- **Status:** accepted
- **Date:** 2026-06-02

## Context

Skills depend on other skills. cc-foundry documented only one pattern — the hard `<prerequisite>` block (e.g. "invoke
`prompt-engineering` before drafting"). But not every dependency is load-bearing: some skills only sharpen a result and
work correctly without the dependency.

Treating every dependency as hard — stamping an explicit "run X first" pointer on each — spends attention and tokens
where nothing is load-bearing, and trains readers to ignore the pointer when it actually matters.

## Decision

Express a skill dependency by tier:

- **Hard** — skipping the other skill produces wrong output. Emit an explicit pointer in the body: a `<prerequisite>`
  block or a load-bearing step. The reader must act on it.
- **Soft** — the other skill only sharpens output; the skill still works without it. Name it in prose (a Related Skills
  bullet) with no invoke pointer.

## Consequences

- `skill-engineering` documents both tiers and carries a Quick Checks item for dependency expression.
- Skill reviews check that hard dependencies carry an explicit pointer and soft dependencies do not.

Adapted from the soft-vs-hard dependency split in [mattpocock/skills](https://github.com/mattpocock/skills) ADR-0001.
