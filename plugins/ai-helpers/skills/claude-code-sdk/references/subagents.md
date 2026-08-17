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
it. Claude uses `SendMessage` with the agent's ID, or with the name it assigned at spawn. Both addresses work with agent
teams disabled. A stopped subagent receiving a `SendMessage` auto-resumes in background.

**Transcripts:** Stored at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`. Persist
independently of main conversation compaction. Cleaned up based on `cleanupPeriodDays` (default: 30 days).

**Auto-compaction:** Triggers at ~95% capacity by default. Override with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (e.g. `50`).

### Subagent Working Directory

A subagent starts in the main conversation's current working directory. `cd` commands do not persist between Bash calls
and do not affect the main conversation.

## Agent Teams

Agent teams coordinate multiple Claude Code instances working as a team. One session acts as team lead; teammates work
independently in their own context windows and communicate directly with each other.

**Experimental** — disabled by default. Enable via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in the environment or
`settings.json`. Without it, no team is set up at session start, no team directories are written, and Claude neither
spawns nor proposes teammates.

There is no setup step. The session owns exactly one team, created at session start and cleaned up when the session
ends. `TeamCreate` and `TeamDelete` do not exist (removed in v2.1.178).

### Spawning Teammates

Claude launches a teammate by calling the `Agent` tool with a `name` while agent teams are enabled. Claude Code asks for
no confirmation. Claude also names ordinary subagents on its own so it can message them later, so a team can form during
delegation that was never framed as team work.

- `team_name` on the `Agent` tool is accepted and ignored.
- Spawning requires an interactive session. Under `-p` (headless, Agent SDK), a named subagent runs as an ordinary
  subagent even with agent teams enabled.
- Teammates cannot spawn teammates.

### When to Use

Agent teams vs subagents:

|                   | Subagents                                   | Agent teams                                              |
| :---------------- | :------------------------------------------ | :------------------------------------------------------- |
| **Context**       | Own window; results return to caller        | Own window; fully independent                            |
| **Communication** | Report results back to main agent only      | Teammates message each other directly                    |
| **Coordination**  | Main agent manages all work                 | Messages, plus a shared task list where Task tools exist |
| **Best for**      | Focused tasks where only the result matters | Complex work requiring discussion and collaboration      |
| **Token cost**    | Lower (results summarized back)             | Higher (each teammate is a separate instance)            |

Strong use cases for teams: parallel research/review, new modules/features, debugging competing hypotheses, cross-layer
coordination (frontend + backend + tests).

### Architecture

- **Team lead** — main session that spawns teammates and coordinates
- **Teammates** — separate Claude Code instances working on assigned tasks
- **Task list** — shared work items — pending, in progress, completed. Available to agents that have the Task tools;
  agents without them coordinate by message.
- **Mailbox** — per-agent JSON file carrying inter-agent messages

The team name is session-derived: `session-` followed by the first eight characters of the session ID.

Storage locations:

- Team config: `~/.claude/teams/{team-name}/config.json` — removed when the session ends
- Mailboxes: `~/.claude/teams/{team-name}/inboxes/{agent-name}.json`
- Task list: `~/.claude/tasks/{team-name}/` — persists locally, never uploaded, so a resumed session keeps its tasks.
  Retention follows `cleanupPeriodDays`.

The team config contains a `members` array with each member's name and agent ID. The lead's entry always carries the
agent type `team-lead`; a teammate's entry carries the agent type the lead named at spawn, and omits the field when the
lead named none. Teammates read this file to discover other members. It holds runtime state (session IDs, tmux pane IDs)
— do not edit it by hand or pre-author it; changes are overwritten on the next state update.

There is no project-level team config. A `.claude/teams/teams.json` in the project directory is not recognized.

**Delivery guarantees:** a message counts as sent only when the write to the recipient's mailbox file succeeds — plain
text and structured protocol messages (plan approval, shutdown request) alike. On write failure the sender gets an error
and nothing is sent. Claude Code validates every mailbox entry on read: malformed entries are reported and removed, and
the valid messages still arrive (v2.1.207+; earlier versions blocked the whole mailbox until the file was deleted).

### Display Modes

- **in-process** (default) — all teammates run in the main terminal and appear in the agent panel below the prompt. Any
  terminal, no extra setup.
- **auto** — split panes when already inside tmux, or in iTerm2 with the `it2` CLI installed; in-process otherwise.
- **tmux** — split panes, auto-detecting tmux or iTerm2 from the terminal.
- **iterm2** (v2.1.186+) — iTerm2 native split panes. Requires the `it2` CLI.

The default changed from `auto` to `in-process` in v2.1.179, so upgraded sessions that used to open split panes stay in
one terminal until the mode is set explicitly.

Configure in `~/.claude/settings.json`:

```json
{ "teammateMode": "auto" }
```

Or per-session: `claude --teammate-mode auto` (experimental, absent from `claude --help`).

Split panes not supported in: VS Code terminal, Windows Terminal, Ghostty.

### Teammate Interaction

- **In-process mode:** up/down arrows select a teammate in the agent panel; Enter opens its transcript and sends typed
  text to it; Escape interrupts its current turn; `x` stops it; Ctrl+T toggles the task list.
- **Split-pane mode:** click into a pane to interact directly.

While viewing a teammate, plain text and skills go to that teammate, but built-in commands still run in the lead
session. A teammate's model and fast mode are fixed at spawn, so `/model` and `/fast` apply to the lead (v2.1.199 shows
a notice; earlier versions changed the lead silently). `/effort` applies to the viewed teammate's later turns.

Idle rows hide 30 seconds after every agent in the panel goes idle, and reappear on the teammate's next turn — the
teammate keeps running and stays addressable while hidden. When more than three teammates are idle, the surplus rows
collapse into a single `N idle agents` row; Enter expands it, Esc collapses it again.

### Models and Effort

Teammates do not inherit the lead's `/model`. Set **Default teammate model** in `/config`; the **Default (leader's
model)** option makes teammates follow the lead's current model.

Every teammate model — requested in the prompt or taken from the setting — is checked against the organization's
`availableModels` allowlist. When the allowlist blocks the value:

- **Family alias (`opus`)** — on the Anthropic API and Claude Platform on AWS, the newest permitted version of that
  family is used. On providers with provider-specific model IDs the alias falls back like any other blocked value.
- **Any other blocked value** — the default teammate model is used; if that setting is itself blocked, the provider's
  default Opus model; if that is blocked too, the lead's model.

Teammates inherit the lead's effort level (split-pane teammates from v2.1.186).

### Task Coordination

Tasks have three states: pending, in progress, completed. Tasks can depend on other tasks — a pending task with
unresolved dependencies cannot be claimed until dependencies complete.

- **Lead assigns** — tell the lead which task to give to which teammate
- **Self-claim** — after finishing, a teammate picks up the next unassigned, unblocked task

Task claiming uses file locking to prevent race conditions. Dependencies unblock automatically when completed.

### Teammate Messaging

`SendMessage` targets one recipient by name. There is no broadcast — to reach everyone, send one message per recipient.
The lead assigns names at spawn time, so name teammates in the spawn instruction to get addresses you can reference
later. Any teammate can message any other by name.

An incoming `SendMessage` is presented to the recipient as coming from another Claude session, not from the user. A
teammate cannot approve a permission prompt or supply consent for another agent, and an agent denied an action cannot
relay it to a teammate to bypass the check. The same holds for messages from other sessions outside the team. In auto
mode the classifier treats a relayed approval claim as untrusted input and reviews every message — plain or protocol —
before delivery; a blocked message never reaches the recipient.

### Using Subagent Definitions for Teammates

When spawning a teammate, reference a subagent type from any scope:

```
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

The teammate honors the definition's `tools` allowlist and `model`. The definition's body is appended to the teammate's
system prompt as additional instructions (not replacing it). For an in-process teammate, Claude Code adds `SendMessage`
to the allowlist, plus `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` when the session has the Task tools.

**Not applied for teammates:** The `skills` and `mcpServers` frontmatter fields from a subagent definition are ignored
when running as a teammate. Teammates load skills and MCP servers from project/user settings.

### Permissions

Teammates start with the lead's permission settings. If the lead uses `--dangerously-skip-permissions`, all teammates do
too. Per-teammate modes can be changed after spawning but not at spawn time. Teammate permission prompts surface in the
lead session and must be answered there; teammate plan approvals are the designed exception and the lead grants them
without prompting the user.

### Context and Communication

Each teammate loads the same project context as a regular session (CLAUDE.md, MCP servers, skills) plus the spawn
prompt. The lead's conversation history does not carry over.

- Messages are delivered automatically to recipients — the lead does not poll
- The idle notification tells the lead a teammate stopped and **carries none of its output**. A teammate shares results
  by messaging the lead or updating the shared task list.
- A teammate whose turn ends on an API error notifies the lead and includes the error text (v2.1.198+)
- Agents with the Task tools can see task status and claim available work

### Plan Approval

Teammates can be required to plan before implementing. The teammate works in read-only plan mode until the lead
approves:

```
Spawn an architect teammate to refactor the auth module.
Require plan approval before they make any changes.
```

On rejection, the teammate stays in plan mode, revises, and resubmits. The lead decides autonomously — put approval
criteria in the prompt ("only approve plans that include test coverage") to steer it.

### Hooks for Teams

- **`TeammateIdle`** (no matcher) — teammate is about to go idle. Exit code 2: sends feedback, keeps working.
- **`TaskCreated`** (no matcher) — a task is being created. Exit code 2: prevents creation + feedback.
- **`TaskCompleted`** (no matcher) — a task is being marked complete. Exit code 2: prevents completion + feedback.

The `team_name` field in these payloads carries the session-derived name and is deprecated.

### Shutdown and Cleanup

**Shutdown a teammate:**

```
Ask the researcher teammate to shut down
```

The teammate can approve (exits gracefully) or reject with an explanation.

There is no cleanup step. The team's shared directories are removed when the session ends; the task list directory
survives for resumed sessions.

### Limitations

- No session resumption with in-process teammates (`/resume` and `/rewind` do not restore them)
- Task status can lag — teammates sometimes fail to mark tasks completed
- Shutdown can be slow (waits for current request/tool call)
- One team per session, scoped to that session — no additional named teams, no sharing a team across sessions
- No nested teams — teammates cannot spawn their own teammates
- No background subagents from in-process teammates — `run_in_background` and `background: true` both error
- Lead is fixed — cannot promote a teammate or transfer leadership
- Permissions set at spawn — all teammates start with lead's mode
- Split panes require tmux or iTerm2

### Team Sizing

- Start with 3-5 teammates for most workflows
- 5-6 tasks per teammate keeps productivity high without excessive context switching
- Three focused teammates often outperform five scattered ones
- Token costs scale linearly with active teammates

### Named Subagents Launching as Teammates

While agent teams are enabled, any subagent Claude names launches as a teammate — including delegation never framed as
team work. The reporting contract differs: a subagent's result returns to the caller, while a teammate's idle
notification carries no output, so an orchestration flow waiting on subagent results stalls.

To make named subagents launch as subagents again, set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `0`. No restart needed:
settings-file `env` values are reapplied on save and the variable is reread at each spawn. A `0` in user settings
overrides a shell export, but project settings, local settings, `--settings`, and managed settings all apply later and
can re-enable teams.
