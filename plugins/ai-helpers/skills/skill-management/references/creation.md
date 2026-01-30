# Creating Skills

## Creation Workflow

### 1. Understand with Concrete Examples

Before writing anything, clarify how the skill will be used:
- "What would a user say that should trigger this skill?"
- "Can you give examples of tasks this skill should handle?"
- "What does success look like?"

Skip only when usage patterns are already clear.

### 2. Plan the Structure

For each example, consider:
1. How would you execute this from scratch?
2. What would be helpful to have pre-made for repeated use?

**Identify what to bundle:**
- `references/` — documentation Claude should consult (schemas, API docs)
- `scripts/` — executable code for deterministic operations
- `assets/` — files used in output (templates, images, fonts)

### 3. Create the Skill

```bash
mkdir -p .claude/skills/my-skill
```

Write SKILL.md with frontmatter and instructions.
See [spec.md](spec.md) for requirements.

### 4. Add Bundled Resources

Create only what's needed. Most skills need only SKILL.md.

### 5. Test with Real Tasks

Use the skill on actual tasks. Observe:
- Does it trigger when expected?
- Are instructions clear enough?
- What's missing?

## Writing SKILL.md

### Frontmatter

```yaml
---
name: my-skill-name
description: What it does and when to use it.
---
```

**Description is for triggering only.** Claude uses only name + description
to decide whether to load the skill.

**Include:**
- What the skill does (1 sentence)
- When to use it (specific contexts, file types, user phrases)

**Do NOT include:**
- Keywords lists — redundant if description is well-written
- Completion criteria ("Done when:") — put in SKILL.md body
- Execution details — put in SKILL.md body
- Success metrics — put in SKILL.md body

```yaml
# Bad: bloated
description: "Edit articles. Done when: no stop-words. Keywords: edit"

# Good: lean trigger
description: "Edit articles for clarity and conciseness.
  Use when reviewing drafts or improving writing."
```

### Body Structure Patterns

**Workflow-based** (sequential processes):
```markdown
# Skill Name

## Overview
[1-2 sentences]

## Workflow
1. Step one
2. Step two
3. Step three

## Details
[Expand on steps as needed]
```

**Task-based** (tool collections):
```markdown
# Skill Name

## Overview
[1-2 sentences]

## Quick Start
[Most common operation]

## Operations
### Operation A
### Operation B
```

**Reference-based** (standards/specs):
```markdown
# Skill Name

## Overview
[1-2 sentences]

## Guidelines
[Core rules]

## Examples
[Concrete examples]
```

## Output Patterns

### Template Pattern

For consistent output format:

```markdown
## Report Structure

ALWAYS use this template:

# [Title]

## Summary
[One paragraph]

## Findings
- Finding 1
- Finding 2

## Recommendations
1. Action 1
2. Action 2
```

### Examples Pattern

For quality-dependent output, provide input/output pairs:

```markdown
## Commit Messages

**Example 1:**
Input: Added JWT authentication
Output:
feat(auth): implement JWT-based authentication

**Example 2:**
Input: Fixed date display bug
Output:
fix(reports): correct date formatting in timezone conversion
```

## Workflow Patterns

### Sequential Workflow

```markdown
## Process

1. Analyze input (run analyze.py)
2. Validate results (run validate.py)
3. Generate output (run generate.py)
4. Verify output
```

### Conditional Workflow

```markdown
## Workflow

1. Determine task type:
   - **Creating new?** → See "Creation" below
   - **Editing existing?** → See "Editing" below

## Creation
[steps]

## Editing
[steps]
```

### Feedback Loop

```markdown
## Validation Loop

1. Make changes
2. Validate: `python validate.py`
3. If errors: fix and repeat step 2
4. Only proceed when validation passes
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Vague description | Include specific triggers and use cases |
| Too verbose | Challenge each paragraph: "Does Claude need this?" |
| No examples | Add 2-3 concrete input/output pairs |
| Deeply nested references | Keep references one level deep from SKILL.md |
