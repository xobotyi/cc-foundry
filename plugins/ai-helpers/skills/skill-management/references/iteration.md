# Iterating on Skills

Skills rarely succeed on first attempt. Improvement comes from observing
real usage and refining based on evidence.

## The Iteration Cycle

```
Use skill on real task
        ↓
Observe Claude's behavior
        ↓
Identify gaps or failures
        ↓
Refine skill
        ↓
    (repeat)
```

## Common Iteration Triggers

### Skill Not Activating

**Symptom:** User asks relevant question, skill doesn't trigger.

**Likely cause:** Description doesn't match user's language.

**Fix:** Add trigger terms to description. Include synonyms, file
extensions, common phrasings.

### Claude Ignoring Instructions

**Symptom:** Skill triggers but Claude doesn't follow specific guidance.

**Likely causes:**
- Instructions too vague
- Buried in wall of text
- Conflicting with Claude's defaults

**Fix:** Make instructions more prominent, more specific, or use stronger
language ("MUST", "ALWAYS").

### Claude Over-Following Instructions

**Symptom:** Claude applies skill guidance where it doesn't fit.

**Likely cause:** Description too broad.

**Fix:** Narrow description, add exclusions ("Use for X, NOT for Y").

### Wrong Skill Activating

**Symptom:** Different skill triggers instead of intended one.

**Likely cause:** Overlapping descriptions.

**Fix:** Make descriptions more distinct. Use specific terminology unique
to each skill.

### Missing Context

**Symptom:** Claude struggles with domain-specific details.

**Fix:** Add reference file with needed context. Update SKILL.md to point
to it.

## Iteration Patterns

### Strengthening Instructions

Before:
```markdown
Filter out test accounts when querying.
```

After:
```markdown
ALWAYS filter test accounts: `WHERE account_type != 'test'`
```

### Adding Missing Triggers

Before:
```yaml
description: Process PDF files.
```

After:
```yaml
description: Process PDF files. Use when working with .pdf files,
  extracting text from documents, filling forms, or merging PDFs.
```

### Splitting Overloaded Skills

If a skill tries to do too much:

1. Identify distinct capabilities
2. Create focused skills for each
3. Make descriptions non-overlapping

### Merging Related Skills

If multiple skills have confusing overlap:

1. Identify shared purpose
2. Combine into one skill with clear sections
3. Update description to cover all use cases

### Promoting to References

When SKILL.md grows too long:

1. Identify detailed sections
2. Move to `references/detailed-topic.md`
3. Replace with link: "For details, see [detailed-topic.md](references/detailed-topic.md)"

## Feedback Sources

### Direct Observation

Use the skill yourself. Note:
- Where you had to provide extra context
- Where Claude made wrong assumptions
- What worked well

### User Feedback

Ask users:
- Does the skill activate when expected?
- Are instructions clear?
- What's missing?

### Error Patterns

Track recurring issues:
- Same question asked multiple times → add to skill
- Same mistake made repeatedly → add explicit guidance
- Same workaround needed → automate in skill

## When to Stop Iterating

A skill is "done enough" when:
- It triggers correctly for target use cases
- Instructions are followed consistently
- No recurring user complaints
- Maintenance burden is low

Perfection isn't the goal — effectiveness is.

## Versioning Considerations

For team skills, consider documenting changes:

```markdown
## Changelog

- 2025-01: Added form-filling workflow
- 2024-12: Narrowed description to reduce false triggers
- 2024-11: Initial version
```

Keep brief. This is for humans, not Claude.
