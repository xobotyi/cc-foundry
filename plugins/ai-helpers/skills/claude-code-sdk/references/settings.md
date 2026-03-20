# Claude Code Settings

## Configuration Scopes

| Scope       | Location                                                          | Affects              | Shared?              |
| ----------- | ----------------------------------------------------------------- | -------------------- | -------------------- |
| **Managed** | Server-managed, plist/registry, or system `managed-settings.json` | All users on machine | Yes (deployed by IT) |
| **User**    | `~/.claude/` directory                                            | You, all projects    | No                   |
| **Project** | `.claude/` in repository                                          | All collaborators    | Yes (in git)         |
| **Local**   | `.claude/settings.local.json`                                     | You, this repo only  | No (gitignored)      |

### Precedence (highest to lowest)

1. **Managed** -- cannot be overridden
2. **Command line arguments**
3. **Local** (`.claude/settings.local.json`)
4. **Project** (`.claude/settings.json`)
5. **User** (`~/.claude/settings.json`)

Array settings merge across scopes (concatenated and deduplicated).

### Feature Locations

| Feature     | User                      | Project                            | Local                          |
| ----------- | ------------------------- | ---------------------------------- | ------------------------------ |
| Settings    | `~/.claude/settings.json` | `.claude/settings.json`            | `.claude/settings.local.json`  |
| Subagents   | `~/.claude/agents/`       | `.claude/agents/`                  | --                             |
| MCP servers | `~/.claude.json`          | `.mcp.json`                        | `~/.claude.json` (per-project) |
| Plugins     | `~/.claude/settings.json` | `.claude/settings.json`            | `.claude/settings.local.json`  |
| CLAUDE.md   | `~/.claude/CLAUDE.md`     | `CLAUDE.md` or `.claude/CLAUDE.md` | --                             |

## Settings Files

- **User**: `~/.claude/settings.json`
- **Project shared**: `.claude/settings.json` (committed to git)
- **Project local**: `.claude/settings.local.json` (gitignored)
- **Managed**: multiple delivery mechanisms:
  - Server-managed (via Claude.ai admin console)
  - MDM/OS-level: macOS `com.anthropic.claudecode` preferences, Windows `HKLM\SOFTWARE\Policies\ClaudeCode`
  - File-based: `managed-settings.json` in system directories (macOS: `/Library/Application Support/ClaudeCode/`, Linux:
    `/etc/claude-code/`, Windows: `C:\Program Files\ClaudeCode\`)
- **Other config**: `~/.claude.json` (preferences, OAuth, MCP servers, per-project state)

JSON schema: `https://json.schemastore.org/claude-code-settings.json`

## Available Settings

| Key                               | Description                                                          | Example                                                          |
| --------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `apiKeyHelper`                    | Script to generate auth value (sent as X-Api-Key and Bearer headers) | `/bin/generate_temp_api_key.sh`                                  |
| `autoMemoryDirectory`             | Custom auto memory storage path (not from project settings)          | `"~/my-memory-dir"`                                              |
| `cleanupPeriodDays`               | Session cleanup period (default: 30). 0 = delete all, no persistence | `20`                                                             |
| `companyAnnouncements`            | Startup announcements (cycled randomly)                              | `["Welcome to Acme Corp!"]`                                      |
| `env`                             | Environment variables for every session                              | `{"FOO": "bar"}`                                                 |
| `attribution`                     | Git commit/PR attribution customization                              | `{"commit": "Generated with AI", "pr": ""}`                      |
| `includeGitInstructions`          | Include built-in git workflow instructions (default: true)           | `false`                                                          |
| `permissions`                     | Permission rules (allow/ask/deny)                                    | See permission settings                                          |
| `hooks`                           | Lifecycle event hooks                                                | See hooks docs                                                   |
| `disableAllHooks`                 | Disable all hooks and status line                                    | `true`                                                           |
| `allowManagedHooksOnly`           | (Managed only) Block user/project/plugin hooks                       | `true`                                                           |
| `allowedHttpHookUrls`             | URL allowlist for HTTP hooks (supports `*` wildcard)                 | `["https://hooks.example.com/*"]`                                |
| `httpHookAllowedEnvVars`          | Env var allowlist for HTTP hook headers                              | `["MY_TOKEN", "HOOK_SECRET"]`                                    |
| `allowManagedPermissionRulesOnly` | (Managed only) Only managed permission rules apply                   | `true`                                                           |
| `allowManagedMcpServersOnly`      | (Managed only) Only managed MCP allowlist applies                    | `true`                                                           |
| `model`                           | Override default model                                               | `"claude-sonnet-4-6"`                                            |
| `availableModels`                 | Restrict selectable models                                           | `["sonnet", "haiku"]`                                            |
| `modelOverrides`                  | Map Anthropic model IDs to provider-specific IDs                     | `{"claude-opus-4-6": "arn:aws:bedrock:..."}`                     |
| `effortLevel`                     | Persist effort level (`low`, `medium`, `high`)                       | `"medium"`                                                       |
| `statusLine`                      | Custom status line configuration                                     | `{"type": "command", "command": "~/.claude/statusline.sh"}`      |
| `fileSuggestion`                  | Custom `@` file autocomplete command                                 | `{"type": "command", "command": "~/.claude/file-suggestion.sh"}` |
| `respectGitignore`                | `@` picker respects .gitignore (default: true)                       | `false`                                                          |
| `outputStyle`                     | Output style name                                                    | `"Explanatory"`                                                  |
| `agent`                           | Run main thread as named subagent                                    | `"code-reviewer"`                                                |
| `forceLoginMethod`                | Restrict login to `claudeai` or `console`                            | `"claudeai"`                                                     |
| `forceLoginOrgUUID`               | Auto-select org during login                                         | `"xxxxxxxx-xxxx-..."`                                            |
| `enableAllProjectMcpServers`      | Auto-approve all project `.mcp.json` servers                         | `true`                                                           |
| `enabledMcpjsonServers`           | Specific `.mcp.json` servers to approve                              | `["memory", "github"]`                                           |
| `disabledMcpjsonServers`          | Specific `.mcp.json` servers to reject                               | `["filesystem"]`                                                 |
| `channelsEnabled`                 | (Managed only) Allow channels                                        | `true`                                                           |
| `allowedMcpServers`               | MCP server allowlist (managed settings)                              | `[{ "serverName": "github" }]`                                   |
| `deniedMcpServers`                | MCP server denylist (managed settings)                               | `[{ "serverName": "filesystem" }]`                               |
| `strictKnownMarketplaces`         | Marketplace allowlist (managed settings)                             | `[{ "source": "github", "repo": "acme/plugins" }]`               |
| `blockedMarketplaces`             | Marketplace blocklist (managed settings)                             | `[{ "source": "github", "repo": "untrusted/plugins" }]`          |
| `pluginTrustMessage`              | (Managed only) Custom plugin trust warning message                   | `"Approved by IT"`                                               |
| `awsAuthRefresh`                  | AWS credential refresh script                                        | `aws sso login --profile myprofile`                              |
| `awsCredentialExport`             | AWS credential export script                                         | `/bin/generate_aws_grant.sh`                                     |
| `alwaysThinkingEnabled`           | Enable extended thinking by default                                  | `true`                                                           |
| `plansDirectory`                  | Plan file storage path (default: `~/.claude/plans`)                  | `"./plans"`                                                      |
| `spinnerVerbs`                    | Custom spinner action verbs                                          | `{"mode": "append", "verbs": ["Pondering"]}`                     |
| `language`                        | Preferred response language                                          | `"japanese"`                                                     |
| `voiceEnabled`                    | Enable push-to-talk voice dictation                                  | `true`                                                           |
| `autoUpdatesChannel`              | Release channel: `"stable"` or `"latest"` (default)                  | `"stable"`                                                       |
| `spinnerTipsEnabled`              | Show spinner tips (default: true)                                    | `false`                                                          |
| `prefersReducedMotion`            | Reduce UI animations for accessibility                               | `true`                                                           |
| `fastModePerSessionOptIn`         | Require per-session fast mode opt-in                                 | `true`                                                           |
| `teammateMode`                    | Agent team display: `auto`, `in-process`, `tmux`                     | `"in-process"`                                                   |
| `feedbackSurveyRate`              | Survey probability 0-1 (0 = suppress)                                | `0.05`                                                           |
| `otelHeadersHelper`               | Script for dynamic OpenTelemetry headers                             | `/bin/generate_otel_headers.sh`                                  |

### Global Config (in `~/.claude.json`, not `settings.json`)

- `showTurnDuration` -- show turn duration messages (default: true)
- `terminalProgressBarEnabled` -- terminal progress bar (default: true)

### Worktree Settings

- `worktree.symlinkDirectories` -- directories to symlink into worktrees (e.g., `["node_modules", ".cache"]`)
- `worktree.sparsePaths` -- directories to sparse-checkout (e.g., `["packages/my-app", "shared/utils"]`)

## Permission Settings

| Key                            | Description                               |
| ------------------------------ | ----------------------------------------- |
| `allow`                        | Rules to allow tool use                   |
| `ask`                          | Rules to ask for confirmation             |
| `deny`                         | Rules to deny tool use                    |
| `additionalDirectories`        | Extra working directories                 |
| `defaultMode`                  | Default permission mode                   |
| `disableBypassPermissionsMode` | Set to `"disable"` to prevent bypass mode |

### Permission Rule Syntax

Format: `Tool` or `Tool(specifier)`. Evaluated: deny first, then ask, then allow.

| Rule                           | Effect                                   |
| ------------------------------ | ---------------------------------------- |
| `Bash`                         | Matches all Bash commands                |
| `Bash(npm run *)`              | Matches commands starting with `npm run` |
| `Read(./.env)`                 | Matches reading .env file                |
| `WebFetch(domain:example.com)` | Matches fetch to example.com             |

## Sandbox Settings

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker"],
    "filesystem": {
      "allowWrite": ["/tmp/build", "~/.kube"],
      "denyWrite": ["/etc"],
      "denyRead": ["~/.aws/credentials"],
      "allowRead": ["."]
    },
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org"],
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

Path prefixes: `/` = absolute, `~/` = home, `./` = project root (in project settings) or `~/.claude` (in user settings).

Key settings: `allowUnsandboxedCommands` (default: true), `allowManagedReadPathsOnly` (managed only),
`enableWeakerNestedSandbox` (Linux/WSL2), `enableWeakerNetworkIsolation` (macOS).

## Attribution Settings

```json
{
  "attribution": {
    "commit": "Generated with AI\n\nCo-Authored-By: AI <ai@example.com>",
    "pr": ""
  }
}
```

Empty string hides attribution. Takes precedence over deprecated `includeCoAuthoredBy`.

## File Suggestion Settings

Custom `@` autocomplete command. Receives JSON with `query` field on stdin, outputs newline-separated file paths (max
15):

```json
{ "fileSuggestion": { "type": "command", "command": "~/.claude/file-suggestion.sh" } }
```

## Plugin Settings

### `enabledPlugins`

Format: `"plugin-name@marketplace-name": true/false`

### `extraKnownMarketplaces`

Pre-register marketplaces for team members:

```json
{
  "extraKnownMarketplaces": {
    "acme-tools": {
      "source": { "source": "github", "repo": "acme-corp/claude-plugins" }
    }
  }
}
```

Marketplace source types: `github`, `git`, `url`, `npm`, `file`, `directory`, `hostPattern`, `settings` (inline
plugins).

### `strictKnownMarketplaces` (Managed Only)

Allowlist of permitted marketplace sources. Uses exact matching (except `hostPattern` which uses regex).

- `undefined` -- no restrictions
- `[]` -- complete lockdown
- List -- only matching sources allowed

Deployed to managed settings file locations. Cannot be overridden.

## Excluding Sensitive Files

```json
{
  "permissions": {
    "deny": ["Read(./.env)", "Read(./.env.*)", "Read(./secrets/**)"]
  }
}
```

## System Prompt

Not published. Use CLAUDE.md files or `--append-system-prompt` for custom instructions.

## Verify Settings

Run `/status` to see active settings sources and their origins.
