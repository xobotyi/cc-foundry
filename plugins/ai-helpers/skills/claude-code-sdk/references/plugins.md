# Plugins Reference

> **Action Required:** When working on plugin components, invoke specialized skills:
> - Skills → `ai-helpers:skill-engineering`
> - Agents/subagents → `ai-helpers:subagent-engineering`
> - Output styles → `ai-helpers:output-style-engineering`

Plugins package and distribute Claude Code extensions: skills, agents, hooks, MCP servers,
LSP servers, output styles, and default settings.

## When to Use Plugins vs Standalone

| Approach                | Skill Names          | Best For                                            |
|-------------------------|----------------------|-----------------------------------------------------|
| Standalone (`.claude/`) | `/hello`             | Personal workflows, project-specific, experiments   |
| Plugins                 | `/plugin-name:hello` | Sharing with team, distributing, versioned releases |

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

**Critical:** Don't put `commands/`, `agents/`, `skills/`, or `hooks/` inside `.claude-plugin/`.
Only `plugin.json` goes there.

## Plugin Manifest (`plugin.json`)

Located at `.claude-plugin/plugin.json`. The manifest is **optional** — Claude Code
auto-discovers components in default locations and derives the plugin name from the directory
name. Use a manifest when you need metadata or custom component paths.

### Required Fields

| Field  | Type   | Description                               |
|--------|--------|-------------------------------------------|
| `name` | string | Unique identifier (kebab-case, no spaces) |

The `name` is used as the namespace for skills: a skill `hello` in plugin `my-plugin` invokes
as `/my-plugin:hello`. Also used in install commands: `plugin-name@marketplace-name`.

### Metadata Fields

| Field         | Type   | Description              | Example                        |
|---------------|--------|--------------------------|--------------------------------|
| `version`     | string | Semantic version         | `"2.1.0"`                      |
| `description` | string | Brief explanation        | `"Deployment tools"`           |
| `author`      | object | Author info              | `{"name": "Dev", "email": ""}` |
| `homepage`    | string | Documentation URL        | `"https://docs.example.com"`   |
| `repository`  | string | Source code URL          | `"https://github.com/..."`     |
| `license`     | string | License identifier       | `"MIT"`, `"Apache-2.0"`        |
| `keywords`    | array  | Discovery tags           | `["deployment", "ci-cd"]`      |

### Component Path Fields

| Field          | Type           | Description                                |
|----------------|----------------|--------------------------------------------|
| `commands`     | string\|array  | Additional command file/directory paths    |
| `agents`       | string\|array  | Additional agent file paths                |
| `skills`       | string\|array  | Additional skill directory paths           |
| `hooks`        | string\|object | Hook config path or inline config          |
| `mcpServers`   | string\|object | MCP config path or inline config           |
| `outputStyles` | string\|array  | Additional output style paths              |
| `lspServers`   | string\|object | LSP config path or inline config           |

All paths are relative to plugin root and must start with `./`. Custom paths **supplement**
default directories — they don't replace them.

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

`${CLAUDE_PLUGIN_ROOT}` — absolute path to the plugin directory. Use this in hooks,
MCP servers, and scripts to ensure correct paths regardless of installation location.

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

Plugins can ship a `settings.json` at the plugin root. Currently only the `agent` key is
supported. Setting `agent` activates one of the plugin's custom agents as the main thread
agent, applying its system prompt, tool restrictions, and model.

```json
{
  "agent": "security-reviewer"
}
```

`settings.json` takes priority over `settings` declared in `plugin.json`. Unknown keys are
silently ignored.

## Skill Arguments (`$ARGUMENTS`)

Skills support dynamic input via the `$ARGUMENTS` placeholder. Any text after the skill name
is injected into `$ARGUMENTS` in `SKILL.md`.

```markdown
---
description: Greet the user with a personalized message
---
Greet the user named "$ARGUMENTS" warmly.
```

Invocation: `/my-plugin:hello Alex` → `$ARGUMENTS` = `"Alex"`.

## Installation Scopes

| Scope     | Settings File                 | Use Case                         |
|-----------|-------------------------------|----------------------------------|
| `user`    | `~/.claude/settings.json`     | Personal, all projects (default) |
| `project` | `.claude/settings.json`       | Team, via version control        |
| `local`   | `.claude/settings.local.json` | Project-specific, gitignored     |
| `managed` | `managed-settings.json`       | Admin-controlled (read-only)     |

## Plugin Discovery UI (`/plugin`)

The `/plugin` command opens a tabbed interface:

| Tab              | Purpose                                              |
|------------------|------------------------------------------------------|
| **Discover**     | Browse available plugins from all marketplaces       |
| **Installed**    | View/manage installed plugins, grouped by scope      |
| **Marketplaces** | Add, remove, update marketplace sources              |
| **Errors**       | View plugin loading errors (e.g. missing LSP binary) |

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

Each `SKILL.md` needs frontmatter with at minimum `description`. Skills appear in `/help`
under the plugin namespace and Claude invokes them based on task context.

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

Markdown files in `output-styles/` directory at plugin root, or specified via `outputStyles`
in `plugin.json`.

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

| Event                | When It Fires                            |
|----------------------|------------------------------------------|
| `PreToolUse`         | Before Claude uses any tool              |
| `PostToolUse`        | After Claude successfully uses a tool    |
| `PostToolUseFailure` | After tool execution fails               |
| `PermissionRequest`  | When a permission dialog is shown        |
| `UserPromptSubmit`   | When user submits a prompt               |
| `Notification`       | When Claude Code sends notifications     |
| `Stop`               | When Claude attempts to stop             |
| `SubagentStart`      | When a subagent is started               |
| `SubagentStop`       | When a subagent attempts to stop         |
| `SessionStart`       | At the beginning of sessions             |
| `SessionEnd`         | At the end of sessions                   |
| `TeammateIdle`       | When a team teammate is about to go idle |
| `TaskCompleted`      | When a task is marked completed          |
| `ConfigChange`       | When a configuration file changes        |
| `PreCompact`         | Before conversation history is compacted |

**Hook types:** `command` (shell), `prompt` (LLM evaluation with `$ARGUMENTS`),
`agent` (agentic verifier with tools).

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

Plugin MCP servers start automatically when the plugin is enabled and appear as standard MCP
tools in Claude's toolkit.

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

Users must install the language server binary separately. LSP plugins configure the connection,
not the server itself.

**Required fields:** `command`, `extensionToLanguage`.

**Optional fields:**

| Field                   | Description                                       |
|-------------------------|---------------------------------------------------|
| `args`                  | Command-line arguments                            |
| `transport`             | `stdio` (default) or `socket`                     |
| `env`                   | Environment variables                             |
| `initializationOptions` | Options passed during initialization              |
| `settings`              | Passed via `workspace/didChangeConfiguration`     |
| `workspaceFolder`       | Workspace folder path                             |
| `startupTimeout`        | Max startup wait (ms)                             |
| `shutdownTimeout`       | Max shutdown wait (ms)                            |
| `restartOnCrash`        | Auto-restart on crash                             |
| `maxRestarts`           | Max restart attempts                              |

**Pre-built LSP plugins** (official marketplace, install language server binary first):

| Plugin              | Language   | Binary Required              |
|---------------------|------------|------------------------------|
| `clangd-lsp`        | C/C++      | `clangd`                     |
| `csharp-lsp`        | C#         | `csharp-ls`                  |
| `gopls-lsp`         | Go         | `gopls`                      |
| `jdtls-lsp`         | Java       | `jdtls`                      |
| `kotlin-lsp`        | Kotlin     | `kotlin-language-server`     |
| `lua-lsp`           | Lua        | `lua-language-server`        |
| `php-lsp`           | PHP        | `intelephense`               |
| `pyright-lsp`       | Python     | `pyright-langserver`         |
| `rust-analyzer-lsp` | Rust       | `rust-analyzer`              |
| `swift-lsp`         | Swift      | `sourcekit-lsp`              |
| `typescript-lsp`    | TypeScript | `typescript-language-server` |

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

The official Anthropic marketplace (`claude-plugins-official`) is available automatically.
All others must be added manually.

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

| Field     | Type   | Description                                                         |
|-----------|--------|---------------------------------------------------------------------|
| `name`    | string | Marketplace identifier (kebab-case). Used in install commands.      |
| `owner`   | object | Maintainer info: `name` (required), `email` (optional)             |
| `plugins` | array  | List of available plugins                                           |

Reserved names (cannot be used): `claude-code-marketplace`, `claude-code-plugins`,
`claude-plugins-official`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`,
`life-sciences`.

**Optional metadata:**

| Field                  | Type   | Description                                                         |
|------------------------|--------|---------------------------------------------------------------------|
| `metadata.description` | string | Brief marketplace description                                       |
| `metadata.version`     | string | Marketplace version                                                 |
| `metadata.pluginRoot`  | string | Base dir prepended to relative source paths (e.g. `"./plugins"`)   |

### Plugin Entry Fields

Each entry requires `name` and `source`, plus any fields from the plugin manifest schema:

| Field       | Type           | Description                                             |
|-------------|----------------|---------------------------------------------------------|
| `name`      | string         | Plugin identifier (required)                            |
| `source`    | string\|object | Where to fetch plugin (required)                        |
| `version`   | string         | Plugin version (see version resolution below)           |
| `strict`    | boolean        | Authority control (default: `true`)                     |
| `category`  | string         | Category for organization                               |
| `tags`      | array          | Tags for searchability                                  |
| `commands`  | string\|array  | Custom paths to command files or directories            |
| `agents`    | string\|array  | Custom paths to agent files                             |
| `hooks`     | string\|object | Custom hooks config or path                             |
| `mcpServers`| string\|object | MCP server configs or path                              |
| `lspServers`| string\|object | LSP server configs or path                              |

## Strict Mode

Controls whether `plugin.json` or the marketplace entry is the authority for component
definitions.

| Value            | Behavior                                                                    |
|------------------|-----------------------------------------------------------------------------|
| `true` (default) | `plugin.json` is authority; marketplace entry can supplement                |
| `false`          | Marketplace entry is the entire definition; `plugin.json` components conflict |

Use `strict: false` when the marketplace operator wants full control over which components are
exposed (e.g. curating a plugin's components differently than the plugin author intended).

## Version Resolution

Version can be set in `plugin.json` or in the marketplace entry. `plugin.json` always wins
silently when both are set.

- **Relative-path plugins:** set version in marketplace entry
- **All other sources:** set version in `plugin.json`

Avoid setting version in both places — the marketplace version will be silently ignored.

## Plugin Sources

| Source        | Type                            | Fields                                  |
|---------------|---------------------------------|-----------------------------------------|
| Relative path | `string` (e.g. `"./my-plugin"`)| —                                       |
| `github`      | object                          | `repo` (required), `ref?`, `sha?`       |
| `url`         | object                          | `url` (must end `.git`), `ref?`, `sha?` |
| `npm`         | object                          | `package`, `version?`, `registry?`      |
| `pip`         | object                          | `package`, `version?`, `registry?`      |

Relative paths only work with Git-based marketplaces (not URL-based). For URL-based
distribution, use `github`, `url`, or `npm` sources.

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

Official marketplaces: auto-update enabled by default. Third-party/local: disabled by default.
Toggle per-marketplace via `/plugin` → Marketplaces → select → Enable/Disable auto-update.

| Environment Variable            | Effect                                                          |
|---------------------------------|-----------------------------------------------------------------|
| `DISABLE_AUTOUPDATER`           | Disables all auto-updates (Claude Code + plugins)              |
| `FORCE_AUTOUPDATE_PLUGINS=true` | Keeps plugin auto-updates even when `DISABLE_AUTOUPDATER` is set |

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

Administrators restrict which marketplaces users can add via managed settings. Cannot be
overridden by user or project settings. Validated before any network requests.

| Value               | Behavior                                        |
|---------------------|-------------------------------------------------|
| Undefined (default) | No restrictions — users can add any marketplace |
| Empty array `[]`    | Complete lockdown — no new marketplaces allowed  |
| List of sources     | Allowlist — only matching marketplaces allowed   |

**Supported allowlist source types:**

| Source Type   | Required Fields       | Matching                               |
|---------------|-----------------------|----------------------------------------|
| `github`      | `repo`; opt `ref`, `path` | Exact match on all specified fields |
| `url`         | `url`                 | Full URL exact match                   |
| `hostPattern` | `hostPattern`         | Regex matched against marketplace host |

```json
{
  "strictKnownMarketplaces": [
    {"source": "github", "repo": "acme-corp/approved-plugins"},
    {"source": "hostPattern", "hostPattern": "^github\\.example\\.com$"}
  ]
}
```

## Release Channels

To run stable/latest channels, create two marketplace files pointing to different `ref` or
`sha` values. Each pinned ref must declare a different `version` in `plugin.json` — if two
refs have the same version, Claude Code treats them as identical and skips the update.

## Private Repositories

Manual install/update uses existing git credential helpers (`gh auth`, macOS Keychain, etc.).
For background auto-updates, set authentication tokens in your environment:

| Provider  | Environment Variable         |
|-----------|------------------------------|
| GitHub    | `GITHUB_TOKEN` or `GH_TOKEN` |
| GitLab    | `GITLAB_TOKEN` or `GL_TOKEN` |
| Bitbucket | `BITBUCKET_TOKEN`            |

## Validation

```bash
# Validate plugin structure and marketplace JSON
claude plugin validate .

# From within Claude Code
/plugin validate .
```

---

# Debugging

Run `claude --debug` (or `/debug` in TUI) to see plugin loading details: which plugins load,
manifest errors, command/agent/hook registration, MCP server initialization.

## Common Issues

| Issue                    | Cause                   | Solution                               |
|--------------------------|-------------------------|----------------------------------------|
| Plugin not loading       | Invalid `plugin.json`   | Validate with `claude plugin validate` |
| Commands not appearing   | Wrong directory layout  | Ensure `commands/` at root             |
| Hooks not firing         | Script not executable   | `chmod +x script.sh`                   |
| MCP server fails         | Missing plugin root var | Use `${CLAUDE_PLUGIN_ROOT}`            |
| LSP executable not found | Binary not installed    | Install the language server binary     |
| Plugin skills not showing| Stale cache             | `rm -rf ~/.claude/plugins/cache`, reinstall |

## Hook Troubleshooting

- Script must be executable: `chmod +x ./scripts/your-script.sh`
- Shebang line required: `#!/bin/bash` or `#!/usr/bin/env bash`
- Event names are case-sensitive: `PostToolUse` not `postToolUse`
- Matcher pattern must match tool name: `"matcher": "Write|Edit"`

## Common Error Messages

| Error                                                        | Cause / Fix                                         |
|--------------------------------------------------------------|-----------------------------------------------------|
| `Invalid JSON syntax: Unexpected token } at position 142`    | Missing/extra comma or unquoted string in JSON      |
| `name: Required`                                             | Missing required field in manifest                  |
| `No commands found in plugin ... custom directory`           | Path exists but contains no `.md` or `SKILL.md` files |
| `Plugin directory not found at path: ./plugins/my-plugin`    | Wrong `source` path in marketplace entry            |
| `conflicting manifests: both plugin.json and marketplace`    | Remove component declarations from one source       |

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

Document changes in `CHANGELOG.md`. Always bump version before distributing — if version
doesn't change, existing users won't receive updates due to caching.
