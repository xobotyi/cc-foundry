# Fork and Submission Mechanics

Git and `gh` operations for contributing to a repository you cannot push to.

## Fork setup

```bash
gh repo fork OWNER/REPO --clone
```

This forks, clones, and configures `upstream` in one step. Done by hand instead:

```bash
git clone git@github.com:YOUR-USERNAME/REPO.git
cd REPO
git remote add upstream https://github.com/OWNER/REPO.git
git remote -v   # origin = your fork, upstream = the original
```

## Branch discipline

- Never commit to the fork's default branch. Branch per contribution, from current upstream.
- Name the branch for the change: `fix-login-timeout`, `add-rate-limiting`.
- One logical change per branch. A second unrelated fix is a second branch.

```bash
git fetch upstream
git checkout -b fix-login-timeout upstream/main
```

Branching directly from `upstream/main` avoids the stale-fork problem entirely — the local default branch is never in
the path.

## Syncing before submission

Rebase onto current upstream so the maintainer gets a clean merge and reviews only your changes:

```bash
git fetch upstream
git rebase upstream/main
```

To update the fork's own branch on GitHub, `gh repo sync YOUR-USERNAME/REPO -b main`, or fetch and merge locally and
push. Syncing locally does not update the fork on GitHub; that needs a push.

Resolve conflicts during the rebase rather than leaving them for the reviewer. A PR with conflict markers or a "merge
upstream" commit in the middle of the history reads as unfinished.

## Pre-submission cleanup

- **Squash the noise.** Commits named "fix typo", "oops", "address review" belong folded into the commits they fix.
  Maintainers read history; a debugging journal in it costs them time.
- **Run what CI runs.** Read the workflow files to learn which tests, linters, and formatters will execute, and run
  those locally with the project's own configuration rather than your preferred tooling.
- **Read your own diff** — `git diff upstream/main...HEAD` — looking for accidentally committed files (editor configs,
  `.env`, build artifacts), debug output, commented-out code, unrelated formatting churn, and anything that is not the
  one change.

## Submitting

```bash
gh pr create \
  --title "Fix login timeout on slow connections" \
  --base main \
  --body-file pr-description.md
```

Flags that matter here:

- **`--dry-run`** prints the PR that would be created instead of creating it. This is the right way to assemble a draft
  for the user's approval — it renders exactly what would be submitted without submitting it. It may still push the
  branch, so check the branch state before running it.
- **`--body-file`** keeps a long description out of shell quoting. `-` reads standard input.
- **`--draft`** opens the PR as a draft. Useful where a project invites early feedback on approach, and where the
  maintainer has agreed to look at a work in progress.
- **`--head USER:BRANCH`** selects a head repository explicitly and skips `gh`'s forking and pushing prompts.
- **`--template FILE`** starts the body from the project's template.
- **`--no-maintainer-edit`** disables maintainer pushes to your branch.

**Maintainer edits are enabled by default** when `gh` creates the PR, and by default this is what you want: it lets a
maintainer push a small fix instead of asking for another round trip.

The exception is worth knowing. GitHub's documentation warns that where the fork contains GitHub Actions workflows the
option becomes "Allow edits and access to secrets by maintainers", and that allowing it "also allows a maintainer to
edit the forked repository's workflows, which can potentially reveal values of secrets and grant access to other
branches." Where the fork holds workflows and secrets, raise it with the user rather than deciding for them.

## Checking status after submission

```bash
gh pr checks          # CI status for the current branch's PR
gh pr view --comments # review feedback
```

A red check is the contributor's problem to fix, not the reviewer's to report. Each additional failing check measurably
lowers the odds of a merge.

## Responding to review

- **Push to the same branch.** The PR updates itself. Opening a replacement PR discards the discussion and reads as
  starting over.
- **Answer in your own words.** Pasting a reviewer's comment into a model and pasting the reply back is named explicitly
  in project policy as a waste of the reviewer's time and a breach of trust. The reviewer is asking a person what they
  think.
- **Do not force-push during active review.** It detaches the comments a reviewer has already anchored to specific
  lines. Where history must be rewritten, say so first.
- **Re-request review explicitly** once feedback is addressed, and say what changed.
- **Disagree once, then defer.** State the reasoning, and accept the maintainer's call on their own project.
- **Follow through.** Abandonment after feedback is a measured agent-specific failure pattern, and it is the one that
  costs future contributions the most.

## After the merge

```bash
git checkout main
git fetch upstream && git merge upstream/main
git branch -d fix-login-timeout
git push origin --delete fix-login-timeout
```
