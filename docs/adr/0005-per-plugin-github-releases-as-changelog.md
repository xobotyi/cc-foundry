# 0005 — Per-plugin GitHub releases as the changelog

- **Status:** accepted
- **Date:** 2026-07-10

## Context

Plugins version independently (`plugin.json` synced with root `marketplace.json` per bump), but shipping ended at
`git push`: no tags, no releases, no changelog. Marketplace users had no way to see what changed between versions short
of reading commit history.

Options considered and rejected:

- **Per-plugin CHANGELOG.md files** — duplicate whatever the release notes say, drift over time, and the plugin install
  flow doesn't surface them.
- **Tagless releases** — do not exist; every GitHub release points at a tag. What looks tagless in the UI is GitHub
  creating the tag at publish time, so releases add tags as a by-product with no manual tagging step.
- **Backfilling releases for all current versions** — a page of thin "initial" releases all dated the same day, noise
  with no changelog value.

## Decision

One GitHub release per plugin version bump, created after the bump lands on master:

- Tag `<plugin>-v<X.Y.Z>`, title `<plugin> v<X.Y.Z>`, targeting the commit that landed the bump. Tags are created by
  `gh release create`, never manually.
- Release notes are the changelog: written for plugin installers, segmented by changed component (skill, output style,
  hook — one section each) with change-typed bullets inside, distilled from commits — never a commit list. No
  CHANGELOG.md files anywhere in the repo.
- Push authorization covers release creation — a pushed bump without a release is an incomplete ship, not a separate
  permission gate.
- No backfill: each plugin's first release rides its next version bump.

The workflow lives in the `release` project skill (`.claude/skills/release/`).

## Consequences

- Plugins accumulate per-version tags; compare links become available from a plugin's second release onward.
- A missing release is mechanically detectable: `plugin.json` version ahead of the latest `<plugin>-v*` tag.
- Notes quality depends on commit discipline — the git-commit skill's factual bodies are the source material.
- Release creation requires authenticated `gh`; sessions without it must surface the gap instead of skipping silently.
