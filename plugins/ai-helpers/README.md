# ai-helpers

A Claude Code plugin for creating and improving AI artifacts.

## The Problem

Creating AI artifacts — prompts, skills, agents, output styles — is harder than it looks. Common issues:

**Prompts are too vague.** Instructions like "be helpful" or "write good code" don't constrain behavior.
The AI fills gaps with defaults that may not match your intent.

**Skills don't activate.** You write a skill, but Claude ignores it. The trigger conditions are unclear,
the description doesn't match how users phrase requests, or the frontmatter is misconfigured.

**Agents do too much or too little.** Without clear scope boundaries, subagents either try to handle
everything (exceeding their mandate) or bail too early (leaving work incomplete).

**Output styles don't stick.** You want a specific persona, but Claude reverts to default behavior.
The style instructions compete with the base system prompt instead of complementing it.

## The Solution

This plugin provides skills that encode best practices for each artifact type. Each skill includes:

- **Creation patterns** — how to build from scratch
- **Evaluation criteria** — how to assess quality
- **Iteration techniques** — how to debug and improve
- **Reference examples** — what good looks like

All skills build on `prompt-engineering` fundamentals — because every AI artifact is ultimately a prompt.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install ai-helpers
```

## Skills

### prompt-engineering

Foundation skill for all AI instruction design. Covers constraint writing, example selection,
edge case handling, and iterative refinement.

**Use when:** Writing any AI instructions, debugging unexpected behavior, improving response quality.

### skill-engineering

Create Claude Code skills that activate reliably and provide useful guidance. Covers SKILL.md structure,
trigger optimization, reference organization, and the router pattern.

**Use when:** Creating new skills, debugging activation failures, restructuring existing skills.

### subagent-engineering

Build subagents with clear scope and reliable behavior. Covers prompt design for isolated context,
tool selection, termination conditions, and when to use agents vs. other approaches.

**Use when:** Creating custom agents, debugging agent behavior, deciding if a subagent is the right solution.

### output-style-engineering

Create output styles that consistently shape Claude's responses. Covers persona definition,
instruction layering, and avoiding conflicts with base behavior.

**Use when:** Building personas, customizing tone, creating domain-specific response patterns.

### claude-code-sdk

Reference for Claude Code extensibility: plugins, skills, hooks, MCP, output styles, settings,
CLAUDE.md, subagents.

**Use when:** Building Claude Code extensions, understanding configuration hierarchy, debugging
integration issues.

## Output Styles

### ai-engineer

Persona optimized for AI artifact work: direct communication, minimal fluff, iterative refinement focus.

**Activate:** `/output-style ai-engineer`

## Skill Relationships

```
prompt-engineering (foundation)
    ↑
    ├── skill-engineering
    ├── subagent-engineering
    └── output-style-engineering

claude-code-sdk (reference)
    ↑
    └── All engineering skills consult for implementation details
```

## License

MIT
