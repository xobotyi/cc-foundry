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
These rules apply **only to git commit messages**. Do not apply the line-length limits, formatting
conventions, or structure requirements of this skill to other files (code, documentation, configs).
</scope>

A commit message is a factual record of one change. It tells the reader why the change happened. The reader has the diff
and the docs; the message adds only what they cannot show.

<mental-model>
Write for the colleague who reads `git log` at 3am to find what broke. They can open the diff.
They cannot recover your reasons. Record the reasons.
</mental-model>

## What Makes a Good Message

<context-principle>
A good message draws from three sources:

- **The task** — the problem that was solved
- **The implementation context** — why this approach won
- **The deliverable** — what was built

Draw the _why_ from these sources; do not transcribe them into the message. When context is incomplete, record what the
code and the available information can verify. </context-principle>

### Factual, Not Promotional

<factual-principle>
A commit message is a **factual record**, not marketing copy.

- **Subject**: strictly factual, imperative mood, no judgment. It says what was done, not how good it is.
- **Body**: can explain reasoning and trade-offs; stays objective, without promotional language.

The subject answers "What did this commit do?" — not "Why is this commit amazing?" </factual-principle>

## Structure

<format>
The message has three blocks, separated by blank lines:

```text
[scope] subject

body

trailers
```

- **Subject** — what changed; 50 characters as the target, 72 as the hard cap; factual
- **Body** — why it changed, and how a reader can verify it
- **Trailers** — structured metadata (references, authorship)
  </format>

### ASCII Symbols

<charset>
Use ASCII punctuation and symbols only. Non-English prose is fine — the restriction is on
decorative and typographic Unicode, not on natural language.

- No em/en dashes (—, –) — use `--` or `-`
- No arrows (→, ←, ↔) — use `->`, `<-`, `<->`
- No bullet symbols (•, ▸) — use `-` or `*`
- No fancy quotes (“”, ‘’) — use straight quotes
- No emoji (🐛, ✅, 🚀) — unless project convention requires it
- No other decorative symbols (©, ™, §, ¶, ∞)

Git tooling, terminals, email patches, and `git log` render ASCII reliably everywhere. Unicode symbols break in some
environments and add no information over their ASCII equivalents.

</charset>

## Subject Line

- With scope (monorepos): `[scope] <verb> <description>`
- Without scope (single-purpose repos): `<verb> <description>`

<subject-rules>
- Target 50 characters or less; hard cap 72
- Imperative mood: "add", not "added"
- Lowercase after the scope (proper nouns keep their case)
- No period at the end
- **Factual**: say what changed, not how good the change is
- **No filler tics**: drop "this commit", "I", "we", "now", "currently"; never restate the scope
</subject-rules>

### Scope (Optional)

Scope is useful for **monorepos** and repositories with multiple deliverables. A single-purpose repository can omit it.

<scope-guidance>
**Use scope when:**

- The repository is a monorepo with multiple projects or packages
- The repository contains distinct subsystems (frontend, backend, libs)
- Readers filter `git log` by component

**Omit scope when:**

- The repository has a single purpose
- All code serves one deliverable
- The scope would always be the same </scope-guidance>

The scope names the affected subsystem:

- `[parser]` — top-level project
- `[core/auth]` — nested path
- `[web/api]` — component within a project

Derive the scope from file paths, not from file contents — use the common parent directory or the most significant
affected component. Use one spelling for one component: `[myapp/backend]` and `[myapp/b]` in the same log break the
filtering that scope exists for.

Version directories in the path (`v2` and similar, in any language) follow the reader's-candidates rule: while one
version is alive, omit the segment — `[core/engine]`, not `[core/engine/v2]`; the reader has one candidate. When
versions coexist, the segment is the distinction that matters — `[core/engine/v1]` and `[core/engine/v2]`.

## Body

<body-philosophy>
A good commit message is rarely a single line.

The body is the channel to future readers. It answers:

- **What** changed beyond the subject
- **Why** the change was needed
- **How a reader can verify it** later, when that is not obvious — reproduction steps they can follow
  (`run X, confirm Y`), not the results you produced this session

"How to verify" means instructions for a future reader, never a log of the checks you ran.
`Run the deduper twice and confirm idempotence` belongs here; `ran the suite, 55/55 passing` does not — that is a fact
about your terminal at commit time, not about the change.

Wrap body lines at 72 characters. This is a hard limit, not a guideline — git tooling (log, format-patch, email) assumes
72-character body lines. Trailers are the only exception. </body-philosophy>

### Record, Not Documentation

<record-not-documentation>
The body records why this change happened. It does not document the result — the changed files do
that. A rationale, invariant, or behavior description that is worth keeping goes into the artifact
(a code comment, a design doc, the README); the diff then carries it into history.

Signs that a body has become documentation:

- A paragraph for each decision inside the artifact — that is the artifact's design doc
- A list of the surfaces, files, or tests the change touches — the diff already lists them
- A restatement of what the updated docs say
- A story of how you verified the change ("verified by building X", "measured on Y") — that is a session artifact

**The test:** would the paragraph stay true and useful if you pasted it into the repo's docs? Then it belongs in the
repo's docs, not in the message. A body past ~20 lines usually fails this test. </record-not-documentation>

### When Body is Essential

- Bug fix — explain why the bug existed, not only what you fixed
- Feature — explain the use case
- Refactoring — explain the motivation
- Breaking change — explain the migration path
- Non-obvious change — explain the rationale
- Part of a commit chain — state what related work follows

Explain the decisions that shaped the change — not every decision inside the artifact.

### Terse Register

The diff carries the _what_; the message carries the _why_. Subjects and bodies are records, not narratives. Bodies can
use fragments and drop articles where clarity survives. Identifiers, file paths, and error strings stay exact.

**Tense carries the timeline.** State the old behavior in the past tense — it is the cause. State the new behavior in
the plain present tense — the commit itself marks the "now":
`Empty input dereferenced nil. Returns empty token list instead.`

**Never include:**

- "This commit does X", "This change..." — the diff says what.
- "I", "we" — the commit speaks for itself.
- "now", "currently", "previously" — tense already carries the timeline.
- "As requested by..." — use a `Co-Authored-By:` trailer or omit.
- The scope restated: `[parser] update parser code` → `[parser] handle empty input`.
- Promotional adjectives without specifics: "great", "amazing", "improved", "better" — say what is better.
- Decorative Unicode — em dashes, arrows, fancy quotes, emoji, bullet symbols (see ASCII Symbols above).
- Filler: "just", "really", "basically", "actually", "simply"; connective fluff: "however", "furthermore",
  "additionally".
- Session artifacts: test pass counts ("55 of 55 tests passing", "all tests green"), lint/typecheck/build/quality-gate
  status, CI results, "all checks pass", and verification stories ("verified by building X", "measured on Y"). These
  record your session at commit time, not the change — a future reader cannot verify them, and the next commit makes
  them stale. Reproduction steps a reader can follow are fine (see Body above); the log of checks you ran is not.

**Bad:**

```

[parser] fix the bug in parser

This commit fixes a bug we found where the parser was incorrectly handling empty input. I noticed that it would now
sometimes panic, so I added a guard to prevent this issue.

```

**Good:**

```

[parser] handle empty input in token scanner

Empty input dereferenced nil in the scanner loop. Returns empty token list instead.

Fixes: #234

```

The subject drops "the bug in parser" (a scope restatement) and states the fix. The body drops "this commit / I / we /
now", uses fragments, and names the actual cause.

### Body Patterns

<body-patterns>
**Bug fix — name the cause:**

```

Session cache returned nil when the key existed but the value had expired. The TTL check ran after the nil check, so
expired sessions caused panics.

Returns ErrExpired instead, so callers can tell "not found" from "expired".

```

**Feature — name the purpose:**

```

Buffers push attempts and sends them as one batch request on a configured interval. Reduces request volume to the API.

```

**Refactoring — name the benefit:**

```

- Use Dependency by-pointer to simplify usage patterns
- Add convenience methods: BorrowByName, BorrowByID

Preparation for the new package resolution algorithm.

```

**Commit chain — state what follows:**

```

Integration with the order processing pipeline follows in a separate change.

```

Name the specific work that follows. Not "more changes coming" — say what and where. </body-patterns>

## Breaking Changes

<breaking-changes>
When a commit breaks backward compatibility, the body MUST start with a `BREAKING:` declaration as
the first paragraph:

```

BREAKING: <what is broken>

<explanation and migration path>
```

The `BREAKING:` prefix is uppercase, followed by a short description of what breaks. The next paragraphs explain why and
how to migrate. </breaking-changes>

## Trailers (Footer Metadata)

Trailers are structured key-value pairs at the end of the commit message, in
[git-trailer format](https://git-scm.com/docs/git-interpret-trailers).

<trailers>
```
Key-Name: value
Another-Key: value with spaces
```

A blank line separates the body from the trailers. Each trailer is on its own line.

</trailers>

### Common Trailers

- `Task:` — link to issue tracker — `Task: https://tracker.example.com/PROJ-123`
- `Fixes:` — issue this commit fixes — `Fixes: #456` or `Fixes: PROJ-456`
- `Refs:` — related issues/commits — `Refs: #123, #124`
- `Closes:` — auto-close issue on merge — `Closes: #789`
- `See:` — related documentation — `See: docs/auth.md`
- `Reviewed-By:` — code reviewer — `Reviewed-By: Alice <alice@example.com>`
- `Co-Authored-By:` — additional authors — `Co-Authored-By: Bob <bob@example.com>`

<trailer-conventions>
- All trailer keys use Title-Case
- Keep values on a single line when possible
- Multiple values: comma-separate them, or repeat the trailer
</trailer-conventions>

## Examples

<examples>

### Good: Bug fix with cause explanation

**Story:** Users reported session timeouts. Investigation revealed the cache was panicking on expired entries instead of
returning an error.

```
[core/cache] fix nil pointer in session lookup

Session cache returned nil when key existed but value had expired.
TTL check happened after nil check, causing panics.

Returns ErrExpired instead, letting callers tell "not found" from
"expired".

Fixes: #127
```

**Why it works:** The subject is factual ("fix nil pointer"), not promotional ("fix critical bug"). The body names the
cause (TTL check order), not only the symptom.

---

### Good: Feature without scope (single-purpose repo)

**Story:** A metrics library was causing API rate-limits due to high request volume. Task was to reduce requests by
batching pushes.

```
add buffered metrics pusher

Batches push attempts and sends them as a single request on a
configured interval. Reduces API request volume.

Task: https://tracker.example.com/MRN-53
```

**Why it works:** No scope — a single-purpose metrics library. The subject states what was added; the body states the
mechanism and the benefit, without "amazing" or "greatly improved".

---

### Bad: Promotional subject

**Story:** Refactored the query builder to use prepared statements instead of string concatenation.

```
[storage] implement better SQL query construction
```

**Problem:** "better" is a judgment, not a fact. The subject sells instead of describing.

**Fixed:**

```
[storage] replace SQL string concatenation with query builder

Prevents SQL injection. Prepared statements carry all dynamic
values.
```

**Why the fix works:** The subject states the factual change (replaced X with Y). The body states the concrete benefit.

---

### Bad: Missing cause in bug fix

**Story:** Login was failing for some users. Found that password hash comparison was case-sensitive on some databases.

```
[auth] fix login bug

Fixed the login issue.

Fixes: #234
```

**Problem:** "fix login bug" and "fixed the login issue" say nothing. What was the bug? Why did it happen?

**Fixed:**

```
[auth] fix case-sensitive password hash comparison

Some database collations compare strings case-sensitively, causing
hash mismatches for passwords with mixed case. Uses binary
comparison explicitly.

Fixes: #234
```

**Why the fix works:** The subject states the actual fix. The body explains why the bug existed (database collation) and
what changed.

---

### Bad: No body on non-trivial change

**Story:** Migrated authentication from session cookies to JWT tokens. This affects all API endpoints.

```
[auth] migrate to JWT authentication
```

**Problem:** A major architectural change with a single-line message. What happens to existing sessions? What is the
migration path?

**Fixed:**

```
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

**Why the fix works:** The breaking change is declared first. The body states the impact and the migration steps, and
links the documentation.

---

### Bad: Mixed changes, vague description

**Story:** While fixing a bug in the parser, also cleaned up some formatting and added a new validation method.

```
[parser] various improvements and fixes
```

**Problem:** "various improvements" is meaningless. What was improved? What was fixed? This should be multiple commits.

**Analysis:** This is a workflow problem, not only a message problem. Mixed changes split into atomic commits:

1. `[parser] fix off-by-one error in token position`
2. `[parser] reformat according to style guide`
3. `[parser] add validation for nested expressions`

Each commit is focused and independently reviewable.

</examples>

## Amending Commits

<amend-rule>
When amending a commit (`git commit --amend`), **rewrite the message as if the commit is new**.

An amended commit replaces the original — it rewrites history. The final message must describe what the commit
introduces, not the journey of revisions that led to it. From the reader's perspective there is no "original commit";
there is only the resulting commit.

**Common violation:** the agent treats the amend as iterative work and describes changes relative to the original commit
("also update the tests", "fix the edge case from the previous version", "address review feedback"). The reader has no
access to the original commit and no context for "also" or "previous".

**Correct approach:** read the full staged diff after amending, then write a message that describes the complete change
as a single introduction. Ignore the original message — start fresh.

```
# WRONG — describes the amend as incremental work
[parser] fix edge case missed in previous commit

Adds handling for empty input that was overlooked in the initial implementation.
Also updates tests to cover the new branch.

# RIGHT — describes the complete change
[parser] handle empty input in token scanner

Empty input dereferenced nil in the scanner loop. Returns an empty
token list instead.
```

</amend-rule>

## No AI Attribution

<forbidden>
**Never add references that indicate AI involvement:**

- No "Generated with Claude Code" or similar
- No "Co-Authored-By: Claude" or any AI co-author trailer
- No emoji that marks AI generation (🤖, etc.)
- No links to claude.com, anthropic.com, or AI tools

Commits must appear as regular developer commits.

</forbidden>

<critical>
## Core Principles

- **Record, not documentation** — the body carries the why of the change; rationale, invariants, and behavior
  descriptions live in the artifact and travel in the diff
- **Use available context** — draw the why from task, implementation, and deliverable; do not transcribe them
- **Factual subjects** — what changed, not how good
- **Explain the cause** — for a bug fix, say why it was broken
- **Body is essential** — single-line commits are rarely acceptable; a body past ~20 lines is usually documentation in
  disguise
- **Terse register** — the diff carries the what; the message carries the why. No "this commit / I / we"; tense carries
  the timeline; no filler; no promotional adjectives
- **No session artifacts** — test counts, lint/CI/gate status, and verification stories record your session, not the
  change; "how to verify" means reader reproduction steps
- **BREAKING first** — a breaking change starts the body with `BREAKING:`
- **Trailers for metadata** — Title-Case, structured format
- **Amends rewrite history** — an amended message describes the full change, not the delta
- **ASCII symbols** — no decorative Unicode (em dashes, arrows, fancy quotes, emoji); ASCII equivalents only
- **No AI attribution** — commits appear as regular developer work
  </critical>
