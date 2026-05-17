# Model Configuration

Complete reference for Claude Code model selection, aliases, effort levels, extended context, and related environment
variables.

## Model Aliases

- **`default`** — clears any model override, reverts to recommended model for account type. Not itself a model alias.
- **`best`** — most capable available model (currently equivalent to `opus`)
- **`sonnet`** — latest Sonnet model (currently Sonnet 4.6)
- **`opus`** — latest Opus model (currently Opus 4.6)
- **`haiku`** — fast, efficient Haiku model for simple tasks
- **`sonnet[1m]`** — Sonnet with 1 million token context window
- **`opus[1m]`** — Opus with 1 million token context window
- **`opusplan`** — Opus during plan mode, Sonnet during execution mode

Aliases always point to the latest version. To pin to a specific version, use a full model name (e.g.,
`claude-opus-4-6`) or set `ANTHROPIC_DEFAULT_OPUS_MODEL`.

## Setting the Model

Priority order (highest to lowest):

1. **During session** -- `/model <alias|name>`
2. **At startup** -- `claude --model <alias|name>`
3. **Environment variable** -- `ANTHROPIC_MODEL=<alias|name>`
4. **Settings file** -- `model` field in settings JSON

```bash
# Start with Opus
claude --model opus

# Switch to Sonnet during session
/model sonnet
```

Settings file example:

```json
{
  "model": "opus"
}
```

## Default Model Behavior

The `default` setting resolves differently by account type:

- **Max, Team Premium** — Opus 4.6
- **Pro, Team Standard** — Sonnet 4.6
- **Enterprise** — Opus 4.6 available but not default

Claude Code may automatically fall back to Sonnet if you hit a usage threshold with Opus.

## Opusplan Mode

The `opusplan` alias provides automated hybrid routing:

- **Plan mode** -- uses `opus` for complex reasoning and architecture decisions
- **Execution mode** -- switches to `sonnet` for code generation and implementation

The Opus model used in plan mode is controlled by `ANTHROPIC_DEFAULT_OPUS_MODEL`. The Sonnet model used in execution
mode is controlled by `ANTHROPIC_DEFAULT_SONNET_MODEL`.

## Effort Levels

Effort levels control adaptive reasoning -- dynamically allocating thinking based on task complexity.

### Available Levels

- **`low`** — faster, cheaper. Best for straightforward tasks. Persists across sessions.
- **`medium`** — balanced. Default for Pro and Max subscribers. Persists across sessions.
- **`high`** — deeper reasoning. Default for API key, Team, Enterprise, third-party provider users. Persists across
  sessions.
- **`max`** — deepest reasoning, no constraint on token spending. Slower and more expensive. Opus 4.6 only. Does not
  persist (except via env var).

### Setting Effort

- `/effort low|medium|high|max|auto` -- change level during session (`auto` resets to model default)
- `/model` picker -- left/right arrow keys adjust the effort slider
- `--effort low|medium|high|max` -- set for a single session at launch
- `CLAUDE_CODE_EFFORT_LEVEL=low|medium|high|max|auto` -- environment variable (highest precedence)
- `effortLevel` in settings file -- `"low"`, `"medium"`, or `"high"`
- Skill/subagent frontmatter `effort` field -- overrides session level when that skill/subagent is active (does not
  override env var)

Precedence: environment variable > configured level > model default. Frontmatter effort applies when that skill/subagent
is active, overriding session level but not the environment variable.

### One-Off Deep Reasoning

Include "ultrathink" in your prompt to trigger high effort for that turn. No effect if session is already at high or
max.

### Disabling Adaptive Reasoning

Set `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` to revert Opus 4.6 and Sonnet 4.6 to the previous fixed thinking budget
controlled by `MAX_THINKING_TOKENS`.

### Supported Models

Effort is supported on Opus 4.6 and Sonnet 4.6. The effort slider appears in `/model` when a supported model is
selected. Current effort level is displayed next to the logo and spinner (e.g., "with low effort").

## Extended Context (1M)

Opus 4.6 and Sonnet 4.6 support a 1 million token context window for long sessions with large codebases.

### Availability by Plan

| Plan                  | Opus 4.6 with 1M           | Sonnet 4.6 with 1M   |
| --------------------- | -------------------------- | -------------------- |
| Max, Team, Enterprise | Included with subscription | Requires extra usage |
| Pro                   | Requires extra usage       | Requires extra usage |
| API / pay-as-you-go   | Full access                | Full access          |

On Max, Team, and Enterprise plans, Opus is automatically upgraded to 1M context with no additional configuration (both
Team Standard and Team Premium seats).

### Enabling 1M Context

Use the `[1m]` suffix with aliases or full model names:

```bash
/model opus[1m]
/model sonnet[1m]
/model claude-opus-4-6[1m]
```

The option also appears in the `/model` picker if your account supports it.

### Disabling 1M Context

Set `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` to remove 1M model variants from the model picker.

### Pricing

Standard model pricing with no premium for tokens beyond 200K. Subscription-included plans stay covered by subscription.
Extra usage plans bill tokens to extra usage.

## Restricting Model Selection

Enterprise administrators use `availableModels` in managed or policy settings to restrict which models users can select.

```json
{
  "availableModels": ["sonnet", "haiku"]
}
```

When set, users cannot switch to unlisted models via `/model`, `--model`, Config tool, or `ANTHROPIC_MODEL`.

### Default Always Available

The Default option in the model picker is unaffected by `availableModels`. It always remains available and resolves to
the system default for the user's subscription tier. Even with `availableModels: []`, users can still use Default.

### Full Model Control

To fully control the model experience, combine three settings:

- **`availableModels`** -- restricts which named models users can switch to
- **`model`** -- sets the initial model selection when a session starts
- **`ANTHROPIC_DEFAULT_SONNET_MODEL` / `ANTHROPIC_DEFAULT_OPUS_MODEL` / `ANTHROPIC_DEFAULT_HAIKU_MODEL`** -- control
  what Default and the aliases resolve to

Example: start users on Sonnet 4.5, limit picker to Sonnet and Haiku, pin Default to Sonnet 4.5:

```json
{
  "model": "claude-sonnet-4-5",
  "availableModels": ["claude-sonnet-4-5", "haiku"],
  "env": {
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-5"
  }
}
```

Without the `env` block, selecting Default would get the latest Sonnet release, bypassing the version pin.

### Merge Behavior

When `availableModels` is set at multiple levels (user settings and project settings), arrays are merged and
deduplicated. To enforce a strict allowlist, set `availableModels` in managed or policy settings (highest priority).

### Mantle Model IDs

When the Bedrock Mantle endpoint is enabled, entries in `availableModels` starting with `anthropic.` are added to the
`/model` picker as custom options and routed to the Mantle endpoint. Include standard aliases alongside Mantle IDs since
the setting still restricts the picker to listed entries.

## Custom Model Option

`ANTHROPIC_CUSTOM_MODEL_OPTION` adds a single custom entry to the `/model` picker without replacing built-in aliases.
Useful for LLM gateway deployments or testing unlisted model IDs.

- **`ANTHROPIC_CUSTOM_MODEL_OPTION`** (required) — model ID string (any string your API endpoint accepts, no validation)
- **`ANTHROPIC_CUSTOM_MODEL_OPTION_NAME`** (optional) — display name in picker. Defaults to model ID.
- **`ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION`** (optional) — description in picker. Defaults to
  `Custom model (<model-id>)`.

```bash
export ANTHROPIC_CUSTOM_MODEL_OPTION="my-gateway/claude-opus-4-6"
export ANTHROPIC_CUSTOM_MODEL_OPTION_NAME="Opus via Gateway"
export ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION="Custom deployment routed through the internal LLM gateway"
```

The custom entry appears at the bottom of the `/model` picker.

## Model Override Environment Variables

Control which model names the aliases resolve to. Values must be full model names (or equivalent for your API provider).

- **`ANTHROPIC_DEFAULT_OPUS_MODEL`** — controls `opus` alias; `opusplan` when Plan Mode is active
- **`ANTHROPIC_DEFAULT_SONNET_MODEL`** — controls `sonnet` alias; `opusplan` when Plan Mode is not active
- **`ANTHROPIC_DEFAULT_HAIKU_MODEL`** — controls `haiku` alias; background functionality
- **`CLAUDE_CODE_SUBAGENT_MODEL`** — model used for subagents

`ANTHROPIC_SMALL_FAST_MODEL` is deprecated in favor of `ANTHROPIC_DEFAULT_HAIKU_MODEL`.

## Third-Party Provider Pinning

When deploying through Bedrock, Vertex AI, or Foundry, pin model versions before rolling out to users. Without pinning,
aliases resolve to the latest version, and users may see fallback notices (Bedrock/Vertex) or errors (Foundry) when a
new model is not yet enabled.

Set all three model environment variables to provider-specific version IDs:

- **Bedrock** — `export ANTHROPIC_DEFAULT_OPUS_MODEL='us.anthropic.claude-opus-4-6-v1'`
- **Vertex AI** — `export ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-6'`
- **Foundry** — `export ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-6'`

Apply the same pattern for `ANTHROPIC_DEFAULT_SONNET_MODEL` and `ANTHROPIC_DEFAULT_HAIKU_MODEL`.

### Enabling 1M Context with Pinned Models

Append `[1m]` to the model ID:

```bash
export ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-6[1m]'
```

The `[1m]` suffix applies 1M context to all usage of that alias (including `opusplan`). Claude Code strips the suffix
before sending the model ID to the provider. Only use `[1m]` when the model supports it (Opus 4.6, Sonnet 4.6).

The `settings.availableModels` allowlist still applies with third-party providers. Filtering matches on the alias
(`opus`, `sonnet`, `haiku`), not the provider-specific model ID.

## Pinned Model Display and Capabilities

When pinning on a third-party provider, the provider-specific ID appears as-is in the `/model` picker and Claude Code
may not recognize supported features. Override display and declare capabilities with companion environment variables.

These variables only take effect on third-party providers (Bedrock, Vertex AI, Foundry). No effect on Anthropic API
directly.

### Display Variables

Available for each of `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and
`ANTHROPIC_DEFAULT_HAIKU_MODEL`:

- **`_NAME`** — display name in `/model` picker. Defaults to model ID.
- **`_DESCRIPTION`** — display description. Defaults to `Custom <tier> model`.
- **`_SUPPORTED_CAPABILITIES`** — comma-separated capability list (see below).

### Capability Values

- **`effort`** — effort levels and the `/effort` command
- **`max_effort`** — the `max` effort level
- **`thinking`** — extended thinking
- **`adaptive_thinking`** — adaptive reasoning (dynamic thinking allocation)
- **`interleaved_thinking`** — thinking between tool calls

When `_SUPPORTED_CAPABILITIES` is set, listed capabilities are enabled and unlisted are disabled. When unset, Claude
Code falls back to built-in detection based on model ID.

### Example

```bash
export ANTHROPIC_DEFAULT_OPUS_MODEL='arn:aws:bedrock:us-east-1:123456789012:custom-model/abc'
export ANTHROPIC_DEFAULT_OPUS_MODEL_NAME='Opus via Bedrock'
export ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION='Opus 4.6 routed through a Bedrock custom endpoint'
export ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES='effort,max_effort,thinking,adaptive_thinking,interleaved_thinking'
```

## modelOverrides Setting

Maps individual Anthropic model IDs to provider-specific strings. Use for governance, cost allocation, or regional
routing when you need per-version control (as opposed to per-family control via environment variables).

```json
{
  "modelOverrides": {
    "claude-opus-4-6": "arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/opus-prod",
    "claude-opus-4-5-20251101": "arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/opus-45-prod",
    "claude-sonnet-4-6": "arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/sonnet-prod"
  }
}
```

**Key rules:**

- Keys must be Anthropic model IDs (include date suffix for dated IDs exactly as listed in Models overview)
- Unknown keys are silently ignored
- Overrides replace built-in model IDs backing each `/model` picker entry
- On Bedrock, overrides take precedence over auto-discovered inference profiles
- Values supplied directly through `ANTHROPIC_MODEL`, `--model`, or `ANTHROPIC_DEFAULT_*_MODEL` are passed as-is and are
  NOT transformed by `modelOverrides`
- Works alongside `availableModels` -- the allowlist evaluates against the Anthropic model ID, not the override value

## Prompt Caching Configuration

Claude Code automatically uses prompt caching. Disable globally or per model tier:

- **`DISABLE_PROMPT_CACHING`** — set to `1` to disable for all models (overrides per-model settings)
- **`DISABLE_PROMPT_CACHING_HAIKU`** — set to `1` to disable for Haiku only
- **`DISABLE_PROMPT_CACHING_SONNET`** — set to `1` to disable for Sonnet only
- **`DISABLE_PROMPT_CACHING_OPUS`** — set to `1` to disable for Opus only

The global variable takes precedence over per-model settings. Per-model settings are useful for selective control (e.g.,
debugging specific models or working with providers that have different caching implementations).

## Checking Current Model

- Status line (if configured)
- `/status` command (also displays account information)
