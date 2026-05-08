---
name: claude-code-sdk
description: "Claude Code extensibility and configuration reference: plugins, plugin dependencies, hooks, skills, rules, subagents, agent teams, channels, MCP servers, output styles, memory, settings, server-managed settings, sandboxing, auto mode, routines, scheduled tasks, cloud reviews (ultraplan/ultrareview), remote control, web sessions, computer use, model configuration, and Agent SDK (incl. TypeScript V2 preview). Invoke whenever Claude Code itself is the subject — questions, configuration, building extensions, debugging, or understanding internals."
---

# Claude Code SDK

Authoritative reference for Claude Code extensibility and configuration. Use this skill when building, configuring, or
debugging any Claude Code extension mechanism.

## References

- **Skills** — [`${CLAUDE_SKILL_DIR}/references/skills.md`] frontmatter fields, invocation control matrix, `paths:`
  shared mechanic with rules, `skillOverrides` setting, string substitutions, dynamic context injection, subagent
  execution via fork, compaction budget, description budget (1,536-char per-entry, 1% context aggregate), bundled skills
- **Rules** — [`${CLAUDE_SKILL_DIR}/references/rules.md`] `.claude/rules/*.md` discovery (recursive), two loading modes
  (unconditional = launch-time priority; conditional via `paths:`), `paths:` syntax (comma-string OR YAML list), project
  vs personal scope, InstructionsLoaded hook with all 5 matchers, sharing patterns, `claudeMdExcludes`
- **Plugins** — [`${CLAUDE_SKILL_DIR}/references/plugins.md`] plugin.json schema (incl. `dependencies` array v2.1.110+,
  `experimental.monitors` v2.1.105+, `experimental.themes` v2.1.118+), directory layout, `${CLAUDE_PLUGIN_ROOT}`/`_DATA`
  env vars, marketplace.json (5 source types + `allowCrossMarketplaceDependenciesOn`), LSP server configs, `bin/` PATH
  contract, `claude plugin tag --push` and `claude plugin prune`, `allowedChannelPlugins` managed setting
- **Hooks** — [`${CLAUDE_SKILL_DIR}/references/hooks.md`] all **29** events with input/output JSON schemas and matcher
  values, **5** hook types (command, http, prompt, agent, mcp_tool) with handler fields, exit code blocking table (incl.
  PreCompact blocking v2.1.105+), async hooks, decision control patterns, security
- **Subagents** — [`${CLAUDE_SKILL_DIR}/references/subagents.md`] 5 built-in agents, custom agent frontmatter, tool
  control, MCP scoping, worktree isolation, invocation methods, agent teams (architecture, tasks, messaging, hooks,
  lifecycle)
- **MCP** — [`${CLAUDE_SKILL_DIR}/references/mcp.md`] `.mcp.json` schema, 3 transports (HTTP/SSE/stdio), scopes and
  precedence, OAuth (incl. headersHelper), env var expansion, managed config, tool search, `alwaysLoad` (v2.1.121+), 2KB
  description cap, `anthropic/maxResultSizeChars` per-tool override, elicitation, resources, prompts as commands
- **Memory** — [`${CLAUDE_SKILL_DIR}/references/memory.md`] full `.claude` directory tree, CLAUDE.md hierarchy and
  loading order, `@import` syntax (max depth 5), auto memory (`MEMORY.md` 200-line/25KB cap), path-specific rules
- **Settings** — [`${CLAUDE_SKILL_DIR}/references/settings.md`] 5-level scope hierarchy, server-managed settings
  (v2.1.30 Enterprise / v2.1.38 Teams), 50+ settings keys, permission rule syntax per tool type, 6 permission modes,
  sandbox config (filesystem/network isolation), `claude project purge` (v2.1.126), expanded protected paths
- **Auto Mode** — [`${CLAUDE_SKILL_DIR}/references/auto-mode.md`] classifier mechanics (Sonnet 4.6 background, never
  sees tool results), prompt-injection resistance, default block lists, failure modes (3-consecutive / 20-total circuit
  breaker), `autoMode.{environment,allow,soft_deny}` config (v2.1.118+ `$defaults` sentinel), CLI subcommands,
  enterprise lockdown
- **Cloud** — [`${CLAUDE_SKILL_DIR}/references/cloud.md`] surface comparison (versions, plans, provider restrictions),
  Routines (v2.1.105+, schedule/API/GitHub triggers, `/fire` endpoint), Ultraplan (v2.1.91+), Ultrareview (v2.1.86+ with
  pricing tier), Remote Control (v2.1.51+ vs `--teleport`), Claude Code on the Web, Code Review, Computer Use (v2.1.85+
  macOS-only)
- **Model config** — [`${CLAUDE_SKILL_DIR}/references/model-config.md`] aliases (incl. `[1m]` variants), effort levels
  (low/medium/high/xhigh/max — available levels depend on the model), opusplan hybrid routing, third-party provider
  pinning, prompt caching env vars
- **Output styles** — [`${CLAUDE_SKILL_DIR}/references/output-styles.md`] 3 built-in styles, custom style frontmatter,
  `keep-coding-instructions` flag, system prompt modification pipeline, activation timing (session start only)
- **Channels** — [`${CLAUDE_SKILL_DIR}/references/channels.md`] MCP server contract, one-way vs two-way types, sender
  gating, permission relay, console (API key) auth (v2.1.128+), `allowedChannelPlugins` allowlist (v2.1.84+), enterprise
  controls, built-in plugins (Telegram/Discord/iMessage/fakechat)
- **Tools** — [`${CLAUDE_SKILL_DIR}/references/tools.md`] built-in tools by category with permission requirements, name
  patterns for permission rules, agent tool restrictions, hook matchers, skill `allowed-tools`
- **Status line** — [`${CLAUDE_SKILL_DIR}/references/statusline.md`] configuration fields, complete JSON input schema,
  ANSI colors, OSC 8 clickable links, caching by session_id, plugin delivery
- **Agent SDK** — [`${CLAUDE_SKILL_DIR}/references/agent-sdk.md`] entry points (`query`/`ClaudeSDKClient`/
  `unstable_v2_*` preview), session-based send/stream patterns, full options reference, sessions (continue/resume/fork),
  system prompt config, permissions, hooks, custom tools, MCP, subagents, streaming, structured outputs, headless
  `init.plugin_errors` schema, Claude Agent SDK v0.1.0 migration, TS↔Python differences
- **Best practices** — [`${CLAUDE_SKILL_DIR}/references/best-practices.md`] context window mechanics, verification
  patterns, scheduling (`/loop`/`/proactive` alias, cron tools, cloud/desktop), checkpointing and rewind, extension
  mechanism selection table

Read the relevant reference before making detailed changes. The sections below cover working-resolution rules for each
mechanism — enough for correct decisions. References provide field-level schemas, complete tables, and implementation
details.

## Concepts

<concepts>

**Skill** — Prompt template in `SKILL.md` loaded on-demand when description matches user request. Frontmatter controls
invocation, tool access, model, effort (incl. `xhigh` where the model supports it), execution context (`context: fork`
for subagent), scoped hooks, and `paths:` glob filter for file-pattern auto-activation. Supports string substitutions
(`$ARGUMENTS`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_EFFORT}`) and dynamic context injection via `` !`command` ``. Per-skill
description cap: 1,536 chars (raised from 250 in v2.1.105). Aggregate description budget: 1% of context window with
8,000-char fallback (override via `SLASH_COMMAND_TOOL_CHAR_BUDGET`). The `skillOverrides` setting toggles per-skill
visibility/invocability in four states; the `/skills` menu writes it.

**Rule** — Modular project context in `.claude/rules/*.md` (project) or `~/.claude/rules/*.md` (personal). Two loading
modes: **without `paths:`** loads at launch with the same priority as `.claude/CLAUDE.md` — use to split an overgrown
CLAUDE.md into topic files. **With `paths:`** is conditional, only injected when working with files matching the glob.
Discovery is recursive across subdirectories. `paths:` accepts a comma-separated string or a YAML list (YAML-list form
added in v2.1.84). The `InstructionsLoaded` hook fires for each rule loaded with matchers `session_start`,
`nested_traversal`, `path_glob_match`, `include`, and `compact`. Rules are file-triggered; skills are task-triggered.
The `paths:` field is a **shared mechanic** between rules and skills — same syntax, same semantics, applied to two
primitives.

**Plugin** — Distributable package of skills, agents, hooks, MCP servers, LSP servers, output styles, monitors, themes,
and default settings. Manifest at `.claude-plugin/plugin.json` (only `name` is required when present). Skills namespaced
as `/plugin:skill`. Two path variables: `${CLAUDE_PLUGIN_ROOT}` (install dir, changes on update) and
`${CLAUDE_PLUGIN_DATA}` (persistent data dir). Marketplace supports 5 source types. `bin/` adds executables to Bash PATH
(W14 2026). Plugins ship custom color themes via `experimental.themes` (v2.1.118+) and background monitors via
`experimental.monitors` (v2.1.105+; the top-level `monitors` key is deprecated as of v2.1.129).

**Plugin Dependencies** — A plugin can declare other plugins it needs in the `dependencies` array of `plugin.json`
(v2.1.110+). Entries are bare strings (track latest) or objects `{name, version, marketplace}` with semver ranges (`~`,
`^`, `>=`, `=`). Pre-releases excluded unless opted in (`^2.0.0-0`). Cross-marketplace dependencies are blocked unless
the target is listed in `allowCrossMarketplaceDependenciesOn` in the root marketplace.json. Tag releases with
`{plugin-name}--v{version}` via `claude plugin tag --push`; remove orphans with `claude plugin prune` (v2.1.121+).
`plugin uninstall --prune` cascades.

**Hook** — Deterministic automation at **29** lifecycle events. Five types: command (shell), http (POST to URL), prompt
(single-turn LLM, 30s), agent (multi-turn with tools, 60s), mcp_tool (in-process MCP). Matcher patterns filter when
hooks fire (exact string, pipe-delimited list, or regex). Exit code 2 blocks the operation for blocking events.
PreCompact gained the ability to block as of v2.1.105. PostToolUse `hookSpecificOutput.updatedToolOutput` replaces tool
output for ALL tools (v2.1.121, was MCP-only). All matching hooks run in parallel.

**MCP Server** — External tool/resource provider via Model Context Protocol. Three transports: HTTP (recommended for
remote), SSE (deprecated), stdio (local processes). OAuth 2.0 for remote servers. Scope precedence: local > project >
user > plugin > Claude.ai connectors. Tool search defers schema loading for large tool sets; `alwaysLoad: true`
(v2.1.121+) bypasses deferral per server. Tool descriptions and server instructions cap at 2KB (v2.1.84+). Per-tool
result-size override via `anthropic/maxResultSizeChars` (v2.1.91+). Supports elicitation and `@server:uri` resources.

**Output Style** — Persona/behavior modifier that **replaces** parts of the default system prompt — the only mechanism
that does this. Built-in: Default, Explanatory, Learning. `keep-coding-instructions: false` (default) removes coding
guidance; `true` appends style on top of full prompt. Applied at session start only (not mid-conversation) due to prompt
caching.

**CLAUDE.md / Memory** — Project memory providing persistent context. Hierarchy: managed > project > user > local.
Loaded by walking up from cwd. Supports `@path` imports (max depth 5). Auto memory: `MEMORY.md` (first 200 lines or
25KB) loaded each session; topic files read on demand. `claudeMdExcludes` skips irrelevant CLAUDE.md in monorepos.
Modular content lives in rules (see Rule concept above).

**Subagent** — Isolated context for delegated tasks. Five built-in types: Explore (haiku, read-only), Plan (inherited
model, read-only), general-purpose (inherited model, all tools), statusline-setup (sonnet), Claude Code Guide (haiku).
Custom agents in `.claude/agents/` with frontmatter for tools, model, MCP scoping. Invocation: automatic delegation,
@-mention, `--agent` flag (session-wide). Subagents cannot spawn other subagents. Supports persistent memory, worktree
isolation, scoped MCP servers.

**Agent Teams** — Multi-agent orchestration with shared task lists and inter-agent messaging. Lead creates team, spawns
teammates, coordinates work. Tasks have states (pending/in_progress/completed), dependencies, and ownership. Teammates
go idle between turns and wake on message. Team-specific hooks: `TeammateIdle`, `TaskCreated`, `TaskCompleted`.
Experimental: requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

**Channels** — Push external events into a running session via MCP servers spawned over stdio. One-way (alerts/webhooks)
or two-way (chat with reply tools). Sender gating required to prevent prompt injection. Permission relay enables remote
tool approval. Console (API key) auth supported as of v2.1.128+; orgs with managed settings must set
`channelsEnabled: true`. Built-in plugins: Telegram, Discord, iMessage, fakechat. `allowedChannelPlugins` (v2.1.84+) is
the enterprise allowlist. Research preview, requires `--channels` per session.

**Auto Mode** — Permission mode where a separate classifier model (Sonnet 4.6, background) reviews actions before they
run. The `auto` permission mode IS the classifier. Available v2.1.83+ on Max/Team/Enterprise/API plans (Anthropic API
only — not Bedrock/Vertex/Foundry). The classifier never sees tool results, so prompt injection from tool output cannot
influence its decisions. Three-consecutive / 20-total denial circuit breaker. Configure trust via
`autoMode.{environment,allow,soft_deny}` with the `$defaults` sentinel (v2.1.118+). Enterprise lockdown:
`disableAutoMode`, `allowManagedDomainsOnly`, `allowManagedReadPathsOnly`, `allowManagedHooksOnly`.

**Routines** — Templated cloud agents on Anthropic infrastructure (v2.1.105+). Triggered by schedule (`/schedule` or
`/routines` CLI), API call (`/fire` endpoint with one-time bearer token), or GitHub events (Claude GitHub App). Daily
run cap with extra-usage fallback; webhook hourly caps in research preview.

**Cloud Reviews** — Two cloud-based review surfaces. **Ultraplan** (v2.1.91+) drafts complex plans in a web session for
browser review; `/ultraplan [prompt]` or include `ultraplan` keyword; auto-creates default cloud env (v2.1.101+);
disconnects active Remote Control. **Ultrareview** (v2.1.86+) runs parallel agents to find and verify bugs in a remote
sandbox; `/ultrareview` (current branch) or `/ultrareview <PR#>`; pricing tier (Pro/Max 3 free runs through 2026-05-05,
then $5–$20 per review extra usage). Neither runs on Bedrock/Vertex/Foundry. Local `/review` is a separate, simpler
multi-agent local review.

**Remote Control** — Continue a local session from phone/tablet/browser (v2.1.51+). `claude remote-control` server mode,
`--remote-control` interactive flag, or `/remote-control` mid-session. Distinct from `--teleport` (cloud-to-local
session move). Org policy can disable; admin gates and "needs auth" vs "failed" status are surfaced explicitly.

**Web Sessions** — Run Claude Code in the cloud from `claude.ai/code`. `--remote` opts a local session into cloud
sandbox; sessions move via `--teleport`. Local-bundle fallback via `CCR_FORCE_BUNDLE=1` for repos that fail to upload.

**Server-Managed Settings** — Enterprise admins ship Claude Code config from the Claude.ai admin console without device
management infrastructure (v2.1.30 Enterprise, v2.1.38 Teams). Server-checked first (no merge with endpoint-managed).
`forceRemoteSettingsRefresh` enables fail-closed startup. MCP distribution and per-group config not supported.

**Computer Use** — macOS-only GUI automation in CLI (v2.1.85+, W14 2026). Opt-in via `/mcp computer-use enable`. Pro/Max
plans only; Claude.ai auth required. Per-app approval with broad-reach warnings; control tiers: view-only, click-only,
full. Machine-wide screenshare lock is the dominant failure mode.

**Settings** — Configuration hierarchy: server-managed > managed > CLI args > local > project > user. Array-valued
settings (permissions, sandbox paths) concatenate and deduplicate across scopes — they do not replace. Six permission
modes: default, plan, acceptEdits, auto (v2.1.83+), dontAsk, bypassPermissions. Permission evaluation: deny > ask >
allow (first match wins). Sandbox provides filesystem and network isolation with allowWrite/denyWrite/allowRead/
denyRead paths.

**Agent SDK** — Programmatic interface for building custom agents using Claude Code as a library. TypeScript
(`@anthropic-ai/claude-agent-sdk`, package renamed from `claude-code-sdk` in v0.1.0) and Python (`claude-agent-sdk`).
Entry points: `query()` and `ClaudeSDKClient` (V1 stable); `unstable_v2_createSession`/`unstable_v2_resumeSession`/
`unstable_v2_prompt` with separate `send`/`stream` and `await using` lifecycle (V2 preview). Sessions persist via
continue/resume/fork. Headless `--output-format stream-json` returns `init.plugin_errors` with both dependency demotions
(v2.1.111+) and `--plugin-dir` failures (v2.1.128+). `CLAUDE_CODE_FORK_SUBAGENT=1` works in non-interactive `claude -p`
(v2.1.121+).

</concepts>

## Choosing the Right Extension Mechanism

<decision-framework>

### When to Use Each

- **CLAUDE.md** — persistent project context for every session: conventions, build commands, team practices. Loads
  automatically. Keep under 200 lines; bloated CLAUDE.md causes instruction drift. Instructions are advisory — for
  guaranteed execution, use hooks.

- **Rules** — modular project context that you'd otherwise put in CLAUDE.md, with optional file-pattern scoping. Use
  when CLAUDE.md is getting too large to read in one pass (split into topic files under `.claude/rules/`), or when
  context is only relevant when editing a specific subtree (path-scoped rules with `paths:`). File-triggered, not
  task-triggered. Don't use for task instructions — that's a skill. Don't use for enforcement — that's a hook.

- **Skills** — reusable domain expertise or workflows loaded on-demand. Two patterns:
  - **Reference content** — knowledge applied inline (conventions, patterns). Auto-triggered by description match or
    `paths:` glob.
  - **Task content** — step-by-step actions (deploy, commit). Runs in subagent (`context: fork`), manual invocation
    (`disable-model-invocation: true`).

- **Subagents** — isolated work with tool restrictions, or when verbose output should stay out of main context. Custom
  agents get their own system prompt and tool set. Use when isolation, specialization, or context protection matters.

- **Agent teams** — parallel work across multiple independent agents with task coordination and messaging. Use when work
  decomposes into independent units benefiting from simultaneous execution.

- **Hooks** — deterministic automation that must always happen. Formatting after edits, blocking destructive commands,
  injecting context, enforcing policies. Unlike CLAUDE.md and rules (advisory), hooks are guaranteed to run.

- **MCP servers** — connecting to external services: databases, APIs, issue trackers. The integration layer for tools
  and resources from outside the local environment.

- **Channels** — pushing external events into a running session. For real-time signals from chat platforms, webhooks, CI
  results, or monitoring alerts. Requires explicit opt-in per session.

- **Output styles** — changing how Claude communicates (tone, format, persona) without changing capabilities. The only
  mechanism that replaces parts of the system prompt.

- **Plugins** — packaging and distributing any combination of the above as a single installable unit. Declare
  cross-plugin dependencies via the `dependencies` array.

- **Cloud reviews / routines / web sessions** — long-running work that should not occupy a local terminal. Use Routines
  for scheduled or event-triggered runs, Ultraplan for cloud planning of complex changes, Ultrareview for multi-agent PR
  review with verification, Web sessions for development from any browser.

- **Server-managed settings** — enterprise-wide config delivered from the Claude.ai admin console without MDM. Use for
  organization policy that must apply consistently across endpoints.

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

`paths:` filters auto-invocation only — manual `/skill-name` always works. Combining `paths:` with
`disable-model-invocation: true` makes auto-activation impossible (the description leaves context, so the filter has
nothing to filter). To get path-scoped auto-only behavior, set `user-invocable: false` instead.

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
- **`mcp_tool`** — in-process MCP tool dispatched as a hook. Use when a hook needs structured tool semantics.

Command hooks are the default. Prompt/agent hooks limited to 8 events.

### Settings Scope Selection

- **Organization policy (no MDM)** — Server-managed (Claude.ai admin console). Cannot be overridden by endpoint
  settings.
- **Organization policy (MDM)** — Managed. System paths. Cannot be overridden.
- **Personal cross-project** — User. `~/.claude/settings.json`
- **Team-shared** — Project. `.claude/settings.json`
- **Personal project-specific** — Local. `.claude/settings.local.json`

Precedence: server-managed > managed > CLI args > local > project > user. Arrays concatenate across scopes.

</decision-framework>

## Quick Reference

### Skill Locations

- **Server-managed** — Claude.ai admin console (organization-wide, no MDM required)
- **Enterprise (MDM)** — managed settings
- **Personal** — `~/.claude/skills/<name>/SKILL.md`
- **Project** — `.claude/skills/<name>/SKILL.md`
- **Plugin** — `<plugin>/skills/<name>/SKILL.md`

### Plugin Layout

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json        # Manifest (name required; declares dependencies, monitors, themes)
├── skills/                # Skills as <name>/SKILL.md
├── agents/                # Custom subagents (.md)
├── output-styles/         # Output style files (.md)
├── hooks/
│   └── hooks.json         # Hook config
├── monitors/              # experimental.monitors background monitors (v2.1.105+)
├── themes/                # experimental.themes color themes (v2.1.118+)
├── bin/                   # Executables added to Bash PATH (W14 2026)
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
├── skills/                # Project skills (with optional paths: glob frontmatter)
├── agents/                # Custom subagents
├── rules/                 # Modular rules (*.md, optional paths: frontmatter)
├── hooks.json             # Project hooks (alternative to settings.json hooks)
├── .mcp.json              # Project MCP servers
└── .lsp.json              # Project LSP servers
```

### Hook Events (29)

**Can block:**

- **UserPromptSubmit** — before prompt processing. All 5 hook types.
- **UserPromptExpansion** — when a slash command expands to a prompt. All 5 hook types. Matcher: `command_name`.
- **PreToolUse** — before tool executes. All 5 types. Matcher: tool name.
- **PostToolBatch** — once per resolved parallel batch. All 5 types. No matcher. Stops the agentic loop.
- **PreCompact** — before compaction (blocking added v2.1.105). Command, http.
- **PermissionRequest** — permission dialog shown. All 5 types. Matcher: tool name.
- **SubagentStop** — subagent finishes. All 5 types. Matcher: agent type.
- **TaskCreated** — task being created (v2.1.84+). All 5 types.
- **TaskCompleted** — task marked complete. All 5 types.
- **Stop** — Claude finishes responding. All 5 types.
- **TeammateIdle** — teammate going idle. Command, http.
- **WorktreeCreate** — worktree being created (HTTP `hookSpecificOutput.worktreePath` v2.1.84+). Command, http.
- **Elicitation** / **ElicitationResult** — MCP user input. Command, http. Matcher: server name.

**Cannot block:**

- **SessionStart** — session begins/resumes. Command, mcp_tool. Matcher: session source.
- **Setup** — fires on `--init-only` / `-p --init` / `-p --maintenance`. Command, mcp_tool. Matchers: `init`,
  `maintenance`. `CLAUDE_ENV_FILE` available.
- **InstructionsLoaded** — CLAUDE.md or rule loaded. Command, mcp_tool. Matchers: `session_start`, `nested_traversal`,
  `path_glob_match`, `include`, `compact`.
- **PermissionDenied** — permission rejected (incl. auto-mode classifier). Command, http. Matcher: tool name.
- **PostToolUse** — after tool success. All 5 types. Matcher: tool name. `decision: "block"` feeds reason to Claude but
  cannot undo execution. `hookSpecificOutput.updatedToolOutput` replaces output for ALL tools (v2.1.121+).
- **PostToolUseFailure** — after tool failure. All 5 types. Matcher: tool name.
- **Notification** — notification sent. Command, http. Matchers include `elicitation_complete`, `elicitation_response`.
- **SubagentStart** — subagent spawned. Command, http. Matcher: agent type.
- **StopFailure** — turn ended from API error. Command, http. Matchers include `oauth_org_not_allowed`.
- **ConfigChange** — config file changed. Command, http. Can block except `policy_settings`.
- **CwdChanged** — working directory changed. Command only.
- **FileChanged** — watched file changed. Command only. Matcher: literal filenames.
- **WorktreeRemove** — worktree being removed. Command, http.
- **PostCompact** — after compaction. Command, http. Matcher: trigger type.
- **SessionEnd** — session terminates. Command, http. Timeout: 1.5s. Matcher: exit reason.

### Permission Modes

- **`default`** — asks for each tool lacking an allow rule
- **`plan`** — read-only until plan approved, then executes
- **`acceptEdits`** — auto-approves file edits, asks for shell commands
- **`auto`** — classifier model auto-approves safe actions; blocks scope escalation, untrusted infrastructure, hostile
  content. Requires v2.1.83+; Max/Team/Enterprise/API only; Anthropic API only. `--enable-auto-mode` flag was removed in
  v2.1.111.
- **`dontAsk`** — auto-denies permission prompts (explicitly allowed tools still work)
- **`bypassPermissions`** — skips all checks (requires managed setting or `--dangerously-skip-permissions`). v2.1.126
  expanded the bypass to `.claude/`, `.git/`, `.vscode/`, `.idea/`, `.husky/`, shell config files. Catastrophic-removal
  circuit breaker (`rm -rf /`, `rm -rf ~`) still prompts.

### Memory Hierarchy

- **Managed policy** — OS system paths. Organization-wide. Cannot be excluded.
- **Project** — `./CLAUDE.md` or `./.claude/CLAUDE.md`. Shared via VCS.
- **User** — `~/.claude/CLAUDE.md`. Personal, all projects.
- **Local** — `./CLAUDE.local.md`. Personal, current project.
- **Rules** — `.claude/rules/*.md` (project) and `~/.claude/rules/*.md` (personal). Optional `paths:` frontmatter for
  file-scoped loading. Without `paths:` — same priority as project CLAUDE.md.
- **Auto memory** — `~/.claude/projects/<project>/memory/MEMORY.md`. First 200 lines or 25KB loaded per session. Topic
  files read on demand.

### Model Aliases

- **`opus`** — latest Opus (Opus 4.7 as of W16 2026)
- **`sonnet`** — latest Sonnet (currently Sonnet 4.6)
- **`haiku`** — fast model for simple tasks
- **`opus[1m]`** / **`sonnet[1m]`** — 1M token context window variants
- **`opusplan`** — Opus for plan mode, Sonnet for execution
- **`best`** — most capable model (currently = opus)
- **`default`** — clears override, uses account default

Effort levels: `low`, `medium`, `high`, `xhigh`, `max`. **Available levels depend on the model.** Set via `/effort`,
`--effort`, or `effortLevel` setting; per-skill `effort:` overrides session.

### Slash Commands

`/loop` (also `/proactive` alias as of v2.1.105), `/schedule`, `/routines`, `/ultraplan`, `/ultrareview`,
`/team-onboarding`, `/autofix-pr`, `/usage`, `/branch`, `/skills`, `/permissions`, `/effort`, `/remote-control`.

## Related Skills

This skill provides the SDK reference (what exists, how it works). The engineering skills provide design guidance (how
to build it well):

- `prompt-engineering` — instruction design techniques for any AI artifact
- `skill-engineering` — SKILL.md design, description formulas, content architecture
- `subagent-engineering` — agent prompt design, tool scoping, team coordination
- `output-style-engineering` — persona definition, tone examples, behavioral rules
