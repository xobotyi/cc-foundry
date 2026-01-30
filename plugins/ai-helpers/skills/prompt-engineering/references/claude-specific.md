# Claude-Specific Techniques

Techniques unique to Claude or requiring Claude-specific implementation.

## Prefilling

Control Claude's response by providing the start of the assistant
message. Claude continues from where you leave off.

### How It Works

```python
messages=[
    {"role": "user", "content": "Extract data as JSON: ..."},
    {"role": "assistant", "content": "{"}  # Prefill
]
# Claude continues: "name": "...", "price": "..."}
```

### Use Cases

**Skip preambles:**
```
Prefill: "{"
→ Claude outputs pure JSON, no "Here's the JSON:"
```

**Enforce format:**
```
Prefill: "| Name | Price |"
→ Claude continues with table rows
```

**Maintain character:**
```
Prefill: "[Sherlock Holmes]"
→ Claude stays in character even after many turns
```

**Force specific start:**
```
Prefill: "The answer is"
→ Claude completes with the answer directly
```

### Constraints

- **No trailing whitespace** — `"As an AI "` (with space) causes error
- **Not available with extended thinking** — use standard mode only
- **Short prefills work best** — a few words, not paragraphs

### When to Use

- Output format critical (JSON, XML, tables)
- Need to skip verbose introductions
- Roleplay consistency over long conversations
- Forcing specific answer structure

---

## System Prompts (Role Prompting)

Use the `system` parameter to define Claude's role. This is the most
powerful way to shape Claude's persona and expertise.

### API Usage

```python
response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    system="You are a senior security auditor at a Fortune 500 company.",
    messages=[{"role": "user", "content": "Review this code..."}]
)
```

### Why It Works

Role prompting activates domain-specific knowledge and reasoning
patterns. "You are a CFO" produces different analysis than
"You are a data scientist" for the same financial data.

### Best Practices

**Be specific:**
```
# Weak
You are a helpful assistant.

# Strong
You are a senior DevOps engineer specializing in Kubernetes
at a fintech startup handling PCI-DSS compliance.
```

**Put role in system, task in user:**
```
System: "You are a legal contract analyst..."
User: "Review this NDA for risks..."
```

**Combine with expertise markers:**
```
You are an expert [domain] specialist with 15 years experience.
You approach problems methodically and cite specific regulations.
```

### Impact Example

Without role: "The contract looks standard."

With "You are General Counsel of a Fortune 500 tech company":
"I've identified three critical issues: (1) The indemnification
clause in Section 8 is overly broad... (2) The liability cap of
$500 is grossly inadequate for enterprise usage..."

---

## Extended Thinking

Extended thinking gives Claude a dedicated "thinking budget" for
complex problems. Different from standard CoT — requires different
prompting strategies.

### Key Differences from Standard CoT

| Aspect | Standard CoT | Extended Thinking |
|--------|--------------|-------------------|
| Activation | Prompt with "think step by step" | API parameter |
| Budget | Token generation limit | Dedicated thinking budget |
| Prompting | Prescriptive steps work | High-level guidance better |
| Prefilling | Supported | Not supported |

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

High-level instructions often outperform prescriptive ones — Claude's
creativity in approaching problems may exceed human-prescribed steps.

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
