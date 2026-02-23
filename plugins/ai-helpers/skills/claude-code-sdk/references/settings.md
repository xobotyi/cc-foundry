# Settings Reference

Configure Claude Code behavior through hierarchical settings files and environment variables.

## Configuration Scopes

| Scope       | Location                             | Who it affects            | Shared?              |
|-------------|--------------------------------------|---------------------------|----------------------|
| **Managed** | System-level `managed-settings.json` | All users on machine      | Yes (deployed by IT) |
| **User**    | `~/.claude/settings.json`            | You, all projects         | No                   |
| **Project** | `.claude/settings.json`              | All project collaborators | Yes (committed)      |
| **Local**   | `.claude/settings.local.json`        | You, this project only    | No (gitignored)      |

**Precedence (highest to lowest):**
1. Managed — cannot be overridden
2. Command line arguments
3. Local
4. Project
5. User

### Managed Settings Locations

| Platform  | Path                                       |
|-----------|--------------------------------------------|
| macOS     | `/Library/Application Support/ClaudeCode/` |
| Linux/WSL | `/etc/claude-code/`                        |
| Windows   | `C:\Program Files\ClaudeCode\`             |

### Scope Locations Summary

| Feature       | User                      | Project                            | Local                          |
|---------------|---------------------------|------------------------------------|--------------------------------|
| **Settings**  | `~/.claude/settings.json` | `.claude/settings.json`            | `.claude/settings.local.json`  |
| **Subagents** | `~/.claude/agents/`       | `.claude/agents/`                  | —                              |
| **MCP**       | `~/.claude.json`          | `.mcp.json`                        | `~/.claude.json` (per-project) |
| **Plugins**   | `~/.claude/settings.json` | `.claude/settings.json`            | `.claude/settings.local.json`  |
| **CLAUDE.md** | `~/.claude/CLAUDE.md`     | `CLAUDE.md` or `.claude/CLAUDE.md` | `CLAUDE.local.md`              |

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

Add `"$schema": "https://json.schemastore.org/claude-code-settings.json"` for IDE autocomplete and
validation.

---

## Permission Settings

| Key                               | Description                                             |
|-----------------------------------|---------------------------------------------------------|
| `allow`                           | Array of permission rules to allow                      |
| `ask`                             | Array of permission rules to confirm                    |
| `deny`                            | Array of permission rules to block                      |
| `additionalDirectories`           | Extra working directories Claude can access             |
| `defaultMode`                     | Default permission mode (`acceptEdits`, etc.)           |
| `disableBypassPermissionsMode`    | `"disable"` to block `--dangerously-skip-permissions`   |

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

| Key                           | Description                                                        |
|-------------------------------|--------------------------------------------------------------------|
| `enabled`                     | Enable bash sandboxing (default: false)                            |
| `autoAllowBashIfSandboxed`    | Auto-approve bash when sandboxed (default: true)                   |
| `excludedCommands`            | Commands that bypass sandbox                                       |
| `allowUnsandboxedCommands`    | Allow `dangerouslyDisableSandbox` param (default: true)            |
| `network.allowedDomains`      | Domains for outbound traffic (wildcards OK)                        |
| `network.allowUnixSockets`    | Unix socket paths accessible in sandbox                            |
| `network.allowAllUnixSockets` | Allow all Unix socket connections (default: false)                 |
| `network.allowLocalBinding`   | Allow binding to localhost (macOS only)                            |
| `network.httpProxyPort`       | Custom HTTP proxy port (bring your own proxy)                      |
| `network.socksProxyPort`      | Custom SOCKS5 proxy port                                           |
| `enableWeakerNestedSandbox`   | Weaker sandbox for Docker (Linux/WSL2, reduces security)           |

Use `Read`/`Edit`/`WebFetch` deny rules for filesystem and network restrictions — not sandbox settings.

---

## Common Settings

| Key                               | Description                                                          |
|-----------------------------------|----------------------------------------------------------------------|
| `model`                           | Override default model                                               |
| `availableModels`                 | Restrict selectable models (managed only)                            |
| `outputStyle`                     | Output style name                                                    |
| `hooks`                           | Hook configuration (see hooks reference)                             |
| `disableAllHooks`                 | Disable all hooks and status line                                    |
| `allowManagedHooksOnly`           | Only allow managed/SDK hooks (managed only)                          |
| `allowManagedPermissionRulesOnly` | Only managed permission rules apply (managed only)                   |
| `statusLine`                      | Custom status line command `{"type": "command", "command": "..."}` |
| `env`                             | Environment variables for all sessions                               |
| `cleanupPeriodDays`               | Delete sessions older than N days (default: 30)                      |
| `language`                        | Claude's response language                                           |
| `plansDirectory`                  | Where plan files are stored (default: `~/.claude/plans`)             |
| `showTurnDuration`                | Show turn duration messages                                          |
| `spinnerVerbs`                    | Customize spinner verbs (`mode`, `verbs`)                            |
| `spinnerTipsEnabled`              | Show tips in spinner (default: true)                                 |
| `spinnerTipsOverride`             | Custom spinner tips (`tips` array, `excludeDefault` flag)            |
| `respectGitignore`                | File picker respects `.gitignore` (default: true)                    |
| `autoUpdatesChannel`              | `"stable"` or `"latest"` (default)                                  |
| `apiKeyHelper`                    | Script to generate auth value for API requests                       |
| `companyAnnouncements`            | Startup announcements array (random rotation)                        |
| `forceLoginMethod`                | `"claudeai"` or `"console"` to restrict login method                |
| `forceLoginOrgUUID`               | Auto-select org during login (requires `forceLoginMethod`)           |
| `alwaysThinkingEnabled`           | Enable extended thinking by default                                  |
| `terminalProgressBarEnabled`      | Terminal progress bar (default: true)                                |
| `prefersReducedMotion`            | Reduce UI animations for accessibility                               |
| `teammateMode`                    | Agent team display: `auto`, `in-process`, `tmux`                     |
| `otelHeadersHelper`               | Script for dynamic OpenTelemetry headers                             |
| `awsAuthRefresh`                  | Script that modifies `.aws` directory for credential refresh         |
| `awsCredentialExport`             | Script that outputs JSON with AWS credentials                        |
| `fileSuggestion`                  | Custom `@` autocomplete command (see below)                          |

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

**`enabledPlugins`** — format: `"plugin-name@marketplace-name": true/false`. Applies at user,
project, and local scope.

**`extraKnownMarketplaces`** — defines additional marketplaces for the repository. When present in
project settings, team members are prompted to install the marketplace on folder trust.

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

| Aspect              | `strictKnownMarketplaces`          | `extraKnownMarketplaces`            |
|---------------------|------------------------------------|-------------------------------------|
| **Purpose**         | Policy enforcement                 | Team convenience                    |
| **Settings file**   | `managed-settings.json` only       | Any settings file                   |
| **Behavior**        | Blocks non-allowlisted additions   | Auto-installs missing marketplaces  |
| **Can be overridden** | No (highest precedence)          | Yes                                 |

---

## MCP Server Settings

| Key                        | Description                                         |
|----------------------------|-----------------------------------------------------|
| `enableAllProjectMcpServers` | Auto-approve all `.mcp.json` servers              |
| `enabledMcpjsonServers`    | List of approved servers                            |
| `disabledMcpjsonServers`   | List of rejected servers                            |
| `allowedMcpServers`        | Allowlist (managed only)                            |
| `deniedMcpServers`         | Denylist (managed only, takes precedence)           |

---

## Environment Variables

### API and Authentication

| Variable                          | Purpose                                              |
|-----------------------------------|------------------------------------------------------|
| `ANTHROPIC_API_KEY`               | API key (`X-Api-Key` header)                         |
| `ANTHROPIC_AUTH_TOKEN`            | Custom `Authorization: Bearer` value                 |
| `ANTHROPIC_CUSTOM_HEADERS`        | Additional request headers (newline-separated)       |
| `ANTHROPIC_MODEL`                 | Model setting name                                   |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL`   | Override default Haiku model ID                      |
| `ANTHROPIC_DEFAULT_SONNET_MODEL`  | Override default Sonnet model ID                     |
| `ANTHROPIC_DEFAULT_OPUS_MODEL`    | Override default Opus model ID                       |
| `CLAUDE_CODE_USE_BEDROCK`         | Use Amazon Bedrock                                   |
| `CLAUDE_CODE_USE_VERTEX`          | Use Google Vertex AI                                 |
| `CLAUDE_CODE_USE_FOUNDRY`         | Use Microsoft Foundry                                |
| `ANTHROPIC_FOUNDRY_API_KEY`       | API key for Microsoft Foundry                        |
| `ANTHROPIC_FOUNDRY_BASE_URL`      | Full Foundry base URL                                |
| `ANTHROPIC_FOUNDRY_RESOURCE`      | Foundry resource name                                |
| `AWS_BEARER_TOKEN_BEDROCK`        | Bedrock API key                                      |
| `CLAUDE_CODE_SKIP_BEDROCK_AUTH`   | Skip AWS auth (e.g. when using an LLM gateway)       |
| `CLAUDE_CODE_SKIP_VERTEX_AUTH`    | Skip Google auth                                     |
| `CLAUDE_CODE_SKIP_FOUNDRY_AUTH`   | Skip Azure auth                                      |
| `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` | Credential refresh interval for `apiKeyHelper`     |
| `CLAUDE_CODE_CLIENT_CERT`         | Client certificate path for mTLS                     |
| `CLAUDE_CODE_CLIENT_KEY`          | Client private key path for mTLS                     |
| `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE` | Passphrase for encrypted client key               |

### Behavior Control

| Variable                              | Purpose                                          |
|---------------------------------------|--------------------------------------------------|
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`     | Context % threshold for auto-compaction (1-100)  |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS`       | Max output tokens (default: 32000, max: 64000)   |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | Token limit for file reads                   |
| `MAX_THINKING_TOKENS`                 | Extended thinking budget (0 to disable)          |
| `CLAUDE_CODE_EFFORT_LEVEL`            | Effort level: `low`, `medium`, `high` (Opus 4.6+) |
| `BASH_DEFAULT_TIMEOUT_MS`             | Default bash timeout                             |
| `BASH_MAX_TIMEOUT_MS`                 | Max bash timeout model can set                   |
| `BASH_MAX_OUTPUT_LENGTH`              | Max chars before middle-truncation               |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | Return to project dir after each Bash command |
| `CLAUDE_CODE_SHELL`                   | Override shell detection                         |
| `CLAUDE_CODE_SHELL_PREFIX`            | Prefix to wrap all bash commands (for auditing)  |
| `CLAUDE_ENV_FILE`                     | Script sourced before each bash command          |
| `MAX_MCP_OUTPUT_TOKENS`               | Max tokens in MCP tool responses (default: 25000) |
| `MCP_TIMEOUT`                         | Timeout for MCP server startup (ms)              |
| `MCP_TOOL_TIMEOUT`                    | Timeout for MCP tool execution (ms)              |

### Feature Toggles

| Variable                              | Purpose                                          |
|---------------------------------------|--------------------------------------------------|
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`| Disable background task functionality            |
| `CLAUDE_CODE_ENABLE_TASKS`            | Task tracking (`false` to use TODO list)         |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY`     | `1` to disable auto memory                       |
| `CLAUDE_CODE_SIMPLE`                  | `1` for minimal system prompt + basic tools only |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`| `1` to enable agent teams (experimental)         |
| `DISABLE_AUTOUPDATER`                 | Disable auto-updates                             |
| `FORCE_AUTOUPDATE_PLUGINS`            | Force plugin updates even if updater is disabled |
| `DISABLE_TELEMETRY`                   | Opt out of Statsig telemetry                     |
| `DISABLE_ERROR_REPORTING`             | Opt out of Sentry reporting                      |
| `DISABLE_PROMPT_CACHING`             | Disable prompt caching (all models)              |
| `DISABLE_PROMPT_CACHING_HAIKU`        | Disable prompt caching for Haiku only            |
| `DISABLE_PROMPT_CACHING_SONNET`       | Disable prompt caching for Sonnet only           |
| `DISABLE_PROMPT_CACHING_OPUS`         | Disable prompt caching for Opus only             |
| `DISABLE_BUG_COMMAND`                 | Disable the `/bug` command                       |
| `DISABLE_COST_WARNINGS`               | Disable cost warning messages                    |
| `DISABLE_NON_ESSENTIAL_MODEL_CALLS`   | Disable model calls for non-critical paths       |
| `ENABLE_TOOL_SEARCH`                  | MCP tool search: `auto`, `auto:N`, `true`, `false` |
| `CLAUDE_CODE_ENABLE_TELEMETRY`        | `1` to enable OpenTelemetry collection           |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Equivalent to disabling autoupdater, bug command, error reporting, telemetry |
| `SLASH_COMMAND_TOOL_CHAR_BUDGET`      | Character budget for skill metadata in Skill tool |

### Paths and Environment

| Variable                | Purpose                                                |
|-------------------------|--------------------------------------------------------|
| `CLAUDE_CONFIG_DIR`     | Custom config directory                                |
| `CLAUDE_CODE_TMPDIR`    | Custom temp directory                                  |
| `HTTP_PROXY`            | HTTP proxy server                                      |
| `HTTPS_PROXY`           | HTTPS proxy server                                     |
| `NO_PROXY`              | Domains/IPs that bypass proxy                          |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | Let proxy perform DNS resolution          |
| `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` | `1` to load CLAUDE.md from `--add-dir` directories |
| `CLAUDE_CODE_TASK_LIST_ID` | Share task list across sessions (set same ID)      |
| `CLAUDE_CODE_TEAM_NAME` | Agent team name (set automatically on teammates)       |
| `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY` | Auto-exit delay after idle (ms, for SDK mode) |
| `CLAUDE_CODE_HIDE_ACCOUNT_INFO` | `1` to hide email/org from UI (streaming/recording) |
| `USE_BUILTIN_RIPGREP`   | `0` to use system `rg` instead of bundled one          |

---

## Tools Available to Claude

| Tool              | Description                                   | Permission |
|-------------------|-----------------------------------------------|------------|
| AskUserQuestion   | Multiple-choice questions                     | No         |
| Bash              | Shell commands                                | Yes        |
| TaskOutput        | Retrieve output from a background task        | No         |
| Edit              | Targeted file edits                           | Yes        |
| ExitPlanMode      | Prompt user to exit plan mode and start coding | Yes       |
| Write             | Create/overwrite files                        | Yes        |
| Read              | Read file contents                            | No         |
| Glob              | Find files by pattern                         | No         |
| Grep              | Search file contents                          | No         |
| KillShell         | Kill a running background bash shell          | No         |
| MCPSearch         | Search/load MCP tools when tool search enabled | No        |
| WebFetch          | Fetch URL content                             | Yes        |
| WebSearch         | Web search with domain filtering              | Yes        |
| Task              | Run subagent for complex tasks                | No         |
| TaskCreate        | Create a new task in the task list            | No         |
| TaskGet           | Retrieve full details for a specific task     | No         |
| TaskList          | List all tasks with status                    | No         |
| TaskUpdate        | Update task status, dependencies, or details  | No         |
| Skill             | Execute a skill                               | Yes        |
| LSP               | Code intelligence via language servers        | No         |
| NotebookEdit      | Modify Jupyter cells                          | Yes        |

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

Script receives JSON on stdin (`{"query": "src/comp"}`), outputs newline-separated file paths
(max 15).

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
