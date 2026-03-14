# Model Configuration Reference

Configure which Claude model runs in Claude Code, control effort levels, manage extended context, and pin versions for
third-party providers.

## Model Aliases

- `default` — depends on account tier. Always available, even with `availableModels`.
- `sonnet` — latest Sonnet (4.6). Daily coding tasks.
- `opus` — latest Opus (4.6). Complex reasoning tasks.
- `haiku` — latest Haiku. Fast, simple tasks.
- `sonnet[1m]` — Sonnet with 1M context. Long sessions, large codebases.
- `opusplan` — Opus + Sonnet hybrid. Opus in plan mode, Sonnet in execution.

Aliases always track the latest version. Pin with full model name (e.g., `claude-opus-4-6`) or override env vars.

---

## Setting the Model

Methods listed by precedence (highest first):

- `/model` command — syntax: `/model <alias|name>`. Scope: current session.
- `--model` flag — syntax: `claude --model <alias|name>`. Scope: startup.
- `ANTHROPIC_MODEL` — environment variable. Scope: shell environment.
- Settings `model` — `"model": "opus"` in settings. Scope: persistent.

---

## Default Model by Account Type

- Max, Team Premium — Opus 4.6
- Pro, Team Standard — Sonnet 4.6
- Pay-as-you-go (API) — Sonnet 4.5
- Enterprise — Opus 4.6 available, not default

Claude Code may auto-fallback from Opus to Sonnet at usage thresholds.

---

## Enterprise Model Restrictions

Set `availableModels` in managed or policy settings to restrict selectable models. Applies to `/model`, `--model`, and
`ANTHROPIC_MODEL`.

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

- Plan mode — `opus`. Complex reasoning, architecture.
- Execution — `sonnet`. Code generation, implementation.

Set via any model-setting method: `/model opusplan`, `--model opusplan`, `ANTHROPIC_MODEL=opusplan`, or
`"model": "opusplan"` in settings.

---

## Effort Levels

Control Opus 4.6 adaptive reasoning depth. Only supported on Opus.

- `low` — faster, cheaper; straightforward tasks
- `medium` — balanced reasoning
- `high` — deepest reasoning; complex problems (default)

**Setting effort:**

- `/model` picker — left/right arrow keys for effort slider
- Environment variable — `CLAUDE_CODE_EFFORT_LEVEL=low|medium|high`
- Settings — `"effortLevel": "low|medium|high"`

---

## Extended Context (1M Tokens)

**Beta:** Features, pricing, and availability may change.

Supported on Opus 4.6 and Sonnet 4.6. Append `[1m]` to any alias or full model name: `sonnet[1m]`,
`claude-sonnet-4-6[1m]`.

**Billing:** Standard rates up to 200K tokens. Beyond 200K, long-context pricing applies. Subscribers pay via extra
usage, not subscription.

**Availability:**

- API / pay-as-you-go — full access
- Pro, Max, Teams, Enterprise — requires extra usage enabled

---

## Model Override Environment Variables

Override which concrete model each alias resolves to. Values must be full model names (or provider-specific
equivalents).

- `ANTHROPIC_DEFAULT_OPUS_MODEL` — `opus` alias; `opusplan` in plan mode
- `ANTHROPIC_DEFAULT_SONNET_MODEL` — `sonnet` alias; `opusplan` in execution mode
- `ANTHROPIC_DEFAULT_HAIKU_MODEL` — `haiku` alias; background functionality
- `CLAUDE_CODE_SUBAGENT_MODEL` — model used by subagents

`ANTHROPIC_SMALL_FAST_MODEL` is deprecated — use `ANTHROPIC_DEFAULT_HAIKU_MODEL`.

---

## Third-Party Provider Model Pinning

When using Bedrock, Vertex AI, or Foundry, pin all three alias overrides to provider-specific version IDs. Without
pinning, new Anthropic model releases can silently break users who lack access to the latest version.

- Bedrock — `us.anthropic.claude-opus-4-6-v1`
- Vertex AI — `claude-opus-4-6`
- Foundry — `claude-opus-4-6`

Apply the same pattern to `ANTHROPIC_DEFAULT_SONNET_MODEL` and `ANTHROPIC_DEFAULT_HAIKU_MODEL`.

`availableModels` filtering matches on alias name (`opus`, `sonnet`, `haiku`), not the provider-specific model ID.

---

## Prompt Caching Environment Variables

Claude Code uses prompt caching by default. Disable globally or per-model tier.

- `DISABLE_PROMPT_CACHING` — `1` to disable all caching (overrides others)
- `DISABLE_PROMPT_CACHING_HAIKU` — `1` to disable for Haiku only
- `DISABLE_PROMPT_CACHING_SONNET` — `1` to disable for Sonnet only
- `DISABLE_PROMPT_CACHING_OPUS` — `1` to disable for Opus only

Global `DISABLE_PROMPT_CACHING` takes precedence over per-model variables.

---

## Checking Current Model

- Status line — if configured (see statusline reference)
- `/status` — shows model and account information
