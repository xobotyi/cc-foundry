# ai-helpers Plugin

Skills and output styles for engineering AI artifacts: prompts, skills, agents, and output styles.

## Skills

- **`prompt-engineering`** — prompt design techniques for LLMs: structure, examples, reasoning patterns, optimization
- **`skill-engineering`** — design and iterate Claude Code skills: SKILL.md structure, description formulas, content
  architecture, quality evaluation
- **`subagent-engineering`** — Claude Code subagent lifecycle: creation, configuration, agent teams, worktree isolation,
  evaluation, troubleshooting
- **`output-style-engineering`** — design output styles that replace the system prompt: persona, tone, behavioral rules,
  non-coding domains, evaluation framework
- **`prompt-terser`** — adherence-driven terseness audit for iteratively-edited prompts: same-thought-fewer-words cuts
  with U-curve discipline, narrative-vs-structural distinction, and three-check falsification gate (verbosity-type →
  terseness → behavior preservation)
- **`claude-code-sdk`** — Claude Code extensibility reference: plugins, hooks, skills, subagents, agent teams, MCP,
  output styles, settings, Agent SDK

## Output Styles

- **`ai-engineer`** — collaborative AI engineering persona: direct communication, no sycophancy, adversarial
  self-checks, iterative refinement

## Skill Dependencies

```
prompt-engineering (foundation)
    ↑
    ├── skill-engineering (skills are prompts)
    ├── subagent-engineering (agent prompts are system prompts)
    ├── output-style-engineering (styles are system prompts)
    └── prompt-terser (audits existing prompts for drift)

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
