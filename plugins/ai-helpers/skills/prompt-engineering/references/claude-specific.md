# Claude-Specific Techniques

Extended depth for Claude-specific features. For working-resolution rules on prefilling, system prompts, and extended
thinking, see SKILL.md. This reference provides API details, advanced use cases, and technique combinations.

## Contents

- [Prefilling — Advanced Use Cases](#prefilling--advanced-use-cases)
- [System Prompts — API Patterns](#system-prompts--api-patterns)
- [Extended Thinking](#extended-thinking)
- [Combining Techniques](#combining-techniques)

## Prefilling — Advanced Use Cases

SKILL.md covers prefilling rules and constraints. This section provides advanced patterns for production use.

### Multi-Turn Prefilling

Maintain format consistency across a conversation by prefilling each turn:

```python
# Turn 1
messages=[
    {"role": "user", "content": "Analyze revenue data: ..."},
    {"role": "assistant", "content": '{"analysis":'}
]

# Turn 2 — same prefill maintains JSON format
messages=[
    {"role": "user", "content": "Now analyze cost data: ..."},
    {"role": "assistant", "content": '{"analysis":'}
]
```

### Prefill + XML for Structured Extraction

Combine prefilling with XML tags to enforce multi-section output:

```python
messages=[
    {"role": "user", "content": "Review this PR: <code>...</code>"},
    {"role": "assistant", "content": "<review>\n<summary>"}
]
# Claude continues with summary, then findings, etc.
```

### Prefill Limitations in Practice

- Prefilling the wrong start can constrain Claude's reasoning — if the best answer doesn't begin with your prefill,
  quality degrades
- For classification, prefill with the format marker, not a specific class: `"Classification:"` not `"Positive"` — the
  latter forces the answer
- JSON prefills (`"{"`) work reliably; deeply nested prefills (`'{"data": {"items": ['`) are fragile

---

## System Prompts — API Patterns

SKILL.md covers domain priming vs persona and system prompt rules. This section provides API-level patterns and advanced
configuration.

### API Usage

```python
response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    system="This is a web application security audit. Apply OWASP Top 10.",
    messages=[{"role": "user", "content": "Review this code..."}]
)
```

### Multi-Section System Prompts

For complex applications, structure the system prompt with clear sections:

```python
system = """
<domain>Enterprise financial analysis for quarterly reporting.</domain>

<constraints>
- All figures must cite their source document
- Flag any year-over-year change exceeding 15%
- Use GAAP terminology throughout
</constraints>

<output_format>
Structure every response as: Summary → Key Findings → Risks → Recommendations
</output_format>
"""
```

### System Prompt vs User Message — What Goes Where

- `Domain/role` → System. Persists across turns, highest instruction priority
- `Behavioral constraints` → System. Must apply to every response
- `Task description` → User. Varies per request
- `Input data` → User. Changes each time
- `Format examples` → Either. System if constant, user if task-specific

### Domain Priming Impact Example

Without priming: "The contract looks standard."

With `system="This is a legal risk assessment for enterprise software licensing."`: "Three critical issues: (1) The
indemnification clause in Section 8 is overly broad... (2) The liability cap of $500 is grossly inadequate for
enterprise usage..."

The improvement comes from domain priming, not persona — specifying the task context activates relevant knowledge more
reliably than role assignment.

---

## Extended Thinking

Extended thinking gives Claude a dedicated "thinking budget" for complex problems. Different from standard CoT —
requires different prompting strategies.

### Key Differences from Standard CoT

| Aspect     | Standard CoT                     | Extended Thinking          |
| ---------- | -------------------------------- | -------------------------- |
| Activation | Prompt with "think step by step" | API parameter              |
| Budget     | Token generation limit           | Dedicated thinking budget  |
| Prompting  | Prescriptive steps work          | High-level guidance better |
| Prefilling | Supported                        | Not supported              |

### Technical Requirements

- **Minimum budget:** 1024 thinking tokens
- **Batch for heavy thinking:** >32K thinking tokens → use batch API
- **Language:** Thinking works best in English (output can be any)

### Prompting Strategy

**Standard prompting (prescriptive):**

```
Think through this step by step:
1. First, identify the variables
2. Then, set up the equation
3. Next, solve for x...
```

**Extended thinking prompting (high-level):**

```
Please think about this math problem thoroughly and in great detail.
Consider multiple approaches and show your complete reasoning.
Try different methods if your first approach doesn't work.
```

High-level instructions often outperform prescriptive ones — Claude's creativity in approaching problems may exceed
human-prescribed steps.

### Multishot with Extended Thinking

Use XML tags in examples to show thinking patterns:

```
Problem 1: What is 15% of 80?

<thinking>
To find 15% of 80:
1. Convert 15% to decimal: 0.15
2. Multiply: 0.15 × 80 = 12
</thinking>

The answer is 12.

Now solve: What is 35% of 240?
```

Claude generalizes the pattern to its extended thinking process.

### Self-Verification

Ask Claude to verify before finishing:

```
Write a function to calculate factorial.
Before you finish, verify your solution with test cases for:
- n=0
- n=1
- n=5
- n=10
And fix any issues you find.
```

### When Extended Thinking Excels

- Complex STEM problems (4D visualization, advanced physics)
- Constraint optimization (multiple competing requirements)
- Strategic planning with frameworks (Porter's Five Forces, etc.)
- Tasks where multiple approaches should be considered

### When to Use Standard CoT Instead

- Simple reasoning tasks
- Budget constraints (extended thinking costs more)
- Need prefilling (not supported with extended thinking)
- Thinking budget would be <1024 tokens

---

## Combining Techniques

### Prefill + XML Tags

```
User: Analyze this document: <doc>...</doc>
Assistant (prefill): <analysis>
```

### Role + CoT

```
System: You are a financial advisor.
User: [question] Think step by step.
```

### Role + Structured Output

```
System: You are a code reviewer.
User: Review this code. Output findings in <findings> tags,
      recommendations in <recommendations> tags.
```

Extended thinking cannot combine with prefilling — choose one.
