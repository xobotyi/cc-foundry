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
[What it does] + [When to invoke — broad domain claim with trigger examples]
```

- **What it does** — Functional description of the skill's purpose.
  State what the skill covers concretely, not a slogan or tagline.
- **When to invoke** — "Invoke whenever task involves any interaction
  with X." Claims the domain broadly, then lists specific triggers
  as examples under the broad claim.

### Examples

**Language skill:**
```yaml
description: >-
  Go language conventions, idioms, and toolchain. Invoke when task
  involves any interaction with Go code — writing, reviewing,
  refactoring, debugging, or understanding Go projects.
```

**Tool skill:**
```yaml
description: >-
  Design and iterate Claude Code skills: description triggers
  activation, instructions shape behavior. Invoke whenever task
  involves any interaction with Claude Code skills — creating,
  evaluating, debugging, or understanding how they work.
```

**Domain skill:**
```yaml
description: >-
  PDF document processing: text extraction, form filling, merging,
  splitting. Invoke whenever task involves any interaction with PDF
  files — reading, creating, editing, or converting documents.
```

### Aggressive Triggering, Graceful De-escalation

Descriptions should **claim the domain broadly**. Narrow verb lists
create implicit exclusion — if a user's request doesn't match the
listed verbs, Claude won't activate the skill.

**Too narrow (avoid):**
```yaml
description: >-
  Skills for Claude Code. Invoke when creating, editing, debugging,
  or asking questions about skills.
```
Lists specific verbs → misses valid activations outside that set.

**Broad domain claim (preferred):**
```yaml
description: >-
  Design and iterate Claude Code skills: description triggers
  activation, instructions shape behavior. Invoke whenever task
  involves any interaction with Claude Code skills — creating,
  evaluating, debugging, or understanding how they work.
```
Claims domain with "any interaction with X", then lists keywords as
examples under the broad claim.

**Principles:**
- Lead with function — state what the skill does, not a tagline
- Claim domain with "whenever task involves any interaction with X"
- List specific verbs as examples, not exhaustive conditions
- Handle de-escalation inside the skill body, not the description
- Skill dependencies belong in SKILL.md body, not descriptions
- Philosophy/guiding principles belong in SKILL.md body, not
  descriptions — they shape behavior after loading, not activation

Better to trigger and de-escalate than to miss activations.

### Description Anti-Patterns

| Pattern | Problem |
|---------|---------|
| "Helps with X" | Too vague — what kind of help? |
| "I can help you..." | Wrong point of view (use third person) |
| "Useful tool for..." | Marketing speak, not actionable |
| Slogan before description | Wastes tokens, zero activation value |
| Narrow verb list as trigger | Misses activations outside listed verbs |
| Cross-skill deps in description | Redundant — handle in SKILL.md body |

## Step 4: Structure the SKILL.md

### Minimal Template

```markdown
---
name: my-skill
description: >-
  [What it does — functional description]. Invoke whenever task
  involves any interaction with [domain] — [specific triggers].
---

# [Skill Name]

## Instructions

[Clear, imperative guidance]

## Examples

[Input/output pairs showing expected behavior]
```

### Template with References

For skills with reference files, SKILL.md must contain working-resolution
versions of all behavioral content. References provide depth (extended
examples, catalogs, detailed rubrics), not core rules.

Include a route table with a **Contents** column so the agent can make
informed decisions about which references to read:

```markdown
---
name: my-skill
description: >-
  [What it does — functional description]. Invoke whenever task
  involves any interaction with [domain] — [specific triggers].
---

# [Skill Name]

[Purpose statement]

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Topic A | `references/a.md` | Comparison tables, extended examples |
| Topic B | `references/b.md` | Full API catalog, edge case patterns |

## [Topic Sections]

[Working-resolution rules — the complete behavioral specification.
An agent reading only SKILL.md produces correct output.]

[Pointers to references for extended depth: "Comparison tables and
file extension rules: see `references/a.md`."]
```

This pattern:
- SKILL.md IS the discipline — not a router to the real content
- References deepen topics whose rules are already stated in the body
- Contents column enables informed read decisions
- Agent works correctly without ever loading a reference

### Simple Template

For skills without references:

```markdown
---
name: my-skill
description: >-
  [What it does — functional description]. Invoke whenever task
  involves any interaction with [domain] — [specific triggers].
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
- Compiles without errors
- Passes all existing tests
- Follows project naming conventions
- Has no obvious security vulnerabilities
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

- **Simple cases** — Does basic functionality work?
- **Complex cases** — Does it handle real-world complexity?
- **Edge cases** — Empty input, malformed data, unusual requests
- **Consistency** — Same input produces same quality output?

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

### Coding Discipline Skill

For language, framework, or platform conventions. The most reference-heavy
archetype — typically 5-10 references covering different topic areas.

Key structural patterns:
- **Philosophy bookends** — opening statement frames values, closing maxim
  reinforces
- **Numbered declarative rules** per topic section (8-17 rules typical)
- **Application section** — differentiates writing mode (apply silently)
  from reviewing mode (cite violation, show fix inline)
- **Integration section** — names related skills and their scope boundaries

```markdown
---
name: nodejs
description: >-
  Node.js runtime conventions, APIs, and ecosystem patterns. Invoke
  whenever task involves any interaction with Node.js runtime — server
  code, CLI tools, scripts, module system, streams, or process lifecycle.
---

# Node.js

**Respect the event loop. Every blocking operation is a scalability bug.**

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Modules | `references/modules.md` | ESM/CJS comparison tables, file extension rules |
| Event loop | `references/event-loop.md` | Phase order, execution priority, worker pool |
| Streams | `references/streams.md` | Stream types table, pipeline patterns |

## Module System

1. **Use ESM.** Set `"type": "module"` in `package.json`.
2. **Use `node:` prefix** for all built-in imports.
3. **Define `"exports"` in `package.json`** for libraries.
[... more numbered rules ...]

File extension rules and ESM vs CJS comparison tables:
see `references/modules.md`.

## Event Loop

### Core Rules

1. **Never block the event loop.** No sync I/O in servers.
2. **Offload CPU-intensive work** to `worker_threads`.
[... more numbered rules ...]

## Application

When **writing** Node.js code:
- Apply all conventions silently — don't narrate each rule.
- If an existing codebase contradicts a convention, follow the
  codebase and flag the divergence once.

When **reviewing** Node.js code:
- Cite the specific violation and show the fix inline.
- Don't lecture — state what's wrong and how to fix it.

## Integration

The **javascript** skill governs language choices; this skill governs
Node.js runtime decisions.

**Respect the event loop. When in doubt, make it async.**
```

Note how every reference topic has working-resolution rules in the body.
The references provide depth (comparison tables, phase diagrams, patterns)
but the agent can write correct Node.js code from SKILL.md alone.
