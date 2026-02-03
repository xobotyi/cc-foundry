---
name: commit
description: Create git commit following conventions
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git reset:*), Bash(git restore:*), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-commit-message.js)
---

<prerequisite>
**Invoke commit-message skill first** to load formatting conventions:

```
Skill(git-commit:commit-message)
```

Do not proceed without loading the skill.
</prerequisite>

## Context

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Staged: !`git diff --cached --stat`
- Unstaged: !`git diff --stat`
- Recent commits: !`git log --oneline -5`

## Project Configuration

<project-config>
Projects can define commit requirements in their CLAUDE.md using `<git-commit-config>`:

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

**Before starting the pipeline**, check project CLAUDE.md for `<git-commit-config>`:

1. **`<validator-args>`** — Pass all defined flags directly to the validator.
   Each `<flag name="X" value="Y"/>` becomes `--X "Y"` in the command.

2. **`<extra-instructions>`** — Highest priority guidance for this commit process.
   Follow these instructions throughout the pipeline. They override defaults.
</project-config>

## Commit Pipeline

<pipeline-awareness>
**Context drift prevention.** Steps like Quality Gate may require fixing
code, running tests, or debugging — work that can span many turns. Before
executing any git command, verify you haven't lost the pipeline:

1. **Am I in the commit pipeline?** (If not, return to step 1)
2. **Which step am I on?**
3. **Were prior steps completed?**

If uncertain, re-read staged changes with `git diff --cached` to re-anchor.
</pipeline-awareness>

### 1. Identify Atomic Units

Review the diff and identify **separate logical changes**:

```bash
git diff HEAD          # All changes
git diff --cached      # Staged only
```

<atomic-commit-rule>
**One logical change per commit.** Look for boundaries:

- Different files serving different purposes
- Formatting/style changes mixed with logic changes
- Refactoring mixed with new behavior
- Unrelated bug fixes bundled together

Each independent change becomes its own commit.
</atomic-commit-rule>

### 2. Plan Commit Order

For each identified unit, classify and order:

| Type | Order | Description |
|------|-------|-------------|
| Style | 1st | Formatting, whitespace, naming |
| Refactor | 2nd | Code restructuring, no behavior change |
| Fix | 3rd | Bug corrections |
| Feature | 4th | New functionality |
| Docs | any | Documentation only |
| Test | any | Adding or fixing tests |
| Chore | any | Build, tooling, dependencies |

**Commit style/refactor first** — keeps behavior-changing commits clean.

### 3. Quality Gate

<quality-gate>
**Before committing, ensure code quality checks pass.**

1. **Review context:** Were lint/test/build commands run earlier in this
   session for the changed files? If yes and they passed, proceed.

2. **If not verified:** Run appropriate quality checks for the project.
   Use your knowledge of the codebase to determine what checks apply.
   Scope to changed files when possible for faster feedback.

3. **On failure:** Fix issues before proceeding. Do not commit broken code.

4. **On success:** Continue to self-review.

**After returning from fixes:** Re-read `<pipeline-awareness>` above.
Verify you're resuming at step 4, not starting over or skipping steps.
</quality-gate>

### 4. Self-Review Before Commit

Before each commit, verify:

- [ ] Diff contains only intended changes (no debug code, temp files)
- [ ] Changes match the commit message you're about to write
- [ ] No unrelated changes bundled together
- [ ] Sensitive data excluded (.env, credentials, secrets)

```bash
git diff --cached      # Review exactly what will be committed
```

### 5. Stage Files

For each logical unit:

```bash
# Stage specific files/hunks
git add <files>
git add -p             # Interactive: stage specific hunks
```

### 6. Validate Message

<mandatory>
**Before committing, validate the message against conventions:**

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-commit-message.js [validator-args] --msg "<commit-message>"
```

- If `<validator-args>` exists in project config, include those flags
- Fix any ERROR issues before proceeding
- WARN issues are recommendations — address if reasonable
- Do not commit until validation passes without errors
</mandatory>

### 7. Commit

**Before executing git commit, display the full message as a blockquote.**

Then commit:

```bash
git commit -m "<validated-message>"
```

### 8. Verify

After committing:

```bash
git log -1 --stat      # Verify commit content
git status             # Confirm working tree state
```

## Breaking Changes

When a commit breaks backward compatibility:

<breaking-change-process>
1. **Prefer incremental migration:**
   - Add new code without removing old
   - Migrate callers from old to new
   - Remove old code when no callers remain

2. **If breaking in single commit:**
   - Start body with `BREAKING:` prefix
   - Explain what breaks and migration path
   - Link to migration docs if available
</breaking-change-process>

## Output

After completing all commits, show:
1. List of created commits with subjects
2. Current branch status
3. Any remaining uncommitted changes
