# Output Style Specification

Technical reference for Claude Code output style files: format, fields, storage, activation, scope, and SDK usage.

## File Format

Output styles are Markdown files with YAML frontmatter. The frontmatter supplies metadata; the body is injected directly
into Claude's system prompt — **replacing** the default style instructions, not augmenting them.

```markdown
---
name: My Custom Style
description: A brief description shown in the /config picker
keep-coding-instructions: false
---

# Custom Style Instructions

You are an interactive CLI tool that helps users with software engineering tasks.

## Behaviors

[Define tone, formatting, interaction patterns...]
```

## Frontmatter Fields

- **`name`** — Display name for the style. Shown in the `/config` picker. Defaults to the filename (without `.md`).
- **`description`** — One-line description shown in the `/config` picker. Optional but strongly recommended.
- **`keep-coding-instructions`** — Boolean. When `true`, preserves the coding-specific section of the default system
  prompt (safety guidance, code quality rules, test verification). Default: `false`. Added in Claude Code v2.0.37.
  Built-in styles have this implicitly `true`.
- **`force-for-plugin`** — Boolean. Plugin-shipped styles only: applies the style automatically whenever the plugin is
  enabled, without the user selecting it. Overrides the user's `outputStyle` setting; if multiple enabled plugins set
  it, the first one loaded wins. Default: `false`.

## What Output Styles Replace vs. Preserve

**Replaced (with custom instructions):**

- Personality and tone
- Task prioritization and interaction patterns
- Formatting and response structure
- Coding workflow instructions (unless `keep-coding-instructions: true`)

**Always preserved regardless of style:**

- All tools (Bash, Read, Edit, Glob, Grep, Write, etc.)
- CLAUDE.md project and user instructions
- Subagent delegation mechanics
- MCP server connections
- Skills (loaded separately from styles)
- Environment context (working directory, git status)

`keep-coding-instructions: true` re-adds the safety, code quality, and test verification guidance that custom styles
normally drop. Use it when your style is a persona overlay rather than a domain switch.

## Storage Paths

Styles are discovered from four locations:

- **Project level** — `.claude/output-styles/*.md`. Every `.claude/output-styles/` between the working directory and the
  repository root is loaded; on a name conflict the directory closest to the working directory wins (v2.1.178+).
- **User level** — `~/.claude/output-styles/*.md`
- **Managed policy** — `.claude/output-styles/` inside the managed settings directory
- **Plugin level** — `<plugin>/output-styles/*.md` (shipped by installed plugins)

Project-level styles shadow user-level styles with the same name. Plugins can ship output styles in their
`output-styles/` directory, making them available to all users who install the plugin — and can auto-apply one via the
`force-for-plugin` frontmatter field.

## Activation Methods

### Interactive session

Run `/config`, select **Output style**, pick from the list. Saved to `.claude/settings.local.json`.

The standalone `/output-style` command was deprecated in v2.1.73 and removed in v2.1.91; its `/output-style:new`
scaffolding companion is gone with it. `/config` and the `outputStyle` setting are the only activation paths — create
style files manually.

### settings.json

```json
{
  "outputStyle": "Explanatory"
}
```

The `outputStyle` key accepts the style's display name (from frontmatter `name` or filename). Can be set at project
level (`.claude/settings.json`) or user level (`~/.claude/settings.json`).

### CLI flag

`--append-system-prompt` appends content to the prompt but does **not** replace the default system prompt. It is not
equivalent to an output style — it is additive, not substitutive.

## Session Timing and Reminders

The output style is baked into the system prompt at session start. Changes to the style file or `outputStyle` setting
take effect after `/clear` or a new session — not mid-conversation. Changing the style mid-session neither applies nor
invalidates the prompt cache: Claude keeps using the style loaded at session start. This keeps the system prompt stable
within a session so prompt caching can reduce latency and cost.

All output styles trigger periodic reminders during the conversation, reinforcing adherence to the style instructions.

## Token Impact

Output styles affect token usage in two ways:

- **Input tokens** — Style instructions are added to the system prompt, increasing input tokens. Prompt caching
  mitigates this: after the first request in a session, cached prompt prefixes reduce cost.
- **Output tokens** — Depends on what the style instructs. Built-in Explanatory and Learning styles produce longer
  responses than Default by design. Custom styles control this entirely through their instructions.

Keep style instructions concise. Every token in the style body is repeated in the system prompt for every request in the
session.

## Scope Priority

When multiple settings files define `outputStyle`, Claude Code resolves by scope precedence (highest wins):

1. `.claude/settings.local.json` (local project, gitignored — set by `/config` interactively)
2. `.claude/settings.json` (project-level, committed)
3. `~/.claude/settings.json` (user-level)
4. Managed/enterprise settings (lowest)

## Built-in Styles Catalog

- **Default** — The standard Claude Code system prompt. Software engineering focus. Active when no style is selected.
- **Proactive** — Executes immediately, makes reasonable assumptions instead of pausing for routine decisions, prefers
  action over planning. Stronger autonomous-execution guidance than auto mode applies, and works without changing the
  permission mode — permission prompts still appear before tools run.
- **Explanatory** — Inserts educational "Insights" alongside task completion. Explains implementation choices and
  codebase patterns. Produces longer responses than Default by design.
- **Learning** — Collaborative learn-by-doing mode. Provides Insights and places `TODO(human)` markers for the user to
  implement strategic code pieces themselves.

Built-in styles always have `keep-coding-instructions: true` implicitly — they extend the default prompt rather than
replace it.

## Comparison: Output Styles vs. Related Features

| Mechanism                | Replaces default prompt | Persistence   | Scope           |
| ------------------------ | ----------------------- | ------------- | --------------- |
| Output style             | Yes (selective)         | File on disk  | User or project |
| CLAUDE.md                | No (user message after) | File on disk  | Project or user |
| `--append-system-prompt` | No (appends)            | CLI flag only | Session         |
| `systemPrompt` (append)  | No (appends)            | Code          | SDK session     |
| Custom `systemPrompt`    | Yes (full replacement)  | Code          | SDK session     |

CLAUDE.md content is added as a user message following the system prompt — it does not modify the system prompt itself.
`--append-system-prompt` appends to the prompt without removing anything. Only output styles (and custom `systemPrompt`)
actually replace the default.

## Agent SDK Integration

The SDK default behavior uses a minimal system prompt — essential tool instructions only, without coding guidelines or
response style. The `claude_code` preset loads the full Claude Code prompt, but does **not** by itself load output
styles — styles load through setting sources. Default `query()` options enable both `user` and `project` sources; when
you set `settingSources` explicitly, include the level your style lives at.

Four approaches for controlling the system prompt via SDK:

### 1. Output styles via file (persistent)

Write a style file to `~/.claude/output-styles/` or `.claude/output-styles/`, then load it by including `settingSources`
in SDK options:

```typescript
for await (const message of query({
  prompt: "...",
  options: {
    systemPrompt: { type: "preset", preset: "claude_code" },
    settingSources: ["user"], // loads ~/.claude/output-styles/*
  },
})) {
}
```

- **`settingSources: ["user"]`** — loads `~/.claude/output-styles/`
- **`settingSources: ["project"]`** — loads `.claude/output-styles/`

To activate a loaded style programmatically (TypeScript only), set `outputStyle` inside the inline `settings` object —
it is not a top-level `Options` field:

```typescript
const options = { settings: { outputStyle: "Code Reviewer" } };
```

The Python SDK has no programmatic style selection — set `outputStyle` in `.claude/settings.local.json`, or fall back to
`append` / a custom prompt string for code-only deployments.

### 2. CLAUDE.md via settingSources

Not an output style, but relevant: setting sources also control whether CLAUDE.md files are loaded. Default `query()`
options enable both `user` and `project`, so CLAUDE.md loads automatically; passing an explicit `settingSources` array
that omits them (or an empty array) disables it.

### 3. systemPrompt with append (session-only augmentation)

Preserves the full Claude Code default prompt and appends custom instructions. Does not replace anything.

```typescript
options: {
  systemPrompt: {
    type: "preset",
    preset: "claude_code",
    append: "Always include type hints and docstrings.",
  },
}
```

**Cache reuse across machines:** the preset embeds per-session context (working directory, git flag, platform, shell, OS
version, auto-memory paths) ahead of the `append` text, so identical configurations on different machines miss the
prompt cache. Set `excludeDynamicSections: true` (TS v0.2.98+ / Python `exclude_dynamic_sections`, v0.1.58+) to move
that context into the first user message, leaving a static, shareable system prompt. Applies only to the preset object
form. Tradeoff: environment context in a user message carries marginally less weight. CLI equivalent:
`--exclude-dynamic-system-prompt-sections`.

### 4. Custom systemPrompt (full replacement)

Replaces the entire system prompt. Tools are lost unless explicitly included. Use only for specialized agents where
default Claude Code behavior is unwanted.

```typescript
options: {
  systemPrompt: "You are a Python specialist. Follow these rules: ...",
}
```
