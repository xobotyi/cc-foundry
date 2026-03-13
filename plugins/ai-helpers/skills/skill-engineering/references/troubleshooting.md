# Skill Troubleshooting

Diagnostic guide for skill failures.

## Quick Diagnosis

- **Skill not found** → [Structure Issues](#structure-issues)
- **Skill not triggering** → [Activation Issues](#activation-issues)
- **Wrong output format** → [Output Issues](#output-issues)
- **Scripts failing** → [Script Issues](#script-issues)
- **References not loading** → [Reference Issues](#reference-issues)

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

### Native Activation Is Unreliable

Skill auto-activation is inherently unreliable. Independent testing measured 20-50% activation rates without enforcement
hooks. This is a systemic limitation, not just a description quality issue.

**Why it happens:** Claude sees skill descriptions in the Skill tool definition and must decide to invoke the tool
before proceeding. In practice, Claude often skips this step and proceeds directly with implementation, especially for
multi-skill prompts.

**Mitigation strategies:**

- **Improve descriptions** — necessary but not sufficient (see below)
- **Enforcement hooks** — `UserPromptSubmit` hooks that force Claude to evaluate each skill before proceeding.
  Forced-eval hooks (where Claude must explicitly state YES/NO for each skill) achieve ~84% activation. The commitment
  mechanism — evaluate → commit → activate — is what makes this work.
- **Manual invocation** — `/skill-name` is always reliable

**Key finding:** simple instruction hooks ("if the prompt matches, use the skill") perform no better than no hook at all
(~20%). The hook must create a structured evaluation and commitment step to be effective.

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
# This prevents auto-triggering — also removes description from
# context entirely, so Claude won't see the skill exists
disable-model-invocation: true
```

**Test with explicit invocation:** Try `/skill-name` directly. If that works, the description needs better trigger terms
— but keep in mind that even good descriptions achieve imperfect auto-activation.

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

**Move critical instructions to end:** Instructions at context end are followed more reliably.

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

4. **Check dependencies:** Are required packages installed?

5. **Check path in SKILL.md:**
   ```markdown
   # Relative to skill directory
   python scripts/validate.py
   ```

## Reference Issues

### References Not Loading

**Use `${CLAUDE_SKILL_DIR}` for all reference paths:**

```markdown
# Good — resolves to absolute path at load time
See `${CLAUDE_SKILL_DIR}/references/guide.md`

# Bad — relative path, ambiguous
See [guide.md](references/guide.md)

# Bad — hardcoded absolute path
See [/full/path/guide.md](/full/path/guide.md)
```

**Keep one level deep:**

```
Good: SKILL.md → references/guide.md

Bad: SKILL.md → references/main.md → references/detail.md
```

**Add explicit read instruction:**

```markdown
Read `${CLAUDE_SKILL_DIR}/references/guide.md` completely before proceeding.
```

## Context Budget Issues

**Symptoms:**

- Warning about excluded skills in Claude Code output
- Descriptions truncated in skill metadata
- Multiple skills loaded but instructions ignored

**Diagnosis:**

1. Count active skills — each adds ~30-50 metadata tokens at startup
2. Check SKILL.md line count — target under 500 lines
3. Check if multiple large skills are co-loaded

**Fixes:**

- Shorten descriptions to under 200 characters
- Move catalog/lookup content from SKILL.md to references
- Set `disable-model-invocation: true` on rarely-used skills (removes description from context entirely — free
  activation budget for others)
- Split overloaded skills into focused ones

## Getting Help

When asking for help, provide:

- Full SKILL.md content
- Expected vs actual behavior
- Exact prompt that failed
- Any error messages
