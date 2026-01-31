# Writing Effective Output Styles

## Core Principles

### 1. Be Specific About the Persona

Vague:
```markdown
You are helpful and knowledgeable.
```

Specific:
```markdown
You are a technical documentation editor who prioritizes clarity,
accuracy, and consistent terminology. You use active voice and
avoid jargon unless defining it first.
```

### 2. Define Communication Patterns

Specify how Claude should interact:

```markdown
## Communication Style

- Lead with the answer, then explain
- Use bullet points for lists of 3+ items
- Ask clarifying questions before large changes
- Acknowledge uncertainty explicitly
```

### 3. Set Clear Priorities

What matters most? What should be avoided?

```markdown
## Priorities

Focus on:
- Factual accuracy over speed
- Citing sources for claims
- Flagging assumptions

Avoid:
- Speculation presented as fact
- Unnecessary caveats
- Overly formal language
```

### 4. Include Behavioral Examples

Show, don't just tell:

```markdown
## Response Patterns

When asked to analyze data:
1. State the key finding first
2. Present supporting evidence
3. Note limitations or caveats
4. Suggest next steps

Example:
User: "What's the trend in these metrics?"
Response: "Revenue grew 23% YoY, driven primarily by..."
```

## Common Patterns

### The Direct Professional

```markdown
You are a direct, professional assistant. Communicate efficiently:

- Answer questions immediately without preamble
- Use "I don't know" rather than hedging
- Skip pleasantries unless contextually appropriate
- Provide reasoning only when asked or when critical
```

### The Explanatory Mentor

```markdown
You are a patient mentor who helps users understand deeply.

When completing tasks:
1. Explain your approach before executing
2. Highlight key concepts as "Insight" blocks
3. Connect new information to what the user likely knows
4. Invite questions after complex explanations
```

### The Domain Specialist

```markdown
You are a [domain] specialist. Apply domain expertise:

- Use precise [domain] terminology
- Reference established [domain] frameworks
- Flag when questions fall outside [domain] scope
- Recommend domain-appropriate resources
```

## Anti-Patterns to Avoid

### Over-Constraining

Too restrictive:
```markdown
Never use bullet points. Always respond in exactly 3 paragraphs.
Never ask questions. Always cite exactly 2 sources.
```

This creates rigid, unnatural responses.

### Vague Personality Traits

Not actionable:
```markdown
Be friendly and helpful. Show enthusiasm. Be professional.
```

What does "friendly" mean in practice? Define specific behaviors.

### Conflicting Instructions

Problematic:
```markdown
Be concise and thorough. Move fast but be careful.
Answer immediately but think deeply first.
```

Resolve conflicts by specifying when each applies.

### Copying Default Behaviors

Redundant:
```markdown
Read files before editing. Run tests to verify. Use git properly.
```

Claude already does these. Only specify if modifying defaults.

## Testing Your Style

1. **Varied tasks** — Try different request types
2. **Edge cases** — Test ambiguous or unusual inputs
3. **Consistency** — Does personality remain stable?
4. **Natural flow** — Does interaction feel coherent?

Iterate based on where the style breaks down.
