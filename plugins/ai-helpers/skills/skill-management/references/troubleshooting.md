# Troubleshooting Skills

## Quick Diagnosis

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| Skill never triggers | Description mismatch | Does description match user's words? |
| Skill triggers incorrectly | Description too broad | Is description specific enough? |
| Wrong skill triggers | Overlapping descriptions | Do multiple skills compete? |
| Instructions ignored | Vague or buried | Are instructions prominent and specific? |
| YAML parse error | Frontmatter syntax | Valid YAML? Proper `---` delimiters? |
| Skill not found | Wrong location | Correct path? SKILL.md exists? |

## Detailed Troubleshooting

### Skill Not Triggering

**Check 1: Location**
```bash
# Personal skills
ls ~/.claude/skills/my-skill/SKILL.md

# Project skills
ls .claude/skills/my-skill/SKILL.md
```

**Check 2: Frontmatter validity**

Read SKILL.md and verify:
- Starts with `---` on line 1
- Has closing `---` before content
- `name` and `description` fields present
- No YAML syntax errors (tabs, bad indentation, unquoted special chars)

**Check 3: Description matching**

Compare user's request to description:
- Does description contain keywords user would say?
- Are synonyms covered?
- Are file extensions mentioned (`.pdf`, `.xlsx`)?

**Example fix:**
```yaml
# Before: too narrow
description: Analyze Excel spreadsheets

# After: covers more triggers
description: Analyze Excel spreadsheets, create pivot tables, generate
  charts. Use when working with .xlsx files, spreadsheet data, or
  tabular analysis.
```

### Skill Triggers But Doesn't Work

**Check 1: Instructions clarity**

Are instructions specific enough? Compare:
```markdown
# Vague
Handle errors appropriately.

# Specific
On error, log the error message and return early. Do not raise exceptions.
```

**Check 2: Instructions prominence**

Is key guidance buried? Move critical instructions to:
- Top of relevant section
- Use bold or CAPS for emphasis
- Numbered steps for sequences

**Check 3: Conflicting guidance**

Does the skill contradict itself or Claude's defaults? Look for:
- Ambiguous "sometimes" or "usually"
- Multiple valid interpretations
- Implicit assumptions

### Wrong Skill Activating

**Diagnosis:** List all skills with similar scope. Compare descriptions.

**Fix options:**
1. Make descriptions more distinct
2. Add exclusions: "Use for X, NOT for Y"
3. Use unique terminology in each skill
4. Consider merging if genuinely overlapping

### Multiple Skills Conflicting

When two skills compete:

1. **Check trigger overlap** — Do descriptions share keywords?
2. **Check purpose overlap** — Do they serve the same use case?
3. **Resolution:**
   - If same purpose: merge into one skill
   - If different purposes: make descriptions distinct

### References Not Loading

**Symptom:** Claude doesn't read reference files when it should.

**Check 1: Link syntax**
```markdown
# Correct
See [reference.md](references/reference.md)

# Wrong (absolute path)
See [reference.md](/path/to/references/reference.md)
```

**Check 2: Link prominence**

Is the link visible? Not buried in parentheses or footnotes?

**Check 3: Context clues**

Does SKILL.md indicate when to read the reference?
```markdown
# Good
For database schemas, see [schemas.md](references/schemas.md)

# Bad (no context)
Additional docs in references/
```

### YAML Frontmatter Errors

**Common issues:**

```yaml
# Wrong: tabs instead of spaces
name:	my-skill

# Wrong: unquoted special characters
description: Use for: data analysis

# Wrong: missing quotes on multi-line
description: This is a long
description that spans lines

# Correct
description: "Use for: data analysis"
description: >
  This is a long
  description that spans lines
```

**Validation:** Read file, extract frontmatter, check against [spec.md](spec.md).

### Scripts Not Executing

**Check 1: File exists**
```bash
ls .claude/skills/my-skill/scripts/
```

**Check 2: Executable permission**
```bash
chmod +x .claude/skills/my-skill/scripts/*.py
```

**Check 3: Shebang line**
```python
#!/usr/bin/env python3
```

**Check 4: Dependencies available**

Are required packages installed in the environment?

## Debug Mode

Run Claude Code with debug output:
```bash
claude --debug
```

Look for skill loading errors in output.

## Context Budget Issues

### Claude Doesn't See All Skills

Skill descriptions are loaded into context. If many skills exist, they
may exceed character budget (default 15,000 characters).

**Check:** Run `/context` command. Look for warning about excluded skills.

**Fix:** Set environment variable to increase limit:
```bash
export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000
```

### Skill Description Too Long

If description approaches 1024 characters, consider:
1. Trim redundant phrases
2. Focus on trigger keywords only
3. Move detailed context to SKILL.md body

## Still Not Working?

1. **Simplify:** Strip skill to minimum (just SKILL.md with basic content)
2. **Test trigger:** Ask explicitly "Use the X skill to do Y"
3. **Check context:** Run `/context` to see if skill is loaded
4. **Check logs:** Run `claude --debug` for skill loading errors
5. **Compare:** Test against a known-working skill with similar structure
