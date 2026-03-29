# Fork and Pull Request Workflow

Step-by-step mechanics for contributing to repositories you do not have write access to. Platform-agnostic git
operations with GitHub-specific notes where applicable.

## Fork Setup

1. Create a fork of the upstream repository (on GitHub: click "Fork" button, or `gh repo fork`)
2. Clone your fork locally:
   ```
   git clone git@github.com:YOUR-USERNAME/PROJECT.git
   cd PROJECT
   ```
3. Add the original repository as the `upstream` remote:
   ```
   git remote add upstream https://github.com/ORIGINAL-OWNER/PROJECT.git
   git remote -v  # verify: origin = your fork, upstream = original
   ```

## Branch Discipline

- Never commit directly to your fork's default branch (`main`/`master`)
- Create a dedicated branch for each contribution:
  ```
  git checkout main
  git pull upstream main
  git checkout -b fix-login-timeout
  ```
- Branch names should be short and descriptive: `fix-login-timeout`, `add-rate-limiting`, `update-docs-api-v2`
- One logical change per branch — do not mix unrelated changes

## Keeping Your Fork Current

Before starting new work or before submitting a PR, sync with upstream:

```
git fetch upstream
git checkout main
git merge upstream/main
git push origin main  # optional: keeps your fork's main current on the remote
```

If your feature branch has fallen behind:

```
git checkout fix-login-timeout
git rebase main
```

Resolve any conflicts during rebase. The goal is a clean fast-forward merge from the maintainer's perspective.

## Pre-Submission Cleanup

Before opening the PR:

- **Rebase onto latest upstream** — reduces merge conflicts for maintainers:
  ```
  git fetch upstream
  git checkout main
  git merge upstream/main
  git checkout fix-login-timeout
  git rebase main
  ```
- **Squash fixup commits** — if you have commits like "fix typo", "oops", "address review", squash them into the logical
  commits they belong to. Maintainers want a clean history, not a debugging journal.
- **Run the project's test suite** — all existing tests must pass. Add new tests for your changes.
- **Run linters and formatters** — match the project's code style exactly. Check CI configuration for what tools the
  project uses.
- **Review your own diff** — `git diff main..fix-login-timeout` — look for:
  - Accidentally committed files (IDE configs, `.env`, build artifacts)
  - Debug logging or commented-out code left behind
  - Unrelated formatting changes mixed with functional changes

## Submitting the PR

### Using gh CLI (GitHub)

```
gh pr create \
  --title "Fix login timeout on slow connections" \
  --body "Closes #42. ..." \
  --base main \
  --head YOUR-USERNAME:fix-login-timeout
```

### Key Settings

- **Base branch** — the upstream branch you want to merge into (usually `main`)
- **Allow maintainer edits** — enable this (checkbox on GitHub) so maintainers can push small fixes directly to your
  branch instead of requesting another round-trip. **Warning:** if your fork contains GitHub Actions workflows, this
  option also grants access to workflow secrets — be aware of what's exposed.
- **Draft PRs** — if you want early feedback before the work is complete, open as draft

## Responding to Review

- Push fixes to the **same branch** — the PR updates automatically; do not open a new PR
- After addressing all feedback, re-request review explicitly
- If a maintainer suggests changes you disagree with, discuss respectfully — but ultimately defer to maintainer judgment
  on their project
- Do not force-push during active review without warning — it destroys the reviewer's comment anchors

## After Merge

Clean up your local and remote branches:

```
git checkout main
git pull upstream main
git branch -d fix-login-timeout
git push origin --delete fix-login-timeout
```
