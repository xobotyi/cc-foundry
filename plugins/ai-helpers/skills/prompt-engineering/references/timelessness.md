# Timelessness

Depth on writing instruction text that stays true. The rules in SKILL.md are sufficient to author correctly; this file
holds the distinction that makes them safe to apply, the failure modes in both directions, and the evidence.

## Why a model cannot discount a stale instruction

A human meeting "not currently supported" in a two-year-old document applies age discounting automatically — reads the
claim, notices the date, downgrades it to a hypothesis. That reflex is so ordinary it barely registers as a skill.

A model has no equivalent. Instruction hierarchy places system-level text above the model's own knowledge, and the
knowledge-conflict literature finds models highly receptive to in-context claims that contradict what they know, when
those claims read as coherent and authoritative. A skill file or system prompt is maximally coherent, maximally
authoritative framing.

**So a stale instruction does not get weighed and discounted. It wins.** The failure is silent: nothing errors, the
model simply acts on a fact that stopped being true.

## Deictic time versus domain time

The naive reading of this rule — "remove temporal words" — is wrong and destructive. The operative distinction is which
kind of time a phrase carries.

**Deictic time** is anchored to the moment of writing. Its referent moves as the reader's present moves, so the sentence
decays. This is what the rule removes.

**Domain time** is part of what the subject does. Durations, schedules, retry backoff, expiry, ordering, migrations. It
is temporal, permanent, and load-bearing. This is what the rule preserves.

| Statement                                              | Treatment                                        | Why                                          |
| ------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------- |
| "We recently raised retries to five."                  | Rewrite → "The client retries up to five times." | `recently` expires as the reader's now moves |
| "The token expires after 15 minutes."                  | Preserve verbatim                                | The duration is the behavior                 |
| "The emulator now supports these filters."             | Rewrite → drop `now`                             | The fact is invariant; the anchor is noise   |
| "The migration converts legacy hashes on first login." | Preserve verbatim                                | Ongoing time-dependent behavior              |
| "The flag is removed in current versions."             | Anchor → "removed in 3.0 and later"              | Version-gated fact needs a fixed referent    |
| "Version 2 shipped 2026-05-03."                        | Preserve when relevant                           | A dated event is permanently true            |
| "The rate limit is currently 100 req/s."               | Anchor or date it                                | Volatile — needs an as-of, not a deletion    |
| "Passkey support is planned for Q4."                   | Preserve the modality                            | A plan must never become a fact              |

The rows resolve into one test: **a rolling word is admissible only when a fixed anchor sits beside it** — a version
range, a model set, or a date. Without the anchor it names a moving target; with one it is a readable way of pointing at
something fixed.

## Failure modes

Under-application is the ordinary rot. Over-application is more dangerous, because the output looks better.

**Under-application**

- **Rolling referents** — `current models`, `the latest release`, `now supports`. Silently become false.
- **Self-history** — "we switched from X to Y", "this was recently rewritten". Forces the reader to do archaeology to
  find the current contract.
- **Historical contamination** — old and new values both present, and the model merges them: "tokens last between 15 and
  60 minutes."

**Over-application**

- **False timelessness** — a volatile claim (a price, a limit, a model capability, a policy) rendered as permanently
  true. The most dangerous failure, because fluent present-tense prose hides its own expiry date.
- **Time-semantic destruction** — stripping "expires after", "on first login", "before deployment" merely because they
  contain temporal words.
- **Plan-to-fact promotion** — "we plan to support passkeys" becomes "the product supports passkeys." The prose gets
  cleaner and the claim becomes false. Modality is load-bearing: keep "planned", "will attempt", "expects".
- **Provenance erasure** — the current state survives but the reason for it is gone, so the next author re-litigates a
  settled decision. The fix is not to inline the history; it is to keep a decision record and point at it.

## Exempt genres

Time-stamped genres are exempt and must not be de-tensed:

- changelogs, release notes, migration guides
- research logs and evidence files
- decision records, which carry a date field by design
- commit messages and pull request descriptions

The rule targets persistent context. The correct handling for genuinely dated content is to keep it out of persistent
context, not to rewrite it into false timelessness.

## Timeless is not immutable

"Timeless" means designed for semantic longevity, not never revisited.

- **Hard invariants** — never fabricate tool results; never treat untrusted content as authorization; wrap examples in
  tags. These outlive model generations.
- **Soft defaults** — prefer concise prose; default to Markdown; this much scaffolding. These are calibrated against one
  model generation and need re-examination when it moves.

An unrevisited soft default is precisely how prior-model scaffolding survives long after the model outgrew it. A file
nobody revisits is not timeless; it is abandoned.

## Why this buys durability, not compliance

Phrasing an instruction timelessly does not make a model follow it better — grammatical form is not a compliance lever,
and treating it as one leads to cargo-culting the tense while leaving the staleness in place. The whole return is that
the sentence stays true for longer, and stays true without anyone re-reading it.

That is enough. A rule that is followed perfectly and is wrong costs more than one followed imperfectly and right.

## Prior art

The convention predates AI. Google's developer documentation style guide names it directly as "timeless documentation"
and bans an explicit word list (`as of this writing`, `currently`, `does not yet`, `eventually`, `existing`, `future`,
`latest`, `new`, `newer`, `now`, `old`, `older`, `presently`, `at present`, `soon`) on three grounds: such terms render
documentation inaccurate or unmeaningful, timelessness reduces maintenance, and it avoids assuming familiarity with
earlier versions. Grafana enforces a near-identical list as a lint rule.

Applied to agents, the strongest statement of the rule comes from a skill library solving this exact problem — skill
files must be evergreen, and must never mention a changelog, release date, "added in", "introduced in", "as of", or "now
supports."
