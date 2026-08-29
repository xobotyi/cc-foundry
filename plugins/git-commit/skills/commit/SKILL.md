---
name: commit
description: >-
  Git commit workflow pipeline: atomic unit identification, commit ordering, quality gates,
  message validation, and post-commit verification.
when_to_use: >-
  Invoke when work reaches a committable state — a verified step finished, or the user asked to
  commit, stage, or split a diff. Invoke during the work, before the tree grows past one unit, not
  once at the end of the task. Also invoke on the symptoms: a tree holding several unrelated
  changes, a commit that needs an amend, or a message the validator rejected.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git restore:*), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-commit-message.js:*)
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
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
input into git through a pipe. A joined command and a piped command both fall outside the tool
permissions of this skill. This rule covers the git calls and the validator calls only. The Quality
Gate uses the usual commands of the project.
</command-format>

<permission-window>
**The tool permissions of this skill last for one turn.** The `allowed-tools` list grants the git
commands without a prompt, and the grant clears when the user sends the next message. The pipeline
crosses that boundary often, because the Quality Gate can run for many turns.

A permission prompt for `git add` or `git commit` in the middle of the pipeline shows that the grant expired. Invoke
this skill again to restore it. The dynamic context of this skill changes between invocations, so the full skill content
enters the context a second time.

</permission-window>

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

## When to Commit

Run this pipeline during the work. Do not save it for the end of the task.

- Plan the units before the work starts. This pipeline then takes one planned unit at a time.
- Commit each verified step. The next step then builds on a committed base.
- An uncommitted tree holds no unit. A reviewer cannot read it. `git bisect` cannot use it.
- A tree with many units at entry shows a planning fault. Interleaved work splits badly. Split what separates cleanly.
  Then plan the change list before the next task.
- The `coding` skill of `the-coder` gives the change list and the size checkpoint.

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
**Make one commit for each logical change. One logical change is one unit.** A unit is the smallest
change that keeps the tree in a working state. A unit is not the whole task. One task gives many
units.

Two tests find the boundaries. Apply both:

- **The split test.** Cut the change into two pieces. Does each piece build and pass its tests? Then the change holds
  more than one unit. Commit the first piece. Apply the test again to the rest.
- **The work-kind test.** A unit does one kind of work, because a reviewer answers one question in each unit. New code
  and the wiring that integrates it are two units. A refactor and the feature it makes possible are two units. The split
  test misses both boundaries, because both pieces build and pass together.

These conditions show a boundary between two units:

- The files serve different purposes.
- The diff mixes format changes with logic changes.
- The diff mixes a refactor with new behavior.
- The diff holds more than one unrelated bug fix.
- The diff adds new code and also wires that code into its callers.
- One part of the diff builds and passes its tests alone.

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

<gate-scope>
**The gate proves the tree, not each commit.** The checks run one time, on the full tree. The commit
loop then makes several commits. The working tree holds every unit during the loop, so a check that
runs inside the loop still tests the full tree, and not the staged unit.

The split test asserts that each unit builds and passes alone. This pipeline does not measure that assertion, and a
check inside the loop cannot measure it either. A wrong split leaves a broken commit in the middle of the history, and
`git bisect` finds it much later.

Two habits keep the risk low. Commit a unit before the unit that depends on it. Give more care to the split test when a
unit removes code, changes a signature, or moves a symbol, because these three cases break the callers that a later unit
corrects.

</gate-scope>

### 4. Commit Loop

Do the steps below for each unit, in the planned order.

#### 4a. Stage

```bash
git add <files>
```

Give an explicit path for each file. Do not use `git add -p`: it opens an interactive prompt, and the Bash tool has no
terminal to answer it. Do not send input into an interactive command through a pipe, because a piped command falls
outside the tool permissions of this skill.

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

Write the reason first, in one paragraph. Then cut: delete each sentence that the diff shows, and each paragraph that
walks the reader through the new procedure. A fact the next maintainer needs lives in the artifact -- a name, a test, a
doc comment, or a project document -- not in the message.

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

<body-audit>
**Audit the body against the staged diff. Write the audit in your reply.** Give one line for each body paragraph:

```text
P1: keep -- <the fact that it records>
P2: cut -- shown by the diff
P3.1: keep -- <the fact that it records>
P3.2: cut -- inventory of the diff
```

A paragraph earns `keep` only when it records one of these facts:

- The cause of the change.
- A second reason that another paragraph does not carry.
- A `BREAKING:` declaration, or a step of the migration path.
- A behavior change that the subject cannot predict, such as the new meaning of an absent value.
- The work that follows in the chain, in one line.

A paragraph can hold a list. One unit that changes several behaviors gives one line to each change. Audit such a
paragraph line by line, as `P3.1` and `P3.2` above. A line that names a file, a function, or a test inventories the
diff. Cut it. A line that states the old behavior beside the new one duplicates the diff. Cut the contrast and keep the
new behavior, unless the old behavior is the cause of a fix or the thing that a `BREAKING:` change removes.

A paragraph gets `cut` when it names a function, a call order, an empty case, a fallback, or a flag that gates the new
code. Such a paragraph reports the procedure, and the staged diff shows the procedure. Move the fact into the artifact
when the next maintainer needs it. Then delete the paragraph.

The number of paragraphs follows the number of reasons, never the size of the diff. Write the message file again after
the deletions.

</body-audit>

#### 4d. Validate

<mandatory>
Validate the drafted message:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-commit-message.js --file /tmp/commit-msg.txt
```

- Add the flags from `<validator-args>` when the project config defines them.
- Read the output. The validator prescribes; it does not block. It exits with status 0 even when it prints an ERROR, so
  the exit status tells you nothing about the message.
- Correct each ERROR before you continue.
- A WARN is a recommendation. Correct it when the correction is reasonable.
- Do not commit until the validator reports no error.

The validator checks the subject length, the trailing period, the filler tics of the subject, the blank line after the
subject, the presence of a body, and the required trailers. It does not check the ASCII rule, the 72-character body
wrap, the scope format, or the register. You own those.

</mandatory>

#### 4e. Commit

Show the full message to the user as a blockquote. Then commit:

```bash
git commit -F /tmp/commit-msg.txt
```

A project hook can stop the commit or change the files. Read the output. A hook that exits with an error stops the
commit, and the message file stays for the next attempt. A hook that reformats a file does not stage that reformat: the
commit holds the content that you staged, and the reformat stays in the working tree as an unstaged change. Run
`git status` after the commit and amend the commit when the reformat belongs to the same unit. Do not pass
`--no-verify`.

### 5. Verify

Run each command in a separate Bash call after the last unit:

```bash
git log --stat -3    # -3 = the number of commits that you created
```

```bash
git status
```

Then show the new commits with their subjects, the state of the current branch, and the changes that are still not
committed.

## Breaking Changes

A commit that breaks backward compatibility starts its body with `BREAKING:`. The body gives the migration path. The
commit-message conventions define the format.

Prefer a migration series when you can stage the break:

1. Add the new code. Keep the old code.
2. Move the callers to the new code.
3. Delete the old code in a later commit.

<critical>
- One unit for each commit. Split the work. Do not bundle it.
- Draft the message, validate it, then commit. Never commit a message that failed the validation.
- The message records the change. It does not document the artifact.
- Audit each body paragraph against the staged diff. A paragraph that reports the procedure gets cut.
- Session artifacts never enter the message. Test counts, gate status, and verification stories stay out.
</critical>
