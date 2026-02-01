---
name: prompt-engineering
description: >-
  Prompt design for any AI context. Invoke for skills, agents,
  output styles, system prompts, or any LLM instructions.
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
| Wrong format | Add explicit format + example | [below](#output-format) |
| Missing information | Be more specific about what to include | [below](#be-specific) |
| Hallucination | Add context, request citations | [below](#provide-context) |
| Ignores instructions | Move instructions to end, use XML tags | [long-context.md](references/long-context.md) |
| Complex reasoning fails | Add "Think step by step" | [reasoning-techniques.md](references/reasoning-techniques.md) |
| Inconsistent results | Add 3-5 examples | [learning-paradigms.md](references/learning-paradigms.md) |
| Too verbose | Specify word/sentence limits | [below](#be-specific) |
| Security concerns | Validate input, filter output | [security.md](references/security.md) |

## Deep Dive References

| Topic | When to Read |
|-------|--------------|
| [reasoning-techniques.md](references/reasoning-techniques.md) | Multi-step reasoning, math, logic, CoT variants |
| [learning-paradigms.md](references/learning-paradigms.md) | Zero/few-shot design, example selection |
| [workflow-patterns.md](references/workflow-patterns.md) | Multi-prompt pipelines, iterative refinement |
| [security.md](references/security.md) | Untrusted input, prompt injection defense |
| [optimization-strategies.md](references/optimization-strategies.md) | Prompting vs RAG vs fine-tuning |
| [claude-specific.md](references/claude-specific.md) | Prefilling, extended thinking, system prompts |
| [long-context.md](references/long-context.md) | 20K+ token documents |
| [agent-patterns.md](references/agent-patterns.md) | Tool use, ReAct, PAL patterns |

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

**Tips:**
- Order: simple → complex
- Diverse, representative examples
- Wrap in `<examples>` tags for clarity

See [learning-paradigms.md](references/learning-paradigms.md) for
example selection strategies.

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

**Best practices:**
- Consistent tag names throughout
- Reference tags in instructions: "Using the contract in <contract>..."
- Nest for hierarchy: `<outer><inner>...</inner></outer>`

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

See [reasoning-techniques.md](references/reasoning-techniques.md) for
CoT variants, Tree-of-Thoughts, and extended thinking.

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

Numbered steps ensure Claude follows exact sequence.

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

For advanced patterns, see [agent-patterns.md](references/agent-patterns.md).

---

## Claude-Specific Features

### Prefilling

Start Claude's response to control format:

```python
messages=[
    {"role": "user", "content": "Extract as JSON: ..."},
    {"role": "assistant", "content": "{"}  # Prefill
]
```

Claude continues from `{`, outputting pure JSON without preamble.

### System Prompts (Roles)

Use roles for domain expertise:

```python
system="You are a senior security auditor specializing in web applications."
```

Role prompting activates domain-specific knowledge and reasoning patterns.

### Extended Thinking

For very complex problems, use extended thinking mode (API parameter)
instead of standard CoT. Use high-level guidance, not prescriptive steps.

See [claude-specific.md](references/claude-specific.md) for details.

---

## Quality Checklist

Before finalizing a prompt:

- [ ] Task is clear (single action verb)
- [ ] Output format is explicit
- [ ] Constraints are specific (not vague)
- [ ] Examples cover edge cases (if using few-shot)
- [ ] Golden rule passed (colleague wouldn't be confused)
- [ ] Security considered (if handling untrusted input)
