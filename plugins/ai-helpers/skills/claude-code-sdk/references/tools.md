# Built-in Tools Reference

Complete catalog of tools available to Claude Code. Tool names are the exact strings used in permission rules, subagent
`tools`/`disallowedTools` lists, and hook matchers.

## Tool Catalog

### File System Tools

- `Read` — Reads file contents. Supports text files, images (visual), PDFs (with page ranges), Jupyter notebooks. No
  permission required.
- `Edit` — Targeted string replacements in files. Supports `replace_all` for bulk renames. Permission required.
- `Write` — Creates or overwrites files. Permission required.
- `Glob` — Pattern-based file search (e.g., `**/*.ts`). Returns paths sorted by modification time. No permission
  required.
- `Grep` — Content search via ripgrep regex. Modes: `files_with_matches`, `content`, `count`. Supports file type
  filtering, context lines, multiline patterns. No permission required.
- `NotebookEdit` — Modifies Jupyter notebook cells. Permission required.

### Shell Execution Tools

- `Bash` — Executes shell commands. Each command runs in a separate process. Working directory persists within the
  project directory in the main session (not in subagents). Environment variables do not persist between calls.
  Permission required.
- `PowerShell` — PowerShell execution on Windows. Opt-in preview via `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`. Auto-detects
  `pwsh.exe` (7+) with fallback to `powershell.exe` (5.1). Bash tool remains registered alongside. Permission required.
- `Monitor` — Runs a background command and feeds each output line back to Claude for real-time reaction. Uses same
  permission rules as Bash. Not available on Bedrock, Vertex AI, or Foundry. Permission required.

### Agent and Team Tools

- `Agent` — Spawns a subagent with its own context window. Built-in types: Explore (haiku, read-only), Plan (inherited
  model, read-only), general-purpose (inherited model, all tools). Custom agents from `.claude/agents/`. No permission
  required.
- `TeamCreate` — Creates an agent team with multiple teammates. Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. No
  permission required.
- `TeamDelete` — Disbands an agent team and cleans up teammate processes. Requires
  `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. No permission required.
- `SendMessage` — Sends a message to an agent team teammate by name, or resumes a stopped subagent by agent ID. Requires
  `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. No permission required.

### Task Management Tools

- `TaskCreate` — Creates a new task in the task list. No permission required.
- `TaskGet` — Retrieves full details for a specific task. No permission required.
- `TaskList` — Lists all tasks with their current status. No permission required.
- `TaskUpdate` — Updates task status, dependencies, details, or deletes tasks. No permission required.
- `TaskStop` — Kills a running background task by ID. No permission required.
- `TaskOutput` — (Deprecated) Retrieves output from a background task. Prefer `Read` on the task's output file path. No
  permission required.
- `TodoWrite` — Manages session task checklist. Available in non-interactive mode and the Agent SDK; interactive
  sessions use TaskCreate/TaskGet/TaskList/TaskUpdate instead. No permission required.

### Scheduling Tools

- `CronCreate` — Schedules a recurring or one-shot prompt within the current session. Gone when Claude exits. No
  permission required.
- `CronDelete` — Cancels a scheduled task by ID. No permission required.
- `CronList` — Lists all scheduled tasks in the session. No permission required.

### Planning Tools

- `EnterPlanMode` — Switches to plan mode to design an approach before coding. No permission required.
- `ExitPlanMode` — Presents a plan for approval and exits plan mode. Permission required.

### Worktree Tools

- `EnterWorktree` — Creates an isolated git worktree and switches into it. No permission required.
- `ExitWorktree` — Exits a worktree session and returns to the original directory. No permission required.

### Web Tools

- `WebFetch` — Fetches content from a URL. Permission required.
- `WebSearch` — Performs web searches. Permission required.

### MCP Tools

- `ListMcpResourcesTool` — Lists resources exposed by connected MCP servers. No permission required.
- `ReadMcpResourceTool` — Reads a specific MCP resource by URI. No permission required.
- `ToolSearch` — Searches for and loads deferred tool schemas when tool search is enabled (large MCP tool sets). No
  permission required.

### Other Tools

- `Skill` — Executes a skill within the main conversation. Permission required.
- `AskUserQuestion` — Asks multiple-choice questions to gather requirements or clarify ambiguity. No permission
  required.
- `LSP` — Code intelligence via language servers: jump to definition, find references, type info, symbol lists, call
  hierarchies. Inactive until a code intelligence plugin is installed. No permission required.

## Permission Summary

**Require permission:** `Bash`, `Edit`, `ExitPlanMode`, `Monitor`, `NotebookEdit`, `PowerShell`, `Skill`, `WebFetch`,
`WebSearch`, `Write`

**No permission required:** `Agent`, `AskUserQuestion`, `CronCreate`, `CronDelete`, `CronList`, `EnterPlanMode`,
`EnterWorktree`, `ExitWorktree`, `Glob`, `Grep`, `ListMcpResourcesTool`, `LSP`, `Read`, `ReadMcpResourceTool`,
`SendMessage`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskOutput`, `TaskStop`, `TaskUpdate`, `TeamCreate`, `TeamDelete`,
`TodoWrite`, `ToolSearch`

Tools requiring permission are subject to permission rules configured via `/permissions` or in settings. Permission
evaluation order: deny > ask > allow (first match wins).

## Using Tool Names in Extensions

### Permission Rules

Tool names are the match target in `permissions.allow` and `permissions.deny` arrays:

```json
{
  "permissions": {
    "allow": ["Read", "Glob", "Grep"],
    "deny": ["Bash(rm *)"]
  }
}
```

Bash and PowerShell support argument patterns: `Bash(git commit *)` allows only git commit commands.

### Subagent Tool Restrictions

Use `tools` (allowlist) or `disallowedTools` (denylist) in agent frontmatter or Agent tool parameters:

```yaml
# .claude/agents/reviewer.md
---
tools:
  - Read
  - Glob
  - Grep
  - LSP
---
```

The `Agent` tool itself supports type restrictions: `Agent(explore, plan)` in permission rules limits which agent types
can be spawned.

### Hook Matchers

Hook `matcher` field matches against tool names for PreToolUse, PostToolUse, and PostToolUseFailure events:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": "prettier --write $CC_TOOL_INPUT_FILE_PATH" }]
      }
    ]
  }
}
```

### Skill Allowed Tools

The `allowed-tools` frontmatter field grants tool access without per-use approval while the skill is active:

```yaml
---
name: my-skill
allowed-tools: Bash, Edit, Write
---
```

## Bash Tool Behavior

- Each command runs in a separate process — shell state does not persist
- Working directory persists in main session when it stays within the project directory or additional working
  directories added via `--add-dir`
- Subagent sessions never carry over working directory changes
- If `cd` lands outside allowed directories, cwd resets to the project directory
- Set `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` to disable directory carry-over (every command starts in project dir)
- Environment variables do not persist between calls — use `CLAUDE_ENV_FILE` or a SessionStart hook for persistent env
- Activate virtualenvs/conda before launching Claude Code

## LSP Tool Behavior

Provides code intelligence from a running language server. After each file edit, automatically reports type errors and
warnings. Capabilities:

- Jump to symbol definition
- Find all references to a symbol
- Get type information at a position
- List symbols in a file or workspace
- Find implementations of an interface
- Trace call hierarchies

Inactive until a code intelligence plugin is installed. The plugin bundles language server configuration; the server
binary is installed separately.

## Monitor Tool Behavior

Runs a background script and streams each output line back to Claude as it arrives. Use cases:

- Tail log files and flag errors
- Poll PR/CI status and report changes
- Watch directories for file changes
- Track output from long-running scripts

Uses the same permission rules as Bash. Not available on Amazon Bedrock, Google Vertex AI, or Microsoft Foundry.
Requires Claude Code v2.1.98+.

## Checking Available Tools

The exact tool set depends on provider, platform, and settings. In a running session:

- Ask Claude: "What tools do you have access to?"
- Run `/mcp` for MCP tool names
- MCP tools appear as `mcp__<server>__<tool>` — these are dynamic and not part of the built-in catalog
