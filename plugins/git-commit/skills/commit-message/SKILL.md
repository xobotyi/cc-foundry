---
name: commit-message
description: >-
  Git commit message conventions: structure, formatting, scoping, body content, breaking changes,
  trailers.
when_to_use: >-
  Invoke whenever a commit message is touched at all — writing, reviewing, validating, amending, or
  correcting one the validator rejected. Also invoke on the symptoms: a body that walks the reader
  through the new code, a subject that sells the change, a message that records the test results of
  the session. Covers the message text; splitting the work into units belongs to the commit skill.
user-invocable: false
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use, user-invocable)
---

# Commit Message Format

<scope>
These rules apply only to git commit messages. Do not apply the line-length limits, the format
rules, or the structure rules of this skill to other files. Code, documentation, and configuration
files keep their own rules.
</scope>

A commit message is a factual record of one change. It tells the reader why the change happened. The reader has the diff
and the docs. The message adds only what the diff and the docs cannot show.

<mental-model>
Write for the colleague who reads `git log` at 3am to find the defect. That colleague can open the
diff. That colleague cannot recover your reasons. Record the reasons.
</mental-model>

## What Makes a Good Message

<context-principle>
Draw the _why_ from three sources: the task that you solved, the reason that this approach won, and
the code that you built. Do not copy the sources into the message. If the context is incomplete,
record what the code and the available information can verify.
</context-principle>

<factual-principle>
A commit message is a **factual record**. It is not marketing copy. The subject answers this
question: what did this commit do? It does not answer this question: why is this commit good?

- **Subject** — only facts, in the imperative mood. It says what you did, not how good the change is.
- **Body** — it gives the reasons and the trade-offs. It stays objective. It has no promotional words.

</factual-principle>

## Structure

<format>
The message has three blocks. A blank line separates the blocks:

```text
[scope] subject

body

trailers
```

- **Subject** — what changed. The target is 50 characters. The hard limit is 72 characters.
- **Body** — the reason for the change, and the procedure that verifies it.
- **Trailers** — structured metadata such as references and authorship.

</format>

### ASCII Symbols

<charset>
Use ASCII punctuation and ASCII symbols only. Prose in a different language is correct. This rule
applies to decorative and typographic Unicode, not to natural language.

- No em dash and no en dash (—, –). Use `--` or `-`.
- No arrows (→, ←, ↔). Use `->`, `<-`, and `<->`.
- No bullet symbols (•, ▸). Use `-` or `*`.
- No fancy quotes (“”, ‘’). Use straight quotes.
- No emoji (🐛, ✅, 🚀), unless the project conventions make them necessary.
- No other decorative symbols (©, ™, §, ¶, ∞).

Some environments break these symbols, and the symbols add no information.

</charset>

## Subject Line

- With a scope, for a monorepo: `[scope] <verb> <description>`
- Without a scope, for a single-purpose repo: `<verb> <description>`

<subject-rules>
- Write 50 characters or less. The hard limit is 72 characters.
- Use the imperative mood: "add", not "added".
- Use lowercase after the scope. Proper nouns keep their capital letters.
- Do not put a period at the end.
- **Write only facts.** Say what changed, not how good the change is.
- **Remove the filler words.** Drop "this commit", "I", "we", "now", and "currently". Never repeat the scope.

</subject-rules>

### Scope (Optional)

<scope-guidance>
Use a scope when the repo holds more than one project, package, or subsystem, or when readers filter
`git log` by component. Omit the scope when the repo has one purpose, or when the scope is always
the same.

- `[parser]` — a top-level project
- `[core/auth]` — a nested path
- `[web/api]` — a component in a project

Derive the scope from the file paths, not from the file contents. Use the common parent directory, or the most
significant component that you changed. Use one spelling for one component. `[myapp/backend]` and `[myapp/b]` in the
same log break the filtering that the scope exists for.

A path can hold a version directory such as `v2`. Omit the segment while one version is alive: write `[core/engine]`,
because the reader has one candidate. Write `[core/engine/v1]` and `[core/engine/v2]` when both versions are alive,
because the segment is then the distinction that matters.

</scope-guidance>

## Body

<body-philosophy>
A message of one line is rarely correct. The body is the channel to future readers, and it answers
three questions:

- **Why** the change was necessary.
- **What** the subject cannot hold, such as a behavior change that surprises the reader.
- **How a reader verifies it** later, when that is not obvious. Give the steps that the reader repeats
  (`run X, confirm Y`). Never give the results that you produced in this session.

Wrap each body line at 72 characters. This is a hard limit. Git tools such as `log`, `format-patch`, and email expect
72-character body lines. Trailers are the only exception.

</body-philosophy>

### Shape

<body-shape>
The default body is one paragraph of 2 to 5 lines. It names the cause, then the new behavior.

Each paragraph after the first earns its lines, or it goes. A paragraph earns its lines when it records a fact that the
diff and the docs cannot show:

- A second reason that the first paragraph does not carry.
- A `BREAKING:` declaration, or a step of the migration path.
- A behavior change that the subject cannot predict, such as the new meaning of an absent value.
- A one-line note about the work that follows in the chain. Name that work. Do not write "more changes coming".

The reason itself depends on the kind of change:

- A bug fix — why the defect existed, not only what you corrected.
- A feature — the use case.
- A refactor — the motivation.
- A breaking change — the migration path.

**The length follows the number of reasons, not the size of the diff.** A refactor of 2000 lines with one reason gets
one paragraph. A migration with 6 steps gets the 6 steps. A body of 20 lines is correct only when 20 lines of reasons,
declarations, and steps exist. Such a body usually holds a walkthrough, or a second unit that belongs in its own commit.

**More than one behavior change.** One unit can change several behaviors. Give one line to each change, in one list. Do
not give a paragraph to each change:

```text
- <behavior that the caller sees, present tense>.
- <behavior that the caller sees, present tense>
  <continuation of the same item, indented two spaces>.
```

Mark each item with `-`. A wrapped line then keeps its item visible in `git log`. Each line gives the behavior that the
caller sees. Do not put the old behavior beside it as a contrast: the minus side of the diff carries the old behavior,
and `git log` carries the history. A line that names a file, a function, or a test inventories the diff. Delete such a
line.

The list does not license a longer body. Several behavior changes under one reason stay in one commit, and the reason
keeps its paragraph. Two independent reasons are two commits, whatever the number of behavior changes.

</body-shape>

### Record, Not Documentation

<record-not-documentation>
The body records why this change happened. It does not document the result. The changed files
document the result. Keep a rationale, an invariant, or a behavior description in the artifact: a
name, a test, a doc comment, a design doc, or the README. The diff then carries it into the history.

These signs show that a body became documentation:

- A paragraph for each decision inside the artifact. That is the design doc of the artifact.
- A walkthrough of the new behavior. A paragraph that names a function, a call order, an empty case, a fallback, or a
  flag that gates the new code reports the procedure, and the diff shows the procedure.
- A list of the surfaces, the files, or the tests that the change touches. The diff already lists them.
- A repeat of what the updated docs say.
- A story of your verification, such as "verified by building X" or "measured on Y". That is a session artifact.

**Two tests. Apply both to each paragraph.**

1. Paste the paragraph into the repo's docs. Does it stay true and useful there? Then it belongs in the repo's docs, not
   in the message.
2. Name the item from the earns-its-lines list above that the paragraph carries. A paragraph that matches no item is a
   walkthrough. Delete it.

</record-not-documentation>

### Terse Register

The diff carries the _what_. The message carries the _why_. A body can use fragments, and it can drop articles where the
meaning stays clear. Identifiers, file paths, and error strings stay exact.

**The tense carries the timeline.** State the current behavior in the plain present tense, because the commit itself
marks the "now". The past tense belongs to the cause of the change, and to nothing else:
`Empty input dereferenced nil. Returns empty token list instead.`

**The old behavior is not the cause.** A fix names the defect, because the diff cannot show why the code was wrong. A
behavior line names what the caller gets, and stops there. `git log` holds the history, and the diff holds the previous
code, so a before-and-after contrast in the message duplicates both.

**Never include:**

- "This commit does X", "This change...". The diff says what.
- "I", "we". The commit speaks for itself.
- "now", "currently", "previously". The tense already carries the timeline.
- The old behavior as a contrast: "X, where Y used to", "no longer does Y", "changed from Y to X". The diff holds the
  previous code. Name the old behavior only as the cause of a fix, or as the thing that a `BREAKING:` change removes.
- "As requested by...". Use a `Co-Authored-By:` trailer, or write nothing.
- A walkthrough of the new behavior: the call order, the empty case, the fallback, the flag that gates it. A code
  comment keeps such a fact, and the diff carries the comment into the history.
- The scope repeated: `[parser] update parser code` becomes `[parser] handle empty input`.
- Promotional adjectives without data: "great", "amazing", "improved", "better". Say what is better.
- Decorative Unicode. See ASCII Symbols above.
- Filler: "just", "really", "basically", "actually", "simply". Connective fluff: "however", "furthermore",
  "additionally".
- Session artifacts: test counts, lint status, typecheck status, build status, quality-gate status, CI results, and
  verification stories. Examples: "55 of 55 tests passing", "all checks pass", "verified by building X". These record
  your session at commit time, not the change. A future reader cannot verify them, and the next commit makes them stale.
  Steps that a reader repeats are correct in the body. A log of the checks that you ran is not.

## Breaking Changes

<breaking-changes>
A commit can break backward compatibility. The body of such a commit MUST start with a `BREAKING:`
declaration as the first paragraph:

```text
BREAKING: <what is broken>

<explanation and migration path>
```

Write the `BREAKING:` prefix in capital letters. Give a short description of what breaks after it. The paragraphs that
follow explain the reason and the migration path. Write a migration path of more than one step as a numbered list under
a `Migration:` line.

</breaking-changes>

## Trailers (Footer Metadata)

Trailers are structured key-value pairs at the end of the commit message. They use the
[git-trailer format](https://git-scm.com/docs/git-interpret-trailers).

<trailers>
A blank line separates the body from the trailers. Each trailer stays on its own line, in the form
`Key-Name: value`.

- `Task:` — a link to the issue tracker — `Task: https://tracker.example.com/PROJ-123`
- `Fixes:` — the issue that this commit corrects — `Fixes: #456`
- `Refs:` — related issues or commits — `Refs: #123, #124`
- `Closes:` — the issue that closes at merge time — `Closes: #789`
- `See:` — related documentation — `See: docs/auth.md`
- `Reviewed-By:` — the code reviewer — `Reviewed-By: Alice <alice@example.com>`
- `Co-Authored-By:` — an additional author — `Co-Authored-By: Bob <bob@example.com>`

Write each trailer key in Title-Case. Keep each value on one line. For more than one value, use a comma-separated list,
or repeat the trailer.

</trailers>

## Amending Commits

<amend-rule>
When you amend a commit with `git commit --amend`, **write the message again as if the commit is
new**.

An amended commit replaces the original commit and rewrites the history. The final message must describe what the commit
introduces. It must not describe the sequence of revisions. From the reader's position there is no original commit.
There is only the resulting commit.

**Common violation:** the agent treats the amend as iterative work. It then describes the changes against the original
commit: "also update the tests", "fix the edge case from the previous version", "address review feedback". The reader
has no access to the original commit, and no context for "also" or "previous".

**Correct approach:** read the full staged diff after the amend. Then write a message that describes the complete change
as one introduction. Ignore the original message and start again.

</amend-rule>

## No AI Attribution

<forbidden>
**Never add a reference that indicates AI involvement:**

- No "Generated with Claude Code" or a similar sentence
- No "Co-Authored-By: Claude" and no other AI co-author trailer
- No emoji that marks AI generation (🤖, and similar)
- No links to claude.com, anthropic.com, or AI tools

Commits must look like regular developer commits.

</forbidden>

<critical>
## Core Principles

- **Record, not documentation** — the body carries the reason for the change. Rationale, invariants, and behavior
  descriptions live in the artifact and travel in the diff
- **Factual subjects** — what changed, not how good it is
- **Explain the cause** — for a bug fix, say why the code was defective
- **Body is essential** — a message of one line is rarely acceptable. The default body is one paragraph
- **No walkthrough** — the body never narrates the new procedure: the call order, the empty case, the fallback, the flag
  that gates it. The artifact keeps such a fact
- **Length follows the reasons** — not the size of the diff. Each paragraph after the first earns its lines, or it goes.
  Two independent reasons usually mean two commits
- **Terse register** — the diff carries the what, the message carries the why. No "this commit", "I", or "we". The tense
  carries the timeline. No filler. No promotional adjectives
- **No session artifacts** — test counts, lint status, CI status, gate status, and verification stories record your
  session, not the change. "How to verify" means steps that the reader repeats
- **BREAKING first** — a breaking change starts the body with `BREAKING:`
- **Amends rewrite history** — an amended message describes the full change, not the difference
- **ASCII symbols** — no decorative Unicode. Use the ASCII equivalents
- **No AI attribution** — commits look like regular developer work

</critical>
