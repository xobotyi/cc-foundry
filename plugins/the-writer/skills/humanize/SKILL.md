---
name: humanize
description: >-
  Remove AI-writing tells from prose and prevent them while drafting: the mechanisms that produce the tells, the
  thresholds that mark a passage, and the edit that fixes the text without flattening its author.
when_to_use: >-
  Invoke whenever prose written for human readers is drafted, edited, or judged — articles, blog posts, READMEs,
  documentation, release notes, announcements, reports — or whenever a text is suspected of reading as machine-written.
  Also invoke on the symptoms: a draft that sounds generated with no nameable fault, a rewrite that flattened the
  author's voice, a paragraph of true sentences that build to nothing, a citation token or placeholder surviving into
  delivered text. Covers prose for readers; instruction text belongs to prompt-engineering, commit messages to
  commit-message, code comments to coding.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**Editing a good draft makes it worse.** Rubric-guided model editing lifted below-median drafts on every measured
dimension and pushed above-median drafts down: coherence −13.92, framing −12.06, both p<.001, across 45 abstract pairs
and 869 keystroke-level edit logs. The first decision is never which tells to fix. It is whether this text should be
rewritten at all.

**Fix the writing, not the detection.** Generated prose is worth fixing because it is vague, padded, and evasive.
Detectors fire on post-training artifacts rather than on machine authorship, and they flag second-language and formulaic
human writing at the same time. An edit whose purpose is a detector score is out of scope; every edit must improve the
text for a reader.

Two failures carry equal weight. Under-editing leaves the tells and the text reads as generated. Over-editing flattens
voice, deletes specifics, and produces a different slop — and it is the one the measurements above say is easy to cause.

## Decide before editing

Read the whole text first. Nothing below is decidable from a search, because every one of these tells has a legitimate
twin a few lines away.

Then judge the draft as a whole against three questions: does it hold one argument, do its paragraphs depend on each
other, does it carry specifics that resist fabrication? Three clear yeses make a draft strong. A clear no to any one
makes it weak. A question you cannot answer leaves it uncertain, and uncertain outranks weak: asking costs less than a
rewrite that was never warranted.

The three questions are an inference, not a result. The measurement behind the gate split scientific abstracts by a
rubric score, and nothing in it maps that split onto an article, a README, or a release note.

- **Strong draft — review, do not rewrite.** Mark the passages, name the mechanism behind each, propose the targeted
  edits, and leave everything unmarked untouched. Rewriting is the operation measured to cost coherence and framing
  here.
- **Weak draft — rewrite.** The same measurements show large gains on every dimension. Work the sweep below.
- **Uncertain — mark, and ask.** A draft you cannot place is a draft whose author knows something you do not.

Structural edits are what close the gap. In the same study, human editors changed almost nothing at any quality level,
because they substituted and pruned locally while the global weakness survived. Reordering, merging, and cutting beat
word swaps.

## Hard constraints

- **Never fabricate.** No invented facts, numbers, dates, names, quotes, anecdotes, or first-person experience. When the
  fix for vagueness is a concrete detail you do not have, take it from the source material, ask the author, or keep the
  sentence plain. A vivid lie is worse than a dull truth.
- **Never inject.** Adding voice, stakes, humor, or personality the source did not carry is fabrication about the
  author. A rewrite recovers voice; it does not install one.
- **Conserve substance, and check the anchors.** Every claim in the original survives unless the author asked for cuts.
  Rewrites measurably drop reference and date-like material while reading better, so verify the dates, numbers,
  citations, and proper names after the pass.
- **Match the voice.** Fit the document's register. Where a sample of the author exists, mirror its sentence rhythm,
  word level, and punctuation habits instead of installing yours.
- **House style wins.** A pattern the surrounding document uses deliberately is a style choice, not a tell.
- **Secondhand text is immune.** Never rewrite quotations, titles, proper names, code, table data, or text that is being
  discussed rather than used.

## Why the tells exist

Instruction tuning and preference training, not statistical generation, produce the tells: base-model text reads human
to detectors while the instruction-tuned output of the same model does not. Six mechanisms follow from what
post-training rewards. Learn them and you catch variants no list contains.

1. **Performed helpfulness** — the text performs service to a reader who is not there: signposting, chat correspondence,
   sycophancy, unsolicited validation, "Why it matters" boilerplate, recap closers.
2. **Unearned significance** — weight substituted for the specific the model lacks: puffery, participial analysis, the
   role formula, symbolic gloss, soft intensifiers, vague authority.
3. **Hedged commitment** — rhetorical shapes performing thought without a claim: negative parallelism, hedging verbs,
   unbacked intensifiers, false ranges.
4. **Markdown in prose** — structural training leaking into text that is not a chat reply: em-dash density, labeled
   bullets, lists where prose belongs, forced triads, bold spans, slogan headings.
5. **Assembly, not composition** — sentences placed beside each other instead of built on each other. This is where
   generated text is measurably weakest and where an edit gains the most.
6. **Machine residue** — pipeline artifacts: citation tokens, placeholders, tracking parameters, invisible characters.

Per-pattern shapes and fixes: `${CLAUDE_SKILL_DIR}/references/patterns.md`. Read it when a marked passage needs the
shape of its fix, or before adding a pattern to the catalog.

## Clusters convict

Every pattern above appears in clean human writing. One em dash means nothing. Em dashes plus forced triads plus
"vibrant tapestry" plus a Conclusion section is a confession. Mark passages, never words.

Four measurements mark a passage. A mark sends you to read it and never stands as a verdict: labeled bullets above 30%
of all bullets, three-item enumerations above 3 per 1,000 words, adjacent-sentence cohesion below 0.80, and a second
negative parallelism in one text. The corpus behind the first three holds eighteen documents in one genre.

The first three are ratios, so each needs a denominator worth reporting. One labeled bullet out of one bullet is 100%,
and a single triad in 300 words clears 3 per 1,000. Take a labeled-bullet share from ten bullets upward and a triad
density from 500 words upward, the length the corpus documents average. Below either floor, count the instances and
treat one of anything as an observation.

Em-dash density is a drafting target and never a mark. Human rates run from 0.0 to 17.12 per 1,000 words across the two
corpora, and every model rate measured falls inside them.

**Negative parallelism carries the widest evidence of any single construction.** It appears as "not just X, but Y", as
"not X, but Y", as the dash realization "not X — Y", and reversed as "X rather than Y". Across ~16,800 sampled posts the
construction reached roughly 5× its pre-2023 rate, and among the articles that use it, more than half use it more than
once and a quarter use it three or more times. That corpus carries no authorship labels, so the rates describe what
published writing does rather than what a model does. Human writers reach for the shape too, in myth-busting and
common-misconception writing, so one instance with a real contrast is ordinary and a second marks the passage.

Vocabulary carries signal by density, and the lists turn over by model era — the words that convicted a 2023 draft are
not the words that convict a current one. Overuse never transfers to a synonym.

Baselines, corpus sizes, per-model rates, era vocabulary lists, and the markers that failed to replicate:
`${CLAUDE_SKILL_DIR}/references/baselines.md`. Read it before citing a number, before treating a threshold as decisive,
and when a call is contested.

## Not evidence

None of these is a tell, and treating one as evidence is how a rewrite damages human writing:

- Perfect grammar and clean typography.
- Formal, academic, or "fancy" vocabulary outside the era lists.
- Mixed registers, or prose that reads clinical and emotional at once.
- Bland or flat prose with no nameable tell under it.
- Transition words in isolation.
- Unsourced claims.
- Em dashes alone, curly quotes alone, one short emphatic sentence.
- Contraction density in either direction — it is a model fingerprint spanning 25× across current models.
- Even sentence lengths. Sentence-length variance does not separate human from generated text (0.66 against 0.65), so
  never mark flat cadence and never vary sentence length as an end in itself.
- Wordy human constructions — "in order to", "as a result of", "the fact that", "a part of". These are more common in
  human writing than in generated text. Cut them when the goal is concision; never count them as evidence.

Some signals argue actively for leaving prose alone: hard-to-fabricate specifics, unresolved tension and mixed feelings,
era-bound references, genuine asides and self-corrections, and variety the author can defend.

## The sweep

Work in this order. Structure first is what the measurements support: local substitution leaves the global weakness in
place.

1. **Structure** — section order and necessity, heading forms, list morphology, symmetry between sections. Cut a section
   that exists because the shape expected one. Where it carries a claim, the claim moves; it does not go.
2. **Cohesion** — paragraph by paragraph, does each sentence build on the one before, and each paragraph on the one
   before? Rebuild around one claim; cut what does not serve it.
3. **Wording** — mechanisms 1 through 3, on marked passages only.
4. **Formatting density** — dashes, bold, triads, labeled bullets, toward the human ranges rather than to zero. A draft
   run through dash suppression reads as suppressed, which is its own artifact; a text that never reached for a dash
   does not.
5. **Residue** — search for the literal artifacts listed in `${CLAUDE_SKILL_DIR}/references/patterns.md`. A citation
   token skims past a careful read and an invisible character has nothing to see, so these surface in a search and
   nowhere else.
6. **Verify** — read the original beside the rewrite, claim by claim, and confirm each one survived. Check the dates,
   numbers, citations, and proper names against the source. Check that the voice is still the author's.

Then deliver the text with a short account of what changed, what you left and why, and anything you could not fill.
Report a placeholder you cannot fill; never invent its content.

## Drafting

The same mechanisms are cheaper to avoid than to remove. While composing: state claims directly, use only specifics you
have, let sections run to the length their content earns, and format only what formatting improves. Nothing here asks
for deliberate imperfection — inserting typos or forced informality is another kind of fabrication.
