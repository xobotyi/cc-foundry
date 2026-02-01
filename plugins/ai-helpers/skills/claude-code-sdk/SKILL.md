---
name: claude-code-sdk
description: >-
  Claude Code reference. Invoke for any question about Claude Code
  capabilities, configuration, or extensibility.
---

# Claude Code SDK

Authoritative reference for Claude Code extensibility and configuration.

## Route to Reference

| Working with | Reference |
|--------------|-----------|
| Skills: SKILL.md, frontmatter, activation, subagent execution | [skills.md](references/skills.md) |
| Subagents: custom agents, tool restrictions, delegation | [subagents.md](references/subagents.md) |
| Plugins: plugin.json, directory structure, distribution | [plugins.md](references/plugins.md) |
| Hooks: lifecycle events, command/prompt/agent hooks | [hooks.md](references/hooks.md) |
| MCP: servers, tools, resources, authentication | [mcp.md](references/mcp.md) |
| Memory: CLAUDE.md, rules, imports, hierarchy | [memory.md](references/memory.md) |
| Output Styles: personas, system prompt modification | [output-styles.md](references/output-styles.md) |
| Settings: scopes, permissions, sandbox, env vars, tools | [settings.md](references/settings.md) |
| Status line: custom display, JSON input, scripts | [statusline.md](references/statusline.md) |
| Usage patterns: context management, verification, scaling | [best-practices.md](references/best-practices.md) |

**Read the relevant reference before making changes.**

## Concepts

<concepts>
**Skill** — Prompt template in `SKILL.md` that extends Claude's capabilities.
Loaded on-demand when description matches user request. Can include
`references/` for detailed content. Invoked with `/skill-name` or automatically.

**Plugin** — Distributable package containing skills, hooks, MCP servers,
output styles. Has `.claude-plugin/plugin.json` manifest. Installed from
marketplace or local path. Skills namespaced as `/plugin:skill`.

**Hook** — Deterministic automation triggered at lifecycle events (tool use,
session start, permission request). Three types: command (shell), prompt
(LLM decision), agent (multi-turn verification). Configured in settings or
plugin.

**MCP Server** — External tool/resource provider via Model Context Protocol.
Connects Claude to databases, APIs, services. Configured per-project,
per-user, or via plugin.

**Output Style** — Persona/behavior modifier via system prompt changes.
Affects how Claude responds without changing capabilities. Built-in:
Default, Explanatory, Learning.

**CLAUDE.md** — Project memory file providing persistent context about
codebase, conventions, instructions. Hierarchy: managed → user → project.
Loaded automatically at session start.

**Subagent** — Isolated context for delegated tasks. Built-in types:
Explore (read-only), Plan (architecture), general-purpose. Custom agents
in `.claude/agents/`.

**Settings** — Configuration hierarchy controlling permissions, model,
hooks, behavior. Scopes: managed → user → project → local.
</concepts>

## Quick Reference

### Skill Locations

| Scope | Path |
|-------|------|
| Personal | `~/.claude/skills/<name>/SKILL.md` |
| Project | `.claude/skills/<name>/SKILL.md` |
| Plugin | `<plugin>/skills/<name>/SKILL.md` |

### Plugin Layout

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json        # Manifest (required)
├── skills/
│   └── skill-name/
│       ├── SKILL.md
│       └── references/
├── hooks/
│   └── hooks.json
├── output-styles/
├── .mcp.json
└── README.md
```

### Hook Events

| Event | When | Can Block |
|-------|------|-----------|
| `PreToolUse` | Before tool | Yes |
| `PostToolUse` | After tool success | No |
| `Stop` | Claude finishes | Yes |
| `SessionStart` | Session begins | No |

### Settings Scopes

| Scope | Location | Shared |
|-------|----------|--------|
| Managed | System path | Org-wide |
| User | `~/.claude/settings.json` | No |
| Project | `.claude/settings.json` | Git |
| Local | `.claude/settings.local.json` | No |

## When to Use This Skill

- Creating plugins, skills, hooks, or output styles
- Debugging activation failures or hook issues
- Understanding Claude Code configuration hierarchy
- Setting up MCP servers or tool integration
- Writing or modifying CLAUDE.md files
- Any question about Claude Code internals
