# Claude-Specific Techniques

Claude-specific API features, parameter mechanics, and technique combinations. Not covered in general prompting
references.

---

## System Prompt API

Claude's API uses a top-level `system` parameter — not a message role:

```json
{
  "model": "claude-opus-4-8",
  "system": "You are a code reviewer...",
  "messages": [{ "role": "user", "content": "Review this PR..." }]
}
```

- System content is processed before any messages; it has highest authority
- Supports array format for multiple blocks with cache control markers (see Prompt Caching)
- No equivalent to OpenAI's `instructions` parameter — use `system` directly
- `system` content does NOT persist across requests when using stateless API; pass it every turn

**Mid-conversation system messages (Opus 4.8):** append `{"role": "system", "content": "..."}` to `messages` to inject
an operator instruction — a mode switch, updated constraints, runtime-fetched context. Unlike editing the top-level
`system` (which invalidates the entire cached prefix), a system message sits after the history and preserves the cache.
It is also the non-spoofable operator channel — text embedded in a user turn can be forged by anything that writes user
input. Phrase these as context, not overrides ("This project's codebase is Go" beats "ignore what the user said").
Unsupported models return a 400; fall back to a `<system-reminder>` block in the user turn.

**vs. OpenAI:** OpenAI's `instructions` parameter (Responses API) scopes to the current request and doesn't persist
across `previous_response_id` chains. Claude's `system` is always explicitly passed per request — same behavior, more
explicit contract.

---

## Prefilling Assistant Turns (removed on current models)

Prefilling — seeding the response with a partial `assistant` message as the last message — **returns a 400 error on
Claude 4.6+ models and Claude Fable 5**. It remains functional only on legacy models (Sonnet 4.5 and earlier). Assistant
messages elsewhere in the conversation (few-shot examples) are unaffected.

**Migration map — what the prefill did → what replaces it:**

- Forcing JSON/YAML/schema output → structured outputs (`output_config.format`); for classification, a tool with an enum
  field of valid labels
- Skipping preamble (`Here is the summary:\n`) → system prompt instruction: "Respond directly without preamble. Do not
  start with phrases like 'Here is...' or 'Based on...'"
- Steering around bad refusals → no longer needed; current models refuse far more appropriately
- Continuing an interrupted response → move into the user turn: "Your previous response was interrupted and ended with
  `[last text]`. Continue from there."
- Context hydration / role reinforcement → inject into the user turn, or hydrate via tools / during compaction in
  agentic systems

---

## Extended Thinking

Extended thinking enables Claude to reason internally before producing its visible response.

**Adaptive thinking (the only mode on current models):**

```json
{
  "model": "claude-opus-4-8",
  "max_tokens": 16000,
  "thinking": { "type": "adaptive" },
  "output_config": { "effort": "high" },
  "messages": [...]
}
```

- Claude dynamically determines when and how much to think based on `effort` and request complexity
- Automatically enables interleaved thinking (reasoning between tool calls)
- Per-model defaults when `thinking` is omitted: **Fable 5** — thinking always on (omit the parameter; explicit
  `disabled` returns 400); **Sonnet 5** — runs adaptive; **Opus 4.7/4.8** — runs without thinking (set adaptive
  explicitly)
- Use `output_config.effort` (not `budget_tokens`) to guide thinking depth
- Previous assistant turns don't need to start with thinking blocks (more flexible than manual mode)

**Manual thinking (legacy models only):**

- `thinking: {type: "enabled", budget_tokens: N}` — fixed reasoning budget (minimum 1,024; must be < `max_tokens`)
- Deprecated on Opus 4.6 / Sonnet 4.6; **returns 400 on Opus 4.7+, Sonnet 5, and Fable 5**
- `max_tokens` remains a strict hard limit on total output (thinking + response text) in every mode

**Thinking display:**

- `display: "omitted"` — empty thinking field, signature only (**default on current models** — Fable 5, Opus 4.8/4.7,
  Sonnet 5); to a streaming UI this looks like a long pause before output
- `display: "summarized"` — returns a readable summary; set explicitly if reasoning is surfaced to users or logs
- `display` controls visibility only — thinking happens and is billed identically either way
- On Fable 5 the raw chain of thought is never returned; asking the model to echo its reasoning in the response can
  trigger a `reasoning_extraction` refusal — read `thinking` blocks instead

**Streaming with thinking:**

- `thinking_delta` events deliver thinking content; `signature_delta` delivers encrypted signature
- `redacted_thinking` blocks — distinct block type with encrypted `data` field; safety-redacted reasoning
- Pass thinking blocks back unchanged in multi-turn tool-use conversations; filter code must handle both
  `block.type == "thinking"` AND `block.type == "redacted_thinking"`
- With `display: "omitted"`, no `thinking_delta` events are emitted; only signature arrives

**Prompting for thinking models:**

- Prefer general instructions ("think thoroughly") over prescriptive step-by-step plans — Claude's reasoning frequently
  exceeds what a human would prescribe
- Use `<thinking>` tags inside few-shot examples to demonstrate desired reasoning style
- Ask Claude to self-check: "Before you finish, verify your answer against [criteria]"
- Thinking triggering is promptable — add system prompt guidance to steer frequency
- Do not use explicit CoT ("think step by step") — it's redundant and may degrade quality

---

## Effort Parameter

A generally available parameter that controls Claude's token spending across ALL response types — text, tool calls, and
thinking. Lives inside `output_config`, not top-level.

```json
{
  "model": "claude-opus-4-8",
  "thinking": { "type": "adaptive" },
  "output_config": { "effort": "medium" },
  "messages": [...]
}
```

**Effort levels:**

- `max` — absolute maximum capability, no constraints on token spending; can show diminishing returns and overthinking —
  test before committing
- `xhigh` — extended capability for long-horizon work; **the recommended setting for hard coding and agentic tasks**
  (Fable 5, Mythos 5, Opus 4.8/4.7, Sonnet 5 only); set a large `max_tokens` (64k+) so the model has room to think and
  act
- `high` (default) — balances token usage and intelligence; equivalent to omitting the parameter; minimum for
  intelligence-sensitive work
- `medium` — cost-saving step-down (Sonnet 5 at `medium` ≈ Sonnet 4.6 at `high`)
- `low` — short, scoped, latency-sensitive tasks; good for subagents and classification

**Key behaviors:**

- Effort is a behavioral signal, not a strict token budget — Claude still thinks on hard problems at low effort
- At `high`+ Claude almost always thinks; at `low` it may skip thinking entirely for simple queries
- Lower effort: fewer tool calls, terse confirmations, no preamble. Higher effort: more tool use, detailed summaries,
  more comprehensive output
- Current models respect effort strictly, especially at the low end — they scope work to what was asked. If you see
  shallow reasoning on complex problems, **raise effort rather than prompting around it**
- Effort replaces `budget_tokens` as the thinking-depth control on all current models

**vs. OpenAI reasoning:** OpenAI exposes a categorical `reasoning_effort` dial (GPT-5.1+ adds a `none` mode for
low-latency paths). Both platforms now steer reasoning depth with categorical effort levels, not token budgets.

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

- 512 tokens — Fable 5, Mythos 5
- 1,024 tokens — Opus 4.8, Sonnet 5, Sonnet 4.6, Sonnet 4.5
- 2,048 tokens — Opus 4.7
- 4,096 tokens — Opus 4.6, Opus 4.5, Haiku 4.5

Below the threshold, requests process without caching and without error — verify via `cache_read_input_tokens` in the
response usage.

**TTL options:**

- 5-minute (default) — refreshed for no additional cost on each cache hit
- 1-hour — specify `"ttl": "1h"` in the `cache_control` object; costs 2x base input price
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

Current models (Fable 5, Mythos 5, Opus 4.8/4.7/4.6, Sonnet 5, Sonnet 4.6) have a **1M-token context window by default**
— no beta header, standard pricing. Older models (Sonnet 4.5, Haiku 4.5) have 200k.

**Maximum output tokens:**

- Current 1M-context models — 128k output tokens (streaming required for large outputs)
- Haiku 4.5 — 64k output tokens
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

| Dimension         | Claude                                           | OpenAI (Responses API)                             |
| ----------------- | ------------------------------------------------ | -------------------------------------------------- |
| System prompt     | Top-level `system` param                         | `instructions` param or `developer` role message   |
| Authority model   | `system` > `user` > `assistant`                  | `developer` > `user` > `assistant`                 |
| Prefilling        | Removed on current models (400); legacy only     | Not supported                                      |
| Reasoning control | `output_config.effort` + adaptive thinking       | `reasoning_effort` (`none` on 5.1+ through `high`) |
| Prompt caching    | Explicit + automatic `cache_control`             | Automatic (position-based)                         |
| Structured output | `output_config.format` + `strict: true` on tools | `response_format` with JSON schema                 |

**When prompting Claude after OpenAI experience:**

- Both platforms use categorical effort levels; Claude also supports `xhigh` and `max`
- OpenAI's `developer` role is equivalent to Claude's `system` parameter (not a message role)
- OpenAI few-shot in `developer` message maps directly to Claude few-shot in `system` parameter
- Claude thinking models prefer goal statements; avoid explicit step-by-step CoT instructions
