# git-commit Plugin

Git commit workflow with conventions and validation.

## Components

| Type | Name | Purpose |
|------|------|---------|
| Command | `/commit` | 8-step commit pipeline |
| Skill | `commit-message` | Message formatting conventions |
| Script | `validate-commit-message.js` | Message validation |

## Workflow

1. `/commit` loads `commit-message` skill for formatting rules
2. Pipeline: identify units → plan order → quality gate → self-review → stage → validate → commit → verify
3. Validation script runs before each commit (errors block, warnings advise)
4. Commit message displayed as blockquote before execution

## Validator Flags

| Flag | Purpose | Example |
|------|---------|---------|
| `--require-trailers` | Comma-separated list of required trailers | `--require-trailers "Task,Fixes"` |

## Project Configuration

Projects can override commit behavior via `<git-commit-config>` in their CLAUDE.md:

```xml
<git-commit-config>
<validator-args>
<flag name="require-trailers" value="Task"/>
</validator-args>

<extra-instructions>
Project-specific commit guidance here.
</extra-instructions>
</git-commit-config>
```

- **`<validator-args>`** — Flags passed to validator. Each `<flag name="X" value="Y"/>` becomes `--X "Y"`.
- **`<extra-instructions>`** — Highest priority guidance during commit process.

## Extension Points

- `skills/commit-message/SKILL.md` — message format conventions
- `scripts/validate-commit-message.js` — validation rules