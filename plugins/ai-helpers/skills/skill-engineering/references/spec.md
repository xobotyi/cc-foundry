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

- `name` (required): 1-64 chars, lowercase, hyphens only, must match directory
- `description` (required): 1-1024 chars, describes what AND when
- `license`: License name or reference
- `compatibility`: 1-500 chars, environment requirements
- `metadata`: Arbitrary key-value pairs
- `allowed-tools`: Comma-delimited tool list (experimental). In Claude Code, grants tool access without per-use approval
  while the skill is active. Has no effect in the Agent SDK.

### Claude Code Extensions

- `argument-hint`: Hint for autocomplete: `[issue-number]`
- `disable-model-invocation` (default: `false`): Prevent Claude from auto-triggering. Also **removes the description
  from context entirely** — Claude won't see the skill exists unless explicitly invoked. This frees description budget
  for other skills.
- `user-invocable` (default: `true`): Show in `/` menu. Setting `false` hides from menu but does NOT block Skill tool
  access — use `disable-model-invocation` for that.
- `model` (default: inherit): Model override: `sonnet`, `opus`, `haiku`
- `context`: Set to `fork` for subagent execution
- `agent` (default: general-purpose): Subagent type when `context: fork`
- `hooks`: Skill-scoped lifecycle hooks

### Extended Thinking

Include the word `ultrathink` anywhere in the skill content to enable extended thinking mode when the skill is active.
This is a Claude Code keyword that activates deeper reasoning for complex tasks.

## Name Field Rules

- Lowercase letters, numbers, hyphens only: `a-z`, `0-9`, `-`
- Cannot start or end with hyphen
- No consecutive hyphens: `my--skill` is invalid
- Must match parent directory name
- Cannot contain: `anthropic`, `claude`

**Naming strategy:** Consider gerund form (verb + -ing) for clarity about what the skill does:

- `processing-pdfs`, `analyzing-spreadsheets`, `managing-databases`
- Noun phrases also work: `pdf-processing`, `code-review`
- Avoid vague names: `helper`, `utils`, `tools`

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

## Description Field

See SKILL.md "Description Formula" for the formula, principles, and good/bad examples. This section covers only
spec-level constraints.

**Avoid in descriptions:**

- Second person: "You can use this to..."
- XML tags (descriptions are plain text)
- Reserved words in skill names that might confuse activation

## Skill Discovery and Precedence

### Location Precedence

When skills share the same name across levels, higher-priority locations win:

```
enterprise > personal > project
```

Plugin skills use a `plugin-name:skill-name` namespace, so they cannot conflict with other levels.

### Nested Directory Discovery

Claude Code automatically discovers skills from `.claude/skills/` directories in subdirectories. If you edit a file in
`packages/frontend/`, Claude Code also looks for skills in `packages/frontend/.claude/skills/`. This supports monorepo
setups where packages have their own skills.

### Instruction Budget

Frontier thinking models reliably follow ~150-200 instructions. Claude Code's own system prompt already consumes ~50 of
those. As instruction count increases, instruction-following quality degrades **uniformly** — the model doesn't just
ignore later instructions, it begins to follow **all** instructions less reliably.

This means: keep SKILL.md focused. A skill with 40 behavioral rules is pushing the limits of what the agent can attend
to alongside its system prompt and other loaded context. If your skill needs that many rules, consider whether some are
truly behavioral (must stay in SKILL.md) vs. catalog content that belongs in references.

## Body Content Guidelines

The body is injected as a user message when the skill is triggered. See SKILL.md "Content Architecture" and "Writing
Instructions" for behavioral rules on what goes where and how to write instructions. This section covers spec-level
details only.

**Token budget:**

- Target under 500 lines for instruction core
- Aim for < 5000 tokens
- Behavioral rules count as core — they stay in SKILL.md even if that pushes past 500 lines
- Remember the instruction budget: ~150-200 instructions is the reliable ceiling for frontier models, and the system
  prompt already claims ~50

## Reference Files

Files in the skill directory that Claude can read when needed.

**When to use references:**

- Detailed documentation (API specs, schemas)
- Large example collections
- Domain-specific knowledge
- Content that applies only sometimes

**How to reference:**

Use `${CLAUDE_SKILL_DIR}` for all reference paths. The variable resolves to the skill's absolute directory path at load
time, so Claude sees unambiguous paths it can pass directly to the Read tool.

```markdown
For form-filling details, see `${CLAUDE_SKILL_DIR}/references/forms.md`.
For complete API reference, see `${CLAUDE_SKILL_DIR}/references/api.md`.
```

**Important:** Keep references one level deep from SKILL.md. Claude may partially read deeply nested references.

**Table of contents for long references:** For reference files longer than 100 lines, include a table of contents at the
top. Claude may preview files with partial reads (`head -100`); a TOC ensures it can see the full scope of available
content and decide which sections to read in full.

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

| Level           | When Loaded     | Token Cost   | Content                        |
| --------------- | --------------- | ------------ | ------------------------------ |
| 1. Metadata     | Startup         | ~30-50/skill | name, description              |
| 2. Instructions | Skill triggered | < 5000       | SKILL.md body                  |
| 3. Resources    | As referenced   | Unlimited    | scripts/, references/, assets/ |

See SKILL.md "Content Architecture" for the behavioral rules on what goes where (behavioral self-sufficiency,
working-resolution vs high-resolution split, route-to-reference tables). This section covers the technical loading
mechanics only.

Agents do not reliably load references. Design for that reality: put every rule and directive the agent needs in
SKILL.md. Use references for content that enriches but isn't required for correctness.

## String Substitutions

- `$ARGUMENTS`: All arguments passed when invoking
- `$ARGUMENTS[N]`: Specific argument by 0-based index
- `$N`: Shorthand for `$ARGUMENTS[N]`
- `${CLAUDE_SESSION_ID}`: Current session ID
- `${CLAUDE_SKILL_DIR}`: Absolute path to the skill's own directory

All `${...}` variables are resolved at skill load time — Claude sees the expanded value, not the variable syntax.

**`$ARGUMENTS` example:**

```markdown
Fix GitHub issue $ARGUMENTS following our coding standards.
```

When user runs `/fix-issue 123`, Claude receives: "Fix GitHub issue 123 following our coding standards."

**`${CLAUDE_SKILL_DIR}` example:**

```markdown
Read `${CLAUDE_SKILL_DIR}/references/api.md` for the full API reference.
```

Claude receives the expanded absolute path, eliminating ambiguity about where the skill's files live. Use this variable
in all reference paths and route-to-reference tables instead of relative paths.
