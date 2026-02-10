# ai-helpers Plugin

Skills and output styles for creating and improving AI artifacts.

## Skills

| Skill | Purpose |
|-------|---------|
| `prompt-engineering` | Craft, debug, improve prompts for any AI context |
| `skill-engineering` | Create, evaluate, iterate Claude Code skills |
| `subagent-engineering` | Build and debug Claude Code subagents |
| `output-style-engineering` | Create Claude Code output styles |
| `claude-code-sdk` | Reference for Claude Code extensibility (plugins, hooks, MCP, settings) |

## Output Styles

| Style | Purpose |
|-------|---------|
| `ai-engineer` | Persona for designing AI artifacts (prompts, skills, agents, styles) |

## Skill Dependencies

```
prompt-engineering (foundation)
    ↑
    ├── skill-engineering (skills are prompts)
    ├── subagent-engineering (agent prompts are system prompts)
    └── output-style-engineering (styles are system prompts)

claude-code-sdk (reference)
    ↑
    └── All engineering skills consult SDK docs for implementation details
```

When writing skills, subagents, or output styles, invoke `prompt-engineering`
for instruction design and `claude-code-sdk` for API/configuration details.

## Skill Structure Pattern

Each skill follows the same structure:

```
skill-name/
├── SKILL.md           # Main file: frontmatter + core instructions
├── references/        # Detailed docs loaded on-demand
│   ├── spec.md        # Technical specification
│   ├── creation.md    # How to create from scratch
│   ├── evaluation.md  # Quality criteria
│   └── iteration.md   # Improvement patterns
└── .dev/              # Development artifacts (not shipped)
    └── reference/     # Source materials used during creation
```

## Conventions

**Descriptions:** Use `what + when` formula:
```yaml
description: >-
  [What it does]. Use when [specific trigger scenarios].
```

**References:** Route to specific files instead of duplicating content.
Use a routing table in SKILL.md to direct users.

**Prompt engineering:** All AI artifact skills reference `prompt-engineering`
because prompts are foundational to skills, subagents, and output styles.


<claude-mem-context>
# Recent Activity

### Feb 2, 2026

| ID | Time | T | Title | Read |
|----|------|---|-------|------|
| #6771 | 8:53 PM | ✅ | Simplified ai-helpers Plugin Installation Instructions to Use Marketplace Commands | ~317 |
| #6768 | " | 🔵 | Reviewed AI Helpers Plugin Documentation and Skill Relationships | ~421 |
</claude-mem-context>