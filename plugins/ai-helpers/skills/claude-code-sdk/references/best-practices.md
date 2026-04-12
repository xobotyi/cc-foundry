# Best Practices

Operational knowledge for effective Claude Code usage: context window management, verification patterns, session
management, scheduling, checkpointing, and extension mechanism selection.

## Context Window

The context window is Claude Code's most constrained resource. Performance degrades as it fills. Managing context
aggressively is the single most impactful operational practice.

### What Loads Automatically (Session Start)

Every session begins with these items loaded in order:

- **System prompt** (~4,200 tokens) — core behavior, tool use, response formatting. Always first. Invisible in terminal.
- **Auto memory / `MEMORY.md`** (~680 tokens) — first 200 lines or 25 KB (whichever is smaller). Claude's notes from
  previous sessions.
- **Environment info** (~280 tokens) — working directory, platform, shell, OS, git branch/status/recent commits.
- **MCP tools (deferred)** (~120 tokens) — tool names only. Full schemas loaded on demand via tool search.
  `ENABLE_TOOL_SEARCH=auto` loads upfront if under 10% of context.
- **Skill descriptions** (~450 tokens) — one-line descriptions for auto-invocable skills. Not re-injected after
  `/compact`. Skills with `disable-model-invocation: true` excluded.
- **`~/.claude/CLAUDE.md`** (~320 tokens) — global user preferences. Applies to all projects.
- **Project `CLAUDE.md`** (~1,800 tokens) — project conventions, build commands, architecture. The most impactful file
  you can create.

Total startup overhead: ~7,850 tokens before any user prompt.

### What Consumes Context During Work

- **File read** (full file) — one-liner in terminal ("Read auth.ts") — full content only Claude sees
- **Path-scoped rule triggered** (~200-400 tokens) — one-liner ("Loaded .claude/rules/api-conventions.md")
- **Grep/search results** (full output) — command shown, output only Claude sees
- **Bash command output** (full output) — command shown, output only Claude sees
- **Skill invocation** (full skill) — skill name shown
- **Hook output** (varies) — only `additionalContext` field enters context; stdout on exit 0 goes to debug log only
- **Subagent result** (summary only) — summary returned — file reads stay in subagent's context
- **`!command` (bang prefix)** (full output) — command and output both enter context as user message

File reads dominate context usage. Be specific in prompts so Claude reads fewer files. For research-heavy tasks,
delegate to subagents.

### Compaction

When context approaches its limit, Claude automatically compacts the conversation into a structured summary that
preserves:

- User requests and intent
- Key technical concepts
- Files examined or modified with important code snippets
- Errors and how they were fixed
- Pending tasks and current work

After compaction, skill descriptions are **not** re-injected — only skills that were actually invoked survive. Full tool
outputs and intermediate reasoning are replaced by the summary. Claude can still reference the work but loses exact code
it read earlier.

Typical compression ratio: ~12% of original token count.

### Context Management Commands

- `/clear` — reset context entirely between unrelated tasks
- `/compact <instructions>` — manual compaction with optional focus (e.g., `/compact Focus on the API changes`)
- `/compact` in CLAUDE.md — add instructions like `"When compacting, always preserve the full list of modified files"`
  to guide automatic compaction
- `Esc + Esc` or `/rewind` then **Summarize from here** — targeted compaction: keeps earlier context intact, compresses
  only from selected point forward
- `/btw` — side question in dismissible overlay; never enters conversation history
- `/context` — check context usage, including excluded skills that exceeded the description budget

### Context Cost by Extension Feature

- **CLAUDE.md** — loads at session start. Full content, every request.
- **Skills** — loads at session start + when used. Descriptions every request (low); full content when used.
- **MCP servers** — loads at session start. Tool names only until a tool is used.
- **Subagents** — loads when spawned. Isolated from main session.
- **Hooks** — fires on trigger. Zero context cost unless hook returns `additionalContext`.

Skills with `disable-model-invocation: true` have zero context cost until manually invoked.

## Verification Patterns

Providing verification criteria is the single highest-leverage prompting practice. Without clear success criteria,
Claude produces plausible-looking output that may not actually work.

| Strategy                    | Weak prompt                                 | Strong prompt                                                                                                        |
| --------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Provide test cases          | "implement email validation"                | "write validateEmail. test: user@example.com=true, invalid=false, user@.com=false. run tests after implementing"     |
| Verify UI visually          | "make the dashboard look better"            | "[paste screenshot] implement this design. screenshot the result and compare. list differences and fix them"         |
| Address root causes         | "the build is failing"                      | "build fails with [error]. fix it and verify build succeeds. address root cause, don't suppress the error"           |
| Reference existing patterns | "add a calendar widget"                     | "look at HotDogWidget.php for the pattern. follow it for a new calendar widget. build from scratch without new libs" |
| Scope investigations        | "why does ExecutionFactory have weird API?" | "look through ExecutionFactory's git history and summarize how its API came to be"                                   |

Verification can be a test suite, a linter, a bash command, or a screenshot comparison. Make verification rock-solid.

## Explore-Plan-Code Workflow

Four-phase workflow for non-trivial tasks. Skip for trivial changes (typos, single-line fixes) — if you can describe the
diff in one sentence, skip the plan.

1. **Explore** — enter Plan Mode. Claude reads files and answers questions without making changes. Example: "read
   /src/auth and understand how we handle sessions"
2. **Plan** — still in Plan Mode. Ask Claude to create a detailed implementation plan. Press `Ctrl+G` to open the plan
   in your editor for direct editing.
3. **Implement** — switch to Normal Mode. Claude codes against the plan, running tests along the way.
4. **Commit** — ask Claude to commit with a descriptive message and create a PR.

Plan Mode is overhead. Use it when: you're uncertain about the approach, the change spans multiple files, or you're
unfamiliar with the code. Skip it when the scope is clear and the fix is small.

## CLAUDE.md Authoring

CLAUDE.md is loaded every session. Only include broadly applicable content.

### What to Include

- Bash commands Claude cannot guess
- Code style rules that differ from defaults
- Testing instructions and preferred runners
- Repository etiquette (branch naming, PR conventions)
- Architectural decisions specific to the project
- Developer environment quirks (required env vars)
- Common gotchas or non-obvious behaviors

### What to Exclude

- Anything Claude can figure out by reading code
- Standard language conventions Claude already knows
- Detailed API documentation (link to docs or use skills instead)
- Information that changes frequently
- Long explanations or tutorials
- File-by-file codebase descriptions
- Self-evident practices ("write clean code")

### Authoring Rules

- Keep under 200 lines. Move reference content to skills or path-scoped rules.
- Use `@path/to/import` syntax to include files without duplicating content (max depth 5).
- Place modular rules in `.claude/rules/*.md` with `paths:` frontmatter for file-scoped loading.
- Use emphasis ("IMPORTANT", "YOU MUST") to improve adherence to critical rules.
- Check it into git so the team can contribute.
- Treat it like code: review when things go wrong, prune regularly, test by observing behavior.
- If Claude ignores a rule, the file is probably too long and the rule is getting lost.
- If Claude asks questions answered in CLAUDE.md, the phrasing may be ambiguous.
- CLAUDE.md instructions are advisory. For guaranteed execution, use hooks.

## Session Management

### Course Correction

- `Esc` — stop Claude mid-action. Context preserved, redirect immediately.
- `Esc + Esc` or `/rewind` — open rewind menu to restore previous conversation/code state, or summarize from a
  checkpoint.
- `"Undo that"` — have Claude revert its changes.
- `/clear` — reset context between unrelated tasks.

After two failed corrections on the same issue, `/clear` and start fresh with a better prompt. A clean session with an
improved prompt outperforms a long session with accumulated corrections.

### Session Persistence

- `claude --continue` — resume the most recent conversation
- `claude --resume` — select from recent conversations
- `/rename` — give sessions descriptive names (e.g., "oauth-migration") for later retrieval
- `claude --continue --fork-session` — branch off a session while preserving the original intact

Treat sessions like branches: different workstreams get separate, persistent contexts.

### Subagents for Context Isolation

Subagents run in separate context windows. The subagent reads files, runs searches, and reports back a summary — the
file reads stay in the subagent's context, not yours. Use subagents for:

- Research that reads many files
- Verification after implementation ("use a subagent to review this code for edge cases")
- Any investigation that would flood the main context

Subagents load CLAUDE.md and MCP/skill setup but start without conversation history or the main session's auto memory.

### Common Failure Patterns

- **Kitchen sink session** — mixing unrelated tasks in one session. Fix: `/clear` between tasks.
- **Correction spiral** — correcting Claude repeatedly on the same issue. Fix: after two failures, `/clear` and write a
  better initial prompt.
- **Over-specified CLAUDE.md** — too long, Claude ignores important rules. Fix: prune ruthlessly; convert to hooks if
  critical.
- **Trust-then-verify gap** — accepting plausible output without checking edge cases. Fix: always provide verification.
- **Infinite exploration** — unscoped investigation fills context. Fix: scope narrowly or use subagents.

## Scheduling

### /loop (Session-Scoped)

Runs a prompt repeatedly while the session stays open. Session-scoped: tasks are gone when you exit.

- **Interval + prompt** (e.g. `/loop 5m check the deploy`) — fixed schedule (cron-based)
- **Prompt only** (e.g. `/loop check the deploy`) — Claude chooses interval dynamically (1 min to 1 hr)
- **Interval only or nothing** (e.g. `/loop` or `/loop 15m`) — built-in maintenance prompt (or custom `loop.md`)

Interval units: `s` (seconds, rounded up to 1 min), `m` (minutes), `h` (hours), `d` (days). Non-clean intervals (e.g.,
`7m`) rounded to nearest cron step.

You can pass another command as the prompt: `/loop 20m /review-pr 1234`.

**Dynamic intervals**: when interval is omitted, Claude picks delay per iteration based on observed activity — short
waits during active work, longer waits when quiet. May use the Monitor tool for event streaming instead of polling.

**Maintenance prompt** (bare `/loop`): continues unfinished work, tends to current branch's PR (review comments, CI
failures, merge conflicts), runs cleanup when idle. Does not start new initiatives. Override with `.claude/loop.md`
(project) or `~/.claude/loop.md` (user).

### One-Time Reminders

Natural language scheduling for single-fire tasks:

- "remind me at 3pm to push the release branch"
- "in 45 minutes, check whether the integration tests passed"

### Cron Tools

- **`CronCreate`** — schedule a task. Accepts 5-field cron expression, prompt, and whether it recurs or fires once.
- **`CronList`** — list all scheduled tasks with IDs, schedules, and prompts.
- **`CronDelete`** — cancel a task by ID.

Each task has an 8-character ID. Max 50 scheduled tasks per session. All times are local timezone. Recurring tasks
expire after 7 days automatically.

**Jitter**: recurring tasks fire up to 10% of period late (max 15 min). One-shot tasks at :00 or :30 fire up to 90s
early. Offset is deterministic per task ID.

**Disable**: set `CLAUDE_CODE_DISABLE_CRON=1` to disable the scheduler entirely.

### Durable Scheduling (Survives Restarts)

|                            | Cloud                          | Desktop                     |
| -------------------------- | ------------------------------ | --------------------------- |
| Runs on                    | Anthropic cloud                | Your machine                |
| Requires machine on        | No                             | Yes                         |
| Requires open session      | No                             | No                          |
| Persistent across restarts | Yes                            | Yes                         |
| Access to local files      | No (fresh clone)               | Yes                         |
| MCP servers                | Connectors configured per task | Config files and connectors |
| Permission prompts         | No (runs autonomously)         | Configurable per task       |
| Minimum interval           | 1 hour                         | 1 minute                    |

Cloud tasks: use `/schedule` in the CLI. Desktop tasks: configure locally. Both survive restarts unlike `/loop`.

## Checkpointing

Claude Code automatically tracks file edits as checkpoints, enabling quick undo and state restoration.

### Behavior

- Every user prompt creates a new checkpoint
- Checkpoints persist across sessions (accessible in resumed conversations)
- Automatically cleaned up after 30 days (configurable)
- Only tracks changes made by Claude's file editing tools — **not** bash commands (`rm`, `mv`, `cp`) or external editors

### Rewind Menu

Access via `Esc + Esc` or `/rewind`. Shows scrollable list of prompts from the session. Actions:

- **Restore code and conversation** — revert both to selected point
- **Restore conversation** — rewind messages, keep current code
- **Restore code** — revert files, keep conversation
- **Summarize from here** — compress messages from selected point forward into a summary (frees context, no file
  changes, original messages preserved in transcript)
- **Never mind** — return without changes

After restoring or summarizing, the original prompt from the selected message is restored into the input field.

### Summarize vs Restore

Restore **reverts** state (undo). Summarize **compresses** context (keep working):

- Messages before the selected point stay intact
- Selected message and everything after replaced with AI-generated summary
- No files on disk are changed
- Original messages preserved in session transcript for reference

Use summarize to free context mid-session without losing progress. Use fork (`claude --continue --fork-session`) to
branch off while preserving the original session.

### Limitations

- Bash-executed file operations (`rm`, `mv`, `cp`) are not tracked and cannot be rewound
- External changes (manual edits, other sessions) not captured unless they modify files the current session also edited
- Not a replacement for git — checkpoints are session-level "local undo", git is permanent history

## Automation and Scaling

### Non-Interactive Mode

`claude -p "prompt"` runs without a session. Use in CI, pre-commit hooks, scripts.

- `--output-format json` — structured output for scripts
- `--output-format stream-json` — streaming for real-time processing
- `--allowedTools "Edit,Bash(git commit *)"` — restrict tool access for batch operations
- `--permission-mode auto` — classifier-managed approvals for unattended runs (aborts if classifier repeatedly blocks)
- `--verbose` — debugging during development

### Parallel Sessions

- **Desktop app**: multiple local sessions, each with isolated worktree
- **Claude Code on the web**: isolated VMs on Anthropic cloud infrastructure
- **Agent teams**: automated coordination with shared tasks and peer-to-peer messaging

### Fan-Out Pattern

Distribute work across many parallel Claude invocations:

1. Generate a task list (have Claude list files needing migration)
2. Loop through with `claude -p` per file, scoped with `--allowedTools`
3. Test on 2-3 files first, refine prompt, then run at scale

### Writer/Reviewer Pattern

Use separate sessions for implementation and review — fresh context prevents bias toward code the same session wrote.
One session implements, another reviews the output. Also works for test-first: one writes tests, another writes code to
pass them.

## Extension Mechanism Selection

### When to Add Each Extension

- **Claude gets a convention wrong twice** → add to CLAUDE.md
- **You keep typing the same prompt** → create a user-invocable skill
- **You paste the same playbook for the third time** → create a skill
- **You keep copying data from a browser tab** → add an MCP server
- **A side task floods your conversation** → use a subagent
- **Something must happen every time without asking** → add a hook
- **A second repository needs the same setup** → create a plugin

### Feature Comparison

| Aspect           | CLAUDE.md           | Skill                         | Subagent                 | Hook                            | MCP                   |
| ---------------- | ------------------- | ----------------------------- | ------------------------ | ------------------------------- | --------------------- |
| Loads            | Every session       | On demand                     | When spawned             | On trigger                      | Session start (names) |
| Context cost     | Full content always | Low until used                | Isolated                 | Zero (unless additionalContext) | Low until tool used   |
| Best for         | "Always do X" rules | Reference material, workflows | Isolation, parallel work | Deterministic automation        | External services     |
| Can trigger work | No                  | Yes (`/<name>`)               | Yes (delegation)         | Yes (scripts)                   | Yes (tools)           |

### Layering Rules

- **CLAUDE.md files** — additive: all levels contribute simultaneously. More specific takes precedence on conflict.
- **Skills and subagents** — override by name: managed > user > project (skills); managed > CLI > project > user >
  plugin (subagents).
- **MCP servers** — override by name: local > project > user.
- **Hooks** — merge: all registered hooks fire for matching events regardless of source.
