# git-commit Plugin

Structured git commit workflow with atomic commits, message validation, and conventions.

## Skills

- **`commit`** — commit pipeline: survey changes → plan units → quality gate → commit loop (stage → draft → self-review
  with body audit → validate → commit) → verify. Runs during the work at each verified step, not once at the end
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
- Body shape: default is one paragraph; each further paragraph must earn its lines with a reason, a `BREAKING:`
  declaration, a migration step, an unpredictable behavior change, or a one-line chain note. Length follows the number
  of reasons, not the size of the diff
- Several behavior changes under one reason: one line each in one list, never a paragraph each. A line naming a file, a
  function, or a test is an inventory of the diff. Independent reasons split into separate commits instead
- Body audit: step 4c of the pipeline writes one `keep`/`cut` line per paragraph against the staged diff, and per list
  line inside a paragraph. A paragraph that reports the procedure (function, call order, empty case, fallback, gating
  flag) gets cut — the audit is written out, not silent, so the user sees the verdicts
- Trailers: structured metadata (Task, Fixes, Refs, etc.)

**Commit timing:**

- The pipeline is not an end-of-task activity — a tree holding many units at entry is a process fault to name, not just
  to split
- Change size is not this plugin's rule. `the-coder`'s `coding` skill owns the size checkpoint that triggers a commit;
  this plugin owns unit boundaries, messages, and validation

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
