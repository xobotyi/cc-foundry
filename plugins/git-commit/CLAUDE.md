# git-commit Plugin

Structured git commit workflow with atomic commits, message validation, and conventions. Ships standalone: no skill here
assumes another cc-foundry plugin is installed.

## Skills

- **`commit`** — the pipeline: survey changes → plan units → quality gate → commit loop (stage → draft → self-review
  with body audit → validate → commit) → verify. Loads `commit-message` through its `<prerequisite>` block before the
  pipeline starts
- **`commit-message`** — message format conventions. `user-invocable: false`

## Scripts

- **`validate-commit-message.js`** — commit message checks, printed as `ERROR:` and `WARN:` lines

## Validator Contract

- **The validator prescribes; it does not block.** Every content problem it finds prints an `ERROR:` or `WARN:` line and
  still exits 0; only a missing, unreadable, or empty message exits 1. The pipeline refuses to commit, not the script.
  Any doc that says errors "block the commit" is wrong
- **What it checks** — subject length (<10 and >72, both WARN), trailing period (ERROR), two subject filler-tic regexes
  (WARN), blank line after the subject (ERROR), presence of a body (WARN), required trailers (ERROR)
- **What it does not check** — the ASCII rule, the 72-character body wrap, the scope format, the register, AI
  attribution. Those are prose rules the agent owns. Keep this list in sync with `commit/SKILL.md` step 4d
- **`--require-trailers`** — comma-separated list of trailer names that must be present, e.g.
  `--require-trailers "Task,Fixes"`

## Project Configuration

The `<project-config>` block in `commit/SKILL.md` owns the schema. Its keys, read from the consuming project's
CLAUDE.md:

- **`<git-commit-config>`** — the wrapper the pipeline reads before it starts
- **`<validator-args>`** — `<flag name="X" value="Y"/>` becomes `--X "Y"` on the validator command line
- **`<extra-instructions>`** — highest-priority guidance for the commit; overrides plugin defaults

## Design Decisions

- **`commit` stays model-invocable**, against the workflow archetype's `disable-model-invocation: true` — the pipeline
  runs during the work at each verified step, and a commit skill the agent cannot reach cannot govern autonomous work
- **`commit-message` is `user-invocable: false`, never `disable-model-invocation`** — that flag breaks the
  `Skill(git-commit:commit-message)` composition `commit` depends on
- **`allowed-tools` is a per-turn grant.** It clears on the next user message even though the skill content stays in
  context; `commit/SKILL.md` `<permission-window>` states the symptom and the recovery
- **Both SKILL.md files stay under 5,000 tokens** — the per-skill compaction budget, past which the tail is dropped on
  re-attach, and the tail is where the `<critical>` block sits
- **No `references/` directory.** Each skill is behaviorally self-sufficient; content that would go to a reference is
  trimmed or rewritten instead
- **No worked examples in either skill** — a filled specimen is read as a specification, and the model reproduces its
  length, register, and domain along with the rule it was supposed to carry. Three forms stay, because they pin a shape
  without demonstrating content: a placeholder template, a one-line substitution inside a rule, and the referent of a
  rule about syntax. A rule that needs a specimen to locate its boundary is not yet a rule — state the detector instead

## Skill Dependencies

- **Splitting the work belongs to `commit`, not `commit-message`.** A message that reads "various improvements" is a
  unit problem; the message skill states the message rule and routes the split to the pipeline

## Plugin Scope

- **Change size is not this plugin's rule.** `the-coder`'s `coding` skill owns the `size checkpoint` that triggers a
  commit. This plugin owns unit boundaries, messages, and validation

## Conventions

**Skill prose (both SKILL.md files):**

- ASD-STE100 Simplified Technical English — the plugin ships standalone, so it carries its own register
- One instruction per sentence; 20 words max in a procedure, 25 in a description
- Active voice, imperative mood, no gerunds: "stage the file", not "staging the file"
- One term per concept: `unit` for one logical change, plus `subject`, `body`, `trailer`, `staged`, `unstaged`,
  `untracked`
- Em dashes only as KV-list separators, never inside a sentence
- Code fences carry a language label (` ```text `) — the prettier MDX parser reflows an unlabeled fence
- Frontmatter `description` and `when_to_use` are exempt — they are activation surfaces and follow the
  `skill-engineering` formula

**Commit message structure:** `commit-message/SKILL.md` is the single source. Do not restate its rules here — a second
copy drifts.

**Environment claims:** every claim about git or Claude Code behavior in either skill is verified before it ships —
against the Claude Code docs for host behavior, against a probe repo for git behavior. A stale claim in a skill is
obeyed rather than discounted.
