# MCP Reference

Model Context Protocol (MCP) connects Claude Code to external tools and services.

## Installing MCP Servers

### HTTP Server (Recommended)

```bash
claude mcp add --transport http <name> <url>

# Example
claude mcp add --transport http notion https://mcp.notion.com/mcp

# With authentication header
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

### SSE Server (Deprecated)

```bash
claude mcp add --transport sse <name> <url>
```

Prefer HTTP where available.

### Stdio Server (Local)

```bash
claude mcp add [options] <name> -- <command> [args...]

# Example
claude mcp add --transport stdio --env AIRTABLE_API_KEY=YOUR_KEY airtable \
  -- npx -y airtable-mcp-server
```

**Important:** All options (`--transport`, `--env`, `--scope`, `--header`) must come before the
server name. `--` separates server name from the command and its arguments.

**Windows:** Use `cmd /c` wrapper for `npx`:

```bash
claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package
```

Without it, Windows cannot execute `npx` directly ("Connection closed" errors).

## Managing Servers

```bash
# List all
claude mcp list

# Get details
claude mcp get github

# Remove
claude mcp remove github

# Check server status (within Claude Code)
/mcp
```

## Dynamic Tool Updates

Claude Code supports MCP `list_changed` notifications. When a server sends this notification,
Claude Code automatically refreshes available tools, prompts, and resources — no reconnection
needed.

## Installation Scopes

| Scope   | Storage                         | Use Case                            |
|---------|---------------------------------|-------------------------------------|
| local   | `~/.claude.json` (project path) | Personal, current project (default) |
| project | `.mcp.json` in project root     | Team, via version control           |
| user    | `~/.claude.json`                | Personal, all projects              |

```bash
claude mcp add --transport http stripe --scope user https://mcp.stripe.com
```

**Precedence:** local > project > user (higher scope overrides lower).

## Project-Scope Configuration

`.mcp.json` in project root (checked into version control):

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

Claude Code prompts for approval before using project-scoped servers. Reset approval choices:

```bash
claude mcp reset-project-choices
```

## Environment Variable Expansion

Supported in `.mcp.json` for `command`, `args`, `env`, `url`, and `headers`:

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
- `${VAR}` — expands to value
- `${VAR:-default}` — expands to value or default

Fails to parse if a required variable is unset and has no default.

## Authentication

### OAuth 2.0 (Dynamic Client Registration)

For servers that support automatic OAuth setup:

```bash
# Add server
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# Authenticate in Claude Code
/mcp
# Follow browser login flow
```

Tokens stored securely and refreshed automatically. Use "Clear authentication" in `/mcp` to
revoke access.

### Pre-Configured OAuth Credentials

For servers that don't support dynamic client registration (error: "Incompatible auth server:
does not support dynamic client registration"), register an OAuth app through the server's
developer portal first.

| Flag              | Purpose                                                   |
|-------------------|-----------------------------------------------------------|
| `--client-id`     | OAuth client ID from developer portal                     |
| `--client-secret` | Prompts for secret with masked input                      |
| `--callback-port` | Port for redirect URI (`http://localhost:PORT/callback`)  |

**Via `claude mcp add`:**

```bash
claude mcp add --transport http \
  --client-id your-client-id --client-secret --callback-port 8080 \
  my-server https://mcp.example.com/mcp
```

**Via `claude mcp add-json`:**

```bash
claude mcp add-json my-server \
  '{"type":"http","url":"https://mcp.example.com/mcp","oauth":{"clientId":"your-client-id","callbackPort":8080}}' \
  --client-secret
```

**Via environment variable (CI):**

```bash
MCP_CLIENT_SECRET=your-secret claude mcp add --transport http \
  --client-id your-client-id --client-secret --callback-port 8080 \
  my-server https://mcp.example.com/mcp
```

**Notes:**
- Client secret stored in system keychain (macOS) or credentials file, not in config
- For public OAuth clients with no secret, use `--client-id` alone without `--client-secret`
- OAuth flags only apply to HTTP and SSE transports; no effect on stdio
- Verify with `claude mcp get <name>`

## Add from JSON

```bash
claude mcp add-json <name> '<json>'

# HTTP server
claude mcp add-json weather-api \
  '{"type":"http","url":"https://api.weather.com/mcp","headers":{"Authorization":"Bearer token"}}'

# Stdio server
claude mcp add-json local-weather \
  '{"type":"stdio","command":"/path/to/weather-cli","args":["--api-key","abc123"],"env":{"CACHE_DIR":"/tmp"}}'

# HTTP server with OAuth
claude mcp add-json my-server \
  '{"type":"http","url":"https://mcp.example.com/mcp","oauth":{"clientId":"your-client-id","callbackPort":8080}}' \
  --client-secret
```

Supports `--scope user` for user-wide configuration.

## Import from Claude Desktop

```bash
claude mcp add-from-claude-desktop
```

- macOS and WSL only
- Interactive dialog to select which servers to import
- Supports `--scope user`
- Duplicate names get numerical suffix (e.g., `server_1`)

## Use MCP Servers from Claude.ai

When logged into Claude Code with a Claude.ai account, MCP servers configured in Claude.ai are
automatically available:

- Configure servers at `claude.ai/settings/connectors`
- On Team/Enterprise plans, only admins can add servers
- Complete authentication steps in Claude.ai first
- Servers appear in `/mcp` with Claude.ai indicators
- No additional setup needed in Claude Code

## Use Claude Code as MCP Server

```bash
claude mcp serve
```

Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "claude-code": {
      "type": "stdio",
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {}
    }
  }
}
```

If `claude` is not in PATH, use the full path (`which claude`). Exposes Claude Code tools
(View, Edit, LS, etc.) to the MCP client. The client is responsible for user confirmation on
tool calls.

## Plugin-Provided MCP Servers

Plugins can bundle MCP servers. Define in `.mcp.json` at plugin root:

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
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/api-server",
      "args": ["--port", "8080"]
    }
  }
}
```

| Feature               | Details                                                          |
|-----------------------|------------------------------------------------------------------|
| Automatic lifecycle   | Starts on plugin enable; requires Claude Code restart on changes |
| Environment variables | `${CLAUDE_PLUGIN_ROOT}` resolves to plugin directory             |
| User env access       | Same variables as manually configured servers                    |
| Transport types       | Supports stdio, SSE, and HTTP                                    |

Plugin servers appear in `/mcp` with indicators showing plugin origin. Managed through plugin
installation, not `/mcp` commands.

## MCP Resources

Reference resources with `@` in prompts:

```
> Can you analyze @github:issue://123?
> Compare @postgres:schema://users with @docs:file://database/user-model
```

Format: `@server:protocol://resource/path`. Resources are fetched and included as attachments.
Fuzzy-searchable in `@` autocomplete.

## MCP Prompts as Commands

MCP servers can expose prompts that become slash commands:

```
/mcp__github__list_prs
/mcp__github__pr_review 456
/mcp__jira__create_issue "Bug in login flow" high
```

- Discovered dynamically from connected servers
- Arguments parsed from prompt's defined parameters
- Results injected directly into conversation
- Server and prompt names normalized (spaces become underscores)

## MCP Tool Search

When MCP tool descriptions exceed 10% of the context window, Tool Search activates
automatically. Tools load on-demand instead of being preloaded. Requires Sonnet 4+ or Opus 4+
(Haiku not supported).

**Configure via `ENABLE_TOOL_SEARCH`:**

| Value      | Behavior                                     |
|------------|----------------------------------------------|
| `auto`     | Activate at 10% threshold (default)          |
| `auto:<N>` | Custom threshold (e.g., `auto:5` = 5%)       |
| `true`     | Always enabled                               |
| `false`    | Disabled, all tools loaded upfront           |

```bash
ENABLE_TOOL_SEARCH=auto:5 claude
```

Set in `settings.json` `env` field, or disable via `disallowedTools`:

```json
{
  "permissions": {
    "deny": ["MCPSearch"]
  }
}
```

**For MCP server authors:** Use the server instructions field to describe what category of tasks
your tools handle and when Claude should search for them. This is the primary signal Tool Search
uses to discover your server's tools.

## Environment Variables

| Variable                | Purpose                                        | Default  |
|-------------------------|------------------------------------------------|----------|
| `MCP_TIMEOUT`           | Server startup timeout in ms                   | (system) |
| `MAX_MCP_OUTPUT_TOKENS` | Maximum tokens for MCP tool output             | 25000    |
| `ENABLE_TOOL_SEARCH`    | Tool search behavior (see above)               | `auto`   |
| `MCP_CLIENT_SECRET`     | OAuth client secret for non-interactive setup  | —        |

Output warning threshold is 10,000 tokens; increase limit:

```bash
export MAX_MCP_OUTPUT_TOKENS=50000
claude
```

---

## Managed MCP Configuration

Two options for organizational control over MCP servers:

### Option 1: Exclusive Control (`managed-mcp.json`)

Deploy for complete control. Users cannot add, modify, or use any other servers.

| Platform    | Path                                                        |
|-------------|-------------------------------------------------------------|
| macOS       | `/Library/Application Support/ClaudeCode/managed-mcp.json` |
| Linux / WSL | `/etc/claude-code/managed-mcp.json`                         |
| Windows     | `C:\Program Files\ClaudeCode\managed-mcp.json`              |

System-wide paths requiring administrator privileges.

```json
{
  "mcpServers": {
    "github": { "type": "http", "url": "https://api.githubcopilot.com/mcp/" },
    "company-internal": {
      "type": "stdio",
      "command": "/usr/local/bin/company-mcp-server",
      "args": ["--config", "/etc/company/mcp-config.json"],
      "env": { "COMPANY_API_URL": "https://internal.company.com" }
    }
  }
}
```

### Option 2: Policy-Based Control (Allowlists / Denylists)

Use `allowedMcpServers` and `deniedMcpServers` in managed settings. Users can add their own
servers within policy constraints.

**Restriction types (each entry must have exactly one):**

| Type            | Matches                          | Example                                      |
|-----------------|----------------------------------|----------------------------------------------|
| `serverName`    | Configured server name           | `{"serverName": "github"}`                   |
| `serverCommand` | Exact command array (stdio only) | `{"serverCommand": ["npx", "-y", "pkg"]}`    |
| `serverUrl`     | URL pattern with `*` wildcards   | `{"serverUrl": "https://mcp.company.com/*"}` |

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

**URL wildcard patterns:**
- `https://mcp.company.com/*` — all paths on domain
- `https://*.example.com/*` — any subdomain
- `http://localhost:*/*` — any port on localhost

**Allowlist behavior:**

| Value       | Effect                                |
|-------------|---------------------------------------|
| `undefined` | No restrictions (default)             |
| `[]`        | Complete lockdown, no servers allowed |
| List        | Only matching servers allowed         |

**Denylist behavior:**

| Value       | Effect                              |
|-------------|-------------------------------------|
| `undefined` | No servers blocked (default)        |
| `[]`        | No servers blocked                  |
| List        | Matching servers explicitly blocked |

**Precedence rules:**
- Denylist takes absolute precedence over allowlist
- A server passes if it matches any name, command, or URL entry (unless denied)
- When `serverCommand` entries exist in allowlist, stdio servers must match a command —
  cannot pass by name alone
- When `serverUrl` entries exist in allowlist, remote servers must match a URL pattern —
  cannot pass by name alone
- Options 1 and 2 can combine: `managed-mcp.json` has exclusive user control, but
  allowlists/denylists still filter which managed servers actually load

---

## Troubleshooting

### Server Not Starting

1. Check command exists and is executable
2. Verify paths use `${CLAUDE_PLUGIN_ROOT}` for plugin servers
3. Run `claude --debug` to inspect logs
4. Test server process manually
5. Adjust startup timeout: `MCP_TIMEOUT=10000 claude`

### Authentication Failures

- For OAuth errors: run `/mcp` and use "Clear authentication", then re-authenticate
- For "does not support dynamic client registration": use pre-configured OAuth credentials
  with `--client-id` and `--client-secret`

### Tools Not Appearing

1. Verify server is configured: `claude mcp get <name>`
2. Check server implements MCP protocol correctly
3. Look for connection timeouts in `claude --debug` output
4. Check `/mcp` for server status

### Large Output Issues

If MCP tools produce excessive output, set `MAX_MCP_OUTPUT_TOKENS` or configure the server
to paginate or filter responses.
