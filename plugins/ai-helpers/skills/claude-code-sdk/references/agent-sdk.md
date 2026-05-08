# Agent SDK

The Claude Agent SDK (formerly Claude Code SDK) is the programmatic interface for building custom agents using Claude
Code as a library. It provides the same tools, agent loop, and context management that power Claude Code, available in
TypeScript and Python.

## Installation

- **TypeScript:** `npm install @anthropic-ai/claude-agent-sdk`
- **Python:** `pip install claude-agent-sdk` (or `uv add claude-agent-sdk`)

## Authentication

- **Anthropic API:** set `ANTHROPIC_API_KEY` environment variable
- **Amazon Bedrock:** set `CLAUDE_CODE_USE_BEDROCK=1` + AWS credentials
- **Google Vertex AI:** set `CLAUDE_CODE_USE_VERTEX=1` + Google Cloud credentials
- **Microsoft Azure:** set `CLAUDE_CODE_USE_FOUNDRY=1` + Azure credentials

## Core Entry Points

### `query()`

Primary function. Creates an async generator that streams messages as the agent works.

**TypeScript:**

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: { allowedTools: ["Read", "Edit", "Bash"] },
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

**Python:**

```python
from claude_agent_sdk import query, ClaudeAgentOptions

async for message in query(
    prompt="Find and fix the bug in auth.py",
    options=ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Bash"]),
):
    if hasattr(message, "result"):
        print(message.result)
```

Returns a `Query` object (TS) or `AsyncIterator[Message]` (Python) that yields `SDKMessage` variants as the agent
thinks, calls tools, and produces results.

### `ClaudeSDKClient` (Python only)

Maintains a conversation session across multiple exchanges. Use as async context manager:

```python
async with ClaudeSDKClient(options=options) as client:
    await client.query("Analyze the auth module")
    async for message in client.receive_response():
        print(message)

    # Second query continues same session
    await client.query("Now refactor it to use JWT")
    async for message in client.receive_response():
        print(message)
```

Key methods: `connect()`, `query()`, `receive_response()`, `interrupt()`, `set_permission_mode()`, `set_model()`,
`rewind_files()`, `disconnect()`.

### TypeScript `Query` Object

The return value of `query()` extends `AsyncGenerator<SDKMessage>` with additional methods:

- `interrupt()` -- interrupt the query (streaming input mode)
- `rewindFiles(userMessageId, options?)` -- restore files to state at a message (requires `enableFileCheckpointing`)
- `setPermissionMode(mode)` -- change permission mode mid-session
- `setModel(model)` -- change model mid-session
- `initializationResult()` -- session init data (commands, models, agents, account)
- `supportedCommands()`, `supportedModels()`, `supportedAgents()` -- discovery
- `mcpServerStatus()`, `reconnectMcpServer()`, `toggleMcpServer()`, `setMcpServers()` -- MCP management
- `streamInput(stream)` -- stream input messages for multi-turn
- `stopTask(taskId)` -- stop a background task
- `applyFlagSettings(settings)` -- change any setting on a running session (streaming input mode only); writes to the
  flag-settings layer, shallow-merges top-level keys, pass `null` to clear a key
- `close()` -- terminate the process

### TypeScript V2 Preview (`unstable_v2_*`)

Unstable preview interface — APIs may change before stabilization. Removes async-generator coordination in favor of a
session-based `send()` / `stream()` cycle. Bundled in `@anthropic-ai/claude-agent-sdk` alongside V1; the two coexist.

**Three concepts:**

- `unstable_v2_createSession(options?)` — start a fresh session
- `unstable_v2_resumeSession(sessionId, options?)` — continue a session by ID
- `unstable_v2_prompt(prompt, options?)` — one-shot single-turn convenience

**Send/stream are explicit steps:**

- `session.send(prompt)` — dispatch a message to the agent loop (no return content)
- `session.stream()` — async generator yielding `SDKMessage` for the current turn
- `session.id` — capture for later `resumeSession`
- `session.close()` — terminate the underlying Claude Code subprocess

```typescript
import { unstable_v2_createSession } from "@anthropic-ai/claude-agent-sdk";

await using session = await unstable_v2_createSession({
  allowedTools: ["Read", "Glob"],
  permissionMode: "acceptEdits",
});

await session.send("What is 15 * 15?");
for await (const message of session.stream()) {
  if (message.type === "assistant") {
    console.log("Claude:", message.message.content);
  }
}

// Same session — context shared
await session.send("Now add 10 to that result.");
for await (const message of session.stream()) {
  if (message.type === "result" && message.subtype === "success") {
    console.log("Final:", message.result);
  }
}
```

**Resuming across processes:**

```typescript
const session = await unstable_v2_createSession();
const sessionId = session.id;
await session.send("Remember my favorite color is orange.");
for await (const _ of session.stream()) {
  /* drain */
}
await session.close();

// Later, possibly different process
await using resumed = await unstable_v2_resumeSession(sessionId);
await resumed.send("What is my favorite color?");
for await (const msg of resumed.stream()) {
  if (msg.type === "result" && msg.subtype === "success") console.log(msg.result);
}
```

**Cleanup:** `await using` (TypeScript 5.2+) closes the session on scope exit. For older TypeScript, call
`session.close()` manually.

**V1 vs V2 at a glance:**

| Aspect              | V1 (`query()`)                     | V2 (`createSession()`)              |
| ------------------- | ---------------------------------- | ----------------------------------- |
| Multi-turn          | `continue: true` on each `query()` | One session object, `send`/`stream` |
| Cleanup             | Manual `close()` on `Query`        | `await using` or `session.close()`  |
| Cross-process       | Pass `resume: sessionId`           | `unstable_v2_resumeSession(id)`     |
| Logic between turns | Drives the same async generator    | Separate dispatch + stream steps    |

**Not yet in V2 (use V1):**

- Session forking (`forkSession`)
- Some advanced streaming-input patterns

V2 is the TypeScript counterpart to Python's `ClaudeSDKClient`. Message shapes are the same `SDKMessage` union as V1
(`AssistantMessage` and `UserMessage` wrap content under `message.message`, not `message`).

## Migration

### Legacy `claude-code-sdk` → Claude Agent SDK (v0.1.0)

The package was renamed to reflect broader agentic scope.

| Aspect              | Old                         | New                              |
| ------------------- | --------------------------- | -------------------------------- |
| TypeScript package  | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| Python package      | `claude-code-sdk`           | `claude-agent-sdk`               |
| Python options type | `ClaudeCodeOptions`         | `ClaudeAgentOptions`             |

**Breaking changes in v0.1.0:**

- **System prompt no longer inherited.** The SDK now uses a minimal system prompt by default. To get Claude Code's full
  prompt, opt in with `systemPrompt: { type: "preset", preset: "claude_code" }`.
- **Settings sources require explicit opt-out for isolation.** Default loads `user`, `project`, `local` to match the
  CLI. For CI/CD, multi-tenant systems, or test environments that should be isolated from filesystem settings, pass
  `settingSources: []`. Python SDK 0.1.59 and earlier treated `setting_sources=[]` the same as omitting it — upgrade
  before relying on isolation.

### V1 → V2 Preview (TypeScript)

Use V1 for production today; V2 is unstable preview. Stay on V1 if you need session forking or advanced streaming-input
patterns.

Migration steps:

1. Replace `query()` calls with `unstable_v2_createSession()` for multi-turn flows.
2. Split the send and the stream — `session.send(prompt)` then `for await (const m of session.stream())`.
3. Wrap sessions in `await using` for automatic cleanup, or call `session.close()` manually.

### Deprecated fields and env vars

- `maxThinkingTokens` — replaced by the `thinking` config object (`adaptive`, `enabled`, `disabled`)
- `TaskOutput` tool — read the background task's output file path with `Read` instead
- `ANTHROPIC_SMALL_FAST_MODEL` env var — replaced by `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `total_cost` — renamed to `total_cost_usd` (early SDK versions only)

## Options Reference

Options are passed via `Options` (TS) or `ClaudeAgentOptions` (Python dataclass). Key fields with TS name / Python name
where they differ:

### Core

- **`prompt`** (string, required) — what you want the agent to do
- **`cwd`** (string/Path, default: process cwd) — working directory
- **`model`** (string, default: CLI default) — Claude model to use
- **`fallbackModel` / `fallback_model`** (string) — model if primary fails
- **`systemPrompt` / `system_prompt`** (string | PresetConfig, default: minimal prompt) — system prompt
- **`maxTurns` / `max_turns`** (number/int) — maximum agentic turns (tool-use round trips)
- **`maxBudgetUsd` / `max_budget_usd`** (number/float) — maximum spend in USD
- **`effort`** (`"low"` | `"medium"` | `"high"` | `"max"`, default: `"high"`) — controls thinking depth
- **`thinking`** (ThinkingConfig, default: `{ type: "adaptive" }`) — thinking behavior: `adaptive`, `enabled`,
  `disabled`
- **`env`** (Record/dict, default: `process.env` / `{}`) — environment variables
- **`additionalDirectories` / `add_dirs`** (string[]/list, default: `[]`) — extra directories the agent can access
- **`debug`** (boolean, default: `false`) — enable debug mode (TS only)

### Tools and Permissions

- **`allowedTools` / `allowed_tools`** (string[], default: `[]`) — tools to auto-approve (does NOT restrict — unlisted
  fall through)
- **`disallowedTools` / `disallowed_tools`** (string[], default: `[]`) — tools to always deny (checked first, overrides
  everything)
- **`tools`** (string[] | Preset) — which built-in tools appear in context (availability, not permission)
- **`permissionMode` / `permission_mode`** (PermissionMode, default: `"default"`) — permission mode for the session
- **`canUseTool` / `can_use_tool`** (callback) — custom runtime permission handler

### Features

- **`settingSources` / `setting_sources`** (SettingSource[], default: `[]`) — which filesystem settings to load
- **`hooks`** (Record/dict, default: `{}`) — programmatic hook callbacks
- **`mcpServers` / `mcp_servers`** (Record/dict, default: `{}`) — MCP server configurations
- **`agents`** (Record/dict) — programmatically defined subagents
- **`plugins`** (SdkPluginConfig[], default: `[]`) — load custom plugins from local paths
- **`outputFormat` / `output_format`** (`{ type, schema }`) — JSON Schema for structured output
- **`includePartialMessages` / `include_partial_messages`** (boolean, default: `false`) — enable streaming partial
  message events

### Session

- **`resume`** (string) — session ID to resume
- **`continue` / `continue_conversation`** (boolean, default: `false`) — continue most recent session in cwd
- **`forkSession` / `fork_session`** (boolean, default: `false`) — fork instead of continuing when resuming
- **`persistSession`** (boolean, default: `true`) — disable session persistence to disk (TS only)
- **`enableFileCheckpointing` / `enable_file_checkpointing`** (boolean, default: `false`) — enable file change tracking
  for rewinding

## System Prompt Configuration

Four approaches, in order of increasing customization:

### 1. CLAUDE.md Files (project-level instructions)

Loaded automatically when `settingSources` includes `"project"`. No code changes needed. Supports project root, parent
dirs, child dirs (on-demand), user-level (`~/.claude/CLAUDE.md`), and rules (`*.md` in `.claude/rules/`).

### 2. Output Styles (persistent configurations)

Markdown files with YAML frontmatter in `~/.claude/output-styles/` or `.claude/output-styles/`. Loaded via
`settingSources`.

### 3. Preset with Append

Uses Claude Code's full system prompt plus your additions:

```typescript
systemPrompt: {
  type: "preset",
  preset: "claude_code",
  append: "Always include type hints in Python code."
}
```

### 4. Custom String

Replaces the default entirely:

```typescript
systemPrompt: "You are a Python coding specialist..."
```

**Key detail:** The SDK uses a minimal system prompt by default (tool instructions only). To get the full Claude Code
experience (coding guidelines, response style, project context), use `{ type: "preset", preset: "claude_code" }`.
CLAUDE.md loading requires `settingSources` -- the preset alone does not load them.

## Sessions

Sessions persist conversation history to disk. The agent retains full context: files read, analysis done, decisions
made.

### Approaches

- **One-shot:** single `query()` call, no session management needed
- **Multi-turn in-process:** `ClaudeSDKClient` (Python) or `continue: true` (TypeScript) -- SDK tracks session
  automatically
- **Resume by ID:** capture `session_id` from `ResultMessage`, pass to `resume` option
- **Fork:** set `forkSession: true` / `fork_session=True` when resuming -- creates a branch, original unchanged

### Capturing Session ID

Available on `ResultMessage.session_id` (both SDKs) and on the `system:init` message in TypeScript.

### Session Utilities

Both SDKs provide synchronous functions for session management:

- `listSessions()` / `list_sessions()` -- enumerate sessions, filter by directory
- `getSessionMessages()` / `get_session_messages()` -- read transcript messages
- `getSessionInfo()` / `get_session_info()` -- metadata for a single session
- `renameSession()` / `rename_session()` -- set a custom title
- `tagSession()` / `tag_session()` -- tag/untag a session

Session files live at `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`. The `cwd` must match when resuming.

## Permissions

When Claude requests a tool, the SDK evaluates permissions in this order:

1. **Hooks** -- can allow, deny, or pass through
2. **Deny rules** -- `disallowedTools` / settings.json deny rules (checked even in `bypassPermissions`)
3. **Permission mode** -- `bypassPermissions` approves everything reaching this step; `acceptEdits` approves file ops
4. **Allow rules** -- `allowedTools` / settings.json allow rules
5. **`canUseTool` callback** -- runtime approval handler (skipped in `dontAsk` mode)

### Permission Modes

- **`default`** — no auto-approvals; unmatched tools trigger `canUseTool`
- **`dontAsk`** — anything not pre-approved is denied; `canUseTool` never called
- **`acceptEdits`** — auto-approves file edits and filesystem commands (`mkdir`, `rm`, `mv`, etc.)
- **`bypassPermissions`** — all tools run without prompts (use with caution; subagents inherit, cannot override)
- **`plan`** — no tool execution; Claude plans only
- **`auto`** (TS only) — model classifier approves/denies each call

### `canUseTool` Callback

Runtime permission handler. Receives `(toolName, input, context)` and returns `{ behavior: "allow" }` or
`{ behavior: "deny", message: "..." }`. The allow result can include `updatedInput` to modify tool arguments.

### Dynamic Permission Changes

Call `setPermissionMode()` (TS) / `set_permission_mode()` (Python) mid-session to change modes.

## Hooks

Callback functions that execute at key points in the agent lifecycle. Two types run side by side:

- **Programmatic hooks:** callbacks passed to `query()` via `hooks` option -- run in your process
- **Filesystem hooks:** shell commands in `settings.json` -- loaded via `settingSources`

### Hook Events

| Event                | Python | TypeScript | Trigger                                  |
| -------------------- | ------ | ---------- | ---------------------------------------- |
| `PreToolUse`         | Yes    | Yes        | Before tool execution (can block/modify) |
| `PostToolUse`        | Yes    | Yes        | After tool execution                     |
| `PostToolUseFailure` | Yes    | Yes        | After tool execution failure             |
| `UserPromptSubmit`   | Yes    | Yes        | User prompt submitted                    |
| `Stop`               | Yes    | Yes        | Agent execution stopping                 |
| `SubagentStart`      | Yes    | Yes        | Subagent initialized                     |
| `SubagentStop`       | Yes    | Yes        | Subagent completed                       |
| `PreCompact`         | Yes    | Yes        | Before conversation compaction           |
| `PermissionRequest`  | Yes    | Yes        | Permission dialog would be shown         |
| `Notification`       | Yes    | Yes        | Agent status messages                    |
| `SessionStart`       | No     | Yes        | Session initialization                   |
| `SessionEnd`         | No     | Yes        | Session termination                      |
| `Setup`              | No     | Yes        | Session setup/maintenance                |
| `TeammateIdle`       | No     | Yes        | Teammate becomes idle                    |
| `TaskCompleted`      | No     | Yes        | Background task completes                |
| `ConfigChange`       | No     | Yes        | Configuration file changes               |
| `WorktreeCreate`     | No     | Yes        | Git worktree created                     |
| `WorktreeRemove`     | No     | Yes        | Git worktree removed                     |

### Hook Configuration

```typescript
hooks: {
  PreToolUse: [
    { matcher: "Write|Edit", hooks: [myCallback] },
    { matcher: "^mcp__", hooks: [mcpAuditHook] },
    { hooks: [globalLogger] }  // no matcher = all events
  ]
}
```

Each entry is a `HookCallbackMatcher` with:

- `matcher` -- regex matched against tool name (or event-specific field); omit for all
- `hooks` -- array of callback functions
- `timeout` -- seconds (default 60)

### Callback Signature

```typescript
type HookCallback = (
  input: HookInput,
  toolUseID: string | undefined,
  options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;
```

Python: `async def callback(input_data, tool_use_id, context) -> dict`

### Hook Output

- Return `{}` -- allow the operation
- `{ hookSpecificOutput: { permissionDecision: "deny", permissionDecisionReason: "..." } }` -- block
- `{ hookSpecificOutput: { permissionDecision: "allow", updatedInput: {...} } }` -- modify input (must include
  `permissionDecision: "allow"`)
- `{ systemMessage: "..." }` -- inject context into conversation
- `{ async: true }` -- fire-and-forget for side effects (agent doesn't wait)

**Priority:** deny > ask > allow. If any hook returns deny, operation is blocked.

### Hook Input Fields

All hook inputs share: `session_id`, `cwd`, `hook_event_name`, `transcript_path`. Tool hooks add: `tool_name`,
`tool_input`, `tool_use_id`. `PostToolUse` adds `tool_response`. Subagent hooks include `agent_id`, `agent_type`.

## Custom Tools

Define tools via in-process MCP servers using the `tool()` helper and `createSdkMcpServer()` /
`create_sdk_mcp_server()`.

### Defining a Tool

**TypeScript:**

```typescript
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const getTemp = tool(
  "get_temperature",
  "Get current temperature at a location",
  { latitude: z.number(), longitude: z.number() },
  async (args) => ({
    content: [{ type: "text", text: `Temperature: ${result}` }],
  }),
  { annotations: { readOnlyHint: true } }
);

const server = createSdkMcpServer({
  name: "weather",
  version: "1.0.0",
  tools: [getTemp],
});
```

**Python:**

```python
from claude_agent_sdk import tool, create_sdk_mcp_server

@tool("get_temperature", "Get current temperature", {"latitude": float, "longitude": float})
async def get_temperature(args):
    return {"content": [{"type": "text", "text": f"Temperature: {result}"}]}

server = create_sdk_mcp_server(name="weather", version="1.0.0", tools=[get_temperature])
```

### Tool Components

- **Name:** unique identifier Claude uses to call it
- **Description:** what it does (Claude reads this to decide when to call)
- **Input schema:** Zod schema (TS) or dict/JSON Schema (Python)
- **Handler:** async function returning `{ content: [...], isError?: boolean }`
- **Annotations (optional):** `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`

### Tool Result Content Blocks

- **`text`** — fields: `type`, `text`. Text result.
- **`image`** — fields: `type`, `data`, `mimeType`. Base64-encoded image.
- **`resource`** — fields: `type`, `resource.uri`, `resource.text` or `resource.blob`. Named content.

### Error Handling

- **Throw/raise:** agent loop stops, `query()` fails
- **Return `isError: true`:** agent loop continues, Claude sees error and can retry

### Registering with Claude

Pass the server to `mcpServers` and list tools in `allowedTools`:

```typescript
options: {
  mcpServers: { weather: server },
  allowedTools: ["mcp__weather__get_temperature"]
}
```

Tool name pattern: `mcp__{server_name}__{tool_name}`. Wildcard: `mcp__weather__*`.

### Tool Access Layers

| Option            | Layer        | Effect                                                        |
| ----------------- | ------------ | ------------------------------------------------------------- |
| `tools`           | Availability | Which built-ins appear in context (MCP tools unaffected)      |
| `allowedTools`    | Permission   | Auto-approve listed tools; unlisted fall through to perm flow |
| `disallowedTools` | Permission   | Always deny; tool stays visible but calls rejected            |

## MCP Servers

Connect to external MCP servers for databases, browsers, APIs, etc.

### Transport Types

**stdio** -- local process via stdin/stdout:

```typescript
mcpServers: {
  github: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
  }
}
```

**HTTP/SSE** -- remote servers:

```typescript
mcpServers: {
  "remote-api": {
    type: "sse",  // or "http"
    url: "https://api.example.com/mcp/sse",
    headers: { Authorization: `Bearer ${token}` }
  }
}
```

**SDK MCP server** -- in-process (see Custom Tools above).

### Configuration Sources

- **In code:** pass to `mcpServers` option directly
- **Config file:** `.mcp.json` at project root, loaded when `settingSources` includes `"project"`

### Authentication

- **stdio servers:** pass credentials via `env` field
- **HTTP/SSE servers:** pass via `headers` field
- **OAuth2:** complete flow in your app, pass access token in `Authorization` header

### Error Detection

Check the `system:init` message for MCP server connection status:

```typescript
if (message.type === "system" && message.subtype === "init") {
  const failed = message.mcp_servers.filter((s) => s.status !== "connected");
}
```

### Tool Search

When many MCP tools are configured, tool search loads definitions on demand to save context window space. Enabled by
default.

## Subagents

Separate agent instances spawned by the main agent for focused subtasks.

### Defining Subagents

Pass `agents` in options plus `"Agent"` in `allowedTools`:

```typescript
agents: {
  "code-reviewer": {
    description: "Expert code reviewer for quality and security reviews.",
    prompt: "Analyze code quality and suggest improvements.",
    tools: ["Read", "Glob", "Grep"],
    model: "sonnet"
  }
}
```

### AgentDefinition Fields

| Field             | Required | Type                                         | Purpose                                    |
| ----------------- | -------- | -------------------------------------------- | ------------------------------------------ |
| `description`     | Yes      | `string`                                     | When to use this agent (Claude reads this) |
| `prompt`          | Yes      | `string`                                     | Agent's system prompt                      |
| `tools`           | No       | `string[]`                                   | Allowed tools (omit = inherit all)         |
| `disallowedTools` | No       | `string[]`                                   | Tools to deny (TS only)                    |
| `model`           | No       | `"sonnet" \| "opus" \| "haiku" \| "inherit"` | Model override                             |
| `skills`          | No       | `string[]`                                   | Skills to preload                          |
| `memory`          | No       | `"user" \| "project" \| "local"`             | Memory source (Python only)                |
| `mcpServers`      | No       | `(string \| config)[]`                       | MCP servers by name or inline config       |
| `maxTurns`        | No       | `number`                                     | Max agentic turns (TS only)                |

### What Subagents Inherit

| Receives                                           | Does NOT receive                            |
| -------------------------------------------------- | ------------------------------------------- |
| Its own system prompt + Agent tool's prompt        | Parent conversation history or tool results |
| Project CLAUDE.md (via `settingSources`)           | Skills (unless in `AgentDefinition.skills`) |
| Tool definitions (inherited or subset via `tools`) | Parent's system prompt                      |

### Invocation

- **Automatic:** Claude delegates based on `description` field
- **Explicit:** mention by name in prompt: "Use the code-reviewer agent to..."
- **Detection:** check for `tool_use` blocks where `name` is `"Agent"`; messages from subagents have
  `parent_tool_use_id`

### Resuming Subagents

Capture `session_id` and `agentId` from first query. Resume with `resume: sessionId` and mention the agent ID in prompt.
Must resume same session.

Subagents cannot spawn their own subagents. Do not include `Agent` in a subagent's `tools`.

## Plugins

Load custom plugins from local directories:

```typescript
plugins: [
  { type: "local", path: "./my-plugin" },
  { type: "local", path: "/absolute/path/to/plugin" }
]
```

Plugin path must point to the root directory containing `.claude-plugin/plugin.json`. Skills from plugins are namespaced
as `plugin-name:skill-name`.

Verify loading via the `system:init` message's `plugins` and `slash_commands` fields.

## Skills in the SDK

Skills are markdown files loaded on demand from the filesystem. To use:

1. Set `settingSources` to include `"project"` and/or `"user"`
2. Include `"Skill"` in `allowedTools`
3. Skills in `.claude/skills/` or `~/.claude/skills/` are discovered automatically

The SDK has no programmatic API for registering skills -- they must be filesystem artifacts. The `allowed-tools`
frontmatter field in `SKILL.md` only works in CLI, not SDK.

## Settings Sources

Controls which filesystem-based settings the SDK loads. **Default: none loaded** (full isolation).

| Source      | Loads from                       | Includes                                       |
| ----------- | -------------------------------- | ---------------------------------------------- |
| `"project"` | `<cwd>/.claude/` (+ parent dirs) | CLAUDE.md, rules, skills, hooks, settings.json |
| `"user"`    | `~/.claude/`                     | User CLAUDE.md, rules, skills, user settings   |
| `"local"`   | `<cwd>/`                         | CLAUDE.local.md, settings.local.json           |

To match full Claude Code CLI behavior: `["user", "project", "local"]`.

Settings precedence (highest to lowest): local > project > user. Programmatic options always override filesystem
settings.

## Streaming Output

Enable real-time token streaming with `includePartialMessages: true` / `include_partial_messages=True`.

When enabled, `StreamEvent` / `SDKPartialAssistantMessage` messages are yielded containing raw Claude API events.

### Event Flow

```
StreamEvent (message_start)
StreamEvent (content_block_start) - text block
StreamEvent (content_block_delta) - text chunks (type: text_delta)
StreamEvent (content_block_delta) - more chunks...
StreamEvent (content_block_stop)
AssistantMessage - complete message
... tool executes ...
ResultMessage - final result
```

### Key Event Types

- `content_block_start` — block type (`text` or `tool_use`) and name
- `content_block_delta` — `text_delta` (text chunks) or `input_json_delta` (tool input)
- `content_block_stop` — end of block
- `message_delta` — stop reason, usage

### Limitations

- **Extended thinking:** when `thinking` is explicitly set to `enabled`, `StreamEvent` messages are not emitted
- **Structured output:** JSON appears only in `ResultMessage.structured_output`, not as streaming deltas

## Structured Outputs

Define a JSON Schema for the output shape. The agent uses tools freely and returns validated JSON at the end.

```typescript
options: {
  outputFormat: {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        items: { type: "array", items: { type: "string" } }
      },
      required: ["name", "items"]
    }
  }
}
```

Result appears in `ResultMessage.structured_output` on success.

### Type-Safe Schemas

- **TypeScript:** use Zod, convert with `z.toJSONSchema()`, parse with `Schema.safeParse()`
- **Python:** use Pydantic, convert with `Model.model_json_schema()`, parse with `Model.model_validate()`

### Error Handling

Check `ResultMessage.subtype`:

- `"success"` -- output generated and validated
- `"error_max_structured_output_retries"` -- agent couldn't produce valid output

## Message Types

### Core Messages

- **`SDKSystemMessage`** (type: `"system"`) — session init (includes tools, MCP, model)
- **`SDKAssistantMessage`** (type: `"assistant"`) — Claude's response (text + tool calls)
- **`SDKResultMessage`** (type: `"result"`) — final result with cost, usage, session_id
- **`SDKPartialAssistantMessage`** (type: `"stream_event"`) — streaming delta (when partial messages on)
- **`SDKCompactBoundaryMessage`** (type: `"system"`, `compact_boundary`) — conversation compacted

### Result Subtypes

- **`success`** — task completed; `result` field has output
- **`error_max_turns`** — hit `maxTurns` limit
- **`error_during_execution`** — error or interruption during execution
- **`error_max_budget_usd`** — hit `maxBudgetUsd` limit
- **`error_max_structured_output_retries`** — could not produce valid structured output

### ResultMessage Fields (success)

`session_id`, `duration_ms`, `duration_api_ms`, `num_turns`, `result`, `total_cost_usd`, `usage`, `modelUsage`,
`permission_denials`, `structured_output`.

## Built-in Tools

- `Read` — read files
- `Write` — create new files
- `Edit` — precise edits to existing files
- `Bash` — run terminal commands
- `Monitor` — watch background script output as events
- `Glob` — find files by pattern
- `Grep` — search file contents with regex
- `WebSearch` — search the web
- `WebFetch` — fetch and parse web pages
- `AskUserQuestion` — ask the user clarifying questions
- `Skill` — load and execute skills
- `Agent` — invoke subagents

## Key Type Definitions

### ThinkingConfig

```typescript
type ThinkingConfig =
  | { type: "adaptive" }          // Claude decides when to think (default)
  | { type: "enabled"; budget_tokens: number }  // Fixed budget
  | { type: "disabled" };         // No thinking
```

### McpServerConfig

```typescript
type McpServerConfig =
  | { type?: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
  | { type: "sse"; url: string; headers?: Record<string, string> }
  | { type: "http"; url: string; headers?: Record<string, string> }
  | McpSdkServerConfigWithInstance;  // In-process SDK server
```

### SettingSource

```typescript
type SettingSource = "user" | "project" | "local";
```

### SdkPluginConfig

```typescript
type SdkPluginConfig = { type: "local"; path: string };
```

### PermissionMode

```typescript
type PermissionMode =
  | "default"
  | "acceptEdits"
  | "bypassPermissions"
  | "plan"
  | "dontAsk"
  | "auto";  // TypeScript only
```

Python omits `"auto"`.

## Non-Interactive Mode (Headless / `claude -p`)

Formerly called "headless mode". Runs a single prompt and exits — used in CI, scripts, pipes. The Agent SDK is the
Python/TypeScript equivalent of `claude -p`.

### `--output-format stream-json`

Emits a JSONL event stream. The `system/init` event is the first message (unless `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` is
set, in which case `plugin_install` events precede it).

**`init` event fields:**

| Field           | Type   | Description                                                                        |
| --------------- | ------ | ---------------------------------------------------------------------------------- |
| `type`          | string | Always `"system"`                                                                  |
| `subtype`       | string | Always `"init"`                                                                    |
| `model`         | string | Active model                                                                       |
| `tools`         | array  | Tools available to Claude                                                          |
| `mcp_servers`   | array  | Connected MCP servers                                                              |
| `plugins`       | array  | Plugins that loaded successfully — each `{ name, path }`                           |
| `plugin_errors` | array  | Plugin load-time errors — each `{ plugin, type, message }`. Key omitted when empty |
| `session_id`    | string | Session identifier                                                                 |

**`plugin_errors` covers two cases:**

- **Dependency demotions** (v2.1.111+): plugin demoted because its dependency version requirements aren't satisfied.
- **`--plugin-dir` load failures** (v2.1.128+): missing path, invalid archive (`.zip` archives accepted from v2.1.128).

Affected plugins are demoted and absent from `plugins`. Use this field to fail CI when a plugin did not load.

### `CLAUDE_CODE_FORK_SUBAGENT=1`

Enables forked subagents — a subagent that inherits the full conversation history instead of starting fresh. Drops the
input isolation that subagents otherwise provide; the fork sees the same system prompt, tools, model, and message
history. Only the fork's final result returns to the main context.

- v2.1.117+ — works in interactive mode and on external builds
- **v2.1.121+** — works in non-interactive `claude -p` and via the Agent SDK

When enabled, Claude spawns a fork wherever it would otherwise use the general-purpose subagent. Named subagents
(Explore, etc.) still spawn as before. All subagent spawns run in the background — set
`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` to keep spawns synchronous.

## SDK Differences: TypeScript vs Python

| Capability                 | TypeScript                                                                                   | Python                            |
| -------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------- |
| Entry points               | `query()` only                                                                               | `query()` + `ClaudeSDKClient`     |
| Session continuity         | `continue: true` option                                                                      | `ClaudeSDKClient` context manager |
| Interrupt support          | Via `Query.interrupt()`                                                                      | Via `ClaudeSDKClient.interrupt()` |
| `auto` permission mode     | Yes                                                                                          | No                                |
| Session persistence toggle | `persistSession: false`                                                                      | Not available (always persists)   |
| `SessionStart/End` hooks   | Yes (programmatic)                                                                           | No (filesystem hooks only)        |
| TS-only hook events        | `Setup`, `TeammateIdle`, `TaskCompleted`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove` | --                                |
| Tool input schema          | Zod schemas                                                                                  | Dict or JSON Schema               |
| Structured output schemas  | Zod + `z.toJSONSchema()`                                                                     | Pydantic + `.model_json_schema()` |
| V2 preview                 | `createSession()` with `send`/`stream`                                                       | Not available                     |

## Common Patterns

### Read-only analysis agent

```typescript
options: {
  allowedTools: ["Read", "Glob", "Grep"],
  permissionMode: "dontAsk"
}
```

### Full automation (sandboxed)

```typescript
options: {
  allowedTools: ["Read", "Edit", "Bash", "Glob", "Grep"],
  permissionMode: "bypassPermissions",
  allowDangerouslySkipPermissions: true
}
```

### Load project context

```typescript
options: {
  systemPrompt: { type: "preset", preset: "claude_code" },
  settingSources: ["user", "project"]
}
```

### Custom tools + built-in tools

```typescript
options: {
  mcpServers: { myTools: myServer },
  allowedTools: ["Read", "Edit", "mcp__myTools__*"]
}
```
