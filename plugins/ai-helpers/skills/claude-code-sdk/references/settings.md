# Settings Reference

Configure Claude Code behavior through hierarchical settings files and environment variables.

## Configuration Scopes

- **Managed** — system-level `managed-settings.json`. Affects all users on machine. Shared (deployed by IT).
- **User** — `~/.claude/settings.json`. Affects you, all projects. Not shared.
- **Project** — `.claude/settings.json`. Affects all project collaborators. Shared (committed).
- **Local** — `.claude/settings.local.json`. Affects you, this project only. Not shared (gitignored).

**Precedence (highest to lowest):**

1. Managed — cannot be overridden
2. Command line arguments
3. Local
4. Project
5. User

### Managed Settings Locations

- macOS — `/Library/Application Support/ClaudeCode/`
- Linux/WSL — `/etc/claude-code/`
- Windows — `C:\Program Files\ClaudeCode\`

### Scope Locations Summary

- **Settings** — User: `~/.claude/settings.json`. Project: `.claude/settings.json`. Local:
  `.claude/settings.local.json`.
- **Subagents** — User: `~/.claude/agents/`. Project: `.claude/agents/`. Local: —.
- **MCP** — User: `~/.claude.json`. Project: `.mcp.json`. Local: `~/.claude.json` (per-project).
- **Plugins** — User: `~/.claude/settings.json`. Project: `.claude/settings.json`. Local: `.claude/settings.local.json`.
- **CLAUDE.md** — User: `~/.claude/CLAUDE.md`. Project: `CLAUDE.md` or `.claude/CLAUDE.md`. Local: `CLAUDE.local.md`.

---

## Settings File Structure

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": ["Bash(npm run lint)", "Bash(npm run test *)"],
    "deny": ["Bash(curl *)", "Read(./.env)", "Read(./secrets/**)"]
  },
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1"
  },
  "hooks": { },
  "model": "claude-sonnet-4-6",
  "outputStyle": "Explanatory"
}
```

Add `"$schema": "https://json.schemastore.org/claude-code-settings.json"` for IDE autocomplete and validation.

---

## Permission Settings

- `allow` — array of permission rules to allow
- `ask` — array of permission rules to confirm
- `deny` — array of permission rules to block
- `additionalDirectories` — extra working directories Claude can access
- `defaultMode` — default permission mode (`acceptEdits`, etc.)
- `disableBypassPermissionsMode` — `"disable"` to block `--dangerously-skip-permissions`

### Permission Rule Syntax

**Evaluation order:** deny → ask → allow (first match wins)

**Match all uses:**

```
Bash        # All bash commands
WebFetch    # All web requests
Read        # All file reads
```

**Match specific uses:**

```
Bash(npm run build)           # Exact command
Bash(npm run *)               # Wildcard prefix
Bash(* --version)             # Wildcard anywhere
Read(./.env)                  # Specific file
Read(./secrets/**)            # Directory pattern
WebFetch(domain:example.com)  # Domain filter
```

**Space before `*` matters:** `Bash(ls *)` matches `ls -la` but not `lsof`.

---

## Sandbox Settings

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["git", "docker"],
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org"],
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

- `enabled` — enable bash sandboxing (default: false)
- `autoAllowBashIfSandboxed` — auto-approve bash when sandboxed (default: true)
- `excludedCommands` — commands that bypass sandbox
- `allowUnsandboxedCommands` — allow `dangerouslyDisableSandbox` param (default: true)
- `network.allowedDomains` — domains for outbound traffic (wildcards OK)
- `network.allowUnixSockets` — Unix socket paths accessible in sandbox
- `network.allowAllUnixSockets` — allow all Unix socket connections (default: false)
- `network.allowLocalBinding` — allow binding to localhost (macOS only)
- `network.httpProxyPort` — custom HTTP proxy port (bring your own proxy)
- `network.socksProxyPort` — custom SOCKS5 proxy port
- `enableWeakerNestedSandbox` — weaker sandbox for Docker (Linux/WSL2, reduces security)

Use `Read`/`Edit`/`WebFetch` deny rules for filesystem and network restrictions — not sandbox settings.

---

## Common Settings

- `model` — override default model
- `availableModels` — restrict selectable models (managed only)
- `outputStyle` — output style name
- `hooks` — hook configuration (see hooks reference)
- `disableAllHooks` — disable all hooks and status line
- `allowManagedHooksOnly` — only allow managed/SDK hooks (managed only)
- `allowManagedPermissionRulesOnly` — only managed permission rules apply (managed only)
- `statusLine` — custom status line command `{"type": "command", "command": "..."}`
- `env` — environment variables for all sessions
- `cleanupPeriodDays` — delete sessions older than N days (default: 30)
- `language` — Claude's response language
- `plansDirectory` — where plan files are stored (default: `~/.claude/plans`)
- `showTurnDuration` — show turn duration messages
- `spinnerVerbs` — customize spinner verbs (`mode`, `verbs`)
- `spinnerTipsEnabled` — show tips in spinner (default: true)
- `spinnerTipsOverride` — custom spinner tips (`tips` array, `excludeDefault` flag)
- `respectGitignore` — file picker respects `.gitignore` (default: true)
- `autoUpdatesChannel` — `"stable"` or `"latest"` (default)
- `apiKeyHelper` — script to generate auth value for API requests
- `companyAnnouncements` — startup announcements array (random rotation)
- `forceLoginMethod` — `"claudeai"` or `"console"` to restrict login method
- `forceLoginOrgUUID` — auto-select org during login (requires `forceLoginMethod`)
- `alwaysThinkingEnabled` — enable extended thinking by default
- `terminalProgressBarEnabled` — terminal progress bar (default: true)
- `prefersReducedMotion` — reduce UI animations for accessibility
- `teammateMode` — agent team display: `auto`, `in-process`, `tmux`
- `otelHeadersHelper` — script for dynamic OpenTelemetry headers
- `awsAuthRefresh` — script that modifies `.aws` directory for credential refresh
- `awsCredentialExport` — script that outputs JSON with AWS credentials
- `fileSuggestion` — custom `@` autocomplete command (see below)

### Attribution Settings

```json
{
  "attribution": {
    "commit": "Generated with AI\n\nCo-Authored-By: AI <ai@example.com>",
    "pr": ""
  }
}
```

Empty string hides attribution. `attribution` takes precedence over deprecated `includeCoAuthoredBy`.

---

## Plugin Settings

```json
{
  "enabledPlugins": {
    "formatter@acme-tools": true,
    "analyzer@security-plugins": false
  },
  "extraKnownMarketplaces": {
    "acme-tools": {
      "source": {
        "source": "github",
        "repo": "acme-corp/claude-plugins"
      }
    }
  }
}
```

**`enabledPlugins`** — format: `"plugin-name@marketplace-name": true/false`. Applies at user, project, and local scope.

**`extraKnownMarketplaces`** — defines additional marketplaces for the repository. When present in project settings,
team members are prompted to install the marketplace on folder trust.

### Managed Marketplace Restrictions

In `managed-settings.json` only:

```json
{
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "acme-corp/approved-plugins" },
    { "source": "npm", "package": "@acme/plugins" }
  ]
}
```

- `undefined`: No restrictions
- `[]`: Block all marketplace additions
- List: Only allow exact matches (including optional `ref` and `path` fields)

**Source types:** `github`, `git`, `url`, `npm`, `file`, `directory`, `hostPattern`

`hostPattern` uses regex matching against the host; all others use exact matching.

| Aspect                | `strictKnownMarketplaces`        | `extraKnownMarketplaces`           |
| --------------------- | -------------------------------- | ---------------------------------- |
| **Purpose**           | Policy enforcement               | Team convenience                   |
| **Settings file**     | `managed-settings.json` only     | Any settings file                  |
| **Behavior**          | Blocks non-allowlisted additions | Auto-installs missing marketplaces |
| **Can be overridden** | No (highest precedence)          | Yes                                |

---

## MCP Server Settings

- `enableAllProjectMcpServers` — auto-approve all `.mcp.json` servers
- `enabledMcpjsonServers` — list of approved servers
- `disabledMcpjsonServers` — list of rejected servers
- `allowedMcpServers` — allowlist (managed only)
- `deniedMcpServers` — denylist (managed only, takes precedence)

---

## Environment Variables

### API and Authentication

- `ANTHROPIC_API_KEY` — API key (`X-Api-Key` header)
- `ANTHROPIC_AUTH_TOKEN` — custom `Authorization: Bearer` value
- `ANTHROPIC_CUSTOM_HEADERS` — additional request headers (newline-separated)
- `ANTHROPIC_MODEL` — model setting name
- `ANTHROPIC_DEFAULT_HAIKU_MODEL` — override default Haiku model ID
- `ANTHROPIC_DEFAULT_SONNET_MODEL` — override default Sonnet model ID
- `ANTHROPIC_DEFAULT_OPUS_MODEL` — override default Opus model ID
- `CLAUDE_CODE_USE_BEDROCK` — use Amazon Bedrock
- `CLAUDE_CODE_USE_VERTEX` — use Google Vertex AI
- `CLAUDE_CODE_USE_FOUNDRY` — use Microsoft Foundry
- `ANTHROPIC_FOUNDRY_API_KEY` — API key for Microsoft Foundry
- `ANTHROPIC_FOUNDRY_BASE_URL` — full Foundry base URL
- `ANTHROPIC_FOUNDRY_RESOURCE` — Foundry resource name
- `AWS_BEARER_TOKEN_BEDROCK` — Bedrock API key
- `CLAUDE_CODE_SKIP_BEDROCK_AUTH` — skip AWS auth (e.g. when using an LLM gateway)
- `CLAUDE_CODE_SKIP_VERTEX_AUTH` — skip Google auth
- `CLAUDE_CODE_SKIP_FOUNDRY_AUTH` — skip Azure auth
- `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` — credential refresh interval for `apiKeyHelper`
- `CLAUDE_CODE_CLIENT_CERT` — client certificate path for mTLS
- `CLAUDE_CODE_CLIENT_KEY` — client private key path for mTLS
- `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE` — passphrase for encrypted client key

### Behavior Control

- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` — context % threshold for auto-compaction (1-100)
- `CLAUDE_CODE_MAX_OUTPUT_TOKENS` — max output tokens (default: 32000, max: 64000)
- `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` — token limit for file reads
- `MAX_THINKING_TOKENS` — extended thinking budget (0 to disable)
- `CLAUDE_CODE_EFFORT_LEVEL` — effort level: `low`, `medium`, `high` (Opus 4.6+)
- `BASH_DEFAULT_TIMEOUT_MS` — default bash timeout
- `BASH_MAX_TIMEOUT_MS` — max bash timeout model can set
- `BASH_MAX_OUTPUT_LENGTH` — max chars before middle-truncation
- `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` — return to project dir after each Bash command
- `CLAUDE_CODE_SHELL` — override shell detection
- `CLAUDE_CODE_SHELL_PREFIX` — prefix to wrap all bash commands (for auditing)
- `CLAUDE_ENV_FILE` — script sourced before each bash command
- `MAX_MCP_OUTPUT_TOKENS` — max tokens in MCP tool responses (default: 25000)
- `MCP_TIMEOUT` — timeout for MCP server startup (ms)
- `MCP_TOOL_TIMEOUT` — timeout for MCP tool execution (ms)

### Feature Toggles

- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` — disable background task functionality
- `CLAUDE_CODE_ENABLE_TASKS` — task tracking (`false` to use TODO list)
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY` — `1` to disable auto memory
- `CLAUDE_CODE_SIMPLE` — `1` for minimal system prompt + basic tools only
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` — `1` to enable agent teams (experimental)
- `DISABLE_AUTOUPDATER` — disable auto-updates
- `FORCE_AUTOUPDATE_PLUGINS` — force plugin updates even if updater is disabled
- `DISABLE_TELEMETRY` — opt out of Statsig telemetry
- `DISABLE_ERROR_REPORTING` — opt out of Sentry reporting
- `DISABLE_PROMPT_CACHING` — disable prompt caching (all models)
- `DISABLE_PROMPT_CACHING_HAIKU` — disable prompt caching for Haiku only
- `DISABLE_PROMPT_CACHING_SONNET` — disable prompt caching for Sonnet only
- `DISABLE_PROMPT_CACHING_OPUS` — disable prompt caching for Opus only
- `DISABLE_BUG_COMMAND` — disable the `/bug` command
- `DISABLE_COST_WARNINGS` — disable cost warning messages
- `DISABLE_NON_ESSENTIAL_MODEL_CALLS` — disable model calls for non-critical paths
- `ENABLE_TOOL_SEARCH` — MCP tool search: `auto`, `auto:N`, `true`, `false`
- `CLAUDE_CODE_ENABLE_TELEMETRY` — `1` to enable OpenTelemetry collection
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` — equivalent to disabling autoupdater, bug command, error reporting,
  telemetry
- `SLASH_COMMAND_TOOL_CHAR_BUDGET` — character budget for skill metadata in Skill tool

### Paths and Environment

- `CLAUDE_CONFIG_DIR` — custom config directory
- `CLAUDE_CODE_TMPDIR` — custom temp directory
- `HTTP_PROXY` — HTTP proxy server
- `HTTPS_PROXY` — HTTPS proxy server
- `NO_PROXY` — domains/IPs that bypass proxy
- `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` — let proxy perform DNS resolution
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` — `1` to load CLAUDE.md from `--add-dir` directories
- `CLAUDE_CODE_TASK_LIST_ID` — share task list across sessions (set same ID)
- `CLAUDE_CODE_TEAM_NAME` — agent team name (set automatically on teammates)
- `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY` — auto-exit delay after idle (ms, for SDK mode)
- `CLAUDE_CODE_HIDE_ACCOUNT_INFO` — `1` to hide email/org from UI (streaming/recording)
- `USE_BUILTIN_RIPGREP` — `0` to use system `rg` instead of bundled one

---

## Tools Available to Claude

- `AskUserQuestion` — multiple-choice questions. Permission: no.
- `Bash` — shell commands. Permission: yes.
- `TaskOutput` — retrieve output from a background task. Permission: no.
- `Edit` — targeted file edits. Permission: yes.
- `ExitPlanMode` — prompt user to exit plan mode and start coding. Permission: yes.
- `Write` — create/overwrite files. Permission: yes.
- `Read` — read file contents. Permission: no.
- `Glob` — find files by pattern. Permission: no.
- `Grep` — search file contents. Permission: no.
- `KillShell` — kill a running background bash shell. Permission: no.
- `MCPSearch` — search/load MCP tools when tool search enabled. Permission: no.
- `WebFetch` — fetch URL content. Permission: yes.
- `WebSearch` — web search with domain filtering. Permission: yes.
- `Task` — run subagent for complex tasks. Permission: no.
- `TaskCreate` — create a new task in the task list. Permission: no.
- `TaskGet` — retrieve full details for a specific task. Permission: no.
- `TaskList` — list all tasks with status. Permission: no.
- `TaskUpdate` — update task status, dependencies, or details. Permission: no.
- `Skill` — execute a skill. Permission: yes.
- `LSP` — code intelligence via language servers. Permission: no.
- `NotebookEdit` — modify Jupyter cells. Permission: yes.

### Bash Tool Behavior

- **Working directory persists** between commands
- **Environment variables do NOT persist** — each command runs in fresh shell

**Options to persist environment variables:**

- **Activate before starting Claude Code** — `conda activate myenv && claude`
- **Set `CLAUDE_ENV_FILE`** — export path to a setup script; Claude sources it before each command
- **SessionStart hook** — write to `$CLAUDE_ENV_FILE` in hook; ideal for team configs

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "startup",
      "hooks": [{"type": "command", "command": "echo 'export MY_VAR=value' >> \"$CLAUDE_ENV_FILE\""}]
    }]
  }
}
```

---

## File Suggestion

Custom `@` autocomplete:

```json
{
  "fileSuggestion": {
    "type": "command",
    "command": "~/.claude/file-suggestion.sh"
  }
}
```

Script receives JSON on stdin (`{"query": "src/comp"}`), outputs newline-separated file paths (max 15).

---

## Troubleshooting

### Settings Not Applied

- Check scope precedence (managed overrides all)
- Restart Claude Code after editing settings files
- Run `/config` to verify effective settings

### Permissions Not Working

- Deny rules take precedence over allow
- Check wildcard syntax (`Bash(npm run *)` not `Bash(npm run:*)`)
- Argument-constraining patterns are fragile — don't rely on for security

### Sensitive Files Still Accessible

Use `permissions.deny`:

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)"
    ]
  }
}
```
