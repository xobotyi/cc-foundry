# Pattern Catalog

Per-pattern shapes and fixes, grouped by the mechanism that produces them. Read this file when a marked passage needs
the shape of its fix, when a call is contested, or before adding a pattern.

A pattern joins the mechanism that produces it. The mechanism is what catches the variants no list names, so a new tell
without a mechanism belongs in neither the catalog nor the skill.

## 1. Performed helpfulness

Post-training rewards visible service, so the text performs helping instead of delivering it. Everything here addresses
a reader who is not there.

- **Chat correspondence** — "I hope this helps", "Certainly!", "Would you like me to", "let me know". Delete and start
  with the content.
- **Sycophancy** — "Great question", "You're absolutely right". Delete.
- **Signposting** — "Let's dive in", "Here's what you need to know", "In this section we will". Announcing the move
  instead of making it. Delete; the content that follows is the section.
- **Unsolicited validation** — "You're not imagining it", "You're not alone", "You're not broken", dropped into text
  that never asked. Delete the reassurance; keep the claim it was cushioning.
- **"Why it matters" boilerplate** — a paragraph or heading explaining the significance of what was just said, present
  because the shape is expected rather than because a reader needs it. Cut it, or fold the one concrete consequence it
  names into the preceding paragraph.
- **Engagement hooks** — "The catch?", "Here's the kicker.", "Sound familiar?", fake-candid openers ("Honestly?",
  "Look,"), and runs of staccato fragments engineering a pause. One short sentence for emphasis is fine; a run of them
  is a device. Deliver the point without the drum roll.
- **Canned assurance** — text asserting its own compliance, sourcing, or neutrality: "this is fully supported by
  reliable sources", "in line with the guidelines". Delete; the work either holds or does not.
- **Didactic disclaimers** — "it is important to note that", advice to an imagined reader about safety, jurisdiction, or
  controversy that the document never needed. Delete.
- **Reasoning scaffold** — "Let me think through this", "Step 1:", "Breaking this down" surviving into final text. Keep
  the conclusion, delete the scaffold.
- **Recap closers** — "In summary", "Overall", a section ending by restating itself, a paragraph closing with "Whether
  you're X or Y". End on the strongest specific point instead.

## 2. Unearned significance

The model cannot supply the specific, so it supplies weight. The subject gets simultaneously vaguer and grander: an
inventor of a train-coupling device becomes a revolutionary titan of industry.

- **Significance puffery** — "stands as a testament", "pivotal moment", "marking a shift", "evolving landscape",
  "indelible mark", "setting the stage for". State what the thing is or does; delete the significance claim, or replace
  it with the fact it gestures at.
- **Participial analysis** — a trailing `-ing` clause bolting fake depth onto a finished sentence: ", highlighting the
  importance of", ", ensuring optimal performance", ", reflecting a broader trend", ", underscoring the need for". Cut
  the clause, or promote it to its own sentence with a named actor and a checkable claim. Participial clauses are one of
  the constructions instruction-tuned models measurably overuse relative to human writing.
- **The role formula** — "plays a crucial role in shaping", "serves as a key driver of". Replace with the action: what
  it does, to what, with what result.
- **Symbolic gloss** — "represents", "symbolizes", "embodies", "speaks to" applied to something mundane. State the fact;
  the reader interprets it.
- **Copula avoidance** — "serves as", "stands as", "boasts", "features" standing in for "is" and "has". Use "is" and
  "has". Simple is/has phrasing is more common in human writing than in generated text.
- **Soft intensifiers** — "quiet confidence", "quiet rebellion", "quietly growing", "a certain", "something of a". A
  word adding literary weight without semantic commitment. Delete the modifier, or replace it with the observable detail
  it stands in for.
- **Promotional tone** — "vibrant", "nestled", "breathtaking", "rich heritage", "must-visit". Neutral description with
  concrete attributes.
- **Vague authority** — "experts argue", "industry reports suggest", "observers have noted", "widely regarded as". Name
  the source and what it said, or cut the claim.
- **Notability name-dropping** — outlets, follower counts, and award lists offered as proof of importance. One source,
  one specific statement from it.
- **Generic upbeat conclusion** — "the future looks bright", "exciting times ahead", a "Challenges and Future Prospects"
  section assembled from nothing. Concrete plans, or no section.

## 3. Hedged commitment

Rhetorical shapes that perform deliberation without committing to a claim.

- **Negative parallelism** — the shape performs correcting a misconception the reader never held. Four realizations:
  "It's not just X, it's Y" and "not only X but also Y"; "not X, but Y", which denies the first characteristic outright;
  the dash form "not X — Y"; and the reversal "X rather than Y", which is heaviest in Grok output. Clipped tail
  negations ("no guessing", "no wasted motion") are the same move with the foil elided. Assert the positive claim as a
  real clause.

  This is the most-measured single construction available: roughly 5× its pre-2023 rate across ~16,800 sampled posts,
  where more than half of the articles that use it use it more than once and a quarter use it three or more times. It is
  also common in human myth-busting and "common misconceptions" writing, so a single instance with a real contrast earns
  its place. The second one in a text is the tell — keep the strongest, restate the rest without the foil.

- **Hedging verbs as padding** — "ensures", "supports", "reflects", "highlights" gluing a subject to an unearned
  benefit. Say what the thing does, with evidence, or cut it.
- **Intensifiers without evidence** — "significantly", "effectively", "seamlessly", "dramatically", "robust". Back it
  with a number or delete it.
- **False ranges** — "from X to Y" where X and Y are not on one scale ("from the Big Bang to dark matter"). List the
  items, or name the real dimension.
- **Aphorism formulas** — "X is the Y of Z", "the currency of", "not a tool but a mirror". State the concrete claim
  underneath.
- **Fake-profound framing** — "The real question is", "at its core", "what really matters". Delete the frame; the next
  sentence usually stands alone.
- **Hedged enumeration openers** — "There are several ways to", "Generally speaking". Give the answer first.
- **Stacked qualifiers** — "could potentially possibly", "may in some cases tend to". One qualifier, or commit.

## 4. Markdown in prose

Structural conventions learned from markdown-saturated training, and formatting preferences reinforced by preference
data, leak into text that is not a chat reply. Baselines and thresholds: `references/baselines.md`.

- **Em-dash density** above the human band. The target is the band (mean 3.23 per 1,000 words), not zero — a suppression
  instruction drives some models to 0.19 per 1,000, which is its own artifact. Where a dash goes, prefer a period,
  comma, colon, or parentheses, and keep the ones doing work a comma cannot.
- **Labeled bullets** — `**Label:** explanatory sentence` as the shape of every item. Above roughly 30% of all bullets
  this separates generated from human documents. Merge into prose, or give the items real headings if they earn them.
- **Lists where prose belongs** — three related sentences broken into bullets. Write the paragraph.
- **Three-item enumerations** — items forced into triads for the cadence of completeness. Above ~3 per 1,000 words this
  is the strongest structural separator measured. Keep the items that carry weight: one, two, or four, as reality
  dictates.
- **Bold overuse** — mechanical emphasis, or erratic one-to-four-word bold spans with no shared rule. Keep bold for
  glossary terms and UI labels.
- **Slogan headings** — two-beat parallel headings ("Fast, Simple", "Built for scale"), imperatives, and rhetorical
  questions where a noun phrase would say what the section holds.
- **Title Case Headings** — sentence case unless house style says otherwise.
- **Structural quirks** — skipped heading levels, a thematic break before every heading, level-1 headings inside a
  document body. Proper hierarchy; breaks only at a real division.
- **Emoji decoration** — delete unless the venue expects them.
- **Uniform hyphenation** — compounds hyphenated in predicate position ("the report is high-quality"). Humans hyphenate
  attributively and usually drop it after the noun.
- **Curly quotes** — normalize to the document's convention. Weak on their own; editors auto-curl.

## 5. Assembly, not composition

Sentences placed beside each other instead of built on each other. This is where generated text is measurably weakest,
and where an edit has the most to gain: adjacent-sentence cohesion separates the corpora, and model editing that fixes
only wording leaves the global gap open.

- **Disconnected sentence parade** — consecutive sentences inside a paragraph that share no referent, no connective, and
  no argument. Each is true; nothing follows from anything. Rebuild the paragraph around one claim and cut what does not
  serve it.
- **Reshuffling immunity** — paragraphs so self-contained they could be reordered without breaking the text. Make each
  depend on the one before, or merge them.
- **The treadmill** — one idea restated: "In other words", "Put simply", "Essentially". Ask what is new in each
  sentence; delete the rephrasings.
- **Synonym cycling** — "the protagonist… the main character… the central figure" for one referent. Pick the clearest
  term and repeat it.
- **Section symmetry** — every section the same length with the same internal shape, regardless of how much each has to
  say. Let the sections that carry more run longer.

## 6. Machine residue

Artifacts of the pipeline. No judgment: remove.

- **Citation tokens** — `oaicite`, `citeturn0search0`, `contentReference`, `oai_citation`, `attributableIndex`,
  `[cite: 1]`, `grok_render_citation_card_json`, stray lenticular brackets (【】), `:::writing`, `attached_file`,
  `ppl-ai-file-upload`.
- **Placeholders** — `[Your Name]`, `[INSERT SOURCE URL]`, `2025-XX-XX`, `PASTE_URL_HERE`. Fill, or flag to the author.
- **Tracking parameters** — `utm_source=chatgpt.com|openai|copilot|perplexity`, `referrer=grok.com`. Strip.
- **Invisible characters** — zero-width space and joiner (U+200B, U+200D), soft hyphen (U+00AD), byte-order mark,
  homoglyphs. Normalize.
- **Broken markup** — hallucinated templates, invalid syntax, markdown left in a format that does not render it.

## Vocabulary

Density is the signal. One flagged word is coincidence; many, many times, inside a passage already carrying structural
tells, is the strongest lexical evidence available.

Overuse never transfers to a synonym. `underscore` being a tell says nothing about `emphasize`, and only the figurative
sense is the tell — an underscore in a filename is a filename.

The lists turn over by model era, so they date faster than the mechanisms. Current era lists, with sources:
`references/baselines.md`.

## What the mechanisms do not cover

Fiction has its own tells — the whispering woods, the invented protagonist name that recurs across unrelated drafts —
and this catalog is built from informational and technical prose. In fiction, judge by mechanism and expect the surface
forms to differ.
