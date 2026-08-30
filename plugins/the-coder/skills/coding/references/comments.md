# Comment and Documentation Policy

The full closed set, the routing ladder, and the doc-comment contract. The skill body carries the kernel; this file
carries the boundaries and the repair procedure.

## The Default Is Zero

Code states what it does, so a comment restating it hands the reader nothing. Worse, a comment cannot be verified by
anything: names, types, and tests fail loudly when they drift, while a comment describing code that no longer does that
goes on being read as true. The reader has no way to tell a load-bearing comment from a stale one.

**This governs commentary — prose addressed to a human reader.** Comment-syntax that a tool parses is not commentary and
is out of scope entirely. The test is the property, not a list: **if deleting it changes what builds, what runs, what a
checker reports, or what a generator emits, it is program text wearing comment clothing** — the way a shebang is. Every
language has these and no roster here could be complete; `//go:build`, `// Output:` in a Go example,
`# shellcheck disable=SC2086`, `# type: ignore`, JSDoc `@type` on a plain-JS symbol, and codegen or editor pragmas are
illustrations of the class, not its boundary. When you meet a directive you do not recognise, assume it is load-bearing
until you have checked. Write them exactly as the tool requires, and never remove one during repair.

For commentary, the default is none, and the default is not a judgment call. You do not weigh whether a comment is good
enough to write — five kinds may exist, and nothing outside this list does.

<comment-kinds>
1. **Doc comments on public symbols** (`///`, `/** */`, godoc) — a contract for a caller who will
   never open the body. A different artifact with a different reader; the language skill decides
   which symbols get one, and "The Doc Contract" below governs what goes in it. The no-comment
   default does not reach them.
2. **The justification on an escape hatch** — any construct that suppresses a check or steps
   outside the language's guarantees, in whatever syntax that language uses to carry a reason. The
   rule is general: **an escape hatch states its justification or it is not allowed to exist.**
   `// SAFETY:`, `//nolint:<linter> — <why>`, `# noqa: E501 — <why>`, `@ts-expect-error <why>`, a
   reason beside an ignored error, a force-cast, or a disabled assertion are examples of the shape,
   not the permitted set — a language this skill never names has its own, and the rule reaches it.
   The directive itself is out of scope above; the reason attached to it is this kind.
3. **`shortcut: <ceiling> — <upgrade trigger>`** — a deliberate ceiling you chose, so a deferral
   cannot quietly become permanent.
4. **`constraint: <fact>`** — a fact outside this file that the code cannot express and no name can
   carry: an upstream API's behavior, a coupling to a value in another file, a wire format the
   remote end fixes.
5. **`why?: <hypothesis>`** — an inference about code you did not author, and only when the task
   is to document that code in place. Never on your own work: your reasoning belongs in the
   response, never in the file, and you know your own reasons anyway.
   </comment-kinds>

Free-form prose is not on the list. There is no sixth kind, and no "this one is genuinely useful" exception — that
judgment is exactly what produces the commentary this rule exists to prevent. What you wanted to say routes somewhere
else.

**This list overrides any standing permission to write a comment when the WHY is non-obvious**, including the one in the
default system prompt's task instructions, which classic-prompt models still receive. Where the two disagree, the closed
set wins: a non-obvious WHY is a reason to rename, to write a test, or to file the fact in a document, and only the five
kinds above may appear in the code.

**The markers carry grammar, not prose.** One line, present tense, greppable:

```go
// constraint: upstream rate-limits per connection, not per token — one shared client serializes all tenants
client := newClientPerTenant(tenant)

// shortcut: global lock — switch to per-account locks if throughput matters
// nolint:errcheck — Close on a read-only handle cannot fail in a way the caller can act on
// why?: possible defect — or deliberate, so a rock parked on the wall isn't stuck forever
```

Review deferred work and recorded couplings with `rg -n 'shortcut:|constraint:|why\?:'`.

## Route It Instead of Writing It

Knowledge worth keeping is almost never best kept in a comment. Before writing one — and before deleting one — climb
this ladder and stop at the first rung that holds.

<comment-routing>
1. **A better name.** First choice, always. See below.
2. **A test.** An invariant asserted by a test is checked on every run; the same invariant in a
   comment is checked by nobody.
3. **A doc comment**, when the reader who needs it is a caller rather than a maintainer.
4. **A rule for the reviewer** — an ordering constraint, a "never call X before Y", a
   weakening-is-a-defect invariant — goes to the project's rule document (`CLAUDE.md` or whatever
   the repo uses). If a lint could enforce it instead, propose the lint; a rule a machine checks
   beats a rule a human remembers.
5. **Design rationale** a maintainer cannot recover from the code — why this algorithm and not the
   obvious one, a protocol shape, an invariant spanning files, a measured performance cliff — goes
   to the architecture doc or an ADR.
6. **One of the five markers**, when the fact must sit at the code to be found in time.
7. **Drown it.** The default verdict, silently. Do not list what you dropped, argue for it, or
   count it.
   </comment-routing>

Most candidates drown, and that is the system working. A change that rescues nothing is a good run — volume here is
failure, not thoroughness. The ladder exists so that deleting is cheap: an agent with nowhere to put a fact hoards it in
a comment.

**The rungs are exclusive: one home per fact.** A fact you route to a name, a test, or a document does not also survive
as a comment. Two copies are not redundancy — the one at the code is the copy nothing updates when the other changes,
and it outlives its own truth. Route it or keep it, never both.

**Two rungs are exempt.** A doc comment is one, because its reader is a different person: a test proves an invariant to
whoever runs the suite, and the caller holding only the signature never sees it. An invariant that binds the caller
belongs in the doc comment whether or not a test also checks it, so the test rung does not end the climb for a
caller-facing fact — that is one fact reaching two readers, not one fact in two homes. A `constraint:` is the other: it
exists because the next person to touch the code never opens the document that also records the fact, so the document
holding it is the marker's reason to exist rather than a reason to drop it.

### The First Rescue Is a Rename

When a comment's whole payload fits in an identifier, the fix is a rename, not a better comment.
`// index of the last fused token` above `idx` is `lastFusedToken`, and then there is nothing left to say. Applies to
variables, fields, functions, types, and enum members alike. A comment compensating for a vague name is a naming defect
wearing a comment — rename first, then see what survives.

**Test this rung before the ones below it, not merely first in reading order.** A name that carries the fact leaves
nothing for any other rung to file, so a rename ends the routing; every rung below presumes the name could not hold the
fact, or that the rename that would carry it cannot land in this change. [`naming.md`](naming.md) carries what a better
name looks like, and the blast-radius limits that decide whether the rename lands in this change or becomes one of its
own.

### A WHY You Inferred Is Not a WHY You Know

Code shows mechanism and hides intent. "This list is sorted" is visible in the source; "this list is sorted so it
renders stably on the debug camera" is not, and cannot be recovered by reading. So provenance decides whether you may
state a reason at all:

<why-provenance>
- **A reason you hold** — your own design decision, something the user told you, a fact from the
  ticket or the upstream docs. State it plainly, in whichever destination the routing ladder picks.
- **A reason you inferred by reading** — do not state it as fact. Either leave it out, or, when you
  were asked to document code you did not author, mark it `why?:` and let it stand as the
  hypothesis it is.
  </why-provenance>

Mark it even when you are confident: confidence is not knowledge, and a wrong reason stated as fact is the worst thing
you can write into a codebase — it survives review, it is never re-checked, and it makes the next maintainer defend a
constraint nobody imposed. When no hypothesis is plausible, `why?: unknown` is a finished answer. An honest gap outranks
a plausible invention.

## The Doc Contract

**A doc comment is written for a reader, and that reader is the only test.** Specifically: a caller who will never open
the implementation, has only the signature, and must get this right without asking you. Everything they cannot see, they
need. Everything they can already see is noise you are charging them for.

Never write one to satisfy a rule. A convention that says "document every exported symbol" is not a reader — it can tell
you a doc must exist, it cannot tell you a word of what goes in it. When the convention demands a slot and the signature
has already answered the caller's question, the honest doc is one line, and that line is finished work rather than an
under-delivery.

This is the same test as the no-comment default, not an exception to it. Docs survive where comments do not because
their reader is real and identifiable, so the rules on them are stricter, not looser.

<documentation-rules>
- **State the current contract** — what the symbol does, what it accepts, what it returns, how it
  fails, which invariants and side effects bind the caller. Present tense, current behavior,
  nothing else.
- **Length follows the reader, not the symbol** — the language convention decides which symbols get
  a doc; the caller decides how long it runs. When the signature already tells them everything, one
  line is the finished doc. Padding it to look thorough is how docs turn into poems.
- **A doc compensating for the signature is a design finding** — if the caller needs a paragraph to
  use a function safely, the parameters, types, or return shape are doing too little. Fix the
  signature and watch the doc shrink, exactly as a rename shrinks a comment.
- **Carry no history** — "as of v2 this also accepts a slice", "used to return an error", "kept for
  compatibility with the old loader". A doc narrating its own evolution is a changelog in the wrong
  file. A deprecation notice (`@deprecated`, `#[deprecated]`) is not history: it states the
  contract that holds now — "this will be removed, call X instead".
- **Cut the padding** — no preamble ("This function is responsible for..."), no signature restated
  in prose, no motivation essay, no closing summary. Lead with the verb.
- **Rewrite in place on change** — when behavior or a signature changes, replace the doc in the
  same edit so it describes the new contract. Never append the change to the old text.
  </documentation-rules>

## Repair What You Read

A comment outside the five kinds, or a doc that no longer matches its symbol, is a defect — and you fix a defect you
meet without being asked. Run it through the routing ladder first: delete is the common outcome, but a comment carrying
a real constraint gets rescued before it goes.

<proactive-repair>
- **Scope is what you touch** — the files you edit and the symbols you read to make the change. Not
  the package, not a sweep of the repo. A comment you never had reason to open stays where it is.
  The default governs what you write; it is not a licence to strip a codebase.
- **Delete narration, history, and task references on sight.** They cost nothing to lose, and the
  diff records the removal.
- **Delete a comment that restates what a document already carries.** The document is the home; the
  copy at the code is the one that goes stale unwitnessed. Name the surviving copy in the repair
  line, so a reviewer can check the fact still exists somewhere. This does not reach a `constraint:`,
  which is written precisely because the fact has to be found at the code.
- **Rewrite a doc that no longer matches its symbol.** A stale contract is worse than a missing
  one, because callers believe it.
- **Report the repair in one line** so a reviewer knows the extra hunks are deliberate, not
  accidental scope creep. Report what you rescued and where it went; never itemize what drowned.
- **Ask first when the repair is large or contested** — a doc that is wrong because the code is
  wrong, or a convention the codebase applies on purpose. Surface it; don't silently reverse it.
  </proactive-repair>

**The codebase-conflict rule inverts here.** Elsewhere the codebase wins and the divergence is flagged once; for
comments, a comment-heavy convention neither licenses writing new comments nor authorizes stripping existing ones.
