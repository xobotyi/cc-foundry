# ai-helpers

Claude Code plugin for engineering AI artifacts: prompts, skills, agents, and output styles.

## The Problem

**Prompts are deceptively hard.** Instructions like "be helpful" or "write good code" don't constrain behavior — the AI
fills gaps with defaults that may not match your intent. Without explicit structure, examples, and format
specifications, prompts produce inconsistent results.

**Skills don't activate reliably.** You write a skill, but Claude ignores it. The description doesn't match how users
phrase requests, trigger keywords are missing, or the frontmatter is misconfigured. Vague descriptions like "helps with
X" waste the highest-leverage field.

**Agents overstep or quit early.** Without clear scope boundaries, subagents either try to handle everything (exceeding
their mandate) or bail too early (leaving work incomplete). Tool restrictions and termination conditions need explicit
design.

**Output styles revert to defaults.** You want a specific persona, but Claude falls back to base behavior under
pressure. The style instructions compete with the system prompt instead of replacing it cleanly, or tone examples are
missing.

## The Solution

This plugin encodes best practices for each AI artifact type. Each skill follows a router pattern: SKILL.md provides
core instructions and routes to `references/` for detailed content.

All skills build on `prompt-engineering` fundamentals — because every AI artifact is ultimately a prompt. The
`claude-code-sdk` skill provides reference documentation for Claude Code's extensibility APIs (plugins, hooks, MCP,
settings).

The `ai-engineer` output style provides a collaborative persona optimized for artifact work: direct communication,
minimal filler, iterative refinement focus.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install ai-helpers
```

## Skills

### prompt-engineering

Prompt design techniques for LLMs: structure, examples, reasoning patterns, optimization strategies. Covers zero-shot,
few-shot, chain-of-thought, and Claude-specific features (prefill, extended thinking, system prompts).

**Use when:** Crafting any AI instructions, debugging unexpected behavior, improving response quality, or working with
prompts in any context.

### skill-engineering

Design and iterate Claude Code skills. Covers SKILL.md format, description optimization, router pattern, reference
organization, and activation debugging.

**Use when:** Creating new skills, debugging activation failures, restructuring existing skills, or evaluating skill
quality.

### subagent-engineering

Claude Code subagent lifecycle: creation, configuration, evaluation, and troubleshooting. Covers agent teams, worktree
isolation, background execution, Agent SDK integration, subagent-scoped hooks, and persistent memory.

**Use when:** Creating custom agents, designing agent teams, debugging agent behavior, or deciding if a subagent is the
right solution for a task.

### output-style-engineering

Design output styles that replace Claude's system prompt. Covers the replace-not-augment principle, persona definition,
non-coding domain patterns (business analysis, content strategy, research), evaluation framework with dimensional
scoring, and iteration diagnostics.

**Use when:** Building personas, customizing tone, creating domain-specific response patterns, evaluating style quality,
or debugging style drift and reversion.

### prompt-terser

Retrospective terseness audit for iteratively-edited prompts and skills. Three-phase workflow: mechanical wording
substitutions, decorative format cleanup, and falsification-gated structural cuts targeting drift patterns (layered
additions, rationale stacking, duplicated constraints, vestigial scaffolding, calibration prose).

**Use when:** Auditing or tightening an existing prompt that has accumulated bloat through many edits — skills, system
prompts, output styles, or agent instructions. Not for newly authored content (use `prompt-engineering` instead).

### claude-code-sdk

Reference documentation for Claude Code extensibility: plugins, skills, hooks, MCP servers, output styles, settings,
CLAUDE.md, and subagents.

**Use when:** Building Claude Code extensions, understanding configuration hierarchy, debugging integration issues, or
consulting API documentation.

## Output Styles

### ai-engineer

Collaborative persona for AI artifact work. Direct communication without sycophancy, conclusions first, challenge ideas
freely. Optimized for iterative refinement with peer-level interaction. Plans vertically — tracer-bullet first, expand
components in vertical passes; rejects horizontal "finish all of one layer before the next" decomposition. Collaborative
AI engineering persona. Direct communication without sycophancy, conclusions first, challenge ideas freely. Adversarial
self-checks on recommendations, frustration-aware responses. Optimized for iterative refinement with peer-level
interaction.

**Activate:** `/output-style ai-engineer`

## Skill Relationships

```
prompt-engineering (foundation)
    ↑
    ├── skill-engineering (skills are prompts)
    ├── subagent-engineering (agent prompts are system prompts)
    ├── output-style-engineering (styles are system prompts)
    └── prompt-terser (audits existing prompts for drift)

claude-code-sdk (reference)
    ↑
    └── All engineering skills consult for implementation details
```

## License

MIT
