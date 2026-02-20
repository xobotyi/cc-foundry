---
name: claude-code-sdk
description: >-
  Claude Code extensibility and configuration reference: plugins, hooks, skills, subagents,
  MCP servers, output styles, memory, settings, and model configuration. Invoke whenever
  Claude Code itself is the subject — questions, configuration, building extensions,
  debugging, or understanding internals.
---

# Claude Code SDK

Authoritative reference for Claude Code extensibility and configuration.

## Route to Reference

| Working with | Reference |
|--------------|-----------|
| Skills: SKILL.md, frontmatter, invocation, nested discovery, subagent execution | [skills.md](references/skills.md) |
| Subagents: custom agents, tool restrictions, persistent memory, worktree isolation, teams | [subagents.md](references/subagents.md) |
| Plugins: plugin.json, settings.json, LSP, directory structure, marketplaces | [plugins.md](references/plugins.md) |
| Hooks: lifecycle events, command/prompt/agent hooks | [hooks.md](references/hooks.md) |
| MCP: servers, tools, resources, authentication, tool search | [mcp.md](references/mcp.md) |
| Memory: CLAUDE.md, auto memory, rules, imports, hierarchy | [memory.md](references/memory.md) |
| Model config: aliases, effort levels, extended context, providers | [model-config.md](references/model-config.md) |
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
LSP servers, output styles, and default settings. Has optional
`.claude-plugin/plugin.json` manifest. Installed from marketplace or local
path. Skills namespaced as `/plugin:skill`.

**Hook** — Deterministic automation triggered at 15 lifecycle events (tool use,
session start/end, permission request, subagent lifecycle, teammate/task
events). Three types: command (shell), prompt (LLM decision), agent
(multi-turn verification). Configured in settings, plugin, or frontmatter.

**MCP Server** — External tool/resource provider via Model Context Protocol.
Connects Claude to databases, APIs, services. Supports stdio, HTTP, SSE
transports and OAuth authentication. Configured per-project, per-user,
or via plugin.

**Output Style** — Persona/behavior modifier via system prompt changes.
Affects how Claude responds without changing capabilities. Built-in:
Default, Explanatory, Learning.

**CLAUDE.md** — Project memory file providing persistent context about
codebase, conventions, instructions. Hierarchy: managed → user → project.
Loaded automatically at session start. Auto memory (`MEMORY.md`) stores
Claude's own learnings per project.

**Subagent** — Isolated context for delegated tasks. Built-in types:
Explore (read-only), Plan (architecture), general-purpose. Custom agents
in `.claude/agents/`. Supports persistent memory, worktree isolation.
Agent teams coordinate multiple subagents across sessions.

**Settings** — Configuration hierarchy controlling permissions, model,
hooks, behavior. Scopes: managed → user → project → local.
</concepts>

## Quick Reference

### Skill Locations

| Scope | Path |
|-------|------|
| Enterprise | Managed settings |
| Personal | `~/.claude/skills/<name>/SKILL.md` |
| Project | `.claude/skills/<name>/SKILL.md` |
| Plugin | `<plugin>/skills/<name>/SKILL.md` |

### Plugin Layout

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json        # Manifest (optional)
├── skills/
│   └── skill-name/
│       ├── SKILL.md
│       └── references/
├── agents/                # Custom subagents
├── hooks/
│   └── hooks.json
├── output-styles/
├── settings.json            # Default settings (agent key only)
├── .mcp.json
├── .lsp.json
└── README.md
```

### Hook Events (15)

| Event | When | Can Block |
|-------|------|-----------|
| `SessionStart` | Session begins/resumes | No |
| `UserPromptSubmit` | Before prompt processing | Yes |
| `PreToolUse` | Before tool executes | Yes |
| `PermissionRequest` | Permission dialog shown | Yes |
| `PostToolUse` | After tool success | No |
| `PostToolUseFailure` | After tool failure | No |
| `Notification` | Notification sent | No |
| `SubagentStart` | Subagent spawned | No |
| `SubagentStop` | Subagent finishes | Yes |
| `Stop` | Claude finishes responding | Yes |
| `TeammateIdle` | Teammate going idle | Yes |
| `TaskCompleted` | Task marked complete | Yes |
| `ConfigChange` | Config file changes | Yes |
| `PreCompact` | Before compaction | No |
| `SessionEnd` | Session terminates | No |

### Settings Scopes

| Scope | Location | Shared |
|-------|----------|--------|
| Managed | System path | Org-wide |
| User | `~/.claude/settings.json` | No |
| Project | `.claude/settings.json` | Git |
| Local | `.claude/settings.local.json` | No |

