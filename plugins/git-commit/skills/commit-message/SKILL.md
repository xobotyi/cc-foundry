---
name: commit-message
description: >-
  Git commit message conventions: structure, formatting, scoping, body content, breaking changes,
  trailers. Invoke whenever task involves any interaction with commit messages — writing,
  reviewing, validating, or understanding message format.
user-invocable: false
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
A good message draws from three sources:

- **The task** — the problem that you solved
- **The implementation context** — the reason that this approach won
- **The deliverable** — the code that you built

Draw the _why_ from these three sources. Do not copy the sources into the message. If the context is incomplete, record
what the code and the available information can verify.

</context-principle>

### Factual, Not Promotional

<factual-principle>
A commit message is a **factual record**. It is not marketing copy.

- **Subject** — only facts, in the imperative mood, with no judgment. It says what you did, not how good the change is.
- **Body** — it can give the reasons and the trade-offs. It stays objective. It has no promotional words.

The subject answers this question: what did this commit do? It does not answer this question: why is this commit good?

</factual-principle>

## Structure

<format>
The message has three blocks. A blank line separates the blocks:

```text
[scope] subject

body

trailers
```

- **Subject** — what changed. The target is 50 characters. The hard limit is 72 characters. Write only facts.
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

Git tools, terminals, email patches, and `git log` show ASCII correctly in all environments. Some environments break
Unicode symbols. Those symbols add no information.

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

A scope helps in a **monorepo** and in a repo with more than one deliverable. A single-purpose repo can omit it.

<scope-guidance>
**Use a scope when one of these conditions is true:**

- The repo is a monorepo with more than one project or package.
- The repo holds separate subsystems such as a frontend, a backend, and libraries.
- Readers filter `git log` by component.

**Omit the scope when one of these conditions is true:**

- The repo has one purpose.
- All code serves one deliverable.
- The scope is always the same.

</scope-guidance>

The scope names the subsystem that you changed:

- `[parser]` — a top-level project
- `[core/auth]` — a nested path
- `[web/api]` — a component in a project

Derive the scope from the file paths, not from the file contents. Use the common parent directory, or the most
significant component that you changed. Use one spelling for one component. `[myapp/backend]` and `[myapp/b]` in the
same log break the filtering that the scope exists for.

A path can hold a version directory, such as `v2` or its equivalent in another language. Such a directory follows the
reader's-candidates rule. While one version is alive, omit the segment. Write `[core/engine]`, not `[core/engine/v2]`,
because the reader has one candidate. When two versions are alive, the segment is the distinction that matters. Write
`[core/engine/v1]` and `[core/engine/v2]`.

## Body

<body-philosophy>
A good commit message is rarely one line.

The body is the channel to future readers. It answers three questions:

- **What** the subject cannot hold, such as a behavior change that surprises the reader. It is not a walkthrough of the
  new code.
- **Why** the change was necessary.
- **How a reader can verify it** later, when that is not obvious. Give the steps that the reader can repeat
  (`run X, confirm Y`). Do not give the results that you produced in this session.

"How to verify" means instructions for a future reader. It never means a log of the checks that you ran.
`Run the deduper twice and confirm idempotence` belongs here. `Ran the suite, 55/55 passing` does not. That sentence is
a fact about your terminal at commit time, not about the change.

Wrap each body line at 72 characters. This is a hard limit, not a recommendation. Git tools such as `log`,
`format-patch`, and email expect 72-character body lines. Trailers are the only exception.

</body-philosophy>

### Shape

<body-shape>
The default body is one paragraph of 2 to 5 lines. It names the cause, then the new behavior.

Each paragraph after the first earns its lines, or it goes. A paragraph earns its lines when it records a fact that the
diff and the docs cannot show:

- A second reason that the first paragraph does not carry.
- A `BREAKING:` declaration and the migration path.
- A behavior change that the subject cannot predict, such as the new meaning of an absent value.
- A one-line note about the work that follows in the chain.

A paragraph that walks the reader through the new procedure earns nothing. Delete it. A fact the next maintainer needs
lives in the artifact -- a name, a test, a doc comment, or the project's own rule or architecture document. The diff
then carries it into the history.

**More than one behavior change.** One unit can change several behaviors. Give one line to each change, in one list. Do
not give a paragraph to each change:

```text
- Rejects a duplicate id with ErrConflict, where the last write won.
- An absent sessions root means no folder, where a bare id under the
  launch directory used to serve.
```

Mark each item with `-`. A wrapped line then keeps its item visible in `git log`. Each line names the change that the
caller sees. The tense pair carries the timeline, as the Terse Register section below defines. A line that names a file,
a function, or a test is an inventory of the diff. Delete such a line.

The list does not license a longer body. Several behavior changes under one reason stay in one commit, and the reason
keeps its paragraph. Two independent reasons are two commits, whatever the number of behavior changes. A rationale for
one of the changes belongs with that code, in whichever destination the coding skill's routing ladder picks.

**The length follows the number of reasons, not the size of the diff.** A refactor of 2000 lines with one reason gets
one paragraph. A migration with 6 steps gets the 6 steps. A body of 20 lines is correct only when 20 lines of reasons,
declarations, and steps exist. Such a commit is rare. A body of that size usually holds a walkthrough, or a second unit
that belongs in a separate commit.

**When the body grows, test it before you commit.** Delete each sentence that the diff shows. Then count the reasons. If
two independent reasons remain, split the commit.

</body-shape>

### Record, Not Documentation

<record-not-documentation>
The body records why this change happened. It does not document the result. The changed files
document the result. Keep a rationale, an invariant, or a behavior description in the artifact: a
name, a test, a doc comment, a design doc, or the README. The diff then carries it into the history.

These signs show that a body became documentation:

- A paragraph for each decision inside the artifact. That is the design doc of the artifact.
- A walkthrough of the new behavior: which function does what, in which order, with which fallback. The diff shows the
  procedure.
- A list of the surfaces, the files, or the tests that the change touches. The diff already lists them.
- A repeat of what the updated docs say.
- A story of your verification, such as "verified by building X" or "measured on Y". That is a session artifact.

**The test:** paste the paragraph into the repo's docs. Does it stay true and useful there? Then it belongs in the
repo's docs, not in the message. Apply the test to each paragraph. See Shape above for what a paragraph must earn.

</record-not-documentation>

### When Body is Essential

- A bug fix. Explain why the bug existed, not only what you corrected.
- A feature. Explain the use case.
- A refactor. Explain the motivation.
- A breaking change. Explain the migration path.
- A change that is not obvious. Explain the rationale.
- One commit in a chain. State the related work that follows.

Explain the decisions that shaped the change. Do not explain each decision inside the artifact. One reason belongs to
one commit. Two independent reasons in one body usually mean two commits.

### Terse Register

The diff carries the _what_. The message carries the _why_. Subjects and bodies are records, not narratives. A body can
use fragments, and it can drop articles where the meaning stays clear. Identifiers, file paths, and error strings stay
exact.

**The tense carries the timeline.** State the old behavior in the past tense, because it is the cause. State the new
behavior in the plain present tense, because the commit itself marks the "now":
`Empty input dereferenced nil. Returns empty token list instead.`

**Never include:**

- "This commit does X", "This change...". The diff says what.
- "I", "we". The commit speaks for itself.
- "now", "currently", "previously". The tense already carries the timeline.
- "As requested by...". Use a `Co-Authored-By:` trailer, or write nothing.
- A walkthrough of the new behavior: the call order, the empty case, the fallback, the flag that gates it. A code
  comment keeps such a fact, and the diff carries it into the history.
- The scope repeated: `[parser] update parser code` becomes `[parser] handle empty input`.
- Promotional adjectives without data: "great", "amazing", "improved", "better". Say what is better.
- Decorative Unicode: em dashes, arrows, fancy quotes, emoji, and bullet symbols. See ASCII Symbols above.
- Filler: "just", "really", "basically", "actually", "simply". Connective fluff: "however", "furthermore",
  "additionally".
- Session artifacts: test pass counts, lint status, typecheck status, build status, quality-gate status, CI results, and
  verification stories. Examples: "55 of 55 tests passing", "all tests green", "all checks pass", "verified by building
  X", "measured on Y". These record your session at commit time, not the change. A future reader cannot verify them, and
  the next commit makes them stale. Steps that a reader can repeat are correct in the body. A log of the checks that you
  ran is not.

**Bad:**

```text
[parser] fix the bug in parser

This commit fixes a bug we found where the parser was incorrectly handling empty input. I noticed that it would now
sometimes panic, so I added a guard to prevent this issue.
```

**Good:**

```text
[parser] handle empty input in token scanner

Empty input dereferenced nil in the scanner loop. Returns empty token list instead.

Fixes: #234
```

The subject drops "the bug in parser", which repeats the scope, and states the fix. The body drops "this commit", "I",
"we", and "now". It uses fragments, and it names the true cause.

### Body Patterns

<body-patterns>
**A bug fix names the cause:**

```text
Session cache returned nil when the key existed but the value had expired. The TTL check ran after the nil check, so
expired sessions caused panics.

Returns ErrExpired instead, so callers can tell "not found" from "expired".
```

**A feature names the purpose:**

```text
Buffers push attempts and sends them as one batch request on a configured interval. Reduces request volume to the API.
```

**A refactor names the benefit:**

```text
- Use Dependency by-pointer to simplify usage patterns
- Add convenience methods: BorrowByName, BorrowByID

Preparation for the new package resolution algorithm.
```

**A commit in a chain states what follows:**

```text
Integration with the order processing pipeline follows in a separate change.
```

Name the specific work that follows. Do not write "more changes coming". Say what the work is and where it goes.

</body-patterns>

## Breaking Changes

<breaking-changes>
A commit can break backward compatibility. The body of such a commit MUST start with a `BREAKING:`
declaration as the first paragraph:

```text
BREAKING: <what is broken>

<explanation and migration path>
```

Write the `BREAKING:` prefix in capital letters. Give a short description of what breaks after it. The paragraphs that
follow explain the reason and the migration path.

</breaking-changes>

## Trailers (Footer Metadata)

Trailers are structured key-value pairs at the end of the commit message. They use the
[git-trailer format](https://git-scm.com/docs/git-interpret-trailers).

<trailers>
```text
Key-Name: value
Another-Key: value with spaces
```

A blank line separates the body from the trailers. Each trailer stays on its own line.

</trailers>

### Common Trailers

- `Task:` — a link to the issue tracker — `Task: https://tracker.example.com/PROJ-123`
- `Fixes:` — the issue that this commit corrects — `Fixes: #456` or `Fixes: PROJ-456`
- `Refs:` — related issues or commits — `Refs: #123, #124`
- `Closes:` — the issue that closes at merge time — `Closes: #789`
- `See:` — related documentation — `See: docs/auth.md`
- `Reviewed-By:` — the code reviewer — `Reviewed-By: Alice <alice@example.com>`
- `Co-Authored-By:` — an additional author — `Co-Authored-By: Bob <bob@example.com>`

<trailer-conventions>
- Write each trailer key in Title-Case.
- Keep each value on one line when this is possible.
- For more than one value, use a comma-separated list, or repeat the trailer.

</trailer-conventions>

## Examples

<examples>

### Good: Bug fix with cause explanation

**Story:** Users reported session timeouts. The investigation showed that the cache panicked on expired entries. It did
not return an error.

```text
[core/cache] fix nil pointer in session lookup

Session cache returned nil when key existed but value had expired.
TTL check happened after nil check, causing panics.

Returns ErrExpired instead, letting callers tell "not found" from
"expired".

Fixes: #127
```

**Why it works:** The subject is factual ("fix nil pointer"). It is not promotional ("fix critical bug"). The body names
the cause, the order of the TTL check, not only the symptom.

---

### Good: Feature without scope (single-purpose repo)

**Story:** A metrics library caused API rate limits, because it sent too many requests. The task was to reduce the
requests with batches.

```text
add buffered metrics pusher

Batches push attempts and sends them as a single request on a
configured interval. Reduces API request volume.

Task: https://tracker.example.com/MRN-53
```

**Why it works:** The message has no scope, because the repo is a single-purpose metrics library. The subject states
what you added. The body states the mechanism and the benefit, without "amazing" or "greatly improved".

---

### Bad: Promotional subject

**Story:** The query builder moved from string concatenation to prepared statements.

```text
[storage] implement better SQL query construction
```

**Problem:** "better" is a judgment, not a fact. The subject sells the change. It does not describe the change.

**Fixed:**

```text
[storage] replace SQL string concatenation with query builder

Prevents SQL injection. Prepared statements carry all dynamic
values.
```

**Why the fix works:** The subject states the factual change, X replaced Y. The body states the concrete benefit.

---

### Bad: Missing cause in bug fix

**Story:** Login failed for some users. The password hash comparison was case-sensitive on some databases.

```text
[auth] fix login bug

Fixed the login issue.

Fixes: #234
```

**Problem:** "fix login bug" and "fixed the login issue" say nothing. What was the bug? Why did it happen?

**Fixed:**

```text
[auth] fix case-sensitive password hash comparison

Some database collations compare strings case-sensitively, causing
hash mismatches for passwords with mixed case. Uses binary
comparison explicitly.

Fixes: #234
```

**Why the fix works:** The subject states the true fix. The body explains why the bug existed, the database collation,
and what changed.

---

### Bad: No body on non-trivial change

**Story:** Authentication moved from session cookies to JWT tokens. The change affects all API endpoints.

```text
[auth] migrate to JWT authentication
```

**Problem:** A large architectural change has a message of one line. What happens to the existing sessions? What is the
migration path?

**Fixed:**

```text
[auth] migrate to JWT authentication

BREAKING: removes cookie-based session authentication

All API endpoints require a Bearer token in the Authorization
header. Existing sessions will be invalidated on deploy.

Migration:
1. Clients must obtain JWT via /auth/token endpoint
2. Include token in Authorization header for all requests
3. Token refresh available via /auth/refresh

See: docs/auth-migration.md
Closes: #456
```

**Why the fix works:** The message declares the breaking change first. The body states the impact and the migration
steps, and it links the documentation.

---

### Bad: A walkthrough of the new behavior

**Story:** A local run recorded its verdict in the run manifest and dropped the comments. The change writes the comments
into a sidecar file beside the manifest.

```text
[core/local] record a run's comments as threads

A local run published its comments and forgot them: the verdict
reached the run manifest, the conversation nowhere. With no remote,
publishing a comment locally IS recording it -- so the local runner
keeps the conversation itself, in the run's thread sidecar
(threads.json) beside the manifest.

PostRun opens one thread for each published comment, on the anchor
that the comment carries, and writes the whole conversation; a run
that filed nothing records the empty one, so a settled run always
answers what its comments left behind. The write stages and renames,
so a run killed mid-write leaves the previous document readable.
Recording is auxiliary -- a failed write warns and the run stands --
and is not gated on DryRun, which every local run sets.

Options.runDir becomes the one runs-root + run-id join: the runners
own that folder and the recorder writes into it, and a second join
could file the two apart. No runs root means no folder, where it
used to mean a bare run id under the launch directory.

Reading the threads back, the run chain that carries them, and the
CLI surfaces follow as separate changes.
```

**Problem:** The body has 20 lines, and 13 of them document the artifact. Paragraph 2 walks the reader through
`PostRun`: the diff shows the loop, the empty case, the staged write, and the `DryRun` condition. Paragraph 3 argues for
a design inside the artifact; a comment on `runDir` holds that argument, and the diff carries the comment into the
history. Only paragraph 1 and one line of paragraph 3 record something that the diff cannot show.

**Fixed:**

```text
[core/local] record a run's comments as threads

A local run published its comments and forgot them: the verdict
reached the run manifest, the conversation nowhere. With no remote,
publishing a comment locally is recording it, so the runner writes
the comments into a thread sidecar beside the manifest.

Options.runDir joins the runs root and the run id once. Without a
runs root there is no folder, where a bare run id under the launch
directory used to serve.

The surfaces that read the threads back follow as separate changes.
```

**Why the fix works:** The body keeps the reason and the one behavior change that the subject cannot predict. The staged
write, the empty-thread case, and the `DryRun` condition moved into the tests that cover them.

---

### Bad: Mixed changes, vague description

**Story:** One session corrected a parser bug, cleaned some formatting, and added a validation method.

```text
[parser] various improvements and fixes
```

**Problem:** "various improvements" has no meaning. What improved? What was fixed? This work needs more than one commit.

**Analysis:** This is a workflow problem, not only a message problem. Split the mixed changes into atomic commits:

1. `[parser] fix off-by-one error in token position`
2. `[parser] reformat according to style guide`
3. `[parser] add validation for nested expressions`

Each commit has one purpose, and a reviewer can read each commit independently.

</examples>

## Amending Commits

<amend-rule>
When you amend a commit with `git commit --amend`, **write the message again as if the commit is
new**.

An amended commit replaces the original commit and rewrites the history. The final message must describe what the commit
introduces. It must not describe the sequence of revisions. From the reader's position there is no original commit.
There is only the resulting commit.

**Common violation:** The agent treats the amend as iterative work. It then describes the changes against the original
commit: "also update the tests", "fix the edge case from the previous version", "address review feedback". The reader
has no access to the original commit, and no context for "also" or "previous".

**Correct approach:** Read the full staged diff after the amend. Then write a message that describes the complete change
as one introduction. Ignore the original message and start again.

```text
# WRONG - describes the amend as incremental work
[parser] fix edge case missed in previous commit

Adds handling for empty input that was overlooked in the initial implementation.
Also updates tests to cover the new branch.

# RIGHT - describes the complete change
[parser] handle empty input in token scanner

Empty input dereferenced nil in the scanner loop. Returns an empty
token list instead.
```

</amend-rule>

## No AI Attribution

<forbidden>
**Never add references that indicate AI involvement:**

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
- **Use available context** — draw the reason from the task, the implementation, and the deliverable. Do not copy them
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
- **Trailers for metadata** — Title-Case keys, structured format
- **Amends rewrite history** — an amended message describes the full change, not the difference
- **ASCII symbols** — no decorative Unicode (em dashes, arrows, fancy quotes, emoji). Use the ASCII equivalents
- **No AI attribution** — commits look like regular developer work

</critical>
