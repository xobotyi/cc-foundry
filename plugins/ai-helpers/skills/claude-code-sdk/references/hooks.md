# Hooks

Hooks are user-defined handlers that execute automatically at specific points in Claude Code's lifecycle. They provide
deterministic control over behavior: format code after edits, block destructive commands, send notifications, inject
context, enforce policies.

## Hook Types

- **`command`** — shell command; receives JSON on stdin. Decision support: yes. Async: yes.
- **`http`** — POST to URL; receives JSON as request body. Decision support: yes. Async: no.
- **`mcp_tool`** — invoke an MCP tool with hook input as arguments. Decision support: yes. Async: no.
- **`prompt`** — single-turn LLM evaluation; returns ok/reason. Decision support: yes. Async: no.
- **`agent`** — multi-turn subagent with tool access (Read, Grep). Decision support: yes. Async: no.

### Hook Type Support per Event

Not every event supports every type.

- **All five types (`command`, `http`, `mcp_tool`, `prompt`, `agent`):** PreToolUse, PermissionRequest, PostToolUse,
  PostToolUseFailure, PostToolBatch, UserPromptSubmit, UserPromptExpansion, SubagentStop, TaskCreated, TaskCompleted,
  Stop
- **`command`, `http`, `mcp_tool` only (no prompt/agent):** ConfigChange, CwdChanged, Elicitation, ElicitationResult,
  FileChanged, InstructionsLoaded, Notification, PermissionDenied, PreCompact, PostCompact, SessionEnd, StopFailure,
  SubagentStart, TeammateIdle, WorktreeCreate, WorktreeRemove
- **`command`, `mcp_tool` only:** SessionStart, Setup

## Configuration Structure

Three levels of nesting:

1. **Hook event** — lifecycle point (`PreToolUse`, `Stop`, etc.)
2. **Matcher group** — filter when it fires (`"Bash"`, `"Edit|Write"`, regex)
3. **Hook handler** — the command/http/prompt/agent that runs

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<pattern>",
        "hooks": [
          {
            "type": "command",
            "command": "your-script.sh"
          }
        ]
      }
    ]
  }
}
```

### Configuration Locations

- `~/.claude/settings.json` — all projects. Not shared.
- `.claude/settings.json` — single project. Committable.
- `.claude/settings.local.json` — single project. Gitignored.
- **Managed policy settings** — organization-wide. Admin-controlled.
- **Plugin `hooks/hooks.json`** — when plugin is enabled. Bundled with plugin.
- **Skill or agent YAML frontmatter** — while component active. Defined in component file.

Enterprise admins can set `allowManagedHooksOnly` to block user/project/plugin hooks. Hooks from force-enabled plugins
in managed `enabledPlugins` are exempt.

### Matcher Patterns

- **`"*"`, `""`, or omitted** — match all. Fires on every occurrence.
- **Only letters, digits, `_`, and `\`** — exact string or `|`-delimited list. E.g. `Bash`, `Edit|Write`.
- **Contains any other character** — JavaScript regex. E.g. `^Notebook`, `mcp__memory__.*`.

What the matcher filters depends on the event — see the event catalog below.

MCP tools follow `mcp__<server>__<tool>` naming. Use `mcp__memory__.*` to match all tools from a server. Plain
`mcp__memory` is exact-match and matches nothing.

### Handler Common Fields

- **`type`** (required) — `"command"`, `"http"`, `"mcp_tool"`, `"prompt"`, or `"agent"`
- **`if`** — permission rule syntax filter: `"Bash(git *)"`, `"Edit(*.ts)"`. Tool events only.
- **`timeout`** — seconds. Defaults: 600 (command), 30 (prompt), 60 (agent).
- **`statusMessage`** — custom spinner text while running.
- **`once`** — if `true`, runs once per session then removed. Skills only.

### Command Hook Fields

- **`command`** (required) — shell command to execute
- **`async`** — run in background without blocking
- **`shell`** — `"bash"` (default) or `"powershell"` (Windows)

### HTTP Hook Fields

- **`url`** (required) — POST endpoint URL
- **`headers`** — key-value headers; values support `$VAR_NAME` / `${VAR_NAME}` expansion
- **`allowedEnvVars`** — env var names permitted in header interpolation

Non-2xx, connection failures, and timeouts are non-blocking errors. To block, return 2xx with appropriate JSON body.

### Prompt and Agent Hook Fields

- **`prompt`** (required) — prompt text. `$ARGUMENTS` placeholder injects hook input JSON.
- **`model`** — model override. Defaults to a fast model.

Response schema: `{ "ok": true }` to allow, `{ "ok": false, "reason": "..." }` to block.

## Hook Input

All events receive common fields as JSON (stdin for commands, POST body for HTTP):

- `session_id` — current session identifier
- `transcript_path` — path to conversation JSON
- `cwd` — current working directory
- `permission_mode` — `"default"`, `"plan"`, `"acceptEdits"`, `"auto"`, `"dontAsk"`, or `"bypassPermissions"` (not all
  events)
- `hook_event_name` — name of the event that fired

When running inside a subagent, two additional fields appear:

- `agent_id` — unique subagent identifier (absent on main thread)
- `agent_type` — agent name (`"Explore"`, `"security-reviewer"`, etc.)

## Hook Output

### Exit Code Behavior

- **Exit 0** — success. Stdout parsed for JSON. For `UserPromptSubmit`, `UserPromptExpansion`, and `SessionStart`,
  stdout text added as context
- **Exit 2** — blocking error. Stderr fed back to Claude. Effect depends on event (see blocking table below)
- **Other codes** — non-blocking error. Transcript shows notice with first line of stderr. Execution continues

Only exit 2 blocks. Exit 1 is non-blocking (unlike Unix convention).

### JSON Output Fields

On exit 0, stdout can contain a JSON object with these universal fields:

- **`continue`** (default: `true`) — `false` stops Claude entirely. Overrides event-specific fields.
- **`stopReason`** — message to user when `continue: false`.
- **`suppressOutput`** (default: `false`) — omit stdout from debug log.
- **`systemMessage`** — warning shown to user.

Output injected into context (`additionalContext`, `systemMessage`, plain stdout) is capped at 10,000 characters.

### Decision Control Summary

- **UserPromptSubmit, UserPromptExpansion, PostToolUse, PostToolUseFailure, PostToolBatch, Stop, SubagentStop,
  ConfigChange, PreCompact** — top-level `decision`. Key fields: `decision: "block"`, `reason`.
- **TeammateIdle, TaskCreated, TaskCompleted** — exit code or `continue: false`. Exit 2 blocks with stderr. JSON
  `continue: false` stops teammate entirely.
- **PreToolUse** — `hookSpecificOutput`. Key fields: `permissionDecision` (allow/deny/ask/defer),
  `permissionDecisionReason`.
- **PermissionRequest** — `hookSpecificOutput`. Key fields: `decision.behavior` (allow/deny), `updatedInput`,
  `updatedPermissions`.
- **PermissionDenied** — `hookSpecificOutput`. Key field: `retry: true` tells model it may retry.
- **WorktreeCreate** — path return. Command: path on stdout. HTTP: `hookSpecificOutput.worktreePath`.
- **Elicitation, ElicitationResult** — `hookSpecificOutput`. Key fields: `action` (accept/decline/cancel), `content`.
- **SessionStart, Setup** — context injection only via `additionalContext`. No blocking.
- **Notification, SessionEnd, PostCompact, InstructionsLoaded, StopFailure, CwdChanged, FileChanged, SubagentStart,
  WorktreeRemove** — no decision control. Side effects only.

When multiple hooks return different decisions, precedence is: `deny` > `defer` > `ask` > `allow` (PreToolUse), or most
restrictive wins (other events).

### HTTP Response Handling

- **2xx empty body** — success, no output
- **2xx plain text** — success, text added as context
- **2xx JSON body** — parsed same as command hook JSON output
- **Non-2xx / connection failure / timeout** — non-blocking error, continues

HTTP hooks cannot block via status codes alone. Return 2xx with JSON decision fields.

## Event Catalog

### Event Lifecycle Order

Setup-flag events: `Setup` (only on `--init-only`, or `--init` / `--maintenance` with `-p`).

Session events: `SessionStart` > per-turn loop (`UserPromptSubmit` / `UserPromptExpansion` > agentic loop [`PreToolUse`
\> `PermissionRequest` > `PostToolUse`/`PostToolUseFailure` > `PostToolBatch` > `SubagentStart`/`SubagentStop` >
`TaskCreated`/`TaskCompleted`] > `Stop`/`StopFailure`) > `TeammateIdle` > `PreCompact`/`PostCompact` > `SessionEnd`.

Standalone async events: `Notification`, `ConfigChange`, `CwdChanged`, `FileChanged`, `InstructionsLoaded`,
`WorktreeCreate`, `WorktreeRemove`, `Elicitation`, `ElicitationResult`, `PermissionDenied`.

There are 29 distinct events across all categories.

### Event Summary Table

**Can block (all 5 types — command, http, mcp_tool, prompt, agent):**

- **UserPromptSubmit** — no matcher. Before prompt processing.
- **UserPromptExpansion** — matcher: command/skill name. Slash command expansion before reaching Claude. Blocks the
  expansion itself.
- **PreToolUse** — matcher: tool name. Before tool executes.
- **PermissionRequest** — matcher: tool name. Permission dialog shown.
- **SubagentStop** — matcher: agent type. Subagent finishes.
- **TaskCreated** — no matcher. Task being created.
- **TaskCompleted** — no matcher. Task marked complete.
- **PostToolBatch** — no matcher. After full batch of parallel tool calls resolves. Blocks the next model call.
- **Stop** — no matcher. Claude finishes responding.

**Can block (command, http, mcp_tool):**

- **TeammateIdle** — no matcher. Teammate going idle.
- **ConfigChange** — matcher: config source. Config file changed (except `policy_settings`).
- **PreCompact** — matcher: trigger type. Blocks compaction (v2.1.105+).
- **WorktreeCreate** — no matcher. Any non-zero exit fails creation.
- **Elicitation** — matcher: MCP server name.
- **ElicitationResult** — matcher: MCP server name.

**Cannot block (all 5 types):**

- **PostToolUse** — matcher: tool name. `decision: "block"` feeds reason but cannot undo execution.
- **PostToolUseFailure** — matcher: tool name.

**Cannot block (command, http, mcp_tool):**

- **PermissionDenied** — matcher: tool name.
- **InstructionsLoaded** — matcher: load reason.
- **Notification** — matcher: notification type.
- **SubagentStart** — matcher: agent type.
- **StopFailure** — matcher: error type.
- **CwdChanged** — no matcher. Has `CLAUDE_ENV_FILE` access.
- **FileChanged** — matcher: literal filenames. Has `CLAUDE_ENV_FILE` access.
- **WorktreeRemove** — no matcher.
- **PostCompact** — matcher: trigger type.
- **SessionEnd** — matcher: exit reason.

**Cannot block (command, mcp_tool — no http/prompt/agent):**

- **SessionStart** — matcher: session source.
- **Setup** — matcher: `init` or `maintenance`. Fires only on `--init-only` / `-p --init` / `-p --maintenance`.

### Matcher Values per Event

- **PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, PermissionDenied** — tool name: `Bash`,
  `Edit|Write`, `mcp__.*`
- **SessionStart** — `startup`, `resume`, `clear`, `compact`
- **Setup** — `init`, `maintenance`
- **SessionEnd** — `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`
- **Notification** — `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`, `elicitation_complete`,
  `elicitation_response`
- **SubagentStart, SubagentStop** — agent type: `general-purpose`, `Explore`, `Plan`, or custom names
- **PreCompact, PostCompact** — `manual`, `auto`
- **ConfigChange** — `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`
- **StopFailure** — `rate_limit`, `authentication_failed`, `oauth_org_not_allowed`, `billing_error`, `invalid_request`,
  `server_error`, `max_output_tokens`, `unknown`
- **InstructionsLoaded** — `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`
- **UserPromptExpansion** — command/skill name (e.g., `deploy`, `review`)
- **Elicitation, ElicitationResult** — MCP server names
- **FileChanged** — literal filenames: `.envrc|.env`
- **UserPromptSubmit, PostToolBatch, Stop, TeammateIdle, TaskCreated, TaskCompleted, WorktreeCreate, WorktreeRemove,
  CwdChanged** — no matcher support, always fires

## Event Details

### SessionStart

Fires when a session begins or resumes. Only `type: "command"` and `type: "mcp_tool"` hooks are supported. Keep fast.

**Input fields:** `source` (`"startup"`, `"resume"`, `"clear"`, `"compact"`), `model` (model identifier), optional
`agent_type`.

```json
{
  "hook_event_name": "SessionStart",
  "source": "startup",
  "model": "claude-sonnet-4-6"
}
```

**Output:** Stdout text or `additionalContext` added as context for Claude.

**CLAUDE_ENV_FILE:** Available. Write `export KEY=VALUE` lines to persist env vars for all subsequent Bash commands.

### Setup

Fires only on explicit preparation flags: `claude --init-only`, `claude -p --init`, or `claude -p --maintenance`. Does
not fire on normal startup. Use for one-time dependency installation or scheduled cleanup triggered from CI or scripts.
For per-session initialization, use SessionStart. Only `type: "command"` and `type: "mcp_tool"` hooks are supported.

`--init-only` runs Setup hooks and SessionStart hooks (with `startup` matcher) then exits without starting a
conversation. `--init` and `--maintenance` fire Setup hooks only when combined with `-p` (print mode); in interactive
sessions those flags currently do not fire Setup.

**Matcher values:** `init` (`--init-only`, `-p --init`), `maintenance` (`-p --maintenance`).

**Input fields:** `trigger` (`"init"` or `"maintenance"`).

**Decision control:** Cannot block. On exit code 2, stderr is shown to the user; on any other non-zero exit code, stderr
appears only with `--verbose`. Execution continues in both cases. Return `additionalContext` in JSON output to pass
information into Claude's context (plain stdout goes to debug log only).

**CLAUDE_ENV_FILE:** Available — same persistence semantics as SessionStart.

**Note:** Because Setup does not fire on every launch, a plugin that needs a dependency installed cannot rely on Setup
alone. Pair with a SessionStart check that runs `npm install` if `${CLAUDE_PLUGIN_DATA}/node_modules` is absent.

### InstructionsLoaded

Fires when a CLAUDE.md or `.claude/rules/*.md` file is loaded into context. Fires at session start for eager loads and
later for lazy loads (subdirectory traversal, path glob match, includes, post-compaction reload).

**Input fields:** `file_path`, `memory_type` (`"User"`, `"Project"`, `"Local"`, `"Managed"`), `load_reason`
(`"session_start"`, `"nested_traversal"`, `"path_glob_match"`, `"include"`, `"compact"`), optional `globs`,
`trigger_file_path`, `parent_file_path`.

**Decision control:** None. Observability only.

### UserPromptSubmit

Fires when user submits a prompt, before Claude processes it.

**Input fields:** `prompt` (the submitted text).

**Decision control:**

- `decision` — `"block"` prevents processing and erases prompt. Omit to allow.
- `reason` — shown to user on block
- `additionalContext` — string added to Claude's context
- `sessionTitle` — sets session title (same as `/rename`)

Plain text stdout also works as context injection (no JSON needed).

### UserPromptExpansion

Fires when a user-typed slash command expands into a prompt, before it reaches Claude. Covers the path PreToolUse does
not: a PreToolUse hook on the Skill tool fires only when Claude invokes the tool, but typing `/skillname` directly
bypasses PreToolUse. UserPromptExpansion fires on that direct path.

Use cases: block specific commands from direct invocation, inject context for a particular skill, or log which commands
users invoke.

**Matcher:** `command_name` — the skill or custom command name. Leave empty to fire on every prompt-type slash command.

**Input fields:** `expansion_type` (`"slash_command"` for skill/custom commands, `"mcp_prompt"` for MCP server prompts),
`command_name`, `command_args`, `command_source`, `prompt` (the original prompt string).

**Decision control:**

- `decision` — `"block"` prevents the slash command from expanding. Omit to allow.
- `reason` — shown to user on block
- `additionalContext` — string added to Claude's context alongside the expanded prompt

### PreToolUse

Fires after Claude creates tool parameters, before execution. Matches on tool name.

**Input fields:** `tool_name`, `tool_input` (tool-specific), `tool_use_id`.

**Tool input schemas:**

- **Bash:** `command`, optional `description`, `timeout`, `run_in_background`
- **Write:** `file_path`, `content`
- **Edit:** `file_path`, `old_string`, `new_string`, optional `replace_all`
- **Read:** `file_path`, optional `offset`, `limit`
- **Glob:** `pattern`, optional `path`
- **Grep:** `pattern`, optional `path`, `glob`, `output_mode`, `-i`, `multiline`
- **WebFetch:** `url`, `prompt`
- **WebSearch:** `query`, optional `allowed_domains`, `blocked_domains`
- **Agent:** `prompt`, `description`, optional `subagent_type`, `model`
- **AskUserQuestion:** `questions` (array of question objects), optional `answers`

**Decision control (via `hookSpecificOutput`):**

- `permissionDecision` — `"allow"`, `"deny"`, `"ask"`, or `"defer"`
- `permissionDecisionReason` — for allow/ask: shown to user. For deny: shown to Claude. For defer: ignored.
- `updatedInput` — replaces tool input before execution (include unchanged fields)
- `additionalContext` — string added to Claude's context before tool executes

Precedence when multiple hooks respond: `deny` > `defer` > `ask` > `allow`.

`"allow"` skips the interactive prompt but does NOT override deny rules from settings. Deny rules from any scope
(including managed settings) always take precedence over hook approvals.

`"defer"` is for `-p` (non-interactive) mode only. Exits process with `stop_reason: "tool_deferred"` so the calling
process can collect input and resume. Only works for single tool calls per turn.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked"
  }
}
```

### PermissionRequest

Fires when a permission dialog is about to be shown. Matches on tool name.

**Input fields:** `tool_name`, `tool_input`, optional `permission_suggestions` (array of "always allow" options).

Does NOT fire in non-interactive mode (`-p`). Use PreToolUse for automated decisions.

**Decision control (via `hookSpecificOutput.decision`):**

- `behavior` — `"allow"` or `"deny"`
- `updatedInput` — for allow: modifies tool input (replaces entire object)
- `updatedPermissions` — for allow: array of permission update entries
- `message` — for deny: tells Claude why
- `interrupt` — for deny: if `true`, stops Claude

**Permission update entry types:**

- **`addRules`** — fields: `rules`, `behavior`, `destination`. Adds allow/deny/ask rules.
- **`replaceRules`** — fields: `rules`, `behavior`, `destination`. Replaces all rules of given behavior at destination.
- **`removeRules`** — fields: `rules`, `behavior`, `destination`. Removes matching rules.
- **`setMode`** — fields: `mode`, `destination`. Changes permission mode.
- **`addDirectories`** — fields: `directories`, `destination`. Adds working directories.
- **`removeDirectories`** — fields: `directories`, `destination`. Removes working directories.

**Destination values:** `session` (in-memory), `localSettings`, `projectSettings`, `userSettings`.

### PermissionDenied

Fires when the auto mode classifier denies a tool call. Only fires in auto mode — not on manual denials, PreToolUse
blocks, or deny rule matches.

**Input fields:** `tool_name`, `tool_input`, `tool_use_id`, `reason`.

**Decision control:** Return `hookSpecificOutput.retry: true` to tell the model it may retry. The denial itself is not
reversed.

### PostToolUse

Fires after a tool completes successfully. Matches on tool name.

**Input fields:** `tool_name`, `tool_input`, `tool_response`, `tool_use_id`, optional `duration_ms` (excludes time spent
in permission prompts and PreToolUse hooks).

**Decision control:**

- `decision` — `"block"` provides feedback to Claude (tool already ran)
- `reason` — shown to Claude on block
- `additionalContext` — context for Claude
- `hookSpecificOutput.updatedToolOutput` — replaces tool output for **all tools** as of v2.1.121 (was MCP-only before;
  the prior `updatedMCPToolOutput` field still works for MCP tools)

### PostToolUseFailure

Fires when a tool execution fails. Matches on tool name.

**Input fields:** `tool_name`, `tool_input`, `tool_use_id`, `error` (string), optional `is_interrupt` (boolean),
optional `duration_ms`.

**Decision control:** `additionalContext` only.

### PostToolBatch

Fires once after every tool call in a parallel batch resolves, before Claude Code sends the next request to the model.
PostToolUse fires once per tool (concurrently for parallel calls); PostToolBatch fires exactly once with the full batch,
making it the right place to inject context that depends on the set of tools that ran rather than any single tool. No
matcher support — always fires.

**Input fields:** Common fields plus the resolved batch info.

**Decision control:**

- `additionalContext` — context string injected once before the next model call
- `decision: "block"` or `continue: false` — stops the agentic loop before the next model call

### Notification

Fires when Claude Code sends a notification. Matches on type: `permission_prompt`, `idle_prompt`, `auth_success`,
`elicitation_dialog`.

**Input fields:** `message`, optional `title`, `notification_type`.

**Decision control:** `additionalContext` only.

### SubagentStart

Fires when a subagent spawns. Matches on agent type.

**Input fields:** `agent_id`, `agent_type`.

**Decision control:** `additionalContext` (injected into subagent context).

### SubagentStop

Fires when a subagent finishes. Matches on agent type. Uses same decision control as Stop.

**Input fields:** `stop_hook_active`, `agent_id`, `agent_type`, `agent_transcript_path`, `last_assistant_message`.

**Decision control:** `decision: "block"` with `reason` prevents the subagent from stopping.

### TaskCreated

Fires when a task is created via TaskCreate. No matcher support.

**Input fields:** `task_id`, `task_subject`, optional `task_description`, `teammate_name`, `team_name`.

**Decision control:** Exit 2 rolls back creation (stderr as feedback). JSON `continue: false` stops teammate entirely.

### TaskCompleted

Fires when a task is marked completed. No matcher support. Also fires when a teammate finishes with in-progress tasks.

**Input fields:** `task_id`, `task_subject`, optional `task_description`, `teammate_name`, `team_name`.

**Decision control:** Exit 2 prevents completion (stderr as feedback). JSON `continue: false` stops teammate entirely.

### Stop

Fires when Claude finishes responding. Does not fire on user interrupts. API errors fire StopFailure instead.

**Input fields:** `stop_hook_active` (boolean — `true` if already continuing from a Stop hook),
`last_assistant_message`.

Check `stop_hook_active` to prevent infinite loops.

**Decision control:**

- `decision` — `"block"` prevents stopping
- `reason` — required on block — tells Claude why to continue

### StopFailure

Fires when a turn ends due to API error. Output and exit code are ignored.

**Input fields:** `error` (type string used for matcher), optional `error_details`, `last_assistant_message`.

Error types: `rate_limit`, `authentication_failed`, `billing_error`, `invalid_request`, `server_error`,
`max_output_tokens`, `unknown`.

**Decision control:** None.

### TeammateIdle

Fires when an agent team teammate is about to go idle. No matcher support.

**Input fields:** `teammate_name`, `team_name`.

**Decision control:** Exit 2 continues teammate with stderr feedback. JSON `continue: false` stops teammate entirely.

### ConfigChange

Fires when a configuration file changes during a session. Matches on source.

**Input fields:** `source`, optional `file_path`.

**Decision control:** `decision: "block"` with `reason` prevents the change. `policy_settings` changes cannot be blocked
(hooks still fire for audit).

### CwdChanged

Fires when working directory changes. No matcher support. Command hooks only.

**Input fields:** `old_cwd`, `new_cwd`.

**Output:** `watchPaths` (array of absolute paths) to dynamically update FileChanged watch list.

**CLAUDE_ENV_FILE:** Available.

### FileChanged

Fires when a watched file changes on disk. Matcher serves dual role: builds watch list (split on `|` as literal
filenames) AND filters which hook groups run.

**Input fields:** `file_path`, `event` (`"change"`, `"add"`, `"unlink"`).

**Output:** `watchPaths` (array) to update dynamic watch list.

**CLAUDE_ENV_FILE:** Available. Command hooks only.

### WorktreeCreate

Fires when a worktree is being created (`claude --worktree` or subagent with `isolation: "worktree"`). Replaces default
git worktree behavior entirely — useful for non-git VCS like SVN, Perforce, or Mercurial. `.worktreeinclude` is NOT
processed when a hook is configured. To copy local config files like `.env` into the new worktree, do so inside the hook
script.

**Input fields:** `name` (slug identifier for the worktree).

**Output:** Must return the absolute path to the created worktree directory. Claude Code uses this path as the working
directory for the isolated session.

- Command hooks: print path on stdout
- HTTP hooks: return `{"hookSpecificOutput": {"hookEventName": "WorktreeCreate", "worktreePath": "/abs/path"}}`
  (v2.1.84+)

Any non-zero exit code fails worktree creation. If the hook produces no path, creation fails with an error.

### WorktreeRemove

Fires when a worktree is being removed. Cleanup counterpart to WorktreeCreate.

**Input fields:** `worktree_path` (absolute path to worktree being removed).

**Decision control:** None. Failures logged in debug mode only.

### PreCompact

Fires before context compaction. Matches on trigger: `manual` or `auto`.

**Input fields:** `trigger`, `custom_instructions` (user input from `/compact`, empty for auto).

**Decision control (v2.1.105+):** Can block compaction.

- Exit code 2 — blocks compaction. For manual `/compact`, stderr is shown to the user.
- JSON `{"decision": "block"}` — equivalent block.

Blocking automatic compaction has different effects depending on when it fires. If compaction was triggered proactively
before the context limit, Claude Code skips it and the conversation continues uncompacted. If compaction was triggered
to recover from a context-limit error already returned by the API, the underlying error surfaces and the current request
fails.

### PostCompact

Fires after context compaction completes. Same matcher values as PreCompact.

**Input fields:** `trigger`, `compact_summary` (generated conversation summary).

**Decision control:** None.

### Elicitation

Fires when an MCP server requests user input mid-task. Matches on MCP server name.

**Input fields:** `mcp_server_name`, `message`, optional `mode` (`"form"` or `"url"`), `url`, `elicitation_id`,
`requested_schema`.

**Decision control (via `hookSpecificOutput`):**

- `action` — `accept`, `decline`, or `cancel`. How to respond.
- `content` (object) — form field values (only for `accept`)

Exit 2 denies the elicitation.

### ElicitationResult

Fires after user responds to an MCP elicitation, before response sent to server. Matches on MCP server name.

**Input fields:** `mcp_server_name`, `action`, optional `mode`, `elicitation_id`, `content`.

**Decision control (via `hookSpecificOutput`):**

- `action` — `accept`, `decline`, or `cancel`. Overrides user's action.
- `content` (object) — overrides form field values

Exit 2 blocks the response (action becomes `decline`).

### SessionEnd

Fires when a session terminates. Matches on exit reason: `clear`, `resume`, `logout`, `prompt_input_exit`,
`bypass_permissions_disabled`, `other`.

**Input fields:** `reason`.

**Decision control:** None.

Default timeout: 1.5 seconds. Override with `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` env var.

## Exit Code 2 Blocking Behavior

**Blocking events (exit 2 blocks):**

- **PreToolUse** — blocks the tool call
- **PermissionRequest** — denies permission
- **UserPromptSubmit** — blocks and erases prompt
- **UserPromptExpansion** — blocks the slash command expansion
- **PostToolBatch** — stops the agentic loop before the next model call
- **Stop** — prevents stopping, continues conversation
- **SubagentStop** — prevents subagent from stopping
- **TeammateIdle** — continues teammate with stderr feedback
- **TaskCreated** — rolls back task creation
- **TaskCompleted** — prevents completion
- **ConfigChange** — blocks config change (except `policy_settings`)
- **PreCompact** — blocks compaction (v2.1.105+)
- **Elicitation** — denies the elicitation
- **ElicitationResult** — blocks response (becomes decline)
- **WorktreeCreate** — any non-zero exit code fails creation

**Non-blocking events (exit 2 effect):**

- **PostToolUse** — shows stderr to Claude (tool already ran)
- **PostToolUseFailure** — shows stderr to Claude
- **PermissionDenied** — ignored (use JSON `retry: true` instead)
- **StopFailure** — output and exit code ignored
- **Notification, SubagentStart, SessionStart, Setup, SessionEnd, CwdChanged, FileChanged, PostCompact** — shows stderr
  to user only
- **InstructionsLoaded** — exit code ignored
- **WorktreeRemove** — logged in debug only

## Async Hooks

Set `"async": true` on command hooks to run in background. Claude continues immediately.

- Only `type: "command"` supports async
- Cannot block or return decisions (action already proceeded)
- Output delivered on next conversation turn via `systemMessage` or `additionalContext`
- Each execution creates a separate background process (no deduplication)
- Default timeout: 10 minutes (same as sync)

## Hooks in Skills and Agents

Skills and subagents can define hooks in YAML frontmatter:

```yaml
---
name: secure-ops
description: Operations with security checks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

- All hook events supported
- For subagents, `Stop` hooks auto-convert to `SubagentStop`
- Hooks scoped to component lifetime, cleaned up on finish
- `once: true` runs hook once per session then removes it

## Environment Variables

- `CLAUDE_PROJECT_DIR` — project root path. Available in all hooks.
- `CLAUDE_PLUGIN_ROOT` — plugin installation directory. Plugin hooks only.
- `CLAUDE_PLUGIN_DATA` — plugin persistent data dir. Plugin hooks only.
- `CLAUDE_ENV_FILE` — file path for persisting env vars. SessionStart, CwdChanged, FileChanged only.
- `CLAUDE_CODE_REMOTE` — `"true"` in remote web envs. Available in all hooks.

## Security

- Command hooks run with full user permissions
- Validate and sanitize all inputs
- Always quote shell variables: `"$VAR"` not `$VAR`
- Block path traversal: check for `..` in file paths
- Use absolute paths with `$CLAUDE_PROJECT_DIR`
- PreToolUse hooks fire before permission-mode checks — a hook returning `deny` blocks even in `bypassPermissions` mode.
  A hook returning `allow` does NOT bypass deny rules from settings. Hooks can tighten but not loosen restrictions.

## Hooks and Permission Modes

PreToolUse hooks fire before any permission-mode check:

- `permissionDecision: "deny"` blocks even with `--dangerously-skip-permissions`
- `permissionDecision: "allow"` does NOT override deny rules from settings
- Hooks can tighten restrictions but not loosen past what permission rules allow

## Disabling Hooks

- Remove hook entry from settings JSON
- `"disableAllHooks": true` disables all hooks (respects managed settings hierarchy)
- No per-hook disable mechanism
- Managed policy hooks cannot be disabled by user/project settings

## Debugging

- `/hooks` menu: read-only browser for configured hooks (event, matcher, type, source)
- Transcript view (`Ctrl+O`): one-line summary per hook (success silent, errors show stderr)
- Debug log: `claude --debug-file /tmp/claude.log` for full execution details
- Verbose matching: `CLAUDE_CODE_DEBUG_LOG_LEVEL=verbose`
- Mid-session: `/debug` to enable logging

## Troubleshooting

- **Hook not firing:** Check `/hooks` menu, verify matcher case-sensitivity, confirm correct event type.
  PermissionRequest hooks don't fire in non-interactive mode — use PreToolUse instead
- **Stop hook infinite loop:** Check `stop_hook_active` field and exit early if `true`
- **JSON validation failed:** Shell profile `echo` statements pollute stdout. Wrap in `if [[ $- == *i* ]]; then` guard
- **Hook error in transcript:** Test manually with `echo '{"tool_name":"Bash"}' | ./hook.sh && echo $?`
- **Multiple `updatedInput` conflicts:** Hooks run in parallel; last to finish wins. Avoid multiple hooks modifying same
  tool's input
