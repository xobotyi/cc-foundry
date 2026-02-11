# Skill Iteration

Skills improve through observation and refinement. Apply prompt engineering
debugging techniques—when Claude doesn't follow instructions, the prompt
needs work, not stronger language.

## Iteration Cycle

```
Use skill → Observe behavior → Identify gap → Refine → Repeat
```

## Common Refinements

### Activation Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Doesn't trigger | Description misses user's words | Broaden domain claim, add trigger keywords |
| Triggers too often | Description too broad | Add exclusions: "Use for X, NOT for Y" |
| Wrong skill activates | Overlapping descriptions | Make descriptions more distinct |

### Output Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Wrong format | No format specification | Add explicit format with example output |
| Missing details | Instructions vague | Be specific: "Include X, Y, Z" |
| Ignores instructions | Buried in prose | Move to end, use XML tags, add structure |
| Inconsistent quality | Ambiguous guidance | Add few-shot examples, resolve conflicts |
| Partial completion | Steps unclear | Use numbered sequential steps |
| Ignores constraints | Not emphasized | Place in `<constraints>` tags at end |

## Refinement Patterns

### Restructuring with XML Tags

Before:
```markdown
Filter out test accounts when querying. Also validate
input and check permissions before running.
```

After:
```markdown
<constraints>
- ALWAYS filter test accounts: `WHERE account_type != 'test'`
- Validate input format before processing
- Check permissions before write operations
</constraints>
```

### Adding Explicit Format

Before:
```markdown
Return the analysis results.
```

After:
```markdown
<output_format>
Return as JSON:
\`\`\`json
{"summary": "...", "findings": [...], "confidence": "high|medium|low"}
\`\`\`
</output_format>
```

### Moving Critical Rules to End

Before (buried in middle):
```markdown
## Process
1. Read input
2. NEVER delete without confirmation
3. Transform data
4. Write output
```

After (at end):
```markdown
## Process
1. Read input
2. Transform data
3. Write output

## CRITICAL
NEVER delete without explicit user confirmation.
```

### Broadening Domain Claim

Before — narrow verb list:
```yaml
description: >-
  Process PDF files. Use when extracting text or filling forms.
```

After — broad domain claim with philosophy anchor:
```yaml
description: >-
  Extract and transform PDF documents: text extraction, form
  filling, merging, splitting. Invoke whenever task involves any
  interaction with PDF files — reading, creating, editing, or
  converting documents.
```

### Narrowing Scope

When a skill triggers too often, add exclusions rather than
narrowing the domain claim:

Before — too broad, no boundaries:
```yaml
description: >-
  Data analysis and processing. Invoke whenever task involves
  any interaction with data.
```

After — broad claim with explicit exclusions:
```yaml
description: >-
  Tabular data analysis: statistical patterns in structured
  datasets. Invoke whenever task involves any interaction with
  CSV or Excel files. NOT for text analysis or database queries.
```

### Splitting Overloaded Skills

When a skill does too much:

1. Identify distinct capabilities
2. Create focused skill for each
3. Ensure descriptions don't overlap

### Promoting to References

When SKILL.md grows beyond 500 lines:

1. Identify detailed sections
2. Move to `references/<topic>.md`
3. Replace with: "For details, see [topic.md](references/topic.md)"

## When to Stop

A skill is done when:

- Triggers correctly for target cases
- Instructions followed consistently
- No recurring complaints
- Maintenance burden is low

Effectiveness over perfection.
