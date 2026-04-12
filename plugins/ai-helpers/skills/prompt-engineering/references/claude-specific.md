# Claude-Specific Techniques

Claude-specific API features, parameter mechanics, and technique combinations. Not covered in general prompting
references.

---

## System Prompt API

Claude's API uses a top-level `system` parameter — not a message role:

```json
{
  "model": "claude-opus-4-5",
  "system": "You are a code reviewer...",
  "messages": [{ "role": "user", "content": "Review this PR..." }]
}
```

- System content is processed before any messages; it has highest authority
- Supports array format for multiple blocks with cache control markers (see Prompt Caching)
- No equivalent to OpenAI's `instructions` parameter — use `system` directly
- `system` content does NOT persist across requests when using stateless API; pass it every turn

**vs. OpenAI:** OpenAI's `instructions` parameter (Responses API) scopes to the current request and doesn't persist
across `previous_response_id` chains. Claude's `system` is always explicitly passed per request — same behavior, more
explicit contract.

---

## Prefilling Assistant Turns

Claude allows seeding the assistant response by passing a partial `assistant` message as the last message:

```json
{
  "messages": [
    { "role": "user", "content": "What is the capital of France?" },
    { "role": "assistant", "content": "The capital of France is" }
  ]
}
```

Claude completes from that prefix. No other major API supports this natively.

**Rules:**

- Prefill must be the final message; role must be `assistant`
- Prefill is included in output token count
- Use for: forcing output format, skipping preamble, steering JSON/XML structure
- Do not use when streaming and latency matters — prefill is not returned in the stream (it was already sent by you)
- Prefill interacts with extended thinking: if thinking is enabled, prefill is applied after thinking, not before

**High-value patterns:**

- Force JSON: prefill with `{`
- Skip preamble: prefill with `Here is the` or the opening sentence
- Force XML wrapper: prefill with `<result>`
- Lock response language: prefill with the first word in target language

---

## Extended Thinking

Extended thinking enables Claude to reason internally before producing its visible response. Two modes exist:

**Adaptive thinking (recommended for Claude 4.6+):**

```json
{
  "model": "claude-opus-4-6",
  "max_tokens": 16000,
  "thinking": { "type": "adaptive" },
  "effort": "high",
  "messages": [...]
}
```

- Claude dynamically determines when and how much to think based on request complexity
- Automatically enables interleaved thinking (reasoning between tool calls)
- Default on Claude Mythos Preview; recommended on Opus 4.6 and Sonnet 4.6
- Use the `effort` parameter (not `budget_tokens`) to guide thinking depth
- Previous assistant turns don't need to start with thinking blocks (more flexible than manual mode)

**Manual thinking (legacy, deprecated on 4.6 models):**

```json
{
  "model": "claude-sonnet-4-5",
  "max_tokens": 16000,
  "thinking": { "type": "enabled", "budget_tokens": 10000 },
  "messages": [...]
}
```

- `budget_tokens` — target token count for internal reasoning (minimum: 1,024; must be < `max_tokens`)
- `max_tokens` is a strict hard limit on total output (thinking + response text)
- Deprecated on Opus 4.6 and Sonnet 4.6 — will be removed in a future release

**Thinking display (Claude 4 models):**

- `display: "summarized"` — returns summarized thinking (default on Claude 4 models)
- `display: "omitted"` — returns empty thinking field, signature only (default on Mythos Preview)
- Claude Sonnet 3.7 returns full thinking output; Claude 4 models return summaries only
- Full thinking access for Claude 4 requires contacting sales

**Streaming with thinking:**

- `thinking_delta` events deliver thinking content; `signature_delta` delivers encrypted signature
- `redacted_thinking` blocks — distinct block type with encrypted `data` field; safety-redacted reasoning
- Pass `redacted_thinking` blocks back unchanged in multi-turn tool-use conversations
- Filter code must include both `block.type == "thinking"` AND `block.type == "redacted_thinking"`
- With `display: "omitted"`, no `thinking_delta` events are emitted; only signature arrives

**Interleaved thinking:**

- Claude reasons between tool calls within a single assistant turn
- Automatic with adaptive mode on Opus 4.6, Sonnet 4.6, Mythos Preview
- Manual mode: requires `interleaved-thinking-2025-05-14` beta header on Sonnet 4.6; not available on Opus 4.6
- On Mythos Preview, inter-tool reasoning always lives inside thinking blocks

**Prompting for thinking models:**

- Prefer general instructions ("think thoroughly") over prescriptive step-by-step plans — Claude's reasoning frequently
  exceeds what a human would prescribe
- Use `<thinking>` tags inside few-shot examples to demonstrate desired reasoning style
- Ask Claude to self-check: "Before you finish, verify your answer against [criteria]"
- Thinking triggering is promptable — add system prompt guidance to steer frequency
- Do not use explicit CoT ("think step by step") — it's redundant and may degrade quality

---

## Effort Parameter

A separate, generally available parameter that controls Claude's token spending across ALL response types — text, tool
calls, and thinking. Works with or without extended thinking enabled.

```json
{
  "model": "claude-opus-4-6",
  "thinking": { "type": "adaptive" },
  "effort": "medium",
  "messages": [...]
}
```

**Supported models:** Claude Mythos Preview, Opus 4.6, Sonnet 4.6, Opus 4.5. No beta header required.

**Effort levels:**

- `max` — absolute maximum capability, no constraints on token spending. Opus 4.6, Sonnet 4.6, Mythos only
- `high` (default) — deep reasoning, complex tasks. Equivalent to omitting the parameter
- `medium` — balanced speed/cost/performance. Recommended default for Sonnet 4.6
- `low` — minimizes token spend, skips thinking for simple tasks. Good for subagents, classification

**Key behaviors:**

- Effort is a behavioral signal, not a strict token budget — Claude still thinks on hard problems at low effort
- At `high`/`max`, Claude almost always thinks; at `low`, it may skip thinking entirely for simple queries
- Lower effort: fewer tool calls, terse confirmations, no preamble
- Higher effort: detailed summaries, explains plans before acting, more comprehensive output
- For Opus 4.6 and Sonnet 4.6, effort replaces `budget_tokens` as the recommended thinking depth control

**vs. OpenAI reasoning:** OpenAI exposes `reasoning.effort` (`low`/`medium`/`high`) — a categorical dial similar to
Claude's effort. Both platforms now use categorical effort levels; Claude additionally supports `max` and retains the
(deprecated) `budget_tokens` for precise token-level control on older models.

---

## Prompt Caching

Caching lets Claude reuse KV-cache entries from prior requests, cutting latency and cost on repeated context. Caching
references the entire prompt — tools, system, then messages (in that order) — up to the cache breakpoint.

**Two modes:**

- **Automatic caching** — add `cache_control` at the top level of the request body. The system places the breakpoint on
  the last cacheable block and moves it forward as conversations grow. Best for multi-turn conversations.
- **Explicit breakpoints** — place `cache_control` on individual content blocks for fine-grained control over what gets
  cached at different change frequencies.

```json
{
  "system": [
    {
      "type": "text",
      "text": "You are a code assistant...<long context>",
      "cache_control": { "type": "ephemeral" }
    }
  ]
}
```

**Breakpoint rules:**

- Up to 4 explicit breakpoints per request (automatic caching consumes one slot if combined)
- Place breakpoint on the last block whose prefix is identical across requests
- Breakpoints themselves add no cost — you pay only for cache writes and reads
- **20-block lookback window** — on a cache miss at the breakpoint, the system walks backward up to 20 blocks to find a
  prior cache entry. In growing conversations, this keeps the cache moving forward automatically.

**Minimum cacheable token thresholds (vary by model):**

- 4,096 tokens — Opus 4.6, Opus 4.5, Haiku 4.5, Mythos Preview
- 2,048 tokens — Sonnet 4.6, Haiku 3.5
- 1,024 tokens — Sonnet 4.5, Opus 4.1, Opus 4, Sonnet 4, Sonnet 3.7

**TTL options:**

- 5-minute (default) — refreshed for no additional cost on each cache hit
- 1-hour — specify `"ttl": 3600` in the `cache_control` object; costs 2x base input price
- When mixing TTLs, longer TTL must appear before shorter in the prompt sequence

**Cost model:**

- 5-min cache write: 1.25x base input token price
- 1-hour cache write: 2x base input token price
- Cache read: 0.1x base input token price (90% savings)
- Break-even: a block written once and read 2+ times is net cheaper

**Cache invalidation hierarchy:** tools → system → messages. Changing a tool definition invalidates the entire cache.
Changing the system prompt invalidates system and message caches. Changing `tool_choice` or image presence also
invalidates.

**Optimal breakpoint placement:**

- Static content first: tool definitions, system instructions, reference documents
- Place breakpoint at the end of the static prefix, before variable content
- Do NOT place breakpoint on content that changes every request (timestamps, user messages)
- For multi-turn: automatic caching handles growing conversations; add a second explicit breakpoint if turns exceed 20
  blocks between writes

**vs. OpenAI prompt caching:** OpenAI caches automatically when stable content appears at the start of requests — no
explicit markup needed. Claude supports both automatic and explicit caching. Claude's explicit model gives control over
what gets cached and at what TTL; OpenAI's is simpler but less configurable.

---

## Context Window and Output Limits

All current Claude models support 200k token context windows.

**Maximum output tokens:**

- Opus 4.6, Mythos Preview — 128k output tokens
- Sonnet 4.6, Haiku 4.5 — 64k output tokens
- Batch API — 300k output for Opus 4.6 and Sonnet 4.6 with `output-300k-2026-03-24` beta header
- Interleaved thinking exception: when using interleaved thinking with tools, the token limit becomes the entire context
  window (can exceed standard max_tokens)

**Context window with thinking:**

- `max_tokens` is enforced as a strict limit (thinking + response text combined)
- Effective prompt budget = context window size - max_tokens
- Thinking blocks from previous turns are stripped and not counted toward the context window
- Current-turn thinking counts toward the max_tokens limit for that turn

**Token counting:**

- Use the `count_tokens` API endpoint before sending to verify fit
- Images consume tokens based on resolution; use lower resolution when content permits
- Tool definitions contribute to input token count — keep tools concise for large-context tasks

**Managing long contexts:**

- Place the most important content at the start and end of context — attention degrades in the middle ("lost in the
  middle" effect)
- For RAG: put retrieved documents before the user query, not after
- For multi-document tasks: summarize or extract before inserting; don't dump raw documents
- Truncate from the middle, not the end — preserve recency (end) and setup (start)

---

## Structured Outputs

Constrained decoding that guarantees schema-compliant JSON responses. Two complementary features:

- **JSON outputs** (`output_config.format`) — controls Claude's response format via JSON schema
- **Strict tool use** (`strict: true`) — guarantees tool inputs conform exactly to schema

**How it works:** The API compiles your JSON schema into a grammar artifact that masks invalid tokens during generation.
First request has additional latency for compilation; compiled grammars are cached for 24 hours.

**Limits per request:**

- 20 strict tools maximum
- 24 optional parameters total across all schemas
- 16 parameters with union types (`anyOf`)

**Incompatibilities:** structured outputs cannot be combined with citations or message prefilling.

**When output may break schema:**

- Safety refusal (`stop_reason: "refusal"`) — refusal takes precedence over schema
- Token limit reached (`stop_reason: "max_tokens"`) — output truncated before JSON closes
- Always set `max_tokens` significantly higher than expected output

**Grammar scope:** grammars apply only to Claude's direct text output, not to tool calls, tool results, or thinking
blocks. Grammar state resets between sections — Claude can think freely before producing structured output.

---

## Technique Combinations

**What works together:**

- Adaptive thinking + effort parameter: effort guides thinking depth; adaptive mode handles when to think
- Adaptive thinking + tool use: interleaved thinking reasons between tool calls automatically
- Structured outputs + extended thinking: grammar applies only to final output; thinking is unconstrained
- Prompt caching + RAG: cache the static retrieval corpus; only the query changes per request
- Prompt caching + adaptive thinking: consecutive adaptive requests preserve cache breakpoints
- System prompt + `<instructions>` XML tags in user turn: system sets role/persona, user-turn XML provides per-request
  task framing — clean separation without duplication
- Few-shot with `<thinking>` tags: examples shape both reasoning style and output format

**What conflicts:**

- Structured outputs + citations: returns 400 error
- Structured outputs + prefilling: incompatible
- Switching thinking modes (adaptive ↔ enabled ↔ disabled): breaks message cache (system/tool caches survive)
- Heavy few-shot + prompt caching: if examples vary across users, they can't be cached; move static examples to system
- Very low effort + complex multi-step tasks: Claude may skip thinking entirely, degrading quality

**Combining caching with thinking:**

- Cache the system prompt and static context
- Thinking blocks from previous turns are automatically stripped (not counted toward context)
- Set cache breakpoints before the user message, which includes the variable query
- 1-hour TTL useful for agentic workflows where sub-agents may take >5 minutes between requests

---

## Claude vs. OpenAI: Key Structural Differences

| Dimension         | Claude                                           | OpenAI (Responses API)                           |
| ----------------- | ------------------------------------------------ | ------------------------------------------------ |
| System prompt     | Top-level `system` param                         | `instructions` param or `developer` role message |
| Authority model   | `system` > `user` > `assistant`                  | `developer` > `user` > `assistant`               |
| Prefilling        | Supported (deprecated on 4.6 models)             | Not supported                                    |
| Reasoning control | `effort` param + adaptive thinking               | `reasoning.effort` (`low`/`medium`/`high`)       |
| Prompt caching    | Explicit + automatic `cache_control`             | Automatic (position-based)                       |
| Structured output | `output_config.format` + `strict: true` on tools | `response_format` with JSON schema               |

**When prompting Claude after OpenAI experience:**

- Both platforms now use categorical effort levels; Claude additionally supports `max`
- OpenAI's `developer` role is equivalent to Claude's `system` parameter (not a message role)
- Claude's prefill capability has no OpenAI equivalent (deprecated on 4.6 but functional on older models)
- OpenAI few-shot in `developer` message maps directly to Claude few-shot in `system` parameter
- Claude thinking models prefer goal statements; avoid explicit step-by-step CoT instructions
