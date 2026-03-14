# Plugins Reference

> **Action Required:** When working on plugin components, invoke specialized skills:
>
> - Skills → `ai-helpers:skill-engineering`
> - Agents/subagents → `ai-helpers:subagent-engineering`
> - Output styles → `ai-helpers:output-style-engineering`

Plugins package and distribute Claude Code extensions: skills, agents, hooks, MCP servers, LSP servers, output styles,
and default settings.

## When to Use Plugins vs Standalone

- **Standalone (`.claude/`)** — skill names like `/hello`. Best for personal workflows, project-specific, experiments.
- **Plugins** — skill names like `/plugin-name:hello`. Best for sharing with team, distributing, versioned releases.

## Plugin Structure

```
my-plugin/
├── .claude-plugin/           # Metadata directory (optional)
│   └── plugin.json          # Plugin manifest
├── commands/                 # Simple markdown commands (legacy; prefer skills/)
│   └── status.md
├── skills/                   # Skills with SKILL.md
│   └── code-reviewer/
│       └── SKILL.md
├── agents/                   # Custom subagents
│   └── security-reviewer.md
├── hooks/                    # Hook configurations
│   └── hooks.json
├── output-styles/            # Output style definitions
│   └── concise.md
├── settings.json             # Default settings (only `agent` key supported)
├── .mcp.json                # MCP server definitions
├── .lsp.json                # LSP server configurations
└── scripts/                 # Utility scripts
    └── format-code.sh
```

**Critical:** Don't put `commands/`, `agents/`, `skills/`, or `hooks/` inside `.claude-plugin/`. Only `plugin.json` goes
there.

## Plugin Manifest (`plugin.json`)

Located at `.claude-plugin/plugin.json`. The manifest is **optional** — Claude Code auto-discovers components in default
locations and derives the plugin name from the directory name. Use a manifest when you need metadata or custom component
paths.

### Required Fields

- `name` (string) — unique identifier (kebab-case, no spaces)

The `name` is used as the namespace for skills: a skill `hello` in plugin `my-plugin` invokes as `/my-plugin:hello`.
Also used in install commands: `plugin-name@marketplace-name`.

### Metadata Fields

- `version` (string) — semantic version. Example: `"2.1.0"`
- `description` (string) — brief explanation. Example: `"Deployment tools"`
- `author` (object) — author info. Example: `{"name": "Dev", "email": ""}`
- `homepage` (string) — documentation URL. Example: `"https://docs.example.com"`
- `repository` (string) — source code URL. Example: `"https://github.com/..."`
- `license` (string) — license identifier. Example: `"MIT"`, `"Apache-2.0"`
- `keywords` (array) — discovery tags. Example: `["deployment", "ci-cd"]`

### Component Path Fields

- `commands` (string|array) — additional command file/directory paths
- `agents` (string|array) — additional agent file paths
- `skills` (string|array) — additional skill directory paths
- `hooks` (string|object) — hook config path or inline config
- `mcpServers` (string|object) — MCP config path or inline config
- `outputStyles` (string|array) — additional output style paths
- `lspServers` (string|object) — LSP config path or inline config

All paths are relative to plugin root and must start with `./`. Custom paths **supplement** default directories — they
don't replace them.

### Complete Example

```json
{
  "name": "my-plugin",
  "version": "1.2.0",
  "description": "Brief plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "commands": ["./custom/commands/special.md"],
  "agents": "./custom/agents/",
  "skills": "./custom/skills/",
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "outputStyles": "./styles/",
  "lspServers": "./.lsp.json"
}
```

### Environment Variable

`${CLAUDE_PLUGIN_ROOT}` — absolute path to the plugin directory. Use this in hooks, MCP servers, and scripts to ensure
correct paths regardless of installation location.

```json
{
  "hooks": {
    "PostToolUse": [{
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/process.sh"
      }]
    }]
  }
}
```

## Default Settings (`settings.json`)

Plugins can ship a `settings.json` at the plugin root. Currently only the `agent` key is supported. Setting `agent`
activates one of the plugin's custom agents as the main thread agent, applying its system prompt, tool restrictions, and
model.

```json
{
  "agent": "security-reviewer"
}
```

`settings.json` takes priority over `settings` declared in `plugin.json`. Unknown keys are silently ignored.

## Skill Arguments (`$ARGUMENTS`)

Skills support dynamic input via the `$ARGUMENTS` placeholder. Any text after the skill name is injected into
`$ARGUMENTS` in `SKILL.md`.

```markdown
---
description: Greet the user with a personalized message
---
Greet the user named "$ARGUMENTS" warmly.
```

Invocation: `/my-plugin:hello Alex` → `$ARGUMENTS` = `"Alex"`.

## Installation Scopes

- `user` — `~/.claude/settings.json`. Personal, all projects (default).
- `project` — `.claude/settings.json`. Team, via version control.
- `local` — `.claude/settings.local.json`. Project-specific, gitignored.
- `managed` — `managed-settings.json`. Admin-controlled (read-only).

## Plugin Discovery UI (`/plugin`)

The `/plugin` command opens a tabbed interface:

- **Discover** — browse available plugins from all marketplaces
- **Installed** — view/manage installed plugins, grouped by scope
- **Marketplaces** — add, remove, update marketplace sources
- **Errors** — view plugin loading errors (e.g. missing LSP binary)

Navigate tabs with **Tab** / **Shift+Tab**. Type to filter by name/description.

## CLI Commands

```bash
# Install
claude plugin install <plugin>@<marketplace> [--scope user|project|local]

# Manage
claude plugin uninstall <plugin>    # aliases: remove, rm
claude plugin enable <plugin>
claude plugin disable <plugin>
claude plugin update <plugin>       # supports --scope managed

# Validate plugin or marketplace
claude plugin validate .
```

## Test Locally

```bash
# Load plugin during development (not cached)
claude --plugin-dir ./my-plugin

# Multiple plugins
claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two
```

---

## Plugin Components

### Skills

```
skills/
├── pdf-processor/
│   ├── SKILL.md
│   ├── reference.md      # optional
│   └── scripts/          # optional
└── code-reviewer/
    └── SKILL.md
```

Each `SKILL.md` needs frontmatter with at minimum `description`. Skills appear in `/help` under the plugin namespace and
Claude invokes them based on task context.

### Agents

Markdown files in `agents/` directory:

```markdown
---
description: What this agent specializes in and when Claude should invoke it
---

Detailed system prompt for the agent describing its role, expertise, and behavior.
```

Agents appear in `/agents` and Claude can invoke them automatically based on context.

### Output Styles

Markdown files in `output-styles/` directory at plugin root, or specified via `outputStyles` in `plugin.json`.

### Hooks

In `hooks/hooks.json` (or inline in `plugin.json` under `hooks`):

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh"
      }]
    }]
  }
}
```

**Available hook events (15):**

- `PreToolUse` — before Claude uses any tool
- `PostToolUse` — after Claude successfully uses a tool
- `PostToolUseFailure` — after tool execution fails
- `PermissionRequest` — when a permission dialog is shown
- `UserPromptSubmit` — when user submits a prompt
- `Notification` — when Claude Code sends notifications
- `Stop` — when Claude attempts to stop
- `SubagentStart` — when a subagent is started
- `SubagentStop` — when a subagent attempts to stop
- `SessionStart` — at the beginning of sessions
- `SessionEnd` — at the end of sessions
- `TeammateIdle` — when a team teammate is about to go idle
- `TaskCompleted` — when a task is marked completed
- `ConfigChange` — when a configuration file changes
- `PreCompact` — before conversation history is compacted

**Hook types:** `command` (shell), `prompt` (LLM evaluation with `$ARGUMENTS`), `agent` (agentic verifier with tools).

### MCP Servers

In `.mcp.json` (or inline in `plugin.json` under `mcpServers`):

```json
{
  "mcpServers": {
    "plugin-database": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "DB_PATH": "${CLAUDE_PLUGIN_ROOT}/data"
      }
    }
  }
}
```

Plugin MCP servers start automatically when the plugin is enabled and appear as standard MCP tools in Claude's toolkit.

### LSP Servers

In `.lsp.json` (or inline in `plugin.json` under `lspServers`):

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

Users must install the language server binary separately. LSP plugins configure the connection, not the server itself.

**Required fields:** `command`, `extensionToLanguage`.

**Optional fields:**

- `args` — command-line arguments
- `transport` — `stdio` (default) or `socket`
- `env` — environment variables
- `initializationOptions` — options passed during initialization
- `settings` — passed via `workspace/didChangeConfiguration`
- `workspaceFolder` — workspace folder path
- `startupTimeout` — max startup wait (ms)
- `shutdownTimeout` — max shutdown wait (ms)
- `restartOnCrash` — auto-restart on crash
- `maxRestarts` — max restart attempts

**Pre-built LSP plugins** (official marketplace, install language server binary first):

- `clangd-lsp` — C/C++. Binary: `clangd`
- `csharp-lsp` — C#. Binary: `csharp-ls`
- `gopls-lsp` — Go. Binary: `gopls`
- `jdtls-lsp` — Java. Binary: `jdtls`
- `kotlin-lsp` — Kotlin. Binary: `kotlin-language-server`
- `lua-lsp` — Lua. Binary: `lua-language-server`
- `php-lsp` — PHP. Binary: `intelephense`
- `pyright-lsp` — Python. Binary: `pyright-langserver`
- `rust-analyzer-lsp` — Rust. Binary: `rust-analyzer`
- `swift-lsp` — Swift. Binary: `sourcekit-lsp`
- `typescript-lsp` — TypeScript. Binary: `typescript-language-server`

Create custom LSP plugins only for languages not covered above.

## Plugin Caching

Claude Code copies marketplace plugins to `~/.claude/plugins/cache`. Implications:

- Paths referencing files outside plugin directory won't work after installation
- Use symlinks for external dependencies (symlinks are followed during copy)
- `--plugin-dir` plugins are used in-place and are not cached

---

# Marketplaces

Marketplaces are catalogs for distributing plugins. Using a marketplace is two steps:

1. Add the marketplace (registers the catalog, installs nothing)
2. Install individual plugins from it

The official Anthropic marketplace (`claude-plugins-official`) is available automatically. All others must be added
manually.

## Marketplace File

Create `.claude-plugin/marketplace.json` at the repository root:

```json
{
  "name": "company-tools",
  "owner": {
    "name": "DevTools Team",
    "email": "devtools@example.com"
  },
  "metadata": {
    "description": "Internal development tools",
    "pluginRoot": "./plugins"
  },
  "plugins": [
    {
      "name": "code-formatter",
      "source": "./plugins/formatter",
      "description": "Automatic code formatting",
      "version": "2.1.0"
    },
    {
      "name": "deployment-tools",
      "source": {
        "source": "github",
        "repo": "company/deploy-plugin"
      },
      "description": "Deployment automation tools"
    }
  ]
}
```

### Marketplace Schema

**Required fields:**

- `name` (string) — marketplace identifier (kebab-case). Used in install commands.
- `owner` (object) — maintainer info: `name` (required), `email` (optional)
- `plugins` (array) — list of available plugins

Reserved names (cannot be used): `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`,
`anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `life-sciences`.

**Optional metadata:**

- `metadata.description` (string) — brief marketplace description
- `metadata.version` (string) — marketplace version
- `metadata.pluginRoot` (string) — base dir prepended to relative source paths (e.g. `"./plugins"`)

### Plugin Entry Fields

Each entry requires `name` and `source`, plus any fields from the plugin manifest schema:

- `name` (string) — plugin identifier (required)
- `source` (string|object) — where to fetch plugin (required)
- `version` (string) — plugin version (see version resolution below)
- `strict` (boolean) — authority control (default: `true`)
- `category` (string) — category for organization
- `tags` (array) — tags for searchability
- `commands` (string|array) — custom paths to command files or directories
- `agents` (string|array) — custom paths to agent files
- `hooks` (string|object) — custom hooks config or path
- `mcpServers` (string|object) — MCP server configs or path
- `lspServers` (string|object) — LSP server configs or path

## Strict Mode

Controls whether `plugin.json` or the marketplace entry is the authority for component definitions.

- `true` (default) — `plugin.json` is authority; marketplace entry can supplement
- `false` — marketplace entry is the entire definition; `plugin.json` components conflict

Use `strict: false` when the marketplace operator wants full control over which components are exposed (e.g. curating a
plugin's components differently than the plugin author intended).

## Version Resolution

Version can be set in `plugin.json` or in the marketplace entry. `plugin.json` always wins silently when both are set.

- **Relative-path plugins:** set version in marketplace entry
- **All other sources:** set version in `plugin.json`

Avoid setting version in both places — the marketplace version will be silently ignored.

## Plugin Sources

- Relative path — type: `string` (e.g. `"./my-plugin"`). Fields: —
- `github` — type: object. Fields: `repo` (required), `ref?`, `sha?`
- `url` — type: object. Fields: `url` (must end `.git`), `ref?`, `sha?`
- `npm` — type: object. Fields: `package`, `version?`, `registry?`
- `pip` — type: object. Fields: `package`, `version?`, `registry?`

Relative paths only work with Git-based marketplaces (not URL-based). For URL-based distribution, use `github`, `url`,
or `npm` sources.

### Source Examples

```json
// GitHub
{"source": {"source": "github", "repo": "owner/repo", "ref": "v2.0.0", "sha": "a1b2c3..."}}

// Git URL
{"source": {"source": "url", "url": "https://gitlab.com/team/plugin.git", "ref": "main"}}

// npm
{"source": {"source": "npm", "package": "@company/my-plugin", "version": "1.0.0"}}

// pip
{"source": {"source": "pip", "package": "my-plugin", "version": "1.0.0"}}
```

## Add Marketplaces

```bash
# GitHub (owner/repo format)
/plugin marketplace add owner/repo

# Git URL (HTTPS or SSH, optional #ref for branch/tag)
/plugin marketplace add https://gitlab.com/company/plugins.git
/plugin marketplace add https://gitlab.com/company/plugins.git#v1.0.0

# Local path or direct marketplace.json
/plugin marketplace add ./my-marketplace
/plugin marketplace add ./path/to/marketplace.json

# Remote URL (direct marketplace.json — relative plugin paths won't work)
/plugin marketplace add https://example.com/marketplace.json
```

Shortcut: `/plugin market` instead of `/plugin marketplace`.

## Manage Marketplaces

```bash
/plugin marketplace list
/plugin marketplace update marketplace-name
/plugin marketplace remove marketplace-name    # aliases: rm — also uninstalls plugins
```

## Auto-Update Control

Official marketplaces: auto-update enabled by default. Third-party/local: disabled by default. Toggle per-marketplace
via `/plugin` → Marketplaces → select → Enable/Disable auto-update.

- `DISABLE_AUTOUPDATER` — disables all auto-updates (Claude Code + plugins)
- `FORCE_AUTOUPDATE_PLUGINS=true` — keeps plugin auto-updates even when `DISABLE_AUTOUPDATER` is set

```bash
# Manual Claude Code updates, automatic plugin updates
export DISABLE_AUTOUPDATER=true
export FORCE_AUTOUPDATE_PLUGINS=true
```

## Team Configuration

In `.claude/settings.json` — prompts team members to install when they trust the project:

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
    "formatter@company-tools": true,
    "deployment-tools@company-tools": true
  }
}
```

## Managed Marketplace Restrictions (`strictKnownMarketplaces`)

Administrators restrict which marketplaces users can add via managed settings. Cannot be overridden by user or project
settings. Validated before any network requests.

- Undefined (default) — no restrictions; users can add any marketplace
- Empty array `[]` — complete lockdown; no new marketplaces allowed
- List of sources — allowlist; only matching marketplaces allowed

**Supported allowlist source types:**

- `github` — required fields: `repo`; optional: `ref`, `path`. Exact match on all specified fields.
- `url` — required fields: `url`. Full URL exact match.
- `hostPattern` — required fields: `hostPattern`. Regex matched against marketplace host.

```json
{
  "strictKnownMarketplaces": [
    {"source": "github", "repo": "acme-corp/approved-plugins"},
    {"source": "hostPattern", "hostPattern": "^github\\.example\\.com$"}
  ]
}
```

## Release Channels

To run stable/latest channels, create two marketplace files pointing to different `ref` or `sha` values. Each pinned ref
must declare a different `version` in `plugin.json` — if two refs have the same version, Claude Code treats them as
identical and skips the update.

## Private Repositories

Manual install/update uses existing git credential helpers (`gh auth`, macOS Keychain, etc.). For background
auto-updates, set authentication tokens in your environment:

- GitHub — `GITHUB_TOKEN` or `GH_TOKEN`
- GitLab — `GITLAB_TOKEN` or `GL_TOKEN`
- Bitbucket — `BITBUCKET_TOKEN`

## Validation

```bash
# Validate plugin structure and marketplace JSON
claude plugin validate .

# From within Claude Code
/plugin validate .
```

---

# Debugging

Run `claude --debug` (or `/debug` in TUI) to see plugin loading details: which plugins load, manifest errors,
command/agent/hook registration, MCP server initialization.

## Common Issues

- **Plugin not loading** — invalid `plugin.json`. Fix: validate with `claude plugin validate`
- **Commands not appearing** — wrong directory layout. Fix: ensure `commands/` at root
- **Hooks not firing** — script not executable. Fix: `chmod +x script.sh`
- **MCP server fails** — missing plugin root var. Fix: use `${CLAUDE_PLUGIN_ROOT}`
- **LSP executable not found** — binary not installed. Fix: install the language server binary
- **Plugin skills not showing** — stale cache. Fix: `rm -rf ~/.claude/plugins/cache`, reinstall

## Hook Troubleshooting

- Script must be executable: `chmod +x ./scripts/your-script.sh`
- Shebang line required: `#!/bin/bash` or `#!/usr/bin/env bash`
- Event names are case-sensitive: `PostToolUse` not `postToolUse`
- Matcher pattern must match tool name: `"matcher": "Write|Edit"`

## Common Error Messages

- **`Invalid JSON syntax: Unexpected token } at position 142`** — missing/extra comma or unquoted string in JSON
- **`name: Required`** — missing required field in manifest
- **`No commands found in plugin ... custom directory`** — path exists but contains no `.md` or `SKILL.md` files
- **`Plugin directory not found at path: ./plugins/my-plugin`** — wrong `source` path in marketplace entry
- **`conflicting manifests: both plugin.json and marketplace`** — remove component declarations from one source

## Version Management

Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward-compatible)
- **PATCH:** Bug fixes

```json
{
  "name": "my-plugin",
  "version": "2.1.0"
}
```

Document changes in `CHANGELOG.md`. Always bump version before distributing — if version doesn't change, existing users
won't receive updates due to caching.
