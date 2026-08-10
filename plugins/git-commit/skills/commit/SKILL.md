---
name: commit
description: >-
  Git commit workflow pipeline: atomic unit identification, commit ordering, quality gates,
  message validation, and post-commit verification. Invoke whenever task involves any interaction
  with git commits — committing changes, staging work, splitting diffs into atomic units, or
  preparing work for version control.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git restore:*), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-commit-message.js:*)
---

# Commit Pipeline

<prerequisite>
**Load the commit-message skill first.** It gives the message conventions.

```text
Skill(git-commit:commit-message)
```

Do not start the pipeline before that skill is loaded.

</prerequisite>

## Context

- Status: !`git status --short --branch`
- Recent commits (all refs): !`git log --oneline -5 --all`

The first status column shows the staged state. The second column shows the unstaged state. The `??` mark shows an
untracked file.

If the status shows no change, tell the user that there is nothing to commit. Then stop.

## Project Configuration

<project-config>
A project can define its commit requirements in its CLAUDE.md file. The requirements are in a
`<git-commit-config>` block:

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

Read the project CLAUDE.md file before the pipeline starts. Then obey the two elements:

- **`<validator-args>`** — give each flag to the validator. `<flag name="X" value="Y"/>` becomes `--X "Y"` on the
  command line.
- **`<extra-instructions>`** — the guidance with the highest priority for this commit. Obey it in each step. It
  overrides the defaults of this skill.

</project-config>

## Ground Rules

<command-format>
**Run one git command in each Bash call.** Each git call and each validator call is one command
that starts with `git` or `node`. Do not join these commands with `&&`, `||`, or `;`. Do not send
input into git through a pipe. This rule covers the git calls and the validator calls only. The
Quality Gate uses the usual commands of the project.
</command-format>

<no-commits-yet>
**A repo can have no commits.** The status output then starts with `## No commits yet on <branch>`.
`HEAD` does not exist in this condition. Each command that reads `HEAD` fails with the message
`fatal: ... does not have any commits yet`. These commands fail: `git diff HEAD`, `git log` without
`--all`, and `git show`. Use `git status --short` and `git diff --cached` in their place. Both work
on a branch with no commits. The first commit itself is a normal commit.
</no-commits-yet>

<pipeline-awareness>
**A long step can cause context drift.** The Quality Gate can start code fixes, test runs, and
debug work. Such work can continue for many turns. Answer these three questions before each git
command:

1. Am I in the commit pipeline?
2. Which step am I on?
3. Are the steps before it complete?

Name the step when you report your position. Write "resuming the Commit Loop at Self-Review". If you are not sure, read
the staged changes again with `git diff --cached`.

</pipeline-awareness>

## Pipeline

### 1. Survey Changes

Read the changes and find the separate units:

```bash
git diff               # unstaged changes to tracked files
git diff --cached      # staged changes
```

Neither command shows an untracked file. `git status --short` marks an untracked file with `??`. Stage such a file with
an explicit path. In a repo with no commits, all files are untracked.

<atomic-commit-rule>
**Make one commit for each logical change. One logical change is one unit.** These conditions show
a boundary between two units:

- The files serve different purposes.
- The diff mixes format changes with logic changes.
- The diff mixes a refactor with new behavior.
- The diff holds more than one unrelated bug fix.

</atomic-commit-rule>

### 2. Plan Units and Order

Give a type to each unit. Then commit the types in this order:

1. **Style** — format, whitespace, and names.
2. **Refactor** — structure changes that keep the behavior.
3. **Fix** — bug corrections.
4. **Feature** — new functions.
5. **Docs, test, and chore** — documentation, tests, build, and tooling. Commit these units at any position.

Commit the style units and the refactor units first. This keeps the commits that change behavior clean.

Dependency order has priority over type order. If a fix builds on a feature, commit the feature first. Put the tests of
a unit in the commit of that unit. Do not make a separate test commit.

### 3. Quality Gate

<quality-gate>
**Make sure that the quality checks pass before each commit.**

1. Did the lint, test, or build commands run for the changed files in this session? If they ran and passed, start the
   Commit Loop.
2. If no check ran, run the checks that apply to this project. Limit them to the changed files when this is possible.
3. If a check fails, correct the problem first. Do not commit defective code.
4. If all checks pass, start the Commit Loop.

Keep the gate results out of the commit message. They are session artifacts. The commit-message conventions give the
rule.

Read `<pipeline-awareness>` again after you return from the fixes. Then continue at the first step of the Commit Loop.
Do not start the pipeline again. Do not skip a step.

</quality-gate>

### 4. Commit Loop

Do the steps below for each unit, in the planned order.

#### 4a. Stage

```bash
git add <files>
```

Give an explicit path for each file. Do not use `git add -p`. Do not send input into an interactive command through a
pipe. These two methods break the match against the tool permissions.

To unstage the wrong file:

```bash
git restore --staged <file>
```

One file can hold two units. Do one of these two things:

- Remove one change with the Edit tool, commit the first unit, then write the change again.
- Accept the larger commit, and record both units in the message.

#### 4b. Draft Message

Write the message of this unit. Obey the commit-message conventions. Save the message to `/tmp/commit-msg.txt` with the
Write tool. A file gives git the multi-line message, the quotes, and the backticks without damage. Shell quoting damages
them.

#### 4c. Self-Review

```bash
git diff --cached
```

Verify each item before you continue:

- [ ] The staged diff holds only the intended unit. It has no debug code and no temporary file.
- [ ] The staged diff agrees with the drafted message.
- [ ] The staged diff has no sensitive data such as an `.env` file, a credential, or a secret.
- [ ] The message obeys the commit-message conventions: terse register, no session artifacts, a record and not
      documentation.

#### 4d. Validate

<mandatory>
Validate the drafted message:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-commit-message.js --file /tmp/commit-msg.txt
```

- Add the flags from `<validator-args>` when the project config defines them.
- Correct each ERROR before you continue.
- A WARN is a recommendation. Correct it when the correction is reasonable.
- Do not commit until the validator reports no error.

</mandatory>

#### 4e. Commit

Show the full message to the user as a blockquote. Then commit:

```bash
git commit -F /tmp/commit-msg.txt
```

### 5. Verify

Run each command in a separate Bash call after the last unit:

```bash
git log --stat -3    # -3 = the number of commits that you created
```

```bash
git status
```

## Breaking Changes

A commit that breaks backward compatibility starts its body with `BREAKING:`. The body gives the migration path. The
commit-message conventions define the format.

Prefer a migration series when you can stage the break:

1. Add the new code. Keep the old code.
2. Move the callers to the new code.
3. Delete the old code in a later commit.

## Output

Show this data after the last commit:

- The new commits with their subjects.
- The status of the current branch.
- The changes that are not committed.

<critical>
- One unit for each commit. Split the work. Do not bundle it.
- Draft the message, validate it, then commit. Never commit a message that failed the validation.
- The message records the change. It does not document the artifact.
- Session artifacts never enter the message. Test counts, gate status, and verification stories stay out.
</critical>
