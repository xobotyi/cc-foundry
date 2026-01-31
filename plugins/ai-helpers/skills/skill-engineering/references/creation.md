# Creating Skills

Skills are prompt templates. Apply prompt engineering principles throughout.
For complex instruction design, consider invoking the `prompt-engineering` skill.

## Step 1: Identify the Pattern

Before writing code, identify what you're encoding:

**Questions to ask:**
- What do I repeatedly explain to Claude?
- What workflow needs consistency across sessions?
- What domain knowledge does Claude lack?
- What format do I always want for this task?

**Good skill candidates:**
- Coding conventions for your stack
- Document generation with specific structure
- Data analysis following your methodology
- Workflows with multiple coordinated steps

**Poor skill candidates:**
- One-off tasks (just prompt directly)
- Highly variable tasks (can't standardize)
- Tasks needing real-time data (use MCP instead)

## Step 2: Define Scope

A skill should do one thing well.

**Scope too broad:**
```
Skill: Full-Stack Development
- Handles frontend, backend, databases, deployment, testing...
```
This will produce mediocre results across all areas.

**Scope too narrow:**
```
Skill: Button Component Generator
- Only creates button components
```
Not reusable enough to justify the overhead.

**Right scope:**
```
Skill: React Component Generator
- Creates TypeScript React components
- Follows team conventions for structure
- Includes proper typing and accessibility
- Generates corresponding test files
```
Focused enough to be specific, broad enough to be useful.

## Step 3: Write the Description

The description is the **most important field**. Claude uses it to decide
when to invoke your skill.

### Description Formula

```
[What it does] + [When to use it / trigger scenarios]
```

### Examples

**PDF Processing:**
```yaml
description: >-
  Extract text and tables from PDF files, fill forms, merge documents.
  Use when working with PDF files or when the user mentions PDFs, forms,
  or document extraction.
```

**Git Commit Helper:**
```yaml
description: >-
  Generate descriptive commit messages by analyzing git diffs.
  Use when the user asks for help writing commit messages or
  reviewing staged changes.
```

**Code Review:**
```yaml
description: >-
  Review code for bugs, security issues, performance, and style.
  Use when asked to review, audit, or analyze code quality.
```

### Description Anti-Patterns

| Pattern | Problem |
|---------|---------|
| "Helps with X" | Too vague—what kind of help? |
| "I can help you..." | Wrong point of view (use third person) |
| "Useful tool for..." | Marketing speak, not actionable |
| No trigger scenarios | Claude doesn't know when to invoke |

## Step 4: Structure the SKILL.md

### Minimal Template

```markdown
---
name: my-skill
description: [What it does and when to use it]
---

# [Skill Name]

## Instructions

[Clear, imperative guidance]

## Examples

[Input/output pairs showing expected behavior]
```

### Template with References

For skills with multiple reference files, use a **route to reference** table.
This tells Claude which reference to read based on the situation:

```markdown
---
name: my-skill
description: [What it does and when to use it]
---

# [Skill Name]

[1-2 sentence purpose statement]

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Need to do X | [x-guide.md](references/x-guide.md) |
| Need to do Y | [y-guide.md](references/y-guide.md) |
| Something is broken | [troubleshooting.md](references/troubleshooting.md) |

Read the relevant reference before proceeding.

## Core Rules

[Essential guidance that applies to all situations]

## Quick Checklist

- [ ] Check 1
- [ ] Check 2
```

This pattern:
- Routes Claude to detailed content based on situation
- Avoids repeating reference content in SKILL.md
- Makes the skill self-documenting

SKILL.md can still contain core rules, examples, and guidance—the
router table just provides navigation to deep-dive content.

### Simple Template

For skills without references:

```markdown
---
name: my-skill
description: [What it does and when to use it]
---

# [Skill Name]

## Instructions

[Clear, imperative guidance]

## Examples

[Input/output pairs showing expected behavior]
```

## Step 5: Write Instructions

Skills are prompts—apply prompt engineering fundamentals.

### Use Imperative Language

**Good:**
```markdown
1. Read the input file
2. Extract key entities
3. Format as JSON
4. Validate the output
```

**Avoid:**
```markdown
You should read the input file, and then you might want to
extract entities from it...
```

### Be Specific

**Vague:**
```markdown
Make sure the code is good.
```

**Specific:**
```markdown
Verify the code:
1. Compiles without errors
2. Passes all existing tests
3. Follows project naming conventions
4. Has no obvious security vulnerabilities
```

### Use XML Tags for Structure

Separate instruction components with XML tags:

```markdown
<instructions>
1. Parse the configuration file
2. Validate against schema
3. Generate output
</instructions>

<constraints>
- Max file size: 10MB
- Supported formats: JSON, YAML
</constraints>

<output_format>
Return: {"status": "ok|error", "data": [...]}
</output_format>
```

Tags improve instruction following, especially in complex skills.

### Place Critical Rules at the End

Instructions near the context boundary are followed more reliably:

```markdown
## Background
[Domain explanation...]

## Process
[Steps...]

## IMPORTANT
Never skip validation. Always confirm before destructive operations.
```

### Handle Ambiguity

What should Claude do when the input is unclear?

```markdown
## Handling Ambiguous Requests

If the user's intent is unclear:
1. State what you understood
2. Ask one clarifying question
3. Proceed only after confirmation

Do not guess at ambiguous requirements.
```

## Step 6: Add Examples

Examples are the most effective way to communicate expected behavior.
Few-shot prompting (showing input/output pairs) reliably improves output quality.

### Input/Output Pairs

```markdown
## Examples

### Example: Simple Component
**Request:** "Create a button component with primary and secondary variants"

**Output:**
\`\`\`typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  onClick
}) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
\`\`\`
```

### Cover Edge Cases

```markdown
### Example: Edge Case - Empty Input
**Request:** "Analyze this data: [empty file]"

**Output:**
"The input file is empty. Please provide data to analyze,
or specify if you'd like me to create sample data."
```

## Step 7: Test Thoroughly

### Activation Testing

Test that the skill triggers when it should:
```
✓ "Process this PDF" → should trigger pdf-skill
✓ "Extract text from document.pdf" → should trigger
✓ "Help me with this PDF form" → should trigger
```

Test that it doesn't trigger when it shouldn't:
```
✗ "Create a PDF of this document" → might be different skill
✗ "What's a PDF?" → informational, no skill needed
```

### Output Quality Testing

1. **Simple cases** — Does basic functionality work?
2. **Complex cases** — Does it handle real-world complexity?
3. **Edge cases** — Empty input, malformed data, unusual requests
4. **Consistency** — Same input produces same quality output?

### Iteration

Based on testing:
- Refine description if activation is wrong
- Clarify instructions if output quality is poor
- Add examples for edge cases that fail
- Split skill if scope is too broad

## Common Patterns

### Router Skill

For skills covering multiple scenarios with detailed guidance for each:

```markdown
---
name: code-review
description: >-
  Review code for quality issues. Use when asked to review,
  audit, or check code.
---

# Code Review

## Route to Reference

| Reviewing | Reference |
|-----------|-----------|
| Security concerns | [security.md](references/security.md) |
| Performance issues | [performance.md](references/performance.md) |
| Test coverage | [testing.md](references/testing.md) |
| Style and conventions | [style.md](references/style.md) |

Read relevant references based on review focus.

## Always Check

- [ ] No obvious bugs
- [ ] Error handling present
- [ ] No hardcoded secrets
```

The router pattern organizes access to detailed references while
SKILL.md still provides core guidance that applies to all scenarios.

### Workflow Skill

```markdown
---
name: deploy
description: Deploy application to production environment.
  Use when user wants to deploy or push to production.
disable-model-invocation: true
---

# Deployment Workflow

## Pre-Deployment Checklist
- [ ] All tests pass
- [ ] No uncommitted changes
- [ ] Version bumped appropriately

## Steps
1. Run full test suite
2. Build production bundle
3. Deploy to staging
4. Run smoke tests
5. Deploy to production
6. Verify deployment health

## Rollback
If deployment fails at any step, rollback to previous version.
```

### Knowledge Skill

```markdown
---
name: api-conventions
description: API design patterns and conventions for this project.
  Use when creating or modifying API endpoints.
---

# API Conventions

## Endpoint Naming
- Use plural nouns: `/users`, not `/user`
- Nest related resources: `/users/{id}/orders`
- Use kebab-case for multi-word: `/user-profiles`

## Response Format
\`\`\`json
{
  "data": { ... },
  "meta": { "page": 1, "total": 100 },
  "errors": []
}
\`\`\`

## Error Handling
Return appropriate HTTP status codes with error details.
```

### Template Skill

```markdown
---
name: pr-template
description: Generate pull request descriptions following team format.
  Use when creating PRs or asked about PR content.
---

# PR Description Generator

## Template
\`\`\`markdown
## Summary
[1-3 sentences describing the change]

## Changes
- [Bullet points of specific changes]

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases considered

## Screenshots
[If UI changes, include before/after]
\`\`\`

## Instructions
1. Analyze the diff or described changes
2. Fill in template sections
3. Suggest appropriate reviewers based on changed files
```
