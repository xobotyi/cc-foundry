# Optimization Strategies

Approaches to improving LLM performance for specific use cases.

## Contents

- [The Three Pillars](#the-three-pillars)
- [Prompt Engineering](#prompt-engineering)
- [Retrieval-Augmented Generation (RAG)](#retrieval-augmented-generation-rag)
- [Fine-Tuning](#fine-tuning)
- [DSPy: Programmatic Optimization](#dspy-programmatic-optimization)
- [Choosing a Strategy](#choosing-a-strategy)

## The Three Pillars

| Method | What It Does | Cost | When to Use |
|--------|--------------|------|-------------|
| Prompt Engineering | Craft better inputs | Low | Always (foundation) |
| RAG | Add external knowledge | Medium | Need current/accurate data |
| Fine-tuning | Train on domain data | High | Need deep domain expertise |

These aren't mutually exclusive — combine for best results.

---

## Prompt Engineering

Optimize inputs to guide model behavior without changing the model.

### Strengths

- **Fast iteration:** Change prompt, see results immediately
- **No infrastructure:** Works with any model API
- **Flexible:** Adapt to new tasks without training
- **Low cost:** Only inference tokens

### Limitations

- Can't teach truly new knowledge
- Constrained by context window
- Can't change model's fundamental capabilities
- Quality depends on engineering skill

### When Sufficient

- Task is within model's pre-trained knowledge
- Clear instructions can guide behavior
- Output format is the main challenge
- Rapid experimentation needed

---

## Retrieval-Augmented Generation (RAG)

Connect the LLM to external knowledge bases. Retrieve relevant
information and include it in the prompt context.

### How RAG Works

```
1. User query arrives
2. Embed query into vector representation
3. Search vector database for similar content
4. Retrieve top-k relevant documents
5. Construct prompt: instructions + retrieved context + query
6. LLM generates response grounded in retrieved information
```

### RAG Architecture

```
[User Query]
     ↓
[Embedding Model] → [Vector DB Search]
     ↓                    ↓
[Query Vector] ←→ [Similar Documents]
     ↓
[Prompt Assembly: System + Context + Query]
     ↓
[LLM Generation]
     ↓
[Response]
```

### Strengths

- **Current information:** Database can be updated in real-time
- **Accuracy:** Grounds responses in actual documents
- **Transparency:** Can cite sources
- **No retraining:** Add knowledge without fine-tuning

### Limitations

- Retrieval quality limits generation quality
- Context window constrains how much can be included
- Infrastructure complexity (vector DB, embeddings, pipelines)
- Latency from retrieval step

### When to Use RAG

- Need up-to-date information (news, documentation)
- Accuracy matters more than creativity
- Want to cite sources
- Knowledge base changes frequently
- Can't afford fine-tuning compute

### RAG Best Practices

**Chunking:** Split documents into right-sized chunks for retrieval.
Too small loses context; too large wastes tokens.

**Embedding quality:** Use good embedding models. Poor embeddings →
poor retrieval → poor generation.

**Reranking:** After initial retrieval, rerank results for relevance
before including in prompt.

**Context formatting:** Structure retrieved content clearly:
```
Based on the following information:
---
[Source 1: Title]
[Content]
---
[Source 2: Title]
[Content]
---
Answer the user's question: [query]
```

---

## Fine-Tuning

Train the model on domain-specific data to permanently update its
parameters.

### How Fine-Tuning Works

```
1. Prepare labeled dataset (input/output pairs)
2. Continue training the model on this data
3. Model parameters update to fit new patterns
4. Deploy fine-tuned model
```

### Types

**Full fine-tuning:** Update all model parameters.
Expensive but maximum adaptation.

**Parameter-Efficient Fine-Tuning (PEFT):** Update only a subset
of parameters (LoRA, adapters, prefix tuning).
Lower cost, often comparable results.

### Strengths

- Deep domain expertise embedded in model
- Consistent behavior without prompt engineering
- Can learn truly new patterns
- Lower inference cost (no retrieval, shorter prompts)

### Limitations

- Expensive compute for training
- Requires quality labeled data
- Risk of catastrophic forgetting
- Model becomes static (doesn't update with new info)
- Can overfit to training data

### When to Use Fine-Tuning

- Need specialized domain knowledge (medical, legal)
- Consistent style/format critical
- High volume inference (amortize training cost)
- Task requires capabilities prompt engineering can't achieve
- Have sufficient quality training data

---

## DSPy: Programmatic Optimization

Framework that replaces manual prompt engineering with programmatic
optimization.

### Core Idea

Instead of writing prompts, define:
- **Signatures:** Input/output specifications
- **Modules:** Processing steps
- **Metrics:** How to evaluate quality

DSPy automatically generates and tests prompts to optimize the metric.

### How It Works

```python
# Define signature
class Summarize(dspy.Signature):
    """Summarize the document."""
    document = dspy.InputField()
    summary = dspy.OutputField(desc="2-3 sentence summary")

# Define module
summarizer = dspy.ChainOfThought(Summarize)

# Compile with optimizer (tests many prompt variations)
compiled = optimizer.compile(summarizer, trainset=examples)

# Use
result = compiled(document="...")
```

### Benefits

- **Automatic optimization:** Tries many prompt variants
- **Metric-driven:** Optimizes for measurable outcomes
- **Model-agnostic:** Re-compile when switching models
- **Reproducible:** Programmatic, not ad-hoc

### When to Consider DSPy

- Building production pipelines
- Need systematic optimization
- Multiple prompt steps to optimize
- Want to reduce manual prompt tuning
- Changing models frequently

---

## Choosing a Strategy

### Decision Flow

```
Is task within model's knowledge?
├── Yes → Try prompt engineering first
│         ├── Sufficient? → Done
│         └── Need accuracy? → Add RAG
└── No → Need domain expertise?
         ├── Yes → Fine-tune (or RAG if data is external)
         └── No → Improve prompts, add examples
```

### Hybrid Approaches

**Prompt + RAG:** Most common. Good prompts + relevant context.

**Fine-tuned + RAG:** Domain-adapted model with current knowledge.

**Fine-tuned + Prompt Engineering:** Even fine-tuned models need
good prompts for best results.

### Cost-Benefit Analysis

| Approach | Setup Cost | Ongoing Cost | Flexibility | Quality Ceiling |
|----------|------------|--------------|-------------|-----------------|
| Prompt only | Low | Low | High | Medium |
| + RAG | Medium | Medium | Medium | High |
| + Fine-tuning | High | Low | Low | Highest |
| All three | Highest | Medium | Medium | Highest |

Start simple, add complexity only when needed.
