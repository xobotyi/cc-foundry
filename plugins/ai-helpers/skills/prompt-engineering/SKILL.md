---
name: prompt-engineering
description: >-
  Prompt engineering for Claude: craft, debug, and improve prompts, skills,
  agents, and output styles. Use when working with any AI instructions.
---

# Prompt Engineering

Design effective prompts for LLMs. Apply when crafting skills, agents,
output styles, system prompts, or any AI instructions.

## When to Read References

| Situation | Read |
|-----------|------|
| Task requires multi-step reasoning, math, logic | [reasoning-techniques.md](references/reasoning-techniques.md) |
| Choosing between zero/few-shot, designing examples | [learning-paradigms.md](references/learning-paradigms.md) |
| Building multi-prompt pipelines, refining iteratively | [workflow-patterns.md](references/workflow-patterns.md) |
| Prompt handles untrusted input, security review | [security.md](references/security.md) |
| Deciding between prompting vs RAG vs fine-tuning | [optimization-strategies.md](references/optimization-strategies.md) |
| Using prefilling, extended thinking, system prompts | [claude-specific.md](references/claude-specific.md) |
| Working with 20K+ token documents | [long-context.md](references/long-context.md) |
| Building agents, using tools, ReAct/PAL patterns | [agent-patterns.md](references/agent-patterns.md) |

## Core Principle

**Good prompts = good results.** Quality directly correlates with output
quality. Every word influences the outcome.

## Technique Order (Most → Least Broadly Effective)

When troubleshooting, try these in order:

1. **Be clear and direct** — Precise instructions, context, format
2. **Use examples** — Multishot prompting with 3-5 examples
3. **Let Claude think** — Chain-of-thought for complex tasks
4. **Use XML tags** — Structure inputs and outputs
5. **Give Claude a role** — System prompts for expertise
6. **Prefill response** — Control output format/start
7. **Chain prompts** — Break complex tasks into steps
8. **Long context tips** — Optimize 200K token window

---

## Be Clear and Direct

**The golden rule:** Show your prompt to a colleague with minimal
context. If they're confused, Claude will be too.

### Provide Context

Tell Claude:
- What the task results will be used for
- Who the audience is
- Where this fits in your workflow
- What success looks like

### Be Specific

| Vague | Specific |
|-------|----------|
| "Summarize this" | "Summarize in 3 bullet points, each under 20 words" |
| "Make it better" | "Fix grammar errors and reduce word count by 30%" |
| "Analyze the data" | "Calculate YoY growth and identify top 3 trends" |

### Use Sequential Steps

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

## Technique Selection

| Task Type | Recommended Technique |
|-----------|----------------------|
| Simple, direct task | Zero-shot |
| Need consistent format | One-shot / Few-shot with examples |
| Complex reasoning | Chain-of-Thought (CoT) |
| Multi-step workflow | Prompt Chaining |
| Exploring solutions | Tree-of-Thoughts (ToT) |
| Category of problems | Meta Prompting |
| Iterative refinement | Iterative Prompting |
| Output format critical | Prefilling |
| Deep domain expertise | Role/System prompting |
| Very complex reasoning | Extended Thinking |
| Agentic tasks with tools | ReAct (reasoning + acting) |
| Math/precise calculation | PAL (code execution) |
| Multi-attempt allowed | Reflexion (self-reflection) |
| Commonsense knowledge gaps | Generated Knowledge |

## Fundamental Techniques

### Zero-Shot Prompting

No examples provided. Relies on model's pre-trained knowledge.

```
Classify the sentiment: "This product exceeded expectations"
→ Positive
```

Best for: Simple tasks, clear instructions, well-defined outputs.

### Few-Shot Prompting

Multiple examples guide the model through patterns.

```
Text: "Great service!" → Positive
Text: "Worst purchase ever" → Negative
Text: "It works as expected" → Neutral
Text: "Absolutely love it!" → ?
```

**Tips:**
- 3-5 examples typically sufficient
- Cover edge cases in examples
- Order matters: simple → complex
- Use diverse, representative examples
- Wrap in `<examples>` tags for clarity

### Chain-of-Thought (CoT)

Elicit step-by-step reasoning for complex problems.

**Zero-shot CoT:**
```
Solve: If a train travels 120km in 2 hours, what's its speed?
Think step by step.
```

**Structured CoT (recommended):**
```
Think through this problem in <thinking> tags.
Then provide your answer in <answer> tags.
```

Best for: Math, logic, multi-step reasoning, complex analysis.

**Critical:** Claude must output its thinking. Without outputting the
thought process, no thinking actually occurs.

### Prompt Chaining

Break complex tasks into sequential prompts where each builds on previous.

```
Prompt 1: "Extract key facts from this article"
→ Output: [facts]

Prompt 2: "Summarize these facts in 3 bullet points"
→ Output: [summary]

Prompt 3: "Translate summary to Spanish"
→ Output: [final]
```

Best for: Complex workflows, quality control at each step, debugging.

---

## Structuring Prompts

### XML Tags

Use tags to separate components and improve parseability:

```xml
<instructions>
Analyze the contract for risks.
</instructions>

<contract>
{{CONTRACT_TEXT}}
</contract>

<output_format>
List risks in <risks> tags, recommendations in <recommendations> tags.
</output_format>
```

**Best practices:**
- Consistent tag names throughout prompt
- Reference tags in instructions ("Using the contract in <contract>...")
- Nest tags for hierarchy: `<outer><inner></inner></outer>`
- Combine with other techniques: `<examples>`, `<thinking>`, `<answer>`

### Clear Components

1. **Role/Context** — Who is the AI? What's the situation?
2. **Task** — What to do (action verb)
3. **Format** — How to structure output
4. **Constraints** — Limits, requirements, avoid-list
5. **Examples** — Demonstrations (if needed)

### Effective Structure

```markdown
You are [role].

## Task
[Clear action verb + objective]

## Context
[Relevant background]

## Requirements
- [Constraint 1]
- [Constraint 2]

## Output Format
[Exact structure expected]

## Examples
[Input/output pairs if needed]
```

---

## Advanced Techniques

### Self-Consistency

Sample multiple reasoning paths, select most common answer.

```
[Run same CoT prompt multiple times]
Path 1: Answer = 42
Path 2: Answer = 42
Path 3: Answer = 38
→ Final: 42 (majority vote)
```

### Prefilling

Start Claude's response to control format:

```python
messages=[
    {"role": "user", "content": "Extract as JSON: ..."},
    {"role": "assistant", "content": "{"}  # Prefill
]
```

Claude continues from `{`, outputting pure JSON without preamble.

See [claude-specific.md](references/claude-specific.md) for details.

### Extended Thinking

For very complex problems, use extended thinking mode instead of
standard CoT. Key difference: use high-level guidance, not
prescriptive steps.

```
Please think about this thoroughly. Consider multiple approaches.
Try different methods if your first approach doesn't work.
```

See [claude-specific.md](references/claude-specific.md) for details.

---

## Security Considerations

### Prompt Injection

Attackers disguise malicious input as legitimate prompts.

**Mitigations:**
- Input validation and sanitization
- Output filtering
- Least privilege (limit what LLM can access)
- Human-in-the-loop for sensitive actions
- Clear delimiters between instructions and user input

See [security.md](references/security.md) for full coverage.

---

## Debugging Prompts

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Wrong format | Unclear specification | Add explicit format example |
| Missing info | Vague task | Be more specific about what to include |
| Hallucination | No grounding | Add context, use RAG, request citations |
| Inconsistent | Ambiguous instructions | Add examples, clarify constraints |
| Too verbose | No length constraint | Specify word/sentence limits |
| Off-topic | Scope creep | Add explicit boundaries |
| Ignores instructions | Buried in text | Move instructions to end, use XML |

---

## Quality Checklist

Before finalizing a prompt:

- [ ] Task is clear (single action verb)
- [ ] Output format is explicit
- [ ] Constraints are specific (not vague)
- [ ] Examples cover edge cases (if using few-shot)
- [ ] Security considerations addressed
- [ ] Tested with varied inputs
- [ ] Golden rule passed (colleague wouldn't be confused)
