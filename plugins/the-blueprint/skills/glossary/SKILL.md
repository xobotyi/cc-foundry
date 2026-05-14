---
name: glossary
description: >-
  Project glossary for consistent domain terminology. Invoke whenever task
  involves creating, updating, or referencing a glossary, defining domain
  terms, establishing ubiquitous language, or when inconsistent naming
  causes confusion in code or planning artifacts.
---

# Glossary

A glossary prevents naming drift on the small set of terms where drift is likely. It is **not** a project dictionary —
not every domain concept belongs. The highest-leverage element of each entry is the **rationale on the `Avoid` line**:
what plausible-but-wrong name would a reviewer or agent reach for, and why is it a trap? Without that rationale, the
entry teaches nothing.

LLMs are amplifiers — give them a clear vocabulary and they generate coherent structure; give them a codebase where the
same concept has four names, and they'll invent a fifth. The glossary makes the choice for them.

A glossary's real failure mode is disuse. If it isn't the document a reviewer reaches for during naming disagreements,
no amount of format polish saves it. Every rule below — the trap test, rationale-bearing `Avoid` lines, the CLAUDE.md
pointer — exists to make the glossary worth opening.

## Scope

Decide how many glossaries the project needs:

- **Single glossary** — one domain, one team, no terms with double meanings across the codebase.
- **Per-bounded-context** — the same word means different things in different parts of the system (e.g., `Order` in
  billing vs fulfillment). In DDD terms, each bounded context speaks its own dialect of the ubiquitous language; one
  glossary per dialect. Create one file per context; name each context explicitly.

## Selecting Terms — the trap test

For each candidate term, apply the trap test: **would a reviewer or agent plausibly reach for a wrong name here?** If
the only name anyone would use is the canonical one, omit the entry. The glossary's job is naming-drift prevention, not
domain documentation.

**Where to look — discovery is evidence-driven, not enumeration-driven:**

- Naming disagreements in this conversation or recent code review.
- Mismatches between code identifiers and how the team speaks ("we call it the sync worker; the code says
  `gerrit-events-consumer`").
- Library or SDK terms that bleed into local code with a different meaning (third-party `Job` vs project `Task`).
- Words used for two distinct concepts in the same discussion (live overload).
- Discovery or alignment artifacts (when invoked inside the DRAFT pipeline).
- Postmortems or incident reports mentioning "we thought X meant Y" or "the rename caused…".

"Find every entity, event, and value object" reliably produces overcollection — most candidates won't pass the trap test
anyway. Start from evidence of confusion, then filter.

**Worth including:**

- Terms with multiple plausible names where the wrong one is genuinely tempting.
- Canonical names that conflict with a stronger natural name — the system says `Source`, but everyone says `Gerrit`.
- Concepts that look like another concept — the system's `Re-release` reads as `Retry` to anyone not steeped in it.
- Overloaded primitives — a single event type routed to two different domain buckets, where the routing logic is
  non-obvious from the name.
- Aliases that exist in upstream APIs or libraries and bleed into local code (e.g., a third-party SDK calls it `Job`,
  the project calls it `Task`).

**Worth omitting:**

- Terms with one obvious name and no synonym pressure — no plausible wrong name → no trap → no entry.
- Implementation details — config field names, struct names, internal helpers. These belong in code documentation, not
  the glossary.
- External services with one canonical name in the company.
- Generic programming concepts (array, function, endpoint) unless they have a project-specific meaning.

The selectivity rule is load-bearing. A glossary that lists everything trains the next pass to add more "for
completeness," and the bloat compounds. Restraint at creation defends against bloat at maintenance.

## Required intro paragraph

Every glossary opens with a 2–3 sentence scope statement. This deflects "why isn't X here?" from readers and calibrates
the `Avoid` criterion for downstream consumers:

```markdown
# [Project] Glossary

Project vocabulary. Only entries with a real risk of being mis-named are listed; everything else is in
[CLAUDE.md](../CLAUDE.md). For each term, **Avoid** lists the synonyms that are realistic naming traps — names a
reviewer or agent would plausibly reach for and get wrong.
```

The intro is not boilerplate — it is the contract between the glossary and its readers. Adapt the wording to the
project, but keep the two contractual statements: (1) the selectivity criterion, and (2) what `Avoid` means.

## Per-entry format

```markdown
### TermName

1–3 sentences defining what the term **is**, not what it does. Carry nuance — three kinds, four phases, an "and not"
clarification. No need to compress to one line.
**Avoid:** WrongName₁ (one-phrase rationale — what trap this name sets); WrongName₂ (rationale).
```

**Definition rules:**

- Define **what it is**, not what it does. "An aggregated bucket of atomic events for a `(source, chat, project, actor)`
  tuple" — not "the thing created when events are aggregated."
- Carry the nuance a one-liner would lose. Multi-clause definitions are fine; the heading format is chosen for exactly
  this.
- Do not list "see also" or "related terms" inline. They produce a low-value reference web. If cardinality matters, use
  the optional Relationships section.

**`Avoid` rules:**

- Each entry on the `Avoid` line **must** carry rationale in parentheses. Bare synonym lists ("Purchase, Transaction,
  Sale") rarely teach — the reader still doesn't know which trap is worth worrying about. With rationale ("Retry —
  implies error recovery, which this is not"), the entry becomes a calibration anchor.
- If a term has no realistic naming trap (no candidate `Avoid` entries), question whether the term belongs in the
  glossary at all. Most "no-trap" entries should be deleted, not entered without `Avoid`.

## Optional sections

Include only when the project genuinely benefits. Each one earns its place; don't bolt them on by default.

### Grouping by subdomain

When entries cluster naturally — Pipeline Concepts, Subscription Model, External Boundaries — use H2 headings to group
them. A flat list works for small glossaries. Don't force groupings on five entries.

### Flagged ambiguities

When the conversation or codebase actually uses one word for two concepts, call it out:

```markdown
## Flagged ambiguities

- "Account" is used in code for both **Customer** (places orders) and **User** (auth identity). These are distinct
  concepts; new code should not introduce `Account` without a disambiguating suffix.
```

Include only when a live conflict exists. Do not add an empty section as a placeholder.

### Relationships

For terms with non-obvious cardinality:

```markdown
## Relationships

- An **Invoice** belongs to exactly one **Customer**.
- A single **Order** can produce many **Invoices** — one per **Shipment**.
```

Narrative sentences, not a column. Skip when relationships are obvious from the entries themselves.

### Example usage

A short dialogue or 2–4 sentence narrative showing terms in natural use. Calibrates the register and exposes boundary
cases the definitions missed — especially useful when two concepts could plausibly be confused:

```markdown
## Example usage

> **Reviewer:** Why is this job re-released on every loop?
> **Author:** That's the **aggregation gate**. **Re-release** is the mechanism — not a retry. The bucket stays open
> while the gate says new events are still arriving.
> **Reviewer:** So flush only happens after `MaxAccumulationTime`?
> **Author:** Or after `ReReleaseInterval` of silence — both conditions matter.
```

## Placement

- **Single glossary:** `docs/glossary.md` or `docs/ubiquitous-language/glossary.md`
- **Per-context:** `docs/ubiquitous-language/{context}-glossary.md` (e.g., `billing-glossary.md`)
- **Reference from CLAUDE.md** early — primacy attention reduces naming violations significantly. Do not inline the
  glossary in CLAUDE.md; use progressive disclosure:

```markdown
## Domain Vocabulary

See `docs/glossary.md` for project terminology and prohibited aliases.
```

## Referencing a glossary

When applying terminology (not creating or updating):

1. Locate the glossary — check `docs/glossary.md`, `docs/ubiquitous-language/`, or ask the user.
2. Read it and find the relevant term(s).
3. Use the canonical name; actively avoid the listed `Avoid` entries.
4. If the concept isn't in the glossary, **run the trap test before adding it**. Not every absent term belongs. Most
   project nouns are not naming traps and should stay out.

## Updating a glossary

Maintenance is event-driven, not scheduled:

- **Naming mistake — yours, the model's, or a reviewer's:** add or update the term immediately. The mistake is both the
  trigger and the source of the `Avoid` rationale — write down which name was reached for, and why it's wrong.
- **New domain concept emerges:** add during discovery or alignment, but only if it passes the trap test.
- **Meaning shifts:** update the definition in place. Don't keep a changelog — the glossary is current truth.
- **Term renamed but legacy code still uses the old name:** keep the entry; add
  `**Deprecated:** prefer [NewName] — [one-phrase reason]` at the top of the definition. Delete the entry once the
  codebase is clean. This is the one acceptable exception to the no-changelog rule — the marker is operational, not
  historical.
- **Entry has no live trap anymore:** delete it. Stale "obvious" entries normalize bloat and dilute the signal of the
  remaining entries.

Edit in place. The glossary is single source of truth, not a versioned document.

## Re-running

When invoked again on the same project:

1. Read the existing glossary file in full.
2. Incorporate new terms surfaced since last invocation.
3. Update definitions whose understanding has evolved.
4. Re-flag any new ambiguities; remove ambiguities that have been resolved.
5. Delete entries that no longer pass the trap test.

A re-run is not an append. It is a re-derivation that may shrink the glossary as well as grow it.

## Rules

- **Heading per term, never tables.** Tables collapse multi-line definitions and rationale-bearing `Avoid` lines. Each
  entry is independent; KV/heading is the right primitive.
- **Trap test before inclusion.** If no plausible-but-wrong name exists, the entry doesn't exist.
- **`Avoid` lines carry rationale.** Synonyms without "why it's a trap" rarely teach.
- **Required intro paragraph.** Every glossary states its selectivity contract up front.
- **Separate file, not inline.** Lives in the project filesystem; humans and agents reference the same file.
- **One glossary per bounded context.** Same word, different meanings → split into separate files.
- **Living artifact, not a changelog.** Edit in place. Delete entries that stop earning their place.
- **Consumable by humans and agents.** Markdown headings + prose work in any editor and parser. Avoid YAML/JSON unless
  the project needs machine parsing.

## Worked example

A well-formed glossary fragment for a Gerrit-event → chat-message notifier:

````markdown
# Notifier Glossary

Project vocabulary. Only entries with a real risk of being mis-named are listed; everything else is in
[CLAUDE.md](../CLAUDE.md). For each term, **Avoid** lists the synonyms that are realistic naming traps.

## Pipeline Concepts

### Source

A _named_ Gerrit instance — the key under `gerrit.sources` in config. Embedded in the webhook URL and in every cache
key. Multi-tenant isolation is load-bearing: never collapse this axis because "we only have one Gerrit."
**Avoid:** Gerrit (ambiguous with the product — the _instance_ is one of potentially many); Backend (suggests a
storage/persistence layer it isn't).

### Atomic Event

A single Gerrit webhook event carried as one queue job. Lives only long enough to be parsed, matched to subscribers,
and pushed into a Logical Event cache. The atomic/logical split is not optional — collapsing them collapses the
aggregation window.
**Avoid:** Raw event (sounds like an unparsed payload — but it's already parsed); Gerrit event (Gerrit emits many
event _types_; "atomic" names the unit, not the source).

### Re-release

Returning a beanstalkd job to its tube so it is reserved again later. In this project it is the **normal aggregation
mechanism**, not an error path — atomic-job re-releases enforce the per-job delay cycle; logical-job re-releases keep
the bucket open.
**Avoid:** Retry (implies error recovery — the most common and most damaging misnomer here); Requeue (suggests a
separate queue when it's the same tube).
```
````

Notice what is **not** in this fragment: `MultiClient`, `EventSampler`, `BeanstalkJobDelay`, `Workbench`. They are
config or implementation details documented in code and have no plausible-wrong name. They fail the trap test.

## Related Skills

- **discovery** — surfaces domain terms during questioning; trigger for initial glossary creation.
- **alignment** — pattern surfacing may reveal naming inconsistencies worth recording.
- **diagramming** — domain models and context maps complement the glossary visually.
