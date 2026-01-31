# ai-helpers

Claude Code plugin for creating and improving AI artifacts.

## Installation

Add to your Claude Code plugins:

```bash
# Project-level
mkdir -p .claude/plugins
ln -s path/to/ai-helpers .claude/plugins/ai-helpers

# User-level
mkdir -p ~/.claude/plugins
ln -s path/to/ai-helpers ~/.claude/plugins/ai-helpers
```

Or add to your plugin configuration.

## Skills

### prompt-engineering

Craft, debug, and improve prompts for any AI context: skills, agents,
output styles, or standalone prompts.

**Triggers:** Working with AI instructions, debugging prompt behavior,
improving response quality.

### skill-engineering

Create, evaluate, and iterate Claude Code skills.

**Triggers:** Creating SKILL.md files, debugging skill activation,
improving existing skills.

### subagent-engineering

Build, debug, and optimize Claude Code subagents.

**Triggers:** Creating custom agents, debugging agent behavior,
deciding between subagents and other approaches.

### output-style-engineering

Create and improve Claude Code output styles.

**Triggers:** Building personas, customizing Claude's tone,
working with output-styles files.

## Quick Reference

| Task | Skill |
|------|-------|
| Write better prompts | `prompt-engineering` |
| Create a new skill | `skill-engineering` |
| Build a custom agent | `subagent-engineering` |
| Change Claude's personality | `output-style-engineering` |
| Debug AI behavior | Start with `prompt-engineering` |

## Skill Relationships

All skills build on prompt engineering fundamentals:

- **Skills** are prompt templates that load on-demand
- **Subagents** run custom system prompts in isolated context
- **Output styles** replace the main agent's system prompt

When creating any of these, apply `prompt-engineering` techniques.

## License

MIT
