# Plugins

Complete reference for the Claude Code plugin system: manifest schema, directory layout, component paths, environment
variables, marketplace schema, plugin sources, caching, installation scopes, LSP servers, validation, and CLI commands.

## Plugin Manifest (`plugin.json`)

Location: `.claude-plugin/plugin.json` inside the plugin root directory.

The manifest is optional. If omitted, Claude Code auto-discovers components in default locations and derives the plugin
name from the directory name. Use a manifest when you need metadata or custom component paths.

### Required Fields

Only `name` is required when a manifest is present.

- `name` (string) — unique identifier, kebab-case, no spaces. Used for namespacing: skills appear as
  `/plugin-name:skill-name`, agents as `plugin-name:agent-name`

### Metadata Fields

- `version` (string) — semantic version (`MAJOR.MINOR.PATCH`). If also set in marketplace entry, `plugin.json` takes
  priority. Only needs to be in one place.
- `description` (string) — brief explanation of plugin purpose
- `author` (object) — `{ "name": string, "email"?: string, "url"?: string }`
- `homepage` (string) — documentation URL
- `repository` (string) — source code URL
- `license` (string) — SPDX license identifier (e.g., `MIT`, `Apache-2.0`)
- `keywords` (string[]) — discovery tags

### Component Path Fields

These fields override default directory scanning. When specified, the default directory for that component type is NOT
scanned. To keep the default and add more, include the default in the array (e.g.,
`"skills": ["./skills/", "./extras/"]`).

- `skills` (string | string[]) — directories containing `<name>/SKILL.md`. Replaces default `skills/`
- `commands` (string | string[]) — flat `.md` skill files or directories. Replaces default `commands/`
- `agents` (string | string[]) — agent markdown files. Replaces default `agents/`
- `hooks` (string | string[] | object) — hook config paths or inline hook config
- `mcpServers` (string | string[] | object) — MCP config paths or inline MCP config
- `outputStyles` (string | string[]) — output style files/directories. Replaces default `output-styles/`
- `lspServers` (string | string[] | object) — LSP server config paths or inline config
- `userConfig` (object) — user-configurable values prompted at enable time (see
  [User Configuration](#user-configuration))
- `channels` (array) — channel declarations for message injection (see [Channels](#channels))

### Path Rules

- All paths must be relative to the plugin root and start with `./`
- Multiple paths can be specified as arrays
- For `skills`, `commands`, `agents`, `outputStyles`: custom paths **replace** the default directory
- For `hooks`, `mcpServers`, `lspServers`: multiple sources are merged
- When a skill path points to a directory containing `SKILL.md` directly (e.g., `"skills": ["./"]`), the frontmatter
  `name` field determines the invocation name. If `name` is absent, the directory basename is used as fallback.

## Plugin Directory Structure

```
plugin-name/
├── .claude-plugin/           # Metadata (optional)
│   └── plugin.json             # Manifest
├── skills/                   # Skills as <name>/SKILL.md
│   └── my-skill/
│       ├── SKILL.md
│       ├── references/
│       └── scripts/
├── commands/                 # Skills as flat .md files (legacy)
├── agents/                   # Subagent definitions (.md)
├── output-styles/            # Output style definitions (.md)
├── hooks/
│   ├── hooks.json            # Main hook config
│   └── extra-hooks.json      # Additional hook files
├── bin/                      # Executables added to Bash tool PATH
├── settings.json             # Default settings (only `agent` key supported)
├── .mcp.json                 # MCP server definitions
├── .lsp.json                 # LSP server configurations
├── scripts/                  # Hook and utility scripts
├── LICENSE
└── README.md
```

Only `plugin.json` goes inside `.claude-plugin/`. All component directories (`skills/`, `agents/`, `hooks/`, etc.) must
be at the plugin root.

### Default Component Locations

- **Manifest** — `.claude-plugin/plugin.json`
- **Skills** — `skills/`
- **Commands** — `commands/`
- **Agents** — `agents/`
- **Output styles** — `output-styles/`
- **Hooks** — `hooks/hooks.json`
- **MCP servers** — `.mcp.json`
- **LSP servers** — `.lsp.json`
- **Executables** — `bin/`
- **Default settings** — `settings.json`

### `settings.json`

Only the `agent` key is supported. Setting `agent` activates one of the plugin's custom agents as the main thread agent,
applying its system prompt, tool restrictions, and model. Settings from `settings.json` take priority over `settings`
declared in `plugin.json`.

```json
{
  "agent": "security-reviewer"
}
```

### `bin/` Directory

Files in `bin/` are added to the Bash tool's `PATH` while the plugin is enabled. They become invokable as bare commands
in any Bash tool call without specifying the full path.

## Environment Variables

Two path variables are available for referencing plugin locations. Both are substituted inline in skill content, agent
content, hook commands, and MCP/LSP server configs. Both are also exported as environment variables to subprocesses.

### `${CLAUDE_PLUGIN_ROOT}`

Absolute path to the plugin's installation directory. Use for scripts, binaries, and config bundled with the plugin.
This path changes when the plugin updates — files written here do not survive updates.

### `${CLAUDE_PLUGIN_DATA}`

Persistent directory for plugin state that survives updates. Use for installed dependencies (`node_modules`, Python
venvs), generated files, caches, and any state that should persist across plugin versions.

- Resolves to `~/.claude/plugins/data/{id}/` where `{id}` is the plugin identifier with non-alphanumeric characters
  (outside `a-z`, `A-Z`, `0-9`, `_`, `-`) replaced by `-`
- Example: plugin `formatter@my-marketplace` gets `~/.claude/plugins/data/formatter-my-marketplace/`
- Created automatically on first reference
- Deleted when uninstalling from the last scope (unless `--keep-data` is passed)

#### Dependency Install Pattern

Use a `SessionStart` hook to install dependencies on first run and re-install when the plugin updates:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/package.json\" . && npm install) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\""
          }
        ]
      }
    ]
  }
}
```

The `diff` exits nonzero when the stored copy is missing or differs from the bundled one. If `npm install` fails, the
trailing `rm` removes the manifest so the next session retries.

Reference the persisted modules from MCP/hook configs:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"],
      "env": {
        "NODE_PATH": "${CLAUDE_PLUGIN_DATA}/node_modules"
      }
    }
  }
}
```

## User Configuration

The `userConfig` field in `plugin.json` declares values that Claude Code prompts the user for when the plugin is
enabled.

```json
{
  "userConfig": {
    "api_endpoint": {
      "description": "Your team's API endpoint",
      "sensitive": false
    },
    "api_token": {
      "description": "API authentication token",
      "sensitive": true
    }
  }
}
```

- Keys must be valid identifiers
- Available as `${user_config.KEY}` in MCP/LSP server configs, hook commands, and (non-sensitive only) skill/agent
  content
- Exported to plugin subprocesses as `CLAUDE_PLUGIN_OPTION_<KEY>` environment variables
- Non-sensitive values stored in `settings.json` under `pluginConfigs[<plugin-id>].options`
- Sensitive values stored in system keychain (or `~/.claude/.credentials.json` where keychain is unavailable)
- Keychain storage is shared with OAuth tokens and has ~2 KB total limit — keep sensitive values small

## Channels

The `channels` field lets a plugin declare message channels that inject content into the conversation. Each channel
binds to an MCP server the plugin provides.

```json
{
  "channels": [
    {
      "server": "telegram",
      "userConfig": {
        "bot_token": { "description": "Telegram bot token", "sensitive": true },
        "owner_id": { "description": "Your Telegram user ID", "sensitive": false }
      }
    }
  ]
}
```

- `server` (required) — must match a key in the plugin's `mcpServers`
- `userConfig` (optional) — per-channel user config, same schema as top-level `userConfig`

## Plugin Components

### Skills

Location: `skills/<name>/SKILL.md` or `commands/<name>.md` (flat, legacy)

Skills are auto-discovered when installed. Claude invokes them automatically based on task context. Skills can include
supporting files alongside `SKILL.md` (references, scripts, assets). Use `skills/` for new plugins; `commands/` is
legacy.

### Agents

Location: `agents/<name>.md`

Agent frontmatter supports: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`,
`memory`, `background`, `isolation` (only `"worktree"`). For security, `hooks`, `mcpServers`, and `permissionMode` are
NOT supported for plugin agents.

### Hooks

Location: `hooks/hooks.json` or inline in `plugin.json`

Same format as user-defined hooks. Plugin hooks respond to all 22 lifecycle events:

**Can block (all 4 types):** `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `SubagentStop`, `TaskCompleted`,
`Stop`

**Can block (command, http):** `TeammateIdle`, `ConfigChange` (except `policy_settings`), `WorktreeCreate` (replaces
default git behavior; must print path), `Elicitation`, `ElicitationResult`

**Cannot block (all 4 types):** `PostToolUse` (`decision: "block"` feeds reason but doesn't undo), `PostToolUseFailure`

**Cannot block (command, http):** `PermissionDenied`, `Notification`, `WorktreeRemove`, `PreCompact`, `PostCompact`,
`SessionEnd`

**Cannot block (command only):** `SessionStart`, `SubagentStart`, `StopFailure`, `CwdChanged`, `FileChanged`

**Cannot block (command, http — read-only):** `InstructionsLoaded`, `TaskCreated`

Hook types:

- `command` — execute shell commands/scripts. Timeout: 600s. Supports `async: true` for background execution.
- `http` — POST event JSON to a URL. Non-2xx = non-blocking error. Block via 2xx + JSON decision body. Supports header
  env var interpolation with `allowedEnvVars`.
- `prompt` — LLM judgment on hook input data. Timeout: 30s. Returns `{ok, reason}` JSON.
- `agent` — agentic LLM verifier with tool access. Timeout: 60s. Same response schema as prompt.

### MCP Servers

Location: `.mcp.json` or inline in `plugin.json`

Standard MCP server configuration. Plugin MCP servers start automatically when the plugin is enabled. Use
`${CLAUDE_PLUGIN_ROOT}` for all plugin paths.

```json
{
  "mcpServers": {
    "my-server": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "DB_PATH": "${CLAUDE_PLUGIN_ROOT}/data"
      },
      "cwd": "${CLAUDE_PLUGIN_ROOT}"
    }
  }
}
```

### LSP Servers

Location: `.lsp.json` or inline in `plugin.json` under `lspServers` key.

LSP plugins configure how Claude Code connects to a language server — they do not include the server binary. Users must
install the binary separately.

#### Required Fields

- `command` (string) — LSP binary to execute (must be in PATH)
- `extensionToLanguage` (object) — maps file extensions to language identifiers

#### Optional Fields

- `args` (string[]) — command-line arguments
- `transport` (string) — `stdio` (default) or `socket`
- `env` (object) — environment variables for the server process
- `initializationOptions` (object) — options passed during initialization
- `settings` (object) — settings passed via `workspace/didChangeConfiguration`
- `workspaceFolder` (string) — workspace folder path
- `startupTimeout` (number) — max startup wait in milliseconds
- `shutdownTimeout` (number) — max graceful shutdown wait in milliseconds
- `restartOnCrash` (boolean) — auto-restart on crash
- `maxRestarts` (number) — max restart attempts

#### Example

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": {
      ".go": "go"
    }
  }
}
```

#### Official LSP Plugins

- **`clangd-lsp`** — C/C++, requires `clangd`
- **`csharp-lsp`** — C#, requires `csharp-ls`
- **`gopls-lsp`** — Go, requires `gopls`
- **`jdtls-lsp`** — Java, requires `jdtls`
- **`kotlin-lsp`** — Kotlin, requires `kotlin-language-server`
- **`lua-lsp`** — Lua, requires `lua-language-server`
- **`php-lsp`** — PHP, requires `intelephense`
- **`pyright-lsp`** — Python, requires `pyright-langserver`
- **`rust-analyzer-lsp`** — Rust, requires `rust-analyzer`
- **`swift-lsp`** — Swift, requires `sourcekit-lsp`
- **`typescript-lsp`** — TypeScript, requires `typescript-language-server`

## Installation Scopes

- **user** — `~/.claude/settings.json`. Personal plugins across all projects (default).
- **project** — `.claude/settings.json`. Team plugins shared via version control.
- **local** — `.claude/settings.local.json`. Project-specific, gitignored.
- **managed** — managed settings (system paths). Admin-controlled, read-only, update only.

## Plugin Caching

Marketplace plugins are copied to `~/.claude/plugins/cache` rather than used in-place. Each installed version gets a
separate directory.

- Previous versions are marked orphaned and removed after 7 days (grace period for concurrent sessions)
- Installed plugins cannot reference files outside their directory — paths like `../shared-utils` will not work
- To reference external files, create symlinks inside the plugin directory (symlinks are preserved in cache, resolved at
  runtime)
- `--plugin-dir` plugins are used in-place (not cached), and take precedence over installed marketplace plugins of the
  same name (except force-enabled managed plugins)

## Marketplace

### Marketplace File (`marketplace.json`)

Location: `.claude-plugin/marketplace.json` in the marketplace repository root.

#### Required Fields

- `name` (string) — marketplace identifier, kebab-case. Users see this when installing:
  `/plugin install my-tool@marketplace-name`
- `owner` (object) — `{ "name": string (required), "email"?: string }`
- `plugins` (array) — list of plugin entries

Reserved marketplace names: `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`,
`anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `knowledge-work-plugins`, `life-sciences`. Names
impersonating official marketplaces are also blocked.

#### Optional Metadata

- `metadata.description` (string) — brief marketplace description
- `metadata.version` (string) — marketplace version
- `metadata.pluginRoot` (string) — base directory prepended to relative plugin source paths (e.g., `"./plugins"` lets
  you write `"source": "formatter"` instead of `"source": "./plugins/formatter"`)

### Plugin Entries

Each entry in the `plugins` array supports all `plugin.json` fields plus these marketplace-specific fields:

#### Required

- `name` (string) — plugin identifier, kebab-case
- `source` (string | object) — where to fetch the plugin (see [Plugin Sources](#plugin-sources))

#### Optional

- `description`, `version`, `author`, `homepage`, `repository`, `license`, `keywords` — standard metadata
- `category` (string) — organizational category
- `tags` (string[]) — searchability tags
- `strict` (boolean) — controls authority for component definitions (default: `true`)
- `skills`, `commands`, `agents`, `hooks`, `mcpServers`, `lspServers` — component configuration overrides

### Strict Mode

- `true` (default) — `plugin.json` is the authority. Marketplace entry supplements with additional components; both
  sources are merged.
- `false` — marketplace entry is the entire definition. If `plugin.json` also declares components, the plugin fails to
  load with a conflict error.

Use `strict: true` for plugins that manage their own manifest. Use `strict: false` when the marketplace operator wants
full control over which files are exposed as components.

### Plugin Sources

- **Relative path** — `"./plugins/my-plugin"` (string). No other fields needed.
- **`github`** (object) — required: `source`, `repo`. Optional: `ref`, `sha`.
- **`url`** (object) — required: `source`, `url`. Optional: `ref`, `sha`.
- **`git-subdir`** (object) — required: `source`, `url`, `path`. Optional: `ref`, `sha`.
- **`npm`** (object) — required: `source`, `package`. Optional: `version`, `registry`.

#### Relative Path

```json
{ "source": "./plugins/my-plugin" }
```

Resolved relative to the marketplace root (directory containing `.claude-plugin/`), not the `.claude-plugin/` directory
itself. Only works with Git-based marketplaces (not URL-based).

#### GitHub

```json
{
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo",
    "ref": "v2.0.0",
    "sha": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
  }
}
```

- `repo` (string, required) — `owner/repo` format
- `ref` (string) — branch or tag (defaults to repo default branch)
- `sha` (string) — full 40-char commit SHA for exact pinning

#### Git URL

```json
{
  "source": {
    "source": "url",
    "url": "https://gitlab.com/team/plugin.git",
    "ref": "main"
  }
}
```

- `url` (string, required) — full git URL (`https://` or `git@`). `.git` suffix is optional.
- `ref`, `sha` — same as GitHub source

#### Git Subdirectory

```json
{
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/acme-corp/monorepo.git",
    "path": "tools/claude-plugin"
  }
}
```

Uses sparse partial clone to minimize bandwidth. `url` also accepts `owner/repo` shorthand or SSH URLs.

- `url` (string, required) — git repository URL or `owner/repo` shorthand
- `path` (string, required) — subdirectory path within the repo
- `ref`, `sha` — same as GitHub source

#### npm

```json
{
  "source": {
    "source": "npm",
    "package": "@acme/claude-plugin",
    "version": "^2.0.0",
    "registry": "https://npm.example.com"
  }
}
```

- `package` (string, required) — package name or scoped package
- `version` (string) — version or range (`2.1.0`, `^2.0.0`, `~1.5.0`)
- `registry` (string) — custom npm registry URL (defaults to system registry)

## Official Anthropic Marketplace

The official marketplace (`claude-plugins-official`) is automatically available. Browse via `/plugin` > Discover tab or
at `claude.com/plugins`.

Install from official marketplace:

```
/plugin install github@claude-plugins-official
```

Submit plugins via:

- Claude.ai: `claude.ai/settings/plugins/submit`
- Console: `platform.claude.com/plugins/submit`

## Plugin Discovery and Installation

### Adding Marketplaces

```
/plugin marketplace add <source>
```

Supported source types:

- **GitHub**: `owner/repo` (e.g., `anthropics/claude-code`)
- **Git URL**: full URL (e.g., `https://gitlab.com/company/plugins.git`)
- **Local path**: directory or direct path to `marketplace.json`
- **Remote URL**: direct URL to hosted `marketplace.json`

Pin to branch/tag: append `#ref` to git URL or `@ref` to GitHub shorthand.

### Installing Plugins

```
/plugin install plugin-name@marketplace-name
```

Default scope: user. Use the `/plugin` interactive UI to choose user, project, or local scope.

### Managing Plugins

```
/plugin disable plugin-name@marketplace-name    # Disable without uninstalling
/plugin enable plugin-name@marketplace-name     # Re-enable
/plugin uninstall plugin-name@marketplace-name  # Remove completely
/reload-plugins                                 # Apply changes without restart
```

### Managing Marketplaces

```
/plugin marketplace list                       # List all marketplaces
/plugin marketplace update [name]              # Refresh listings (all if name omitted)
/plugin marketplace remove name                # Remove (also uninstalls its plugins)
```

Shortcuts: `/plugin market` for `/plugin marketplace`, `rm` for `remove`.

### Auto-Updates

Toggle per-marketplace via `/plugin` > Marketplaces > select > Enable/Disable auto-update.

- Official marketplaces: auto-update enabled by default
- Third-party/local: auto-update disabled by default

Environment variables:

- `DISABLE_AUTOUPDATER` — disables all auto-updates (Claude Code + plugins)
- `FORCE_AUTOUPDATE_PLUGINS=1` — keep plugin auto-updates on when `DISABLE_AUTOUPDATER` is set

### Team Marketplace Configuration

Add to `.claude/settings.json` to auto-prompt team members:

```json
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "formatter@company-tools": true
  }
}
```

### Managed Marketplace Restrictions

`strictKnownMarketplaces` in managed settings restricts which marketplaces users can add:

- **Undefined** (default) — no restrictions
- **`[]`** (empty array) — complete lockdown — no new marketplaces allowed
- **List of sources** — allowlist — only matching marketplaces allowed

Allowlist source types: `github` (exact repo match), `url` (exact URL match), `hostPattern` (regex on host),
`pathPattern` (regex on filesystem path).

### Container Pre-population

Set `CLAUDE_CODE_PLUGIN_SEED_DIR` to a pre-built plugins directory. Claude Code reads marketplaces and plugin caches
from the seed at startup without cloning.

- Read-only: seed directory is never written to, auto-updates disabled for seed marketplaces
- Seed entries take precedence over user config on each startup
- Layer multiple seeds with `:` (Unix) or `;` (Windows)
- Build with `CLAUDE_CODE_PLUGIN_CACHE_DIR=/path claude plugin marketplace add ...` then set
  `CLAUDE_CODE_PLUGIN_SEED_DIR=/path` at runtime

### Private Repository Authentication

Manual installation uses existing git credential helpers (if `git clone` works, plugin install works).

Background auto-updates require token environment variables:

- **GitHub** — `GITHUB_TOKEN` or `GH_TOKEN`
- **GitLab** — `GITLAB_TOKEN` or `GL_TOKEN`
- **Bitbucket** — `BITBUCKET_TOKEN`

### Offline Environments

- `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1` — keep stale marketplace cache when `git pull` fails instead of
  wiping and re-cloning
- `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` — increase git timeout (default: 120000ms / 2 minutes)

## CLI Commands

Non-interactive commands for scripting and automation.

### `claude plugin install <plugin> [options]`

- `<plugin>` — plugin name or `plugin-name@marketplace-name`
- `-s, --scope <scope>` — `user` (default), `project`, `local`

### `claude plugin uninstall <plugin> [options]`

Aliases: `remove`, `rm`

- `<plugin>` — plugin name or `plugin-name@marketplace-name`
- `-s, --scope <scope>` — `user` (default), `project`, `local`
- `--keep-data` — preserve `${CLAUDE_PLUGIN_DATA}` directory

### `claude plugin enable <plugin> [options]`

- `-s, --scope <scope>` — `user` (default), `project`, `local`

### `claude plugin disable <plugin> [options]`

- `-s, --scope <scope>` — `user` (default), `project`, `local`

### `claude plugin update <plugin> [options]`

- `-s, --scope <scope>` — `user` (default), `project`, `local`, `managed`

### `claude plugin validate <path>`

Validates `plugin.json`, skill/agent/command frontmatter, and `hooks/hooks.json` for syntax and schema errors. Also
validates `marketplace.json` when run on a marketplace directory.

### `claude plugin marketplace add <source> [options]`

- `<source>` — GitHub `owner/repo`, git URL, remote URL, or local path. Pin with `@ref` (GitHub) or `#ref` (git URL).
- `--scope <scope>` — `user` (default), `project`, `local`
- `--sparse <paths...>` — limit checkout to specific directories (monorepos)

### `claude plugin marketplace list [options]`

- `--json` — output as JSON

### `claude plugin marketplace remove <name>`

Alias: `rm`. Also uninstalls plugins from the removed marketplace.

### `claude plugin marketplace update [name]`

Refreshes from sources. Updates all if `name` is omitted. Seed-managed marketplaces are skipped.

## Testing and Development

### Local Testing

```bash
claude --plugin-dir ./my-plugin
```

- Plugin loaded directly without installation
- When same name as installed marketplace plugin, local copy takes precedence (except force-enabled managed plugins)
- Load multiple: `claude --plugin-dir ./one --plugin-dir ./two`
- Use `/reload-plugins` to pick up changes without restarting

### Debugging

```bash
claude --debug
```

Shows plugin loading details, manifest errors, component registration, MCP server initialization.

### Validation

```
/plugin validate
claude plugin validate .
```

### Common Issues

- **Plugin not loading** — invalid `plugin.json`. Run `claude plugin validate` or `/plugin validate`.
- **Skills not appearing** — wrong directory structure. Move to plugin root, not inside `.claude-plugin/`.
- **Hooks not firing** — script not executable. `chmod +x script.sh`.
- **MCP server fails** — missing `${CLAUDE_PLUGIN_ROOT}`. Use variable for all plugin paths.
- **Path errors** — absolute paths used. Use relative paths starting with `./`.
- **LSP `Executable not found in $PATH`** — binary not installed. Install the language server binary.
- **Files not found after install** — external path reference. Use symlinks or restructure into plugin directory.

## Version Management

Format: `MAJOR.MINOR.PATCH` (semantic versioning).

- MAJOR: breaking changes
- MINOR: backward-compatible additions
- PATCH: backward-compatible fixes
- Pre-release: `2.0.0-beta.1`

Claude Code uses the version to detect updates. If you change code but don't bump version, existing users won't see
changes due to caching. Version can be set in `plugin.json` or `marketplace.json` — if set in both, `plugin.json` wins
silently.

### Release Channels

Create two marketplaces pointing to different refs of the same repo (e.g., `stable` branch and `latest` branch). Assign
to user groups via managed settings with `extraKnownMarketplaces`. The plugin's `plugin.json` must declare a different
`version` at each ref — same version at two refs causes updates to be skipped.
