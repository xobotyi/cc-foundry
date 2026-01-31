# Learning Paradigms

How models learn from examples within prompts — the spectrum from
zero examples to many.

## Contents

- [The Paradigm Spectrum](#the-paradigm-spectrum)
- [Zero-Shot Prompting](#zero-shot-prompting)
- [One-Shot Prompting](#one-shot-prompting)
- [Few-Shot Prompting](#few-shot-prompting)
- [In-Context Learning (ICL)](#in-context-learning-icl)
- [Generated Knowledge Prompting](#generated-knowledge-prompting)
- [Practical Guidelines](#practical-guidelines)
- [References](#references)

## The Paradigm Spectrum

```
Zero-shot → One-shot → Few-shot → Many-shot
   ↓           ↓          ↓           ↓
No examples  1 example  3-5 examples  Many examples
```

All operate through **in-context learning (ICL)** — the model adapts to
the task from the prompt alone, without parameter updates.

---

## Zero-Shot Prompting

Task description only. No examples. Relies entirely on pre-trained
knowledge.

```
Classify the sentiment of this review as positive, negative,
or neutral: "The product arrived damaged but customer service
was helpful."
```

### When It Works

- Task is common (sentiment, translation, summarization)
- Instructions are unambiguous
- Output format is standard
- Model is large enough to have learned the pattern

### When It Fails

- Novel or domain-specific tasks
- Precise output format required
- Task requires nuanced judgment
- Smaller models with less pre-training

### Strengthening Zero-Shot

**Instruction clarity:** Be explicit about format, constraints, scope.

**Role priming:** "You are an expert legal analyst..."

**Output anchoring:** "Respond with exactly one word: positive,
negative, or neutral."

---

## One-Shot Prompting

Single example demonstrates the pattern.

```
Review: "Excellent quality, fast shipping" → Positive
Review: "Product broke after one week" → ?
```

### When to Use

- Format demonstration needed
- Task is clear but output style matters
- Zero-shot produces wrong format
- Adding more examples has diminishing returns

### Limitations

- Single example may not cover edge cases
- Model might overfit to the specific example
- Doesn't establish robust pattern for complex tasks

---

## Few-Shot Prompting

Multiple examples (typically 3-5) establish the pattern.

```
Text: "I love this!" → Positive
Text: "Terrible experience" → Negative
Text: "It's okay I guess" → Neutral
Text: "Best purchase ever!" → ?
```

### Why Few-Shot Works

The model recognizes the input→output mapping pattern and applies it
to new inputs. This is **in-context learning** — temporary task
adaptation without weight updates.

**Key research insight (Min et al., 2022):** Format and distribution
matter as much as — sometimes more than — label correctness:
- Label space (the set of possible outputs) matters
- Input distribution (what examples look like) matters
- Consistent format helps even with random labels
- True labels are less important than having any labels

This means: prioritize format consistency and representative examples
over perfect labeling for every edge case.

### Example Selection Strategies

**Diversity:** Cover different categories, edge cases, styles.

**Similarity:** Select examples semantically close to expected inputs
(use embeddings for matching).

**Difficulty progression:** Simple → moderate → complex ordering
helps model build understanding.

**Balance:** Equal representation across output classes.

### Example Ordering

Order affects performance:
- Recency bias: later examples weighted more
- Primacy effect: first examples set expectations

**Best practice:** Put most representative examples last, edge cases
in the middle.

### Optimal Example Count

- 3-5 examples: typical sweet spot
- More isn't always better (context window cost)
- Diminishing returns after 5-7 for most tasks
- Complex tasks may need more

---

## In-Context Learning (ICL)

The mechanism underlying all shot paradigms. Model adapts to task
from prompt examples without updating parameters.

### How ICL Works

Two leading theories:

**Bayesian Inference View:**
Model infers a latent "task concept" from examples. More examples →
higher confidence in task understanding.

**Implicit Gradient Descent:**
Transformer attention simulates learning — behaves "as if" it's
updating weights based on examples, though parameters stay fixed.

### ICL vs Traditional Learning

| Aspect | Traditional ML | In-Context Learning |
|--------|---------------|---------------------|
| Training data | Separate phase | In the prompt |
| Parameters | Updated | Fixed |
| Generalization | From training | From pre-training + prompt |
| Cost | Training compute | Inference tokens |

### Factors Affecting ICL

**Model scale:** Larger models exhibit stronger ICL.

**Pre-training data:** ICL works because similar patterns were seen
during training.

**Prompt format:** Must match patterns the model learned.

**Example quality:** Relevant, clear, correctly labeled examples.

### Context Engineering

Beyond static prompts — dynamically assembling optimal context at
runtime:

1. **Retrieval:** Pull relevant examples from a database
2. **Filtering:** Remove low-quality or irrelevant content
3. **Ordering:** Arrange for optimal comprehension
4. **Formatting:** Structure for model's learned patterns

This shifts from "write a good prompt" to "build a system that
constructs good prompts."

---

## Generated Knowledge Prompting

When you lack examples but need grounding, generate relevant knowledge
first, then answer using that knowledge.

### The Pattern

```
Step 1: "Generate 3 facts relevant to: [question]"
→ Model produces relevant background knowledge

Step 2: "Using these facts, answer: [question]"
→ Model answers grounded in generated knowledge
```

### Example

```
Question: Part of golf is trying to get a higher point total than
others. Yes or No?

Step 1 (knowledge):
- Golf scoring counts strokes (fewer is better)
- The player with the lowest score wins
- Points are not accumulated; strokes are minimized

Step 2 (answer):
Using these facts, the answer is No — golf rewards lowest score,
not highest.
```

### When to Use

**Ideal for:**
- Commonsense reasoning questions
- When RAG isn't available
- Tasks requiring world knowledge activation

**Limitation:** Generated knowledge may be incorrect (model
hallucination). Works best when model has reliable domain knowledge.

See [agent-patterns.md](agent-patterns.md) for more on knowledge
generation techniques.

---

## Practical Guidelines

### Choosing a Paradigm

| Situation | Recommendation |
|-----------|----------------|
| Simple, well-known task | Zero-shot |
| Need specific format | One-shot |
| Complex classification | Few-shot (3-5) |
| Domain-specific task | Few-shot with domain examples |
| Highly nuanced judgment | Few-shot + CoT |

### Common Mistakes

**Too many examples:** Wastes context, diminishing returns.

**Unrepresentative examples:** Model learns wrong pattern.

**Inconsistent format:** Confuses the mapping.

**Wrong difficulty curve:** Complex examples first overwhelms.

### Quality Checklist

- [ ] Examples are correctly labeled
- [ ] Format is consistent across all examples
- [ ] Edge cases are represented
- [ ] Examples are relevant to actual use case
- [ ] Output format is clear from examples

---

## References

- Few-shot emergence: Brown et al., 2020 — [arXiv:2005.14165](https://arxiv.org/abs/2005.14165)
- Format > labels finding: Min et al., 2022 — [arXiv:2202.12837](https://arxiv.org/abs/2202.12837)
- Instruction tuning: Wei et al., 2022 — [arXiv:2109.01652](https://arxiv.org/abs/2109.01652)
