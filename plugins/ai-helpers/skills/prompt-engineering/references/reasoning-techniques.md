# Reasoning Techniques

Depth reference for the `prompt-engineering` skill. Covers CoT variants, structured search methods, self-consistency,
extended thinking, reasoning models, and constrained generation research.

---

## Chain-of-Thought (CoT) Prompting

Introduced by Wei et al. (2022) — enables complex reasoning by eliciting intermediate reasoning steps before a final
answer. An emergent capability: only effective in sufficiently large models.

### Variants

- **Few-shot CoT** — provide 2–8 worked examples where each solution includes explicit reasoning steps; the model
  generalizes the pattern to new inputs. Wei et al. (2022) showed this substantially outperforms direct few-shot on
  arithmetic and commonsense benchmarks.
- **Zero-shot CoT** — append "Let's think step by step" to the prompt without providing examples. Proposed by Kojima et
  al. (2022); effective when demonstration construction is impractical. Underperforms few-shot CoT on complex multi-step
  tasks but beats direct zero-shot substantially.
- **Auto-CoT** — Zhang et al. (2022) eliminate manual example curation by: (1) clustering questions by diversity, (2)
  sampling one representative from each cluster, (3) generating its reasoning chain with zero-shot CoT. Heuristics:
  question length ≤ 60 tokens, rationale ≤ 5 steps. Reduces manual effort while maintaining diversity in demonstrations.

### When CoT helps vs. hurts

- **Helps**: arithmetic, symbolic reasoning, multi-step logic, commonsense QA with causal chains
- **Neutral or hurts**: simple factual lookup, straightforward classification, tasks where answer is immediately
  deducible — CoT adds token cost with no accuracy gain
- **Hurts on reasoning models** (o-series, Claude extended thinking): these models already reason internally; explicit
  "think step by step" instructions are redundant and can degrade performance (OpenAI o3/o4-mini guide)

### Implementation patterns

- Place reasoning-step examples before the target question
- Ensure demonstrations are diverse across problem types (Auto-CoT motivation)
- Prefix answer with "Let's think step by step:" for zero-shot; drop this on native reasoning models
- Rationale quality matters more than quantity — one accurate chain beats three inconsistent ones

---

## Self-Consistency

Wang et al. (2022) — replaces greedy decoding with majority-vote aggregation over multiple sampled reasoning paths.

### Mechanism

1. Sample N diverse reasoning paths (temperature > 0, typically N = 10–40)
2. Each path independently derives an answer
3. Final answer = most frequent answer across samples (majority vote)
4. Optionally weight by path confidence or length

### Performance profile

- Strongest gains on: arithmetic reasoning, commonsense QA, tasks with unique correct answers
- Requires high temperature sampling — low temperature collapses paths to near-identical
- Cost scales linearly with N; diminishing returns past N ≈ 20–40
- Not effective for open-ended generation where "majority answer" is undefined

### When to use

- Task has a single objectively correct answer
- Budget allows N × inference cost
- Single-chain CoT is producing inconsistent results across runs

---

## Tree of Thoughts (ToT)

Yao et al. (2023) and Long (2023) — generalizes CoT from a single reasoning chain to a tree structure enabling
exploration and backtracking.

### Core components

- **Thought** — coherent intermediate reasoning step (a language sequence)
- **Evaluation** — model self-evaluates each thought as "sure / maybe / impossible" toward the goal
- **Search** — BFS, DFS, or beam search over the thought tree; backtracking on dead ends
- **Controller** (Long 2023 variant) — RL-trained controller decides when and how many levels to backtrack, enabling
  adaptive search vs. fixed BFS/DFS

### Configuration parameters

- Number of candidate thoughts per step (beam width `b`, typically 5)
- Number of steps/depth (task-dependent; Game of 24 uses 3 steps)
- Evaluation samples per thought (typically 3 votes)
- Search strategy: BFS for shallow exploration, DFS for deep narrowing

### Appropriate tasks

- Problems requiring strategic lookahead (puzzles, planning, proofs)
- Tasks where intermediate states can be objectively evaluated
- Cases where greedy CoT gets stuck in local optima

### Implementation via single prompt

Hulbert (2023) proposed a lightweight approximation: instruct the model to generate N candidate next steps, evaluate
each, eliminate weaker paths, and continue — all within one prompt. Lower accuracy than full ToT with search, but zero
infrastructure overhead.

---

## Multimodal CoT

Zhang et al. (2023) — extends CoT to inputs containing both text and vision.

### Two-stage framework

1. **Rationale generation** — model produces reasoning grounded in both image and text inputs
2. **Answer inference** — final answer derived from the generated rationale

### Key finding

A 1B multimodal CoT model outperforms GPT-3.5 on the ScienceQA benchmark, demonstrating that grounding rationales in
visual information yields disproportionate gains on science/diagram tasks compared to text-only CoT.

### Applicability

Use when: question requires reading a chart, diagram, or image for intermediate reasoning steps, not just as context.
Not useful when visual content is cosmetic or the reasoning path is entirely text-derivable.

---

## Self-Consistency vs. ToT: Selection Guide

| Criterion           | Self-Consistency                | Tree of Thoughts                          |
| ------------------- | ------------------------------- | ----------------------------------------- |
| Answer space        | Discrete, unique correct answer | Structured, evaluable intermediate states |
| Backtracking needed | No                              | Yes                                       |
| Infrastructure      | Zero (just N calls)             | Requires orchestration loop               |
| Cost                | N × single-chain cost           | N × depth × eval cost                     |
| Best for            | Arithmetic, QA                  | Planning, puzzles, proofs                 |

This is a genuine 2D comparison where both dimensions change the choice — table is appropriate here.

---

## Graph Prompting

Liu et al. (2023) — GraphPrompt unifies graph-structured downstream tasks under a single prompting framework, aligning
the pretraining objective with downstream task structure via task-specific templates. Improves performance on node
classification and link prediction without task-specific fine-tuning.

Practical relevance: limited to structured graph ML tasks; not a general-purpose reasoning enhancement.

---

## Extended Thinking / Native Reasoning Models

Two distinct implementations of the same core idea — allocating explicit compute for internal deliberation before
producing output.

### Anthropic extended thinking (Claude)

Two modes for enabling internal reasoning:

- **Adaptive thinking** (recommended for Opus 4.6, Sonnet 4.6, Mythos Preview) — `thinking: {type: "adaptive"}`. Claude
  dynamically determines when and how much to think. Use the `effort` parameter (`max`/`high`/`medium`/`low`) to guide
  depth. Automatically enables interleaved thinking between tool calls.
- **Manual thinking** (legacy, deprecated on 4.6 models) — `thinking: {type: "enabled", budget_tokens: N}`. Fixed token
  budget for reasoning. Minimum 1,024 tokens.

Key behaviors:

- Claude 4 models return summarized thinking by default (full thinking access requires contacting sales)
- At `high`/`max` effort, Claude almost always thinks; at `low`, it may skip thinking for simple queries
- Extended thinking improves performance on: math, code, multi-step analysis, ambiguous instructions
- Do not prompt "think step by step" — it's redundant and may degrade quality on thinking models

### OpenAI o-series (o3, o4-mini)

Trained to reason internally before responding. Key behavioral differences from standard models:

- **Developer messages replace system messages** (from o1-2024-12-17 onward) — system prompts are auto-converted
  internally
- **No CoT prompting** — "think step by step" is counterproductive; do not include it
- **Zero-shot first** — reasoning models often don't need few-shot examples; add them only if zero-shot underperforms
- **Markdown off by default** — include `"Formatting re-enabled"` on first line of developer message to enable markdown
  in responses
- **Persisted reasoning items** (o3/o4-mini): reasoning tokens generated during tool calls are preserved across turns
  via Responses API; Chat Completions API drops them, degrading agentic performance
- **Function call ordering**: explicitly define required sequences in developer prompt; models can misjudge tool call
  order without guidance

### Model selection: reasoning models vs. standard models

- Speed/cost + well-defined tasks → standard (GPT-4.1, Claude Sonnet at low effort)
- Accuracy/reliability + complex multi-step → reasoning (o3, o4-mini, Claude with adaptive thinking at high/max effort)
- Most production workflows use both: reasoning model as planner, standard model as executor (OpenAI reasoning best
  practices)

### Prompting reasoning models: rules

- Prefer general instructions ("think thoroughly") over prescriptive step-by-step plans — reasoning models' internal
  deliberation frequently exceeds what a human would prescribe
- Provide specific success criteria and constraints explicitly
- Use delimiters (markdown, XML tags) to separate prompt sections
- Use `<thinking>` tags inside few-shot examples to demonstrate desired reasoning style and depth
- Ask for self-verification: "Before you finish, verify your answer against [criteria]"
- Avoid explicit CoT prompts ("think step by step") — redundant on reasoning models, may degrade quality
- For function calling: put critical usage criteria first in tool descriptions; key rules before context (6% accuracy
  improvement observed by putting escape rules first in grep tool description — OpenAI o3/o4-mini guide)
- Thinking triggering is promptable — add system prompt guidance to steer how often Claude thinks

---

## Constrained Reasoning: CRANE

Banerjee et al. (arXiv:2502.09061, ICML 2025) — addresses the tension between constrained decoding and reasoning
quality.

### Problem

Strict grammar constraints (e.g., enforcing syntactically valid code output only) collapse the model's reasoning space,
preventing it from using intermediate natural language steps. Prior constrained decoding methods observe consistent
accuracy drops because the grammar forbids reasoning tokens.

### CRANE solution

- Augment the output grammar with additional rules that explicitly allow free-form reasoning segments
- Constrained decoding applies only at answer boundaries, not throughout the entire generation
- Theoretically proved: there always exists a grammar augmentation that preserves reasoning capability while enforcing
  syntactic correctness at output
- Up to 10 percentage points accuracy improvement over both unconstrained and prior constrained baselines on
  GSM-symbolic and FOLIO benchmarks

### Practical implication

When enforcing structured output formats (JSON, code, formal logic), allow the model to reason in natural language
before emitting the constrained output — do not constrain the full generation. A `<reasoning>` block before a JSON block
achieves this without grammar machinery.

---

## Multi-Agent Reasoning Coordination

Dhrif et al. (arXiv:2510.00326) — framework for maintaining reasoning coherence across agent transitions in multi-agent
systems.

### Core findings

- 42% reduction in reasoning latency via dynamic task routing
- 23% improvement in logical consistency (ROUGE-L) across agent handoffs
- 89% task completion without context loss
- **Performance degrades beyond 10 agent transitions** — hard practical limit for current coordination mechanisms
- Primary performance driver: consensus mechanism, not routing or prompt adaptation alone
- Memory requirement: 76.5 GB for 1,000 concurrent agents — scaling is non-trivial

### Implication for prompt design

Maintain semantic coherence across agent handoffs by including reasoning context vectors (structured summaries of prior
agent states) rather than raw conversation history. Agent transition prompts should encode the reasoning checkpoint, not
just the task state.

---

## Adaptive Thinking

Anthropic's adaptive thinking (`thinking: {type: "adaptive"}`) allows Claude to dynamically determine when and how much
to reason based on request complexity. Default on Mythos Preview; recommended on Opus 4.6 and Sonnet 4.6.

**Key differences from manual extended thinking:**

- No fixed token budget — Claude self-allocates based on `effort` parameter and task complexity
- Automatically enables interleaved thinking (reasoning between tool calls in a single turn)
- Previous assistant turns don't need to start with thinking blocks (more flexible conversation structure)
- Can skip thinking entirely for simple queries at lower effort levels
- Outperforms fixed-budget thinking on bimodal workloads and long-horizon agentic tasks

**Prompting implications:**

- Use `effort` parameter to control depth, not `budget_tokens`
- Do not pre-specify reasoning structure — the model infers appropriate depth
- Thinking triggering is promptable: add system prompt guidance if Claude thinks too often or too rarely
- For Sonnet 4.6: consider `medium` effort as default (balanced speed/cost/quality); `high` for complex reasoning

---

## Anti-Patterns

- **CoT on reasoning models**: "Let's think step by step" on o3 or Claude extended thinking wastes tokens and can
  degrade accuracy — the model already reasons internally
- **Few-shot CoT with inconsistent examples**: mismatched reasoning styles across demonstrations degrade performance
  more than zero-shot (Auto-CoT motivation for diversity)
- **High-temperature self-consistency on open-ended tasks**: majority vote is undefined when answers are free-form — use
  self-consistency only for discrete answer spaces
- **Full-generation grammar constraints**: constraining every token to valid syntax eliminates reasoning space; CRANE
  shows augmented grammars are required
- **Verbose tool descriptions for reasoning models**: burying key invocation criteria under general context reduces
  tool-call accuracy; put constraints first (OpenAI o3/o4-mini guide)
- **Long agent chains without handoff structure**: reasoning coherence degrades past 10 transitions without explicit
  coordination mechanisms (Dhrif et al.)

---

## Citations

- Wei et al. (2022) — Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. arXiv:2201.11903
- Kojima et al. (2022) — Large Language Models are Zero-Shot Reasoners. arXiv:2205.11916
- Zhang et al. (2022) — Automatic Chain of Thought Prompting in Large Language Models. arXiv:2210.03493
- Wang et al. (2022) — Self-Consistency Improves Chain of Thought Reasoning in Language Models. arXiv:2203.11171
- Yao et al. (2023) — Tree of Thoughts: Deliberate Problem Solving with Large Language Models. arXiv:2305.10601
- Long (2023) — Large Language Model Guided Tree-of-Thought. arXiv:2305.08291
- Zhang et al. (2023) — Multimodal Chain-of-Thought Reasoning in Language Models. arXiv:2302.00923
- Liu et al. (2023) — GraphPrompt: Unifying Pre-Training and Downstream Tasks for Graph Neural Networks.
  arXiv:2302.08043
- Banerjee et al. (2025) — CRANE: Reasoning with Constrained LLM Generation. arXiv:2502.09061 (ICML 2025)
- Dhrif et al. (2025) — Reasoning-Aware Prompt Orchestration. arXiv:2510.00326
