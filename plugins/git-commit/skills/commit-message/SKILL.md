---
name: commit-message
description: >-
  Git commit message conventions: structure, formatting, scoping, body content, breaking changes,
  trailers. Invoke whenever task involves any interaction with commit messages — writing,
  reviewing, validating, or understanding message format.
---

# Commit Message Format

<scope>
These rules apply **only to git commit messages**. Do not apply line length limits, formatting
conventions, or structure requirements from this skill to other files (code, documentation, configs, etc.).
</scope>

A good commit message is a patch note read by colleagues, QA, and future you.

<mental-model>
Before writing, imagine:
- You're writing a patch note for users
- You're writing a task for QA to verify
- Someone will read this at 3am debugging production
</mental-model>

## What Makes a Good Message

<context-principle>
The best commit messages draw from three sources:

- **The task** — what problem was being solved
- **The implementation context** — why this approach was chosen
- **The deliverable** — what was actually built

When all three are available, use them. The code shows WHAT exists; context reveals WHY. When context is incomplete,
describe what you can verify from the code and available information. </context-principle>

### Factual, Not Promotional

<factual-principle>
Commit messages are **factual records**, not marketing copy.

**Subject line**: Strictly factual. Imperative mood. No judgment. Describes what was done, not how good it is.

**Body**: Can explain reasoning and trade-offs, but remains objective. Avoid promotional language.

The subject answers: "What did this commit do?" Not: "Why is this commit amazing?" </factual-principle>

## Structure

<format>
```
[scope] subject

body

trailers

```

**Subject**: What changed (max 72 chars, factual)
**Body**: Why it changed, how to verify
**Trailers**: Structured metadata (references, authorship)
</format>

## Subject Line

```

[scope] <verb> <description> # with scope (monorepos)

<verb> <description>            # without scope (single-purpose repos)
```

<subject-rules>
- Max 72 characters total
- Imperative mood: "add" not "added"
- Lowercase after scope (except proper nouns)
- No period at end
- **Factual**: describe what, not how good
</subject-rules>

### Scope (Optional)

Scope is useful for **monorepos** or repositories with multiple deliverables. For single-purpose repositories, scope can
be omitted.

<scope-guidance>
**Use scope when:**
- Monorepo with multiple projects/packages
- Repository contains distinct subsystems (frontend, backend, libs)
- Changes need to be filtered by component in git log

**Omit scope when:**

- Repository has a single purpose
- All code serves one deliverable
- Scope would always be the same </scope-guidance>

When using scope, it identifies the affected subsystem:

```
[parser]          # top-level project
[core/auth]       # nested path
[web/api]         # component within project
[myapp/backend]   # or abbreviated: [myapp/b]
```

Determine scope from file paths (not contents) — use the common parent directory or the most significant component
affected.

## Body

<body-philosophy>
A good commit message is very rarely single-line.

The body is where you communicate with future readers. It answers:

- **What** changed beyond the subject
- **Why** this change was needed
- **How to verify** if not obvious

Wrap all body lines at 72 characters. This is a hard limit, not a guideline — git tooling (log, format-patch, email)
assumes 72-char body lines. Trailers are the only exception. </body-philosophy>

### When Body is Essential

- Bug fix — explain WHY the bug existed, not just what you fixed
- Feature — explain the use case
- Refactoring — explain the motivation
- Breaking change — explain migration path
- Non-obvious change — explain rationale

### Body Patterns

<body-patterns>
**Bug fix — explain the cause:**
```
Session cache was returning nil when the key existed but the value had expired.
The TTL check happened after the nil check, causing panics on expired sessions.

Now returns ErrExpired, allowing callers to distinguish between "not found" and "expired".

```

**Feature — explain the purpose:**
```

Reduces request volume to the API by buffering push attempts and sending them as a single batch request on a configured
interval.

```

**Refactoring — explain the benefit:**
```

- Use Dependency by-pointer to simplify usage patterns
- Add convenience methods: BorrowByName, BorrowByID

Preparation for the new package resolution algorithm.

```
</body-patterns>

## Breaking Changes

<breaking-changes>
When a commit breaks backward compatibility, the body MUST start with a `BREAKING:` declaration
as the first paragraph:

```

BREAKING: <what is broken>

<explanation and migration path>
```

The `BREAKING:` prefix is uppercase and followed by a brief description of what breaks. The following paragraphs explain
why and how to migrate. </breaking-changes>

## Trailers (Footer Metadata)

Trailers are structured key-value pairs at the end of the commit message, following
[git-trailer format](https://git-scm.com/docs/git-interpret-trailers).

<trailers>
```
Key-Name: value
Another-Key: value with spaces
```

Blank line separates body from trailers. Each trailer on its own line. All trailers use Title-Case for consistency with
git standards.

</trailers>

### Common Trailers

| Trailer           | Purpose                   | Example                                      |
| ----------------- | ------------------------- | -------------------------------------------- |
| `Task:`           | Link to issue tracker     | `Task: https://tracker.example.com/PROJ-123` |
| `Fixes:`          | Issue this commit fixes   | `Fixes: #456` or `Fixes: PROJ-456`           |
| `Refs:`           | Related issues/commits    | `Refs: #123, #124`                           |
| `Closes:`         | Auto-close issue on merge | `Closes: #789`                               |
| `See:`            | Related documentation     | `See: docs/auth.md`                          |
| `Reviewed-By:`    | Code reviewer             | `Reviewed-By: Alice <alice@example.com>`     |
| `Co-Authored-By:` | Additional authors        | `Co-Authored-By: Bob <bob@example.com>`      |

<trailer-conventions>
- All trailers use Title-Case keys
- Keep values on single line when possible
- Multiple values: use comma-separated or multiple trailers
</trailer-conventions>

## Examples

Each example includes: context (what led to the change), the message, and analysis (why it works or doesn't).

<examples>

### Good: Bug fix with cause explanation

**Story:** Users reported session timeouts. Investigation revealed the cache was panicking on expired entries instead of
returning an error.

```
[core/cache] fix nil pointer in session lookup

Session cache returned nil when key existed but value had expired.
TTL check happened after nil check, causing panics.

Now returns ErrExpired, letting callers distinguish "not found" from "expired".

Fixes: #127
```

**Why it works:** Subject is factual ("fix nil pointer"), not promotional ("fix critical bug" or "improve session
handling"). Body explains the cause (TTL check order), not just the symptom. Reader understands both what was wrong and
why.

---

### Good: Feature without scope (single-purpose repo)

**Story:** A metrics library was causing API rate-limits due to high request volume. Task was to reduce requests by
batching pushes.

```
add buffered metrics pusher

Batches push attempts and sends them as a single request on a configured interval.
Reduces API request volume.

Task: https://tracker.example.com/MRN-53
```

**Why it works:** No scope needed — this is a single-purpose metrics library. Subject states what was added ("add
buffered metrics pusher"), not why it's good. Body explains the mechanism and benefit objectively. No "implement amazing
new feature" or "greatly improve performance".

---

### Bad: Promotional subject

**Story:** Refactored the query builder to use prepared statements instead of string concatenation.

```
[storage] implement better SQL query construction
```

**Problem:** "better" is a judgment, not a fact. What makes it better? The subject sells rather than describes.

**Fixed:**

```
[storage] replace SQL string concatenation with query builder

Prevents SQL injection and improves readability.
Uses prepared statements for all dynamic values.
```

**Why the fix works:** Subject describes the factual change (replaced X with Y). Body explains the benefits objectively.

---

### Bad: Missing cause in bug fix

**Story:** Login was failing for some users. Found that password hash comparison was case-sensitive on some databases.

```
[auth] fix login bug

Fixed the login issue.

Fixes: #234
```

**Problem:** "fix login bug" and "fixed the login issue" say nothing. What was the bug? Why did it happen? Future reader
learns nothing.

**Fixed:**

```
[auth] fix case-sensitive password hash comparison

Some database collations compare strings case-sensitively, causing hash mismatches for
passwords with mixed case. Now uses binary comparison explicitly.

Fixes: #234
```

**Why the fix works:** Subject describes the actual fix. Body explains why the bug existed (database collation) and what
changed.

---

### Bad: No body on non-trivial change

**Story:** Migrated authentication from session cookies to JWT tokens. This affects all API endpoints.

```
[auth] migrate to JWT authentication
```

**Problem:** Major architectural change with single-line message. How does this affect existing sessions? What about the
migration path?

**Fixed:**

```
[auth] migrate to JWT authentication

BREAKING: removes cookie-based session authentication

All API endpoints now require Bearer token in Authorization header.
Existing sessions will be invalidated on deploy.

Migration:
1. Clients must obtain JWT via /auth/token endpoint
2. Include token in Authorization header for all requests
3. Token refresh available via /auth/refresh

See: docs/auth-migration.md
Closes: #456
```

**Why the fix works:** Breaking change is declared upfront. Body explains impact, migration steps, and links to
documentation.

---

### Bad: Mixed changes, vague description

**Story:** While fixing a bug in the parser, also cleaned up some formatting and added a new validation method.

```
[parser] various improvements and fixes
```

**Problem:** "various improvements" is meaningless. What was improved? What was fixed? This should be multiple commits.

**Analysis:** This is a workflow problem, not just a message problem. Mixed changes should be split into atomic commits:

1. `[parser] fix off-by-one error in token position`
2. `[parser] reformat according to style guide`
3. `[parser] add validation for nested expressions`

Each commit is focused and independently reviewable.

</examples>

## Amending Commits

<amend-rule>
When amending a commit (`git commit --amend`), **rewrite the message as if the commit is new**.

An amended commit replaces the original — it rewrites history. The final message must describe what the commit
introduces, not the journey of revisions that led to it. There is no "original commit" from the reader's perspective;
there is only the resulting commit.

**Common violation:** The agent treats the amend as iterative work and writes a message describing changes relative to
the original commit ("also update the tests", "fix the edge case from the previous version", "address review feedback").
This is wrong — the reader has no access to the original commit and no context for "also" or "previous."

**Correct approach:** Read the full staged diff after amending, then write a message that describes the complete change
as a single introduction. Ignore the original message entirely — start fresh.

```
# WRONG — describes the amend as incremental work
[parser] fix edge case missed in previous commit

Adds handling for empty input that was overlooked in the initial implementation.
Also updates tests to cover the new branch.

# RIGHT — describes the complete change
[parser] handle empty input in token scanner

Empty input previously caused a nil dereference in the scanner loop.
Returns an empty token list instead.
```

</amend-rule>

## No AI Attribution

<forbidden>
**Never add references indicating AI involvement:**

- No "Generated with Claude Code" or similar
- No "Co-Authored-By: Claude" or any AI co-author trailers
- No emojis marking AI generation (🤖, etc.)
- No links to claude.com, anthropic.com, or AI tools

Commits must appear as regular developer commits.

</forbidden>

<critical>
## Core Principles

- **Use available context** — draw from task, implementation, and deliverable when available
- **Factual subjects** — describe what, not how good
- **Explain the cause** — for bug fixes, say WHY it was broken
- **Body is essential** — single-line commits are rarely acceptable
- **BREAKING first** — breaking changes start body with `BREAKING:` prefix
- **Trailers for metadata** — use Title-Case, structured format
- **Amends rewrite history** — amended messages describe the full change, not the delta
- **No AI attribution** — commits appear as regular developer work
  </critical>
