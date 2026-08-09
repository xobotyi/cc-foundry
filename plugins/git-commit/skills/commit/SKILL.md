---
name: commit
description: >-
  Git commit workflow pipeline: atomic unit identification, commit ordering, quality gates,
  message validation, and post-commit verification. Invoke whenever task involves any interaction
  with git commits — committing changes, staging work, splitting diffs into atomic units, or
  preparing work for version control.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git restore:*), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-commit-message.js:*)
---

# Commit Pipeline

<prerequisite>
**Invoke the commit-message skill first** to load the message conventions:

```
Skill(git-commit:commit-message)
```

Do not start the pipeline before that skill is loaded.

</prerequisite>

## Context

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Staged: !`git diff --cached --stat`
- Unstaged: !`git diff --stat`
- Recent commits: !`git log --oneline -5`

If Status shows no changes, report that there is nothing to commit and stop.

## Project Configuration

<project-config>
A project can define commit requirements in its CLAUDE.md with `<git-commit-config>`:

```xml
<git-commit-config>
<validator-args>
<flag name="require-trailers" value="Task"/>
</validator-args>

<extra-instructions>
Project-specific commit guidance goes here.
</extra-instructions>
</git-commit-config>
```

**Before the pipeline starts**, check the project CLAUDE.md for `<git-commit-config>`:

- **`<validator-args>`** — pass each flag to the validator: `<flag name="X" value="Y"/>` becomes `--X "Y"` on the
  command line.
- **`<extra-instructions>`** — the highest-priority guidance for this commit process. Follow it through the whole
  pipeline; it overrides the defaults here. </project-config>

## Ground Rules

<command-format>
**One git command per Bash call.** Each git and validator invocation is a single command that
starts with `git` or `node`. Do not chain these commands with `&&`, `||`, or `;`. Do not pipe
input into git. This rule covers git and validator calls only — Quality Gate checks (tests, lint,
build) use the project's usual commands.
</command-format>

<pipeline-awareness>
**Context drift prevention.** The Quality Gate can branch into fixes, test runs, and debugging
that span many turns. Before each git command, confirm your position:

1. Am I in the commit pipeline?
2. Which pipeline step am I on?
3. Are the earlier steps complete?

Refer to steps by name ("resuming the Commit Loop at Self-Review"). When uncertain, re-read the staged changes with
`git diff --cached` to re-anchor. </pipeline-awareness>

## Pipeline

### 1. Survey Changes

Review the full diff and identify the separate logical changes:

```bash
git diff HEAD
```

<atomic-commit-rule>
**One logical change per commit.** Boundaries to look for:

- Different files that serve different purposes
- Formatting or style changes mixed with logic changes
- Refactoring mixed with new behavior
- Unrelated bug fixes bundled together

Each independent change becomes its own commit — a unit. </atomic-commit-rule>

### 2. Plan Units and Order

Classify each unit and plan the commit order:

- **Style (1st)** — formatting, whitespace, naming
- **Refactor (2nd)** — restructuring without behavior change
- **Fix (3rd)** — bug corrections
- **Feature (4th)** — new functionality
- **Docs / Test / Chore (any)** — documentation, tests, build and tooling

Commit style and refactor units first — this keeps the behavior-changing commits clean. Dependency order wins over type
order: when a fix builds on a feature, the feature commits first. Tests that cover a unit belong in that unit's commit,
not in a separate test commit.

### 3. Quality Gate

<quality-gate>
**Make sure the quality checks pass before any commit.**

1. Were lint, test, or build commands run earlier in this session for the changed files, and did they pass? Then enter
   the Commit Loop.
2. If not verified: run the checks that apply to this project. Scope them to the changed files when possible.
3. On failure: fix the problems first. Do not commit broken code.
4. On success: enter the Commit Loop.

Gate results stay out of the commit message — they are session artifacts (see the commit-message conventions).

After you return from fixes, re-read `<pipeline-awareness>` above and resume at the start of the Commit Loop — do not
restart the pipeline and do not skip steps. </quality-gate>

### 4. Commit Loop

Run the steps below for each unit, in the planned order.

#### 4a. Stage

```bash
git add <files>
```

Stage by explicit file path. Do not use `git add -p` and do not pipe input into interactive commands — they break tool
permission matching. If the wrong file is staged, unstage it:

```bash
git restore --staged <file>
```

If one file interleaves two units: back out one change with the Edit tool, commit the first unit, then restore the
change — or accept the broader staging and record both units in the message.

#### 4b. Draft Message

Write the message for this unit per the commit-message conventions. Save it to `/tmp/commit-msg.txt` with the Write tool
— a file passes multi-line messages, quotes, and backticks to git intact, where shell quoting would mangle them.

#### 4c. Self-Review

```bash
git diff --cached
```

Verify before continuing:

- [ ] The staged diff contains only the intended unit — no debug code, no temp files
- [ ] The staged diff matches the drafted message
- [ ] No sensitive data (.env, credentials, secrets)
- [ ] The message follows the commit-message conventions — terse register, no session artifacts, record not
      documentation

#### 4d. Validate

<mandatory>
Validate the drafted message:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-commit-message.js --file /tmp/commit-msg.txt
```

- Add the flags from `<validator-args>` when the project config defines them
- Fix every ERROR before you continue
- WARN issues are recommendations — address them when reasonable
- Do not commit until validation passes without errors
  </mandatory>

#### 4e. Commit

Display the full message as a blockquote, then commit:

```bash
git commit -F /tmp/commit-msg.txt
```

### 5. Verify

After the last unit, run each command as a separate Bash call:

```bash
git log --stat -3    # -3 = the number of commits created
```

```bash
git status
```

## Breaking Changes

A commit that breaks backward compatibility starts its body with `BREAKING:` and explains the migration path — the
commit-message conventions define the format. When the break can be staged out, prefer a migration series: add the new
code, migrate the callers, remove the old code in a later commit.

## Output

After all commits, show:

- The created commits with their subjects
- The current branch status
- Any remaining uncommitted changes

<critical>
- One logical change per commit — split; do not bundle.
- Draft, validate, then commit. Never run `git commit` with a message that failed validation.
- The message records the change; it does not document the artifact.
- Session artifacts — test counts, gate status, verification stories — never enter the message.
</critical>
