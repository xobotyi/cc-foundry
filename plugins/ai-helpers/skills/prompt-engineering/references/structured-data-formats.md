# Structured Data Formats

How format choice affects LLM accuracy, cost, and reasoning — with empirical evidence and practical selection rules.

---

## Why Format Matters

Format is not cosmetic. Empirical benchmarks show:

- Up to **16–18 percentage point** accuracy swings between best and worst formats for tabular data
  (ImprovingAgents, 2025)
- Up to **54% more correct answers** with the best vs. worst format for nested data (ImprovingAgents, 2025)
- Format restrictions on output (forcing JSON/XML generation) cause **significant reasoning degradation** — stricter
  constraints produce larger drops (Tam et al., "Let Me Speak Freely", 2024)
- Content-only prompt optimization leaves performance on the table: jointly optimizing content AND format (CFPO)
  produces measurable gains over content-only methods (Xu et al., arXiv:2502.04295, 2025)

---

## Tabular Data: Format Rankings

Benchmark: 1,000 employee records × 1,000 retrieval questions, GPT-4.1-nano (ImprovingAgents, 2025).

- **Markdown-KV** — 60.7% accuracy, 52,104 tokens — best accuracy overall
- **XML** — 56.0%, 76,114 tokens
- **INI** — 55.7%, 48,100 tokens
- **YAML** — 54.7%, 55,395 tokens
- **HTML** — 53.6%, 75,204 tokens
- **JSON** — 52.3%, 66,396 tokens
- **Markdown-Table** — 51.9%, 25,140 tokens — best accuracy-per-token ratio
- **Natural-Language** — 49.6%, 43,411 tokens
- **TOON** — 47.5%, 21,518 tokens — token-efficient but no accuracy advantage over CSV
- **JSONL** — 45.0%, 54,407 tokens
- **CSV** — 44.3%, 19,524 tokens — most token-efficient, worst accuracy
- **Pipe-Delimited** — 41.1%, 43,098 tokens — worst overall

Key pattern: more tokens generally correlate with higher accuracy, but not linearly. Markdown-KV punches above its
weight. CSV and JSONL are poor on both dimensions relative to alternatives at similar token costs.

**Avoid defaulting to CSV or JSONL.** Both are common but underperform significantly.

---

## Nested Data: Format Rankings

Benchmark: 6–7 level deep Terraform-like configs, 1,000 retrieval questions per format (ImprovingAgents, 2025).

Results for GPT-5 Nano:

- **YAML** — 62.1% accuracy, 42,477 tokens — best accuracy
- **Markdown** (heading-levels + KV leaves) — 54.3%, 38,357 tokens — best token efficiency
- **JSON** — 50.3%, 57,933 tokens
- **XML** — 44.4%, 68,804 tokens — most tokens, poor accuracy
- **TOON** — 43.1%, 45,436 tokens — worse than YAML and Markdown despite similar token count

Pattern consistent across Gemini 2.5 Flash Lite (YAML best, XML worst). Llama 3.2 3B showed no significant format
sensitivity — format agnostic for small open-source models.

Why YAML wins for nested data:

- Indentation makes hierarchy visually explicit
- No closing-tag noise
- Heavily represented in training data (CI/CD, Kubernetes, configs)

Why XML loses: repetitive `<tag></tag>` pattern adds visual noise and token cost simultaneously; less represented in
modern training corpora.

---

## TOON (Token-Oriented Object Notation)

TOON is a format designed specifically for LLM token efficiency.

Findings (ImprovingAgents TOON benchmarks, 2025):

- Tabular data: TOON at 21,518 tokens achieved 47.5% — no statistically significant advantage over CSV (44.3%, 19,524
  tokens), and worse than Markdown-Table at similar token cost
- Nested data (GPT-5 Nano): TOON at 45,436 tokens scored 43.1% — worst performer, below YAML, Markdown, JSON, and XML
- The TOON GitHub repo's own benchmarks show TOON performing well, creating conflicting evidence — methodology
  differences not yet resolved

**Verdict:** Do not use TOON as a default. Token efficiency claims do not hold up in independent accuracy testing.
Markdown-Table and Markdown-KV deliver better accuracy-per-token tradeoffs.

---

## Format Restrictions on Output (Structured Generation)

Distinct from input format. This concerns forcing the model to _output_ in a structured format (JSON mode, XML schemas,
etc.).

Tam et al., "Let Me Speak Freely?" (arXiv:2408.02442, 2024):

- Format restrictions on generation **significantly degrade reasoning ability**
- Stricter constraints → greater degradation
- Effects are pronounced on reasoning tasks; domain knowledge retrieval is less affected

Implication: when the task requires reasoning, avoid hard structural output constraints. Use structured output only when
the downstream consumer requires it — and expect a reasoning tax. Prefer post-processing free-form output over
constraining generation when both options are available.

---

## Content-Format Prompt Optimization (CFPO)

Xu et al. (arXiv:2502.04295, 2025):

- Standard automated prompt optimization focuses only on content (wording, examples)
- CFPO jointly optimizes prompt content AND format through iterative refinement
- Uses natural language mutations for content + systematic format exploration
- Demonstrated measurable performance improvements over content-only methods across multiple tasks and open-source LLMs
- Model-agnostic approach

Practical implication: when optimizing prompts systematically, treating format as fixed is leaving accuracy on the
table. Format and content interact — changing one may require re-tuning the other.

---

## Format Robustness: Mixture of Formats (MOF)

Ngweta et al., "Towards LLMs Robustness to Changes in Prompt Format Styles" (arXiv:2504.06969, NAACL SRW 2025):

- LLMs are sensitive to non-semantic format changes ("prompt brittleness") — small format variations cause large
  performance swings
- MOF: diversify the format styles used across few-shot examples in the prompt
- Inspired by computer vision data augmentation — prevents the model from over-indexing on a specific format style
- Empirically reduces style-induced brittleness and improves overall performance across format variations

Practical implication: if few-shot examples are all in the same format, the model may become brittle to format
deviations at inference. Varying format styles across examples improves robustness without changing content.

---

## Selection Format for Classification Tasks

Willard et al., "Effect of Selection Format on LLM Performance" (arXiv:2503.06926, 2025):

- Compared bullet points vs. plain English for presenting classification options in prompts
- Bullet points generally outperform plain English for option presentation
- Exceptions exist — the effect is not universal across all tasks and models

Practical implication: for multiple-choice or classification prompts, default to bullet-point option lists over inline
plain-text enumeration.

---

## StructEval: Benchmarking Structured Output Generation

Yang et al., StructEval (arXiv:2505.20139, 2025):

- Comprehensive benchmark for LLMs generating structured outputs
- Covers 18 formats, 44 task types
- Two paradigms: generation (NL prompt → structured output) and conversion (format-to-format)
- Metrics: format adherence + structural correctness
- Even o1-mini achieves only 75.58 average score; open-source models lag ~10 points
- Generation tasks are harder than conversion tasks
- Visual content (HTML, React, SVG) is harder than text-only structures (JSON, YAML, CSV)

Practical implication: structured output generation is a non-trivial capability — do not assume models will produce
valid structured output reliably without validation, especially for visual formats or complex schemas.

---

## Format Selection Decision Rules

**For input data passed to the model:**

Use Markdown-KV when:

- Accuracy is the priority and token cost is secondary
- Records have independent attributes (lookup, retrieval, RAG pipelines)
- Each record is self-contained

Use Markdown-Table when:

- Cross-row comparison IS the cognitive task (decision matrices, feature grids)
- Token efficiency matters and some accuracy loss is acceptable
- Test: "If removing a column loses comparative meaning → table. Otherwise → KV list."

Use YAML when:

- Data is deeply nested (configs, hierarchical structures)
- Working with larger frontier models (GPT-4+, Gemini Flash)
- Accuracy is the priority over token cost for nested data

Use Markdown headings + KV leaves when:

- Nested data AND token cost is a primary concern
- ~10–12% fewer tokens than YAML with moderate accuracy penalty

Avoid:

- **CSV** — token-efficient but significantly underperforms on accuracy
- **JSONL** — poor accuracy AND not token-efficient
- **XML** — worst accuracy for nested data; highest token cost
- **TOON** — token efficiency claims unverified; accuracy underperforms

**For output format requirements:**

- Hard format constraints degrade reasoning — use only when the consumer strictly requires it
- Prefer free-form output + post-processing over constrained generation for reasoning-heavy tasks
- For classification options in prompts: bullet points outperform plain English enumeration
- Validate structured output — even top models are not reliable; generation fails more than conversion

**When optimizing prompts:**

- Treat format as a variable, not a constant — CFPO shows format and content must be co-optimized
- Vary format styles across few-shot examples to reduce prompt brittleness (MOF)
- Small format changes can cause large accuracy swings — benchmark before committing to a format

---

## Model-Specific Notes

- **Large frontier models** (GPT-4+, Gemini): strong format sensitivity — format choice significantly impacts accuracy;
  YAML/Markdown-KV are strong defaults
- **Small open-source models** (Llama 3.2 3B): low format sensitivity — format choice matters less; optimize for token
  efficiency
- Format preferences may reflect training data distribution — a model trained heavily on YAML configs will likely parse
  YAML better
- Always benchmark format choice on your specific model if format is a high-leverage variable in your pipeline
