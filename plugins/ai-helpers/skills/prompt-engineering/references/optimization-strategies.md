# Optimization Strategies

High-resolution reference for systematic prompt optimization. Covers manual iteration discipline, automated optimization
frameworks (DSPy), promptware engineering principles, and RAG integration patterns.

---

## The Promptware Crisis

Prompt development is largely ad hoc: trial-and-error, undocumented decisions, no reproducibility, no formal testing.
The **promptware engineering** paradigm (Chen et al., 2025, ACM TOSEM) reframes prompts as first-class software
artifacts subject to full SE lifecycle discipline.

Key insight: prompts are programs. They have requirements, design, implementation, testing, debugging, and evolution
phases — each of which benefits from principled methodology rather than intuition.

---

## Promptware Engineering Lifecycle

### Requirements Engineering

Before writing a prompt, specify:

- `Task definition` — what output is correct? What counts as failure?
- `Input distribution` — what is the realistic range of inputs?
- `Constraints` — latency, cost, output format, safety, model compatibility
- `Evaluation criteria` — how will you know the prompt works? What metric, what dataset?

Prompts without defined evaluation criteria cannot be improved systematically — you have no signal to optimize toward.

### Design

- Choose decomposition strategy before writing: single-shot, chain-of-thought, multi-step pipeline, RAG-augmented
- Identify which parts of the prompt are invariant (task instructions) vs. variable (examples, retrieved context)
- Design for testability: modular prompts are easier to isolate and test than monolithic ones
- Document design decisions — why a particular structure, why specific examples, why a given output format

### Implementation

- Start minimal: smallest prompt that could possibly work, then add complexity when tests fail
- Separate concerns: task instruction, output format specification, examples, and retrieved context should be distinct
  sections — not interwoven
- Use explicit delimiters to separate prompt sections; prevents one section from contaminating another
- Version prompts like code: named versions, changelogs, reproducible snapshots

### Testing

- Build an eval set before optimizing: at minimum 20-50 labeled examples covering edge cases
- Test against failure modes, not just happy path
- Regression test: every prompt change runs the full eval suite
- Track metrics across versions: accuracy, format compliance, latency, cost per call

### Debugging

When a prompt fails on specific inputs:

1. Isolate the failure: is it the instruction, the examples, the format spec, or the input itself?
2. Add a targeted example that covers the failure case
3. Check if the fix breaks other cases (regression)
4. If systemic: reconsider decomposition strategy rather than patching instructions

### Evolution and Monitoring

- Monitor production outputs for distribution shift (inputs change, model updates)
- Track metrics on live traffic, not just eval sets
- Treat model upgrades as breaking changes: re-run full eval suite before deploying
- Archive prompt versions; production rollback requires the exact prompt, not just the model checkpoint

---

## DSPy: Declarative Prompt Optimization

DSPy (Khattab et al.) replaces hand-written prompts with **declarative modules** that are optimized automatically
against a metric. The core shift: specify _what_ you want (a metric), not _how_ to say it (the exact prompt text).

### Core Concepts

- `Signature` — declarative specification of input/output fields with type annotations: `question -> answer`
- `Module` — composable unit wrapping a signature with an inference strategy (Predict, ChainOfThought, ReAct)
- `Optimizer (Teleprompter)` — searches prompt space automatically; finds instructions and examples that maximize the
  metric on a training set
- `Metric` — the objective function; drives all optimization decisions

### Key Optimizers

- `BootstrapFewShot` — generates and selects few-shot examples from training set via bootstrapping
- `MIPRO` — multi-step instruction proposal and selection; optimizes both instructions and examples jointly
- `BayesianSignatureOptimizer` — Bayesian search over instruction candidates; efficient for large search spaces
- `BootstrapFinetune` — generates training data for fine-tuning from DSPy traces

### DSPy vs. Manual Prompt Engineering

- `Manual` — intuition-driven, not reproducible, hard to scale, collapses when model changes
- `DSPy` — metric-driven, reproducible, scales to complex pipelines, adapts when model changes by re-optimizing
- Use DSPy when: you have a measurable metric, enough labeled examples (≥50), and a complex multi-step pipeline
- Use manual when: you need rapid iteration, have no labeled data, or task is too open-ended to define a metric

### Experimental Results (DSPy paper, 2026)

- 30-45% improvement in factual accuracy on reasoning and RAG benchmarks vs. baseline prompting
- ~25% reduction in hallucination rates
- Consistent gains across models (not model-specific)
- Gains come from: better instruction synthesis, calibrated reasoning control, reduced unnecessary complexity

### Integration Pattern

```
1. Define Signature: question, context -> answer, confidence
2. Build Module: ChainOfThought(signature)
3. Define Metric: exact_match or custom eval function
4. Compile: teleprompter.compile(module, trainset=examples, metric=metric)
5. Evaluate: evaluate(compiled_module, devset=held_out_examples)
6. Deploy: compiled module generates optimized prompts at inference time
```

---

## RAG Integration and Optimization

Retrieval-Augmented Generation addresses parametric knowledge limitations by injecting retrieved context at inference
time. Prompt engineering intersects RAG at the retrieval query, context injection, and generation instruction layers.

### Retrieval Query Optimization

- Retrieval quality is upstream of generation quality — bad retrieval cannot be fixed in the generation prompt
- Rewrite user queries before retrieval: expand abbreviations, add context, clarify ambiguous references
- Use HyDE (Hypothetical Document Embedding): generate a hypothetical answer, embed it, retrieve against that embedding
- Multi-query retrieval: generate multiple query variants, retrieve for each, deduplicate before injection

### Context Injection Patterns

- `Top-k injection` — inject k most relevant retrieved chunks; simple but ignores inter-chunk relationships
- `Reranking` — use a secondary model to rerank retrieved chunks by relevance before injection
- `Context compression` — summarize or extract key sentences from retrieved chunks to reduce noise
- `Lost-in-the-middle mitigation` — place most relevant context at the beginning or end of the context window, not the
  middle (models attend poorly to middle positions)
- `Source labeling` — tag each chunk with its source; enables the model to cite and reason about provenance

### Generation Prompt for RAG

- Explicitly instruct the model to use only the provided context
- Instruct it to say "I don't know" when context is insufficient rather than confabulating
- For multi-document RAG: instruct the model to reconcile conflicting information explicitly
- Format: `Context:\n{chunks}\n\nQuestion: {query}\n\nAnswer using only the context above.`

### RAG Evaluation

- `Faithfulness` — does the answer make claims supported by the retrieved context?
- `Answer relevance` — does the answer address the query?
- `Context recall` — did retrieval surface the chunks needed to answer?
- `Context precision` — are the retrieved chunks actually relevant, or is there noise?

---

## Manual Optimization Discipline

### Iteration Protocol

1. Define the metric before starting — what does "better" mean concretely?
2. Build an eval set — representative examples covering the input distribution and known edge cases
3. Establish a baseline — run the current prompt, record metrics
4. Make one change at a time — never change instruction + examples + format simultaneously
5. Measure — run eval, compare to baseline
6. Keep or revert — if metric improves, keep; if not, revert exactly
7. Document — record what changed and why; the decision log is as important as the prompt

### High-Impact Changes (ranked by typical effect)

- `Task reframing` — changing how the task is described (active vs. passive, positive vs. negative framing)
- `Example selection` — which few-shot examples to include and in what order
- `Reasoning elicitation` — adding chain-of-thought vs. direct answer instruction
- `Output format specification` — explicit format constraints improve format compliance significantly
- `Role/persona framing` — "You are an expert in X" can shift output register and specificity
- `Context position` — where in the prompt key information appears affects attention and recall

### Example Selection Strategy

- Include examples that cover the failure modes you care about, not just typical cases
- Balance positive and negative examples for classification tasks
- Order matters: recent examples (closer to the query) have stronger influence in few-shot settings
- Avoid examples that are too similar to each other — diversity in examples improves generalization
- For complex tasks: include worked examples with explicit reasoning steps, not just input-output pairs

### Format Optimization

- Explicit format instructions outperform implicit ones (show + tell beats show-only or tell-only)
- JSON schema specification reduces format errors significantly vs. prose descriptions
- For free-text outputs: specify structure (sections, length, tone) explicitly
- Avoid format instructions that conflict with each other — models will arbitrarily choose one

---

## Automated Prompt Engineering (APE)

Beyond DSPy, several automated approaches exist for instruction generation:

- `APE (Auto Prompt Engineer)` — generates and scores candidate instructions using the model itself; selects best by
  execution accuracy on a small labeled set
- `OPRO (Optimization by PROmpting)` — uses an LLM as optimizer; iteratively proposes improved instructions given
  current performance
- `TEXTGRAD` — applies gradient-like feedback (natural language critiques) to iteratively refine prompts
- `Active-Prompt` — identifies examples where the model is most uncertain; focuses annotation effort on those cases

When to use automated APE vs. DSPy:

- `APE/OPRO` — good for single-module instruction optimization with limited labeled data
- `DSPy` — better for multi-step pipelines, joint instruction+example optimization, and metric-driven compilation

---

## Promptware Quality Gates

Before shipping a prompt to production:

- `Eval suite exists` — at minimum 20 labeled examples; ideally 100+
- `Regression baseline recorded` — current metric scores stored for comparison on future changes
- `Edge cases tested` — empty input, max-length input, adversarial input, ambiguous input
- `Format validated` — output format tested against all downstream consumers
- `Model version pinned` — prompt is tied to a specific model version; updates require re-evaluation
- `Prompt versioned` — stored in version control with a changelog
- `Monitoring configured` — production metric tracking in place for distribution shift detection

---

## Quick Reference: Optimization Approaches

- `DSPy compilation` — metric-driven automatic optimization of instructions and examples; best for complex pipelines
- `BootstrapFewShot` — automatic few-shot example selection from labeled training data
- `MIPRO` — joint instruction + example optimization via multi-step proposal search
- `APE/OPRO` — LLM-as-optimizer for single-module instruction generation
- `HyDE` — hypothetical document embedding for improved retrieval query quality
- `Reranking` — secondary model reranks retrieved chunks before context injection
- `Context compression` — summarize retrieved chunks to reduce noise before injection
- `One-change iteration` — systematic manual optimization; one variable changed per eval cycle
- `Eval-first discipline` — define metric and eval set before writing the first prompt version
