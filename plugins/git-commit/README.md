# git-commit

Structured git commit workflow with atomic commits, message validation, and conventions.

## The Problem

**Mixed changes in single commits.** Claude's default commit behavior bundles bug fixes, refactoring, and new features
together. The resulting history is impossible to bisect, cherry-pick, or review meaningfully. When something breaks, you
can't isolate the change that caused it.

**Vague commit messages.** "Fix stuff" or "Update code" tells future readers nothing. When debugging at 3am, you need to
understand what changed and why by reading the log. Generic messages waste that opportunity.

**No validation before commit.** Typos in messages, missing context, forgotten scope prefixes, inconsistent formatting —
all slip through. Manual review catches some, but not systematically.

**Wrong commit order.** New behavior committed before the refactoring that enables it. Style changes mixed with logic
changes. The commit sequence doesn't tell a coherent story, making git bisect and code review harder than necessary.

**"Atomic" read as one commit per task.** Every boundary test in a commit workflow asks whether the diff mixes unrelated
things, so a single large coherent feature passes all of them and arrives as one unit. The word gives an agent an
honest-sounding reason to never split anything.

**Committing left until the end.** An agent works for an hour and then reaches for git with a few thousand uncommitted
lines in the tree. Splitting that afterwards recovers a readable history, but the work itself was never done against a
committed base, so every decision along the way is welded to the ones after it. Worse, the split usually can't be made
cleanly at all — the pieces are interleaved across the same files by the time anyone asks.

## The Solution

The `commit` skill enforces a staged pipeline that identifies logical units in your diff, plans their commit order,
validates quality, and creates atomic commits with meaningful messages. A unit is defined as the smallest change that
keeps the tree working rather than the whole task, and a split test decides it: if part of the diff builds and passes on
its own, the diff holds more than one unit. A unit also does one kind of work, since a reviewer answers one question per
unit: new code and its wiring are separate units, as are a refactor and the feature it enables. The pipeline runs during
the work at each verified step, not once at the end — and a tree arriving with many units in it is treated as a process
fault worth naming, not merely a splitting exercise.

Each commit message runs through a validator before execution, and through a body audit before that — a visible
`keep`/`cut` verdict on every paragraph, checked against the staged diff. The `commit-message` skill provides the
formatting conventions the audit measures against.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install git-commit
```

## Usage

Type the skill command, or let Claude reach for it on its own when work arrives at a committable state:

```
/git-commit:commit
```

The skill walks through the complete pipeline automatically. No configuration required for basic usage.

It is deliberately left model-invocable. A commit skill that only a human can trigger cannot govern the commits an agent
makes while working unattended, which is most of them.

## The Pipeline

1. **Survey changes** — find the separate logical changes in the diff
2. **Plan units and order** — sort by type (style → refactor → fix → feature); dependency order wins over type order
3. **Quality gate** — verify tests/lint pass before committing
4. **Commit loop** — for each unit: stage, draft the message to a file, self-review the staged diff and audit the body
   paragraph by paragraph, validate the message, commit
5. **Verify** — confirm with `git log --stat` and `git status`

The quality gate proves the tree, not each individual commit. The working tree holds every unit while the loop runs, so
a check inside the loop still measures the whole tree — the promise that each unit builds on its own is a judgment the
split test makes, not something the pipeline measures. The skill says so plainly and names the three cases that deserve
a second look: a unit that removes code, changes a signature, or moves a symbol.

## Message Validation

Before each commit, the message runs through `validate-commit-message.js`. The script is advisory — it prints `ERROR:`
and `WARN:` lines and always exits 0. What stops a bad commit is the pipeline, which refuses to run `git commit` while
an error stands.

It checks the subject length, a trailing period, two first-person and "this commit" filler patterns in the subject, the
blank line after the subject, whether a body exists at all, and any trailers the project requires. It does not check the
ASCII rule, the 72-character body wrap, the scope format, or the register — those stay prose rules the agent applies and
the body audit enforces.

### Validator Flags

- **`--require-trailers`** — require specific trailers in the message — `--require-trailers "Task,Fixes"`

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

**`<validator-args>`** — Flags passed to the validator script. Each `<flag name="X" value="Y"/>` becomes `--X "Y"` on
the command line. Use this to enforce project-specific requirements like mandatory trailers.

**`<extra-instructions>`** — Additional guidance applied during the commit process. These instructions have highest
priority and override plugin defaults. Use for project conventions not covered by the validator.

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
- Describes how a future reader verifies it — steps they can repeat, never a log of the checks this session ran. "55 of
  55 tests passing" is a fact about a terminal, not about the change
- Records the change — documentation belongs in the artifact (code comments, design docs, README)
- Wraps at 72 characters, which git's own tooling assumes
- Default shape is one paragraph; length follows the number of reasons, not the size of the diff
- Never walks the reader through the new code — the call order, the empty case, the fallback and the gating flag are
  what the diff shows and what code comments keep
- Several behavior changes under one reason get one line each in a single list, not a paragraph each; independent
  reasons get separate commits
- For bug fixes: explain the cause, not just the symptom
- For features: explain the use case
- For refactoring: explain the motivation

Before validating, the pipeline audits the drafted body against the staged diff and prints one `keep` or `cut` verdict
per paragraph. A paragraph survives only when it carries a reason, a `BREAKING:` declaration, a migration step, a
behavior change the subject cannot predict, or a one-line note about the work that follows. The verdicts are visible, so
a wrong call is visible too.

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

## License

MIT
