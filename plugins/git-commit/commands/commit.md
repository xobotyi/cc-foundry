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

## Commit Pipeline

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

### 3. Self-Review Before Commit

Before each commit, verify:

- [ ] Diff contains only intended changes (no debug code, temp files)
- [ ] Changes match the commit message you're about to write
- [ ] No unrelated changes bundled together
- [ ] Sensitive data excluded (.env, credentials, secrets)

```bash
git diff --cached      # Review exactly what will be committed
```

### 4. Stage Files

For each logical unit:

```bash
# Stage specific files/hunks
git add <files>
git add -p             # Interactive: stage specific hunks
```

### 5. Validate Message

<mandatory>
**Before committing, validate the message against conventions:**

```bash
echo "<commit-message>" | node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-commit-message.js
```

- Fix any ERROR issues before proceeding
- WARN issues are recommendations — address if reasonable
- Do not commit until validation passes without errors
</mandatory>

### 6. Commit

**Before executing git commit, display the full message as a blockquote.**

Then commit:

```bash
git commit -m "<validated-message>"
```

### 7. Verify

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
