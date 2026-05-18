# Attention at Depth: How Frontier 1M-Token Context Windows Actually Behave

_Research synthesis. May 2026._

## The Question

The frontier LLMs of 2026 — Claude Opus 4.6, Claude Sonnet 4.6, Gemini 2.5 Pro, Gemini 3.1 Pro, GPT-4.1, GPT-5.4, Llama
4 Scout and Maverick — all advertise context windows in the hundreds of thousands or millions of tokens. The marketing
promise is straightforward: paste your entire codebase, your full corpus, your complete conversation history, and the
model will reason over all of it as a coherent whole.

A practical question follows. Suppose you are 750,000 tokens deep into a long prompt, and you need the model to attend
to something you said at token 50,000. Can you reach back? Can a prompt-level intervention focus the model's attention
on that specific deep region, the way you might tap someone on the shoulder mid-conversation and say "remember what I
told you an hour ago"?

The folk wisdom says no — that real "attention span" caps around 100,000 to 150,000 tokens regardless of what the spec
sheet says. This document examines whether that folk wisdom is correct (mostly yes), why (architectural and training
reasons that have not been solved), and what actually works when you need a model to use distant context (re-quoting,
compaction, and matching indexes — not vague positional references).

The findings synthesize 38 sources — academic benchmarks (RULER, NoLiMa, HELMET, LongBench v2), vendor documentation
(Anthropic's context-engineering articles), independent industry analyses (Chroma's "Context Rot" study, LindleyLabs,
TokenMix), and the architectural literature on positional encodings and KV cache compression.

## The Short Answer

**You cannot reliably redirect a frontier LLM's attention to a specific deep region through prompting alone.**

But the situation is not hopeless. There are interventions that work — re-quoting at the point of use, summarize-and-
recompose, matching indexes — and they are well-supported by empirical evidence. The "100K to 150K hard limit" intuition
is roughly correct as a working ceiling, with the important caveat that there is no single attention-span number.
Effective context is per-task. Simple needle retrieval can hold to a million tokens or beyond, but the moment you ask
for reasoning, the operational depth collapses dramatically.

The rest of this document explains how dramatically, why, and what to do about it.

## The Headline Gap: Nominal vs Effective Context

A "1M token context window" is two things at once: a true claim about what the model will technically accept as input,
and a misleading shorthand for what the model can reliably use. The gap between the two is the central insight.

LindleyLabs put it directly in April 2026: _models advertise 1M tokens but fall apart at 130K_. Their measurement —
consistent with independent benchmarks across the industry — finds **effective capacity is typically 60 to 70 percent of
the advertised window**, and performance does not degrade gracefully. A model claiming 200,000 tokens does not slowly
get worse from 100K to 200K. It works, then it falls off a cliff somewhere around 130K.

The OpenAI MRCR v2 benchmark — Multi-Round Context Recall, the 2026 industry standard for measuring deep recall — gives
the headline numbers for frontier models at maximum context:

| Model             | Max context | Recall at max        |
| ----------------- | ----------- | -------------------- |
| Claude Opus 4.6   | 1M tokens   | 76% (93% at 256K)    |
| Claude Sonnet 4.6 | 1M tokens   | ~65%                 |
| Gemini 3.1 Pro    | 1M tokens   | ~70%                 |
| Gemini 2.5 Pro    | 2M tokens   | ~55–65%              |
| GPT-5.4           | 128K (400K) | ~85% (short context) |
| DeepSeek V3.2     | 128K        | ~80%                 |

Source: TokenMix Research Lab, "1M Token Context Reality Check 2026."

Read these carefully. The best model in the industry, at its maximum advertised context, surfaces three out of four
retrieval-critical facts. That is _the best number_. For agentic retrieval, legal review, medical applications, or
anything where missing 24 percent of facts is unacceptable, "1M tokens" describes a capability the model technically
supports but cannot reliably deliver.

The Stanford HELM Long Context leaderboard (September 2025) tells the same story from a different angle. Combining
RULER, ∞Bench, and OpenAI MRCR into a mean score, the strongest frontier models cluster between 0.45 and 0.59:

| Model                           | Mean score |
| ------------------------------- | ---------- |
| GPT-4.1                         | 0.588      |
| GPT-4.1 mini                    | 0.530      |
| Gemini 2.0 Flash                | 0.527      |
| Palmyra X5                      | 0.525      |
| Llama 4 Maverick (17Bx128E) FP8 | 0.519      |
| Amazon Nova Premier             | 0.500      |
| Gemini 2.0 Flash Lite           | 0.497      |
| Llama 4 Scout (17Bx16E)         | 0.469      |

These are not the 99 percent numbers vendors quote for needle-in-a-haystack tests. They are what happens when you ask
for multi-task long-context reasoning. The gap is the point.

NoLiMa (Adobe Research, ICML 2025) makes the gap even sharper. The benchmark works by removing literal lexical overlap
between question and needle, so models cannot rely on string matching and must reason from latent associations. The
result: **11 out of 13 LLMs drop below 50 percent of their baseline performance at just 32,000 tokens**. GPT-4o falls
from 99.3 percent to 69.7 percent. In an era of million-token windows.

This is the central rebuttal to NIAH-only marketing. Needle-in-a-haystack — finding one rare token in a wall of random
text — is the easiest possible long-context test. It is also the test vendors run when they announce capabilities. RULER
(NVIDIA, 17 long-context LMs across 13 tasks beyond NIAH) reports it bluntly: "almost all models exhibit large
performance drops as the context length increases. While these models all claim context sizes of 32K tokens or greater,
only half of them can maintain satisfactory performance at the length of 32K."

The "1M context" headline tracks NIAH. Production tasks track RULER, NoLiMa, HELMET, and MRCR, and they crater far
earlier than the headline suggests.

There is no single number for how much context a model can handle. The threshold depends on the task. For frontier 2026
models, a working set of approximate thresholds:

- **NIAH single-needle retrieval**: holds to 200K to 1M+ tokens for top models.
- **Multi-hop reasoning** (RULER): degrades materially above 32K to 128K tokens.
- **Latent-association reasoning** (NoLiMa): degrades above 1K to 8K tokens.
- **Instruction following on long inputs**: degrades above 32K for most models.

These are the numbers to build against.

## Why Effective Context Falls Below Nominal

The gap is not a bug. It is the convergence of several architectural and training realities. Understanding the cause
helps explain why no prompt-engineering trick can fully eliminate the gap — and why some interventions work better than
others.

### Positional encoding limits

Rotary Position Embedding (RoPE) is the dominant scheme for modern decoder-only LLMs. It encodes position by rotating
query and key vectors in a frequency-defined way that allows the model to learn relative positions. RoPE works
beautifully within the length the model was trained on. Beyond that length, it extrapolates poorly. The fix is
interpolation — YaRN, NTK-aware scaling, position interpolation — which stretches RoPE to cover longer sequences. YaRN
(ICLR 2024) demonstrably improves on naive interpolation, but it does not eliminate the gap. The model's positional
intuition was learned on shorter sequences; extending the window does not retroactively teach it about depths it never
saw during training.

Recent work in 2025 ("Layer-Specific Scaling of Positional Encodings for Superior Long-Context Modeling") found that
this issue is exacerbated by uniform scaling across layers. Different transformer layers benefit from different scaling
factors, and applying one factor to all of them is leaving capacity on the table. Their layer-specific approach
recovered up to 20 percent on Key-Value Retrieval. The implication: long-context performance is not a monolithic
quantity, and the bottleneck is finer-grained than vendor specs suggest.

### Attention architecture

Pure quadratic attention over a million tokens is computationally impractical, so frontier serving paths use a mix of
sparse attention (Longformer-style, Mistral's sliding window), ring attention for cross-GPU parallelism, and hybrid
architectures (Jamba 1.5, RecurrentGemma) that combine state-space layers with transformer attention. Each technique
trades off something. Sliding window creates dead zones for tokens that fall outside it. Ring attention makes the
computation feasible but doesn't change how the model attends. State-space hybrids compress history into smaller states
and lose granular access to specific distant tokens. MoBA (Mixture of Block Attention, February 2025) routes attention
to subsets of blocks per token, which reduces cost but introduces its own faithfulness questions.

### KV cache compression — the invisible failure mode

This is the layer the API surface does not show, and it matters most.

In production, serving 1M-token prompts requires aggressive memory management. StreamingLLM (ICLR 2024) discovered the
attention sink phenomenon: keeping the KV state of just the first few "sink" tokens recovers most of the performance
that naive window attention loses. SnapKV (NeurIPS 2024) observes which keys the question attends to and keeps those,
evicting the rest. SnapStream (November 2025) — the production deployment of these techniques — compresses 128K KV
caches to 8K with minimal accuracy loss on most tasks.

The phrase "minimal accuracy loss on most tasks" hides what you need to know. When you submit a 750,000-token prompt to
a vendor API, you may not be talking to the model architecture. You may be talking to an inference pipeline that has
already compressed your context aggressively. The 50,000-token content you placed at the start of your prompt may have
been evicted from the served KV cache before generation began, and you will never see this from the API surface.

Vendor-reported NIAH numbers and your actual workload diverge for this reason. Vendor-published RULER scores should be
treated as best-case.

### The training-vs-inference gap

Models trained with finite document lengths cannot magically attend at depths they never saw. Pre-training corpora
contain documents of bounded length, and while long-document SFT and position-skip training stretch this, vendor claims
to 1M tokens often rely on a small fraction of training tokens beyond 32K to 128K. The 2025 paper "From 128K to 4M:
Efficient Training of Ultra-Long Context Large Language Models" makes the case explicitly: extending training length is
non-negotiable. Interpolation tricks alone leave large effective-context gaps.

The model "knows" how to attend at depths it was trained on, and degrades beyond.

## Lost in the Middle, Status 2026

Liu et al. published "Lost in the Middle: How Language Models Use Long Contexts" in 2023. The finding was that LLM
attention follows a U-shaped curve — strong attention to tokens at the beginning and end of input, dramatically weaker
attention to tokens in the middle. The paper's measured effect was a 30+ percent drop on information positioned in the
middle of long contexts.

The U-shape persists in 2026. No frontier model has been independently shown to eliminate it.

Three recent papers refine the understanding:

**"Lost in the Middle: An Emergent Property from Information Retrieval Demands"** (October 2025) argues the U-shape is
not a flaw but an emergent adaptation. When transformers are pre-trained on data that mixes long-term recall demands
(uniform retrieval across input) with short-term recall demands (recency-biased completion), the U-shape emerges
naturally. The authors reproduced it in GPT-2 and Llama variants trained from scratch on simple human-memory paradigm
tasks. The implication is uncomfortable for prompt engineers: if the U-shape is a structural consequence of how the
model was trained, you cannot fully prompt your way out of it.

**"Found in the Middle: Calibrating Positional Attention Bias Improves Long Context Utilization"** (July 2024) takes the
opposite tack. It shows that scaling initial-token saliency mitigates primacy-recency asymmetry, and that combined with
position-information scaling, "attention balancing can significantly improve the lost-in-the-middle problem." Reported
gain: up to 15 percentage points on retrieval-augmented generation tasks. The method is architectural — it modifies how
attention is computed — but its existence is evidence that the U-shape is not strictly necessary.

**"Initial Saliency in U-Shaped Attention Bias"** (December 2025) extends the calibration finding. Attention to the
first token disproportionately drives the U-shape; rebalancing first-token weight calibrates the curve. Again
architectural, not prompt-level.

The pattern across these three: the U-shape is mitigable at the training and inference-architecture level, persistent at
the prompt level, and for the deployed frontier models you are talking to in production, **it is not solved**. Content
placed at the absolute start or end of a long prompt is reliably attended. Content placed at 250K to 750K — almost
always "the middle" of a 1M-token prompt — is at material risk.

## Is the U-Shape Fractal?

A natural follow-up: when critical content is wrapped in an XML tag, a Markdown section, or any labeled block, does that
subunit get its own miniature U-shape — a local primacy peak at its start, a recency boost at its end — independent of
the macro curve?

The current evidence says no. The U-shape is a single global curve, not a recursive pattern that resets at subunit
boundaries. Three mechanisms converge on the conclusion.

Rotary Position Embedding decay is continuous, not segmented. Layer-Specific Scaling of Positional Encodings
(March 2025) traces lost-in-the-middle to "the rapid long-term decay in Rotary Position Embedding (RoPE)," and notes
that standard linear scaling extends positional embeddings "uniformly... throughout the entire input sequence." There is
no boundary at which the decay resets. Position 500,000 is position 500,000 regardless of whether it sits inside an XML
tag, a Markdown heading, or no structure at all. The position-encoding machinery does not see structural labels.

Attention sinks anchor at the absolute start of the sequence. StreamingLLM defined them as "the KV of initial tokens" of
the full input — tokens that absorb disproportionate attention regardless of semantic value. Unveiling and Harnessing
Hidden Attention Sinks (June 2024) found that secondary sinks can form stochastically at other positions, but did not
find them aligned to subunit boundaries. The primary primacy peak is at the absolute sequence start; secondary sinks are
scattered and content-dependent.

Models lack relative position awareness of subunits. From Attention Instruction: Amplifying Attention in the Middle via
Prompting (June 2024):

> Language models do not have relative position awareness of the context. Nevertheless, they demonstrate the capacity to
> adapt attention to a specific segment using matching indexes.

The model does not know that a given block is "in the middle of the prompt" — the mechanism for that knowledge does not
exist. What it has instead is string matching. When content is wrapped in `<critical_info>...</critical_info>` and later
referenced by name, the tag is found by lexical match, not by inferring its position. Labels are indexes for retrieval,
not flags for positional reweighting.

The practical consequence reframes structured prompts. Labeling does not create a local primacy peak — a
`<critical_info>` block at depth 50K is not more attended just because it has a tag. The tag enables targeted lookup by
name without raising attention weight inside the block. The recency arm of the global U-shape is always available, and
it tracks the current generation position rather than section boundaries, which is exactly why re-quoting works: pulling
50K content forward near token 750K moves it into the global recency window. The benefit is real; the cause is global
recency, not local structure. Matching indexes and positional bias are two distinct levers that compose. Re-quoting
exploits recency; tagged references exploit lexical matching. Label the block when introduced, then quote-by-name near
the point of use: the label gives findability, the re-quote gives attention weight.

The case rests on mechanism evidence rather than direct measurement. Standard benchmarks — Lost in the Middle, NoLiMa,
RULER, multi-document QA — treat documents as monolithic units: was the document found, or lost? None instrument
per-token attention weights inside a middle-positioned subunit, which is the measurement that would either confirm or
refute a fractal U-shape directly. Until such an experiment exists, the global-U reading rests on RoPE continuity,
attention-sink localization, and the absence of relative position awareness.

## Per-Model Thresholds

Mapping the literature onto specific frontier models, the following empirical thresholds emerge. NIAH columns describe
where simple retrieval still works; RULER and NoLiMa columns describe where reasoning and latent-association tasks start
to fail. MRCR recall is the headline deep-recall number from the OpenAI benchmark.

| Model                 | NIAH (single needle) | RULER / multi-hop        | NoLiMa (latent reasoning) | MRCR recall at max      |
| --------------------- | -------------------- | ------------------------ | ------------------------- | ----------------------- |
| Claude Opus 4.5–4.6   | 200K – 1M+           | ~256K (forgetting cliff) | 1K – 8K                   | 76% at 1M, 93% at 256K  |
| Claude Sonnet 4.5–4.6 | 200K – 1M+           | 32K – 128K               | 1K – 8K                   | ~65% at 1M              |
| Gemini 2.5 Pro        | 200K – 10M (claimed) | ~128K                    | 1K – 8K                   | ~55–65% avg at 2M       |
| Gemini 3 / 3.1 Pro    | 200K – 1M+           | 32K – 128K               | 1K – 8K                   | ~70% at 1M              |
| GPT-4.1               | 200K – 1M+           | ~128K                    | 1K – 8K                   | 21.4% (HELM mean basis) |
| GPT-5 / 5.4           | 128K (400K extended) | 32K – 128K               | 1K – 8K                   | ~85% short, no 1M data  |
| Llama 4 Maverick      | 200K – 1M+           | ~128K                    | 1K – 8K                   | 21.5% (HELM)            |
| Llama 4 Scout         | 200K – 1M+           | 32K – 128K               | 1K – 8K                   | 17.1% (HELM)            |
| Qwen 2.5 / 3          | 200K – 1M+ (claimed) | >128K                    | 1K – 8K                   | no published 1M data    |

Two cautions on this table. First, the NoLiMa "1K – 8K" range is a general heuristic from the Adobe Research paper; the
per-model thresholds within that range vary substantially (GPT-4o, for instance, runs at the upper end). For
model-specific NoLiMa thresholds, consult Adobe's benchmark directly. Second, GPT-5/5.4 does not yet have published 1M
data because its default cap is still 128K with an extended 400K mode; OpenAI's release documentation is the
authoritative source.

The numbers move quarterly. Treat this table as a snapshot, not a constant.

## Reachability vs Utilization

The thresholds in the table describe inflection points — depths at which the curve steepens. They are not boundaries
past which content is dropped. A natural question follows from the "256K forgetting cliff" framing: when content sits
beyond the edge, is the model unable to see it at all, or is it visible-but-unreliable?

The current evidence supports the second, with one production caveat that makes the first partially true.

In a standard transformer, attention is global. Every query position can attend to every key position in the context,
and the KV cache holds the K and V vectors for the entire prompt. There is no architectural mask that excludes tokens
beyond some depth — the attention computation runs over all of them. What degrades with distance is the quality of
attention, not its presence.

Two factors drive that quality degradation. The first is Rotary Position Embedding, whose frequency basis saturates at
long distances. Layer-Specific Scaling of Positional Encodings (March 2025) localizes lost-in-the-middle to "the rapid
long-term decay" in RoPE: at depths far beyond the training length, the model can still compute attention to distant
tokens but loses the positional resolution to distinguish them sharply. The second is training coverage. Pre-training
documents have finite length, and long-context fine-tuning covers only a fraction of the advertised window. From 128K to
4M (April 2025) puts it directly: extending training length is non-negotiable; interpolation alone leaves large
effective-context gaps. The model has not learned to attend meaningfully at depths it has never seen, even when the
attention mechanism still technically runs over those positions.

The production layer is where the cliff framing partially earns its keep. Frontier inference pipelines apply KV cache
compression to make 1M-token serving economically feasible. StreamingLLM preserves the K and V of initial "sink" tokens
while aggressively evicting middle states; SnapKV retains only the keys the question is likely to need; SnapStream
(November 2025) compresses 128K KV caches to 8K in continuous-batching production, with "minimal accuracy degradation"
on aggregate benchmarks. When the pipeline evicts the K and V for a span at depth 50K, those tokens stop being reachable
in any meaningful sense — the attention computation cannot retrieve what is no longer stored. This happens silently. The
API surface confirms a 750K-token prompt was submitted; it does not show which spans the inference layer chose to keep.

The shape of the resulting degradation is not a step function. The TokenMix Q1 2026 measurements on Claude Opus 4.6
trace the curve: 90%+ recall at 100K, 85% at 500K, 60–76% at 1M. The 256K figure marks where the curve steepens, not
where reachability ends — the same prompt structure that recovers 85% of facts at half a million tokens still recovers
three-quarters of them at the full million. Chroma's Context Rot study sharpens this further by showing that degradation
is "uneven and unpredictable": at any given depth, some content surfaces and some does not, depending on distractor
density, structural cues, and query specificity. There is no clean line where the model stops seeing.

This makes the right framing **reachability versus utilization**. Reachability is whether the model can attend to the
token at all — mostly yes throughout the advertised window, modulo production eviction. Utilization is whether the model
can extract usable information from attending to it — and this is what the U-shape measures, what NoLiMa probes, and
what RULER stress-tests. The two collapse to the same question only when KV compression intervenes; otherwise they are
distinct, with distinct answers. The "256K cliff" for Opus 4.6 is a utilization threshold, not a reachability threshold.
Past it, content remains technically visible, but the curve gets steep enough that production tasks should stop
depending on it.

## What Actually Works

Given that prompting cannot eliminate the U-shape, the practical question is: what interventions reduce the gap? The
literature converges on a small set, ranked here roughly by empirical strength.

### Re-quote at point of use

This is Anthropic's official recommendation for working with long Claude contexts, and it is the most direct
intervention in the literature.

Anthropic's quantitative case study on Claude 2 measured the effect explicitly: asking the model to extract relevant
quotes into a scratchpad before producing its final answer raised accuracy from 0.939 to 0.961, **a 36 percent reduction
in errors**. The Anthropic team summarized the technique:

> For long document tasks, ask Claude to quote relevant parts of the documents first before carrying out its task. This
> helps Claude cut through the noise of the rest of the document's contents.

The Citations API, introduced in January 2025, formalizes this at the vendor level: Claude grounds responses in source
documents with character-range references, and Anthropic reports a +15 percent recall accuracy gain. The mechanism is
the same — force the model to surface relevant text into its immediate context before reasoning over it.

Re-quoting works because the model attends strongly to recent context (the recency arm of the U-shape). Pulling the
50,000-token content forward as a quoted excerpt near the 750,000 mark means the model is operating on text that, from
its attention perspective, is now recent.

There is one caveat. Anthropic's own experiment found that scratchpad usage can _degrade_ performance on content
positioned at the very end of the document, because the scratchpad pushes the end of the document further from where the
model needs to answer. The workable rule: put instructions at the end of the prompt, and pull critical reference content
into a scratchpad before the instructions.

### Summarize-and-recompose (compaction)

Anthropic's term for this is **compaction**, and they describe it as "the first lever in context engineering to drive
better long-term coherence." It is the dominant production strategy for any prompt that exceeds the working depth of the
model.

From Anthropic's article on context engineering:

> Compaction is the practice of taking a conversation nearing the context window limit, summarizing its contents, and
> reinitiating a new context window with the summary. At its core, compaction distills the contents of a context window
> in a high-fidelity manner, enabling the agent to continue with minimal performance degradation.

In Claude Code specifically, the implementation is:

> We implement this by passing the message history to the model to summarize and compress the most critical details. The
> model preserves architectural decisions, unresolved bugs, and implementation details while discarding redundant tool
> outputs or messages. The agent can then continue with this compressed context plus the five most recently accessed
> files.

The structure to notice: a compacted prompt is not just "a summary." It is a summary plus a verbatim recent working set.
The summary captures intent and decisions; the verbatim files capture the precise state needed for the next action.

For a 750,000-token prompt referencing 50,000-token content, the manual compaction analogue is:

```
<system_instructions>
  [task instructions, placed at end for recency]
</system_instructions>

<reference_summary>
  [high-fidelity extraction of the 50K content — only quotes and facts relevant to the current query]
</reference_summary>

<active_working_set>
  [verbatim recent ~5K–10K tokens of context]
</active_working_set>

<task>
  [the actual question, placed last]
</task>
```

The cost case for compaction is decisive. A 1M-token prompt to Claude Opus 4.6 costs $5.00 in input tokens. With 90
percent prompt-cache hit, $0.50. At 1,000 calls per day, that is the difference between $150,000 and $15,000 per month.
A compacted prompt that compresses 750K into 30K is roughly 25 times cheaper before caching, and its smaller size caches
more reliably across sessions.

Anthropic flags a real failure mode: "overly aggressive compaction can result in the loss of subtle but critical context
whose importance only becomes apparent later." The recommended discipline is to maximize recall first (capture
everything that might be relevant), then iterate to improve precision (eliminate the truly redundant).

### Matching indexes, not positions

This is one of the most useful single findings in the literature and the least intuitive.

The paper "Attention Instruction: Amplifying Attention in the Middle via Prompting" (June 2024) studied whether prompts
like "pay close attention to tokens N–M" actually work. The result:

> Language models do not have relative position awareness of the context. Nevertheless, they demonstrate the capacity to
> adapt attention to a specific segment using matching indexes.

In practice: the prompt "look at the section near the beginning" does not work. The prompt "look at BLOCK_A" — where
BLOCK_A is a label you assigned to a labeled span earlier in the context — does work. The model is not tracking
positions; it is matching strings.

This is why structured tags and named sections improve reliability. When Anthropic recommends organizing prompts with
`<background_information>`, `<instructions>`, `## Tool guidance`, and similar markers, the mechanism is not aesthetic —
it is giving the model named indexes to match against. A labeled block at the start of a long prompt can be referenced
near the end by name, and the model can find it. An unlabeled positional reference will fail.

### Attention steering

The paper "Model Tells Itself Where to Attend: Faithfulness Meets Automatic Attention Steering" (September 2024)
proposes AutoPASTA, an inference-time method that identifies key contextual information and explicitly steers attention
scores. The reported improvement: 7.95 percent average gain for Llama-3-70B-Instruct. AutoPASTA is not a pure prompting
technique — it modifies attention scores at inference — but its existence demonstrates that explicit attention guidance
is more effective than implicit prompting. For pure prompt-level use, the lesson is to be specific about which named
spans matter, not to leave the model to infer relevance.

### Retrieval-augmented prompting on top of long context

The empirical finding most consistent across the literature: **hybrid long-context-plus-RAG outperforms either alone**.
The Sufficient Context paper (November 2024) measured this directly: retrieval that surfaces relevant chunks near the
model's attention point delivered 3.5x Recall@K, 1.5x for tool retrieval, and an 11.6 percent gain in planner accuracy
over naive long-context approaches.

This is not "RAG replaces long context." It is "RAG augments long context." The model still has access to the full
window if needed, but the relevant chunks are surfaced into the part of the window the model actually attends to.

### Hierarchical summarization, with a warning

For documents longer than 100K tokens, hierarchical merging — summarize sections individually, then merge — improves
throughput and reduces middle-context failure. The 2025 paper "Context-Aware Hierarchical Merging for Long Document
Summarization" reported strong gains for the Llama 3.1 family. But the same paper carries an explicit warning:

> The recursive merging process can amplify LLM hallucinations, increasing the risk of factual inaccuracies.

Use hierarchical merging with fidelity checks. The contextual-augmentation variant they propose (replacing intermediate
summaries with relevant input context, or refining them while citing the input) outperforms naive merging.

### Folklore and weakly supported techniques

Several widely recommended techniques have surprisingly thin empirical support:

- **Chunked prompts with reminders** — practical, widely used, but rigorous head-to-head benchmarks are sparse.
- **"Step back" or reflective prompting at depth** — chain-of-thought is broadly supported; the specific long-context
  effect size is unclear.
- **Pure prompt compression or KV pruning** — real accuracy/speed trade-off, not a free lunch.

These can work. They are not as well-anchored in measurement as re-quoting, compaction, and matching indexes.

## The Decision Frame: 50K Content, 750K Deep

Bringing the techniques back to the original question: you are generating at token 750,000, and you need content from
token 50,000. What do you actually do?

Three strategies, ranked by general-purpose effectiveness:

**Trust the full window.** Send the full 1M prompt and hope the model attends correctly. Viable when the 50K content is
highly structured, the task tolerates errors, and inference cost is genuinely not a concern. It almost always loses to
the other two strategies on accuracy. The case for trusting the window is real but narrow: NIAH-style retrieval tasks
where the model just needs to find one fact; tasks where the 50K content is at the absolute start of the prompt and the
question is at the absolute end (using the U-shape's primacy-recency strengths).

**Re-quote inline near the point of use.** Pull the 50K content forward as a labeled, verbatim block near token 750K.
Wins on latency — no preprocessing pass needed. Best when the 50K content is bounded (fits in a few KB), critical, and
you cannot afford the round trip of a summarization step. The hidden cost: re-quoting inline can break prompt caching.
If your usage pattern is "same long document, many different questions," the cached prefix is your best lever, and
modifying content near the end of the prompt by inserting re-quotes breaks the cache. The relevant Anthropic guidance:
keep the cache-friendly prefix stable; vary only the suffix.

**Summarize-and-recompose.** Pre-process to extract the 50K content's relevant parts plus the recent working set into a
fresh, much shorter prompt. The dominant strategy for production. Best fidelity per dollar. Best latency at depth (a
30K-token compacted prompt has sub-second prefill; a 1M-token raw prompt has 60 to 150-second prefill). Best cache
behavior — the recomposed prompt is short and cacheable across sessions. The investment is in summarization fidelity:
the compaction prompt has to capture every relevant fact, not just the surface narrative. Anthropic's recommended
discipline (recall first, then precision) is the right starting point.

The crossover points roughly:

- Under 100K depth: trusting the window is usually fine.
- 100K to 300K depth, single-task: re-quoting is sufficient.
- 300K+ depth, or any multi-step agentic task: summarize-and-recompose.

These numbers move with model generation. Test your specific task at your specific depth.

## The Hidden Failure Mode: KV Cache Compression in Production

Worth a section of its own, because no prompt engineering fixes it.

The frontier vendors run inference on top of optimized serving infrastructure (vLLM, SGLang, custom internal stacks).
Serving 1M-token prompts at scale requires aggressive memory management of the KV cache, and the techniques deployed —
StreamingLLM-style attention sinks, SnapKV-style query-aware eviction, SnapStream's hybrid prefill/decode compression —
all involve discarding KV state for tokens deemed unimportant by the inference pipeline.

The SnapStream paper (November 2025) reports compressing 128K KV cache to 8K with minimal accuracy loss on most tasks.
"Most" is the operative word. The accuracy implications are explicitly described as "not well understood" for modern
instruction-following and reasoning models. The paper introduces this technique into production deployments specifically
because it had not been there before.

What this means in practice: when you send a 750K-token prompt to a production API, the inference pipeline may evict the
KV state for your 50K content before generation begins, based on the pipeline's heuristics about which keys the question
will attend to. The pipeline may guess wrong about your particular task. You will see the resulting accuracy drop. You
will not see the cause.

Vendor-published RULER, NoLiMa, and MRCR scores are typically measured without aggressive KV compression. The production
endpoint you are calling may not match. The gap between published numbers and your workload includes this layer.

The mitigation is to use techniques that keep the relevant content recent (where the pipeline is unlikely to evict it).
Re-quoting at point of use does this implicitly. Summarize-and-recompose does it explicitly. Trusting a 1M-token prompt
does not.

## The Contested Question

A skeptical reviewer's verdict on the central question — can prompt engineering meaningfully close the lost-in-the-
middle gap at 1M-token depths?

The arguments for: AutoPASTA's 7.95 percent gain for Llama-3-70B. Anthropic's 36 percent error reduction from
re-quoting. Found-in-the-Middle's up-to-15-percentage-point calibration improvements. Sufficient Context's 3.5x Recall@K
from RAG hybrids. Attention Instruction's finding that matching indexes do shift attention. These are real effects,
measured in published research.

The arguments against: the U-shape is structural (Layer-Specific Scaling, Never Lost in the Middle), emergent from
training dynamics (Lost in the Middle as Emergent Property), and partially invisible (KV cache compression artifacts).
Independent measurements continue to show 30+ percent middle-content drops despite all prompting techniques. The
industry rule of thumb — "prompt engineering works at the margin, fine-tuning works at depth" — holds.

The honest synthesis: prompt engineering can recover meaningful percentage points (single-digit to mid-teens for the
best techniques). It cannot make a model attend at 750K depth the way it attends at 10K depth. For applications where
those percentage points matter, the techniques are worth using. For applications where you need reliability at depth,
the answer is not "better prompting" — it is "do not put critical content at depth in the first place."

LindleyLabs captures it well: _treat the 1M window as marketing. Treat 32K to 128K as the effective working depth for
reasoning_.

## Practical Takeaways

The synthesis, in operational form.

**Treat 32K to 128K as the effective working depth for reasoning.** 1M tokens is real but operationally limited. For
NIAH-style retrieval you can push further; for reasoning, no.

**Place critical content at the start or end, never the middle.** The U-shape is real and unsolved. Primacy and recency
arms work; the middle does not. If you have a choice, the end (recency) tends to be stronger than the start in 2026
models — and Anthropic's recommendation to put instructions at the end of the prompt aligns with this.

**Re-quote at point of use for must-attend content.** Anthropic's official recommendation, 36 percent error reduction in
their case study. Pull critical content forward as a labeled, verbatim block near where it will be used. Combine with
structured tags so the model can match the label as an index.

**Default to summarize-and-recompose beyond 200K to 300K depth** unless the task genuinely requires the full window. Pay
the preprocessing cost. Recover it in fidelity, latency, and cache behavior.

**Use labels (matching indexes), not positional references.** "See BLOCK_A" works. "See what I said earlier" does not.
Models match strings, not positions.

**Treat prompt caching as non-optional at long-context scale.** 50 to 90 percent cost reduction; without it, you run out
of budget. Re-quoting inline can break cache hits; summarize-and-recompose preserves them.

**Hybrid long-context-plus-RAG outperforms either alone.** Even with a 1M window, retrieval that surfaces relevant
chunks near the attention point delivers measurable accuracy gains. 3.5x Recall@K in Sufficient Context's measurements.

**Test your specific task at your specific depth.** Vendor numbers describe NIAH. Your workload is not NIAH. Measure
before you trust the window.

**Accept that prompt engineering works at the margin.** It is worth doing — single-digit to mid-teens percentage point
gains. It does not close the gap to short-context performance, and it does not need to. The right architectural pattern
for production is to keep prompts short relative to the model's effective working depth and to invest in retrieval and
compaction over context maximalism.

## Sources

Synthesized from a NotebookLM corpus of 38 sources covering academic benchmarks, mechanism papers, vendor documentation,
and independent industry analyses. Notable primary sources, organized by what they tell you:

**Effective context measurement**

- RULER (NVIDIA): https://arxiv.org/abs/2404.06654
- NoLiMa (Adobe): https://arxiv.org/abs/2502.05167
- HELMET: https://arxiv.org/abs/2410.02694
- LongBench v2: https://arxiv.org/abs/2412.15204
- Stanford HELM Long Context (Sep 2025): https://crfm.stanford.edu/2025/09/29/helm-long-context.html
- Chroma "Context Rot" coverage:
  https://wandb.ai/byyoung3/ml-news/reports/Chroma-Research-Warns-of-Context-Rot-as-LLMs-Falter-with-Long-Inputs--VmlldzoxMzczMjQ4MQ
- LindleyLabs reality check: https://lindleylabs.com/blog/your-million-token-context-window-is-a-lie
- TokenMix Q1 2026 numbers: https://tokenmix.ai/blog/1m-token-context-reality-check-2026

**Mechanism**

- YaRN (RoPE scaling): https://openreview.net/attachment?id=wHBfxhZu1u&name=pdf
- Layer-Specific Positional Scaling: https://arxiv.org/abs/2503.04355
- StreamingLLM (attention sinks): https://github.com/mit-han-lab/streaming-llm
- SnapStream (production KV compression, Nov 2025): https://arxiv.org/abs/2511.03092
- MoBA (Mixture of Block Attention): https://arxiv.org/abs/2502.13189

**Lost in the middle and calibration**

- Lost in the Middle (Liu et al. 2023): https://arxiv.org/abs/2307.03172
- Lost in the Middle: An Emergent Property (Oct 2025): https://arxiv.org/abs/2510.10276
- Found in the Middle (calibration): https://arxiv.org/abs/2406.16008
- Never Lost in the Middle (position-agnostic training): https://arxiv.org/abs/2311.09198

**Prompting techniques**

- Attention Instruction: https://arxiv.org/abs/2406.17095
- Model Tells Itself Where to Attend (AutoPASTA): https://arxiv.org/abs/2409.10790
- Question Tokens Deserve More Attention: https://arxiv.org/abs/2504.09402
- Context-Aware Hierarchical Merging (with hallucination warning): https://arxiv.org/abs/2502.00977
- Sufficient Context (RAG-on-top-of-long-context): https://arxiv.org/abs/2411.06037

**Vendor guidance**

- Anthropic, Effective context engineering for AI agents (Sep 2025):
  https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic, Prompt engineering for Claude's long context window: https://www.anthropic.com/news/prompting-long-context
- Anthropic Claude Docs, Long context prompting tips:
  https://anthropic.mintlify.app/en/docs/build-with-claude/prompt-engineering/long-context-tips
- Scale AI, Long-context instruction following: https://scale.com/blog/long-context-instruction-following

The full NotebookLM working set (with structured Perplexity synthesis as the primary text source plus 37 web sources) is
maintained at: https://notebooklm.google.com/notebook/2edbe872-e496-41f3-9da7-0925e947def7
