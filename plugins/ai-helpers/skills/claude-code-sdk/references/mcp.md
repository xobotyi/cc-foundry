# MCP Servers

Claude Code connects to external tools and data sources through the Model Context Protocol (MCP). MCP servers provide
tools, resources, and prompts from databases, APIs, issue trackers, and other services.

## Transports

Three transport types, each with different use cases:

- **HTTP** — remote cloud services. `claude mcp add --transport http <name> <url>`
- **SSE** — remote (deprecated, use HTTP). `claude mcp add --transport sse <name> <url>`
- **stdio** — local processes on device. `claude mcp add [options] <name> -- <command> [args...]`

HTTP is the recommended transport for remote servers. SSE is deprecated — use HTTP where available.

### HTTP server

```bash
claude mcp add --transport http <name> <url>

# With authentication header
claude mcp add --transport http <name> <url> \
  --header "Authorization: Bearer <token>"
```

### SSE server (deprecated)

```bash
claude mcp add --transport sse <name> <url>

# With authentication header
claude mcp add --transport sse <name> <url> \
  --header "X-API-Key: <key>"
```

### stdio server

```bash
claude mcp add [options] <name> -- <command> [args...]

# With environment variable
claude mcp add --transport stdio --env API_KEY=<value> <name> \
  -- npx -y <package>
```

**Option ordering**: all flags (`--transport`, `--env`, `--scope`, `--header`) must come **before** the server name. The
`--` separates the server name from the command and arguments passed to the MCP server process.

**Windows**: native Windows (not WSL) requires `cmd /c` wrapper for `npx` commands:

```bash
claude mcp add --transport stdio <name> -- cmd /c npx -y <package>
```

### Add from JSON

```bash
claude mcp add-json <name> '<json>'

# HTTP example
claude mcp add-json weather '{"type":"http","url":"https://api.weather.com/mcp","headers":{"Authorization":"Bearer token"}}'

# stdio example
claude mcp add-json local '{"type":"stdio","command":"/path/to/server","args":["--flag"],"env":{"KEY":"val"}}'

# With OAuth credentials
claude mcp add-json my-server '{"type":"http","url":"https://mcp.example.com/mcp","oauth":{"clientId":"id","callbackPort":8080}}' --client-secret
```

### Import from Claude Desktop

```bash
claude mcp add-from-claude-desktop
```

Works on macOS and WSL only. Reads from Claude Desktop's standard config location. Use `--scope user` to add to user
config. Duplicate names get a numerical suffix (e.g., `server_1`).

## Server Management

```bash
claude mcp list              # List all configured servers
claude mcp get <name>        # Get details for a specific server
claude mcp remove <name>     # Remove a server
claude mcp reset-project-choices  # Reset project-scope approval choices
/mcp                         # In-session: check status, authenticate, manage
```

### Dynamic tool updates

MCP servers can send `list_changed` notifications to dynamically update available tools, prompts, and resources without
reconnection.

### Push messages with channels

MCP servers can push messages into a session when the server declares the `claude/channel` capability and the user opts
in with `--channels` at startup.

## Installation Scopes

- **Local** (default) — current project only. Not shared. Stored in `~/.claude.json`.
- **Project** — current project only. Shared via version control. Stored in `.mcp.json` in project root.
- **User** — all projects. Not shared. Stored in `~/.claude.json`.

Specify scope with `--scope <local|project|user>`. Default is `local`.

**Note**: MCP "local scope" stores in `~/.claude.json` (home directory) scoped to the project path. This differs from
general local settings which use `.claude/settings.local.json` (project directory).

### Local scope (default)

Private to you, loads only in the project where added. Stored in `~/.claude.json` under the project path.

```bash
claude mcp add --transport http stripe https://mcp.stripe.com
# or explicitly:
claude mcp add --transport http stripe --scope local https://mcp.stripe.com
```

Resulting `~/.claude.json` structure:

```json
{
  "projects": {
    "/path/to/project": {
      "mcpServers": {
        "stripe": {
          "type": "http",
          "url": "https://mcp.stripe.com"
        }
      }
    }
  }
}
```

### Project scope

Stored in `.mcp.json` at project root — designed for version control. All team members get the same servers.

```bash
claude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp
```

Claude Code prompts for approval before using project-scoped servers from `.mcp.json`. Reset with
`claude mcp reset-project-choices`.

### User scope

Stored in `~/.claude.json`, available across all projects on the machine.

```bash
claude mcp add --transport http hubspot --scope user https://mcp.hubspot.com/anthropic
```

### Scope precedence

When the same server is defined in multiple places, the highest-precedence source wins:

1. Local scope
2. Project scope
3. User scope
4. Plugin-provided servers
5. Claude.ai connectors

Local/project/user match by **name**. Plugins and connectors match by **endpoint** (URL or command).

## .mcp.json Schema

The `.mcp.json` file configures project-scoped MCP servers:

```json
{
  "mcpServers": {
    "<server-name>": {
      "type": "http" | "sse" | "stdio",

      // For http/sse:
      "url": "<server-url>",
      "headers": { "<header>": "<value>" },
      "headersHelper": "<shell-command>",
      "oauth": {
        "clientId": "<id>",
        "clientSecret": "<secret>",
        "callbackPort": 8080,
        "authServerMetadataUrl": "<url>"
      },

      // For stdio:
      "command": "<executable>",
      "args": ["<arg1>", "<arg2>"],
      "env": { "<VAR>": "<value>" }
    }
  }
}
```

### Environment variable expansion

Supported in `command`, `args`, `env`, `url`, and `headers` fields:

- `${VAR}` — expands to the value of `VAR`. Fails if unset with no default.
- `${VAR:-default}` — expands to `VAR` if set, otherwise uses `default`.

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

### Plugin path variables

Plugin `.mcp.json` files additionally support:

- `${CLAUDE_PLUGIN_ROOT}` — plugin install directory (changes on update)
- `${CLAUDE_PLUGIN_DATA}` — persistent data directory (survives updates)

## OAuth Authentication

Claude Code supports OAuth 2.0 for remote MCP servers (HTTP and SSE transports only).

### Basic OAuth flow

1. Add the server: `claude mcp add --transport http <name> <url>`
2. Run `/mcp` in Claude Code, follow the browser login flow
3. Tokens are stored securely and refreshed automatically

Use "Clear authentication" in `/mcp` menu to revoke access.

### Fixed callback port

Some servers require a specific redirect URI. Use `--callback-port` to fix the port:

```bash
claude mcp add --transport http --callback-port 8080 <name> <url>
```

The redirect URI will be `http://localhost:8080/callback`.

### Pre-configured OAuth credentials

For servers that don't support Dynamic Client Registration:

```bash
# Interactive (prompts for secret)
claude mcp add --transport http \
  --client-id <id> --client-secret --callback-port 8080 \
  <name> <url>

# Via environment variable (non-interactive)
MCP_CLIENT_SECRET=<secret> claude mcp add --transport http \
  --client-id <id> --client-secret --callback-port 8080 \
  <name> <url>

# JSON form
claude mcp add-json <name> \
  '{"type":"http","url":"<url>","oauth":{"clientId":"<id>","callbackPort":8080}}' \
  --client-secret
```

- Client secret is stored in system keychain (macOS) or credentials file, not in config
- Public OAuth clients (no secret): use only `--client-id` without `--client-secret`
- `--callback-port` works with or without `--client-id`
- Use `claude mcp get <name>` to verify OAuth credentials

### Override OAuth metadata discovery

Default discovery: RFC 9728 (`/.well-known/oauth-protected-resource`) then RFC 8414
(`/.well-known/oauth-authorization-server`). Override with `authServerMetadataUrl`:

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

URL must use `https://`. Requires Claude Code v2.1.64+.

### Dynamic headers (headersHelper)

For non-OAuth authentication (Kerberos, short-lived tokens, internal SSO):

```json
{
  "mcpServers": {
    "internal-api": {
      "type": "http",
      "url": "https://mcp.internal.example.com",
      "headersHelper": "/opt/bin/get-mcp-auth-headers.sh"
    }
  }
}
```

Requirements:

- Command must write a JSON object of string key-value pairs to stdout
- Runs in a shell with 10-second timeout
- Dynamic headers override static `headers` with the same name
- Runs fresh on each connection (session start, reconnect) — no caching

Environment variables set during execution:

- `CLAUDE_CODE_MCP_SERVER_NAME` — the name of the MCP server
- `CLAUDE_CODE_MCP_SERVER_URL` — the URL of the MCP server

`headersHelper` executes arbitrary shell commands. At project or local scope, it only runs after accepting the workspace
trust dialog.

## Claude.ai Connector Servers

MCP servers configured in Claude.ai (at `claude.ai/settings/connectors`) are automatically available in Claude Code when
logged in with a Claude.ai account. On Team/Enterprise plans, only admins can add servers.

Disable with: `ENABLE_CLAUDEAI_MCP_SERVERS=false claude`

## Claude Code as MCP Server

Claude Code can itself serve as an MCP server for other applications:

```bash
claude mcp serve
```

Claude Desktop config:

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

If `claude` is not in PATH, use the full path (find with `which claude`). Exposes Claude Code's built-in tools (View,
Edit, LS, etc.). The MCP client is responsible for user confirmation of tool calls.

## Output Limits

- **Warning threshold**: 10,000 tokens per tool output
- **Default maximum**: 25,000 tokens
- **Configurable via**: `MAX_MCP_OUTPUT_TOKENS` environment variable
- **Hard ceiling**: 500,000 characters (for tools declaring `anthropic/maxResultSizeChars`)

Results exceeding the threshold are persisted to disk and replaced with a file reference in conversation.

### Per-tool limit override (server authors)

Set `_meta["anthropic/maxResultSizeChars"]` in the tool's `tools/list` response:

```json
{
  "name": "get_schema",
  "description": "Returns the full database schema",
  "_meta": {
    "anthropic/maxResultSizeChars": 200000
  }
}
```

Applies independently of `MAX_MCP_OUTPUT_TOKENS` for text content. Image data is still subject to the token limit.

## Tool Search

Tool search defers MCP tool definitions until needed, keeping context usage low. Only tool names load at session start;
Claude discovers full schemas on demand via a search tool.

### Configuration (ENABLE_TOOL_SEARCH)

- **(unset)** — all MCP tools deferred. Falls back to upfront loading for non-first-party `ANTHROPIC_BASE_URL`.
- **`true`** — all MCP tools deferred, including for non-first-party hosts.
- **`auto`** — threshold mode: upfront if within 10% of context window, deferred otherwise.
- **`auto:<N>`** — custom threshold percentage (0-100), e.g. `auto:5` for 5%.
- **`false`** — all MCP tools loaded upfront, no deferral.

```bash
ENABLE_TOOL_SEARCH=auto:5 claude    # Custom 5% threshold
ENABLE_TOOL_SEARCH=false claude     # Disable tool search
```

Or set in `settings.json` `env` field.

Disable the ToolSearch tool specifically:

```json
{
  "permissions": {
    "deny": ["ToolSearch"]
  }
}
```

Requires models supporting `tool_reference` blocks: Sonnet 4+, Opus 4+. Haiku does not support tool search.

### Server instructions (for MCP server authors)

Server instructions help Claude discover tools via search. Claude Code truncates tool descriptions and server
instructions at 2KB each. Keep them concise and put critical details near the start. Explain:

- What category of tasks the tools handle
- When Claude should search for the tools
- Key capabilities the server provides

## Elicitation

MCP servers can request structured input mid-task via elicitation. Two modes:

- **Form mode** — dialog with server-defined fields (username, password, etc.)
- **URL mode** — opens browser URL for authentication/approval

Auto-respond via the `Elicitation` hook. No configuration needed — dialogs appear automatically.

## MCP Resources

MCP servers expose resources referenceable via `@` mentions:

```
@server:protocol://resource/path
```

Examples:

```
Can you analyze @github:issue://123 and suggest a fix?
Compare @postgres:schema://users with @docs:file://database/user-model
```

Resources are fetched and included as attachments. Resource paths are fuzzy-searchable in the `@` autocomplete.

## MCP Prompts as Commands

MCP servers expose prompts as slash commands:

```
/mcp__servername__promptname
/mcp__github__pr_review 456
/mcp__jira__create_issue "Bug in login flow" high
```

Arguments are parsed based on the prompt's defined parameters. Results inject directly into conversation.

## Plugin-Provided MCP Servers

Plugins can bundle MCP servers that start automatically when the plugin is enabled.

### Configuration

In `.mcp.json` at plugin root:

```json
{
  "mcpServers": {
    "database-tools": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "DB_URL": "${DB_URL}"
      }
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

### Lifecycle

- Servers for enabled plugins connect automatically at session startup
- Enable/disable during session: run `/reload-plugins` to connect/disconnect
- Plugin servers appear in `/mcp` with plugin indicators
- Managed through plugin installation, not `/mcp` commands

### Features

- `${CLAUDE_PLUGIN_ROOT}` for bundled files, `${CLAUDE_PLUGIN_DATA}` for persistent state
- Access to user environment variables
- Supports stdio, SSE, and HTTP transports

## Managed MCP Configuration

Two options for organizational control over MCP servers.

### Option 1: Exclusive control (managed-mcp.json)

Deploy a fixed set of servers. Users cannot add, modify, or use any other servers.

System-wide paths (require admin privileges):

- macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`
- Linux/WSL: `/etc/claude-code/managed-mcp.json`
- Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`

Same format as `.mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "company-internal": {
      "type": "stdio",
      "command": "/usr/local/bin/company-mcp-server",
      "args": ["--config", "/etc/company/mcp-config.json"],
      "env": {
        "COMPANY_API_URL": "https://internal.company.com"
      }
    }
  }
}
```

### Option 2: Policy-based control (allowlists/denylists)

Allow users to add their own servers within policy constraints. Configured in the managed settings file.

#### Restriction types

Each entry must have exactly one of:

- `serverName` — matches configured server name
- `serverCommand` — matches exact command + arguments array (stdio only)
- `serverUrl` — matches URL with wildcard `*` support (remote only)

#### allowedMcpServers

- `undefined` (default): no restrictions
- `[]` (empty): complete lockdown — no servers allowed
- List of entries: only matching servers allowed

#### deniedMcpServers

- `undefined` (default): no servers blocked
- `[]` (empty): no servers blocked
- List of entries: matching servers blocked

**Denylist takes absolute precedence** — blocked even if on allowlist.

#### Configuration example

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverName": "sentry" },
    { "serverCommand": ["npx", "-y", "@modelcontextprotocol/server-filesystem"] },
    { "serverUrl": "https://mcp.company.com/*" },
    { "serverUrl": "https://*.internal.corp/*" }
  ],
  "deniedMcpServers": [
    { "serverName": "dangerous-server" },
    { "serverCommand": ["npx", "-y", "unapproved-package"] },
    { "serverUrl": "https://*.untrusted.com/*" }
  ]
}
```

#### Matching rules

- **Command matching**: exact match of full command array (command + all arguments in order)
- **URL wildcards**: `*` matches any sequence — `https://*.example.com/*`, `http://localhost:*/*`
- **Stdio servers**: when any `serverCommand` entries exist in allowlist, stdio servers must match a command entry
  (cannot pass by name alone)
- **Remote servers**: when any `serverUrl` entries exist in allowlist, remote servers must match a URL pattern (cannot
  pass by name alone)
- A server passes if it matches **either** a name, command, or URL entry (unless denied)

#### Combining options

`managed-mcp.json` and allowlists/denylists can coexist. If `managed-mcp.json` exists, it takes exclusive control and
users cannot add servers. Allowlists/denylists still filter which managed servers actually load.

## Environment Variables

- `MCP_TIMEOUT` — server startup timeout (ms). No default.
- `MAX_MCP_OUTPUT_TOKENS` — maximum tool output tokens. Default: 25,000.
- `ENABLE_TOOL_SEARCH` — tool search behavior. Default: auto.
- `ENABLE_CLAUDEAI_MCP_SERVERS` — enable/disable Claude.ai connector servers. Default: `true`.
- `MCP_CLIENT_SECRET` — OAuth client secret (non-interactive). No default.
