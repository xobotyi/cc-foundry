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

- [0001 — KV lists over tables for independent-entry data](/design-docs/adr/1.1-structured-data-shape.md) — accepted
- [0002 — No SKILL.md line cap](/design-docs/adr/1.2-skill-md-length.md) — accepted
- [0003 — Skill dependencies: soft vs hard tiers](/design-docs/adr/1.3-skill-dependencies.md) — accepted
- [0004 — Behavioral nudges as declarative rules, not emitted reasoning artifacts](/design-docs/adr/1.4-behavioral-nudges.md)
  — accepted
- [0005 — Per-plugin GitHub releases as the changelog](/design-docs/adr/1.5-plugin-changelog.md) — accepted
- [0006 — Prior art: steal methodology, not authoring craft](/design-docs/adr/1.6-prior-art-reuse.md) — accepted
- [0007 — The `coding` skill owns comment and documentation policy, stated in full](/design-docs/adr/1.7-comment-policy-ownership.md)
  — accepted (WHY clause superseded by 0008)
- [0008 — Comments are a closed set of five kinds, not a judgment call](/design-docs/adr/1.8-permitted-comments.md) —
  accepted
- [0009 — Instruction artifacts are written in the timeless present](/design-docs/adr/1.9-instruction-timelessness.md) —
  accepted
