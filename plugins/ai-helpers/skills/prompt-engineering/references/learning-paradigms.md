# Learning Paradigms

In-context learning (ICL) and related techniques — how models learn from demonstrations without weight updates.

---

## Theoretical Foundation

**What prompting actually does (Kim et al., arXiv:2512.12688):**

- A fixed Transformer backbone can approximate a broad class of target behaviors via prompts alone
- Attention performs selective routing from prompt memory (the demonstrations)
- FFN performs local arithmetic conditioned on retrieved fragments
- Depth-wise stacking composes local updates into multi-step computation
- Prompt = externally injected program; backbone = executor

**Mechanism:** The prompt switches model behavior without changing weights. This is not retrieval — it is computation
redirection. Increasing prompt length/precision expands the function space reachable without fine-tuning.

**Practical implication:** ICL works because the model is not "following instructions" in a shallow sense — it is
executing a compressed program. Demonstrations are code, not hints.

---

## Zero-Shot Prompting

Model performs a task with no examples, relying entirely on pre-trained knowledge and instruction tuning.

**When it works:**

- Tasks the model has seen extensively during training (classification, translation, summarization)
- Simple, well-defined operations with unambiguous output format

**When it fails:**

- Novel task formats the model hasn't seen
- Multi-step reasoning requiring intermediate steps
- Tasks requiring specific domain knowledge not in training data

**Enabling factors (Wei et al., 2022):**

- Instruction tuning on datasets described via instructions dramatically improves zero-shot capability
- RLHF (Christiano et al., 2017) further aligns zero-shot behavior to human preferences
- Scale: zero-shot capability emerges with model size (Kaplan et al., 2020)

**Escalation rule:** When zero-shot fails, move to few-shot before reaching for fine-tuning.

---

## Few-Shot Prompting

Provide k input-output demonstrations in the prompt to condition the model's behavior. First appeared at sufficient
model scale (Kaplan et al., 2020; Touvron et al., 2023). Demonstrated systematically by Brown et al. (2020) with GPT-3.

### What demonstrations actually teach (Min et al., 2022)

- **Label space:** Which output categories are valid — more important than correct labels per example
- **Input distribution:** What kinds of inputs are relevant to the task
- **Output format:** The structure and style of acceptable answers
- **Correct label mapping:** Least important — random labels still outperform no labels

**Key finding:** Format consistency matters more than label accuracy. A well-formatted few-shot prompt with random
labels outperforms a zero-shot prompt.

### Shot count guidance

- `k` — number of demonstrations to provide
- 1-shot — sufficient for simple format learning
- 3–5 shot — standard for most tasks
- 10+ shot — complex tasks, multi-class classification
- Diminishing returns after ~10 for most tasks; cost scales with context length

### Example selection

- **Label balance:** Include examples from all output classes proportionally (Min et al., 2022 — true label distribution
  beats uniform)
- **Input diversity:** Vary surface form, not just class
- **Difficulty gradient:** Start simple, increase complexity (ordering effect — later examples have stronger priming)
- **Relevance:** Examples semantically similar to the test input outperform random selection

### Format effects

- Consistent delimiters between input and output across all examples
- Same output format in every demonstration — model extrapolates the pattern
- Include a final prompt ending mid-example to force completion in the established format

### Hard limits

- Few-shot cannot fix multi-step arithmetic or symbolic reasoning — the model tries to pattern-match the answer, not
  execute the steps
- Chain-of-thought (see reasoning-techniques.md) is the correct escalation path for reasoning failures
- Fine-tuning is the correct escalation path when the task is fundamentally out-of-distribution

---

## Generated Knowledge Prompting

**Source:** Liu et al. (2022), arXiv:2110.08387

Two-phase technique: generate relevant knowledge first, then use it in the prediction prompt.

**Why:** LLMs make factual errors on commonsense reasoning tasks because the relevant world knowledge is not activated
by the task prompt alone. Explicit generation forces retrieval before commitment.

**Protocol:**

1. Generate multiple knowledge statements about the question domain (without asking for the answer)
2. For each knowledge statement, construct a separate prediction prompt that includes the statement
3. Select the answer with highest confidence across predictions (or use voting)

**Prompt structure for phase 1:**

```
Generate some knowledge about [topic]:
```

Run this multiple times or with `k` continuations to get diverse knowledge.

**Prompt structure for phase 2:**

```
[Knowledge statement]

Question: [original question]
Answer:
```

**When to use:**

- Commonsense reasoning tasks (sport rules, physical world properties, social norms)
- Factual QA where the answer depends on implicit background knowledge
- Tasks where the model gives confident wrong answers — a sign knowledge is missing from activation

**When not to use:**

- Tasks requiring external, verifiable facts (generated "knowledge" may be hallucinated)
- Simple classification where knowledge injection adds noise

---

## Active Prompting

**Source:** Diao et al. (2023), arXiv:2302.12246

Addresses the weakness of fixed exemplar sets in CoT prompting — exemplars chosen by researchers may not be the hardest
or most informative for the model.

**Protocol:**

1. Query the LLM on a set of training questions with or without initial CoT examples, generating k answers per question
2. Compute uncertainty per question using disagreement across k answers (high disagreement = high uncertainty)
3. Select the most uncertain questions for human annotation with CoT reasoning
4. Use the newly annotated exemplars for inference

**Why disagreement works as an uncertainty signal:** If the model produces consistent answers across k samples, it has
strong priors — human annotation adds little. If answers vary widely, the model is confused — this is where exemplar
quality matters most.

**Parameters:**

- `k` — number of samples per question (higher k = better uncertainty estimate, higher cost)
- selection budget — number of questions to send for human annotation
- annotation format — must include explicit CoT reasoning, not just the answer

**When to use:**

- You have a labeled training set and annotation budget
- Off-the-shelf CoT exemplars perform inconsistently across question types
- You want the best few-shot set for a specific task, not a general one

---

## Directional Stimulus Prompting

**Source:** Li et al. (2023), arXiv:2302.11520

A hybrid approach: train a small, tuneable policy LM to generate hints/stimuli that guide a large, frozen black-box LLM.

**Architecture:**

- Policy LM — small, fine-tuned with RL to generate optimal hints for a given input
- Executor LLM — large, frozen, receives the original input plus the policy-generated hint
- The hint is a directional stimulus: a keyword, constraint, or partial answer that steers generation

**Why a separate policy LM:**

- The large LLM cannot be fine-tuned (cost, access)
- Prompt engineering by hand does not scale to task-specific optimization
- RL over the policy LM optimizes hint quality directly against task reward

**Typical use case:** Summarization — the policy LM generates keywords that should appear in the summary; the executor
LLM produces the summary conditioned on those keywords.

**Practical applicability:** Requires RL training infrastructure and task-specific reward. Not applicable to one-off
prompting — relevant when building a production pipeline around a fixed API model.

---

## Paradigm Selection Guide

- **Zero-shot** — default starting point; use when task is standard and model is instruction-tuned
- **Few-shot** — when zero-shot output format or quality is wrong; add 3–5 representative examples
- **Generated knowledge** — when model gives confidently wrong factual/commonsense answers
- **Active prompting** — when you have annotation budget and fixed exemplars underperform across question types
- **Directional stimulus** — when you have RL infrastructure and a frozen production model to steer

**Escalation path:**

```
zero-shot → few-shot → generated knowledge / active prompting → CoT (see reasoning-techniques) → fine-tuning
```

Do not skip steps. Each escalation adds cost and complexity; validate that the simpler approach actually fails before
escalating.
