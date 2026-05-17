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

- **`name`** — Display name for the style. Shown in `/config` picker and `/output-style` command. Defaults to the
  filename (without `.md`).
- **`description`** — One-line description shown in the `/config` picker. Optional but strongly recommended.
- **`keep-coding-instructions`** — Boolean. When `true`, preserves the coding-specific section of the default system
  prompt (safety guidance, code quality rules, test verification). Default: `false`. Added in Claude Code v2.0.37.
  Built-in styles have this implicitly `true`.

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

Styles are discovered from three locations, checked in this order:

- **Project level** — `.claude/output-styles/*.md` (relative to project root)
- **User level** — `~/.claude/output-styles/*.md`
- **Plugin level** — `<plugin>/output-styles/*.md` (shipped by installed plugins)

Project-level styles shadow user-level styles with the same name. Plugins can ship output styles in their
`output-styles/` directory, making them available to all users who install the plugin.

## Activation Methods

### Interactive session

**Menu:** Run `/config`, select **Output style**, pick from list. Saved to `.claude/settings.local.json`.

**Command:** `/output-style <style-name>` activates by name.

**Create new:** `/output-style:new <description>` scaffolds a new style file.

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

The output style is applied at session start. It is baked into the system prompt when the session initializes. Changes
to the style file or `outputStyle` setting take effect the next time a new session starts — not mid-conversation. This
keeps the system prompt stable within a session so prompt caching can reduce latency and cost.

All output styles trigger periodic reminders during the conversation, reinforcing adherence to the style instructions.
This mechanism ensures the style's behavioral rules remain salient across long conversations where earlier system prompt
content might otherwise fade in influence.

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

The SDK default behavior uses a minimal system prompt — essential tool instructions only, without coding guidelines,
response style, or project context. The `claude_code` preset loads the full Claude Code prompt, but does **not**
automatically load output styles. Output styles require explicit `settingSources` configuration.

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

The `claude_code` preset alone does NOT load output styles — `settingSources` is required.

### 2. CLAUDE.md via settingSources

Not an output style, but relevant: `settingSources` also controls whether CLAUDE.md files are loaded. Without it, SDK
sessions have no project context.

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

### 4. Custom systemPrompt (full replacement)

Replaces the entire system prompt. Tools are lost unless explicitly included. Use only for specialized agents where
default Claude Code behavior is unwanted.

```typescript
options: {
  systemPrompt: "You are a Python specialist. Follow these rules: ...",
}
```
