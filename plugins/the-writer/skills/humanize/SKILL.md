---
name: humanize
description: >-
  Removes AI-writing tells from prose and prevents them when drafting: inflated significance, hedged comparisons,
  chat-register leakage, uniform rhythm, formulaic structure, machine residue. Invoke whenever task involves prose meant
  for human readers — writing or editing articles, blog posts, READMEs, documentation, release notes, announcements,
  reports, or reviewing text suspected of sounding AI-generated.
---

# Humanize

**Fix the writing, not the detection.** AI-sounding prose is bad because it is vague, padded, and evasive — not because
a detector might flag it. Every edit must improve the text for a human reader. Edits whose only purpose is dodging AI
detectors are out of scope.

Two failure modes carry equal weight:

- **Under-editing** — tells survive, the text reads as generated slop.
- **Over-editing** — voice, specifics, and legitimate style get flattened into different slop. Gutting a human quirk is
  as bad as leaving a machine one.

## Hard Constraints

- **Never fabricate.** Rewrites never invent facts, numbers, dates, names, quotes, anecdotes, or first-person
  experience. When the fix for vagueness is a concrete detail you don't have, get it from the source material, ask the
  author, or keep the sentence plain. A vivid lie is worse slop than a dull truth.
- **Conserve substance.** Every claim in the original survives the rewrite unless the author asks for cuts. Rewrite,
  don't summarize: a five-paragraph original yields a rewrite that covers all five paragraphs' content.
- **Match the voice.** Fit the document's intended register (formal, casual, technical). If a writing sample of the
  author exists, mirror its sentence rhythm, word level, and punctuation habits instead of installing your own.
- **House style wins.** When the surrounding document or project style uses a pattern deliberately, match it. The skill
  fixes unexamined defaults, not deliberate style choices.
- **Secondhand text is immune.** Never rewrite quotations, titles, proper names, or text that is being discussed rather
  than used.

## The Mechanism Model

Tells are symptoms of a few generative mechanisms. Learn the mechanisms and you catch variants no list contains. Each
family below gives the mechanism and its triggers; per-pattern before/after examples live in the reference.

### 1. Inflated importance

LLMs regress to the mean: rare specifics get replaced with generic significance. The subject becomes simultaneously less
specific and more exaggerated — "inventor of the first train-coupling device" fades into "a revolutionary titan of
industry".

- **Significance puffery** — "stands as a testament", "pivotal moment", "marking a shift", "evolving landscape",
  "indelible mark", "setting the stage for". Fix: state what the thing is or does; delete the significance claim or
  replace it with the specific fact it gestures at.
- **Superficial `-ing` analysis** — a participle clause tacked onto a sentence to add fake depth: ", highlighting...",
  ", ensuring...", ", reflecting...", ", underscoring...". The single strongest 2026 tell by corpus data ("ensuring" is
  4.3× over-represented in AI text). Fix: cut the clause, or promote it to its own sentence with a named actor and a
  verifiable claim.
- **Promotional tone** — "vibrant", "nestled", "breathtaking", "rich heritage", "must-visit", "boasts". Fix: neutral
  description with concrete attributes.
- **Symbolic gloss** — narrating the meaning of a fact instead of trusting it: "represents", "symbolizes", "embodies",
  "speaks to" applied to mundane things. Fix: state the fact; let the reader interpret.
- **Vague authority** — "experts argue", "industry reports", "observers have noted", "widely regarded". Fix: name the
  source and what it actually said, or cut the claim.
- **Notability name-dropping** — lists of outlets or follower counts as proof of importance. Fix: one source, one
  specific statement from it.
- **Generic upbeat conclusions** — "the future looks bright", "exciting times ahead", formulaic "Challenges and Future
  Prospects" sections. Fix: end on the strongest specific point; concrete plans beat vibes.

### 2. Performed deliberation

The model performs considered-ness instead of committing to a claim. Rhetorical shapes stand in for actual thought.

- **Hedging verbs as padding** — "ensures", "supports", "reflects", "highlights" gluing an idea to an unearned benefit.
  Fix: say what the thing does, with evidence or not at all.
- **Hedged comparison** — "X rather than Y", "X, not Y" where the contrast adds nothing. The strongest multi-word tell
  in 2026 corpus data (2.5× over-represented). Fix: make the comparison (state why X) or drop Y entirely.
- **Negative parallelism** — "It's not just X, it's Y", "not only... but also", and clipped tailing negations ("no
  guessing", "no wasted motion"). Fix: assert the positive claim as a real clause.
- **Contrast-frame pileup** — "it is X, not Y" recurring through a text. One instance with a real contrast earns its
  place; the frame is a default sentence shape for every current model, so two or more in the same passage convict even
  when each is individually defensible. Fix: keep the strongest one, restate the rest as direct claims without the foil.
- **Rule of three** — ideas forced into triads for fake comprehensiveness. Fix: keep the items that carry weight, one,
  two, or four as reality dictates.
- **Intensifiers without evidence** — "significantly", "effectively", "seamlessly", "dramatically". Fix: back it with a
  number or delete it.
- **The role formula** — "plays a crucial/key/vital role in shaping..." — statistically the single most formulaic
  sentence shape LLMs produce. Fix: replace with the specific action: what does it do, to what, with what result.
- **False ranges** — "from X to Y" where X and Y aren't on a scale ("from the Big Bang to dark matter"). Fix: list the
  actual items or name the real dimension.
- **Aphorism formulas** — "X is the Y of Z", "the currency of", "not a tool but a mirror". Fix: state the concrete claim
  the aphorism gestures at.
- **Fake-profound framing** — "The real question is", "at its core", "what really matters". Fix: delete the frame; the
  sentence that follows usually stands alone.
- **Hedged enumeration openers** — "There are several ways to...", "Generally speaking,". Fix: give the answer first.
- **Excessive hedging** — stacked qualifiers: "could potentially possibly". Fix: one qualifier, or commit.

### 3. Leaked context

Text meant for the conversation, the task, or the model's own scaffolding bleeds into the artifact.

- **Chat correspondence** — "I hope this helps", "Certainly!", "Would you like me to...", "let me know". Fix: delete;
  start with the content.
- **Sycophancy** — "Great question!", "You're absolutely right". Fix: delete.
- **Signposting** — "Let's dive in", "Here's what you need to know", announcing instead of doing. Fix: do the thing.
- **Engagement hooks** — "The catch?", "Here's the kicker.", "Sound familiar?", fake-candid openers ("Honestly?",
  "Look,"), and runs of staccato drama fragments. Fix: deliver the point without the theatrical pause; one short
  sentence for emphasis is fine, a run of them is engineered.
- **Reasoning scaffold** — "Let me think through this", "Step 1:", "Breaking this down" left in final text. Fix: keep
  the conclusion, delete the scaffolding.
- **Knowledge-cutoff residue and gap-filling** — "as of my last update", "while details are scarce...", "maintains a low
  profile", "likely grew up...". Fix: say what is known with a source, say what isn't known plainly, or cut. Never dress
  a guess as fact.
- **Diff-anchored writing** — docs narrating the change instead of the current state: "was added to replace", "now
  uses", "has been updated to". Unless the document is version-scoped (changelog, migration guide), describe the thing
  as it is.
- **Fragmented headers** — a heading followed by a one-line warm-up restating it. Fix: cut the warm-up; start with
  content.

### 4. Uniform texture

Statistical generation produces even, interchangeable prose: same-length sentences, cycled synonyms, restated ideas,
paragraphs that don't build on each other.

- **Flat cadence** — every sentence the same length and shape. Fix: vary deliberately. Short sentences land points.
  Longer ones carry qualifications and let a thought wind to where it's going. Read the paragraph aloud; if it thuds
  evenly, reshape it.
- **Synonym cycling** — "the protagonist... the main character... the central figure" for one referent. Fix: pick the
  clearest term and repeat it; repetition of the right word is not a flaw.
- **The treadmill** — restating one idea: "In other words,", "Put simply,", "Essentially,". Fix: per sentence ask
  "what's new here?"; delete rephrasings.
- **Reshuffling immunity** — paragraphs so self-contained they could be swapped without breaking anything. Fix: make
  each paragraph need the previous one; merge or cut interchangeable blocks.
- **Recap closers** — paragraphs ending "Whether you're X or Y...", sections ending "In summary," / "Overall,". Fix: end
  on the strongest specific point.
- **Copula avoidance** — "serves as", "stands as", "boasts", "features" dodging plain "is"/"has". Fix: use is/are/has.
- **Filler phrases** — "in order to" → "to", "due to the fact that" → "because", "has the ability to" → "can", "it is
  important to note that" → cut.
- **Agentless passive** — "no configuration is needed", "it is recommended", "changes were made". Fix: name the actor or
  address the reader.
- **Uniform hyphenation** — compounds hyphenated even in predicate position ("the report is high-quality"). Humans
  hyphenate attributively ("a high-quality report") and usually drop it after the noun.

### 5. Default formatting

Chat-UI formatting habits applied regardless of medium.

- **Em and en dashes** — in agent-authored text, replace each with (in rough preference order) a period, comma, colon,
  parentheses, or a restructure. Exception: the author's voice sample or house style uses them deliberately.
- **Bold overuse** — mechanical emphasis, or erratic 1–4-word bold spans with no shared rule. Keep bold for glossary
  terms and UI labels.
- **Inline-header bullets** — `**Topic:** sentence` lists that should be prose or real structure. Fix: merge into prose,
  or give items real headings if they earn them.
- **Title Case Headings** — use sentence case unless house style says otherwise.
- **Emoji decoration** — 🚀 on headings and bullets. Delete unless the venue expects them.
- **Prose-as-table** — small tables holding what a sentence would say better. Fix: write the sentence. Tables earn their
  place only for genuinely 2D data.
- **Structural quirks** — skipped heading levels (H1 → H3), thematic breaks (`---`) before every heading. Fix: proper
  hierarchy, breaks only where a real division exists.
- **Curly quotes** — weak signal alone (editors auto-curl); normalize to match the document's convention.

### 6. Machine residue

Literal artifacts of the generation pipeline. Zero judgment required — always remove.

- **Citation tokens** — `oaicite`, `citeturn0search0`, `contentReference`, `oai_citation`, `attributableIndex`,
  `[cite: 1]`, `grok_render_citation_card_json`, stray lenticular brackets (【】).
- **Placeholders** — `[Your Name]`, `[INSERT SOURCE URL]`, `2025-XX-XX`, `PASTE_URL_HERE`, unfilled Mad-Libs blanks.
  Fill or delete; if you can't fill it, flag it to the author.
- **Tracking params** — `utm_source=chatgpt.com|openai|copilot`, `referrer=grok.com` on URLs. Strip.
- **Invisible characters** — zero-width spaces/joiners (U+200B, U+200D), soft hyphens (U+00AD), homoglyphs. Normalize to
  plain text.

## Judgment Rules

**Clusters convict; single tells don't.** Every pattern above occurs in clean human writing. One em dash means nothing;
em dashes plus rule-of-three plus "vibrant tapestry" plus a "Conclusion" section is a confession. Flag passages, not
words.

**Tiered vocabulary.** Not every AI-word is equally damning:

- **Tier 1 — fix on sight:** delve, tapestry (figurative), testament (figurative), underscores (verb), leverage (verb),
  multifaceted, realm (abstract), interplay, "it's worth noting", "plays a crucial role in", "in today's ... landscape".
- **Tier 2 — fix when clustered (2+ per paragraph):** ensuring/ensures, highlights, reflects, fosters, showcases,
  robust, seamless, pivotal, crucial, vibrant, comprehensive, significantly, effectively, "rather than", moreover,
  furthermore.
- **Tier 3 — never flag alone:** key, essential, important, significant, various, valuable, notably, such as. Ordinary
  words; evidence only inside a Tier 1/2 cluster.

Word lists go stale as models change; the mechanism families don't. When a word feels machine-frequent but isn't listed,
judge it by mechanism: is it inflating, hedging, or padding?

**What NOT to flag** — these are not evidence on their own: perfect grammar and polish; formal or academic vocabulary
outside the tiers; mixed registers; "bland" prose without specific tells; one short emphatic sentence; common
transitions in isolation; curly quotes alone; em dashes alone in human-authored text; unsourced claims; letter-style
openings in correspondence.

**Preserve the human signals.** When you see these, lean toward leaving the prose alone: specific hard-to-fabricate
detail; mixed feelings and unresolved tension; era-bound slang and references; genuine asides, parentheticals, and
self-corrections; variety the author can defend. Over-editing these destroys what makes text human.

## Application

**Writing mode** (drafting new prose): apply the six families as constraints while composing. State claims directly,
prefer specifics you actually have, vary rhythm, format only what earns formatting. Cheaper than editing slop later.

**Editing mode** (fixing existing text):

1. **Read the whole text.** One-line voice read before touching anything: "<kind> for <audience>, register
   <formal/neutral/casual>."
2. **Inventory the substance.** List the claims and facts the text carries. This is the conservation checklist for
   step 5.
3. **Sweep by family** (1–6 above). Mark clustered passages, not isolated words.
4. **Rewrite** marked passages. Preserve register, conserve substance, never fabricate specifics.
5. **Self-audit.** Ask: "What still reads as AI-generated here?" Verify the substance inventory survived. Fix what the
   audit surfaces.
6. **Mechanical pass.** Run the residue checks below.
7. **Deliver** the final text plus a brief summary of what changed and why.

**Reviewing mode** (verdict without rewrite): sweep by family, report clustered passages with locations and the
mechanism behind each, note human signals that argue against AI origin. No verdict from a single tell.

### Mechanical residue checks

On files, run these before delivering (adjust to the target's legitimate style):

```bash
rg '—|–'                                          # em/en dashes
rg 'oaicite|citeturn|contentReference|oai_citation|attributableIndex|grok_render'
rg 'utm_source=(chatgpt|openai|copilot|perplexity)|referrer=grok'
rg '\[(Your|INSERT|TODO)[ _]|XX-XX|PASTE_|_HERE\b'  # placeholders
rg -P '\x{200B}|\x{200D}|\x{00AD}|\x{FEFF}'          # invisible characters
```

Any hit is either fixed or consciously kept with a reason (house style, quoted text).

## Reference

- **Full pattern catalog** — `${CLAUDE_SKILL_DIR}/references/patterns.md` — per-pattern before/after examples for all
  six families, extended words-to-watch lists, and source notes (Wikipedia's "Signs of AI writing", 2026 corpus
  studies). Read when a specific call feels ambiguous or when you need rewrite examples for a pattern.

## Critical Rules

- Never fabricate specifics — vivid lies are worse than dull truths.
- Conserve every claim; rewrite, don't summarize.
- Clusters convict; single tells don't. Flag passages, not words.
- Over-editing human voice is as bad as under-editing machine slop.
- Fix the writing for readers, never for detectors.
