# Model Configuration Reference

Configure which Claude model runs in Claude Code, control effort levels,
manage extended context, and pin versions for third-party providers.

## Model Aliases

| Alias          | Resolves To                | Notes                                        |
|----------------|----------------------------|----------------------------------------------|
| `default`      | Depends on account tier    | Always available, even with `availableModels` |
| `sonnet`       | Latest Sonnet (4.6)        | Daily coding tasks                           |
| `opus`         | Latest Opus (4.6)          | Complex reasoning tasks                      |
| `haiku`        | Latest Haiku               | Fast, simple tasks                           |
| `sonnet[1m]`   | Sonnet with 1M context     | Long sessions, large codebases               |
| `opusplan`     | Opus + Sonnet hybrid       | Opus in plan mode, Sonnet in execution       |

Aliases always track the latest version. Pin with full model name
(e.g., `claude-opus-4-6`) or override env vars.

---

## Setting the Model

Methods listed by precedence (highest first):

| Method              | Syntax                          | Scope              |
|---------------------|---------------------------------|--------------------|
| `/model` command    | `/model <alias\|name>`          | Current session    |
| `--model` flag      | `claude --model <alias\|name>`  | Startup            |
| `ANTHROPIC_MODEL`   | Environment variable            | Shell environment  |
| Settings `model`    | `"model": "opus"` in settings   | Persistent         |

---

## Default Model by Account Type

| Account Type              | Default Model |
|---------------------------|---------------|
| Max, Team Premium         | Opus 4.6      |
| Pro, Team Standard        | Sonnet 4.6    |
| Pay-as-you-go (API)       | Sonnet 4.5    |
| Enterprise                | Opus 4.6 available, not default |

Claude Code may auto-fallback from Opus to Sonnet at usage thresholds.

---

## Enterprise Model Restrictions

Set `availableModels` in managed or policy settings to restrict selectable models.
Applies to `/model`, `--model`, and `ANTHROPIC_MODEL`.

```json
{
  "model": "sonnet",
  "availableModels": ["sonnet", "haiku"]
}
```

- `default` is never restricted — always available regardless of `availableModels`
- Empty array `[]` still allows `default` for the user's tier
- Arrays merge and deduplicate across settings scopes
- Managed/policy settings take highest priority for strict enforcement

---

## `opusplan` Mode

Automated hybrid that switches models based on plan mode state:

| Mode       | Model Used | Purpose                              |
|------------|------------|--------------------------------------|
| Plan mode  | `opus`     | Complex reasoning, architecture      |
| Execution  | `sonnet`   | Code generation, implementation      |

Set via any model-setting method: `/model opusplan`, `--model opusplan`,
`ANTHROPIC_MODEL=opusplan`, or `"model": "opusplan"` in settings.

---

## Effort Levels

Control Opus 4.6 adaptive reasoning depth. Only supported on Opus.

| Level    | Behavior                                          |
|----------|---------------------------------------------------|
| `low`    | Faster, cheaper — straightforward tasks           |
| `medium` | Balanced reasoning                                |
| `high`   | Deepest reasoning — complex problems (default)    |

**Setting effort:**

| Method                    | How                                              |
|---------------------------|--------------------------------------------------|
| `/model` picker           | Left/right arrow keys for effort slider          |
| Environment variable      | `CLAUDE_CODE_EFFORT_LEVEL=low\|medium\|high`     |
| Settings                  | `"effortLevel": "low\|medium\|high"`             |

---

## Extended Context (1M Tokens)

**Beta:** Features, pricing, and availability may change.

Supported on Opus 4.6 and Sonnet 4.6. Append `[1m]` to any alias or full
model name: `sonnet[1m]`, `claude-sonnet-4-6[1m]`.

**Billing:** Standard rates up to 200K tokens. Beyond 200K, long-context
pricing applies. Subscribers pay via extra usage, not subscription.

**Availability:**

| Account Type                         | Access                              |
|--------------------------------------|-------------------------------------|
| API / pay-as-you-go                  | Full access                         |
| Pro, Max, Teams, Enterprise          | Requires extra usage enabled        |

---

## Model Override Environment Variables

Override which concrete model each alias resolves to. Values must be full
model names (or provider-specific equivalents).

| Variable                           | Controls                                       |
|------------------------------------|-------------------------------------------------|
| `ANTHROPIC_DEFAULT_OPUS_MODEL`     | `opus` alias; `opusplan` in plan mode           |
| `ANTHROPIC_DEFAULT_SONNET_MODEL`   | `sonnet` alias; `opusplan` in execution mode    |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL`    | `haiku` alias; background functionality         |
| `CLAUDE_CODE_SUBAGENT_MODEL`       | Model used by subagents                         |

`ANTHROPIC_SMALL_FAST_MODEL` is deprecated — use `ANTHROPIC_DEFAULT_HAIKU_MODEL`.

---

## Third-Party Provider Model Pinning

When using Bedrock, Vertex AI, or Foundry, pin all three alias overrides to
provider-specific version IDs. Without pinning, new Anthropic model releases
can silently break users who lack access to the latest version.

| Provider   | Example value for `ANTHROPIC_DEFAULT_OPUS_MODEL`  |
|------------|----------------------------------------------------|
| Bedrock    | `us.anthropic.claude-opus-4-6-v1`                  |
| Vertex AI  | `claude-opus-4-6`                                  |
| Foundry    | `claude-opus-4-6`                                  |

Apply the same pattern to `ANTHROPIC_DEFAULT_SONNET_MODEL` and
`ANTHROPIC_DEFAULT_HAIKU_MODEL`.

`availableModels` filtering matches on alias name (`opus`, `sonnet`, `haiku`),
not the provider-specific model ID.

---

## Prompt Caching Environment Variables

Claude Code uses prompt caching by default. Disable globally or per-model tier.

| Variable                          | Effect                                        |
|-----------------------------------|-----------------------------------------------|
| `DISABLE_PROMPT_CACHING`         | `1` to disable all caching (overrides others) |
| `DISABLE_PROMPT_CACHING_HAIKU`   | `1` to disable for Haiku only                 |
| `DISABLE_PROMPT_CACHING_SONNET`  | `1` to disable for Sonnet only                |
| `DISABLE_PROMPT_CACHING_OPUS`    | `1` to disable for Opus only                  |

Global `DISABLE_PROMPT_CACHING` takes precedence over per-model variables.

---

## Checking Current Model

| Method      | How                                                |
|-------------|----------------------------------------------------|
| Status line | If configured (see statusline reference)           |
| `/status`   | Shows model and account information                |
