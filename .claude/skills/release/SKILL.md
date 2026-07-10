---
name: release
description: >-
  GitHub release creation for cc-foundry plugins: per-plugin tags, release notes as the changelog, and post-push
  publishing. Invoke whenever task involves pushing commits to master, releasing or publishing a plugin version,
  bumping plugin versions, or writing release notes.
---

# Plugin Releases

Every plugin version bump that lands on master ships with a GitHub release. The release notes are the plugin's changelog
— there are no CHANGELOG.md files (see `docs/adr/0005`). A pushed version bump without a release is an incomplete ship.

## When to Release

- After every push to master, check the pushed range for plugin version bumps; create one release per plugin whose
  version changed.
- The user's authorization to push covers release creation — do not ask a second time.
- Repo-level changes that bump no plugin version (ADRs, root docs, `.dev/` tooling, this skill) get no release.
- Several plugins bumped in one push → one release each.

## Identify What to Release

1. Find bumped plugins in the pushed range: `git diff <old-origin-head>..origin/master -- '*/plugin.json'`. When the old
   head is unknown, compare each plugin's `plugin.json` version against its latest `<plugin>-v*` tag from
   `gh release list`.
2. For each bumped plugin, resolve:
   - the pushed commit that changed its `plugin.json` version — the release target
   - the previous release tag `<plugin>-v*`, if any — the notes range and compare-link anchor
3. Collect source material: `git log <prev-tag>..<target> -- plugins/<name>/` plus the diff of that range. For a first
   release, use the commits of the bump itself.

## Tag and Title Scheme

- **Tag** — `<plugin>-v<X.Y.Z>`, e.g. `the-coder-v1.5.0`
- **Title** — `<plugin> v<X.Y.Z>`, e.g. `the-coder v1.5.0`
- **Target** — the pushed commit that landed the version bump
- Never run `git tag` — `gh release create` creates the tag on the remote at publish time.

## Release Notes

Written for people who install the plugin, not for repo contributors.

- Lead with one sentence stating what the release is about.
- Segment by changed component, one `###` section per component: ``### `<name>` skill``, ``### `<name>` output style`` —
  same pattern for hooks, commands, and agents. A plugin bumps its version even when a single component moved; the
  segments tell the installer exactly which parts did.
- Plugin-wide changes that belong to no component (README, packaging, licensing) go under a final `### Plugin` section.
- Within a segment, prefix each bullet with its change type in bold — `**Added:**`, `**Changed:**`, `**Fixed:**`,
  `**Removed:**` — ordered Added → Changed → Fixed → Removed.
- Each bullet states the change and, where not obvious, why it matters to a plugin user.
- Distill from commit messages and the diff. Never paste a commit list, shortlog, or auto-generated notes.
- No session artifacts (test counts, CI status) and no repo-internal jargon that means nothing to an installer.
- End with a compare link when a previous tag exists:
  `**Full diff:** https://github.com/xobotyi/cc-foundry/compare/<prev-tag>...<new-tag>`
- First release of a plugin: no compare link; notes cover this version's changes only, not the plugin's history.

### Example

```markdown
Sharpens commit-message validation and adds trailer support.

### `commit-message` skill

- **Added:** `Task:` and `Refs:` trailer validation — malformed trailers now fail validation instead of landing
  silently.
- **Changed:** subject-length limit aligned with git conventions: 50 soft / 72 hard (was a flat 72).

### `commit` skill

- **Fixed:** validator crashed on commit messages containing unescaped backticks.

**Full diff:** https://github.com/xobotyi/cc-foundry/compare/git-commit-v1.1.3...git-commit-v1.1.4
```

## Create the Release

Write the notes to a scratchpad file first — `--notes-file` avoids shell-quoting damage:

```bash
gh release create <plugin>-v<X.Y.Z> \
  --target <bump-commit-sha> \
  --title "<plugin> v<X.Y.Z>" \
  --notes-file <path-to-notes.md>
```

- To stage a release for user review, add `--draft` (visible to collaborators only; the tag is created at publish, not
  at draft creation). Publish with `gh release edit <tag> --draft=false` — re-set `--target` to the bump commit first if
  the draft was created before the push.

## Verify

- `gh release view <tag>` — confirm title, target, and notes.
- Cross-check: every plugin bumped in the pushed range has a release; `plugin.json` version equals the latest tag.
