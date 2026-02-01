# Plugins Reference

> **Action Required:** When working on plugin components, invoke specialized skills:
> - Skills → `ai-helpers:skill-engineering`
> - Agents/subagents → `ai-helpers:subagent-engineering`
> - Output styles → `ai-helpers:output-style-engineering`

Plugins package and distribute Claude Code extensions: skills, agents, hooks,
MCP servers, and LSP servers.

## When to Use Plugins vs Standalone

| Approach                     | Skill Names          | Best For                                      |
|------------------------------|----------------------|-----------------------------------------------|
| Standalone (`.claude/`)      | `/hello`             | Personal workflows, project-specific, quick experiments |
| Plugins                      | `/plugin-name:hello` | Sharing with team, distributing, versioned releases |

## Plugin Structure

```
my-plugin/
├── .claude-plugin/           # Metadata directory
│   └── plugin.json          # Required: plugin manifest
├── commands/                 # Simple markdown commands
│   └── status.md
├── skills/                   # Skills with SKILL.md
│   └── code-reviewer/
│       └── SKILL.md
├── agents/                   # Custom subagents
│   └── security-reviewer.md
├── hooks/                    # Hook configurations
│   └── hooks.json
├── .mcp.json                # MCP server definitions
├── .lsp.json                # LSP server configurations
└── scripts/                 # Utility scripts
    └── format-code.sh
```

**Important:** Don't put `commands/`, `agents/`, `skills/`, or `hooks/` inside
`.claude-plugin/`. Only `plugin.json` goes there.

## Plugin Manifest Schema

### Required Fields

| Field  | Type   | Description                               |
|--------|--------|-------------------------------------------|
| `name` | string | Unique identifier (kebab-case, no spaces) |

### Metadata Fields

| Field         | Type   | Description              | Example                        |
|---------------|--------|--------------------------|--------------------------------|
| `version`     | string | Semantic version         | `"2.1.0"`                      |
| `description` | string | Brief explanation        | `"Deployment tools"`           |
| `author`      | object | Author info              | `{"name": "Dev", "email": ""}` |
| `homepage`    | string | Documentation URL        | `"https://docs.example.com"`   |
| `repository`  | string | Source code URL          | `"https://github.com/..."`     |
| `license`     | string | License identifier       | `"MIT"`                        |
| `keywords`    | array  | Discovery tags           | `["deployment", "ci-cd"]`      |

### Component Path Fields

| Field          | Type           | Description                    |
|----------------|----------------|--------------------------------|
| `commands`     | string\|array  | Additional command paths       |
| `agents`       | string\|array  | Additional agent paths         |
| `skills`       | string\|array  | Additional skill paths         |
| `hooks`        | string\|object | Hook config path or inline     |
| `mcpServers`   | string\|object | MCP config path or inline      |
| `outputStyles` | string\|array  | Additional output style paths  |
| `lspServers`   | string\|object | LSP config path or inline      |

All paths relative to plugin root, starting with `./`.

### Environment Variables

`${CLAUDE_PLUGIN_ROOT}`: Absolute path to plugin directory. Use in hooks,
MCP servers, and scripts.

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

## Installation Scopes

| Scope     | Settings File                 | Use Case                          |
|-----------|-------------------------------|-----------------------------------|
| `user`    | `~/.claude/settings.json`     | Personal, all projects (default)  |
| `project` | `.claude/settings.json`       | Team, via version control         |
| `local`   | `.claude/settings.local.json` | Project-specific, gitignored      |
| `managed` | `managed-settings.json`       | Admin-controlled (read-only)      |

## CLI Commands

```bash
# Install
claude plugin install <plugin>@<marketplace> [--scope user|project|local]

# Manage
claude plugin uninstall <plugin>
claude plugin enable <plugin>
claude plugin disable <plugin>
claude plugin update <plugin>

# Validate
claude plugin validate .
```

## Test Locally

```bash
# Load plugin during development
claude --plugin-dir ./my-plugin

# Multiple plugins
claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two
```

## Plugin Components

### Skills

```
skills/
├── pdf-processor/
│   ├── SKILL.md
│   ├── reference.md
│   └── scripts/
└── code-reviewer/
    └── SKILL.md
```

Each `SKILL.md` needs frontmatter with `name` and `description`.

### Agents

```markdown
---
description: What this agent specializes in
capabilities: ["task1", "task2"]
---

# Agent Name

Detailed description of role and expertise.
```

### Hooks

In `hooks/hooks.json`:

```json
{
  "description": "Automatic code formatting",
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

### MCP Servers

In `.mcp.json`:

```json
{
  "plugin-database": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "DB_PATH": "${CLAUDE_PLUGIN_ROOT}/data"
    }
  }
}
```

### LSP Servers

In `.lsp.json`:

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

Users must install language server binary separately.

## Plugin Caching

Claude Code copies plugins to cache directory for security. Implications:

- Paths referencing files outside plugin directory won't work
- Use symlinks for external dependencies (honored during copy)
- Or restructure marketplace to include all needed files

---

# Marketplaces

Marketplaces are catalogs for distributing plugins.

## Marketplace File

Create `.claude-plugin/marketplace.json`:

```json
{
  "name": "company-tools",
  "owner": {
    "name": "DevTools Team",
    "email": "devtools@example.com"
  },
  "plugins": [
    {
      "name": "code-formatter",
      "source": "./plugins/formatter",
      "description": "Automatic code formatting"
    }
  ]
}
```

### Required Fields

| Field     | Type   | Description                  |
|-----------|--------|------------------------------|
| `name`    | string | Marketplace identifier       |
| `owner`   | object | Maintainer info (name required) |
| `plugins` | array  | List of available plugins    |

### Plugin Entry Fields

| Field       | Type           | Description                              |
|-------------|----------------|------------------------------------------|
| `name`      | string         | Plugin identifier (required)             |
| `source`    | string\|object | Where to fetch plugin (required)         |
| `strict`    | boolean        | If false, plugin doesn't need plugin.json |

## Plugin Sources

### Relative Path

```json
{"name": "my-plugin", "source": "./plugins/my-plugin"}
```

Only works with Git-based marketplaces.

### GitHub

```json
{
  "name": "github-plugin",
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo",
    "ref": "v2.0.0",
    "sha": "a1b2c3d4..."
  }
}
```

### Git URL

```json
{
  "name": "git-plugin",
  "source": {
    "source": "url",
    "url": "https://gitlab.com/team/plugin.git"
  }
}
```

## Add Marketplaces

```bash
# GitHub
/plugin marketplace add owner/repo

# Git URL
/plugin marketplace add https://gitlab.com/company/plugins.git

# Local
/plugin marketplace add ./my-marketplace

# Remote URL
/plugin marketplace add https://example.com/marketplace.json
```

## Install Plugins

```bash
/plugin install plugin-name@marketplace-name
```

## Manage Marketplaces

```bash
/plugin marketplace list
/plugin marketplace update marketplace-name
/plugin marketplace remove marketplace-name
```

## Team Configuration

In `.claude/settings.json`:

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

## Managed Restrictions

Administrators can restrict marketplaces with `strictKnownMarketplaces`:

```json
{
  "strictKnownMarketplaces": [
    {"source": "github", "repo": "acme-corp/approved-plugins"}
  ]
}
```

- Undefined: no restrictions
- Empty array `[]`: complete lockdown
- List of sources: only matching marketplaces allowed

## Private Repositories

Set authentication token in environment for auto-updates:

| Provider   | Environment Variable           |
|------------|--------------------------------|
| GitHub     | `GITHUB_TOKEN` or `GH_TOKEN`   |
| GitLab     | `GITLAB_TOKEN` or `GL_TOKEN`   |
| Bitbucket  | `BITBUCKET_TOKEN`              |

---

# Debugging

Run `claude --debug` to see plugin loading details.

## Common Issues

| Issue                    | Cause                   | Solution                              |
|--------------------------|-------------------------|---------------------------------------|
| Plugin not loading       | Invalid plugin.json     | Validate with `claude plugin validate`|
| Commands not appearing   | Wrong directory layout  | Ensure `commands/` at root            |
| Hooks not firing         | Script not executable   | `chmod +x script.sh`                  |
| MCP server fails         | Missing plugin root var | Use `${CLAUDE_PLUGIN_ROOT}`           |
| LSP executable not found | Binary not installed    | Install language server               |

## Version Management

Use semantic versioning: `MAJOR.MINOR.PATCH`

- MAJOR: Breaking changes
- MINOR: New features (backward-compatible)
- PATCH: Bug fixes

```json
{
  "name": "my-plugin",
  "version": "2.1.0"
}
```

Document changes in `CHANGELOG.md`.
