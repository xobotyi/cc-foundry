# git-commit Plugin

Structured git commit workflow with atomic commits, message validation, and conventions.

## Skills

- **`commit`** — commit pipeline: survey changes → plan units → quality gate → commit loop (stage → draft → self-review
  → validate → commit) → verify
- **`commit-message`** — Message formatting conventions and structure rules

## Scripts

- **`validate-commit-message.js`** — Pre-commit message validation (errors block, warnings advise)

## Workflow

1. `commit` skill loads `commit-message` skill first for formatting rules
2. Pipeline identifies logical units in the diff and plans the commit order
3. Quality gate checks pass before the commit loop
4. Each message is drafted to a file, validated, then committed with `git commit -F`
5. Final verification with `git log` and `git status`

## Validator Flags

- **`--require-trailers`** — Comma-separated list of required trailers (e.g., `--require-trailers "Task,Fixes"`)

## Project Configuration

Projects customize commit behavior via `<git-commit-config>` in their CLAUDE.md:

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
- **`<extra-instructions>`** — Highest priority guidance during commit process. Overrides plugin defaults.

## Conventions

**Commit message structure:**

- Subject line: `[scope] verb description` (max 72 chars, factual, imperative mood)
- Body: explains why the change was needed and how to verify it; records the change — documentation belongs in the
  artifact (code comments, design docs, README)
- Trailers: structured metadata (Task, Fixes, Refs, etc.)

**Scope usage:**

- Use for monorepos or multi-component repositories
- Omit for single-purpose repositories
- Determined from file paths, not contents

**Breaking changes:**

- Body starts with `BREAKING:` prefix
- Explains what breaks and migration path

**ASCII symbols only:**

- No decorative Unicode (em dashes, arrows, fancy quotes, emoji, bullet symbols)
- Use ASCII equivalents (`--`, `->`, `-`, straight quotes)
- Non-English prose is fine; the restriction is on typographic Unicode

**No AI attribution:**

- No "Generated with Claude Code" or similar
- No "Co-Authored-By: Claude" trailers
- Commits appear as regular developer work

**Skill prose (both SKILL.md files):**

- Written in ASD-STE100 Simplified Technical English — keep edits in that style
- One instruction per sentence; 20 words max in a procedure, 25 in a description
- Active voice, imperative mood, no gerunds: "stage the file", not "staging the file"
- One term per concept: `unit` for one logical change, plus `subject`, `body`, `trailer`, `staged`, `unstaged`,
  `untracked`
- Em dashes only as KV-list separators, never inside a sentence
- Code fences carry a language label (` ```text `) — unlabeled fences get reflowed by the prettier MDX parser
- Frontmatter `description` is exempt — it is an activation surface and follows the `skill-engineering` formula

## Extension Points

- `skills/commit/SKILL.md` — commit pipeline workflow
- `skills/commit-message/SKILL.md` — message format conventions
- `scripts/validate-commit-message.js` — validation rules
