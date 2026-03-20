# Model Configuration

## Model Aliases

- **`default`** -- recommended model based on account type
- **`sonnet`** -- latest Sonnet (currently Sonnet 4.6) for daily coding
- **`opus`** -- latest Opus (currently Opus 4.6) for complex reasoning
- **`haiku`** -- fast/efficient model for simple tasks
- **`sonnet[1m]`** -- Sonnet with 1M token context window
- **`opus[1m]`** -- Opus with 1M token context window
- **`opusplan`** -- Opus for plan mode, Sonnet for execution

Aliases always point to latest version. Pin with full model name (e.g., `claude-opus-4-6`) or env vars.

## Setting the Model

Priority order (highest first):

1. During session: `/model <alias|name>`
2. At startup: `claude --model <alias|name>`
3. Environment variable: `ANTHROPIC_MODEL=<alias|name>`
4. Settings file: `"model": "opus"`

## Restrict Model Selection

`availableModels` in managed/policy settings restricts which models users can select:

```json
{ "availableModels": ["sonnet", "haiku"] }
```

The Default option is unaffected by `availableModels`. When set at multiple levels, arrays merge and deduplicate.

Use `model` + `availableModels` together for full control:

```json
{ "model": "sonnet", "availableModels": ["sonnet", "haiku"] }
```

## Special Model Behavior

### `default` by Account Type

- **Max and Team Premium** -- defaults to Opus 4.6
- **Pro and Team Standard** -- defaults to Sonnet 4.6
- **Enterprise** -- Opus 4.6 available but not default

May fall back to Sonnet if you hit usage threshold with Opus.

### `opusplan`

- **Plan mode** -- uses Opus for reasoning/architecture
- **Execution mode** -- switches to Sonnet for code generation

## Effort Level

Controls adaptive reasoning depth. Persists across sessions (except `max`).

Levels: **low**, **medium**, **high**, **max** (Opus 4.6 only, current session only)

Setting methods:

- `/effort low|medium|high|max|auto`
- Arrow keys in `/model` picker
- `--effort` flag at launch
- `CLAUDE_CODE_EFFORT_LEVEL` env var (highest priority)
- `effortLevel` in settings
- `effort` in skill/subagent frontmatter (overrides session level)

Supported on Opus 4.6 and Sonnet 4.6. Current level shown next to logo/spinner.

Disable adaptive reasoning: `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` (reverts to fixed budget via
`MAX_THINKING_TOKENS`).

## Extended Context (1M Tokens)

Opus 4.6 and Sonnet 4.6 support 1M token context windows.

| Plan                  | Opus 4.6 1M          | Sonnet 4.6 1M        |
| --------------------- | -------------------- | -------------------- |
| Max, Team, Enterprise | Included             | Requires extra usage |
| Pro                   | Requires extra usage | Requires extra usage |
| API / pay-as-you-go   | Full access          | Full access          |

On Max/Team/Enterprise, Opus is automatically upgraded to 1M with no config needed.

Disable: `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`

Use `[1m]` suffix: `/model opus[1m]`, `/model claude-opus-4-6[1m]`

Standard pricing applies (no premium beyond 200K).

## Checking Current Model

- Status line (if configured)
- `/status` command

## Custom Model Option

Add a single custom entry to `/model` picker:

```bash
export ANTHROPIC_CUSTOM_MODEL_OPTION="my-gateway/claude-opus-4-6"
export ANTHROPIC_CUSTOM_MODEL_OPTION_NAME="Opus via Gateway"        # optional
export ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION="Custom deployment" # optional
```

Skips validation -- any string the API endpoint accepts works.

## Model Environment Variables

| Variable                         | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `ANTHROPIC_DEFAULT_OPUS_MODEL`   | Model for `opus` / `opusplan` plan mode        |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Model for `sonnet` / `opusplan` execution mode |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL`  | Model for `haiku` / background functionality   |
| `CLAUDE_CODE_SUBAGENT_MODEL`     | Model for subagents                            |

`ANTHROPIC_SMALL_FAST_MODEL` is deprecated in favor of `ANTHROPIC_DEFAULT_HAIKU_MODEL`.

### Pin Models for Third-Party Deployments

When using Bedrock, Vertex AI, or Foundry, set all three env vars to version-specific IDs to prevent breakage on new
releases:

| Provider  | Example                                                          |
| --------- | ---------------------------------------------------------------- |
| Bedrock   | `ANTHROPIC_DEFAULT_OPUS_MODEL='us.anthropic.claude-opus-4-6-v1'` |
| Vertex AI | `ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-6'`                 |
| Foundry   | `ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-6'`                 |

Append `[1m]` to enable extended context for pinned models.

### `modelOverrides` Setting

Map individual Anthropic model IDs to provider-specific IDs (e.g., Bedrock ARNs):

```json
{
  "modelOverrides": {
    "claude-opus-4-6": "arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/opus-prod",
    "claude-sonnet-4-6": "arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/sonnet-prod"
  }
}
```

Keys must be Anthropic model IDs. Overrides replace built-in IDs in `/model` picker. Values passed via
`ANTHROPIC_MODEL`, `--model`, or `ANTHROPIC_DEFAULT_*_MODEL` are NOT transformed by `modelOverrides`.

Works alongside `availableModels` (filtering matches on alias, not override value).

## Prompt Caching

Automatic prompt caching is enabled by default. Disable with env vars:

| Variable                        | Description             |
| ------------------------------- | ----------------------- |
| `DISABLE_PROMPT_CACHING`        | Disable for all models  |
| `DISABLE_PROMPT_CACHING_HAIKU`  | Disable for Haiku only  |
| `DISABLE_PROMPT_CACHING_SONNET` | Disable for Sonnet only |
| `DISABLE_PROMPT_CACHING_OPUS`   | Disable for Opus only   |

Global setting takes precedence over per-model settings.
