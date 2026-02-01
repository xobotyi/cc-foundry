# MCP Reference

Model Context Protocol (MCP) connects Claude Code to external tools and services.

## What You Can Do

- Implement features from issue trackers
- Analyze monitoring data
- Query databases
- Integrate designs
- Automate workflows

## Installing MCP Servers

### HTTP Server (Recommended)

```bash
claude mcp add --transport http <name> <url>

# Example
claude mcp add --transport http notion https://mcp.notion.com/mcp

# With authentication
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

### SSE Server (Deprecated)

```bash
claude mcp add --transport sse <name> <url>

# Example
claude mcp add --transport sse asana https://mcp.asana.com/sse
```

### Stdio Server (Local)

```bash
claude mcp add [options] <name> -- <command> [args...]

# Example
claude mcp add --transport stdio --env AIRTABLE_API_KEY=YOUR_KEY airtable \
  -- npx -y airtable-mcp-server
```

**Important:** Options must come before server name. `--` separates name from
command.

### Windows Note

Use `cmd /c` wrapper:

```bash
claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package
```

## Managing Servers

```bash
# List all
claude mcp list

# Get details
claude mcp get github

# Remove
claude mcp remove github

# In Claude Code
/mcp
```

## Installation Scopes

| Scope   | Storage                  | Use Case                           |
|---------|--------------------------|-------------------------------------|
| local   | `~/.claude.json` (project path) | Personal, current project (default) |
| project | `.mcp.json` in project   | Team, via version control           |
| user    | `~/.claude.json`         | Personal, all projects              |

```bash
claude mcp add --transport http stripe --scope user https://mcp.stripe.com
```

## Project-Scope Configuration

`.mcp.json` in project root:

```json
{
  "mcpServers": {
    "shared-server": {
      "command": "/path/to/server",
      "args": [],
      "env": {}
    }
  }
}
```

Claude Code prompts for approval before using project-scoped servers.

Reset approval choices:

```bash
claude mcp reset-project-choices
```

## Environment Variable Expansion

In `.mcp.json`:

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

**Syntax:**

- `${VAR}` - expands to value
- `${VAR:-default}` - expands to value or default

**Locations:** `command`, `args`, `env`, `url`, `headers`

## Authentication

For OAuth 2.0 servers:

```bash
# Add server
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# Authenticate in Claude Code
/mcp
# Follow browser steps
```

Tokens stored securely and refreshed automatically.

## Add from JSON

```bash
claude mcp add-json weather-api '{"type":"http","url":"https://api.weather.com/mcp"}'
```

## Import from Claude Desktop

```bash
claude mcp add-from-claude-desktop
```

Works on macOS and WSL.

## Use Claude Code as MCP Server

```bash
claude mcp serve
```

Claude Desktop configuration:

```json
{
  "mcpServers": {
    "claude-code": {
      "type": "stdio",
      "command": "claude",
      "args": ["mcp", "serve"]
    }
  }
}
```

## Plugin-Provided MCP Servers

Plugins can bundle MCP servers in `.mcp.json`:

```json
{
  "database-tools": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "DB_URL": "${DB_URL}"
    }
  }
}
```

Or inline in `plugin.json`:

```json
{
  "name": "my-plugin",
  "mcpServers": {
    "plugin-api": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/api-server"
    }
  }
}
```

**Features:**

- Automatic lifecycle with plugin
- `${CLAUDE_PLUGIN_ROOT}` for paths
- Supports stdio, SSE, HTTP transports

## MCP Output Limits

- Warning at 10,000 tokens
- Default maximum: 25,000 tokens

Increase limit:

```bash
export MAX_MCP_OUTPUT_TOKENS=50000
claude
```

## MCP Resources

Reference with `@`:

```
> Can you analyze @github:issue://123?
> Compare @postgres:schema://users with @docs:file://database/user-model
```

Resources fetched and included as attachments.

## MCP Tool Search

Automatically enabled when MCP tool descriptions exceed 10% of context.
Tools loaded on-demand instead of preloaded.

**Configure:**

| Value      | Behavior                                |
|------------|-----------------------------------------|
| `auto`     | Activate at 10% threshold (default)     |
| `auto:<N>` | Custom threshold (e.g., `auto:5` = 5%)  |
| `true`     | Always enabled                          |
| `false`    | Disabled, all tools loaded upfront      |

```bash
ENABLE_TOOL_SEARCH=auto:5 claude
```

## MCP Prompts as Commands

```
/mcp__github__list_prs
/mcp__github__pr_review 456
```

---

## Managed MCP Configuration

### Option 1: Exclusive Control

Deploy `managed-mcp.json` for complete control:

**Locations:**

- macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`
- Linux: `/etc/claude-code/managed-mcp.json`
- Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

Users cannot add or modify servers.

### Option 2: Policy-Based Control

Use allowlists/denylists in managed settings:

```json
{
  "allowedMcpServers": [
    {"serverName": "github"},
    {"serverCommand": ["npx", "-y", "@modelcontextprotocol/server-filesystem"]},
    {"serverUrl": "https://mcp.company.com/*"}
  ],
  "deniedMcpServers": [
    {"serverName": "dangerous-server"},
    {"serverUrl": "https://*.untrusted.com/*"}
  ]
}
```

**Restriction types:**

- `serverName`: Match configured name
- `serverCommand`: Exact command array match
- `serverUrl`: URL pattern with wildcards

**Allowlist behavior:**

- Undefined: no restrictions
- Empty `[]`: complete lockdown
- List: only matching servers allowed

**Denylist takes precedence.** Blocked servers never allowed.

---

## Troubleshooting

### Server Not Starting

1. Check command exists and is executable
2. Verify paths use `${CLAUDE_PLUGIN_ROOT}` for plugins
3. Check logs: `claude --debug`
4. Test server manually

### Tools Not Appearing

1. Verify server configured correctly
2. Check server implements MCP protocol
3. Look for connection timeouts in debug output

### High Memory Usage

Language servers like `rust-analyzer` can consume significant memory.
Disable with `/plugin disable <plugin-name>` if issues occur.
