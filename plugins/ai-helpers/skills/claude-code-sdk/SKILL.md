---
name: claude-code-sdk
description: >-
  Claude Code extensibility and configuration reference: plugins, hooks, skills, subagents, agent
  teams, channels, MCP servers, output styles, memory, settings, model configuration, and Agent
  SDK. Invoke whenever Claude Code itself is the subject — questions, configuration, building
  extensions, debugging, or understanding internals.
---

# Claude Code SDK

Authoritative reference for Claude Code extensibility and configuration. Use this skill when building, configuring, or
debugging any Claude Code extension mechanism.

## References

- **Skills** — [`${CLAUDE_SKILL_DIR}/references/skills.md`] 13 frontmatter fields, invocation control matrix, string
  substitutions, dynamic context injection, subagent execution via fork, compaction budget, bundled skills, commands
- **Plugins** — [`${CLAUDE_SKILL_DIR}/references/plugins.md`] plugin.json manifest schema, directory layout,
  CLAUDE_PLUGIN_ROOT/DATA env vars, marketplace.json schema (5 source types), LSP server configs, caching, validation,
  all CLI commands
- **Hooks** — [`${CLAUDE_SKILL_DIR}/references/hooks.md`] All 26 events with input/output JSON schemas and matcher
  values, 4 hook types with handler fields, exit code blocking table, async hooks, decision control patterns, security
- **Subagents** — [`${CLAUDE_SKILL_DIR}/references/subagents.md`] 5 built-in agents, custom agent frontmatter (16
  fields), tool control, MCP scoping, worktree isolation, invocation methods, agent teams (architecture, tasks,
  messaging, hooks, lifecycle)
- **MCP** — [`${CLAUDE_SKILL_DIR}/references/mcp.md`] .mcp.json schema, 3 transports (HTTP/SSE/stdio), scopes and
  precedence, OAuth authentication (including headersHelper), env var expansion, managed config, tool search,
  elicitation, resources, prompts as commands
- **Memory** — [`${CLAUDE_SKILL_DIR}/references/memory.md`] Full .claude directory tree, CLAUDE.md hierarchy and loading
  order, @import syntax (max depth 5), auto memory (MEMORY.md 200-line/25KB cap), path-specific rules with globs,
  claudeMdExcludes
- **Settings** — [`${CLAUDE_SKILL_DIR}/references/settings.md`] 5-level scope hierarchy, 50+ settings keys by category,
  permission rule syntax per tool type (Bash/Read/Edit/WebFetch/MCP/Agent), 6 permission modes with detailed behavior,
  sandbox config (filesystem/network isolation), protected paths
- **Model config** — [`${CLAUDE_SKILL_DIR}/references/model-config.md`] Model aliases (including [1m] variants), effort
  levels (low/medium/high/max), opusplan hybrid routing, availableModels/modelOverrides, third-party provider pinning
  with display/capability vars, prompt caching env vars
- **Output styles** — [`${CLAUDE_SKILL_DIR}/references/output-styles.md`] 3 built-in styles, custom style frontmatter (3
  fields), keep-coding-instructions flag behavior, system prompt modification pipeline, activation timing (session start
  only)
- **Channels** — [`${CLAUDE_SKILL_DIR}/references/channels.md`] MCP server contract (capability declaration,
  notification schema, reply tools), one-way vs two-way types, sender gating, permission relay (request/verdict
  notifications), enterprise controls, built-in plugins (Telegram/Discord/iMessage/fakechat)
- **Tools** — [`${CLAUDE_SKILL_DIR}/references/tools.md`] 35 built-in tools by category with permission requirements,
  tool name patterns for permission rules, agent tool restrictions, hook matchers, and skill allowed-tools
- **Status line** — [`${CLAUDE_SKILL_DIR}/references/statusline.md`] Configuration fields, complete JSON input schema
  (model, workspace, cost, context_window, rate_limits), ANSI colors, OSC 8 clickable links, caching by session_id,
  plugin delivery
- **Agent SDK** — [`${CLAUDE_SKILL_DIR}/references/agent-sdk.md`] SDK entry points (query/ClaudeSDKClient), full options
  reference, sessions (continue/resume/fork), system prompt config (4 approaches), permissions, hooks, custom tools,
  MCP, subagents, streaming, structured outputs, TS vs Python differences
- **Best practices** — [`${CLAUDE_SKILL_DIR}/references/best-practices.md`] Context window mechanics (startup load
  ~7,850 tokens, compaction at ~12%), verification patterns, scheduling (/loop, cron tools, cloud/desktop),
  checkpointing and rewind, extension mechanism selection table

Read the relevant reference before making detailed changes. The sections below cover working-resolution rules for each
mechanism — enough for correct decisions. References provide field-level schemas, complete tables, and implementation
details.

## Concepts

<concepts>

**Skill** — Prompt template in `SKILL.md` loaded on-demand when description matches user request. 13 frontmatter fields
control invocation, tool access, model, effort, execution context (`context: fork` for subagent), and scoped hooks.
Supports string substitutions (`$ARGUMENTS`, `${CLAUDE_SKILL_DIR}`) and dynamic context injection via `` !`command` ``
syntax. Skills compact to ~5k tokens each (25k combined budget across all invoked skills). Description budget: 1% of
context window (fallback 8,000 chars).

**Plugin** — Distributable package of skills, agents, hooks, MCP servers, LSP servers, output styles, and default
settings. Optional `.claude-plugin/plugin.json` manifest (only `name` is required when present). Skills namespaced as
`/plugin:skill`. Two path variables: `${CLAUDE_PLUGIN_ROOT}` (install dir, changes on update) and
`${CLAUDE_PLUGIN_DATA}` (persistent data dir, survives updates). Marketplace supports 5 source types (relative, github,
url, git-subdir, npm). `bin/` directory adds executables to Bash tool PATH.

**Hook** — Deterministic automation at 26 lifecycle events. Four types: command (shell, 600s timeout), http (POST to
URL), prompt (single-turn LLM, 30s), agent (multi-turn with tools, 60s). Events cover: session lifecycle, tool use,
subagents, teams/tasks, compaction, config/file changes, MCP elicitation. Matcher patterns filter when hooks fire (exact
string, pipe-delimited list, or regex). Exit code 2 blocks the operation for blocking events. Prompt/agent hooks limited
to 8 events (PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, UserPromptSubmit, Stop, SubagentStop,
TaskCompleted). All matching hooks run in parallel.

**MCP Server** — External tool/resource provider via Model Context Protocol. Three transports: HTTP (recommended for
remote), SSE (deprecated), stdio (local processes). OAuth 2.0 for remote servers. Scope precedence: local > project >
user > plugin > Claude.ai connectors. Tool search defers schema loading for large tool sets (names only at startup, full
schemas on demand). Supports elicitation (structured input mid-task) and resources (`@server:uri` mentions).

**Output Style** — Persona/behavior modifier that **replaces** parts of the default system prompt — the only mechanism
that does this. Built-in: Default, Explanatory, Learning. Custom styles: markdown with frontmatter.
`keep-coding-instructions: false` (default) removes coding guidance; `true` appends style on top of full prompt. Applied
at session start only (not mid-conversation) due to prompt caching.

**CLAUDE.md / Memory** — Project memory providing persistent context. Hierarchy: managed > project > user > local (more
specific takes precedence). Loaded by walking up from cwd. Supports `@path` imports (max depth 5). Modular rules in
`.claude/rules/*.md` with optional `paths:` frontmatter for file-scoped loading. Auto memory: `MEMORY.md` (first 200
lines or 25KB) loaded each session; topic files read on demand. `claudeMdExcludes` skips irrelevant CLAUDE.md in
monorepos.

**Subagent** — Isolated context for delegated tasks. Five built-in types: Explore (haiku, read-only), Plan (inherited
model, read-only), general-purpose (inherited model, all tools), statusline-setup (sonnet), Claude Code Guide (haiku).
Custom agents in `.claude/agents/` with 16 frontmatter fields. Tool control via allowlist (`tools`) or denylist
(`disallowedTools`). Invocation: automatic delegation, @-mention, `--agent` flag (session-wide). Subagents cannot spawn
other subagents. Supports persistent memory, worktree isolation, scoped MCP servers.

**Agent Teams** — Multi-agent orchestration with shared task lists and inter-agent messaging. Lead creates team, spawns
teammates, coordinates work. Tasks have states (pending/in_progress/completed), dependencies, and ownership. Teammates
go idle between turns and wake on message. Team-specific hooks: `TeammateIdle`, `TaskCreated`, `TaskCompleted`.
Experimental: requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

**Channels** — Push external events into a running session via MCP servers spawned as subprocesses over stdio. One-way
(alerts/webhooks) or two-way (chat with reply tools). Sender gating required to prevent prompt injection. Permission
relay enables remote tool approval. Built-in plugins: Telegram, Discord, iMessage, fakechat. Research preview, requires
v2.1.80+. Must be explicitly enabled per session with `--channels`.

**Agent SDK** — Programmatic interface for building custom agents using Claude Code as a library. TypeScript
(`@anthropic-ai/claude-agent-sdk`) and Python (`claude-agent-sdk`). Entry points: `query()` for single-turn streaming,
`ClaudeSDKClient` for multi-turn sessions (Python). Sessions persist via continue/resume/fork. Supports all Claude Code
features: hooks, custom tools (in-process MCP), MCP servers, plugins, skills, subagents, structured outputs.

**Settings** — Configuration hierarchy: managed > CLI args > local > project > user. Array-valued settings (permissions,
sandbox paths) concatenate and deduplicate across scopes — they do not replace. Six permission modes: default, plan,
acceptEdits, auto, dontAsk, bypassPermissions. Permission evaluation: deny > ask > allow (first match wins). Sandbox
provides filesystem and network isolation with allowWrite/denyWrite/allowRead/denyRead paths.

</concepts>

## Choosing the Right Extension Mechanism

<decision-framework>

### When to Use Each

- **CLAUDE.md** — persistent project context for every session: conventions, build commands, team practices. Loads
  automatically. Keep under 200 lines; bloated CLAUDE.md causes instruction drift. Instructions are advisory — for
  guaranteed execution, use hooks.

- **Skills** — reusable domain expertise or workflows loaded on-demand. Two patterns:
  - **Reference content** — knowledge applied inline (conventions, patterns). Auto-triggered by description match.
  - **Task content** — step-by-step actions (deploy, commit). Runs in subagent (`context: fork`), manual invocation
    (`disable-model-invocation: true`).

- **Subagents** — isolated work with tool restrictions, or when verbose output should stay out of main context. Custom
  agents get their own system prompt and tool set. Use when isolation, specialization, or context protection matters.

- **Agent teams** — parallel work across multiple independent agents with task coordination and messaging. Use when work
  decomposes into independent units benefiting from simultaneous execution.

- **Hooks** — deterministic automation that must always happen. Formatting after edits, blocking destructive commands,
  injecting context, enforcing policies. Unlike CLAUDE.md (advisory), hooks are guaranteed to run.

- **MCP servers** — connecting to external services: databases, APIs, issue trackers. The integration layer for tools
  and resources from outside the local environment.

- **Channels** — pushing external events into a running session. For real-time signals from chat platforms, webhooks, CI
  results, or monitoring alerts. Requires explicit opt-in per session.

- **Output styles** — changing how Claude communicates (tone, format, persona) without changing capabilities. The only
  mechanism that replaces parts of the system prompt.

- **Plugins** — packaging and distributing any combination of the above as a single installable unit.

- **Agent SDK** — building custom agents programmatically. Use when you need full control over orchestration, tool
  access, and session management from TypeScript or Python.

### Skill Content Design

- **Reference content** (conventions, patterns) — `context`: inline (default), `disable-model-invocation`: `false`. Auto
  or manual trigger. Claude uses it alongside conversation.
- **Task content** (deploy, generate, commit) — `context`: `fork`, `disable-model-invocation`: `true`. Manual only.
  Skill becomes subagent's prompt with no conversation history.

### Skill Invocation Control

| Frontmatter                      | User | Claude | Context loading                                    |
| -------------------------------- | ---- | ------ | -------------------------------------------------- |
| (default)                        | Yes  | Yes    | Description always loaded; full skill when invoked |
| `disable-model-invocation: true` | Yes  | No     | Nothing loaded until user invokes                  |
| `user-invocable: false`          | No   | Yes    | Description always loaded; full skill when invoked |

`user-invocable: false` hides from `/` menu but does NOT block the Skill tool. To block programmatic invocation
entirely, use `disable-model-invocation: true`.

### Subagent Selection

- **Read-only exploration** — built-in `Explore` (haiku, accepts thoroughness: quick/medium/very thorough)
- **Plan mode research** — built-in `Plan` (inherited model, read-only)
- **Complex multi-step task** — built-in `general-purpose` (inherited model, all tools)
- **Specialized role** — custom agent in `.claude/agents/` with own prompt and tool restrictions
- **Skill in isolation** — skill with `context: fork` + `agent` field
- **Session-wide mode** — `claude --agent <name>` or `agent` in settings
- **Parallel coordination** — agent teams via `TeamCreate`

### Hook Type Selection

- **`command`** — deterministic (lint, validate, format). Timeout: 600s. Supports `async: true` for background.
- **`http`** — POST to URL. Non-2xx = non-blocking error. Supports header env var interpolation.
- **`prompt`** — LLM judgment on hook input alone. Timeout: 30s. Returns `{ok, reason}`.
- **`agent`** — LLM with file/command access. Timeout: 60s. Same response schema as prompt.

Command hooks are the default. Prompt/agent hooks limited to 8 events.

### Settings Scope Selection

- **Organization policy** — Managed. System paths. Cannot be overridden.
- **Personal cross-project** — User. `~/.claude/settings.json`
- **Team-shared** — Project. `.claude/settings.json`
- **Personal project-specific** — Local. `.claude/settings.local.json`

Precedence: managed > CLI args > local > project > user. Arrays concatenate across scopes.

</decision-framework>

## Quick Reference

### Skill Locations

- **Enterprise** — managed settings (organization-wide)
- **Personal** — `~/.claude/skills/<name>/SKILL.md` (all projects)
- **Project** — `.claude/skills/<name>/SKILL.md` (current project)
- **Plugin** — `<plugin>/skills/<name>/SKILL.md` (where plugin enabled)

### Plugin Layout

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json        # Manifest (optional, only name required)
├── skills/                # Skills as <name>/SKILL.md
├── agents/                # Custom subagents (.md)
├── output-styles/         # Output style files (.md)
├── hooks/
│   └── hooks.json         # Hook config
├── bin/                   # Executables added to Bash PATH
├── settings.json          # Default settings (agent key only)
├── .mcp.json              # MCP server definitions
├── .lsp.json              # LSP server configs
└── README.md
```

### .claude Directory

```
.claude/
├── CLAUDE.md              # Project instructions (or ./CLAUDE.md at repo root)
├── settings.json          # Project settings (shared via VCS)
├── settings.local.json    # Local settings (gitignored)
├── skills/                # Project skills
├── agents/                # Custom subagents
├── rules/                 # Modular rules (*.md, optional paths: frontmatter)
├── hooks.json             # Project hooks (alternative to settings.json hooks)
├── .mcp.json              # Project MCP servers
└── .lsp.json              # Project LSP servers
```

### Hook Events (26)

**Can block (10):**

- **UserPromptSubmit** — before prompt processing. All 4 hook types.
- **PreToolUse** — before tool executes. All 4 types. Matcher: tool name.
- **PermissionRequest** — permission dialog shown. All 4 types. Matcher: tool name.
- **SubagentStop** — subagent finishes. All 4 types. Matcher: agent type.
- **TaskCreated** — task being created. All 4 types.
- **TaskCompleted** — task marked complete. All 4 types.
- **Stop** — Claude finishes responding. All 4 types.
- **TeammateIdle** — teammate going idle. Command, http.
- **WorktreeCreate** — worktree being created. Command, http. Must print path.
- **Elicitation** / **ElicitationResult** — MCP user input. Command, http. Matcher: server name.

**Cannot block (16):**

- **SessionStart** — session begins/resumes. Command only. Matcher: session source.
- **InstructionsLoaded** — CLAUDE.md or rule loaded. Command, http. Matcher: load reason.
- **PermissionDenied** — permission rejected. Command, http. Matcher: tool name.
- **PostToolUse** — after tool success. All 4 types. Matcher: tool name. `decision: "block"` feeds reason to Claude but
  cannot undo execution.
- **PostToolUseFailure** — after tool failure. All 4 types. Matcher: tool name.
- **Notification** — notification sent. Command, http. Matcher: notification type.
- **SubagentStart** — subagent spawned. Command, http. Matcher: agent type.
- **StopFailure** — turn ended from API error. Command, http. Matcher: error type.
- **ConfigChange** — config file changed. Command, http. Can block except `policy_settings`.
- **CwdChanged** — working directory changed. Command only.
- **FileChanged** — watched file changed. Command only. Matcher: literal filenames.
- **WorktreeRemove** — worktree being removed. Command, http.
- **PreCompact** / **PostCompact** — before/after compaction. Command, http. Matcher: trigger type.
- **SessionEnd** — session terminates. Command, http. Timeout: 1.5s. Matcher: exit reason.

### Permission Modes

- **`default`** — asks for each tool lacking an allow rule
- **`plan`** — read-only until plan approved, then executes
- **`acceptEdits`** — auto-approves file edits, asks for shell commands
- **`auto`** — auto-approves most operations via background classifier
- **`dontAsk`** — auto-denies permission prompts (explicitly allowed tools still work)
- **`bypassPermissions`** — skips all checks (requires managed setting or `--dangerously-skip-permissions`)

### Memory Hierarchy

- **Managed policy** — OS system paths. Organization-wide. Cannot be excluded.
- **Project** — `./CLAUDE.md` or `./.claude/CLAUDE.md`. Shared via VCS.
- **User** — `~/.claude/CLAUDE.md`. Personal, all projects.
- **Local** — `./CLAUDE.local.md`. Personal, current project.
- **Rules** — `.claude/rules/*.md` (project) and `~/.claude/rules/*.md` (personal). Optional `paths:` frontmatter for
  file-scoped loading.
- **Auto memory** — `~/.claude/projects/<project>/memory/MEMORY.md`. First 200 lines or 25KB loaded per session. Topic
  files read on demand.

### Model Aliases

- **`opus`** — latest Opus (currently Opus 4.6)
- **`sonnet`** — latest Sonnet (currently Sonnet 4.6)
- **`haiku`** — fast model for simple tasks
- **`opus[1m]`** / **`sonnet[1m]`** — 1M token context window variants
- **`opusplan`** — Opus for plan mode, Sonnet for execution
- **`best`** — most capable model (currently = opus)
- **`default`** — clears override, uses account default

Effort levels: `low`, `medium`, `high`, `max` (Opus 4.6 only). Set via `/effort`, `--effort`, or `effortLevel` setting.

## Related Skills

This skill provides the SDK reference (what exists, how it works). The engineering skills provide design guidance (how
to build it well):

- `prompt-engineering` — instruction design techniques for any AI artifact
- `skill-engineering` — SKILL.md design, description formulas, content architecture
- `subagent-engineering` — agent prompt design, tool scoping, team coordination
- `output-style-engineering` — persona definition, tone examples, behavioral rules
