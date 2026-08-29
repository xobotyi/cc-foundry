# git-commit Plugin

Structured git commit workflow with atomic commits, message validation, and conventions. Ships standalone: it assumes no
other cc-foundry plugin is installed.

## Skills

- **`commit`** — commit pipeline: survey changes → plan units → quality gate → commit loop (stage → draft → self-review
  with body audit → validate → commit) → verify. Runs during the work at each verified step, not once at the end
- **`commit-message`** — message format conventions: structure, subject, scope, body shape, terse register, breaking
  changes, trailers, amends. Model-invocable only (`user-invocable: false`)

## Scripts

- **`validate-commit-message.js`** — commit message checks, printed as `ERROR:` and `WARN:` lines

## Workflow

1. `commit` loads `commit-message` through its `<prerequisite>` block before the pipeline starts
2. The pipeline identifies logical units in the diff and plans the commit order
3. The quality gate passes before the commit loop
4. Each message is drafted to a file, audited against the staged diff, validated, then committed with `git commit -F`
5. Final verification with `git log --stat` and `git status`

## Validator Contract

- **The validator prescribes; it does not block.** It exits with status 0 even when it prints an `ERROR:` line, so the
  exit status carries no verdict. The pipeline refuses to commit, not the script. Any doc that says errors "block the
  commit" is wrong
- **What it checks** — subject length (<10 and >72, both WARN), trailing period (ERROR), two subject filler-tic regexes
  (WARN), blank line after the subject (ERROR), presence of a body (WARN), required trailers (ERROR)
- **What it does not check** — the ASCII rule, the 72-character body wrap, the scope format, the register, AI
  attribution. Those are prose rules the agent owns. Keep this list in sync with `commit/SKILL.md` step 4d
- **`--require-trailers`** — comma-separated list of trailer names that must be present, e.g.
  `--require-trailers "Task,Fixes"`

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

- **`<validator-args>`** — flags passed to the validator. Each `<flag name="X" value="Y"/>` becomes `--X "Y"`
- **`<extra-instructions>`** — highest priority guidance during the commit process. Overrides plugin defaults

## Design Decisions

- **`commit` stays model-invocable.** The workflow archetype defaults to `disable-model-invocation: true` for
  side-effecting skills, and the Claude Code docs name `/commit` as the example. This plugin declines it: the pipeline's
  thesis is that it runs during the work at each verified step, and that flag would leave only the user able to fire it.
  A commit skill the agent cannot reach cannot govern autonomous work
- **`commit-message` is `user-invocable: false`, not `disable-model-invocation`.** It is background knowledge, not a
  user action — and `disable-model-invocation` would break the `Skill(git-commit:commit-message)` composition that
  `commit` depends on
- **`allowed-tools` is a per-turn grant.** It clears on the next user message even though the skill content stays in
  context, so a pipeline that spans a user turn loses its git permissions. `commit/SKILL.md` states the symptom and the
  recovery
- **Both SKILL.md files stay under 5,000 tokens.** That is the per-skill compaction budget: past it, the tail of the
  file is dropped on re-attach, and the tail is where the `<critical>` block sits. `commit-message` was cut from ~6,400
  tokens for this reason
- **No `references/` directory.** The plugin is delivered as a standing thing and each skill is behaviorally
  self-sufficient. Content that would go to a reference is trimmed or rewritten instead
- **No worked examples in either skill.** A filled specimen is read as a specification: the model reproduces its length,
  paragraph count, register, and domain along with the rule it was supposed to carry, and stops using the range the rule
  allows. The cost lands on every message written afterward, and it does not depend on the specimen being well chosen.
  Three forms stay, because they pin a shape without demonstrating content — a placeholder template (`<format>`, the
  behavior-change list, the body-audit verdict lines), a one-line substitution inside a rule
  (`[parser] update parser code` becomes `[parser] handle empty input`), and the referent of a rule about syntax (the
  trailer forms, the banned Unicode characters). A rule that needs a specimen to locate its boundary is not yet a rule:
  state the detector instead, as `<record-not-documentation>` does

## Boundaries

- **Change size is not this plugin's rule.** `the-coder`'s `coding` skill owns the size checkpoint that triggers a
  commit. This plugin owns unit boundaries, messages, and validation
- **Splitting the work belongs to `commit`, not `commit-message`.** A message that reads "various improvements" is a
  unit problem; the message skill states the message rule and routes the split to the pipeline

## Conventions

**Commit message structure:** `commit-message/SKILL.md` is the single source. Do not restate its rules here — a second
copy drifts.

**Skill prose (both SKILL.md files):**

- Written in ASD-STE100 Simplified Technical English — keep edits in that style. The plugin ships standalone, so it
  carries its own register rather than inheriting the house style of the reworked cc-foundry skills
- One instruction per sentence; 20 words max in a procedure, 25 in a description
- Active voice, imperative mood, no gerunds: "stage the file", not "staging the file"
- One term per concept: `unit` for one logical change, plus `subject`, `body`, `trailer`, `staged`, `unstaged`,
  `untracked`
- Em dashes only as KV-list separators, never inside a sentence
- Code fences carry a language label (` ```text `) — unlabeled fences get reflowed by the prettier MDX parser
- Frontmatter `description` and `when_to_use` are exempt — they are activation surfaces and follow the
  `skill-engineering` formula

**Environment claims:** every claim about git or Claude Code behavior in either skill is verified before it ships —
against the Claude Code docs for host behavior, against a probe repo for git behavior. A stale claim in a skill is
obeyed rather than discounted.

## Extension Points

- `skills/commit/SKILL.md` — commit pipeline workflow
- `skills/commit-message/SKILL.md` — message format conventions
- `scripts/validate-commit-message.js` — validation rules
