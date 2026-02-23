# Hooks Reference

Hooks are shell commands or LLM prompts that execute automatically at specific points in
Claude Code's lifecycle. They provide deterministic control — certain actions always happen
rather than relying on the LLM to choose to run them.

## Hook Lifecycle

| Event                | When It Fires                                           |
|----------------------|---------------------------------------------------------|
| `SessionStart`       | Session begins or resumes                               |
| `UserPromptSubmit`   | User submits prompt, before processing                  |
| `PreToolUse`         | Before tool call executes (can block)                   |
| `PermissionRequest`  | Permission dialog appears                               |
| `PostToolUse`        | After tool call succeeds                                |
| `PostToolUseFailure` | After tool call fails                                   |
| `Notification`       | Claude Code sends a notification                        |
| `SubagentStart`      | Subagent spawned                                        |
| `SubagentStop`       | Subagent finishes                                       |
| `Stop`               | Claude finishes responding                              |
| `TeammateIdle`       | Agent team teammate about to go idle                    |
| `TaskCompleted`      | Task being marked as completed                          |
| `ConfigChange`       | Configuration file changes during session               |
| `PreCompact`         | Before context compaction                               |
| `SessionEnd`         | Session terminates                                      |

All matching hooks run in parallel. Identical hook commands are deduplicated automatically.

## Configuration

### Hook Locations

| Location                                   | Scope                         | Shareable             |
|--------------------------------------------|-------------------------------|-----------------------|
| `~/.claude/settings.json`                  | All your projects             | No, local to machine  |
| `.claude/settings.json`                    | Single project                | Yes, commit to repo   |
| `.claude/settings.local.json`              | Single project                | No, gitignored        |
| Managed policy settings                    | Organization-wide             | Admin-controlled      |
| Plugin `hooks/hooks.json`                  | When plugin enabled           | Yes, bundled          |
| Skill/agent YAML frontmatter               | While component is active     | Yes                   |

### Basic Structure

Three levels of nesting: event → matcher group → hook handler(s).

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs prettier --write"
          }
        ]
      }
    ]
  }
}
```

### Matcher Patterns

The `matcher` field is a regex string. Use `"*"`, `""`, or omit it entirely to match all
occurrences. Each event type matches on a different field:

| Event                                                                     | Matches On           | Example Values                                                              |
|---------------------------------------------------------------------------|----------------------|-----------------------------------------------------------------------------|
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`    | Tool name            | `Bash`, `Edit\|Write`, `mcp__.*`                                            |
| `SessionStart`                                                            | How session started  | `startup`, `resume`, `clear`, `compact`                                     |
| `SessionEnd`                                                              | Why session ended    | `clear`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other` |
| `Notification`                                                            | Notification type    | `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`    |
| `SubagentStart`, `SubagentStop`                                           | Agent type           | `Bash`, `Explore`, `Plan`, custom agent names                               |
| `PreCompact`                                                              | Trigger type         | `manual`, `auto`                                                            |
| `ConfigChange`                                                            | Config source        | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` |
| `UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCompleted`               | No matcher support   | Always fires on every occurrence                                            |

Matchers are case-sensitive. `Edit|Write` matches either tool; `Notebook.*` matches any tool
starting with "Notebook".

#### MCP Tool Matching

MCP tools follow the pattern `mcp__<server>__<tool>`:

- `mcp__memory__create_entities`
- `mcp__filesystem__read_file`

Match patterns: `mcp__memory__.*` (all from memory server), `mcp__.*__write.*` (any write
tool across servers).

### Hook Handler Fields

#### Common Fields

| Field           | Required | Default  | Description                                              |
|-----------------|----------|----------|----------------------------------------------------------|
| `type`          | Yes      | —        | `"command"`, `"prompt"`, or `"agent"`                    |
| `timeout`       | No       | 600/30/60 | Seconds before cancel (command/prompt/agent defaults)   |
| `statusMessage` | No       | —        | Custom spinner message while hook runs                   |
| `once`          | No       | false    | Run only once per session then removed (skills only)     |

#### Command Hook Fields

| Field     | Required | Description                                                   |
|-----------|----------|---------------------------------------------------------------|
| `command` | Yes      | Shell command to execute                                      |
| `async`   | No       | If true, runs in background without blocking                  |

#### Prompt/Agent Hook Fields

| Field    | Required | Description                                                       |
|----------|----------|-------------------------------------------------------------------|
| `prompt` | Yes      | Prompt text; use `$ARGUMENTS` as placeholder for hook input JSON  |
| `model`  | No       | Model to use; defaults to a fast model                            |

### Reference Scripts by Path

Hook commands execute from Claude Code's current working directory, which changes when
Claude performs `cd` operations. **Relative paths break silently** — the hook disappears
with no error. Always use absolute paths via environment variables:

```json
{ "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-style.sh" }
```

For plugins:

```json
{ "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh" }
```

### Plugin Hooks

Define plugin hooks in `hooks/hooks.json`. Supports an optional top-level `description`
field. Plugin hooks merge with user and project hooks when the plugin is enabled.

```json
{
  "description": "Automatic code formatting",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh", "timeout": 30 }
        ]
      }
    ]
  }
}
```

### Hooks in Skills and Agents

Define hooks directly in skill or agent YAML frontmatter. Scoped to the component's
lifetime; cleaned up when it finishes. All events supported. For subagents, `Stop` hooks
are automatically converted to `SubagentStop`.

```yaml
---
name: secure-operations
description: Perform operations with security checks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

### The `/hooks` Menu

Type `/hooks` in Claude Code to view, add, and delete hooks interactively. Labels indicate
source: `[User]`, `[Project]`, `[Local]`, `[Plugin]` (read-only).

To disable all hooks: use the toggle in `/hooks` or set `"disableAllHooks": true` in
settings. Individual hooks cannot be disabled without removing them.

**Important:** Claude Code captures hooks at startup. External file edits don't take effect
mid-session without review in `/hooks`. Hooks added through `/hooks` take effect immediately.

`disableAllHooks` in user/project settings cannot disable managed policy hooks. Only
`disableAllHooks` at the managed settings level can disable those.

---

## Hook Input and Output

### Common Input Fields

All hooks receive JSON on stdin:

| Field             | Description                                                                               |
|-------------------|-------------------------------------------------------------------------------------------|
| `session_id`      | Current session identifier                                                                |
| `transcript_path` | Path to conversation JSON                                                                 |
| `cwd`             | Current working directory                                                                 |
| `permission_mode` | `"default"`, `"plan"`, `"acceptEdits"`, `"dontAsk"`, or `"bypassPermissions"`            |
| `hook_event_name` | Name of the event that fired                                                              |

### Exit Code Behavior

| Exit Code | Meaning                                                    |
|-----------|------------------------------------------------------------|
| 0         | Success; Claude Code parses stdout for JSON output         |
| 2         | Blocking error; stderr fed to Claude or shown to user      |
| Other     | Non-blocking error; stderr shown in verbose mode (`Ctrl+O`) |

For `UserPromptSubmit` and `SessionStart`, stdout on exit 0 is added as Claude context.
JSON output is only processed on exit 0. Choosing exit 2 ignores any JSON in stdout.

#### Exit Code 2 Behavior Per Event

| Event                | Can Block? | What Happens on Exit 2                                              |
|----------------------|------------|---------------------------------------------------------------------|
| `PreToolUse`         | Yes        | Blocks the tool call                                                |
| `PermissionRequest`  | Yes        | Denies the permission                                               |
| `UserPromptSubmit`   | Yes        | Blocks prompt and erases it from context                            |
| `Stop`               | Yes        | Prevents Claude from stopping; continues the conversation           |
| `SubagentStop`       | Yes        | Prevents the subagent from stopping                                 |
| `TeammateIdle`       | Yes        | Prevents teammate from going idle; teammate continues working       |
| `TaskCompleted`      | Yes        | Prevents task from being marked completed                           |
| `ConfigChange`       | Yes        | Blocks config change from taking effect (except `policy_settings`)  |
| `PostToolUse`        | No         | Shows stderr to Claude (tool already ran)                           |
| `PostToolUseFailure` | No         | Shows stderr to Claude (tool already failed)                        |
| `Notification`       | No         | Shows stderr to user only                                           |
| `SubagentStart`      | No         | Shows stderr to user only                                           |
| `SessionStart`       | No         | Shows stderr to user only                                           |
| `SessionEnd`         | No         | Shows stderr to user only                                           |
| `PreCompact`         | No         | Shows stderr to user only                                           |

### JSON Output Fields

On exit 0, stdout can contain a JSON object with these universal fields:

| Field            | Default | Description                                                                         |
|------------------|---------|-------------------------------------------------------------------------------------|
| `continue`       | `true`  | If `false`, Claude stops entirely. Takes precedence over event-specific decisions   |
| `stopReason`     | none    | Shown to user when `continue` is `false`. Not shown to Claude                       |
| `suppressOutput` | `false` | If `true`, hides stdout from verbose mode                                           |
| `systemMessage`  | none    | Warning message shown to the user                                                   |

To stop Claude entirely regardless of event:

```json
{ "continue": false, "stopReason": "Build failed, fix errors before continuing" }
```

### Decision Control Patterns

Different events use different patterns for blocking or controlling behavior:

| Events                                                                                             | Pattern              | Key Fields                                                          |
|----------------------------------------------------------------------------------------------------|----------------------|---------------------------------------------------------------------|
| `UserPromptSubmit`, `PostToolUse`, `PostToolUseFailure`, `Stop`, `SubagentStop`, `ConfigChange`    | Top-level `decision` | `decision: "block"`, `reason`                                       |
| `TeammateIdle`, `TaskCompleted`                                                                    | Exit code only       | Exit 2 blocks; stderr fed as feedback                               |
| `PreToolUse`                                                                                       | `hookSpecificOutput` | `permissionDecision` (allow/deny/ask), `permissionDecisionReason`   |
| `PermissionRequest`                                                                                | `hookSpecificOutput` | `decision.behavior` (allow/deny)                                    |

---

## Hook Events

### SessionStart

Runs when session starts or resumes. Keep these hooks fast — they run on every session.
Use for dynamic context injection; for static context, use `CLAUDE.md` instead.

**Matcher values:** `startup`, `resume`, `clear`, `compact`

**Additional input fields:**

| Field        | Description                                                                              |
|--------------|------------------------------------------------------------------------------------------|
| `source`     | How the session started: `"startup"`, `"resume"`, `"clear"`, `"compact"`                |
| `model`      | Model identifier                                                                         |
| `agent_type` | Agent name (only when started with `claude --agent <name>`)                              |

**Input example:**

```json
{
  "source": "startup",
  "model": "claude-sonnet-4-6"
}
```

**Output:**

- Plain stdout is added as Claude's context
- `additionalContext` field in `hookSpecificOutput` is added more discretely

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Context to inject"
  }
}
```

**Persist environment variables:**

`$CLAUDE_ENV_FILE` is available only in SessionStart hooks. Write `export` statements
to this path to make environment variables available in all subsequent Bash commands.
Use append (`>>`) to preserve variables set by other hooks:

```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
  echo 'export PATH="$PATH:./node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
fi
```

To capture environment changes from setup commands:

```bash
ENV_BEFORE=$(export -p | sort)
source ~/.nvm/nvm.sh && nvm use 20
if [ -n "$CLAUDE_ENV_FILE" ]; then
  ENV_AFTER=$(export -p | sort)
  comm -13 <(echo "$ENV_BEFORE") <(echo "$ENV_AFTER") >> "$CLAUDE_ENV_FILE"
fi
```

---

### UserPromptSubmit

Runs when user submits a prompt, before Claude processes it. Use to add context,
validate prompts, or block certain input types.

**No matcher support** — fires on every prompt.

**Additional input fields:**

| Field    | Description                       |
|----------|-----------------------------------|
| `prompt` | Text the user submitted           |

**Output:**

| Field               | Description                                                              |
|---------------------|--------------------------------------------------------------------------|
| `decision`          | `"block"` prevents processing and erases the prompt from context         |
| `reason`            | Shown to user when `decision` is `"block"`. Not added to context         |
| `additionalContext` | String added to Claude's context (more discrete than plain stdout)        |

Plain text stdout is also added as context (shown as hook output in transcript).

```json
{
  "decision": "block",
  "reason": "Explanation",
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Additional context for Claude"
  }
}
```

---

### PreToolUse

Runs after Claude creates tool parameters, before executing the tool call.

**Matcher:** Tool name — `Bash`, `Edit`, `Write`, `Read`, `Glob`, `Grep`, `Task`,
`WebFetch`, `WebSearch`, or any MCP tool name.

**Additional input fields:**

| Field        | Description                          |
|--------------|--------------------------------------|
| `tool_name`  | Name of the tool being called        |
| `tool_input` | Tool-specific input parameters       |
| `tool_use_id`| Unique identifier for this tool call |

**Tool input schemas:**

| Tool      | Key Fields                                                          |
|-----------|---------------------------------------------------------------------|
| Bash      | `command`, `description`, `timeout`, `run_in_background`           |
| Write     | `file_path`, `content`                                             |
| Edit      | `file_path`, `old_string`, `new_string`, `replace_all`             |
| Read      | `file_path`, `offset`, `limit`                                     |
| Glob      | `pattern`, `path`                                                  |
| Grep      | `pattern`, `path`, `glob`, `output_mode`, `-i`, `multiline`        |
| WebFetch  | `url`, `prompt`                                                    |
| WebSearch | `query`, `allowed_domains`, `blocked_domains`                      |
| Task      | `prompt`, `description`, `subagent_type`, `model`                  |

**Output** (uses `hookSpecificOutput` — not top-level `decision`):

| Field                      | Description                                                                            |
|----------------------------|----------------------------------------------------------------------------------------|
| `permissionDecision`       | `"allow"` bypasses permissions, `"deny"` cancels the call, `"ask"` prompts the user   |
| `permissionDecisionReason` | For `allow`/`ask`: shown to user. For `deny`: shown to Claude                          |
| `updatedInput`             | Modifies tool input before execution. Combine with `allow` or `ask`                    |
| `additionalContext`        | String added to Claude's context before tool executes                                  |

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Database writes are not allowed",
    "updatedInput": { "field": "new value" },
    "additionalContext": "Production environment — proceed with caution"
  }
}
```

> **Deprecated:** The previous top-level `decision`/`reason` fields are deprecated for
> `PreToolUse`. Old values `"approve"` and `"block"` map to `"allow"` and `"deny"`.
> Other events (`PostToolUse`, `Stop`) still use top-level `decision`.

---

### PermissionRequest

Runs when a permission dialog is about to be shown to the user. Does **not** fire in
non-interactive mode (`-p`); use `PreToolUse` instead for automated permission decisions.

**Matcher:** Tool name (same values as PreToolUse).

**Additional input fields:** Same as `PreToolUse` (without `tool_use_id`), plus:

| Field                  | Description                                                       |
|------------------------|-------------------------------------------------------------------|
| `permission_suggestions` | Array of "always allow" options the user would normally see     |

**Output:**

| Field                | Description                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `behavior`           | `"allow"` grants permission, `"deny"` denies it                             |
| `updatedInput`       | For `allow`: modifies tool input before execution                           |
| `updatedPermissions` | For `allow`: applies permission rules (equivalent to user selecting "always allow") |
| `message`            | For `deny`: tells Claude why permission was denied                          |
| `interrupt`          | For `deny`: if `true`, stops Claude                                         |

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedInput": { "command": "npm run lint" },
      "updatedPermissions": []
    }
  }
}
```

---

### PostToolUse

Runs immediately after a tool completes successfully. Cannot undo the action — use
`PreToolUse` to block before execution.

**Matcher:** Tool name (same values as PreToolUse).

**Additional input fields:** `tool_name`, `tool_input`, `tool_response`, `tool_use_id`.

**Output:**

| Field                  | Description                                                                       |
|------------------------|-----------------------------------------------------------------------------------|
| `decision`             | `"block"` prompts Claude with the reason. Omit to allow processing to continue    |
| `reason`               | Shown to Claude when `decision` is `"block"`                                      |
| `additionalContext`    | Additional context for Claude                                                     |
| `updatedMCPToolOutput` | MCP tools only: replaces the tool's output with this value                        |

```json
{
  "decision": "block",
  "reason": "Lint errors detected",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "See lint output above"
  }
}
```

---

### PostToolUseFailure

Runs when a tool execution fails (throws error or returns failure result). Use for
logging, alerts, or providing corrective context to Claude.

**Matcher:** Tool name (same values as PreToolUse).

**Additional input fields:**

| Field          | Description                                                         |
|----------------|---------------------------------------------------------------------|
| `tool_name`    | Name of the failed tool                                             |
| `tool_input`   | Arguments sent to the tool                                          |
| `tool_use_id`  | Unique identifier for this tool call                                |
| `error`        | String describing what went wrong                                   |
| `is_interrupt` | Optional boolean — whether failure was caused by user interruption  |

**Output:** `additionalContext` in `hookSpecificOutput`.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUseFailure",
    "additionalContext": "Check network connectivity for this failure"
  }
}
```

---

### Notification

Runs when Claude Code sends a notification. Cannot block notifications.

**Matcher values:** `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`

**Additional input fields:**

| Field               | Description                          |
|---------------------|--------------------------------------|
| `message`           | Notification text                    |
| `title`             | Optional title                       |
| `notification_type` | Which type fired (same as matcher)   |

**Output:** `additionalContext` in `hookSpecificOutput` (adds to conversation context).

---

### SubagentStart

Runs when a subagent is spawned via the Task tool. Cannot block subagent creation.

**Matcher:** Agent type — `Bash`, `Explore`, `Plan`, or custom agent names.

**Additional input fields:**

| Field        | Description                             |
|--------------|-----------------------------------------|
| `agent_id`   | Unique identifier for this subagent     |
| `agent_type` | Agent type name (used for matching)     |

**Output:** `additionalContext` in `hookSpecificOutput` (injected into subagent's context).

---

### SubagentStop

Runs when a subagent finishes responding.

**Matcher:** Agent type (same values as SubagentStart).

**Additional input fields:**

| Field                    | Description                                                      |
|--------------------------|------------------------------------------------------------------|
| `stop_hook_active`       | Whether already continuing from a stop hook                      |
| `agent_id`               | Unique subagent identifier                                       |
| `agent_type`             | Agent type name (used for matching)                              |
| `agent_transcript_path`  | Path to subagent's own transcript (in `subagents/` folder)       |
| `last_assistant_message` | Text content of subagent's final response                        |

Note: `transcript_path` is the main session's transcript; `agent_transcript_path` is
the subagent's.

**Output:** Same as Stop — `decision: "block"` prevents stopping.

---

### Stop

Runs when the main Claude Code agent finishes responding. Does not fire on user interrupts.

**No matcher support** — fires on every stop.

**Additional input fields:**

| Field                    | Description                                                   |
|--------------------------|---------------------------------------------------------------|
| `stop_hook_active`       | `true` when already continuing from a stop hook               |
| `last_assistant_message` | Text content of Claude's final response                       |

**Output:**

```json
{
  "decision": "block",
  "reason": "Must continue because tests are still failing"
}
```

**Critical:** Always check `stop_hook_active` to prevent infinite loops:

```bash
#!/bin/bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0  # Allow Claude to stop
fi
# ... rest of hook logic
```

---

### TeammateIdle

Runs when an agent team teammate is about to go idle after finishing its turn. Use to
enforce quality gates before a teammate stops.

**No matcher support** — fires on every occurrence.

**Additional input fields:**

| Field           | Description                              |
|-----------------|------------------------------------------|
| `teammate_name` | Name of the teammate about to go idle    |
| `team_name`     | Name of the team                         |

**Output:** Exit code only — no JSON decision control.

- Exit 2: blocks idle; stderr is fed to the teammate as feedback (it continues working)
- Exit 0: allows the teammate to go idle

```bash
#!/bin/bash
if [ ! -f "./dist/output.js" ]; then
  echo "Build artifact missing. Run the build before stopping." >&2
  exit 2
fi
exit 0
```

---

### TaskCompleted

Runs when a task is being marked as completed. Fires when any agent calls TaskUpdate to
complete a task, or when a teammate finishes its turn with in-progress tasks.

**No matcher support** — fires on every occurrence.

**Additional input fields:**

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| `task_id`          | Identifier of the task being completed                   |
| `task_subject`     | Title of the task                                        |
| `task_description` | Detailed description (may be absent)                     |
| `teammate_name`    | Teammate completing the task (may be absent)             |
| `team_name`        | Name of the team (may be absent)                         |

**Output:** Exit code only — no JSON decision control.

- Exit 2: blocks completion; stderr fed as feedback to the model

```bash
#!/bin/bash
INPUT=$(cat)
if ! npm test 2>&1; then
  echo "Tests must pass before completing: $(echo "$INPUT" | jq -r '.task_subject')" >&2
  exit 2
fi
exit 0
```

---

### ConfigChange

Runs when a configuration file changes during a session. Use for audit logging or
blocking unauthorized modifications.

**Matcher values:** `user_settings`, `project_settings`, `local_settings`,
`policy_settings`, `skills`

**Additional input fields:**

| Field       | Description                                    |
|-------------|------------------------------------------------|
| `source`    | Which configuration type changed               |
| `file_path` | Path to the changed file (optional)            |

**Output:**

```json
{
  "decision": "block",
  "reason": "Configuration changes require admin approval"
}
```

`policy_settings` changes cannot be blocked — hooks still fire (useful for audit logging)
but blocking decisions are ignored. This ensures enterprise-managed settings always apply.

---

### PreCompact

Runs before a compaction operation.

**Matcher values:** `manual`, `auto`

**Additional input fields:**

| Field                | Description                                                      |
|----------------------|------------------------------------------------------------------|
| `trigger`            | `"manual"` (from `/compact`) or `"auto"` (context window full)  |
| `custom_instructions`| User's instructions from `/compact`; empty for auto             |

No decision control. Cannot block compaction.

---

### SessionEnd

Runs when a session ends. Cannot block session termination.

**Matcher values:** `clear`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`,
`other`

**Additional input fields:**

| Field    | Description              |
|----------|--------------------------|
| `reason` | Why the session ended    |

No decision control. Use for cleanup, logging session statistics, or saving state.

---

## Hook Types

### Prompt-Based Hooks (`type: "prompt"`)

Sends hook input and your prompt to a Claude model (Haiku by default) for a yes/no
decision. Supported events: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`,
`PermissionRequest`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `TaskCompleted`.
Not supported for `TeammateIdle`.

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "prompt",
        "prompt": "Check if all tasks are complete. $ARGUMENTS",
        "timeout": 30
      }]
    }]
  }
}
```

Use `$ARGUMENTS` as placeholder for the hook input JSON. If absent, input is appended.

**Response schema:**

```json
{ "ok": true }
```

or

```json
{ "ok": false, "reason": "Explanation fed back to Claude" }
```

When `ok` is `false`, the reason is fed back to Claude as its next instruction.

### Agent-Based Hooks (`type: "agent"`)

Like prompt hooks but spawns a subagent that can use Read, Grep, Glob tools to verify
conditions. Up to 50 turns before returning a decision. Same event support and response
schema as prompt hooks. Default timeout: 60 seconds.

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "agent",
        "prompt": "Verify all unit tests pass. Run the test suite and check results. $ARGUMENTS",
        "timeout": 120
      }]
    }]
  }
}
```

Use prompt hooks when hook input data alone is sufficient. Use agent hooks when you need
to inspect actual files or run commands to verify conditions.

### Async Hooks (`async: true`)

Runs in the background without blocking Claude. Only available for `type: "command"`.

```json
{
  "type": "command",
  "command": "/path/to/run-tests.sh",
  "async": true,
  "timeout": 120
}
```

- Cannot block tool calls or return decisions — the triggering action has already proceeded
- Output (`systemMessage` or `additionalContext`) is delivered on the next conversation turn
- Each firing creates a separate background process — no deduplication across firings
- Prompt-based hooks cannot run asynchronously

---

## Security

Hooks run with your full user permissions. They can modify, delete, or access any file
your user account can access.

**Best practices:**
- Validate and sanitize inputs — never trust input data blindly
- Quote shell variables: `"$VAR"` not `$VAR`
- Block path traversal: check for `..` in file paths
- Use absolute paths for scripts, using `"$CLAUDE_PROJECT_DIR"` for the project root
- Skip sensitive files: avoid `.env`, `.git/`, keys, credentials

---

## Debugging and Troubleshooting

### Debug Output

Run `claude --debug` to see hook execution details (matched hooks, exit codes, stdout).
Toggle verbose mode with `Ctrl+O` to see hook output in the transcript.

```
[DEBUG] Executing hooks for PostToolUse:Write
[DEBUG] Matched 1 hooks for query "Write"
[DEBUG] Executing hook command: <command> with timeout 600000ms
[DEBUG] Hook command completed with status 0: <stdout>
```

### Hook Not Firing

- Run `/hooks` and confirm the hook appears under the correct event
- Check matcher pattern matches exactly (matchers are case-sensitive)
- Confirm the correct event type (`PreToolUse` fires before, `PostToolUse` fires after)
- `PermissionRequest` hooks do not fire in non-interactive mode (`-p`) — use `PreToolUse`

### Testing a Hook Manually

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | ./my-hook.sh
echo $?  # Check exit code
```

### Infinite Stop Hook Loop

Check `stop_hook_active` and exit early if true:

```bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi
```

### JSON Validation Failed

Shell profile printing text before JSON. Claude Code spawns a shell that sources
`~/.zshrc` or `~/.bashrc`. Unconditional `echo` statements corrupt the output.
Wrap them in an interactive check:

```bash
# In ~/.zshrc or ~/.bashrc
if [[ $- == *i* ]]; then
  echo "Shell ready"
fi
```

### Settings Edits Not Taking Effect

Direct edits to settings files don't apply mid-session. Claude Code snapshots hooks
at startup to prevent malicious modifications. Open `/hooks` to review and apply changes.
