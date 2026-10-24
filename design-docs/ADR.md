# Architecture decisions

Each entry is a decision in force, stated as its title; the linked record holds the rule in full, why it holds, what
lost, and what would reopen it.

- Before changing code under an area below, read the records listed for it.
- A task that conflicts with a listed decision stops and asks; it does not change the decision or work around it.
- Writing, changing, or removing a record follows the `the-blueprint:adr` skill.

## .claude/skills/release

- [1.5 Ship one GitHub release per plugin version bump as its changelog](/design-docs/adr/1.5-plugin-changelog.md)

## plugins/\*

- [1.1 Use key-value lists for independent entries and tables only for comparison](/design-docs/adr/1.1-structured-data-shape.md)
- [1.2 Govern SKILL.md length by the deletion test, inside the durable window](/design-docs/adr/1.2-skill-md-length.md)
- [1.3 Express a skill dependency as hard or soft](/design-docs/adr/1.3-skill-dependencies.md)
- [1.4 State checkpoint nudges as declarative rules](/design-docs/adr/1.4-behavioral-nudges.md)
- [1.6 Take methodology from external skill libraries, never authoring craft](/design-docs/adr/1.6-prior-art-reuse.md)
- [1.9 Write instruction artifacts in the timeless present](/design-docs/adr/1.9-instruction-timelessness.md)

## plugins/the-coder

- [1.7 Let the coding skill state comment and documentation policy in full](/design-docs/adr/1.7-comment-policy-ownership.md)
- [1.8 Permit exactly five kinds of comment](/design-docs/adr/1.8-permitted-comments.md)
