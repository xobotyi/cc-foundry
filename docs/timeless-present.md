# The Timeless Present: Writing Instructions That Do Not Rot

_Research synthesis. August 2026._

## The Question

A skill file is written once and read hundreds of times, over months, by a model that treats it as authoritative. During
those months the world moves: models ship, APIs change, parameters get removed, defaults flip. The file does not move.

So what happens to a sentence like _"Prefilling is removed on current models"_ when "current" stops meaning what the
author meant?

A human reader handles this automatically. Seeing "currently unsupported" in a document dated two years ago, they
discount it — they read the claim, notice its age, and downgrade it to a hypothesis. That discounting is so reflexive it
barely registers as a skill.

A model does not do this. It reads a present-tense assertion from a system-authority source and complies.

**A stale instruction is not ignored. It is obeyed.** That is the entire problem, and the timeless present is the
technique for avoiding it.

## The Short Answer

Write persistent instructions so that no sentence in them depends on _when_ it is read.

This is not a style preference and it is not about grammar for its own sake. It decomposes into three operations, in
ascending order of importance:

1. **Temporal surface control** — suppress moving indexicals: `currently`, `now`, `recently`, `latest`, `no longer`.
2. **State normalization** — describe what the subject _is_ and _does_, not the sequence of edits that produced it.
3. **Temporal compartmentalization** — keep history, provenance, and intent in separate channels rather than dissolving
   them into the canonical text.

The first is the one everyone notices and the least consequential. The third is where the actual reliability comes from.

And one carve-out governs all three, because without it the technique becomes destructive:

> **Make the artifact timeless. Do not make the evidence timeless.**

## Where the Term Comes From

The phrase is old and was not coined for AI. In grammar it names the use of the simple present for propositions asserted
without a time index — the tense of definitions, laws, and proverbs. Linguistics calls the underlying category the
[gnomic aspect](https://en.wikipedia.org/wiki/Gnomic_aspect): "birds fly", "sugar is sweet", "the parser accepts JSON".
Statements with no _when_.

Technical writing adopted it as a documentation discipline. Google's style guide names it directly in
[Timeless documentation](https://developers.google.com/style/timeless-documentation) (updated 2024-10-15):

> Timeless documentation is documentation that avoids words and phrases that anchor the documentation to a point in time
> or assume knowledge of prior or future products and features.

with an explicit banned list — `as of this writing`, `currently`, `does not yet`, `eventually`, `existing`, `future`,
`latest`, `new`, `newer`, `now`, `old`, `older`, `presently`, `at present`, `soon` — and three stated reasons: such
terms render documentation "inaccurate, outdated, or unmeaningful"; timelessness "reduces the maintenance required to
keep documentation up to date"; and it "avoids assuming the reader is familiar with earlier versions of the product."

The companion rule, [Present tense](https://developers.google.com/style/tense): _"Use present tense for statements that
describe general behavior that's not associated with a particular time."_ Microsoft concurs more mildly — present tense
is ["the best choice for most content"](https://learn.microsoft.com/en-us/style-guide/grammar/verbs), indicative mood
over subjunctive.

Grafana turned it into a linter. **`Grafana.Timeless`** is a live Vale rule flagging almost exactly Google's word list,
alongside **`Grafana.GoogleWill`** at _error_ severity for future-tense "will"
([Grafana writers' toolkit](https://grafana.com/docs/writers-toolkit/review/lint-prose/rules/)). The convention is
mechanically enforceable, and somebody enforces it.

The migration into AI instruction-writing happened around 2025–2026, independently and without a coiner. Nobody
published "timeless present prompting" as a named technique; practitioners borrowed the documentation convention and
pointed it at agents. Two examples are worth reading in full, both from teams maintaining instruction libraries that
agents read:

- **[Anchored Development](https://anchored-dev.org/)** — _"A living document is written in the timeless present of the
  current state, not as a history of how it got there."_ It bans point-in-time language ("reverted", "recently",
  "previously", "earlier", "now", "as of") on the grounds that such text is "accurate for a week and misleading in a
  year", and puts chronology in Git where it belongs.
- **[ElevenLabs `update-skills-from-changelog`](https://github.com/elevenlabs/skills/blob/main/.agents/skills/update-skills-from-changelog/SKILL.md)**
  — a skill whose job is maintaining skills from upstream changelogs: _"Use the changelog to discover what changed, but
  write final `SKILL.md` and `references/*.md` content as timeless present-tense documentation."_ And the hard rule:
  _"Skill files must be evergreen. Never mention changelog, issue, PR, release date, 'added in', 'introduced in', 'as
  of', or 'now supports' inside `SKILL.md` or `references/*.md`."_

That is a skill library with the identical failure mode, arriving at the identical rule.

## The Distinction That Does the Work

The naive reading — "delete temporal words" — is wrong and actively harmful. Plenty of temporal language must survive
untouched.

The operative distinction is between **deictic time** and **domain time**.

**Deictic time** is anchored to the moment of writing. Its referent moves as the reader's present moves, so the sentence
decays. This is what the technique removes.

**Domain time** is part of what the subject actually does. Durations, schedules, retry backoff, expiry, ordering,
migrations. It is temporal, it is permanent, and removing it destroys meaning. This is what the technique preserves.

| Statement                                              | Treatment                                        | Why                                          |
| ------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------- |
| "We recently raised retries to five."                  | Rewrite → "The client retries up to five times." | `recently` expires as the reader's now moves |
| "The token expires after 15 minutes."                  | Preserve verbatim                                | The duration is the behavior                 |
| "The emulator now supports these filters."             | Rewrite → drop `now`                             | The fact is invariant; the anchor is noise   |
| "The migration converts legacy hashes on first login." | Preserve verbatim                                | Describes ongoing time-dependent behavior    |
| "Prefilling is removed on current models."             | Anchor → "returns 400 on Claude 4.6+"            | Version-gated fact needs a fixed referent    |
| "Version 2 shipped 2026-05-03."                        | Preserve when relevant                           | A dated event is permanently true            |
| "The rate limit is currently 100 req/s."               | Anchor or date it                                | Volatile — needs an as-of, not a deletion    |
| "Passkey support is planned for Q4."                   | Preserve the modality                            | A plan must never become a fact              |

The last row names a failure mode severe enough to deserve its own rule. Over-aggressive canonicalization turns _"we
plan to support passkeys"_ into _"the product supports passkeys"_. The prose gets cleaner and the claim becomes false.

The rows resolve into one test. A rolling word is admissible only when a fixed anchor sits beside it — a version range,
a model set, or a date. Without the anchor it names a moving target and decays; with one it is merely a readable way of
pointing at something fixed.

## What the Evidence Actually Says

Three findings, and they only look contradictory until you line them up.

**Tense does not reliably improve task performance.** Leidinger, van Rooij & Shutova,
[_The language of prompting_](https://arxiv.org/abs/2311.01967) (EMNLP Findings 2023), varied mood, tense, aspect, and
modality across semantically equivalent prompts and found the effects mixed and model-dependent — on IMDB, OPT-IML-30b
scored above 96% with past/future framing versus 89% with present. Their broader conclusion is that performance "cannot
generally be explained by perplexity, word frequency, ambiguity or prompt length." **There is no evidence that present
tense makes a model follow instructions better.** Anyone selling the timeless present as a compliance lever is
overselling it.

**Tense is nonetheless behaviorally active — dramatically so.** Andriushchenko & Flammarion,
[_Does Refusal Training in LLMs Generalize to the Past Tense?_](https://arxiv.org/abs/2407.11969) (ICLR 2025), found
that reformulating a harmful request in past tense defeats refusal training across Llama-3 8B, Claude 3.5 Sonnet,
GPT-4o, o1-mini and others. On GPT-4o the attack success rate rose **from 1% with direct requests to 88% after 20
past-tense reformulations** on JailbreakBench. Tense is not cosmetic. It interacts with post-training in ways nobody
fully predicts — which is a reason to treat temporal framing as load-bearing, and a reason never to use it as a policy
workaround.

**The mechanism that actually matters is neither of those.** It is that persistent context is privileged and models are
receptive to it. Instruction hierarchy places system-level content above user content, and the
[knowledge-conflict literature](https://arxiv.org/html/2403.08319v2) finds models highly receptive to in-context claims
that contradict their parametric knowledge when those claims read as coherent and authoritative (Xie et al. 2023). A
SKILL.md is maximally coherent, maximally authoritative framing. So a stale sentence there does not get weighed against
the model's own knowledge and discounted for age — it wins.

Put together: **write timeless to keep the artifact true, not to make the model obey harder.** The payoff is durability.
Durability is enough.

## The Runtime Owns `now`

There is a second reason a prompt should not assert its own present: something else already does, more accurately.

Anthropic's apps
[inject the current date into the system prompt](https://platform.claude.com/docs/en/release-notes/system-prompts) at
the start of every conversation — _"a system prompt to provide up-to-date information, such as the current date"_. Agent
harnesses do the same through hooks and context injection. Tool results and retrieval supply live state continuously.

So the division is clean:

- **The runtime owns `now`** — dates, live state, current versions, what exists today.
- **The artifact owns invariants** — rules, contracts, conventions, what is always true.

A prompt that hardcodes its own "now" is competing with a channel that is always more current than it is, and quietly
losing.

### The cache breakpoint is the mechanical test

This has a checkable consequence rather than remaining a judgment call. Prompt-cache invalidation runs
`tools → system → messages`, so a volatile fact parked in the stable layer invalidates every cached block after it each
time it changes.

**Content that cannot sit behind a cache breakpoint does not belong in persistent context.** Misplacement shows up as
lost cache hits before it shows up as a wrong answer — which makes it measurable, and makes the boundary between stable
and volatile something you can test rather than argue about.

## Three Channels, Not One

The strongest version of the technique is architectural, not grammatical. Sort every statement into one of four channels
before writing anything:

- **CURRENT** — authoritative for present behavior. Goes in the artifact, unqualified.
- **HISTORY** — events and evidence explaining how the state arose. Goes in Git, ADRs, changelogs, release notes.
  Admitted to the artifact only when explicitly marked historical.
- **PLAN** — desired or predicted state. Never silently promoted to fact; keeps its modality ("planned", "will
  attempt").
- **VOLATILE** — true only as of some date. Keeps an explicit anchor, or gets retrieved at runtime instead.

The prose surface is the last step, and the smallest one. If the channels are right, the tense usually follows; if the
channels are wrong, no amount of present tense saves the artifact.

This also explains why the technique pairs naturally with version control. History is not deleted — it is _relocated_ to
the store built for it. Git already holds the chronology of every file it tracks. Restating that chronology inside the
file is duplication that rots.

## Failure Modes

The technique fails in both directions, and the over-application failures are the more dangerous ones because the output
looks better.

**Under-application** — the ordinary rot:

- **Rolling referents** — `current models`, `the latest release`, `now supports`. Silently become false.
- **Document self-history** — "we switched from X to Y", "this was recently rewritten". Forces the reader to do
  archaeology to find the actual current contract.
- **Historical contamination** — old and new values both present, model merges them: "tokens last between 15 and 60
  minutes."

**Over-application** — the damage done by an overzealous rewrite:

- **False timelessness.** A volatile claim — a price, a limit, a model capability, a policy — rendered as permanently
  true. The most dangerous failure, because fluent present-tense prose hides its own expiry date.
- **Time-semantic destruction.** Stripping "expires after", "on first login", "before deployment" merely because they
  contain temporal words.
- **Plan-to-fact promotion.** Intent stated as accomplished fact.
- **Provenance erasure.** The current state is correct but the rationale for it is gone, so the next author re-litigates
  a settled decision. The fix is not to inline the history — it is to keep an ADR.

That last one is what architecture decision records exist for. An ADR is the designated home for the _why_, which frees
the instruction files to carry only the _what_ without losing the reasoning behind it.

## What Is Exempt

Time-stamped genres are exempt, and should not be de-tensed:

- changelogs, release notes, migration guides
- research syntheses (**including this document** — note the date stamp under the title)
- ADRs, which carry a `Date:` field by design
- commit messages, PR descriptions

Google states the carve-out explicitly: time-based language is fine in "press releases, blog posts, or release notes."
The rule targets always-loaded instruction context. The correct handling for genuinely dated content is to _keep it out
of the persistent layer_, not to rewrite it into false timelessness.

## Timeless Is Not Immutable

One final guard, because the name invites the wrong conclusion. "Timeless" means _designed for semantic longevity_, not
_never revisited_.

Separate **hard invariants** from **soft defaults**:

- **Hard invariants** — never fabricate tool results; never treat untrusted content as authorization; wrap examples in
  `<examples>` tags. These outlive model changes.
- **Soft defaults** — prefer concise prose; default to Markdown; use this much scaffolding. These are calibrated against
  a particular model generation and need re-examination when the generation moves.

An unrevisited soft default is precisely how prior-model scaffolding survives long after the model outgrew it — the
migration trap familiar to anyone who has carried a prompt onto a newer model and watched it overtrigger. A file that is
never revisited is not timeless. It is abandoned.

## Sources

**Style guides and enforcement**

- Google, Timeless documentation: https://developers.google.com/style/timeless-documentation
- Google, Present tense: https://developers.google.com/style/tense
- Google, Document future features: https://developers.google.com/style/future
- Microsoft Writing Style Guide, Verbs: https://learn.microsoft.com/en-us/style-guide/grammar/verbs
- Grafana writers' toolkit, prose lint rules (`Grafana.Timeless`, `Grafana.GoogleWill`):
  https://grafana.com/docs/writers-toolkit/review/lint-prose/rules/
- Helm documentation style guide: https://github.com/helm/helm-www/blob/main/style-guide.md

**Applied to AI agents**

- Anchored Development: https://anchored-dev.org/
- ElevenLabs, `update-skills-from-changelog`:
  https://github.com/elevenlabs/skills/blob/main/.agents/skills/update-skills-from-changelog/SKILL.md
- AI-Knowledge `CLAUDE.md`: https://github.com/frederictriquet/AI-Knowledge/blob/master/CLAUDE.md

**Empirical**

- Leidinger, van Rooij & Shutova, _The language of prompting_ (EMNLP Findings 2023): https://arxiv.org/abs/2311.01967
- Andriushchenko & Flammarion, _Does Refusal Training in LLMs Generalize to the Past Tense?_ (ICLR 2025):
  https://arxiv.org/abs/2407.11969
- Xu et al., _Knowledge Conflicts for LLMs: A Survey_: https://arxiv.org/html/2403.08319v2
- Liu et al., _Lost in the Middle_: https://arxiv.org/abs/2307.03172

**Vendor**

- Anthropic, published system prompts (current-date injection):
  https://platform.claude.com/docs/en/release-notes/system-prompts

**Linguistics**

- Gnomic aspect: https://en.wikipedia.org/wiki/Gnomic_aspect
