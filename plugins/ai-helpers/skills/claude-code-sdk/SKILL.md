---
name: claude-code-sdk
description: >-
  Claude Code extensibility and configuration reference: plugins, hooks, skills, subagents,
  MCP servers, output styles, memory, settings, and model configuration. Invoke whenever
  Claude Code itself is the subject — questions, configuration, building extensions,
  debugging, or understanding internals.
---

# Claude Code SDK

Authoritative reference for Claude Code extensibility and configuration. Use this skill
when building, configuring, or debugging any Claude Code extension mechanism.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Skills | [skills.md](references/skills.md) | Frontmatter fields, invocation control matrix, string substitutions, dynamic context injection, subagent execution, nested discovery, sharing |
| Subagents | [subagents.md](references/subagents.md) | Built-in agents table, frontmatter fields, permission modes, tool control, preloading skills, persistent memory, worktree isolation, CLI-defined agents, teams |
| Plugins | [plugins.md](references/plugins.md) | Plugin manifest schema, component paths, marketplace schema, source types, strict mode, version resolution, LSP server table, caching, validation |
| Hooks | [hooks.md](references/hooks.md) | All 15 event details (input fields, output schemas, exit code behavior), matcher patterns, hook types (command/prompt/agent), async hooks, security |
| MCP | [mcp.md](references/mcp.md) | Server installation (HTTP/SSE/stdio), scopes, OAuth authentication, environment variable expansion, managed MCP config, tool search, plugin-provided servers |
| Memory | [memory.md](references/memory.md) | CLAUDE.md hierarchy and loading, auto memory structure, import syntax, modular rules with path scoping, organization-level management |
| Model config | [model-config.md](references/model-config.md) | Model aliases, setting methods, effort levels, extended context (1M), opusplan mode, third-party provider pinning, prompt caching env vars |
| Output styles | [output-styles.md](references/output-styles.md) | Built-in styles, frontmatter fields, keep-coding-instructions flag, comparison with CLAUDE.md/agents/skills |
| Settings | [settings.md](references/settings.md) | Scope hierarchy, permission rule syntax, sandbox config, common settings table, environment variables (API, behavior, feature toggles, paths), tools list |
| Status line | [statusline.md](references/statusline.md) | Configuration, JSON input schema with all fields, ANSI colors, clickable links, caching, plugin delivery |
| Best practices | [best-practices.md](references/best-practices.md) | Context management, verification patterns, explore-plan-code workflow, CLAUDE.md authoring, session management, automation/scaling |

Read the relevant reference before making detailed changes. The rules below cover
the decision framework; references provide field-level schemas and implementation details.

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
codebase, conventions, instructions. Hierarchy: managed > user > project.
Loaded automatically at session start. Auto memory (`MEMORY.md`) stores
Claude's own learnings per project.

**Subagent** — Isolated context for delegated tasks. Built-in types:
Explore (read-only), Plan (architecture), general-purpose. Custom agents
in `.claude/agents/`. Supports persistent memory, worktree isolation.
Agent teams coordinate multiple subagents across sessions.

**Settings** — Configuration hierarchy controlling permissions, model,
hooks, behavior. Scopes: managed > user > project > local.
</concepts>

## Choosing the Right Extension Mechanism

Use these rules when deciding how to extend Claude Code. Each mechanism serves a
different purpose; choosing wrong causes friction or failure.

### Skills vs Subagents vs Hooks vs MCP vs CLAUDE.md

- **Use CLAUDE.md** for persistent project context that applies to every session:
  coding conventions, repo structure, build commands, team practices. It loads
  automatically — no invocation needed. Keep it concise; bloated CLAUDE.md causes
  instruction drift.

- **Use skills** for reusable domain expertise or workflows that load on-demand.
  Skills load only when relevant, keeping context clean when not needed. Two
  content patterns:
  - **Reference content** — knowledge Claude applies alongside conversation
    (conventions, patterns, style guides). Runs inline, auto-triggered.
  - **Task content** — step-by-step actions (deploy, commit, generate). Runs
    in subagent (`context: fork`), manual invocation
    (`disable-model-invocation: true`).

- **Use subagents** for isolated delegated work with tool restrictions or when
  output is verbose and should not consume main context. Custom agents in
  `.claude/agents/` get their own system prompt, tool set, and permissions.
  Subagents cannot spawn other subagents.

- **Use hooks** for deterministic automation that must always happen — formatting
  after edits, blocking writes to protected paths, injecting context at session
  start. Unlike CLAUDE.md instructions (advisory), hooks are guaranteed to run.

- **Use MCP servers** for connecting to external services: databases, APIs, issue
  trackers. MCP is the integration layer — use it when Claude needs tools or
  resources from outside the local environment.

- **Use output styles** when you need to change how Claude communicates (tone,
  format, persona) without changing its capabilities. Styles modify the system
  prompt and are always active once selected.

- **Use plugins** to package and distribute any combination of the above as a
  single installable unit.

### Skill Content Design

When creating a skill, the content pattern determines frontmatter:

| Pattern | `context` | `disable-model-invocation` | Typical trigger |
|---------|-----------|---------------------------|-----------------|
| Reference content (conventions, patterns) | (inline) | `false` | Auto or manual |
| Task content (deploy, generate, commit) | `fork` | `true` | Manual only |

Reference content runs inline so Claude uses it alongside conversation context.
Task content runs in a subagent — the skill content becomes the subagent's prompt,
and it has no access to conversation history.

### Skill Invocation Control

| Frontmatter | User invokes | Claude invokes | Context load |
|-------------|-------------|----------------|--------------|
| (default) | Yes | Yes | Description always; full skill when invoked |
| `disable-model-invocation: true` | Yes | No | Neither description nor full skill |
| `user-invocable: false` | No | Yes | Description always; full skill when invoked |

`user-invocable: false` hides from `/` menu but does not block the Skill tool.
To block programmatic invocation entirely, use `disable-model-invocation: true`.

Skill descriptions have a character budget: 2% of context window (fallback 16,000
chars). Run `/context` to check for excluded skills.

### Subagent Selection

| Need | Solution |
|------|----------|
| Read-only codebase exploration | Built-in `Explore` agent |
| Plan mode research | Built-in `Plan` agent |
| Complex multi-step task with tools | Built-in `general-purpose` agent |
| Specialized role with custom system prompt | Custom agent in `.claude/agents/` |
| Skill that runs in isolation | Skill with `context: fork` + `agent` field |

Skills with `context: fork` write the task in the skill and pick an agent type.
Custom subagents get their own system prompt and load skills as reference content.
Use custom subagents when the agent needs a persistent identity, tool restrictions,
or persistent memory across sessions.

### Hook Type Selection

| Type | Use when | Timeout |
|------|----------|---------|
| `command` | Deterministic check (lint, validate, format) | 600s |
| `prompt` | LLM judgment on hook input data alone | 30s |
| `agent` | LLM judgment that needs file inspection or commands | 60s |

Command hooks are the default. Use prompt hooks when the decision requires
understanding intent (not just pattern matching). Use agent hooks when
verification requires reading files or running commands.

All matching hooks run in parallel. Exit code 2 blocks the operation (for
blocking events). Always check `stop_hook_active` in Stop hooks to prevent
infinite loops.

### Settings Scope Selection

| Need | Scope | Location |
|------|-------|----------|
| Organization policy (cannot override) | Managed | System paths |
| Personal preferences across projects | User | `~/.claude/settings.json` |
| Team-shared project config | Project | `.claude/settings.json` |
| Personal project-specific config | Local | `.claude/settings.local.json` |

Precedence: managed > CLI args > local > project > user. Permission evaluation
order: deny > ask > allow (first match wins).

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

### Memory Hierarchy

| Type | Location | Shared |
|------|----------|--------|
| Managed policy | System paths | Org-wide |
| User memory | `~/.claude/CLAUDE.md` | Personal, all projects |
| Project memory | `./CLAUDE.md` or `.claude/CLAUDE.md` | Team via VCS |
| Project rules | `.claude/rules/*.md` | Team via VCS |
| Local memory | `./CLAUDE.local.md` | Personal, this project |
| Auto memory | `~/.claude/projects/<project>/memory/` | Personal, per project |

More specific memory takes precedence. CLAUDE.md in parent directories loads
automatically; child directories load on demand when working in those paths.

## Cross-Skill Dependencies

When building Claude Code extensions, invoke specialized skills for component design:

- **Skills** — invoke `ai-helpers:skill-engineering` for SKILL.md design
- **Subagents** — invoke `ai-helpers:subagent-engineering` for agent design
- **Output styles** — invoke `ai-helpers:output-style-engineering` for style design
- **All artifacts** — invoke `ai-helpers:prompt-engineering` for instruction design

This skill provides the SDK reference (what exists, how it works); those skills
provide engineering guidance (how to design it well).
