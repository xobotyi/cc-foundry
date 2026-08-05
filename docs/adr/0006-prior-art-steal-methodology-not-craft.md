# 0006 — Prior art: steal methodology, not authoring craft

- **Status:** accepted
- **Date:** 2026-06-02

## Context

Public Claude Code skill libraries overlap cc-foundry's domain, and each one raises the same question: adopt their
conventions, or only their subject matter? [mattpocock/skills](https://github.com/mattpocock/skills) was surveyed in
full as the representative case.

Their authoring craft is weaker than ours on every axis we have a position on: the `"Use when [keywords]"` description
style instead of the activation-tested description formula, a fixed ~100-line dogma instead of the deletion test
(`docs/adr/0002`), no activation research behind descriptions, and no KV-vs-table discipline (`docs/adr/0001`).

Their edge is elsewhere — software-engineering **methodology** in domains our skills did not cover: Ousterhout deep
modules, DDD ubiquitous language, disciplined diagnosis.

## Decision

Treat an external skill library as a source of subject matter and methodology, never of authoring craft. Port the
content into our own structure, description formula, and format discipline; do not import their conventions along with
it.

Rejected on survey — thinner than our equivalents, and **not to be re-investigated**: `write-a-skill`, `caveman`,
`grill-me` / `grill-with-docs`, `to-prd` / `to-issues`, `zoom-out`. Their `block-dangerous-git.sh` is an unanchored-grep
blocklist that would ship false security; rejected outright.

## Consequences

- The reusable methodology is already folded into `the-coder:coding`, `ai-helpers:skill-engineering`,
  `the-workflow:handoff`, and `the-blueprint:glossary` / `task-creation`. The soft-vs-hard dependency split was adopted
  separately as `docs/adr/0003`.
- Three methodology gaps stayed open as candidate skills rather than ports:
  - `the-coder:debugging` — the largest gap: `coding` advertises debugging in its description with no body behind it. A
    skill would carry the "the feedback loop IS the skill" framing, a ranked loop-construction ladder, tagged
    `[DEBUG-xxxx]` log discipline, ranked falsifiable hypotheses, the correct-seam false-confidence test, and
    performance / flaky-test branches.
  - `the-blueprint:prototype` — throwaway code that answers a design question; the pure-liftable-kernel vs
    disposable-shell split; structurally different UI variants inside a populated host page.
  - Issue-triage state machine with rejected-decision institutional memory — worth building only if an inbound backlog
    actually needs triaging.
- A future survey of another library starts from this verdict: check craft against our ADRs first, and only mine for
  methodology we lack.
