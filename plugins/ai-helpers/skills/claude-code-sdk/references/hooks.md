# Hooks Reference

Hooks are shell commands or LLM prompts that execute automatically at specific
points in Claude Code's lifecycle.

## Hook Lifecycle

| Event                | When It Fires                                |
|----------------------|----------------------------------------------|
| `SessionStart`       | Session begins or resumes                    |
| `UserPromptSubmit`   | User submits prompt, before processing       |
| `PreToolUse`         | Before tool call executes (can block)        |
| `PermissionRequest`  | Permission dialog appears                    |
| `PostToolUse`        | After tool call succeeds                     |
| `PostToolUseFailure` | After tool call fails                        |
| `Notification`       | Claude Code sends notification               |
| `SubagentStart`      | Subagent spawned                             |
| `SubagentStop`       | Subagent finishes                            |
| `Stop`               | Claude finishes responding                   |
| `PreCompact`         | Before context compaction                    |
| `SessionEnd`         | Session terminates                           |

## Configuration

### Hook Locations

| Location                        | Scope                   | Shareable                |
|---------------------------------|-------------------------|--------------------------|
| `~/.claude/settings.json`       | All your projects       | No                       |
| `.claude/settings.json`         | Single project          | Yes, commit to repo      |
| `.claude/settings.local.json`   | Single project          | No, gitignored           |
| Managed policy                  | Organization-wide       | Admin-controlled         |
| Plugin `hooks/hooks.json`       | When plugin enabled     | Yes, bundled             |
| Skill/agent frontmatter         | While component active  | Yes                      |

### Basic Structure

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

Matchers are regex strings that filter when hooks fire:

| Event                                          | Matches              | Examples                       |
|------------------------------------------------|----------------------|--------------------------------|
| `PreToolUse`, `PostToolUse`, `PermissionRequest` | Tool name          | `Bash`, `Edit\|Write`, `mcp__.*` |
| `SessionStart`                                 | How session started  | `startup`, `resume`, `compact` |
| `SessionEnd`                                   | Why session ended    | `clear`, `logout`, `other`     |
| `Notification`                                 | Notification type    | `permission_prompt`, `idle_prompt` |
| `SubagentStart`, `SubagentStop`                | Agent type           | `Bash`, `Explore`, custom      |
| `PreCompact`                                   | Trigger              | `manual`, `auto`               |
| `UserPromptSubmit`, `Stop`                     | No matcher support   | Always fires                   |

### MCP Tool Matching

MCP tools follow pattern `mcp__<server>__<tool>`:

```json
{
  "matcher": "mcp__memory__.*",
  "hooks": [...]
}
```

### Hook Handler Fields

#### Common Fields

| Field           | Required | Description                              |
|-----------------|----------|------------------------------------------|
| `type`          | Yes      | `"command"`, `"prompt"`, or `"agent"`    |
| `timeout`       | No       | Seconds before canceling                 |
| `statusMessage` | No       | Custom spinner message                   |
| `once`          | No       | Run only once per session (skills only)  |

#### Command Hook Fields

| Field     | Required | Description                    |
|-----------|----------|--------------------------------|
| `command` | Yes      | Shell command to execute       |
| `async`   | No       | Run in background              |

#### Prompt/Agent Hook Fields

| Field    | Required | Description                              |
|----------|----------|------------------------------------------|
| `prompt` | Yes      | Prompt text (`$ARGUMENTS` for input)     |
| `model`  | No       | Model to use                             |

### Reference Scripts by Path

```json
{
  "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-style.sh"
}
```

For plugins:

```json
{
  "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh"
}
```

## Hook Input and Output

### Common Input Fields

All hooks receive JSON on stdin:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/directory",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse"
}
```

### Exit Code Output

| Exit Code | Meaning                                              |
|-----------|------------------------------------------------------|
| 0         | Success, parse stdout for JSON                       |
| 2         | Blocking error, stderr fed to Claude                 |
| Other     | Non-blocking error, stderr in verbose mode           |

### JSON Output Fields

On exit 0, stdout can contain:

```json
{
  "continue": false,
  "stopReason": "Build failed",
  "suppressOutput": false,
  "systemMessage": "Warning message",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Not allowed"
  }
}
```

---

## Hook Events

### SessionStart

Runs when session starts or resumes. Good for loading context.

**Matcher values:** `startup`, `resume`, `clear`, `compact`

**Input:**

```json
{
  "source": "startup",
  "model": "claude-sonnet-4-5-20250929"
}
```

**Output:**

- Plain stdout added as context
- `additionalContext` field in hookSpecificOutput

**Environment variables:**

Write to `$CLAUDE_ENV_FILE` to persist environment:

```bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
fi
```

### UserPromptSubmit

Runs when user submits prompt, before Claude processes.

**Input:**

```json
{
  "prompt": "Write a function..."
}
```

**Output:**

- `decision: "block"` prevents prompt processing
- `additionalContext` adds context

### PreToolUse

Runs before tool executes. Can block.

**Matcher:** Tool name (`Bash`, `Edit`, `Write`, `Read`, `Glob`, `Grep`, etc.)

**Input:**

```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  },
  "tool_use_id": "toolu_01..."
}
```

**Tool input schemas:**

| Tool      | Key Fields                                        |
|-----------|---------------------------------------------------|
| Bash      | `command`, `description`, `timeout`               |
| Write     | `file_path`, `content`                            |
| Edit      | `file_path`, `old_string`, `new_string`           |
| Read      | `file_path`, `offset`, `limit`                    |
| Glob      | `pattern`, `path`                                 |
| Grep      | `pattern`, `path`, `glob`, `output_mode`          |
| WebFetch  | `url`, `prompt`                                   |
| WebSearch | `query`, `allowed_domains`, `blocked_domains`     |
| Task      | `prompt`, `description`, `subagent_type`, `model` |

**Output:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "Reason",
    "updatedInput": {"field": "new value"},
    "additionalContext": "Context for Claude"
  }
}
```

### PermissionRequest

Runs when permission dialog appears.

**Input:** Same as PreToolUse, plus `permission_suggestions` array.

**Output:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow|deny",
      "updatedInput": {},
      "updatedPermissions": [],
      "message": "Deny reason",
      "interrupt": false
    }
  }
}
```

### PostToolUse

Runs after tool succeeds.

**Input:** Includes `tool_input` and `tool_response`.

**Output:**

```json
{
  "decision": "block",
  "reason": "Explanation",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Info for Claude",
    "updatedMCPToolOutput": "For MCP tools only"
  }
}
```

### PostToolUseFailure

Runs after tool fails.

**Input:** Includes `error` and `is_interrupt` fields.

**Output:** `additionalContext` field.

### Notification

Runs when Claude Code sends notifications.

**Matcher values:** `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`

**Input:**

```json
{
  "message": "Notification text",
  "title": "Title",
  "notification_type": "permission_prompt"
}
```

### SubagentStart

Runs when subagent spawns.

**Matcher:** Agent type (`Bash`, `Explore`, `Plan`, custom)

**Input:**

```json
{
  "agent_id": "agent-abc",
  "agent_type": "Explore"
}
```

**Output:** `additionalContext` added to subagent.

### SubagentStop

Runs when subagent finishes.

**Input:** `stop_hook_active`, `agent_id`, `agent_type`, `agent_transcript_path`

**Output:** Same as Stop.

### Stop

Runs when Claude finishes responding.

**Input:**

```json
{
  "stop_hook_active": true
}
```

**Output:**

```json
{
  "decision": "block",
  "reason": "Must continue because..."
}
```

**Important:** Check `stop_hook_active` to prevent infinite loops.

### PreCompact

Runs before compaction.

**Matcher values:** `manual`, `auto`

**Input:** `trigger`, `custom_instructions`

### SessionEnd

Runs when session ends. Cannot block.

**Matcher values:** `clear`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`

---

## Prompt-Based Hooks

Use LLM to evaluate decisions:

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

**Response format:**

```json
{"ok": true}
```

or

```json
{"ok": false, "reason": "Tasks incomplete"}
```

## Agent-Based Hooks

Multi-turn verification with tool access:

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "agent",
        "prompt": "Verify all unit tests pass. $ARGUMENTS",
        "timeout": 120
      }]
    }]
  }
}
```

Agent can use Read, Grep, Glob tools. Returns same format as prompt hooks.

## Async Hooks

Run in background without blocking:

```json
{
  "type": "command",
  "command": "/path/to/run-tests.sh",
  "async": true,
  "timeout": 120
}
```

- Only `type: "command"` supports async
- Cannot block or return decisions
- Output delivered on next conversation turn

---

## Troubleshooting

### Hook Not Firing

1. Check hook appears in `/hooks` menu
2. Verify matcher pattern matches (case-sensitive)
3. Confirm correct event type

### Hook Error

Test manually:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | ./my-hook.sh
echo $?
```

### Infinite Stop Hook Loop

Check `stop_hook_active`:

```bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi
```

### JSON Validation Failed

Shell profile printing text before JSON. Wrap echo statements:

```bash
if [[ $- == *i* ]]; then
  echo "Shell ready"
fi
```

## Debug

```bash
claude --debug
```

Toggle verbose mode with `Ctrl+O`.

## Security

- Hooks run with your full user permissions
- Validate and sanitize inputs
- Quote shell variables: `"$VAR"`
- Block path traversal
- Use absolute paths
- Skip sensitive files

## Disable Hooks

- Use toggle in `/hooks` menu
- Set `"disableAllHooks": true` in settings
- Changes to settings files require restart or `/hooks` review
