# Skill Technical Specification

## Directory Structure

```
skill-name/
├── SKILL.md              # Required: main instructions
├── references/           # Optional: additional documentation
│   ├── guide.md
│   └── examples.md
├── scripts/              # Optional: executable code
│   └── helper.py
└── assets/               # Optional: templates, data files
    └── template.json
```

## SKILL.md Format

```markdown
---
name: skill-name
description: What it does and when to use it
---

# Skill Title

[Markdown instructions]
```

## Frontmatter Fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | 1-64 chars, lowercase, hyphens only, must match directory |
| `description` | Yes | 1-1024 chars, describes what AND when |
| `license` | No | License name or reference |
| `compatibility` | No | 1-500 chars, environment requirements |
| `metadata` | No | Arbitrary key-value pairs |
| `allowed-tools` | No | Space-delimited tool list (experimental) |

### Claude Code Extensions

| Field | Default | Description |
|-------|---------|-------------|
| `argument-hint` | — | Hint for autocomplete: `[issue-number]` |
| `disable-model-invocation` | `false` | Prevent Claude from auto-triggering |
| `user-invocable` | `true` | Show in `/` menu |
| `model` | inherit | Model override: `sonnet`, `opus`, `haiku` |
| `context` | — | Set to `fork` for subagent execution |
| `agent` | general-purpose | Subagent type when `context: fork` |
| `hooks` | — | Skill-scoped lifecycle hooks |

## Name Field Rules

- Lowercase letters, numbers, hyphens only: `a-z`, `0-9`, `-`
- Cannot start or end with hyphen
- No consecutive hyphens: `my--skill` is invalid
- Must match parent directory name
- Cannot contain: `anthropic`, `claude`

**Valid:**
```
pdf-processing
code-review
data-analysis-v2
```

**Invalid:**
```
PDF-Processing     # uppercase
-pdf               # starts with hyphen
my--skill          # consecutive hyphens
claude-helper      # reserved word
```

## Description Best Practices

The description is the **primary signal** for skill activation. Claude
reads all skill descriptions at startup and matches your request against
them.

**Structure:**
```
[What it does] [When to use it/trigger scenarios]
```

**Good:**
```yaml
description: >-
  Extract text and tables from PDF files, fill forms, merge documents.
  Use when working with PDF files or when the user mentions PDFs,
  forms, or document extraction.
```

**Bad:**
```yaml
description: Helps with documents  # Too vague
```

**Include:**
- Specific capabilities
- Trigger keywords users might say
- File types or domains covered

**Avoid:**
- Vague terms: "helps with", "assists"
- Second person: "You can use this to..."
- XML tags in description

## Body Content Guidelines

The body is injected as a user message when the skill is triggered.
Apply prompt engineering principles throughout.

**Recommended structure:**
```markdown
# [Purpose Statement]

## Quick Start
[Minimal guidance to get started]

## Instructions
[Detailed steps, numbered if sequential]
[Use XML tags for multi-part instructions]

## Examples
[Input/output pairs for clarity — few-shot prompting]

## Output Format
[Explicit format specification with example]

## Edge Cases
[What to do in unusual situations]

## References
[Links to reference files for deep dives]

## CRITICAL
[Most important rules — placement at end improves compliance]
```

**Token budget:**
- Keep under 500 lines
- Aim for < 5000 tokens
- Move detailed content to reference files

**Prompt engineering tips:**
- Use XML tags (`<instructions>`, `<constraints>`, `<output_format>`)
- Place critical rules at the end
- Include few-shot examples
- Be specific about output format

## Reference Files

Files in the skill directory that Claude can read when needed.

**When to use references:**
- Detailed documentation (API specs, schemas)
- Large example collections
- Domain-specific knowledge
- Content that applies only sometimes

**How to reference:**
```markdown
For form-filling details, see [FORMS.md](FORMS.md).
For complete API reference, see [reference/api.md](reference/api.md).
```

**Important:** Keep references one level deep from SKILL.md. Claude may
partially read deeply nested references.

## Scripts Directory

Executable code Claude can run via Bash tool.

**When to use scripts:**
- Deterministic operations (validation, parsing)
- Complex transformations
- Operations better expressed in code than prose

**Script principles:**
- Self-contained or document dependencies
- Handle errors gracefully—don't punt to Claude
- Include helpful error messages
- Document constants (no "magic numbers")

**Example reference in SKILL.md:**
```markdown
Run validation:
\`\`\`bash
python scripts/validate.py input.json
\`\`\`
```

## Assets Directory

Static resources Claude references by path but doesn't load into context.

**Contents:**
- Templates (HTML, JSON, YAML)
- Configuration examples
- Binary files (images, fonts)

**Difference from references:**
- `references/`: Text loaded into context via Read
- `assets/`: Files manipulated by path, not loaded

## Progressive Disclosure

Skills use three-level loading:

| Level | When Loaded | Token Cost | Content |
|-------|-------------|------------|---------|
| 1. Metadata | Startup | ~30-50/skill | name, description |
| 2. Instructions | Skill triggered | < 5000 | SKILL.md body |
| 3. Resources | As referenced | Unlimited | scripts/, references/, assets/ |

**Design for this:** Keep SKILL.md focused. Move deep dives to references.
Claude loads references only when instructions mention them.

## String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` | Specific argument by 0-based index |
| `$N` | Shorthand for `$ARGUMENTS[N]` |
| `${CLAUDE_SESSION_ID}` | Current session ID |

**Example:**
```markdown
Fix GitHub issue $ARGUMENTS following our coding standards.
```

When user runs `/fix-issue 123`, Claude receives:
"Fix GitHub issue 123 following our coding standards."
