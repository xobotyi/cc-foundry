# Prompt Engineering for Skills

Skills are prompt templates. Apply these techniques to make Claude
follow your instructions reliably.

**Consider invoking the `prompt-engineering` skill** for deeper guidance
on any technique described here.

## Core Techniques

### Be Clear and Direct

The golden rule: if a colleague reading your instructions would be
confused, Claude will be too.

**Provide context:**
- What the task results will be used for
- Who the audience is
- What success looks like

**Be specific:**

| Vague | Specific |
|-------|----------|
| "Summarize this" | "Summarize in 3 bullet points, each under 20 words" |
| "Make it better" | "Fix grammar errors and reduce word count by 30%" |
| "Format appropriately" | "Return as JSON with keys: status, data, error" |

### Use Examples (Few-Shot)

Examples are the most reliable way to communicate expected behavior.
Include 2-4 input/output pairs covering:

- **Simple case** — Basic functionality
- **Complex case** — Real-world complexity
- **Edge case** — Boundary behavior

```markdown
## Examples

### Simple Request
**Input:** "Create a user validation function"
**Output:**
\`\`\`typescript
function validateUser(user: User): ValidationResult {
  // implementation
}
\`\`\`

### Edge Case: Empty Input
**Input:** "Validate this: [empty]"
**Output:** "Cannot validate empty input. Please provide user data."
```

Wrap examples in `<examples>` tags for clarity when skills are complex.

### Use XML Tags for Structure

Tags separate components and improve instruction following:

```markdown
<instructions>
1. Parse the input configuration
2. Validate against the schema
3. Generate output files
</instructions>

<constraints>
- Maximum file size: 10MB
- Supported formats: JSON, YAML
- No external network requests
</constraints>

<output_format>
Return results as:
\`\`\`json
{"status": "ok|error", "files": [...], "errors": [...]}
\`\`\`
</output_format>
```

**Best practices:**
- Consistent tag names throughout
- Reference tags in instructions ("Follow the <constraints>...")
- Nest for hierarchy: `<outer><inner>...</inner></outer>`

### Numbered Sequential Steps

When order matters, use numbered steps:

```markdown
## Process

1. **Read** — Load input file
2. **Validate** — Check against schema
3. **Transform** — Apply conversions
4. **Output** — Write results

Do not proceed to next step if current step fails.
```

Numbers ensure Claude follows exact sequence.

## Instruction Placement

**Critical rules go at the end.**

Instructions near the context boundary (end of SKILL.md) are followed
more reliably than those buried in the middle.

```markdown
## Details
[Long explanation of the domain...]

## Process
[Steps to follow...]

## IMPORTANT
Never skip validation. Always confirm before destructive operations.
```

## Chain of Thought

For complex reasoning tasks, let Claude think:

```markdown
## Analysis Process

Think through this step-by-step in <thinking> tags:
1. What is the input asking for?
2. What constraints apply?
3. What are the edge cases?

Then provide your answer in <answer> tags.
```

**Critical:** Claude must output its thinking. Without outputting
the thought process, no reasoning improvement occurs.

## Format Control

### Explicit Format Specification

Always specify output format explicitly:

```markdown
## Output Format

Return results as JSON:
\`\`\`json
{
  "summary": "[1-2 sentences]",
  "findings": ["finding 1", "finding 2"],
  "confidence": "high|medium|low"
}
\`\`\`

Do NOT include markdown formatting around the JSON.
```

### Prefilling Technique

For API skills or structured output, describe prefilling:

```markdown
## Response Format

Begin your response with `{` and return valid JSON only.
No preamble, no explanation—just the JSON object.
```

## Handling Ambiguity

Tell Claude what to do when instructions aren't clear:

```markdown
## Handling Unclear Requests

If the user's intent is unclear:
1. State what you understood
2. Ask ONE clarifying question
3. Wait for confirmation before proceeding

Do NOT guess at ambiguous requirements.
```

## Strengthening Instructions

When Claude ignores instructions, strengthen the language:

| Weak | Strong |
|------|--------|
| "Consider filtering test accounts" | "ALWAYS filter test accounts" |
| "You might want to validate" | "Validate before proceeding" |
| "It's good practice to..." | "REQUIRED: ..." |

Use sparingly—reserve strong language for truly critical rules.

## Security Considerations

Skills may process untrusted user input. Consider:

### Input Validation

```markdown
## Input Requirements

Before processing, verify:
- File exists and is readable
- File size is under 10MB
- Content does not contain executable code
```

### Scope Boundaries

```markdown
## Boundaries

This skill operates ONLY on:
- Files in the current project directory
- Files with extensions: .py, .js, .ts

Do NOT:
- Access files outside project directory
- Execute downloaded code
- Make network requests to unknown hosts
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Prose paragraphs | Key instructions buried | Use numbered steps, headers |
| "Handle appropriately" | Ambiguous | Specify exact behavior |
| No examples | Claude guesses | Add input/output pairs |
| Everything critical | Nothing stands out | Reserve emphasis for essentials |
| Long instructions | Important bits lost | Split into SKILL.md + references |

## Debugging Instructions

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Wrong format | No format spec | Add explicit example |
| Missing details | Vague instructions | Be specific about what to include |
| Ignores constraints | Buried in prose | Move to end, use XML tags |
| Inconsistent output | Ambiguous guidance | Add examples for each case |
| Partial completion | Steps not numbered | Use sequential numbered steps |

## Related Skills

- **prompt-engineering** — Full prompt engineering techniques,
  advanced patterns, reasoning frameworks
- **output-style-engineering** — If building a persona-style skill
