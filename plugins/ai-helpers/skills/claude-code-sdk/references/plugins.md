# Plugins Reference

A **plugin** is a self-contained directory that extends Claude Code with skills, agents, hooks, MCP servers, and LSP
servers. Plugins namespace their components (e.g., `/my-plugin:hello`) to prevent conflicts.

## Standalone vs Plugin

- **Standalone** (`.claude/` directory) — skill names like `/hello`, best for personal/project-specific workflows, quick
  experiments
- **Plugins** (directories with `.claude-plugin/plugin.json`) — namespaced skills like `/plugin-name:hello`, best for
  sharing, distribution, versioned releases, reuse across projects

## Plugin Directory Structure

```
my-plugin/
├── .claude-plugin/        # Only plugin.json goes here
│   └── plugin.json
├── commands/              # Skill markdown files (legacy; use skills/ for new)
├── skills/                # Skills with <name>/SKILL.md structure
├── agents/                # Subagent markdown files
├── hooks/                 # Hook configurations
│   └── hooks.json
├── scripts/               # Hook and utility scripts
├── settings.json          # Default settings (only "agent" key supported)
├── .mcp.json              # MCP server definitions
├── .lsp.json              # LSP server configurations
└── LICENSE
```

**Critical:** Never put `commands/`, `agents/`, `skills/`, or `hooks/` inside `.claude-plugin/`. Only `plugin.json`
belongs there.

## Plugin Manifest Schema (`.claude-plugin/plugin.json`)

The manifest is optional. If omitted, Claude Code auto-discovers components in default locations and derives the plugin
name from the directory name.

### Required Fields

- `name` (string) — unique identifier, kebab-case, no spaces. Used as skill namespace prefix.

### Metadata Fields

- `version` (string) — semver string; `plugin.json` version takes priority over marketplace entry
- `description` (string) — brief explanation of purpose
- `author` (object) — `{ "name": "...", "email": "...", "url": "..." }`
- `homepage` (string) — documentation URL
- `repository` (string) — source code URL
- `license` (string) — SPDX identifier (e.g., `"MIT"`, `"Apache-2.0"`)
- `keywords` (array) — discovery tags

### Component Path Fields

- `commands` (string|array) — additional command files/directories
- `agents` (string|array) — additional agent files
- `skills` (string|array) — additional skill directories
- `hooks` (string|array|object) — hook config paths or inline config
- `mcpServers` (string|array|object) — MCP config paths or inline config
- `outputStyles` (string|array) — additional output style files/directories
- `lspServers` (string|array|object) — LSP config paths or inline config

### Path Behavior

- Custom paths **supplement** default directories — they do not replace them
- All paths must be relative to plugin root and start with `./`
- Multiple paths can be specified as arrays

## Environment Variables

Both are substituted inline in skill content, agent content, hook commands, MCP/LSP configs. Both are also exported as
env vars to hook processes and MCP/LSP subprocesses.

- `${CLAUDE_PLUGIN_ROOT}` — absolute path to plugin's installation directory. Changes on update; files written here do
  not survive updates.
- `${CLAUDE_PLUGIN_DATA}` — persistent directory for plugin state that survives updates. Auto-created on first
  reference. Resolves to `~/.claude/plugins/data/{id}/` where `{id}` has non-alphanumeric/non-dash/non-underscore chars
  replaced by `-`.

### Persistent Data Pattern

Compare bundled manifest against a copy in the data directory; reinstall when they differ:

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

The data directory is deleted on uninstall from the last scope unless `--keep-data` is passed.

## Plugin Components

### Skills

- **Location:** `skills/` (directories with `SKILL.md`) or `commands/` (simple markdown files)
- **Naming:** folder name becomes skill name, prefixed with plugin namespace
- **`$ARGUMENTS`** placeholder captures user input after the skill name
- Skills are auto-discovered on install; Claude can invoke them based on task context

### Agents

- **Location:** `agents/` directory
- **Format:** markdown files with YAML frontmatter (`name`, `description`) and system prompt body
- Appear in `/agents` interface; Claude can invoke automatically based on context

### Hooks

- **Location:** `hooks/hooks.json` or inline in `plugin.json`
- **Hook types:** `command` (shell), `http` (POST), `prompt` (LLM eval with `$ARGUMENTS`), `agent` (agentic verifier)

**Lifecycle events:**

- `SessionStart` — session begins/resumes
- `UserPromptSubmit` — prompt submitted, before processing
- `PreToolUse` — before tool call (can block)
- `PermissionRequest` — permission dialog appears
- `PostToolUse` — after tool call succeeds
- `PostToolUseFailure` — after tool call fails
- `Notification` — notification sent
- `SubagentStart` / `SubagentStop` — subagent lifecycle
- `Stop` — Claude finishes responding
- `StopFailure` — turn ends due to API error (output/exit code ignored)
- `TeammateIdle` — agent team teammate about to idle
- `TaskCompleted` — task marked completed
- `InstructionsLoaded` — CLAUDE.md or `.claude/rules/*.md` loaded
- `ConfigChange` — config file changes during session
- `WorktreeCreate` / `WorktreeRemove` — worktree lifecycle
- `PreCompact` / `PostCompact` — context compaction
- `Elicitation` / `ElicitationResult` — MCP user input requests
- `SessionEnd` — session terminates

### MCP Servers

- **Location:** `.mcp.json` or inline in `plugin.json`
- Start automatically when plugin is enabled
- Use `${CLAUDE_PLUGIN_ROOT}` for all bundled paths

### LSP Servers

- **Location:** `.lsp.json` or inline in `plugin.json`
- Provides real-time diagnostics, code navigation, type info

**Required fields:**

- `command` — LSP binary to execute (must be in PATH)
- `extensionToLanguage` — maps file extensions to language identifiers

**Optional fields:**

- `args` — command-line arguments
- `transport` — `stdio` (default) or `socket`
- `env` — environment variables
- `initializationOptions` — server init options
- `settings` — passed via `workspace/didChangeConfiguration`
- `workspaceFolder` — workspace folder path
- `startupTimeout` / `shutdownTimeout` — milliseconds
- `restartOnCrash` — auto-restart on crash
- `maxRestarts` — max restart attempts

**Official LSP plugins (from official marketplace):**

- `clangd-lsp` — C/C++ (`clangd`)
- `csharp-lsp` — C# (`csharp-ls`)
- `gopls-lsp` — Go (`gopls`)
- `jdtls-lsp` — Java (`jdtls`)
- `kotlin-lsp` — Kotlin (`kotlin-language-server`)
- `lua-lsp` — Lua (`lua-language-server`)
- `php-lsp` — PHP (`intelephense`)
- `pyright-lsp` — Python (`pyright-langserver`)
- `rust-analyzer-lsp` — Rust (`rust-analyzer`)
- `swift-lsp` — Swift (`sourcekit-lsp`)
- `typescript-lsp` — TypeScript (`typescript-language-server`)

Install the language server binary first, then the plugin.

### Default Settings (`settings.json`)

- Only `agent` key supported
- Sets a plugin agent as the main thread agent, applying its system prompt, tool restrictions, and model
- `settings.json` takes priority over `settings` in `plugin.json`

## Installation Scopes

- `user` — `~/.claude/settings.json` — personal, all projects (default)
- `project` — `.claude/settings.json` — team, shared via version control
- `local` — `.claude/settings.local.json` — project-specific, gitignored
- `managed` — managed settings — read-only, update only

## CLI Commands

### `claude plugin install <plugin> [options]`

- `-s, --scope <scope>` — `user` (default), `project`, or `local`
- Plugin format: `plugin-name` or `plugin-name@marketplace-name`

### `claude plugin uninstall <plugin> [options]`

- `-s, --scope <scope>` — `user` (default), `project`, or `local`
- `--keep-data` — preserve persistent data directory
- **Aliases:** `remove`, `rm`

### `claude plugin enable <plugin> [options]`

- `-s, --scope <scope>` — `user` (default), `project`, or `local`

### `claude plugin disable <plugin> [options]`

- `-s, --scope <scope>` — `user` (default), `project`, or `local`

### `claude plugin update <plugin> [options]`

- `-s, --scope <scope>` — `user` (default), `project`, `local`, or `managed`

### `claude plugin validate <path>`

Checks `plugin.json`, skill/agent/command frontmatter, and `hooks/hooks.json` for syntax and schema errors.

## Plugin Caching and File Resolution

Marketplace plugins are copied to `~/.claude/plugins/cache` (not used in-place). Consequences:

- Plugins cannot reference files outside their directory (paths like `../shared-utils` fail)
- Symlinks within the plugin directory are followed during copy
- `--plugin-dir` plugins are used in-place (no caching)

## Testing and Development

- `claude --plugin-dir ./my-plugin` — load plugin without installation
- `--plugin-dir` overrides same-name installed plugins (except managed force-enabled)
- Multiple: `claude --plugin-dir ./one --plugin-dir ./two`
- `/reload-plugins` — reload all plugins, skills, agents, hooks, MCP/LSP servers without restart
- `claude --debug` (or `/debug` in TUI) — shows plugin loading details, errors, registration info

## Official Anthropic Marketplace

- Name: `claude-plugins-official`
- Automatically available on startup
- Browse: `/plugin` → Discover tab
- Install: `/plugin install <name>@claude-plugins-official`
- Submit plugins: `claude.ai/settings/plugins/submit` or `platform.claude.com/plugins/submit`

### Official Plugin Categories

- **Code intelligence** — LSP plugins (see LSP section above)
- **External integrations** — `github`, `gitlab`, `atlassian`, `asana`, `linear`, `notion`, `figma`, `vercel`,
  `firebase`, `supabase`, `slack`, `sentry`
- **Development workflows** — `commit-commands`, `pr-review-toolkit`, `agent-sdk-dev`, `plugin-dev`
- **Output styles** — `explanatory-output-style`, `learning-output-style`

### Demo Marketplace

- Repo: `anthropics/claude-code` (name: `claude-code-plugins`)
- Add: `/plugin marketplace add anthropics/claude-code`

## Marketplace Schema (`.claude-plugin/marketplace.json`)

### Required Fields

- `name` (string) — marketplace identifier, kebab-case. Users see it in install commands.
- `owner` (object) — `{ "name": "..." }` (required), `email` (optional)
- `plugins` (array) — list of plugin entries

### Optional Metadata

- `metadata.description` — brief marketplace description
- `metadata.version` — marketplace version
- `metadata.pluginRoot` — base directory prepended to relative plugin source paths

### Reserved Marketplace Names

`claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `anthropic-marketplace`,
`anthropic-plugins`, `agent-skills`, `knowledge-work-plugins`, `life-sciences`. Names impersonating official
marketplaces are also blocked.

### Plugin Entry Fields

Each entry supports all `plugin.json` manifest fields plus marketplace-specific fields:

- `name` (string, required) — plugin identifier, kebab-case
- `source` (string|object, required) — where to fetch the plugin
- `category` (string) — organization category
- `tags` (array) — searchability tags
- `strict` (boolean, default `true`) — controls authority for component definitions

### Strict Mode

- `true` (default) — `plugin.json` is authority; marketplace entry supplements/merges
- `false` — marketplace entry is entire definition; `plugin.json` component declarations cause conflict/load failure

## Plugin Sources

### Relative Path

`"source": "./plugins/my-plugin"` — local directory within marketplace repo. Must start with `./`. Resolves relative to
marketplace root (directory containing `.claude-plugin/`). Only works with Git-based marketplaces, not URL-based.

### GitHub

```json
{
  "source": "github",
  "repo": "owner/repo",
  "ref": "v2.0.0",
  "sha": "a1b2c3d..."
}
```

- `repo` (required) — `owner/repo` format
- `ref` (optional) — branch or tag
- `sha` (optional) — full 40-char commit SHA

### Git URL

```json
{
  "source": "url",
  "url": "https://gitlab.com/team/plugin.git",
  "ref": "main",
  "sha": "a1b2c3d..."
}
```

- `url` (required) — full git URL (HTTPS or SSH); `.git` suffix optional
- `ref` / `sha` — optional pinning

### Git Subdirectory

```json
{
  "source": "git-subdir",
  "url": "https://github.com/org/monorepo.git",
  "path": "tools/claude-plugin",
  "ref": "v2.0.0",
  "sha": "a1b2c3d..."
}
```

- Uses sparse partial clone for bandwidth efficiency in monorepos
- `url` also accepts `owner/repo` shorthand or SSH URLs
- `path` (required) — subdirectory containing the plugin

### npm

```json
{
  "source": "npm",
  "package": "@acme/claude-plugin",
  "version": "^2.0.0",
  "registry": "https://npm.example.com"
}
```

- `package` (required) — name or scoped package
- `version` (optional) — version or range
- `registry` (optional) — custom registry URL

## Adding Marketplaces

```
/plugin marketplace add owner/repo              # GitHub
/plugin marketplace add https://gitlab.com/...   # Git URL (HTTPS)
/plugin marketplace add git@gitlab.com:...       # Git URL (SSH)
/plugin marketplace add ./my-marketplace         # Local path
/plugin marketplace add https://example.com/marketplace.json  # Remote URL
```

Append `#ref` to Git URLs for specific branch/tag.

**Shortcuts:** `/plugin market` for `/plugin marketplace`, `rm` for `remove`.

### Marketplace Management Commands

- `/plugin marketplace list` — list configured marketplaces
- `/plugin marketplace update <name>` — refresh plugin listings
- `/plugin marketplace remove <name>` — remove marketplace (uninstalls its plugins)

### Auto-Updates

- Official marketplaces: auto-update enabled by default
- Third-party/local: disabled by default
- Toggle per-marketplace via `/plugin` → Marketplaces → select → Enable/Disable auto-update
- `DISABLE_AUTOUPDATER=true` — disables all auto-updates (Claude Code + plugins)
- `FORCE_AUTOUPDATE_PLUGINS=true` + `DISABLE_AUTOUPDATER=true` — manual CC updates, auto plugin updates

### Team Marketplace Configuration

Add to `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "formatter@team-tools": true
  }
}
```

### Private Repository Authentication

Manual install/update uses existing git credential helpers (`gh auth login`, macOS Keychain, etc.).

Background auto-updates require env vars:

- GitHub: `GITHUB_TOKEN` or `GH_TOKEN`
- GitLab: `GITLAB_TOKEN` or `GL_TOKEN`
- Bitbucket: `BITBUCKET_TOKEN`

### Container Pre-Population

Set `CLAUDE_CODE_PLUGIN_SEED_DIR` to a directory mirroring `~/.claude/plugins` structure:

```
$CLAUDE_CODE_PLUGIN_SEED_DIR/
  known_marketplaces.json
  marketplaces/<name>/...
  cache/<marketplace>/<plugin>/<version>/...
```

- Read-only; auto-updates disabled for seed marketplaces
- Seed entries take precedence over user config on each startup
- Path resolution is runtime-based (works when mounted at different paths)
- Composes with `extraKnownMarketplaces` and `enabledPlugins`
- Layer multiple seed dirs with `:` (Unix) or `;` (Windows)

### Managed Marketplace Restrictions (`strictKnownMarketplaces`)

Set in managed settings to control which marketplaces users can add:

- Undefined — no restrictions (default)
- `[]` — complete lockdown
- List of source objects — allowlist with exact matching

Source types for allowlist entries:

- `{ "source": "github", "repo": "..." }` — optional `ref`, `path` for stricter matching
- `{ "source": "url", "url": "..." }` — exact URL match
- `{ "source": "hostPattern", "hostPattern": "^github\\.example\\.com$" }` — regex on host
- `{ "source": "pathPattern", "pathPattern": "^/opt/approved/" }` — regex on filesystem path

Restrictions are validated before any network/filesystem operations. Cannot be overridden by user/project settings.

## Version Management

- Format: `MAJOR.MINOR.PATCH` (semver)
- Start at `1.0.0`; pre-release: `2.0.0-beta.1`
- Claude Code uses version to detect updates — bumping version is required for users to see changes
- Version can be set in `plugin.json` or `marketplace.json`; `plugin.json` always wins
- For relative-path plugins, set version in marketplace entry
- For external-source plugins, set version in `plugin.json`

### Release Channels

Create two marketplaces pointing to different refs/SHAs of the same repo, assign to user groups via managed settings.
The plugin's `plugin.json` must declare different versions at each ref.

## Debugging Checklist

- `claude --debug` / `/debug` — plugin loading details
- `claude plugin validate <path>` / `/plugin validate <path>` — syntax and schema validation
- `/plugin` → Errors tab — view loading errors
- Components at root level, not inside `.claude-plugin/`
- Hook scripts executable (`chmod +x`)
- Hook event names are case-sensitive (`PostToolUse`, not `postToolUse`)
- All plugin paths use `${CLAUDE_PLUGIN_ROOT}`
- Paths are relative, starting with `./`
- `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` — increase git timeout (default 120s)
