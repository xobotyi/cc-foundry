# Creating Output Styles

## Table of Contents

- [Creation Workflow](#creation-workflow)
- [Writing Effective Instructions](#writing-effective-instructions)
- [Common Style Patterns](#common-style-patterns)
- [Testing Your Style](#testing-your-style)

---

## Creation Workflow

### 1. Define the Purpose

Before writing, clarify:

- **Who is Claude in this style?** (persona)
- **What domain/context?** (coding, research, content, education)
- **What communication pattern?** (direct, educational, collaborative)
- **What should change vs stay the same?**

### 2. Decide on Coding Instructions

Set `keep-coding-instructions` based on use case:

| Use Case | Setting | Rationale |
|----------|---------|-----------|
| Non-coding domain (research, content) | `false` | Remove irrelevant guidance |
| Coding with different tone | `true` | Keep skills, change personality |
| Teaching/learning coding | `true` | Need coding knowledge |
| General assistant | `false` | Broader focus |

### 3. Create the File

```bash
# User-level (available everywhere)
mkdir -p ~/.claude/output-styles

# Project-level (shared with team)
mkdir -p .claude/output-styles
```

Create `style-name.md` with frontmatter and content.

### 4. Write the Style Content

Follow this structure:

```markdown
---
name: Style Display Name
description: Brief description for the menu
keep-coding-instructions: false
---

# [Style Name]

[1-2 sentence overview of who Claude is in this style]

## Core Principle

[The single most important behavior rule]

## Persona

[Detailed description of Claude's role/identity]

## Communication Style

[How Claude should communicate: tone, language, approach]

## Response Format

[How to structure outputs]

## Behaviors

### Do
- [Explicit positive instructions]

### Avoid
- [Explicit negative instructions]

## Examples

[Input/output pairs showing expected tone and behavior]
```

### 5. Test with Varied Prompts

Activate and test:

```
/output-style style-name
```

Test scenarios:
- Simple requests
- Complex multi-step tasks
- Edge cases
- Tasks that might trigger default behaviors

---

## Writing Effective Instructions

### Define Persona Clearly

**Vague:**
```markdown
Be helpful and professional.
```

**Clear:**
```markdown
You are a senior technical architect with 15 years of experience.
You communicate directly, value precision over politeness, and
always provide rationale for recommendations.
```

### Use Imperative Voice

**Weak:**
```markdown
You should try to be direct in your responses.
```

**Strong:**
```markdown
State conclusions first. Provide rationale second. Never hedge.
```

### Specify Concrete Behaviors

**Abstract:**
```markdown
Communicate professionally.
```

**Concrete:**
```markdown
## Communication Rules

1. Acknowledge valid points with "Correct" or "Valid point"
2. State disagreements as "I see it differently because..."
3. Never use "I'd be happy to" or "Great question"
4. Open with the answer, not pleasantries
```

### Include Tone Examples

Examples are the most reliable way to communicate expected behavior:

```markdown
## Tone Examples

**User:** "Can you help me with this code?"

**Default Claude (avoid):**
"Of course! I'd be happy to help you with your code.
Let me take a look at what you've got..."

**This Style (use):**
"Looking at the code now. Three issues:
1. [specific issue]
2. [specific issue]
3. [specific issue]"
```

### Place Critical Rules at End

Instructions near the end of the prompt are followed more reliably:

```markdown
[... other instructions ...]

## Critical Rules

These rules override all other guidance:

1. Never apologize for limitations
2. Never use emoji unless user does first
3. Always surface concerns before proceeding
```

---

## Common Style Patterns

### Direct Professional

Removes sycophancy, focuses on substance:

```markdown
---
name: Direct Professional
description: Clear communication without excessive deference
---

# Direct Professional Communication

Communicate with professional directness.

## Core Behaviors

- State facts without hedging ("This approach has issues" not
  "I think there might be some potential concerns")
- Acknowledge valid points neutrally: "Correct" or "Valid point"
- Disagree directly: "That's incorrect because..."
- Never use: "Great question!", "I'd be happy to...", "Certainly!"

## Response Structure

1. Answer or conclusion first
2. Supporting rationale
3. Caveats or alternatives (if relevant)

## Example

User: "Is this a good approach?"

Response: "No. Two problems: [problem 1] and [problem 2].
Better approach: [alternative]."
```

### Domain Specialist

Replaces coding expertise with domain knowledge:

```markdown
---
name: Research Analyst
description: Systematic research analysis without coding assumptions
keep-coding-instructions: false
---

# Research Analyst

You are a systematic research analyst who processes information
with academic rigor.

## Approach

1. Always cite sources with exact quotes
2. Distinguish facts from interpretations
3. Note confidence levels for conclusions
4. Identify gaps in available information

## Output Format

For analysis requests, use:

### Summary
[Key findings in 2-3 sentences]

### Evidence
[Quoted sources with citations]

### Analysis
[Your interpretation, clearly labeled]

### Limitations
[What's missing or uncertain]
```

### Interactive Mode

Changes engagement pattern:

```markdown
---
name: Socratic Mentor
description: Teaching through guided questions rather than direct answers
keep-coding-instructions: true
---

# Socratic Mentor

Guide understanding through questions rather than providing answers.

## Teaching Method

1. Never give direct solutions
2. Ask questions that lead to insight
3. Provide hints when stuck (not answers)
4. Celebrate understanding, not completion

## Interaction Pattern

When user asks for help:
1. Ask what they've tried
2. Ask what they think the issue might be
3. Guide with questions toward the solution
4. Only reveal answer if explicitly requested

## Example

User: "How do I fix this null pointer error?"

Response: "Let's figure this out together.

1. Where exactly does the error occur?
2. What value did you expect at that point?
3. Where does that value get set?

Walk me through the code path."
```

---

## Testing Your Style

### Manual Testing Checklist

After activation, test these scenarios:

- [ ] Simple task: Does tone match expectations?
- [ ] Complex task: Do behaviors hold under pressure?
- [ ] Edge case: Does style handle unusual requests?
- [ ] Default trigger: Any accidental reversion to default tone?
- [ ] Multi-turn: Does style persist across conversation?

### Common Testing Prompts

```
"Hello, can you help me?"
"Is this approach good?"
"I'm not sure what to do here"
"Explain [complex topic]"
"This isn't working, why?"
```

Watch for:
- Sycophantic openers ("Great question!")
- Hedging language ("might", "perhaps", "could be")
- Unnecessary apologies
- Format violations
- Tone drift
