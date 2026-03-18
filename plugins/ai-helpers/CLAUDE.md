# ai-helpers Plugin

Skills and output styles for engineering AI artifacts: prompts, skills, agents, and output styles.

## Skills

| Skill                      | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `prompt-engineering`       | Prompt design techniques for LLMs       |
| `skill-engineering`        | Design and iterate Claude Code skills   |
| `subagent-engineering`     | Build and debug Claude Code subagents   |
| `output-style-engineering` | Create Claude Code output styles        |
| `claude-code-sdk`          | Reference for Claude Code extensibility |

## Output Styles

| Style         | Purpose                                    |
| ------------- | ------------------------------------------ |
| `ai-engineer` | Collaborative persona for AI artifact work |

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

When creating skills, subagents, or output styles, invoke `prompt-engineering` for instruction design and
`claude-code-sdk` for API/configuration details.

## Plugin Scope

This plugin covers AI artifact engineering within Claude Code:

- Creating and improving prompts for any AI context
- Building Claude Code skills, subagents, and output styles
- Understanding Claude Code extensibility (plugins, hooks, MCP, settings)

It does not cover:

- General software engineering workflows (see `the-coder`)
- Language-specific conventions (see language plugins)
- Git workflows (see `git-commit`)

## Conventions

- Skills reference `prompt-engineering` via `<prerequisite>` blocks because all AI artifacts are fundamentally prompts
- Skills with external documentation dependencies maintain `.dev/reference-inventory.json` for doc fetching via CLI
  tools
- For skill structure rules, description formulas, and content architecture — invoke `skill-engineering`
