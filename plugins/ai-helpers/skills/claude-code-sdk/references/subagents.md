# Subagents and Agent Teams

## Subagents

Subagents are isolated AI assistants that run in their own context window with a custom system prompt, specific tool
access, and independent permissions. The main agent delegates tasks to subagents; each works independently and returns
results. Subagents cannot spawn other subagents.

### Built-in Subagents

- **Explore** — Haiku model, read-only tools. File discovery, code search, codebase exploration.
- **Plan** — inherited model, read-only tools. Codebase research during plan mode.
- **General-purpose** — inherited model, all tools. Complex research, multi-step operations, code mods.
- **statusline-setup** — Sonnet model, internal tools. Configures status line via `/statusline`.
- **Claude Code Guide** — Haiku model, internal tools. Answers questions about Claude Code features.

Explore accepts a thoroughness level per invocation: `quick`, `medium`, or `very thorough`.

### Subagent Scope and Priority

Files are Markdown with YAML frontmatter. Higher-priority location wins when names collide.

1. **Managed settings** — organization-wide. Deployed via managed settings.
2. **`--agents` CLI flag** (JSON) — current session only. Passed at launch.
3. **`.claude/agents/`** — current project. Interactive or manual.
4. **`~/.claude/agents/`** — all user projects. Interactive or manual.
5. **Plugin `agents/` directory** — where plugin enabled. Installed with plugin.

Project subagents are discovered by walking up from the current working directory. Directories added with `--add-dir`
are not scanned for subagents.

**Plugin subagent restrictions:** `hooks`, `mcpServers`, and `permissionMode` frontmatter fields are ignored when
loading agents from a plugin. Copy the agent file to `.claude/agents/` or `~/.claude/agents/` if needed.

### Frontmatter Fields

Only `name` and `description` are required.

- **`name`** (string, required) — unique identifier — lowercase letters and hyphens
- **`description`** (string, required) — when Claude should delegate to this subagent
- **`tools`** (string, default: all) — allowlist of tools the subagent can use. Inherits all if omitted.
- **`disallowedTools`** (string) — denylist — removed from inherited or specified list
- **`model`** (string, default: `inherit`) — `sonnet`, `opus`, `haiku`, a full model ID, or `inherit`
- **`permissionMode`** (string, default: inherit) — `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, or
  `plan`
- **`maxTurns`** (number) — maximum agentic turns before the subagent stops
- **`skills`** (list) — skills injected into the subagent's context at startup (full content, not just availability)
- **`mcpServers`** (list) — MCP servers — inline definitions or string references to configured servers
- **`hooks`** (object) — lifecycle hooks scoped to this subagent
- **`memory`** (string) — persistent memory scope: `user`, `project`, or `local`
- **`background`** (boolean, default: `false`) — always run as a background task
- **`effort`** (string, default: inherit) — effort level override: `low`, `medium`, `high`, `max` (Opus 4.6 only)
- **`isolation`** (string) — set to `worktree` for a temporary git worktree (auto-cleaned if no changes)
- **`color`** (string) — display color: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`
- **`initialPrompt`** (string) — auto-submitted as first user turn when running as session agent via `--agent`. Commands
  and skills are processed.

The Markdown body becomes the system prompt. Subagents receive only this prompt plus basic environment details — not the
full Claude Code system prompt.

### File Format

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

### CLI-Defined Subagents

Passed as JSON via `--agents` flag. Same fields as file-based subagents, with `prompt` replacing the Markdown body:

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer.",
    "prompt": "You are a senior code reviewer.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

### Model Resolution Order

When Claude invokes a subagent, the model is resolved in this order (first wins):

1. `CLAUDE_CODE_SUBAGENT_MODEL` environment variable
2. Per-invocation `model` parameter (set by Claude at delegation time)
3. Subagent definition's `model` frontmatter
4. Main conversation's model

### Tool Control

**Allowlist (`tools`)** — only listed tools are available:

```yaml
tools: Read, Grep, Glob, Bash
```

**Denylist (`disallowedTools`)** — inherits everything except listed tools:

```yaml
disallowedTools: Write, Edit
```

If both are set: `disallowedTools` is applied first, then `tools` is resolved against the remaining pool.

**Restricting spawnable subagents** (only for `--agent` session mode): use `Agent(type1, type2)` syntax in `tools` to
allowlist which subagent types can be spawned. `Agent` without parentheses allows all. Omitting `Agent` entirely
prevents spawning. This has no effect in normal subagent definitions — subagents cannot spawn other subagents.

**Disabling subagents via permissions:**

```json
{ "permissions": { "deny": ["Agent(Explore)", "Agent(my-custom-agent)"] } }
```

Or via CLI: `claude --disallowedTools "Agent(Explore)"`

### MCP Server Scoping

The `mcpServers` field accepts inline definitions (scoped to the subagent only) and string references (sharing the
parent session's connection):

```yaml
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github
```

Inline definitions use the same schema as `.mcp.json` entries. Servers defined inline here are not visible to the parent
conversation — useful for keeping MCP tool descriptions out of the main context.

### Permission Modes

- **`default`** — standard permission checking with prompts
- **`acceptEdits`** — auto-accept file edits and common filesystem commands in working directory
- **`auto`** — background classifier reviews commands and protected-directory writes
- **`dontAsk`** — auto-deny permission prompts (explicitly allowed tools still work)
- **`bypassPermissions`** — skip permission prompts (use with caution)
- **`plan`** — read-only exploration

**Inheritance rules:**

- If parent uses `bypassPermissions` — takes precedence, cannot be overridden
- If parent uses `auto` mode — subagent inherits auto mode, `permissionMode` frontmatter is ignored

### Persistent Memory

The `memory` field creates a directory that persists across conversations.

- **`user`** — `~/.claude/agent-memory/<agent-name>/`. Learnings applicable across all projects.
- **`project`** — `.claude/agent-memory/<agent-name>/`. Project-specific, shareable via VCS.
- **`local`** — `.claude/agent-memory-local/<agent-name>/`. Project-specific, not checked into VCS.

When memory is enabled:

- System prompt includes instructions for reading/writing to the memory directory
- First 200 lines or 25KB of `MEMORY.md` from the memory directory are included in the prompt
- Read, Write, and Edit tools are automatically enabled

### Skill Preloading

The `skills` field injects full skill content into the subagent's context at startup. Subagents do not inherit skills
from the parent conversation — list them explicitly.

```yaml
skills:
  - api-conventions
  - error-handling-patterns
```

This is the inverse of a skill's `context: fork` field (which runs a skill inside a subagent the skill specifies).

### Hooks in Subagent Frontmatter

All hook events are supported. Common events for subagents:

- **`PreToolUse`** (matcher: tool name) — before the subagent uses a tool
- **`PostToolUse`** (matcher: tool name) — after the subagent uses a tool
- **`Stop`** (no matcher) — when the subagent finishes (converted to `SubagentStop` at runtime)

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
```

**Project-level subagent hooks** (in `settings.json`):

- **`SubagentStart`** (matcher: agent type name) — when a subagent begins execution
- **`SubagentStop`** (matcher: agent type name) — when a subagent completes

### Invocation Methods

**Automatic delegation** — Claude delegates based on task description matching the subagent's `description` field.
Include "use proactively" in the description to encourage proactive delegation.

**Natural language** — name the subagent in the prompt:

```
Use the test-runner subagent to fix failing tests
```

**@-mention** — guarantees that specific subagent runs:

```
@"code-reviewer (agent)" look at the auth changes
```

Plugin subagents appear as `<plugin-name>:<agent-name>` in typeahead. Manual syntax: `@agent-<name>` or
`@agent-<plugin-name>:<agent-name>`.

**Session-wide (`--agent`)** — the entire session uses the subagent's system prompt, tool restrictions, and model:

```bash
claude --agent code-reviewer
```

The subagent's prompt replaces the default system prompt entirely. CLAUDE.md files and project memory still load. For
plugin subagents: `claude --agent <plugin-name>:<agent-name>`.

To make it default for a project:

```json
{ "agent": "code-reviewer" }
```

CLI flag overrides the setting.

### Foreground vs Background Execution

- **Foreground** — blocks main conversation. Permission prompts and `AskUserQuestion` pass through to the user.
- **Background** — runs concurrently. Permissions are pre-approved before launch. Unapproved tools are auto-denied.
  `AskUserQuestion` calls fail but the subagent continues.

Claude decides foreground vs background based on the task. Override with:

- "Run this in the background" (natural language)
- **Ctrl+B** to background a running task
- `background: true` in frontmatter (always background)

Disable all background tasks: set `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`.

### Worktree Isolation

Set `isolation: worktree` to run the subagent in a temporary git worktree — an isolated copy of the repository. The
worktree is automatically cleaned up if the subagent makes no changes.

### Subagent Context Management

**Resumption:** Each invocation creates a fresh instance. To continue a previous subagent's work, ask Claude to resume
it. Claude uses `SendMessage` with the agent's ID to resume (requires agent teams enabled). A stopped subagent receiving
a `SendMessage` auto-resumes in background.

**Transcripts:** Stored at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`. Persist
independently of main conversation compaction. Cleaned up based on `cleanupPeriodDays` (default: 30 days).

**Auto-compaction:** Triggers at ~95% capacity by default. Override with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (e.g. `50`).

### Subagent Working Directory

A subagent starts in the main conversation's current working directory. `cd` commands do not persist between Bash calls
and do not affect the main conversation.

## Agent Teams

Agent teams coordinate multiple Claude Code instances working as a team. One session acts as team lead; teammates work
independently in their own context windows and communicate directly with each other.

**Experimental** — disabled by default. Enable via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in environment or
`settings.json`. Requires Claude Code v2.1.32+.

### When to Use

Agent teams vs subagents:

|                   | Subagents                                   | Agent teams                                         |
| :---------------- | :------------------------------------------ | :-------------------------------------------------- |
| **Context**       | Own window; results return to caller        | Own window; fully independent                       |
| **Communication** | Report results back to main agent only      | Teammates message each other directly               |
| **Coordination**  | Main agent manages all work                 | Shared task list with self-coordination             |
| **Best for**      | Focused tasks where only the result matters | Complex work requiring discussion and collaboration |
| **Token cost**    | Lower (results summarized back)             | Higher (each teammate is a separate instance)       |

Strong use cases for teams: parallel research/review, new modules/features, debugging competing hypotheses, cross-layer
coordination (frontend + backend + tests).

### Architecture

- **Team lead** — main session that creates the team, spawns teammates, coordinates
- **Teammates** — separate Claude Code instances working on assigned tasks
- **Task list** — shared work items — pending, in progress, completed
- **Mailbox** — messaging system for inter-agent communication

Storage locations:

- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

The team config contains a `members` array with each teammate's name, agent ID, and agent type. It holds runtime state
(session IDs, tmux pane IDs) — do not edit by hand; changes are overwritten on state updates.

There is no project-level team config. A `.claude/teams/teams.json` in the project directory is not recognized.

### Display Modes

- **in-process** — all teammates in main terminal; Shift+Down to cycle. Any terminal.
- **split panes** — each teammate gets its own pane. Requires tmux or iTerm2.
- **auto** (default) — split panes if inside tmux, in-process otherwise.

Configure in `~/.claude.json`:

```json
{ "teammateMode": "in-process" }
```

Or per-session: `claude --teammate-mode in-process`

Split panes not supported in: VS Code terminal, Windows Terminal, Ghostty.

### Teammate Interaction

- **In-process mode:** Shift+Down to cycle teammates; type to message directly; Enter to view session; Escape to
  interrupt; Ctrl+T to toggle task list
- **Split-pane mode:** Click into a pane to interact directly

### Task Coordination

Tasks have three states: pending, in progress, completed. Tasks can depend on other tasks — a pending task with
unresolved dependencies cannot be claimed until dependencies complete.

- **Lead assigns** — tell the lead which task to give to which teammate
- **Self-claim** — after finishing, a teammate picks up the next unassigned, unblocked task

Task claiming uses file locking to prevent race conditions. Dependencies unblock automatically when completed.

### Teammate Messaging

- **message** — send to one specific teammate by name
- **broadcast** — send to all teammates simultaneously (costs scale with team size — use sparingly)

The lead assigns names at spawn time. Any teammate can message any other by name.

### Using Subagent Definitions for Teammates

When spawning a teammate, reference a subagent type from any scope:

```
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

The teammate honors the definition's `tools` allowlist and `model`. The definition's body is appended to the teammate's
system prompt as additional instructions (not replacing it). Team coordination tools (SendMessage, task management) are
always available even when `tools` restricts other tools.

**Not applied for teammates:** The `skills` and `mcpServers` frontmatter fields from a subagent definition are ignored
when running as a teammate. Teammates load skills and MCP servers from project/user settings.

### Permissions

Teammates start with the lead's permission settings. If the lead uses `--dangerously-skip-permissions`, all teammates do
too. Per-teammate modes can be changed after spawning but not at spawn time.

### Context and Communication

Each teammate loads the same project context as a regular session (CLAUDE.md, MCP servers, skills) plus the spawn
prompt. The lead's conversation history does not carry over.

- Messages are delivered automatically to recipients
- Idle notifications are sent automatically to the lead
- All agents can see task status and claim available work

### Plan Approval

Teammates can be required to plan before implementing. The teammate works in read-only plan mode until the lead
approves:

```
Spawn an architect teammate to refactor the auth module.
Require plan approval before they make any changes.
```

On rejection, the teammate stays in plan mode, revises, and resubmits.

### Hooks for Teams

- **`TeammateIdle`** (no matcher) — teammate is about to go idle. Exit code 2: sends feedback, keeps working.
- **`TaskCreated`** (no matcher) — a task is being created. Exit code 2: prevents creation + feedback.
- **`TaskCompleted`** (no matcher) — a task is being marked complete. Exit code 2: prevents completion + feedback.

### Shutdown and Cleanup

**Shutdown a teammate:**

```
Ask the researcher teammate to shut down
```

The teammate can approve (exits gracefully) or reject with an explanation.

**Cleanup the team:**

```
Clean up the team
```

Checks for active teammates and fails if any are still running — shut them down first. Always use the lead to clean up;
teammates should not run cleanup.

### Limitations

- No session resumption with in-process teammates (`/resume` and `/rewind` do not restore them)
- Task status can lag — teammates sometimes fail to mark tasks completed
- Shutdown can be slow (waits for current request/tool call)
- One team per session — clean up before starting a new one
- No nested teams — teammates cannot spawn their own teams
- Lead is fixed — cannot promote a teammate or transfer leadership
- Permissions set at spawn — all teammates start with lead's mode
- Split panes require tmux or iTerm2

### Team Sizing

- Start with 3-5 teammates for most workflows
- 5-6 tasks per teammate keeps productivity high without excessive context switching
- Three focused teammates often outperform five scattered ones
- Token costs scale linearly with active teammates
