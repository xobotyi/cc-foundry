# Hooks Reference

Hooks are user-defined shell commands, HTTP endpoints, or LLM prompts that execute automatically at specific points in
Claude Code's lifecycle. They provide deterministic control over behavior, ensuring certain actions always happen rather
than relying on the LLM to choose to run them.

## Hook Types

- **`command`** -- run a shell command; receives JSON on stdin, communicates via exit codes + stdout/stderr
- **`http`** -- POST event JSON to a URL; response body uses the same JSON output format as command hooks
- **`prompt`** -- single-turn LLM evaluation; returns `{ok, reason}` JSON decision
- **`agent`** -- multi-turn subagent with tool access (Read, Grep, Glob); returns same `{ok, reason}` decision

## Configuration Structure

Three levels of nesting:

1. **Hook event** -- lifecycle point (`PreToolUse`, `Stop`, etc.)
2. **Matcher group** -- regex filter for when it fires (tool name, session source, etc.)
3. **Hook handlers** -- one or more handlers to run when matched

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<regex>",
        "hooks": [
          { "type": "command", "command": "..." }
        ]
      }
    ]
  }
}
```

All matching hooks run in parallel. Identical handlers are deduplicated (by command string for command hooks, by URL for
HTTP hooks).

### Hook Locations

- `~/.claude/settings.json` -- all projects, not shareable
- `.claude/settings.json` -- single project, committable
- `.claude/settings.local.json` -- single project, gitignored
- Managed policy settings -- organization-wide, admin-controlled
- Plugin `hooks/hooks.json` -- active when plugin is enabled
- Skill/agent YAML frontmatter -- active while the component is active

Enterprise admins can set `allowManagedHooksOnly` to block user, project, and plugin hooks.

To disable all hooks: `"disableAllHooks": true` in settings. Managed-level `disableAllHooks` overrides all scopes.

### Hooks in Skills and Agents

Skills and agents can define hooks in YAML frontmatter. These hooks are scoped to the component's lifecycle and cleaned
up when it finishes. For subagents, `Stop` hooks auto-convert to `SubagentStop`.

```yaml
---
name: secure-operations
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

### The /hooks Menu

Type `/hooks` to browse configured hooks (read-only). Shows event counts, matchers, handler details. Labels indicate
source: `User`, `Project`, `Local`, `Plugin`, `Session`, `Built-in`.

## Common Handler Fields

- `type` (required) -- `"command"`, `"http"`, `"prompt"`, or `"agent"`
- `timeout` -- seconds before canceling; defaults: 600 (command), 30 (prompt), 60 (agent)
- `statusMessage` -- custom spinner text while hook runs
- `once` -- if `true`, runs once per session then removed (skills only)

### Command Hook Fields

- `command` (required) -- shell command to execute
- `async` -- if `true`, runs in background without blocking

### HTTP Hook Fields

- `url` (required) -- POST target URL
- `headers` -- key-value pairs; values support `$VAR_NAME` / `${VAR_NAME}` interpolation
- `allowedEnvVars` -- array of env var names allowed for header interpolation; unlisted vars resolve to empty

HTTP error handling: non-2xx, connection failures, and timeouts produce non-blocking errors. To block a tool call,
return 2xx with JSON body containing `decision: "block"` or `hookSpecificOutput` with `permissionDecision: "deny"`.

### Prompt and Agent Hook Fields

- `prompt` (required) -- text sent to the model; `$ARGUMENTS` placeholder injects hook input JSON
- `model` -- model for evaluation; defaults to a fast model (Haiku)

## Matcher Patterns

The `matcher` field is a regex. Use `"*"`, `""`, or omit to match all occurrences.

**Tool events** (`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`): matches on `tool_name` -- e.g.
`Bash`, `Edit|Write`, `mcp__.*`

**SessionStart**: `startup`, `resume`, `clear`, `compact`

**SessionEnd**: `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`

**Notification**: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`

**SubagentStart / SubagentStop**: agent type -- `Bash`, `Explore`, `Plan`, or custom names

**PreCompact / PostCompact**: `manual`, `auto`

**ConfigChange**: `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`

**StopFailure**: `rate_limit`, `authentication_failed`, `billing_error`, `invalid_request`, `server_error`,
`max_output_tokens`, `unknown`

**InstructionsLoaded**: `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`

**Elicitation / ElicitationResult**: MCP server name

**No matcher support** (always fires): `UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCompleted`, `WorktreeCreate`,
`WorktreeRemove`

### MCP Tool Matching

MCP tools follow the naming pattern `mcp__<server>__<tool>`. Examples:

- `mcp__memory__.*` -- all tools from the memory server
- `mcp__.*__write.*` -- any write tool from any server

## Common Input Fields

All events receive these fields as JSON (stdin for command hooks, POST body for HTTP hooks):

- `session_id` -- current session identifier
- `transcript_path` -- path to conversation JSON
- `cwd` -- working directory when hook fired
- `permission_mode` -- `"default"`, `"plan"`, `"acceptEdits"`, `"dontAsk"`, or `"bypassPermissions"` (not all events)
- `hook_event_name` -- name of the event

When running inside a subagent or with `--agent`:

- `agent_id` -- unique subagent identifier (present only inside subagent calls)
- `agent_type` -- agent name (e.g. `"Explore"`, `"security-reviewer"`)

## Exit Code Output

- **Exit 0** -- success; stdout parsed for JSON output; for `UserPromptSubmit` and `SessionStart`, stdout added as
  context
- **Exit 2** -- blocking error; stderr fed back to Claude as error message; stdout/JSON ignored
- **Any other exit** -- non-blocking error; stderr shown in verbose mode only

## HTTP Response Handling

- **2xx empty body** -- success, no output
- **2xx plain text** -- success, text added as context
- **2xx JSON body** -- success, parsed as JSON output
- **Non-2xx / connection failure / timeout** -- non-blocking error, execution continues

Cannot signal blocking error through status codes alone; must return 2xx + JSON with decision fields.

## JSON Output

Exit 0 + JSON stdout for structured control. Choose one approach: exit codes alone, or exit 0 with JSON. JSON is ignored
on exit 2.

**Universal fields:**

- `continue` (default `true`) -- if `false`, Claude stops entirely; takes precedence over event-specific decisions
- `stopReason` -- message shown to user when `continue` is `false`
- `suppressOutput` (default `false`) -- hides stdout from verbose mode
- `systemMessage` -- warning shown to user

### Decision Control Summary

**Top-level `decision`** (used by UserPromptSubmit, PostToolUse, PostToolUseFailure, Stop, SubagentStop, ConfigChange):
`decision: "block"` + `reason`

**Exit code or `continue: false`** (used by TeammateIdle, TaskCompleted): Exit 2 blocks with stderr feedback;
`{"continue": false, "stopReason": "..."}` stops the teammate entirely

**`hookSpecificOutput` with `permissionDecision`** (PreToolUse): `permissionDecision`: `"allow"` / `"deny"` / `"ask"` +
`permissionDecisionReason`

**`hookSpecificOutput` with `decision.behavior`** (PermissionRequest): `behavior`: `"allow"` / `"deny"`

**stdout path** (WorktreeCreate): Hook prints absolute path to created worktree; non-zero exit fails creation

**`hookSpecificOutput` with `action`** (Elicitation, ElicitationResult): `action`: `"accept"` / `"decline"` /
`"cancel"` + `content` (form values for accept)

**No decision control** (WorktreeRemove, Notification, SessionEnd, PreCompact, PostCompact, InstructionsLoaded,
StopFailure, SubagentStart, SessionStart): Side effects only (logging, cleanup)

### Exit Code 2 Behavior Per Event

Events that **can block**: PreToolUse, PermissionRequest, UserPromptSubmit, Stop, SubagentStop, TeammateIdle,
TaskCompleted, ConfigChange (except `policy_settings`), Elicitation, ElicitationResult, WorktreeCreate (any non-zero
fails)

Events that **cannot block**: StopFailure (ignored), PostToolUse / PostToolUseFailure (stderr shown to Claude),
Notification / SubagentStart / SessionStart / SessionEnd / PreCompact / PostCompact (stderr shown to user only),
WorktreeRemove (logged in debug), InstructionsLoaded (ignored)

## Hook Events

### SessionStart

Fires when a session begins or resumes. Only `type: "command"` hooks supported.

**Matcher values:** `startup` (new), `resume` (`--resume`/`--continue`/`/resume`), `clear` (`/clear`), `compact`
(auto/manual compaction)

**Input fields:** `source`, `model`, optional `agent_type`

**Decision control:** stdout text added as context. JSON `additionalContext` field also supported.

#### CLAUDE_ENV_FILE

Available only in SessionStart hooks. Write `export` statements to `$CLAUDE_ENV_FILE` to persist environment variables
for all subsequent Bash commands in the session. Use append (`>>`) to preserve variables from other hooks.

```bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
fi
```

To capture all env changes from setup commands:

```bash
ENV_BEFORE=$(export -p | sort)
source ~/.nvm/nvm.sh && nvm use 20
if [ -n "$CLAUDE_ENV_FILE" ]; then
  ENV_AFTER=$(export -p | sort)
  comm -13 <(echo "$ENV_BEFORE") <(echo "$ENV_AFTER") >> "$CLAUDE_ENV_FILE"
fi
```

### InstructionsLoaded

Fires when a CLAUDE.md or `.claude/rules/*.md` file is loaded into context. Fires at session start for eager loads and
later for lazy loads (subdirectory traversal, path glob matches). Async, observability only. Only `type: "command"`
hooks.

**Matcher values:** `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`

**Input fields:**

- `file_path` -- absolute path to loaded file
- `memory_type` -- `"User"`, `"Project"`, `"Local"`, or `"Managed"`
- `load_reason` -- why loaded (matches matcher values)
- `globs` -- path glob patterns from `paths:` frontmatter (only for `path_glob_match`)
- `trigger_file_path` -- file whose access triggered this load (lazy loads)
- `parent_file_path` -- parent instruction file (for `include` loads)

**Decision control:** none

### UserPromptSubmit

Fires when user submits a prompt, before Claude processes it.

**No matcher support.**

**Input fields:** `prompt` (submitted text)

**Decision control:**

- Plain text stdout on exit 0 -- added as context
- JSON `additionalContext` -- added as context
- `decision: "block"` + `reason` -- blocks prompt processing and erases the prompt; reason shown to user

### PreToolUse

Fires after Claude creates tool parameters, before executing the tool call.

**Matcher:** tool name -- `Bash`, `Edit`, `Write`, `Read`, `Glob`, `Grep`, `Agent`, `WebFetch`, `WebSearch`,
`mcp__<server>__<tool>`

**Input fields:** `tool_name`, `tool_input`, `tool_use_id`

#### Tool Input Schemas

**Bash:** `command` (string), `description` (string, optional), `timeout` (number, optional ms), `run_in_background`
(boolean)

**Write:** `file_path` (string), `content` (string)

**Edit:** `file_path` (string), `old_string` (string), `new_string` (string), `replace_all` (boolean)

**Read:** `file_path` (string), `offset` (number, optional), `limit` (number, optional)

**Glob:** `pattern` (string), `path` (string, optional)

**Grep:** `pattern` (string), `path` (string, optional), `glob` (string, optional), `output_mode` (string, optional),
`-i` (boolean), `multiline` (boolean)

**WebFetch:** `url` (string), `prompt` (string)

**WebSearch:** `query` (string), `allowed_domains` (array, optional), `blocked_domains` (array, optional)

**Agent:** `prompt` (string), `description` (string), `subagent_type` (string), `model` (string, optional)

#### PreToolUse Decision Control

Uses `hookSpecificOutput` (not top-level `decision`):

- `permissionDecision` -- `"allow"` (skip permission prompt; deny/ask rules still apply), `"deny"` (cancel tool call),
  `"ask"` (show permission prompt to user)
- `permissionDecisionReason` -- for allow/ask: shown to user; for deny: shown to Claude
- `updatedInput` -- modifies tool input before execution
- `additionalContext` -- string added to Claude's context

When a hook returns `"ask"`, the prompt includes a source label (`[User]`, `[Project]`, `[Plugin]`, `[Local]`).

Note: top-level `decision`/`reason` are deprecated for PreToolUse. Use `hookSpecificOutput.permissionDecision`.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Use rg instead of grep"
  }
}
```

### PermissionRequest

Fires when a permission dialog is about to be shown. Does **not** fire in non-interactive mode (`-p`); use PreToolUse
instead for automated permission decisions.

**Matcher:** tool name (same as PreToolUse)

**Input fields:** `tool_name`, `tool_input`, optional `permission_suggestions` (array of "always allow" options)

#### PermissionRequest Decision Control

Uses `hookSpecificOutput.decision`:

- `behavior` -- `"allow"` or `"deny"`
- `updatedInput` -- (allow only) modify tool input before execution
- `updatedPermissions` -- (allow only) array of permission update entries
- `message` -- (deny only) tells Claude why denied
- `interrupt` -- (deny only) if `true`, stops Claude

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedPermissions": [
        { "type": "setMode", "mode": "acceptEdits", "destination": "session" }
      ]
    }
  }
}
```

#### Permission Update Entries

Used in `updatedPermissions` output and `permission_suggestions` input:

- `addRules` -- `rules` (array of `{toolName, ruleContent?}`), `behavior` (`allow`/`deny`/`ask`), `destination`
- `replaceRules` -- replaces all rules of given `behavior` at `destination`
- `removeRules` -- removes matching rules
- `setMode` -- `mode` (`default`/`acceptEdits`/`dontAsk`/`bypassPermissions`/`plan`), `destination`
- `addDirectories` -- `directories` (array of paths), `destination`
- `removeDirectories` -- `directories`, `destination`

**Destination values:** `session` (in-memory only), `localSettings`, `projectSettings`, `userSettings`

### PostToolUse

Fires after a tool completes successfully.

**Matcher:** tool name

**Input fields:** `tool_name`, `tool_input`, `tool_response`, `tool_use_id`

**Decision control:**

- `decision: "block"` + `reason` -- prompts Claude with the reason (tool already ran, cannot undo)
- `additionalContext` -- additional context for Claude
- `updatedMCPToolOutput` -- (MCP tools only) replaces tool output

### PostToolUseFailure

Fires when a tool execution fails.

**Matcher:** tool name

**Input fields:** `tool_name`, `tool_input`, `tool_use_id`, `error` (string), `is_interrupt` (boolean, optional)

**Decision control:** `additionalContext` only

### Notification

Fires when Claude Code sends a notification. Only `type: "command"` hooks.

**Matcher values:** `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`

**Input fields:** `message`, optional `title`, `notification_type`

**Decision control:** `additionalContext` only; cannot block notifications

### SubagentStart

Fires when a subagent is spawned. Only `type: "command"` hooks.

**Matcher:** agent type (`Bash`, `Explore`, `Plan`, or custom names)

**Input fields:** `agent_id`, `agent_type`

**Decision control:** `additionalContext` injected into subagent's context; cannot block

### SubagentStop

Fires when a subagent finishes responding.

**Matcher:** agent type (same as SubagentStart)

**Input fields:** `stop_hook_active`, `agent_id`, `agent_type`, `agent_transcript_path`, `last_assistant_message`

**Decision control:** same as Stop -- `decision: "block"` + `reason`

### Stop

Fires when the main Claude agent finishes responding. Does not fire on user interrupts. API errors fire StopFailure
instead.

**No matcher support.**

**Input fields:** `stop_hook_active` (boolean -- `true` when already continuing from a stop hook),
`last_assistant_message`

**Decision control:** `decision: "block"` + `reason` (required) prevents Claude from stopping

To prevent infinite loops, check `stop_hook_active`:

```bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi
# ... hook logic
```

### StopFailure

Fires instead of Stop when the turn ends due to an API error. Output and exit code are **ignored**. Only
`type: "command"` hooks.

**Matcher values:** `rate_limit`, `authentication_failed`, `billing_error`, `invalid_request`, `server_error`,
`max_output_tokens`, `unknown`

**Input fields:** `error` (type string, used for matcher), `error_details` (optional), `last_assistant_message`
(contains API error string, not conversational output)

**Decision control:** none

### TeammateIdle

Fires when an agent team teammate is about to go idle. Only `type: "command"` hooks.

**No matcher support.**

**Input fields:** `teammate_name`, `team_name`

**Decision control:**

- Exit 2 -- teammate receives stderr feedback and continues working
- `{"continue": false, "stopReason": "..."}` -- stops teammate entirely

### TaskCompleted

Fires when a task is being marked as completed (explicit TaskUpdate or teammate finishing with in-progress tasks). Only
`type: "command"` hooks.

**No matcher support.**

**Input fields:** `task_id`, `task_subject`, optional `task_description`, `teammate_name`, `team_name`

**Decision control:**

- Exit 2 -- task not marked completed; stderr fed back as feedback
- `{"continue": false, "stopReason": "..."}` -- stops teammate entirely

### ConfigChange

Fires when a configuration file changes during a session. Only `type: "command"` hooks.

**Matcher values:** `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`

**Input fields:** `source`, optional `file_path`

**Decision control:** `decision: "block"` + `reason` prevents the change from being applied. Exception:
`policy_settings` changes **cannot** be blocked (hooks still fire for audit logging).

### WorktreeCreate

Fires when a worktree is being created (`--worktree` or `isolation: "worktree"`). Replaces default git behavior. Only
`type: "command"` hooks.

**No matcher support.**

**Input fields:** `name` (slug identifier for the worktree)

**Output:** hook must print absolute path to created worktree on stdout. Non-zero exit fails creation. Does not use
standard decision model.

### WorktreeRemove

Cleanup counterpart to WorktreeCreate. Fires when worktree is being removed. Only `type: "command"` hooks.

**No matcher support.**

**Input fields:** `worktree_path` (absolute path to worktree being removed)

**Decision control:** none; failures logged in debug mode only

### PreCompact

Fires before a compact operation. Only `type: "command"` hooks.

**Matcher values:** `manual`, `auto`

**Input fields:** `trigger`, `custom_instructions` (user input from `/compact`; empty for auto)

**Decision control:** none

### PostCompact

Fires after a compact operation completes. Only `type: "command"` hooks.

**Matcher values:** `manual`, `auto`

**Input fields:** `trigger`, `compact_summary` (generated conversation summary)

**Decision control:** none

### SessionEnd

Fires when a session terminates. Only `type: "command"` hooks.

**Matcher values:** `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`

**Input fields:** `reason`

**Decision control:** none; cannot block session termination

Default timeout: 1.5 seconds. Override with `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` env var (milliseconds). Per-hook
`timeout` is also capped by this value.

### Elicitation

Fires when an MCP server requests user input mid-task. Only `type: "command"` hooks.

**Matcher:** MCP server name

**Input fields:** `mcp_server_name`, `message`, optional `mode` (`"form"` or `"url"`), `url`, `elicitation_id`,
`requested_schema`

**Decision control:** `hookSpecificOutput` with `action` (`accept`/`decline`/`cancel`) and `content` (form values for
accept). Exit 2 denies the elicitation.

### ElicitationResult

Fires after user responds to MCP elicitation, before response is sent to server. Only `type: "command"` hooks.

**Matcher:** MCP server name

**Input fields:** `mcp_server_name`, `action`, optional `mode`, `elicitation_id`, `content`

**Decision control:** `hookSpecificOutput` with `action` and `content` to override user's response. Exit 2 changes
action to `decline`.

## Prompt and Agent Hook Support

Events supporting all four types (`command`, `http`, `prompt`, `agent`): PermissionRequest, PostToolUse,
PostToolUseFailure, PreToolUse, Stop, SubagentStop, TaskCompleted, UserPromptSubmit

Events supporting only `type: "command"`: ConfigChange, Elicitation, ElicitationResult, InstructionsLoaded,
Notification, PostCompact, PreCompact, SessionEnd, SessionStart, StopFailure, SubagentStart, TeammateIdle,
WorktreeCreate, WorktreeRemove

### Prompt Hook Response Schema

The LLM must respond with:

```json
{ "ok": true }
```

or:

```json
{ "ok": false, "reason": "Explanation shown to Claude" }
```

`ok: true` allows the action. `ok: false` blocks it; `reason` is required and fed back to Claude.

### Agent Hook Behavior

Spawns a subagent that can use tools (Read, Grep, Glob) for up to 50 turns. Returns the same `{ok, reason}` decision.
Default timeout: 60 seconds. Useful when verification requires inspecting actual files or running commands.

## Async Hooks

Set `"async": true` on command hooks to run in background without blocking. Only `type: "command"` supported.

- Claude continues immediately; hook output delivered on next conversation turn
- Decision fields (`decision`, `permissionDecision`, `continue`) have no effect
- `systemMessage` and `additionalContext` are delivered when the process exits
- Each execution creates a separate background process (no deduplication)
- Completion notifications suppressed by default; enable with `--verbose` or `Ctrl+O`

```json
{
  "type": "command",
  "command": "/path/to/run-tests.sh",
  "async": true,
  "timeout": 120
}
```

## Reference Script Paths

- `$CLAUDE_PROJECT_DIR` -- project root (quote for paths with spaces)
- `${CLAUDE_PLUGIN_ROOT}` -- plugin installation directory (changes on updates)
- `${CLAUDE_PLUGIN_DATA}` -- plugin persistent data directory (survives updates)
- `$CLAUDE_CODE_REMOTE` -- set to `"true"` in remote web environments

## Security Considerations

Command hooks run with your system user's full permissions. Best practices:

- Validate and sanitize all inputs
- Always quote shell variables (`"$VAR"` not `$VAR`)
- Block path traversal (check for `..` in file paths)
- Use absolute paths; reference scripts via `$CLAUDE_PROJECT_DIR`
- Skip sensitive files (`.env`, `.git/`, keys)

## Troubleshooting

**Hook not firing:** Run `/hooks` to confirm it appears under the correct event. Check matcher case sensitivity. Verify
correct event type (`PreToolUse` = before, `PostToolUse` = after). `PermissionRequest` hooks do not fire in
non-interactive mode (`-p`).

**Hook error in output:** Test manually:
`echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | ./my-hook.sh && echo $?`. Use absolute paths or
`$CLAUDE_PROJECT_DIR`. Install `jq` if missing. Ensure script is executable (`chmod +x`).

**JSON validation failed:** Shell profile `echo` statements can prepend text to JSON output. Wrap profile echoes in
interactive-only guards: `if [[ $- == *i* ]]; then echo "..."; fi`

**Stop hook runs forever:** Check `stop_hook_active` field from input JSON and exit 0 when `true`.

**/hooks shows nothing:** Verify JSON validity (no trailing commas/comments). Check file location. File watcher normally
auto-detects changes; restart session if needed.

**Debug:** `claude --debug` for full execution details. `Ctrl+O` toggles verbose mode in transcript.
