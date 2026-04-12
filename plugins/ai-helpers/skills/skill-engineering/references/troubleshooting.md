# Skill Troubleshooting

Diagnostic guide for skill failures.

## Quick Diagnosis

- **Skill not found** → [Structure Issues](#structure-issues)
- **Skill not triggering** → [Activation Issues](#activation-issues)
- **Wrong output format** → [Output Issues](#output-issues)
- **Scripts failing** → [Script Issues](#script-issues)
- **References not loading** → [Reference Issues](#reference-issues)
- **Skill excluded from context** → [Token Budget Issues](#token-budget-issues)
- **Skill loads twice or conflicts** → [Plugin Cache Conflicts](#plugin-cache-conflicts)

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

### YAML Multiline Description Bug

The skill indexer does **not** correctly parse YAML multiline block scalars (`>-`, `|`, `|-`, `>`) in the `description`
field. When these are used, the description may be silently truncated, malformed, or omitted entirely from the
`<available_skills>` list. Claude will never see the skill, and it will not auto-trigger.

**Symptom:** Skill exists, name is valid, but it never appears in the Skill tool's available skills list.

**Affected patterns:**

```yaml
# BROKEN — multiline block scalar
description: >-
  Go language conventions and idioms.
  Invoke whenever task involves Go code.

# BROKEN — literal block
description: |
  Go language conventions and idioms.
  Invoke whenever task involves Go code.
```

**Fix — use a plain string or quoted single-line:**

```yaml
# Safe — plain string (no quotes needed for short descriptions)
description: Go language conventions and idioms. Invoke whenever task involves Go code.

# Safe — double-quoted for longer descriptions
description: "Go language conventions, idioms, and toolchain. Invoke whenever task involves any interaction with Go — writing, reviewing, debugging, or understanding Go code."
```

If your description must be long, keep it on one line. The budget for `<available_skills>` is 1% of the context window
(fallback: 8,000 characters) — each entry is capped at 250 characters regardless of total budget.

## Activation Issues

### Native Activation Is Unreliable

Skill auto-activation is inherently unreliable. Independent testing measured 20% activation rates with a simple
instruction hook — no better than no hook at all. This is a systemic limitation, not just a description quality issue.

**Why it happens:** Claude sees skill descriptions in the Skill tool definition and must decide to invoke the tool
before proceeding. In practice, Claude often skips this step and proceeds directly with implementation, especially for
multi-skill prompts. The selection mechanism is pure LLM reasoning — no algorithmic routing or keyword matching at the
code level.

**Measured rates (Scott Spence, 200+ test runs, Haiku 4.5):**

- No hook / simple instruction hook: ~20%
- LLM-eval hook: ~80% (cheaper, faster, but can fail completely on multi-skill prompts)
- Forced-eval hook: ~84% (most consistent; forces YES/NO evaluation per skill before acting)
- Manual `/skill-name` invocation: 100%

**Mitigation strategies:**

- **Improve descriptions** — necessary but not sufficient; optimized descriptions don't break the ~50% systemic ceiling
- **Forced-eval hook** — `UserPromptSubmit` hook that makes Claude explicitly state YES/NO for each skill before
  proceeding; the commitment mechanism is what drives the improvement
- **Manual invocation** — `/skill-name` is always reliable and appropriate for user-triggered-only workflows

**Key finding:** Simple instruction hooks ("if the prompt matches, use the skill") perform no better than no hook
(~20%). The hook must create a structured evaluation and commitment step to be effective.

### Skill Not Auto-Triggering

**Check description quality:**

```yaml
# Bad — no trigger keywords
description: Helps with code

# Good — domain claim + trigger verbs
description: "Go language conventions, idioms, and toolchain. Invoke whenever task involves any interaction with Go — writing, reviewing, debugging, or understanding Go code."
```

**Check for blocking flag:**

```yaml
# This prevents auto-triggering — also removes description from
# context entirely, so Claude won't see the skill exists
disable-model-invocation: true
```

**Test with explicit invocation:** Try `/skill-name` directly. If that works, the description needs better trigger terms
— but keep in mind that even good descriptions hit a ~50% ceiling without a hook.

### Skill Triggers Too Often

**Add exclusions:**

```yaml
description: "Analyze CSV files for patterns. NOT for text documents, images, or database queries."
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

**Move critical instructions to end:** Instructions at context end are followed more reliably (recency bias).

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
   # Use ${CLAUDE_SKILL_DIR} — resolves to absolute path at load time
   python ${CLAUDE_SKILL_DIR}/scripts/validate.py
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

## Token Budget Issues

The `<available_skills>` list embedded in the Skill tool description has a character budget of **1% of the context
window (fallback: 8,000 characters)**. Each entry is capped at 250 characters. When the total exceeds this limit, Claude
Code truncates the list — skills that appear late are silently excluded. Claude cannot see excluded skills and will
never invoke them.

### Symptoms

- Skill exists and has a valid description, but never auto-triggers
- Claude says it doesn't know about a skill you've installed
- Running `/context` shows "excluded skills" or skills marked as over budget

### Diagnosis

1. Run `/context` in Claude Code — look for excluded skills listed in the output
2. Count loaded skills: each adds ~30-300 characters to the budget depending on description length
3. Long descriptions from multiple skills can exhaust the budget quickly

### Fixes

- **Shorten descriptions** — target under 200 characters per skill; this is the highest-leverage fix
- **Move catalog/lookup content** from SKILL.md to references — reduces SKILL.md token weight
- **Set `disable-model-invocation: true`** on rarely-used skills — removes the description from the budget entirely;
  skill is only invocable via `/skill-name` but frees budget for others
- **Split overloaded skills** into focused, narrower skills with shorter descriptions

## Plugin Cache Conflicts

Skills loaded from plugins are discovered from multiple cache locations. If the same plugin is installed in more than
one cache location, the skill may be registered twice — causing double-loading, unexpected behavior, or one version
shadowing another.

### Symptoms

- Skill tool shows duplicate entries for the same skill name
- Running a skill loads unexpected or outdated content
- Plugin update doesn't take effect even after reinstall

### Diagnosis

Check the three plugin cache locations Claude Code scans:

```bash
# User-level cache
ls ~/.claude/plugins/cache/

# Project-level cache
ls .claude/plugins/cache/

# Global Claude Code cache (platform-dependent)
ls ~/Library/Application\ Support/claude-code/plugins/cache/  # macOS
```

Look for the same plugin directory appearing in more than one location.

### Fixes

- **Remove duplicate cache entries** — keep only the most recently installed version
- **Reinstall cleanly** — uninstall the plugin with `/plugin uninstall <name>` before reinstalling
- **Check plugin.json version** — if two copies have the same version string, Claude Code may not detect the conflict;
  bump the version before reinstalling

## Getting Help

When asking for help, provide:

- Full SKILL.md content
- Expected vs actual behavior
- Exact prompt that failed
- Any error messages
- Output of `/context` if token budget is suspected
