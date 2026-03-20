---
name: claude-code-sdk
description: >-
  Claude Code extensibility and configuration reference: plugins, hooks, skills, subagents,
  MCP servers, output styles, memory, settings, and model configuration. Invoke whenever
  Claude Code itself is the subject — questions, configuration, building extensions,
  debugging, or understanding internals.
---

# Claude Code SDK

Authoritative reference for Claude Code extensibility and configuration. Use this skill when building, configuring, or
debugging any Claude Code extension mechanism.

## References

- **Skills** — [`${CLAUDE_SKILL_DIR}/references/skills.md`] Frontmatter fields, invocation control matrix, string
  substitutions, dynamic context injection, subagent execution, nested discovery, sharing
- **Subagents** — [`${CLAUDE_SKILL_DIR}/references/subagents.md`] Built-in agents table, frontmatter fields, permission
  modes, tool control, preloading skills, persistent memory, worktree isolation, CLI-defined agents, @-mention
  invocation, --agent session mode, MCP scoping, effort/background fields, teams
- **Plugins** — [`${CLAUDE_SKILL_DIR}/references/plugins.md`] Plugin manifest schema, component paths,
  CLAUDE_PLUGIN_DATA persistent directory, marketplace schema, official marketplace, LSP server configs, caching,
  validation, CLI commands
- **Hooks** — [`${CLAUDE_SKILL_DIR}/references/hooks.md`] All 22 event details (input fields, output schemas, exit code
  behavior), matcher patterns, hook types (command/http/prompt/agent), async hooks, decision control patterns, security
- **MCP** — [`${CLAUDE_SKILL_DIR}/references/mcp.md`] Server installation (HTTP/SSE/stdio), scopes, OAuth
  authentication, environment variable expansion, managed MCP config, tool search, plugin-provided servers
- **Memory** — [`${CLAUDE_SKILL_DIR}/references/memory.md`] CLAUDE.md hierarchy and loading, @import syntax, auto memory
  (storage, /memory command, settings), path-specific rules with globs, claudeMdExcludes, organization-level management
- **Model config** — [`${CLAUDE_SKILL_DIR}/references/model-config.md`] Model aliases (including opus[1m]/sonnet[1m]),
  effort levels (low/medium/high/max), extended context (1M), opusplan mode, availableModels/modelOverrides, custom
  model option, third-party provider pinning, prompt caching env vars
- **Output styles** — [`${CLAUDE_SKILL_DIR}/references/output-styles.md`] Built-in styles, frontmatter fields,
  keep-coding-instructions flag, comparison with CLAUDE.md/agents/skills
- **Settings** — [`${CLAUDE_SKILL_DIR}/references/settings.md`] Scope hierarchy, permission rule syntax, sandbox config,
  worktree settings, attribution settings, common settings table (50+ keys), hook configuration controls, file
  suggestion settings, environment variables
- **Status line** — [`${CLAUDE_SKILL_DIR}/references/statusline.md`] Configuration, JSON input schema with all fields,
  ANSI colors, clickable links, caching, plugin delivery
- **Best practices** — [`${CLAUDE_SKILL_DIR}/references/best-practices.md`] Context management, verification patterns,
  explore-plan-code workflow, CLAUDE.md authoring, session management, automation/scaling

Read the relevant reference before making detailed changes. The rules below cover the decision framework; references
provide field-level schemas and implementation details.

## Concepts

<concepts>
**Skill** — Prompt template in `SKILL.md` that extends Claude's capabilities. Loaded on-demand when description matches
user request. Can include `references/` for detailed content. Invoked with `/skill-name` or automatically. Frontmatter
controls invocation, tool access, model, effort level, execution context (`fork` for subagent), and scoped hooks.

**Plugin** — Distributable package containing skills, agents, hooks, MCP servers, LSP servers, output styles, and
default settings. Has optional `.claude-plugin/plugin.json` manifest. Installed from marketplace or local path. Skills
namespaced as `/plugin:skill`. Two path variables: `${CLAUDE_PLUGIN_ROOT}` (install dir, changes on update) and
`${CLAUDE_PLUGIN_DATA}` (persistent data dir, survives updates).

**Hook** — Deterministic automation triggered at 22 lifecycle events (tool use, session start/end, permission request,
subagent lifecycle, teammate/task events, compaction, worktree, elicitation, instructions loading). Four types: command
(shell), http (POST to URL), prompt (LLM decision), agent (multi-turn verification). Configured in settings, plugin, or
skill/agent frontmatter.

**MCP Server** — External tool/resource provider via Model Context Protocol. Connects Claude to databases, APIs,
services. Supports stdio, HTTP, SSE transports and OAuth authentication. Configured per-project, per-user, via plugin,
or scoped to a specific subagent via inline definition.

**Output Style** — Persona/behavior modifier via system prompt changes. Affects how Claude responds without changing
capabilities. Built-in: Default, Explanatory, Learning. Custom styles exclude coding instructions unless
`keep-coding-instructions: true`.

**CLAUDE.md** — Project memory file providing persistent context about codebase, conventions, instructions. Hierarchy:
managed > user > project. Loaded automatically at session start. Supports `@path` imports (max depth 5). Modular rules
in `.claude/rules/*.md` with optional `paths:` frontmatter for file-scoped loading. Auto memory (`MEMORY.md`) stores
Claude's own learnings per project (first 200 lines loaded each session).

**Subagent** — Isolated context for delegated tasks. Built-in types: Explore (haiku, read-only), Plan (inherited model,
read-only), general-purpose (inherited model, all tools). Custom agents in `.claude/agents/`. Supports persistent
memory, worktree isolation, effort override, background execution, scoped MCP servers, and tool restrictions via `tools`
or `disallowedTools`. Invocable via delegation, @-mention, or `--agent` flag (session-wide). Subagents cannot spawn
other subagents. Agent teams coordinate multiple agents across separate sessions.

**Settings** — Configuration hierarchy controlling permissions, model, hooks, behavior, sandbox, plugins, and more.
Scopes: managed > CLI args > local > project > user. Managed settings support server-managed, MDM/plist/registry, and
file-based delivery.

</concepts>

## Choosing the Right Extension Mechanism

Use these rules when deciding how to extend Claude Code. Each mechanism serves a different purpose; choosing wrong
causes friction or failure.

### Skills vs Subagents vs Hooks vs MCP vs CLAUDE.md

- **Use CLAUDE.md** for persistent project context that applies to every session: coding conventions, repo structure,
  build commands, team practices. It loads automatically — no invocation needed. Keep it concise; bloated CLAUDE.md
  causes instruction drift.

- **Use skills** for reusable domain expertise or workflows that load on-demand. Skills load only when relevant, keeping
  context clean when not needed. Two content patterns:
  - **Reference content** — knowledge Claude applies alongside conversation (conventions, patterns, style guides). Runs
    inline, auto-triggered.
  - **Task content** — step-by-step actions (deploy, commit, generate). Runs in subagent (`context: fork`), manual
    invocation (`disable-model-invocation: true`).

- **Use subagents** for isolated delegated work with tool restrictions or when output is verbose and should not consume
  main context. Custom agents in `.claude/agents/` get their own system prompt, tool set, and permissions. Subagents
  cannot spawn other subagents.

- **Use hooks** for deterministic automation that must always happen — formatting after edits, blocking writes to
  protected paths, injecting context at session start. Unlike CLAUDE.md instructions (advisory), hooks are guaranteed to
  run.

- **Use MCP servers** for connecting to external services: databases, APIs, issue trackers. MCP is the integration layer
  — use it when Claude needs tools or resources from outside the local environment.

- **Use output styles** when you need to change how Claude communicates (tone, format, persona) without changing its
  capabilities. Styles modify the system prompt and are always active once selected.

- **Use plugins** to package and distribute any combination of the above as a single installable unit.

### Skill Content Design

When creating a skill, the content pattern determines frontmatter:

- **Reference content** (conventions, patterns) — `context`: inline, `disable-model-invocation`: `false`. Trigger: auto
  or manual.
- **Task content** (deploy, generate, commit) — `context`: `fork`, `disable-model-invocation`: `true`. Trigger: manual
  only.

Reference content runs inline so Claude uses it alongside conversation context. Task content runs in a subagent — the
skill content becomes the subagent's prompt, and it has no access to conversation history.

### Skill Invocation Control

- **(default)** — user: yes, Claude: yes. Description always loaded; full skill when invoked.
- **`disable-model-invocation: true`** — user: yes, Claude: no. Neither description nor full skill loaded.
- **`user-invocable: false`** — user: no, Claude: yes. Description always loaded; full skill when invoked.

`user-invocable: false` hides from `/` menu but does not block the Skill tool. To block programmatic invocation
entirely, use `disable-model-invocation: true`.

Skill descriptions have a character budget: 2% of context window (fallback 16,000 chars). Run `/context` to check for
excluded skills.

### Subagent Selection

- **Read-only codebase exploration** — built-in `Explore` agent (haiku)
- **Plan mode research** — built-in `Plan` agent (inherited model)
- **Complex multi-step task with tools** — built-in `general-purpose` agent
- **Specialized role with custom system prompt** — custom agent in `.claude/agents/`
- **Skill that runs in isolation** — skill with `context: fork` + `agent` field
- **Session-wide agent mode** — `claude --agent <name>` or `agent` setting in `.claude/settings.json`

Skills with `context: fork` write the task in the skill and pick an agent type. Custom subagents get their own system
prompt and load skills as reference content. Use custom subagents when the agent needs a persistent identity, tool
restrictions, or persistent memory across sessions.

Invocation methods: automatic delegation (Claude decides), @-mention (guarantees specific agent), `--agent` flag
(session-wide). Restrict which agents can be spawned with `Agent(type1, type2)` in `tools` or deny with `Agent(name)` in
`permissions.deny`.

### Hook Type Selection

- **`command`** — deterministic check (lint, validate, format). Timeout: 600s. Supports `async: true` for background.
- **`http`** — POST event JSON to a URL. Non-2xx = non-blocking error. Block via 2xx + JSON decision body. Supports
  header env var interpolation with `allowedEnvVars`.
- **`prompt`** — LLM judgment on hook input data alone. Timeout: 30s. Returns `{ok, reason}` JSON.
- **`agent`** — LLM judgment that needs file inspection or commands. Timeout: 60s. Same response schema as prompt.

Command hooks are the default. Use http hooks for external service integration. Use prompt hooks when the decision
requires understanding intent (not just pattern matching). Use agent hooks when verification requires reading files or
running commands. Not all events support all types — prompt/agent hooks are limited to 8 events (PreToolUse,
PostToolUse, PostToolUseFailure, PermissionRequest, UserPromptSubmit, Stop, SubagentStop, TaskCompleted).

All matching hooks run in parallel (identical handlers deduplicated). Exit code 2 blocks the operation (for blocking
events).

### Settings Scope Selection

- **Organization policy (cannot override)** — Managed scope. Location: system paths
- **Personal preferences across projects** — User scope. Location: `~/.claude/settings.json`
- **Team-shared project config** — Project scope. Location: `.claude/settings.json`
- **Personal project-specific config** — Local scope. Location: `.claude/settings.local.json`

Precedence: managed > CLI args > local > project > user. Permission evaluation order: deny > ask > allow (first match
wins).

## Quick Reference

### Skill Locations

- **Enterprise** — managed settings
- **Personal** — `~/.claude/skills/<name>/SKILL.md`
- **Project** — `.claude/skills/<name>/SKILL.md`
- **Plugin** — `<plugin>/skills/<name>/SKILL.md`

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

### Hook Events (22)

- `SessionStart` — session begins/resumes. Cannot block. Command only.
- `InstructionsLoaded` — CLAUDE.md or rules file loaded into context. Cannot block. Command only.
- `UserPromptSubmit` — before prompt processing. Can block.
- `PreToolUse` — before tool executes. Can block. Supports `updatedInput`.
- `PermissionRequest` — permission dialog shown. Can block. Supports `updatedPermissions`.
- `PostToolUse` — after tool success. Cannot block (but `decision: "block"` feeds reason to Claude).
- `PostToolUseFailure` — after tool failure. Cannot block.
- `Notification` — notification sent. Cannot block. Command only.
- `SubagentStart` — subagent spawned. Cannot block. Command only.
- `SubagentStop` — subagent finishes. Can block.
- `Stop` — Claude finishes responding. Can block.
- `StopFailure` — turn ended due to API error. Cannot block. Output ignored. Command only.
- `TeammateIdle` — teammate going idle. Can block.
- `TaskCompleted` — task marked complete. Can block.
- `ConfigChange` — config file changes. Can block (except `policy_settings`).
- `WorktreeCreate` — worktree being created. Replaces default git behavior. Must print path. Command only.
- `WorktreeRemove` — worktree being removed. Cannot block. Command only.
- `PreCompact` — before compaction. Cannot block. Command only.
- `PostCompact` — after compaction completes. Cannot block. Command only.
- `Elicitation` — MCP server requests user input. Can block. Command only.
- `ElicitationResult` — after user responds to MCP elicitation. Can block. Command only.
- `SessionEnd` — session terminates. Cannot block. Command only. Timeout: 1.5s default.

### Settings Scopes

- **Managed** — system path. Shared org-wide.
- **User** — `~/.claude/settings.json`. Not shared.
- **Project** — `.claude/settings.json`. Shared via Git.
- **Local** — `.claude/settings.local.json`. Not shared.

### Memory Hierarchy

- **Managed policy** — system paths. Shared org-wide. Cannot be excluded.
- **User instructions** — `~/.claude/CLAUDE.md`. Personal, all projects.
- **User rules** — `~/.claude/rules/*.md`. Personal, all projects.
- **Project instructions** — `./CLAUDE.md` or `.claude/CLAUDE.md`. Team via VCS.
- **Project rules** — `.claude/rules/*.md`. Team via VCS. Supports `paths:` frontmatter for file-scoped loading.
- **Auto memory** — `~/.claude/projects/<project>/memory/`. Personal, per project. First 200 lines of `MEMORY.md` loaded
  each session.

More specific memory takes precedence. CLAUDE.md in parent directories loads automatically; child directories load on
demand when working in those paths. Use `@path` in CLAUDE.md to import files (max depth 5). Use `claudeMdExcludes` in
settings to skip irrelevant CLAUDE.md files in monorepos.

## Cross-Skill Dependencies

When building Claude Code extensions, invoke specialized skills for component design:

- **Skills** — invoke `ai-helpers:skill-engineering` for SKILL.md design
- **Subagents** — invoke `ai-helpers:subagent-engineering` for agent design
- **Output styles** — invoke `ai-helpers:output-style-engineering` for style design
- **All artifacts** — invoke `ai-helpers:prompt-engineering` for instruction design

This skill provides the SDK reference (what exists, how it works); those skills provide engineering guidance (how to
design it well).
