# Architecture Decision Records

Durable record of design decisions for cc-foundry **itself** — how its skills, output styles, and plugins are authored.
These are meta-decisions about the skill library, not decisions about any project built with it.

> Not to be confused with the per-project ADRs that the `the-blueprint:alignment` skill writes to a downstream project's
> `design-docs/adr/`. Those record decisions about the software being planned. The ADRs here record decisions about
> cc-foundry's own authoring conventions.

## Format

One file per decision, `NNNN-slug.md`, numbered sequentially (Nygard convention). Each states the decision as its title
and carries Status / Date / Context / Decision / Consequences. Keep them to roughly one screen — context and reasoning,
not exhaustive analysis.

`Status` is one of `accepted`, `deprecated`, or `superseded by NNNN`.

Record a decision here when the rationale would otherwise survive only in a commit message or memory — so future authors
neither re-litigate it nor cargo-cult it.

## Index

- [0001 — KV lists over tables for independent-entry data](0001-kv-lists-over-tables-for-independent-entries.md) —
  accepted
- [0002 — No SKILL.md line cap](0002-no-skill-md-line-cap.md) — accepted
- [0003 — Skill dependencies: soft vs hard tiers](0003-skill-dependencies-soft-vs-hard.md) — accepted
