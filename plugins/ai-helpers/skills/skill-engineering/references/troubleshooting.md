# Skill Troubleshooting

Diagnostic guide for skill failures.

## Quick Diagnosis

| Symptom | Check |
|---------|-------|
| Skill not found | [Structure Issues](#structure-issues) |
| Skill not triggering | [Activation Issues](#activation-issues) |
| Wrong output format | [Output Issues](#output-issues) |
| Scripts failing | [Script Issues](#script-issues) |
| References not loading | [Reference Issues](#reference-issues) |

## Structure Issues

### Skill Not Found

**Diagnostic steps:**

1. **Verify location:**
   ```
   Personal: ~/.claude/skills/<name>/SKILL.md
   Project: .claude/skills/<name>/SKILL.md
   Plugin: <plugin>/skills/<name>/SKILL.md
   ```

2. **Verify name matches directory:**
   ```yaml
   # Directory: .claude/skills/my-skill/
   ---
   name: my-skill  # Must match
   ---
   ```

3. **Check frontmatter syntax:**
   ```yaml
   # Valid
   ---
   name: my-skill
   description: Does something
   ---

   # Invalid (missing closing ---)
   ---
   name: my-skill
   description: Does something
   ```

4. **Check name constraints:**
   - Lowercase only
   - No consecutive hyphens (`my--skill` invalid)
   - No leading/trailing hyphens
   - No "anthropic" or "claude" in name

## Activation Issues

### Skill Not Auto-Triggering

**Check description quality:**
```yaml
# Bad
description: Helps with code

# Good
description: >-
  Review Python code for bugs and security issues.
  Use when asked to review, audit, or check Python code.
```

**Check for blocking flag:**
```yaml
# This prevents auto-triggering
disable-model-invocation: true
```

**Test with explicit invocation:**
Try `/skill-name` directly. If that works, the description
needs better trigger terms.

### Skill Triggers Too Often

**Add exclusions:**
```yaml
description: >-
  Analyze CSV files for patterns.
  NOT for text documents, images, or database queries.
```

**Use domain-specific terms:**
```yaml
# Too generic
description: Analyze data

# Specific
description: Statistical analysis of time-series data using pandas
```

## Output Issues

### Wrong Format

**Add explicit format section:**
```markdown
## Output Format

Return results as:
\`\`\`json
{
  "summary": "[1-2 sentences]",
  "findings": ["finding 1", "finding 2"],
  "confidence": "high|medium|low"
}
\`\`\`
```

### Instructions Ignored

**Use clear structure:**
```markdown
## Steps

1. **Validate** — Check input format
2. **Transform** — Apply changes
3. **Verify** — Confirm output

Do not proceed to next step if current step fails.
```

**Move critical instructions to end:**
Instructions at context end are followed more reliably.

## Script Issues

### Script Won't Run

1. **Check executable bit:**
   ```bash
   chmod +x scripts/my-script.py
   ```

2. **Check shebang:**
   ```python
   #!/usr/bin/env python3
   ```

3. **Test manually:**
   ```bash
   python scripts/my-script.py test-input
   ```

4. **Check dependencies:**
   Are required packages installed?

5. **Check path in SKILL.md:**
   ```markdown
   # Relative to skill directory
   python scripts/validate.py
   ```

## Reference Issues

### References Not Loading

**Use relative paths:**
```markdown
# Good
See [guide.md](references/guide.md)

# Bad (absolute)
See [/full/path/guide.md](/full/path/guide.md)
```

**Keep one level deep:**
```
Good: SKILL.md → references/guide.md

Bad: SKILL.md → references/main.md → references/detail.md
```

**Add explicit read instruction:**
```markdown
Read [guide.md](references/guide.md) completely before proceeding.
```

## Context Budget Issues

**Symptoms:**
- Warning about excluded skills
- Descriptions truncated

**Fixes:**
- Shorten descriptions (under 200 chars)
- Move content to references
- Disable rarely-used skills

## Getting Help

When asking for help, provide:

1. Full SKILL.md content
2. Expected vs actual behavior
3. Exact prompt that failed
4. Any error messages
