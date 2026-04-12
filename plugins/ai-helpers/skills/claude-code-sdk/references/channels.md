# Channels

Push events from external systems into a running Claude Code session via MCP servers. Channels bridge chat platforms,
webhooks, CI pipelines, monitoring alerts, and any HTTP-capable source into the active session context.

Requires Claude Code v2.1.80+. Requires claude.ai login (Console and API key auth not supported). Team/Enterprise orgs
must explicitly enable via `channelsEnabled` managed setting.

## Architecture

A channel is an MCP server spawned by Claude Code as a subprocess, communicating over stdio. The server bridges external
systems to the session:

- **Chat platforms** (Telegram, Discord, iMessage) — server runs locally, polls platform API for messages, forwards to
  Claude
- **Webhooks** (CI, monitoring) — server listens on a local HTTP port, external systems POST to it, server pushes
  payload to Claude

Events arrive only while the session is open. For always-on setups, run Claude in a background process or persistent
terminal.

## Channel Types

- **One-way** — forwards alerts, webhooks, monitoring events. Claude acts on them but cannot respond through the
  channel. Omit `capabilities.tools` from server constructor.
- **Two-way** — chat bridges where Claude reads events and replies back. Requires a reply tool (standard MCP tool) and
  `capabilities.tools: {}` in the server constructor.

## MCP Server Contract

### Capability Declaration

The `Server` constructor accepts these channel-specific fields:

- **`capabilities.experimental['claude/channel']`** (`object`, required) — always `{}`. Presence registers the
  notification listener. Without this, the server is a regular MCP server, not a channel.
- **`capabilities.experimental['claude/channel/permission']`** (`object`, optional) — always `{}`. Declares permission
  relay support. When present, Claude Code forwards tool approval prompts to the channel for remote approve/deny. See
  [Permission Relay](#permission-relay).
- **`capabilities.tools`** (`object`, two-way only) — always `{}`. Standard MCP tool capability. Required for reply
  tools.
- **`instructions`** (`string`, recommended) — injected into Claude's system prompt. Tell Claude what events to expect,
  what `<channel>` tag attributes mean, whether to reply, and which tool + attribute to use for replies.

Minimal one-way server:

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const mcp = new Server(
  { name: "my-channel", version: "0.0.1" },
  {
    capabilities: { experimental: { "claude/channel": {} } },
    instructions:
      'Events arrive as <channel source="my-channel" ...>. One-way: read and act, no reply expected.',
  }
);

await mcp.connect(new StdioServerTransport());
```

Two-way server with permission relay:

```ts
const mcp = new Server(
  { name: "my-channel", version: "0.0.1" },
  {
    capabilities: {
      experimental: {
        "claude/channel": {},
        "claude/channel/permission": {},
      },
      tools: {},
    },
    instructions:
      'Messages arrive as <channel source="my-channel" chat_id="...">. Reply with the reply tool, passing the chat_id from the tag.',
  }
);
```

### Notification Events

Push events by calling `mcp.notification()` on the `Server` instance.

**Method:** `notifications/claude/channel`

**Params:**

- **`content`** (`string`) — event body. Delivered as the body of the `<channel>` tag in Claude's context.
- **`meta`** (`Record<string, string>`, optional) — each entry becomes an attribute on the `<channel>` tag. Use for
  routing context: chat ID, sender name, alert severity. Keys must be identifiers (letters, digits, underscores only).
  Keys with hyphens or other characters are silently dropped.

The `source` attribute is set automatically from your server's configured name.

```ts
await mcp.notification({
  method: "notifications/claude/channel",
  params: {
    content: "build failed on main: https://ci.example.com/run/1234",
    meta: { severity: "high", run_id: "1234" },
  },
});
```

Arrives in Claude's context as:

```xml
<channel source="my-channel" severity="high" run_id="1234">
build failed on main: https://ci.example.com/run/1234
</channel>
```

### Reply Tool

For two-way channels, expose a standard MCP tool that Claude calls to send messages back. Nothing about the tool
registration is channel-specific — it is a regular MCP tool.

Three components:

1. `tools: {}` in `Server` constructor capabilities (enables tool discovery)
2. Tool handlers defining schema and send logic
3. `instructions` string telling Claude when/how to call the tool and which attribute to pass back

```ts
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "reply",
      description: "Send a message back over this channel",
      inputSchema: {
        type: "object",
        properties: {
          chat_id: {
            type: "string",
            description: "The conversation to reply in",
          },
          text: { type: "string", description: "The message to send" },
        },
        required: ["chat_id", "text"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "reply") {
    const { chat_id, text } = req.params.arguments as {
      chat_id: string;
      text: string;
    };
    await sendToExternalPlatform(chat_id, text);
    return { content: [{ type: "text", text: "sent" }] };
  }
  throw new Error(`unknown tool: ${req.params.name}`);
});
```

## Sender Gating

An ungated channel is a prompt injection vector. Anyone who can reach the endpoint can put text in front of Claude. Gate
on sender identity before calling `mcp.notification()`.

Gate on the **sender's identity** (`message.from.id`), not the chat/room identity (`message.chat.id`). In group chats
these differ — gating on the room lets anyone in an allowlisted group inject messages.

```ts
const allowed = new Set(loadAllowlist());

async function onInbound(message: PlatformMessage) {
  if (!allowed.has(message.from.id)) return; // drop silently
  await mcp.notification({ ... });
}
```

**Pairing flow** (Telegram, Discord): user DMs bot, bot replies with pairing code, user approves in Claude Code session,
platform ID added to allowlist.

**iMessage**: detects user's own addresses from Messages database at startup; other senders added by handle with
`/imessage:access allow`.

The allowlist also gates permission relay — anyone who can reply through the channel can approve/deny tool use in the
session. Only allowlist senders trusted with that authority.

## Permission Relay

Requires Claude Code v2.1.81+. Allows a two-way channel to forward tool approval prompts to a remote device. Both the
local terminal dialog and the remote channel stay live — first answer wins.

Relay covers tool-use approvals (`Bash`, `Write`, `Edit`). Project trust and MCP server consent dialogs do not relay —
those only appear in the local terminal.

### Relay Flow

1. Claude Code generates a short `request_id` and sends `notifications/claude/channel/permission_request` to the server
2. Server formats the prompt and sends it to the external platform
3. Remote user replies with yes/no and the request ID
4. Server parses reply into a verdict, emits `notifications/claude/channel/permission` back to Claude Code
5. Claude Code applies verdict only if the ID matches an open request

### Permission Request Notification

**Method:** `notifications/claude/channel/permission_request`

**Params:**

- **`request_id`** (`string`) — five lowercase letters from `a`-`z` excluding `l` (avoids confusion with `1`/`I` on
  phones). Include verbatim in outgoing prompt so it can be echoed back. Claude Code only accepts verdicts carrying an
  ID it issued.
- **`tool_name`** (`string`) — name of the tool Claude wants to use (e.g., `Bash`, `Write`)
- **`description`** (`string`) — human-readable summary, same text the local terminal dialog shows
- **`input_preview`** (`string`) — tool arguments as JSON string, truncated to 200 characters. Optional in outgoing
  prompt.

### Permission Verdict Notification

**Method:** `notifications/claude/channel/permission`

**Params:**

- **`request_id`** (`string`) — echo the ID from the request
- **`behavior`** (`'allow'` | `'deny'`) — `allow` proceeds with the tool call, `deny` rejects it (same as answering No
  in local dialog). Neither verdict affects future calls.

### Implementing Permission Relay

Three components:

1. `'claude/channel/permission': {}` under `experimental` capabilities in `Server` constructor
2. Notification handler for `notifications/claude/channel/permission_request` that formats and sends the prompt
3. Inbound handler that recognizes verdict format (`yes <id>` / `no <id>`) and emits
   `notifications/claude/channel/permission` instead of forwarding to Claude

```ts
import { z } from "zod";

const PermissionRequestSchema = z.object({
  method: z.literal("notifications/claude/channel/permission_request"),
  params: z.object({
    request_id: z.string(),
    tool_name: z.string(),
    description: z.string(),
    input_preview: z.string(),
  }),
});

mcp.setNotificationHandler(PermissionRequestSchema, async ({ params }) => {
  sendToExternalPlatform(
    `Claude wants to run ${params.tool_name}: ${params.description}\n\n` +
      `Reply "yes ${params.request_id}" or "no ${params.request_id}"`
  );
});
```

Verdict parsing in inbound handler:

```ts
// matches "y abcde", "yes abcde", "n abcde", "no abcde"
// [a-km-z] is the ID alphabet (lowercase, skips 'l')
// /i tolerates phone autocorrect
const PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i;

async function onInbound(message: PlatformMessage) {
  if (!allowed.has(message.from.id)) return;

  const m = PERMISSION_REPLY_RE.exec(message.text);
  if (m) {
    await mcp.notification({
      method: "notifications/claude/channel/permission",
      params: {
        request_id: m[2].toLowerCase(),
        behavior: m[1].toLowerCase().startsWith("y") ? "allow" : "deny",
      },
    });
    return; // handled as verdict, don't forward as chat
  }

  // normal chat path
  await mcp.notification({
    method: "notifications/claude/channel",
    params: {
      content: message.text,
      meta: { chat_id: String(message.chat.id) },
    },
  });
}
```

## Session Activation

Channels must be explicitly enabled per session:

- **Installed plugins:** `claude --channels plugin:<name>@<marketplace>` (multiple space-separated)
- **Bare MCP servers:** `claude --dangerously-load-development-channels server:<name>`
- Being in `.mcp.json` alone is not enough — the server must also be named in `--channels`

### MCP Config Registration

```json
{
  "mcpServers": {
    "my-channel": { "command": "bun", "args": ["./channel.ts"] }
  }
}
```

Project-level `.mcp.json` uses relative paths. User-level `~/.claude.json` uses absolute paths.

## Enterprise Controls

On Team/Enterprise plans, channels are off by default.

- **`channelsEnabled`** (`boolean`) — master switch. Must be `true` for any channel to deliver messages. When unset or
  `false`, all channels blocked including development flag.
- **`allowedChannelPlugins`** (`array`) — which plugins can register when channels are enabled. Replaces
  Anthropic-maintained allowlist when set. Only applies when `channelsEnabled` is `true`. Empty array blocks all
  allowlist plugins (development flag can still bypass).

```json
{
  "channelsEnabled": true,
  "allowedChannelPlugins": [
    { "marketplace": "claude-plugins-official", "plugin": "telegram" },
    { "marketplace": "claude-plugins-official", "plugin": "discord" },
    { "marketplace": "acme-corp-plugins", "plugin": "internal-alerts" }
  ]
}
```

Pro/Max users without an organization skip these checks — channels available, opt-in via `--channels`.

## Research Preview

Channels are in research preview (v2.1.80+). `--channels` only accepts plugins from the effective allowlist
(Anthropic-maintained, or org's `allowedChannelPlugins`).

To test custom channels during preview: `--dangerously-load-development-channels` bypasses the allowlist per-entry. Does
not extend to `--channels` entries. `channelsEnabled` policy still applies.

## Built-in Channel Plugins

All require [Bun](https://bun.sh). Install via `/plugin install <name>@claude-plugins-official`.

- **Telegram** — polls Telegram Bot API. Token from BotFather. Configure with `/telegram:configure <token>`. Pairing via
  DM code + `/telegram:access pair <code>`.
- **Discord** — connects via Discord gateway. Token from Developer Portal. Requires Message Content Intent. Configure
  with `/discord:configure <token>`. Pairing via DM code + `/discord:access pair <code>`.
- **iMessage** — reads macOS Messages database directly, replies via AppleScript. No token needed. Requires Full Disk
  Access. Self-chat works automatically; add others with `/imessage:access allow <handle>`.
- **fakechat** — localhost demo on port 8787. No auth, no external service. Browser UI for testing channel flow.

## Use Cases

- **Chat bridge** — ask Claude from phone via Telegram/Discord/iMessage, reply comes back in same chat while work runs
  locally
- **Webhook receiver** — CI failure, deploy event, error tracker alert arrives where Claude already has files open
- **Monitoring alerts** — push alerts from Grafana, PagerDuty, or custom systems into the active session
- **Bot integration** — any system that can send HTTP POST can push events to Claude
