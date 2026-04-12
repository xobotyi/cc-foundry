# Skills

Skills are prompt templates in `SKILL.md` that extend Claude's capabilities. They load on-demand: Claude sees only
`name` and `description` at startup, then loads the full SKILL.md content when triggered by description match or direct
`/skill-name` invocation.

## Skill Locations

- **Enterprise** — managed settings (system paths). All users in your organization.
- **Personal** — `~/.claude/skills/<name>/SKILL.md`. All your projects.
- **Project** — `.claude/skills/<name>/SKILL.md`. This project only.
- **Plugin** — `<plugin>/skills/<name>/SKILL.md`. Where plugin is enabled.

Priority when names collide: enterprise > personal > project. Plugin skills use `plugin-name:skill-name` namespace, so
they cannot conflict with other levels. If a `.claude/commands/` file and a skill share the same name, the skill takes
precedence.

### Nested Discovery

Claude Code automatically discovers skills from nested `.claude/skills/` directories when working with files in
subdirectories. Editing a file in `packages/frontend/` also discovers skills in `packages/frontend/.claude/skills/`.
This supports monorepo setups where packages have their own skills.

### Skills from Additional Directories

The `--add-dir` flag grants file access, not configuration discovery — but skills are an exception: `.claude/skills/`
within an added directory is loaded automatically and picked up by live change detection. Other `.claude/` configuration
(subagents, commands, output styles) is not loaded from additional directories.

## Directory Structure

```
skill-name/
├── SKILL.md              # Required: main instructions
├── references/           # Optional: deep reference material
│   └── *.md
├── scripts/              # Optional: executable code
│   └── helper.py
└── examples/             # Optional: example outputs
    └── sample.md
```

`SKILL.md` is the only required file. Other files are referenced from SKILL.md so Claude knows when to load them. Keep
SKILL.md under 500 lines; move detailed reference material to separate files.

## Frontmatter Fields

All fields are optional. Only `description` is recommended so Claude knows when to use the skill.

- **`name`** (string, default: directory name) — display name. Lowercase letters, numbers, hyphens only (max 64 chars).
  Cannot start/end with hyphen. No consecutive hyphens. Cannot contain `anthropic` or `claude`.
- **`description`** (string, default: first paragraph) — what the skill does and when to use it. Claude uses this to
  decide when to apply the skill. Truncated at 250 chars in listing.
- **`argument-hint`** (string) — hint shown during autocomplete: `[issue-number]` or `[filename] [format]`.
- **`disable-model-invocation`** (boolean, default: `false`) — prevent Claude from auto-triggering. Also removes the
  description from context entirely.
- **`user-invocable`** (boolean, default: `true`) — show in `/` menu. Setting `false` hides from menu but does NOT block
  the Skill tool.
- **`allowed-tools`** (string or list) — tools Claude can use without per-use approval when skill is active.
  Space-separated string or YAML list.
- **`model`** (string, default: inherited) — model to use when skill is active.
- **`effort`** (string, default: inherited) — effort level override. Options: `low`, `medium`, `high`, `max` (Opus 4.6
  only).
- **`context`** (string, default: inline) — set to `fork` to run in a forked subagent context.
- **`agent`** (string, default: `general-purpose`) — subagent type when `context: fork`. Built-in: `Explore`, `Plan`,
  `general-purpose`. Or any custom agent from `.claude/agents/`.
- **`hooks`** (object) — hooks scoped to this skill's lifecycle. Same format as hooks in settings.
- **`paths`** (string or list) — glob patterns that limit when skill auto-activates. Comma-separated string or YAML
  list. Same format as path-specific rules.
- **`shell`** (string, default: `bash`) — shell for `` !`command` `` and ` ```! ` blocks. Options: `bash`, `powershell`.
  PowerShell requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`.

## Invocation Control

Two frontmatter fields control who can invoke a skill:

| Frontmatter                      | User can invoke | Claude can invoke | Context loading                                              |
| :------------------------------- | :-------------- | :---------------- | :----------------------------------------------------------- |
| (default)                        | Yes             | Yes               | Description always in context, full skill loads when invoked |
| `disable-model-invocation: true` | Yes             | No                | Description not in context, full skill loads when you invoke |
| `user-invocable: false`          | No              | Yes               | Description always in context, full skill loads when invoked |

- `disable-model-invocation: true` — for workflows with side effects or timing control: deploy, commit, send-message.
  Prevents Claude from deciding to run it automatically.
- `user-invocable: false` — for background knowledge that is not actionable as a command. Claude loads it when relevant,
  but users have no reason to invoke it directly.

`user-invocable: false` hides from the `/` menu but does NOT block the Skill tool. To block programmatic invocation
entirely, use `disable-model-invocation: true`.

### Restricting Skill Access

Three mechanisms to control which skills Claude can invoke:

- **Disable all skills** — add `Skill` to deny rules in `/permissions`
- **Allow/deny specific skills** — permission rules: `Skill(name)` for exact match, `Skill(name *)` for prefix match
  with any arguments
- **Hide individual skills** — `disable-model-invocation: true` in frontmatter removes from Claude's context entirely

### Description Budget

Skill descriptions share a character budget: 1% of context window (fallback 8,000 chars). All skill names are always
included, but descriptions are shortened to fit. Each entry is capped at 250 chars regardless of budget. Override with
`SLASH_COMMAND_TOOL_CHAR_BUDGET` env var. Run `/context` to check for excluded skills.

## String Substitutions

Dynamic values available in skill content (the markdown body, not frontmatter):

- **`$ARGUMENTS`** — all arguments passed when invoking. If not present in content, appended as `ARGUMENTS: <value>`.
- **`$ARGUMENTS[N]`** — specific argument by 0-based index: `$ARGUMENTS[0]` for the first.
- **`$N`** — shorthand for `$ARGUMENTS[N]`: `$0` for first, `$1` for second.
- **`${CLAUDE_SESSION_ID}`** — current session ID. For logging, session-specific files, or correlation.
- **`${CLAUDE_SKILL_DIR}`** — directory containing the skill's SKILL.md. For plugin skills, the skill subdirectory
  within the plugin, not the plugin root.

Indexed arguments use shell-style quoting: wrap multi-word values in quotes to pass as a single argument.
`/my-skill "hello world" second` makes `$0` = `hello world`, `$1` = `second`. `$ARGUMENTS` always expands to the full
argument string as typed.

If a skill is invoked with arguments but the content does not include `$ARGUMENTS`, Claude Code appends
`ARGUMENTS: <your input>` to the end of the skill content.

## Dynamic Context Injection

The `` !`<command>` `` syntax runs shell commands before the skill content is sent to Claude. The command output
replaces the placeholder — Claude receives actual data, not the command.

```markdown
## Pull request context

- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`
```

Execution order:

1. Each `` !`<command>` `` executes immediately (before Claude sees anything)
2. The output replaces the placeholder in skill content
3. Claude receives the fully-rendered prompt with actual data

For multi-line commands, use a fenced code block opened with ` ```! `:

````markdown
## Environment

```!
node --version
npm --version
git status --short
```
````

**Disabling shell execution:** Set `"disableSkillShellExecution": true` in settings. Each command is replaced with
`[shell command execution disabled by policy]`. Bundled and managed skills are not affected. Most useful in managed
settings where users cannot override.

## Subagent Execution

Add `context: fork` to frontmatter to run the skill in an isolated subagent. The skill content becomes the subagent's
prompt. The subagent has no access to conversation history.

`context: fork` only makes sense for skills with explicit task instructions. A skill containing only guidelines (e.g.
"use these API conventions") without a task gives the subagent nothing actionable.

The `agent` field selects the execution environment:

- **`Explore`** — haiku model, read-only tools. Codebase research, exploration.
- **`Plan`** — inherited model, read-only tools. Design, planning.
- **`general-purpose`** — inherited model, all tools. Multi-step tasks (default).
- **Custom agent name** — per agent model and tools. Specialized roles.

### Skills vs Subagents (Direction of Composition)

| Approach                     | System prompt                             | Task                        | Also loads                   |
| :--------------------------- | :---------------------------------------- | :-------------------------- | :--------------------------- |
| Skill with `context: fork`   | From agent type (`Explore`, `Plan`, etc.) | SKILL.md content            | CLAUDE.md                    |
| Subagent with `skills` field | Subagent's markdown body                  | Claude's delegation message | Preloaded skills + CLAUDE.md |

With `context: fork`: you write the task in your skill and pick an agent type to execute it. With subagent `skills`
field: you define a custom agent that uses skills as reference material.

## Skill Content Lifecycle

When invoked, the rendered SKILL.md content enters the conversation as a single message and stays for the rest of the
session. Claude Code does not re-read the file on later turns — write guidance as standing instructions, not one-time
steps.

### Compaction Behavior

Auto-compaction carries invoked skills forward within a token budget. After compaction:

- Claude Code re-attaches the most recent invocation of each skill after the summary
- Each skill keeps the first 5,000 tokens
- Combined budget: 25,000 tokens across all re-attached skills
- Budget fills starting from the most recently invoked skill — older skills can be dropped entirely

If a skill stops influencing behavior, re-invoke it after compaction to restore full content.

## Pre-Approving Tools

The `allowed-tools` field grants permission for listed tools while the skill is active. It does not restrict available
tools — every tool remains callable, and permission settings still govern unlisted tools.

Accepts tool names with glob patterns:

```yaml
allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *)
```

To block a skill from using certain tools, add deny rules in permission settings.

## Extended Thinking

Include the word `ultrathink` anywhere in skill content to enable extended thinking mode when the skill is active.

## Sharing and Distribution

- **Project skills** — commit `.claude/skills/` to version control
- **Plugins** — create a `skills/` directory in your plugin
- **Managed** — deploy organization-wide through managed settings

## Bundled Skills

Claude Code includes bundled skills available in every session. Unlike built-in commands (fixed logic), bundled skills
are prompt-based: they give Claude a playbook and let it orchestrate work using tools.

Bundled skills from the commands reference:

- **`/batch`** — orchestrate large-scale parallel changes across a codebase using git worktrees
- **`/claude-api`** — load Claude API reference for your project's language and Managed Agents reference
- **`/debug`** — enable debug logging and troubleshoot issues by reading session debug log
- **`/loop`** — run a prompt repeatedly on an interval, or self-paced
- **`/simplify`** — review changed files for code reuse, quality, and efficiency, then fix issues

## Custom Commands (Legacy)

Files at `.claude/commands/<name>.md` still work and support the same frontmatter as skills. Skills are recommended
since they support additional features: directory for supporting files, frontmatter for invocation control, and
automatic activation. If a skill and a command share the same name, the skill takes precedence.

## MCP Prompts as Commands

MCP servers can expose prompts that appear as commands using the format `/mcp__<server>__<prompt>`. These are
dynamically discovered from connected servers.
