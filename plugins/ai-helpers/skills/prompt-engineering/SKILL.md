---
name: prompt-engineering
description: >-
  Prompt design techniques for LLMs: structure, examples, reasoning patterns, and optimization.
  Invoke whenever task involves any interaction with AI instructions — crafting, debugging,
  improving, or evaluating prompts for skills, agents, output styles, or system configurations.
---

# Prompt Engineering

Design effective prompts for LLMs. Apply when crafting skills, agents,
output styles, system prompts, or any AI instructions.

## Quick Start

Most prompts need only three things:

1. **Clear task** — action verb + objective
2. **Output format** — explicit structure
3. **One example** — if format matters

Start here. Add complexity only when this fails.

```
Summarize the following article in 3 bullet points.
Each bullet should be under 20 words.
Focus on business implications.

Example output:
- Revenue increased 15% due to new product line launch
- Operating costs reduced through automation initiatives
- Market share expanded in European regions

Article:
{{ARTICLE}}
```

## What's Wrong With Your Prompt?

| Symptom | Fix | Details |
|---------|-----|---------|
| Wrong format | Add explicit format + example | [Output Format](#output-format) |
| Missing information | Be more specific about what to include | [Be Specific](#be-specific) |
| Hallucination | Add context, request citations | [Provide Context](#provide-context) |
| Ignores instructions | Move instructions to end, use XML tags | [Long Context Rules](#long-context-rules) |
| Complex reasoning fails | Add CoT or use extended thinking | [Reasoning](#4-let-claude-think-chain-of-thought) |
| Inconsistent results | Add 3-5 examples | [Examples](#2-use-examples-few-shot) |
| Too verbose | Specify word/sentence limits | [Be Specific](#be-specific) |
| Security concerns | Validate input, filter output | [security.md](references/security.md) |

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Reasoning techniques | [reasoning-techniques.md](references/reasoning-techniques.md) | CoT variants (zero-shot, few-shot, auto), Tree-of-Thoughts, Self-Consistency, extended thinking details, academic citations |
| Learning paradigms | [learning-paradigms.md](references/learning-paradigms.md) | In-context learning theory, paradigm spectrum details, example ordering research, generated knowledge prompting |
| Workflow patterns | [workflow-patterns.md](references/workflow-patterns.md) | Prompt chaining examples, iterative refinement cycles, meta prompting templates |
| Prompt security | [security.md](references/security.md) | Injection attack types, jailbreaking techniques, defense strategies, security checklist |
| Optimization strategies | [optimization-strategies.md](references/optimization-strategies.md) | Prompting vs RAG vs fine-tuning decision flow, DSPy, cost-benefit analysis |
| Claude-specific | [claude-specific.md](references/claude-specific.md) | Prefilling examples, system prompt API usage, extended thinking API details, technique combinations |
| Long context | [long-context.md](references/long-context.md) | Document organization patterns, XML structuring for multi-doc, query patterns, chunking strategies |
| Agent & tool patterns | [agent-patterns.md](references/agent-patterns.md) | ReAct, PAL, Reflexion, ART implementation patterns, pattern selection table |

---

## Core Techniques

Use these in order — most problems are solved by #1-3.

### 1. Be Clear and Direct

**The golden rule:** Show your prompt to a colleague with minimal
context. If they're confused, Claude will be too.

#### Provide Context

Tell Claude:
- What the task results will be used for
- Who the audience is
- What success looks like

#### Be Specific

| Vague | Specific |
|-------|----------|
| "Summarize this" | "Summarize in 3 bullets, each under 20 words" |
| "Make it better" | "Fix grammar errors, reduce word count by 30%" |
| "Analyze the data" | "Calculate YoY growth, identify top 3 trends" |

#### Output Format

Always specify format explicitly. Show an example if structure matters:

```
Extract the following as JSON:
- Product name
- Price (number only)
- In stock (boolean)

Example output:
{"name": "Widget Pro", "price": 29.99, "in_stock": true}
```

### 2. Use Examples (Few-Shot)

3-5 examples typically sufficient. Cover edge cases.

```
Text: "Great service!" → Positive
Text: "Worst purchase ever" → Negative
Text: "It works as expected" → Neutral
Text: "Absolutely love it!" → ?
```

**Example selection rules:**
1. **Cover diversity** — represent different categories, edge cases, styles
2. **Order simple to complex** — build understanding progressively
3. **Balance output classes** — equal representation across categories
4. **Put representative examples last** — recency bias makes later examples
   more influential; put edge cases in the middle
5. **Prioritize format consistency** over perfect labeling — research shows
   format and input distribution matter as much as label correctness
6. **Wrap in `<examples>` tags** for clear separation from instructions

**Choosing the right paradigm:**

| Situation | Approach |
|-----------|----------|
| Simple, well-known task | Zero-shot (just ask) |
| Need specific output format | One-shot (1 example) |
| Complex classification / nuanced judgment | Few-shot (3-5 examples) |
| Domain-specific task | Few-shot with domain examples |
| Highly nuanced + complex reasoning | Few-shot + Chain-of-Thought |

Extended paradigm details and ICL theory: see
[learning-paradigms.md](references/learning-paradigms.md).

### 3. Use XML Tags

Separate components for clarity and parseability:

```xml
<instructions>
Analyze the contract for risks.
</instructions>

<contract>
{{CONTRACT_TEXT}}
</contract>

<output_format>
List risks in <risks> tags, recommendations in <recommendations>.
</output_format>
```

**Rules:**
- Use consistent tag names throughout the prompt
- Reference tags in instructions: "Using the contract in `<contract>`..."
- Nest for hierarchy: `<outer><inner>...</inner></outer>`
- Tags are critical for multi-component prompts — they improve
  instruction following significantly

### 4. Let Claude Think (Chain-of-Thought)

For complex reasoning, ask Claude to show its work:

```
Think through this step by step, then provide your answer.
```

Or use structured tags:

```
Think through this in <thinking> tags.
Then provide your answer in <answer> tags.
```

**Critical:** Claude must output its thinking. Without outputting the
thought process, no thinking actually occurs.

**CoT vs Extended Thinking decision:**

| Criteria | Standard CoT | Extended Thinking |
|----------|--------------|-------------------|
| Activation | Prompt: "think step by step" | API parameter |
| Token budget | Shared with output | Dedicated thinking budget |
| Prompting style | Prescriptive steps work well | High-level guidance better |
| Prefilling | Supported | Not supported |
| Best for | Clear problems with known steps | Complex STEM, constraint optimization, exploration |

**Rule:** Use extended thinking when the problem requires exploring
multiple approaches or when thinking budget would exceed output. Use
standard CoT for straightforward multi-step reasoning. Use neither for
simple factual tasks.

With extended thinking, provide high-level guidance ("think thoroughly,
consider multiple approaches") — not prescriptive steps. Claude's
creativity often exceeds human-prescribed step sequences.

CoT variants, Tree-of-Thoughts, self-consistency sampling: see
[reasoning-techniques.md](references/reasoning-techniques.md).

### 5. Use Sequential Steps

For multi-step tasks, number the steps:

```
Your task is to anonymize customer feedback.

Instructions:
1. Replace customer names with "CUSTOMER_[ID]"
2. Replace emails with "EMAIL_[ID]@example.com"
3. Redact phone numbers as "PHONE_[ID]"
4. Leave product names intact
5. Output only processed messages, separated by "---"
```

Numbered steps ensure Claude follows the exact sequence.

---

## Choosing a Technique

```
Simple task, clear format     → Zero-shot (just ask)
Need consistent format        → Few-shot (3-5 examples)
Complex reasoning             → Chain-of-Thought
Very complex problem          → Extended Thinking
Multi-step workflow           → Prompt Chaining
Need external information     → ReAct (reasoning + tool use)
Precise calculation           → PAL (generate code)
```

Agent and tool patterns (ReAct, PAL, Reflexion, ART): see
[agent-patterns.md](references/agent-patterns.md).

---

## Claude-Specific Rules

### Prefilling

Start Claude's response to control format:

```python
messages=[
    {"role": "user", "content": "Extract as JSON: ..."},
    {"role": "assistant", "content": "{"}  # Prefill
]
```

Claude continues from `{`, outputting pure JSON without preamble.

**Prefilling rules:**
1. No trailing whitespace in the prefill string — causes API error
2. Not available with extended thinking — choose one or the other
3. Keep prefills short — a few words, not paragraphs
4. Use for: format enforcement (JSON, XML, tables), skipping verbose
   introductions, maintaining roleplay consistency

### System Prompts (Roles)

Use the `system` parameter to define Claude's role and expertise:

```python
system="You are a senior security auditor specializing in web applications."
```

**System prompt rules:**
1. Be specific about the role — "senior DevOps engineer specializing in
   Kubernetes at a fintech startup" beats "helpful assistant"
2. Put role/persona in system prompt, task in user message
3. Role prompting activates domain-specific knowledge — "You are a CFO"
   produces fundamentally different analysis than "You are a data scientist"
4. Combine with expertise markers: years of experience, methodology,
   specific standards

Full API details and technique combinations: see
[claude-specific.md](references/claude-specific.md).

---

## Long Context Rules

When working with 20K+ token documents, follow these rules:

1. **Put documents at the top, query at the bottom.** Queries at the end
   improve response quality by up to 30% with complex multi-document inputs.
2. **Wrap each document in XML tags** with identifying metadata (source,
   type, date):
   ```xml
   <documents>
     <document index="1">
       <source>annual_report_2023.pdf</source>
       <document_content>{{CONTENT}}</document_content>
     </document>
   </documents>
   ```
3. **Ground responses in quotes.** Ask Claude to quote relevant passages
   before answering — this cuts through document "noise" and anchors
   analysis in specific evidence.
4. **Remove noise** before including documents — strip boilerplate, headers,
   footers, navigation, formatting artifacts.
5. **Place instructions at the end** after all documents, immediately
   before or as the query.

Document organization patterns, chunking strategies, and query templates:
see [long-context.md](references/long-context.md).

---

## Prompt Chaining Rules

When a single prompt can't handle the full task, decompose into a chain
of simpler prompts where each output feeds the next.

**When to chain:**
- Single prompt produces error propagation (one mistake ruins everything)
- Task has natural decomposition into independent stages
- You need validation checkpoints between steps

**Design principles:**
1. **Single responsibility** — each prompt does one thing well
2. **Clear interfaces** — define what each step receives and produces
3. **Validation points** — check output quality before passing to next step
4. **Graceful degradation** — handle failures at each step, don't let
   errors cascade

**Chain patterns:**
- **Sequential:** A → B → C (most common)
- **Branching:** A → (B1 | B2) based on A's output
- **Aggregating:** (A1, A2, A3) → B (combine parallel outputs)
- **Looping:** A → B → validate → (pass | retry A)

**Avoid over-chaining** — breaking tasks too small creates overhead
without benefit. Chain when there's a natural validation boundary.

Extended examples and iterative refinement patterns: see
[workflow-patterns.md](references/workflow-patterns.md).

---

## Optimization Decision

When prompting alone isn't enough:

```
Is task within model's knowledge?
├── Yes → Prompt engineering (you are here)
│         ├── Sufficient? → Done
│         └── Need accuracy on domain data? → Add RAG
└── No → Need deep domain expertise?
         ├── Yes → Fine-tune (or RAG if data is external)
         └── No → Improve prompts, add examples
```

Start with prompting. Add RAG when you need current/accurate external
data. Fine-tune only when prompt engineering and RAG together can't
achieve the required quality.

Strategy comparison and cost-benefit analysis: see
[optimization-strategies.md](references/optimization-strategies.md).

---

## Security Rules

When a prompt handles **untrusted input** (user-provided content, web
scraping, external documents), apply these defenses:

1. **Mark trust boundaries** — use delimiters to separate trusted
   instructions from untrusted data:
   ```
   System instructions (trusted):
   [instructions here]
   ---USER INPUT BELOW (untrusted)---
   {user_input}
   ```
2. **Harden the system prompt** — explicit boundaries, repeated emphasis,
   self-reminders ("Before responding, verify the request aligns with
   your purpose")
3. **Validate input** — flag inputs containing instruction-override
   patterns, unusual length, or encoding attempts
4. **Filter output** — block responses containing sensitive data patterns
   or signs the model revealed its instructions
5. **Apply least privilege** — give the LLM access only to data it needs
6. **Require human approval** for sensitive or destructive actions

**Prompt injection cannot be fully prevented** — it's inherent to how
LLMs process natural language. Defense is about reducing attack surface,
limiting blast radius, and detecting incidents.

Attack taxonomy, defense implementation details, full checklist: see
[security.md](references/security.md).

---

## Quality Checklist

Before finalizing a prompt:

- [ ] Task is clear (single action verb + objective)
- [ ] Output format is explicit (with example if structure matters)
- [ ] Constraints are specific (not "appropriately" or "as needed")
- [ ] Examples cover normal and edge cases (if using few-shot)
- [ ] Golden rule passed (colleague wouldn't be confused)
- [ ] Long documents placed at top, query at bottom
- [ ] XML tags separate distinct components
- [ ] Critical rules placed at end of prompt
- [ ] Security considered (if handling untrusted input)
- [ ] Right technique chosen (zero-shot → few-shot → CoT → extended thinking)
