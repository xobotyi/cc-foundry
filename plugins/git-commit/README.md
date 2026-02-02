# git-commit

Git commit workflow plugin for Claude Code.

## Features

- `/commit` command with 7-step pipeline
- Commit message conventions via `commit-message` skill
- Automated message validation before commit
- Atomic commit planning and ordering

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install git-commit
```

## Usage

```
/commit
```

### Pipeline

1. **Identify atomic units** — find separate logical changes in diff
2. **Plan commit order** — classify and order (style → refactor → fix → feature)
3. **Self-review** — verify diff matches intent
4. **Stage files** — selective staging per unit
5. **Validate message** — run against convention rules
6. **Commit** — display message, then execute
7. **Verify** — confirm result

### Validation

Messages are validated against `scripts/validate-commit-message.js`:
- Errors must be fixed before committing
- Warnings are recommendations

## Customization

- `skills/commit-message/SKILL.md` — message format conventions
- `scripts/validate-commit-message.js` — validation rules
