# Measured Baselines

Every number here comes from a published measurement. Read this file when a call is contested, when a threshold decides
whether to mark a passage, or before adding a pattern to the catalog.

**A threshold is evidence, never a gate.** The strongest corpus below holds eighteen documents in one genre. A document
that crosses a threshold gets read, not rewritten.

## Separators that hold

Measured on 10 AI landing and documentation pages (4,853 words, OpenClaw project sites) against 8 pre-LLM human
documents (15,317 words: SQLite testing docs, Spolsky 2000, antirez 2018, Graham 2009, Evans 2019, and the ripgrep,
Redis, and Requests READMEs). Source: `https://github.com/osolmaz/ai-smell` and `https://solmaz.io/ai-de-smeller`,
July 2026.

| Marker                                  | Human     | AI        | Threshold                            |
| --------------------------------------- | --------- | --------- | ------------------------------------ |
| Labeled bullets, share of all bullets   | 0–11%     | 53–100%   | above 30%                            |
| Exactly-three enumerations per 1k words | 0.0–2.0   | 6.3–15.9  | above 3 per 1k                       |
| Phrase triads per 1k words              | 0.0–2.8   | 0.0–12.6  | carries from the enumeration rule    |
| Adjacent-sentence cohesion (cosine)     | 0.81–0.91 | 0.67–0.78 | below 0.80, one crossover in 18 docs |
| Sentence flow (mean run percentile)     | 0.49–0.73 | 0.19–0.41 | below 0.45                           |

A labeled bullet is a short label, then punctuation, then an explanatory sentence. Cohesion is the mean cosine
similarity between spaCy word-vector means of adjacent sentences inside a paragraph; MiniLM sentence embeddings failed
to separate the same groups, which is the negative control on the metric. The AI cohesion range covers 9 of the 10 AI
documents: the tenth crosses into the human range, and that is the crossover the threshold carries.

The author's own caveat governs all five: "eighteen documents make a demonstration rather than a validated classifier."
The AI half is one model's output in one genre, and the human half predates the LLM era, so post-2022 human writing on
landing pages is untested against these numbers.

## Separators that failed

- **Sentence-length variance.** Coefficient of variation 0.65 for AI, 0.66 for human — the metric does not separate the
  groups, and the study rejects it (ai-smell, July 2026). An earlier measurement found lower burstiness for LLaMA and
  LLaDA at temperature 0 against human text (`https://arxiv.org/abs/2507.10475`, July 2025, 2,000 model samples), so the
  direction survives per model and fails as a genre-independent rule. Never mark a passage for even sentence lengths
  alone, and never instruct a rewrite to vary sentence length as an end in itself.
- **Contractions.** Rates span roughly 25× across current models: Claude Haiku 4.5 at 30,611.9 per million words,
  Mistral-Nemo-Instruct 7,505.3, OLMo-3-7B-Instruct 4,907.5, Qwen3-14B-Instruct 2,259.6, Gemini-3-Flash 1,563.6,
  GPT-5.4-Mini 1,235.9 (`https://arxiv.org/abs/2608.06589`, August 2026, ~5.38M words). Gemini-3-Flash spends 86.8% of
  its contractions on negation. Contraction density is a model fingerprint, not an authorship signal, in either
  direction.
- **Type-token ratio** over the first 280 words: human 0.53–0.67, AI 0.59–0.69 — overlapping and register-dependent
  (ai-smell).

## Em-dash density

Human baseline 3.23 per 1,000 words, range 0.33–17.12 across eight published essays (57,232 words). Unconstrained model
output: GPT-4.1 10.62, Claude Opus 4.6 9.09, Claude Sonnet 4 8.29, DeepSeek V3 6.95, Llama models 0.00. Under a
prose-suppression instruction: GPT-4.1 9.10 (14% reduction), Claude Opus 4.6 0.19 (98% reduction). Source:
`https://arxiv.org/abs/2603.27006`, February–March 2026, ~240,000 words across twelve models.

Two consequences. A suppression instruction overshoots on some models: Claude Opus 4.6 lands at 0.19 per 1,000, below
the low end of the essay range, so a suppressed draft is recognizable as suppressed. Headings, bullets, and bold went to
zero under the same instruction while em dashes did not, because the dash is valid prose punctuation and a structural
marker at once.

The spread rules the marker out for anything inside it. Human rates run from 0.0 to 17.12 per 1,000 words across the
essay and landing-page corpora, and the essay study's model rates of 0.00 to 10.62 sit inside that span, so a density
within it carries no evidence of authorship.

Rates above the span exist. The landing-page corpus reports human 0.0–4.7 per 1,000 words against AI 0.0–61.3
(ai-smell), and 61.3 is roughly thirteen times the top of the human range there. A rate that far out is a drafting
defect, measured on one genre and one model's output. It still marks no passage, because density points at no passage to
read.

## Cost of editing a draft that is already good

Rubric-guided model editing of scientific abstracts, 45 abstract pairs, 869 keystroke-level edit logs, 236,033 edits
(`https://arxiv.org/abs/2606.15583`, June 2026).

Below-median drafts: agency +34.46, structure +19.48, economy +18.05, framing +17.13, coherence +10.47, all p<.001.

Above-median drafts: coherence −13.92 (t=−5.28, p<.001), framing −12.06 (t=−4.20, p<.001), agency −3.65 (p=.114),
structure −2.66 (p=.307), economy +4.77 (p=.048).

The paper states it as "LM editors make bad abstracts average, and good abstracts worse." Human editors moved almost
nothing at any quality level, and the authors attribute this to local substitution and pruning that never closes a
global gap. Both humans and models targeted the weakest sections and failed to improve the strongest ones.

## Information drift during a rewrite

An "improve this passage" operation over 3,000 human passages, beside a corpus of more than 37,000 ACL papers
(`https://arxiv.org/abs/2605.19936`, May 2026): the rewrites carry lower lexical diversity, longer and more complex
words, more frequent syntactic constructions, and altered information-bearing features, including reference and
date-like material that the original held. A pilot with 20 domain experts rated the same rewrites more understandable
and more exciting. Improvement on the reader's experience and loss of the source's information happen in one pass.

In a separate randomized study, undisclosed AI abstracts drew about 63 fewer characters of edits than human ones, and
scored higher on readability to begin with (73.01, SD 19.91 against 67.94, SD 22.80) —
`https://arxiv.org/abs/2511.12529`, November 2025. Readability is not where AI drafts are weak; global coherence and
agency are.

## What detectors measure

Base-model text reads as human to GPTZero and Pangram while instruction-tuned output from the same model does not, so
detectors track post-training artifacts rather than machine authorship (`https://arxiv.org/abs/2605.19516`, May 2026,
Llama-3 and Qwen-3 families, 0.6B–70B). The same split appears in style measurements: instruction-tuned models diverge
from human writing more than base models on participial clauses, nominalization, that-subject clauses, and phrasal
coordination (`https://arxiv.org/abs/2410.16107`, PNAS 2025; replicated across 467,985 texts, 11 models, eight genres in
`https://arxiv.org/abs/2604.14111`, April 2026, where humans cluster with base models rather than chat variants).

Detector output is also biased against writing that was never generated: predictable vocabulary and simple structure
raise machine scores, which is why second-language and formulaic technical writing draws false positives.

## Vocabulary is era-scoped

Wikipedia's field guide groups overused vocabulary by model era, because the words turn over
(`https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing`).

- **2023 to mid-2024** — additionally, boasts, bolstered, crucial, delve, emphasizing, enduring, garner,
  intricate/intricacies, interplay, key, landscape, meticulous/meticulously, pivotal, underscore, tapestry, testament,
  valuable, vibrant.
- **Mid-2024 to mid-2025** — align with, bolstered, crucial, emphasizing, enhance, enduring, fostering, highlighting,
  pivotal, showcasing, underscore, vibrant.
- **Mid-2025 onward** — emphasizing, enhance, highlighting, showcasing, plus canned emphasis on notability, attribution,
  and media coverage.

`delve` was the signature of the first era and dropped sharply after it. Grok output overuses superficially scientific
words — causal, empirical, correlate — and keeps `underscore`.

Two rules travel with the lists. A word's overuse never transfers to its synonyms: `underscore` being a tell says
nothing about `emphasize`, and the figurative use is the tell while the literal one is not. Density carries the signal —
one or two of these words is coincidence, many of them many times is the strongest lexical evidence available.

## Floors this skill chooses

The corpora normalize per 1,000 words and report shares over whole documents, and neither publishes a minimum sample.
The floors in the skill are therefore choices:

- **Ten bullets** for a labeled-bullet share. The source reports no bullet counts at all, so this only guards a share
  against a denominator too small to report.
- **500 words** for a triad density. The ten AI documents average roughly 485 words each and all eighteen average about
  1,121. The source publishes totals rather than per-document lengths, so 500 tracks the AI-document mean and fixes no
  minimum anyone measured.
- **A paragraph of at least two sentences** for cohesion, which is the smallest text that yields an adjacent pair at
  all.

Each guards a ratio against being computed over nothing. The skill states the values that apply, and nothing here is
evidence of authorship.

## Markers with no usable measurement

Claimed in tell-lists and unmeasured as a density target: paragraph-length variance, bold-span frequency, list-to-prose
ratio, hedging-verb frequency. Nominalization is measured and replicated but published graphically rather than as a
per-model rate.

The circulating advice to revise 25–40% of an AI draft has no primary source behind it. Initial quality decides how much
to change, and the numbers above say a strong draft should be changed very little.

Unmeasured tells worth watching without a threshold: `quiet` as a soft intensifier ("quiet confidence", "quietly
growing"), a "Why it matters" paragraph appearing unprompted, and unsolicited validation openers ("You're not imagining
it"). Each rests on dated practitioner observation with no corpus behind it.

## Negative parallelism over time

Across ~16,800 Substack posts sampled from 31 categories, the "not X, but Y" construction reached roughly 5× its
pre-generative-AI rate by 2026. Among 500–3,000-word articles that use it, more than half use it more than once and 25%
use it three or more times (`https://wonderingaboutai.substack.com/p/i-analyzed-16000-articles-to-find`, June 2026). The
corpus has no authorship ground truth, so this measures a population-level shift in published writing, not a per-model
rate. Repetition inside one text is the part worth reading; nothing here discriminates authorship.

## No fingerprint exists for the current Claude models

The idiolect corpus measures Claude Haiku 4.5. No independent stylometric baseline covers the Claude 5 family, and the
Haiku rate must not be transplanted onto it. Where a model-specific number is needed for the model actually in use, it
does not exist yet.

## Skill evaluations

No published evaluation measures whether any humanizer skill — blader/humanizer, conorbronsdon/avoid-ai-writing,
celestialdust/humanize-prose, or this one — improves prose on a reader-facing dimension such as clarity, factual
fidelity, voice, or preference. The rule-lists are published; the reader outcomes are not. Treat this skill's own effect
as unmeasured, which is the reason its default is the smallest edit that fixes a marked passage.
