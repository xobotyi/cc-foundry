# git-commit

Structured git commit workflow with atomic commits, message validation, and conventions.

## The Problem

**Mixed changes in single commits.** Claude's default commit behavior bundles bug fixes,
refactoring, and new features together. The resulting history is impossible to bisect,
cherry-pick, or review meaningfully. When something breaks, you can't isolate the change that
caused it.

**Vague commit messages.** "Fix stuff" or "Update code" tells future readers nothing. When
debugging at 3am, you need to understand what changed and why by reading the log. Generic
messages waste that opportunity.

**No validation before commit.** Typos in messages, missing context, forgotten scope prefixes,
inconsistent formatting — all slip through. Manual review catches some, but not systematically.

**Wrong commit order.** New behavior committed before the refactoring that enables it. Style
changes mixed with logic changes. The commit sequence doesn't tell a coherent story, making
git bisect and code review harder than necessary.

## The Solution

The `/commit` command enforces an 8-step pipeline that identifies logical units in your diff,
plans their commit order, validates quality, and creates atomic commits with meaningful messages.

Each commit message runs through automated validation before execution. Errors block the commit;
warnings advise. The `commit-message` skill provides formatting conventions that match
professional standards for open-source and team repositories.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install git-commit
```

## Usage

```
/commit
```

The command walks through the complete pipeline automatically. No configuration required for
basic usage.

## The Pipeline

| Step | Purpose |
|------|---------|
| 1. Identify units | Find separate logical changes in the diff |
| 2. Plan order | Sort by type: style → refactor → fix → feature |
| 3. Quality gate | Verify tests/lint pass before committing |
| 4. Self-review | Check diff matches intent, no debug code |
| 5. Stage files | Selective staging per logical unit |
| 6. Validate message | Check conventions via validation script |
| 7. Commit | Display message as blockquote, then execute |
| 8. Verify | Confirm with `git log -1 --stat` and `git status` |

## Message Validation

Before each commit, the message runs through `validate-commit-message.js`:

- **Errors** block the commit and must be fixed
- **Warnings** are recommendations to address if reasonable

Validation checks subject length, scope format, body presence for non-trivial changes, trailer
format, blank line separation, and more.

### Validator Flags

| Flag | Purpose | Example |
|------|---------|---------|
| `--require-trailers` | Require specific trailers in message | `--require-trailers "Task,Fixes"` |

## Project Configuration

Customize commit behavior by adding `<git-commit-config>` to your project's CLAUDE.md:

```xml
<git-commit-config>
<validator-args>
<flag name="require-trailers" value="Task"/>
</validator-args>

<extra-instructions>
All commits must reference a task from the issue tracker.
Use imperative mood for subjects.
</extra-instructions>
</git-commit-config>
```

**`<validator-args>`** — Flags passed to the validator script. Each `<flag name="X" value="Y"/>`
becomes `--X "Y"` on the command line. Use this to enforce project-specific requirements like
mandatory trailers.

**`<extra-instructions>`** — Additional guidance applied during the commit process. These
instructions have highest priority and override plugin defaults. Use for project conventions not
covered by the validator.

## Message Format

The `commit-message` skill defines the expected format:

```
[scope] subject

body

trailers
```

**Subject line:**
- Max 72 characters total
- Imperative mood: "add" not "added"
- Lowercase after scope (except proper nouns)
- No period at end
- Factual description of what changed

**Body:**
- Explains why change was needed
- Describes how to verify the change
- For bug fixes: explain the cause, not just the symptom
- For features: explain the use case
- For refactoring: explain the motivation

**Trailers:**
- Structured key-value pairs following git-trailer format
- Common trailers: `Task:`, `Fixes:`, `Refs:`, `Closes:`, `See:`
- Title-Case keys, single line values

**Breaking changes:**
- Body starts with `BREAKING:` prefix
- Explains what breaks and provides migration path

**Scope:**
- Optional for single-purpose repositories
- Required for monorepos or multi-component projects
- Examples: `[parser]`, `[core/auth]`, `[web/api]`

## Customization

**Message conventions:** Edit `skills/commit-message/SKILL.md` to change formatting rules,
required sections, or scope patterns.

**Validation rules:** Edit `scripts/validate-commit-message.js` to add checks, change severity
levels, or adjust thresholds.

## License

MIT
