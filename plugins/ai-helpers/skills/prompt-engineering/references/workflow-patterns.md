# Workflow Patterns

Covers multi-step prompt architectures: chaining, refinement cycles, meta prompting, and automated prompt optimization.
For single-prompt structure and in-prompt reasoning (CoT, ToT), see `reasoning-techniques.md`.

---

## Prompt Chaining

Break complex tasks into sequential sub-prompts where each output feeds the next as input. Enables reliability and
debuggability improvements impossible in a single monolithic prompt.

**Why chain instead of single-prompt:**

- Easier to isolate and fix failures in individual stages
- Each stage can use a different model, temperature, or context
- Intermediate outputs are auditable and can be human-reviewed
- Enables branching and conditional logic between stages

### Chain Topologies

**Sequential** — linear pipeline, each step depends on prior output

- Use when: task has distinct transformation phases (extract → filter → format)
- Example: extract relevant quotes → generate answer from quotes (Anthropic's document QA pattern)
- Risk: error propagation — a bad output in step N corrupts all downstream steps

**Branching** — output of one step routes to one of several downstream prompts

- Use when: task type or content determines which sub-task to execute
- Example: classify document type → route to domain-specific extraction prompt
- Implementation: classify in step 1, use conditional logic in code to select prompt for step 2

**Aggregating (fan-in)** — multiple parallel prompts whose outputs merge into a single prompt

- Use when: different perspectives or sub-tasks must be synthesized
- Example: run three domain-expert prompts in parallel → merge-and-reconcile prompt
- Risk: aggregator prompt must handle inconsistent or conflicting inputs gracefully

**Looping** — output feeds back as input to the same or earlier prompt until termination condition met

- Use when: refinement converges iteratively (e.g., code that must pass tests, plan that must satisfy constraints)
- Termination: check output against acceptance criteria in code; do not rely on model to self-terminate
- Risk: infinite loops — always impose a hard iteration cap (3–5 is typical)

### Implementation Rules

- Pass full context explicitly at each step — models have no memory of prior prompts in a chain
- Strip or summarize intermediate outputs before passing downstream; avoid bloating later-stage context
- Validate output schema at each handoff before passing to next step
- Keep each prompt in a chain focused on one transformation; multi-tasking within a chain step defeats the purpose

---

## Iterative Refinement Cycles

A specialized loop pattern where each cycle evaluates the prior output and produces an improved version.

**Basic cycle structure:**

1. **Generate** — produce initial output from task prompt
2. **Critique** — separate prompt evaluates output against explicit criteria
3. **Revise** — generation prompt receives original task + critique + prior output, produces improved version
4. Repeat until critique passes or iteration cap hit

**Critique prompt requirements:**

- State evaluation criteria explicitly as a checklist or rubric — vague criteria produce vague critiques
- Output structured feedback (pass/fail per criterion + explanation) so the revision step can act on specifics
- Optionally output a binary "done" signal to terminate the loop

**Refinement patterns:**

- Self-critique: same model critiques its own output — cheap but prone to blind spots
- Cross-critique: different model or different temperature/persona critiques — catches more failure modes
- Rubric-anchored: critique compares output to a canonical example or scoring rubric
- Human-in-the-loop: critique step surfaces to user for approval before proceeding

**When refinement adds value:** ambiguous tasks where correctness can't be checked programmatically (writing quality,
reasoning validity, design decisions)

**When it doesn't:** tasks with deterministic correct answers — verify programmatically instead of using an LLM judge

---

## Meta Prompting

Zhang et al. (2024, arXiv:2311.11482) — focuses on structure and syntax of tasks rather than content specifics.

**Core idea:** provide abstract structural templates (the _form_ of a solution) rather than content-specific examples
(the _substance_ of a solution).

**Key characteristics:**

- Structure-oriented: defines the shape of the expected response, not its content
- Abstract examples: illustrates problem/solution structure without domain-specific details
- Zero-shot aligned: minimizes influence of specific examples, closer to zero-shot than few-shot

**Advantages over few-shot prompting:**

- Token efficiency — structural templates are shorter than content-rich examples
- Fair comparison — removes domain-example bias when evaluating model capabilities
- Generalization — same template applies across problem instances in a domain

**Best fit:**

- Complex reasoning and math where solution structure is uniform across instances
- Coding challenges where the pattern (read input → transform → output) is consistent
- Theoretical queries where the argument form matters more than any specific example

**Limitation:** assumes the model has innate task knowledge. Performance degrades on genuinely novel tasks where a
structural scaffold provides no additional leverage — use content-rich few-shot in those cases.

**Vs. few-shot:** few-shot is content-driven (here are worked examples); meta prompting is structure-driven (here is the
form answers must take). Use meta prompting when examples are expensive to write or when you want to test model
capability without example contamination.

---

## Automatic Prompt Engineer (APE)

Zhou et al. (2022, arXiv:2211.01910) — frame instruction generation as black-box optimization: use an LLM to generate
candidate instructions, evaluate them, select the best.

**Two-phase process:**

1. **Generate** — give the LLM input/output demonstrations; ask it to produce candidate instruction phrasings
2. **Select** — execute each candidate instruction on a target model; score outputs; keep highest-scoring instruction

**Key finding:** APE-discovered zero-shot CoT prompt ("Let's work this out in a step by step way to be sure we have the
right answer.") outperforms human-engineered "Let's think step by step" on MultiArith and GSM8K.

**Practical application:**

- Use APE when you have labeled evaluation examples but are unsure which instruction phrasing works best
- Requires: a scoring function (automated metric or LLM judge), a generation model, a target model
- Generation and target model can be the same — the generate/evaluate loop still adds value

**Related approaches** (from Zhou et al. survey and subsequent work):

- OPRO (arXiv:2309.03409) — uses LLMs to optimize prompts iteratively, including discovered phrases like "Take a deep
  breath" that improve math performance
- Prompt-OIRL (arXiv:2309.06553) — offline inverse RL for query-dependent prompt generation
- AutoPrompt (arXiv:2010.15980) — gradient-guided search for automatic prompt creation across diverse tasks

---

## Automated Prompt Optimization (Survey Perspective)

Based on: arXiv:2502.11560 — "A Survey of Automatic Prompt Engineering: An Optimization Perspective" (Li et al., 2025)

**Unified framing:** APE is a maximization problem over a prompt space. Methods differ by what they optimize and how.

**Optimization variables:**

- **Instructions** — the natural-language directive text (what APE and OPRO optimize)
- **Soft prompts** — continuous embedding vectors prepended to input (Prefix Tuning, Prompt Tuning)
- **Exemplars** — which few-shot examples to include and in what order

**Optimization methods by mechanism:**

- FM-based: LLM generates, evaluates, and refines candidate prompts using its own capabilities
- Evolutionary: mutation and selection of prompt populations (no gradient required)
- Gradient-based: requires differentiable access to model (soft prompts only — not applicable to black-box APIs)
- Reinforcement learning: reward signal from task metric guides prompt policy

**Prompt space types:**

- Discrete: natural-language instructions — interpretable, transferable, no model access required
- Continuous: embedding vectors — higher expressiveness, requires model internals, not human-readable
- Hybrid: discrete structure with continuous components

**Practitioner guidance:**

- Black-box API (GPT-4, Claude): only discrete optimization is available — use FM-based or evolutionary methods
- Open-weight model with gradient access: soft prompt tuning is viable for narrow, high-volume tasks
- Labeled eval set is prerequisite for all automated approaches — without it, optimization has no signal
- Score variance is a problem: evaluation noise causes optimization to chase noise; use large eval sets or aggregate
  across multiple runs

---

## Choosing a Pattern

**Sequential chaining:** Use for: multi-phase transformations with distinct stages Avoid when: stages aren't separable
or intermediate outputs can't be validated

**Branching:** Use for: task-type routing, conditional processing Avoid when: classification boundary is ambiguous and
misrouting is costly

**Aggregating (fan-in):** Use for: multi-perspective synthesis, ensemble reasoning Avoid when: aggregator can't handle
conflicting inputs

**Looping/refinement:** Use for: quality-sensitive outputs, code that must pass tests Avoid when: acceptance criteria
can't be expressed programmatically

**Meta prompting:** Use for: uniform-structure tasks, token budget constraints, capability testing Avoid when: task is
novel or requires content-rich examples

**APE/automated optimization:** Use for: high-volume prompts where even small improvements compound; when you have
labeled eval data Avoid when: no eval set exists; one-off prompts where optimization cost exceeds benefit
