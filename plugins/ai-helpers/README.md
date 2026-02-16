# ai-helpers

Claude Code plugin for engineering AI artifacts: prompts, skills, agents, and output styles.

## The Problem

**Prompts are deceptively hard.** Instructions like "be helpful" or "write good code" don't
constrain behavior — the AI fills gaps with defaults that may not match your intent. Without
explicit structure, examples, and format specifications, prompts produce inconsistent results.

**Skills don't activate reliably.** You write a skill, but Claude ignores it. The description
doesn't match how users phrase requests, trigger keywords are missing, or the frontmatter is
misconfigured. Vague descriptions like "helps with X" waste the highest-leverage field.

**Agents overstep or quit early.** Without clear scope boundaries, subagents either try to handle
everything (exceeding their mandate) or bail too early (leaving work incomplete). Tool
restrictions and termination conditions need explicit design.

**Output styles revert to defaults.** You want a specific persona, but Claude falls back to base
behavior under pressure. The style instructions compete with the system prompt instead of
replacing it cleanly, or tone examples are missing.

## The Solution

This plugin encodes best practices for each AI artifact type. Each skill follows a router
pattern: SKILL.md provides core instructions and routes to `references/` for detailed content.

All skills build on `prompt-engineering` fundamentals — because every AI artifact is ultimately a
prompt. The `claude-code-sdk` skill provides reference documentation for Claude Code's
extensibility APIs (plugins, hooks, MCP, settings).

The `ai-engineer` output style provides a collaborative persona optimized for artifact work:
direct communication, minimal filler, iterative refinement focus.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install ai-helpers
```

## Skills

### prompt-engineering

Prompt design techniques for LLMs: structure, examples, reasoning patterns, optimization
strategies. Covers zero-shot, few-shot, chain-of-thought, and Claude-specific features (prefill,
extended thinking, system prompts).

**Use when:** Crafting any AI instructions, debugging unexpected behavior, improving response
quality, or working with prompts in any context.

### skill-engineering

Design and iterate Claude Code skills. Covers SKILL.md format, description optimization, router
pattern, reference organization, and activation debugging.

**Use when:** Creating new skills, debugging activation failures, restructuring existing skills,
or evaluating skill quality.

### subagent-engineering

Build Claude Code subagents with clear scope and reliable behavior. Covers agent prompt design,
tool restrictions, termination conditions, and when to use subagents vs. other approaches.

**Use when:** Creating custom agents, debugging agent behavior, or deciding if a subagent is the
right solution for a task.

### output-style-engineering

Create output styles that consistently shape Claude's responses. Covers persona definition,
instruction layering, tone examples, and avoiding conflicts with base behavior.

**Use when:** Building personas, customizing tone, creating domain-specific response patterns, or
debugging style inconsistencies.

### claude-code-sdk

Reference documentation for Claude Code extensibility: plugins, skills, hooks, MCP servers,
output styles, settings, CLAUDE.md, and subagents.

**Use when:** Building Claude Code extensions, understanding configuration hierarchy, debugging
integration issues, or consulting API documentation.

## Output Styles

### ai-engineer

Collaborative persona for AI artifact work. Direct communication without sycophancy, conclusions
first, challenge ideas freely. Optimized for iterative refinement with peer-level interaction.

**Activate:** `/output-style ai-engineer`

## Skill Relationships

```
prompt-engineering (foundation)
    ↑
    ├── skill-engineering (skills are prompts)
    ├── subagent-engineering (agent prompts are system prompts)
    └── output-style-engineering (styles are system prompts)

claude-code-sdk (reference)
    ↑
    └── All engineering skills consult for implementation details
```

## License

MIT
