# Subagent Specification

Technical reference for subagent definition files, the Agent tool, built-in agent types, permission inheritance, storage
scopes, and hooks schema.

---

## Frontmatter Fields

Subagent files use YAML frontmatter followed by a Markdown system prompt body. Only `name` and `description` are
required; all other fields are optional.

- **`name`** — Unique identifier using lowercase letters and hyphens. Must be unique within its scope.
- **`description`** — When Claude should delegate to this subagent. Claude uses this verbatim for routing decisions.
  Include "use proactively" to encourage automatic delegation.
- **`tools`** — Allowlist of tools the subagent can use. Inherits all parent tools if omitted. Use
  `Agent(worker, researcher)` syntax to restrict which subagents it can spawn. Use `Agent` without parentheses to allow
  spawning any subagent.
- **`disallowedTools`** — Denylist. Applied before `tools` if both are set; a tool in both lists is removed. Format:
  comma-separated tool names.
- **`model`** — Model for this subagent: `sonnet`, `opus`, `haiku`, a full model ID (e.g. `claude-opus-4-6`), or
  `inherit`. Defaults to `inherit`. Resolved in this order:
  1. `CLAUDE_CODE_SUBAGENT_MODEL` env var
  2. Per-invocation `model` parameter from Agent tool
  3. Frontmatter `model`
  4. Main conversation model
- **`permissionMode`** — Permission behavior (see [Permission Modes](#permission-modes)). Ignored if parent uses `auto`
  mode; cannot override `bypassPermissions` from parent.
- **`maxTurns`** — Maximum agentic turns before the subagent halts.
- **`skills`** — List of skill names to inject into the subagent's context at startup. Full content is injected, not
  just made invocable. Subagents do not inherit skills from parent.
- **`mcpServers`** — MCP servers available to the subagent. Each entry is either a string (reference to an existing
  session server) or an inline definition keyed by server name. Inline servers connect on subagent start and disconnect
  on finish. String references share the parent session's connection.
- **`hooks`** — Lifecycle hooks scoped to this subagent (see [Hooks Schema](#hooks-schema)). Cleaned up when the
  subagent finishes. `Stop` hooks are automatically converted to `SubagentStop`.
- **`memory`** — Persistent memory scope: `user`, `project`, or `local`. When enabled, injects memory directory path and
  first 200 lines / 25KB of `MEMORY.md` into system prompt; enables Read, Write, Edit for memory management.
- **`background`** — `true` to always run as a background task. Default: `false`.
- **`effort`** — Effort level: `low`, `medium`, `high`, `max` (Opus 4.6 only). Overrides session effort level.
- **`isolation`** — `worktree` runs the subagent in a temporary git worktree (isolated copy of the repo). Worktree is
  cleaned up automatically if the subagent makes no changes.
- **`color`** — Display color in the task list and transcript: `red`, `blue`, `green`, `yellow`, `purple`, `orange`,
  `pink`, `cyan`.
- **`initialPrompt`** — Auto-submitted as first user turn when this agent runs as the main session agent (via
  `--agent`). Commands and skills are processed. Prepended to any user-provided prompt. No effect when spawned as a
  subagent.

**Plugin restriction:** `hooks`, `mcpServers`, and `permissionMode` are ignored in plugin-bundled agents. Copy to
`.claude/agents/` or `~/.claude/agents/` to use these fields.

---

## Agent Tool Parameters

When Claude spawns a subagent programmatically via the `Agent` tool (previously `Task`):

- **`prompt`** — The task description given to the subagent.
- **`description`** — Short label for the subagent in the task list UI.
- **`subagent_type`** — Name of a defined subagent to use. Merges the definition's `tools` and `model` and appends its
  body to the system prompt.
- **`model`** — Model override for this invocation. Takes precedence over frontmatter `model`, unless
  `CLAUDE_CODE_SUBAGENT_MODEL` is set.
- **`mode`** — Invocation mode. Not the same as `permissionMode`.
- **`name`** — A unique name for this subagent instance; used to target it with `SendMessage` for resumption.
- **`team_name`** — If set, the spawned subagent joins this team as a teammate. Required for agent teams.
- **`run_in_background`** — `true` to run concurrently, allowing the main agent to continue. Background subagents
  pre-approve permissions before starting; auto-deny anything not pre-approved at launch.
- **`isolation`** — `worktree` for an isolated git worktree. Can be set per-invocation even without frontmatter.

---

## Built-in Agents

Claude Code ships with built-in subagents. All inherit parent permissions plus their own tool restrictions.

- **Explore** — Fast, read-only codebase search. Model: Haiku. Tools: read-only (Write and Edit denied). Invoked with
  thoroughness level: `quick`, `medium`, or `very thorough`.
- **Plan** — Read-only research agent for plan mode. Model: inherits from main conversation. Tools: read-only. Cannot
  spawn subagents (prevents infinite nesting). Active only during plan mode.
- **General-purpose** — Complex multi-step tasks requiring both exploration and action. Model: inherits. Tools: all.
  Used when task requires exploration + modification or multiple dependent steps.
- **statusline-setup** — Sonnet model. Invoked automatically by `/statusline`.
- **Claude Code Guide** — Haiku model. Answers questions about Claude Code features.

**Subagents cannot spawn other subagents.** Nesting is not supported.

---

## Permission Modes

Set via `permissionMode` frontmatter. Subagents inherit the parent permission context and may restrict further, but
cannot escalate beyond what the parent allows.

- **`default`** — Standard permission checking with user prompts.
- **`acceptEdits`** — Auto-accept file edits and common filesystem commands within working directory or
  `additionalDirectories`.
- **`auto`** — Background classifier reviews commands and protected-directory writes. If parent uses auto, subagent
  inherits auto and frontmatter `permissionMode` is ignored.
- **`dontAsk`** — Auto-deny permission prompts. Explicitly allowed tools still work.
- **`bypassPermissions`** — Skips permission prompts. If parent uses `bypassPermissions`, this is inherited and cannot
  be overridden by the subagent.
- **`plan`** — Read-only exploration mode.

**`bypassPermissions` exceptions:** Writes to `.git`, `.claude`, `.vscode`, `.idea`, `.husky` still prompt, except for
`.claude/commands`, `.claude/agents`, and `.claude/skills`.

**Disable a subagent entirely:** Add to `permissions.deny` in settings.json: `"Agent(subagent-name)"`. Works for
built-in and custom subagents.

---

## Storage Locations and Scope Priority

Higher priority overrides lower when names conflict.

1. **Managed settings** — Organization-wide (priority 1, highest). Admin-deployed to managed settings directory.
2. **`--agents` CLI flag** — Current session only (priority 2). JSON with same frontmatter fields; `prompt` maps to the
   system prompt body. Not persisted to disk.
3. **`.claude/agents/`** — Current project (priority 3). Check into version control for team sharing.
4. **`~/.claude/agents/`** — All projects for this user (priority 4).
5. **Plugin `agents/` directory** — Where plugin is enabled (priority 5, lowest).

**Discovery:** Subagents are loaded at session start. Walk up from CWD for project agents. Directories added with
`--add-dir` grant file access only; they are not scanned for subagents. Resume session or use `/agents` to load newly
created files without restart.

**Persistent memory locations:**

- `user` scope → `~/.claude/agent-memory/<agent-name>/`
- `project` scope → `.claude/agent-memory/<agent-name>/`
- `local` scope → `.claude/agent-memory-local/<agent-name>/`

**Transcript storage:** `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`

---

## Hooks Schema

Hooks in subagent frontmatter follow the same schema as `settings.json` hooks, but are scoped to the subagent's
lifetime. Supported events in frontmatter: all hook events. `Stop` is automatically converted to `SubagentStop`.

### Structure

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/lint.sh"
```

### Matcher Patterns

The `matcher` field filters when a hook fires:

- `"*"`, `""`, or omitted → match all
- Letters, digits, `_`, `|` only → exact string or `|`-separated list (e.g. `Edit|Write`)
- Any other character → JavaScript regex (e.g. `^Notebook`, `mcp__memory__.*`)

Events without matcher support (always fire): `UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCreated`,
`TaskCompleted`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`.

### Hook Handler Fields

**Common (all types):**

- **`type`** — `command`, `http`, `prompt`, or `agent`
- **`if`** — Permission rule syntax for finer filtering (e.g. `"Bash(git *)"`, `"Edit(*.ts)"`). Tool events only.
- **`timeout`** — Seconds before cancel. Defaults: 600 (command), 30 (prompt), 60 (agent)
- **`statusMessage`** — Custom spinner message while hook runs

**Command hooks (`type: command`):**

- **`command`** — Shell command to execute. Receives event JSON via stdin. Communicates via exit codes and stdout.
- **`async`** — `true` to run in background without blocking
- **`asyncRewake`** — `true` to run in background and wake Claude on exit code 2 (implies `async`)
- **`shell`** — `"bash"` (default) or `"powershell"`

**HTTP hooks (`type: http`):**

- **`url`** — POST endpoint. Receives event JSON as request body.
- **`headers`** — Additional headers. Supports `$VAR_NAME` interpolation for vars in `allowedEnvVars`.
- **`allowedEnvVars`** — List of env var names allowed for header interpolation.

**Prompt hooks (`type: prompt`) and Agent hooks (`type: agent`):**

- **`prompt`** — Prompt text. Use `$ARGUMENTS` for event JSON input.
- **`model`** — Model for evaluation. Defaults to a fast model.

### Exit Code Behavior

For `PreToolUse`:

- `0` → allow
- `2` → block tool call; stderr (or stdout if stderr empty) shown to Claude
- Other non-zero → non-blocking error; execution continues

### Subagent Lifecycle Events (in `settings.json`)

For observing subagent lifecycle from the main session:

- **`SubagentStart`** — Fires when a subagent begins. Matcher: agent type name.
- **`SubagentStop`** — Fires when a subagent completes. Matcher: agent type name.

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [{ "type": "command", "command": "./scripts/setup.sh" }]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [{ "type": "command", "command": "./scripts/cleanup.sh" }]
      }
    ]
  }
}
```

### `settingSources` Requirement

When using the Agent SDK, include `settingSources` in your configuration so skills and subagent definitions load from
the standard locations (`~/.claude/agents/`, `.claude/agents/`). Without it, custom subagents and skills are not
discovered.
