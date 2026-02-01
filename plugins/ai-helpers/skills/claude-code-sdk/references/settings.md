# Settings Reference

Configure Claude Code behavior through hierarchical settings files and
environment variables.

## Configuration Scopes

| Scope       | Location                             | Who it affects           | Shared?              |
|-------------|--------------------------------------|--------------------------|----------------------|
| **Managed** | System-level `managed-settings.json` | All users on machine     | Yes (deployed by IT) |
| **User**    | `~/.claude/settings.json`            | You, all projects        | No                   |
| **Project** | `.claude/settings.json`              | All project collaborators| Yes (committed)      |
| **Local**   | `.claude/settings.local.json`        | You, this project only   | No (gitignored)      |

**Precedence (highest to lowest):**
1. Managed — cannot be overridden
2. Command line arguments
3. Local
4. Project
5. User

### Managed Settings Locations

| Platform    | Path                                           |
|-------------|------------------------------------------------|
| macOS       | `/Library/Application Support/ClaudeCode/`     |
| Linux/WSL   | `/etc/claude-code/`                            |
| Windows     | `C:\Program Files\ClaudeCode\`                 |

---

## Settings File Structure

```json
{
  "permissions": {
    "allow": ["Bash(npm run lint)", "Bash(npm run test *)"],
    "deny": ["Bash(curl *)", "Read(./.env)", "Read(./secrets/**)"]
  },
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1"
  },
  "hooks": { ... },
  "model": "claude-sonnet-4-5-20250929",
  "outputStyle": "Explanatory"
}
```

---

## Permission Settings

| Key                          | Description                                      |
|------------------------------|--------------------------------------------------|
| `allow`                      | Array of permission rules to allow               |
| `ask`                        | Array of permission rules to confirm             |
| `deny`                       | Array of permission rules to block               |
| `additionalDirectories`      | Extra working directories Claude can access      |
| `defaultMode`                | Default permission mode (`acceptEdits`, etc.)    |
| `disableBypassPermissionsMode` | `"disable"` to block `--dangerously-skip-permissions` |

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

| Key                         | Description                                    |
|-----------------------------|------------------------------------------------|
| `enabled`                   | Enable bash sandboxing (default: false)        |
| `autoAllowBashIfSandboxed`  | Auto-approve bash when sandboxed (default: true) |
| `excludedCommands`          | Commands that bypass sandbox                   |
| `allowUnsandboxedCommands`  | Allow `dangerouslyDisableSandbox` (default: true) |
| `network.allowedDomains`    | Domains for outbound traffic (wildcards OK)    |
| `network.allowUnixSockets`  | Unix socket paths accessible in sandbox        |
| `network.allowLocalBinding` | Allow binding to localhost (macOS only)        |

---

## Common Settings

| Key                          | Description                                                  |
|------------------------------|--------------------------------------------------------------|
| `model`                      | Override default model                                       |
| `outputStyle`                | Output style name                                            |
| `hooks`                      | Hook configuration (see hooks reference)                     |
| `disableAllHooks`            | Disable all hooks                                            |
| `env`                        | Environment variables for all sessions                       |
| `cleanupPeriodDays`          | Delete sessions older than N days (default: 30)              |
| `language`                   | Claude's response language                                   |
| `plansDirectory`             | Where plan files are stored (default: `~/.claude/plans`)     |
| `showTurnDuration`           | Show turn duration messages                                  |
| `spinnerVerbs`               | Customize spinner verbs (`mode`, `verbs`)                    |
| `respectGitignore`           | File picker respects `.gitignore` (default: true)            |
| `autoUpdatesChannel`         | `"stable"` or `"latest"` (default)                           |

### Attribution Settings

```json
{
  "attribution": {
    "commit": "Generated with AI\n\nCo-Authored-By: AI <ai@example.com>",
    "pr": ""
  }
}
```

Empty string hides attribution.

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
      "source": { "source": "github", "repo": "acme-corp/plugins" }
    }
  }
}
```

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
- List: Only allow exact matches

**Source types:** `github`, `git`, `url`, `npm`, `file`, `directory`, `hostPattern`

---

## MCP Server Settings

| Key                          | Description                                    |
|------------------------------|------------------------------------------------|
| `enableAllProjectMcpServers` | Auto-approve all `.mcp.json` servers           |
| `enabledMcpjsonServers`      | List of approved servers                       |
| `disabledMcpjsonServers`     | List of rejected servers                       |
| `allowedMcpServers`          | Allowlist (managed only)                       |
| `deniedMcpServers`           | Denylist (managed only, takes precedence)      |

---

## Environment Variables

### API and Authentication

| Variable                         | Purpose                                        |
|----------------------------------|------------------------------------------------|
| `ANTHROPIC_API_KEY`              | API key for Claude SDK                         |
| `ANTHROPIC_AUTH_TOKEN`           | Custom Authorization header value              |
| `ANTHROPIC_CUSTOM_HEADERS`       | Additional request headers                     |
| `ANTHROPIC_MODEL`                | Model setting name                             |
| `CLAUDE_CODE_USE_BEDROCK`        | Use Amazon Bedrock                             |
| `CLAUDE_CODE_USE_VERTEX`         | Use Google Vertex AI                           |
| `CLAUDE_CODE_USE_FOUNDRY`        | Use Microsoft Foundry                          |

### Behavior Control

| Variable                              | Purpose                                   |
|---------------------------------------|-------------------------------------------|
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`     | Context % threshold for auto-compaction   |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS`       | Max output tokens (default: 32000)        |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | Token limit for file reads            |
| `MAX_THINKING_TOKENS`                 | Extended thinking budget (0 to disable)   |
| `BASH_DEFAULT_TIMEOUT_MS`             | Default bash timeout                      |
| `BASH_MAX_TIMEOUT_MS`                 | Max bash timeout model can set            |
| `BASH_MAX_OUTPUT_LENGTH`              | Max chars before middle-truncation        |

### Feature Toggles

| Variable                              | Purpose                                   |
|---------------------------------------|-------------------------------------------|
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`| Disable background task functionality     |
| `CLAUDE_CODE_ENABLE_TASKS`            | Task tracking (`false` to use TODO list)  |
| `DISABLE_AUTOUPDATER`                 | Disable auto-updates                      |
| `DISABLE_TELEMETRY`                   | Opt out of Statsig telemetry              |
| `DISABLE_ERROR_REPORTING`             | Opt out of Sentry reporting               |
| `DISABLE_PROMPT_CACHING`              | Disable prompt caching                    |
| `ENABLE_TOOL_SEARCH`                  | MCP tool search (`auto`, `true`, `false`) |

### Paths and Environment

| Variable                | Purpose                                          |
|-------------------------|--------------------------------------------------|
| `CLAUDE_CONFIG_DIR`     | Custom config directory                          |
| `CLAUDE_CODE_TMPDIR`    | Custom temp directory                            |
| `CLAUDE_CODE_SHELL`     | Override shell detection                         |
| `CLAUDE_ENV_FILE`       | Script sourced before each bash command          |
| `HTTP_PROXY`            | HTTP proxy server                                |
| `HTTPS_PROXY`           | HTTPS proxy server                               |

---

## Tools Available to Claude

| Tool            | Description                              | Permission |
|-----------------|------------------------------------------|------------|
| AskUserQuestion | Multiple-choice questions                | No         |
| Bash            | Shell commands                           | Yes        |
| Edit            | Targeted file edits                      | Yes        |
| Write           | Create/overwrite files                   | Yes        |
| Read            | Read file contents                       | No         |
| Glob            | Find files by pattern                    | No         |
| Grep            | Search file contents                     | No         |
| WebFetch        | Fetch URL content                        | Yes        |
| WebSearch       | Web search with domain filtering         | Yes        |
| Task            | Run subagent for complex tasks           | No         |
| Skill           | Execute a skill                          | Yes        |
| LSP             | Code intelligence via language servers   | No         |
| NotebookEdit    | Modify Jupyter cells                     | Yes        |

### Bash Tool Behavior

- **Working directory persists** between commands
- **Environment variables do NOT persist** — each command runs in fresh shell

**Persist environment:**

1. Activate before starting Claude Code
2. Set `CLAUDE_ENV_FILE` to script path
3. Use SessionStart hook to write to `$CLAUDE_ENV_FILE`

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

Script receives JSON on stdin (`{"query": "src/comp"}`), outputs file paths.

---

## Troubleshooting

### Settings Not Applied

1. Check scope precedence (managed overrides all)
2. Restart Claude Code after editing settings files
3. Run `/config` to verify effective settings

### Permissions Not Working

1. Deny rules take precedence over allow
2. Check wildcard syntax (`Bash(npm run *)` not `Bash(npm run:*)`)
3. Argument-constraining patterns are fragile — don't rely for security

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
