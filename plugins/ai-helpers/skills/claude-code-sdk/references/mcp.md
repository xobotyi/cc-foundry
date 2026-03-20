# MCP (Model Context Protocol)

Claude Code connects to external tools and data sources through MCP, an open standard for AI-tool integrations.

A dynamic registry of available MCP servers is maintained at https://api.anthropic.com/mcp-registry/docs

## Capabilities

With MCP servers connected, Claude Code can:

- Implement features from issue trackers
- Analyze monitoring data
- Query databases
- Integrate designs from Figma
- Automate workflows (e.g., Gmail drafts, Slack)
- React to external events via channels (Telegram, Discord, webhooks)

## Installing MCP Servers

### Transport Types

- **HTTP** (recommended for remote): `claude mcp add --transport http <name> <url>`
- **SSE** (deprecated, use HTTP): `claude mcp add --transport sse <name> <url>`
- **stdio** (local processes): `claude mcp add [options] <name> -- <command> [args...]`

Option ordering: all options (`--transport`, `--env`, `--scope`, `--header`) must come **before** the server name. The
`--` separates the server name from the command/args passed to the MCP server.

### Examples

```bash
# HTTP server
claude mcp add --transport http notion https://mcp.notion.com/mcp

# HTTP with auth header
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"

# stdio server with env var
claude mcp add --transport stdio --env AIRTABLE_API_KEY=YOUR_KEY airtable \
  -- npx -y airtable-mcp-server
```

Windows note: local MCP servers using `npx` require `cmd /c` wrapper:
`claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package`

### Management Commands

```bash
claude mcp list              # List all servers
claude mcp get <name>        # Get server details
claude mcp remove <name>     # Remove a server
/mcp                         # Check status within Claude Code
```

### Dynamic Tool Updates

Claude Code supports MCP `list_changed` notifications -- servers can dynamically update available tools without
reconnection.

### Push Messages with Channels

MCP servers can push messages into sessions via the `claude/channel` capability. Enable with `--channels` at startup.

## MCP Installation Scopes

- **Local** (default) -- stored in `~/.claude.json` under project path; private to you, current project only
- **Project** -- stored in `.mcp.json` at project root; checked into version control for team sharing
- **User** -- stored in `~/.claude.json`; available across all projects

```bash
claude mcp add --scope local <name> ...    # Default
claude mcp add --scope project <name> ...  # Team-shared
claude mcp add --scope user <name> ...     # Cross-project
```

Precedence: local > project > user

### `.mcp.json` Format

```json
{
  "mcpServers": {
    "server-name": {
      "command": "/path/to/server",
      "args": [],
      "env": {}
    }
  }
}
```

### Environment Variable Expansion in `.mcp.json`

- `${VAR}` -- expands to env var value
- `${VAR:-default}` -- expands with fallback

Supported in: `command`, `args`, `env`, `url`, `headers`

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

## Plugin-Provided MCP Servers

Plugins can bundle MCP servers in `.mcp.json` at plugin root or inline in `plugin.json`.

- Servers connect automatically when plugin is enabled
- Use `${CLAUDE_PLUGIN_ROOT}` for bundled files, `${CLAUDE_PLUGIN_DATA}` for persistent state
- Run `/reload-plugins` to connect/disconnect after enabling/disabling plugins mid-session
- Support stdio, SSE, and HTTP transports

```json
{
  "database-tools": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": { "DB_URL": "${DB_URL}" }
  }
}
```

## OAuth Authentication

Many remote MCP servers require OAuth 2.0 authentication:

1. Add the server: `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`
2. Run `/mcp` within Claude Code and follow the browser login flow

Key options:

- `--callback-port <PORT>` -- fix the OAuth callback port (for pre-registered redirect URIs)
- `--client-id <ID>` -- provide pre-configured OAuth client ID
- `--client-secret` -- prompt for client secret (masked input)
- `MCP_CLIENT_SECRET` env var -- provide secret non-interactively

Override OAuth metadata discovery with `authServerMetadataUrl` in the `oauth` object:

```json
{
  "mcpServers": {
    "my-server": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "oauth": {
        "authServerMetadataUrl": "https://auth.example.com/.well-known/openid-configuration"
      }
    }
  }
}
```

## Add from JSON / Import

```bash
# Add from JSON config
claude mcp add-json <name> '<json>'

# Import from Claude Desktop (macOS/WSL only)
claude mcp add-from-claude-desktop
```

## Claude.ai MCP Servers

MCP servers configured in Claude.ai are automatically available in Claude Code when logged in with a Claude.ai account.
Disable with `ENABLE_CLAUDEAI_MCP_SERVERS=false`.

## Claude Code as MCP Server

```bash
claude mcp serve   # Start Claude as a stdio MCP server
```

## MCP Resources

Reference MCP resources with `@server:protocol://resource/path` in prompts. Resources appear in `@` autocomplete
alongside files.

## MCP Prompts as Commands

MCP server prompts become available as `/mcp__servername__promptname` commands. Pass arguments space-separated after the
command.

## MCP Tool Search

Automatically enabled when MCP tool descriptions exceed 10% of context. Tools are deferred and discovered on demand
instead of preloaded.

`ENABLE_TOOL_SEARCH` env var values:

- (unset) -- enabled by default; disabled when `ANTHROPIC_BASE_URL` is non-first-party
- `true` -- always enabled
- `auto` -- activates at 10% threshold
- `auto:<N>` -- custom threshold percentage
- `false` -- disabled, all tools loaded upfront

Requires Sonnet 4+ or Opus 4+. Haiku does not support tool search.

## MCP Output Limits

- Warning threshold: 10,000 tokens
- Default max: 25,000 tokens
- Configure with `MAX_MCP_OUTPUT_TOKENS` env var

## Elicitation

MCP servers can request structured input mid-task via form dialogs or browser URLs. Auto-respond using the `Elicitation`
hook.

## Managed MCP Configuration

### Option 1: Exclusive Control (`managed-mcp.json`)

Deploy to system directories for complete control -- users cannot add/modify servers:

- macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`
- Linux/WSL: `/etc/claude-code/managed-mcp.json`
- Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`

Same format as `.mcp.json`.

### Option 2: Policy-Based Control (allowlists/denylists)

Use `allowedMcpServers` and `deniedMcpServers` in managed settings. Each entry restricts by one of:

- `serverName` -- matches configured server name
- `serverCommand` -- matches exact command + args array (stdio servers)
- `serverUrl` -- matches URL with `*` wildcards (remote servers)

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverCommand": ["npx", "-y", "@modelcontextprotocol/server-filesystem"] },
    { "serverUrl": "https://mcp.company.com/*" }
  ],
  "deniedMcpServers": [
    { "serverName": "dangerous-server" },
    { "serverUrl": "https://*.untrusted.com/*" }
  ]
}
```

Allowlist behavior:

- `undefined` -- no restrictions
- `[]` -- complete lockdown
- List of entries -- only matching servers allowed

Denylist always takes precedence over allowlist. Options 1 and 2 can be combined.

## Environment Variables

- `MCP_TIMEOUT` -- server startup timeout in ms (e.g., `MCP_TIMEOUT=10000`)
- `MAX_MCP_OUTPUT_TOKENS` -- max output tokens per tool call
- `ENABLE_TOOL_SEARCH` -- control tool search behavior
- `ENABLE_CLAUDEAI_MCP_SERVERS` -- enable/disable Claude.ai servers
