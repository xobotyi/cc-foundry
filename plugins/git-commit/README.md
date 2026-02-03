# git-commit

A Claude Code plugin for structured git commits.

## The Problem

Claude's default commit behavior creates messy history:

**Mixed changes in single commits.** A bug fix, a refactor, and a new feature all land in one commit.
The history becomes impossible to bisect, cherry-pick, or review meaningfully.

**Vague commit messages.** "Fix stuff" or "Update code" tell you nothing. When something breaks,
you can't understand what changed or why by reading the log.

**No validation before commit.** Typos in messages, missing context, forgotten scope prefixes —
errors that could be caught automatically slip through.

**Wrong commit order.** Behavior changes committed before the refactoring that enables them.
Style fixes mixed with logic changes. The commit sequence doesn't tell a coherent story.

## The Solution

This plugin provides a `/commit` command that enforces a structured pipeline. Instead of committing
whatever is staged, it:

1. Analyzes the diff to identify separate logical changes
2. Plans the commit order (style → refactor → fix → feature)
3. Validates each message against conventions before committing
4. Creates focused, atomic commits with meaningful messages

The `commit-message` skill provides formatting conventions that the pipeline enforces via
automated validation.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install git-commit
```

## Usage

```
/commit
```

### The Pipeline

| Step | Purpose |
|------|---------|
| 1. Identify | Find separate logical changes in the diff |
| 2. Plan | Order by type: style → refactor → fix → feature |
| 3. Review | Verify diff matches intent, no debug code |
| 4. Stage | Selective staging per logical unit |
| 5. Validate | Check message against conventions |
| 6. Commit | Display message, then execute |
| 7. Verify | Confirm result matches expectation |

### Message Validation

Before each commit, the message runs through `validate-commit-message.js`:

- **Errors** block the commit — must be fixed
- **Warnings** are recommendations — address if reasonable

Validation checks: subject length, scope format, body presence for non-trivial changes,
trailer format, and more.

## Components

| Type | Path | Purpose |
|------|------|---------|
| Command | `commands/commit/` | 7-step commit pipeline |
| Skill | `skills/commit-message/` | Message formatting conventions |
| Script | `scripts/validate-commit-message.js` | Automated validation |

## Customization

**Message conventions:** Edit `skills/commit-message/SKILL.md` to change formatting rules,
required sections, or scope patterns.

**Validation rules:** Edit `scripts/validate-commit-message.js` to add checks, change severity
levels, or adjust thresholds.

## License

MIT
