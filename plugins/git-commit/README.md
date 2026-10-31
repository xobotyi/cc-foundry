<div align="center">

# git-commit

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757.svg)](https://code.claude.com/docs/en/plugins)
[![XERJ Corpus Hub contributor](https://hub.xerj.org/contributors/xobotyi/badge.svg)](https://hub.xerj.org/contributors/xobotyi)

</div>

Claude's work, committed in units a reviewer can read one at a time. The `commit` skill splits the diff into the
smallest units it judges to keep the tree working, orders them, and audits every message body against the staged diff
before the commit lands.

A commit from this repository, made through the skill ([0f876f6](https://github.com/xobotyi/cc-foundry/commit/0f876f6)):

```
[the-statusline] count the ellipsis as width when collapsing a path

The second collapse stage counted the ellipsis that replaces the first
shortened segment as two columns removed, where it adds two. A path
that needed that stage came out four columns wider than its budget, so
row 2 overflowed a narrow pane. The collapsed path fits its budget.
```

The subject names the change. The body gives the cause and what the user saw, and leaves the code to the diff.

## The Problem

Claude's default commit bundles a bug fix, a refactor, and a new feature under a message like "Fix stuff". The history
can't be bisected, cherry-picked, or reviewed in pieces, and when something breaks at 3am the log doesn't say what
changed or why. The order goes wrong as well: new behavior lands before the refactor that enables it, and style edits
ride along with logic changes. Nothing checks the message before it lands, so typos, missing context, forgotten scope
prefixes, and inconsistent formatting get through whenever a manual review misses them.

Two habits make it worse. The first is reading "atomic" as one commit per task. Every boundary test in a commit workflow
asks whether the diff mixes unrelated things, so a single large coherent feature passes all of them and arrives as one
unit. The word gives an agent an honest-sounding reason to never split anything.

The second is committing at the end. An agent works for an hour and then reaches for git with a few thousand uncommitted
lines in the tree. Splitting that afterwards recovers a readable history, but the work itself was never done against a
committed base, so every decision along the way is welded to the ones after it. Usually the split can't be made cleanly
at all, because by then the pieces are interleaved across the same files.

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

The validator needs Node.js 26 or later as the `node` on your `PATH`. It is written in TypeScript, and the commit skill
runs it with `node`, which strips the types itself, so nothing is built at install time.

```
/plugin install git-commit --marketplace xobotyi/cc-foundry
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

Before each commit, the message runs through `validate-commit-message.mts`. The script is advisory — it prints `ERROR:`
and `WARN:` lines and exits 0 whatever it finds; only a missing, unreadable, or empty message exits 1. What stops a bad
commit is the pipeline, which refuses to run `git commit` while an error stands.

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
