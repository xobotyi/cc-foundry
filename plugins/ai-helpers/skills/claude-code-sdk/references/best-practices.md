# Best Practices Reference

Patterns for getting the most out of Claude Code.

## Core Constraint

**Claude's context window fills up fast, and performance degrades as it fills.**

Context holds your entire conversation, files Claude reads, and command outputs. When full,
Claude may "forget" earlier instructions or make more mistakes. Track usage with a custom
status line. Context is the most important resource to manage.

## Give Claude Verification

**This is the single highest-leverage thing you can do.**

Claude performs dramatically better when it can verify its own work.

| Strategy             | Before                           | After                                                                                     |
|----------------------|----------------------------------|-------------------------------------------------------------------------------------------|
| Provide verification | "implement email validation"     | "write validateEmail. test: user@example.com=true, invalid=false. run tests after"       |
| Verify UI visually   | "make dashboard look better"     | "[paste screenshot] implement this. take screenshot, compare, list differences and fix"  |
| Address root causes  | "the build is failing"           | "build fails with [error]. fix it, verify build succeeds. address root cause"            |

Verification can be tests, a linter, or any Bash command that checks output. UI changes can
be verified using the Claude in Chrome extension (opens tabs, tests UI, iterates).

## Explore → Plan → Code

Separate research from implementation. Use Plan Mode to prevent solving the wrong problem.

1. **Explore** (Plan Mode): Claude reads files, answers questions without making changes
2. **Plan**: Ask Claude to create a detailed implementation plan. Press `Ctrl+G` to open the
   plan in your editor for direct editing before Claude proceeds
3. **Implement** (Normal Mode): Let Claude code, verifying against the plan
4. **Commit**: Ask Claude to commit with a descriptive message and open a PR

Skip planning for small, clear tasks (describable in one sentence). Use it when uncertain
about approach, changing multiple files, or unfamiliar with the code being modified.

## Provide Specific Context

| Strategy            | Before                            | After                                                           |
|---------------------|-----------------------------------|-----------------------------------------------------------------|
| Scope the task      | "add tests for foo.py"            | "test foo.py covering logged-out edge case. avoid mocks"        |
| Point to sources    | "why weird API?"                  | "look through git history, summarize how API came to be"        |
| Reference patterns  | "add calendar widget"             | "look at HotDogWidget.php, follow pattern for calendar widget"  |
| Describe symptoms   | "fix the login bug"               | "login fails after timeout. check src/auth/, especially refresh"|

Vague prompts are useful when exploring — "what would you improve in this file?" can surface
things you wouldn't have thought to ask about.

### Rich Content

- Reference files with `@` instead of describing locations — Claude reads before responding
- Paste images directly (copy/paste or drag-drop)
- Give URLs for documentation; use `/permissions` to allowlist frequently-used domains
- Pipe data: `cat error.log | claude`
- Let Claude fetch what it needs using Bash commands or MCP tools

## Configure Your Environment

### Write Effective CLAUDE.md

Run `/init` to generate a starter file, then refine. CLAUDE.md is loaded every session.

**Include:**
- Bash commands Claude can't guess
- Code style rules that differ from defaults
- Testing instructions and preferred runners
- Repository etiquette (branch naming, PR conventions)
- Architectural decisions specific to your project
- Common gotchas and non-obvious behaviors

**Exclude:**
- Anything Claude can figure out by reading code
- Standard conventions Claude already knows
- Detailed API docs (link instead)
- Information that changes frequently
- File-by-file codebase descriptions

**Keep it concise.** For each line, ask: *"Would removing this cause Claude to make mistakes?"*
If not, cut it. Bloated CLAUDE.md causes Claude to ignore your actual instructions.

Use emphasis (`IMPORTANT`, `YOU MUST`) for rules that must not be missed. Check CLAUDE.md
into git so your team can contribute.

**Import syntax** — CLAUDE.md can import other files:

```markdown
See @README.md for project overview and @package.json for available npm commands.

# Additional Instructions
- Git workflow: @docs/git-instructions.md
- Personal overrides: @~/.claude/my-project-instructions.md
```

**Locations:**
- `~/.claude/CLAUDE.md` — applies to all sessions
- `./CLAUDE.md` — project root; check into git or name `CLAUDE.local.md` and gitignore it
- Parent directories — useful for monorepos (both `root/CLAUDE.md` and `root/foo/CLAUDE.md`
  are pulled in automatically)
- Child directories — pulled in on demand when working with files in those directories

### Configure Permissions

- `/permissions` — allowlist safe commands (e.g., `npm run lint`, `git commit`)
- `/sandbox` — OS-level isolation; restricts filesystem and network access
- `--dangerously-skip-permissions` — bypass all checks for contained workflows

> **Warning:** Only use `--dangerously-skip-permissions` in a sandbox without internet access.
> Risk of data loss, system corruption, or data exfiltration via prompt injection.

### Use CLI Tools

Tell Claude to use `gh`, `aws`, `gcloud`, `sentry-cli` for external services. CLI tools are
the most context-efficient integration method. Claude can also learn unfamiliar CLIs:

```
Use 'foo-cli-tool --help' to learn about foo tool, then use it to solve A, B, C.
```

### Connect MCP Servers

`claude mcp add` connects external tools: Notion, Figma, databases, issue trackers.

### Set Up Hooks

Hooks run scripts at specific workflow points. Unlike CLAUDE.md instructions (advisory),
hooks are **deterministic** — guaranteed to run.

```
Write a hook that runs eslint after every file edit
Write a hook that blocks writes to the migrations folder
```

Run `/hooks` for interactive configuration, or edit `.claude/settings.json` directly.

### Create Skills

`.claude/skills/<name>/SKILL.md` for domain knowledge and reusable workflows. Skills load
on demand without bloating every conversation.

### Create Subagents

`.claude/agents/<name>.md` for specialized assistants running in isolated context with their
own allowed tools. Useful for tasks that read many files or need specialized focus.

### Install Plugins

`/plugin` to browse the marketplace. Plugins bundle skills, hooks, subagents, and MCP
servers into a single installable unit.

## Communicate Effectively

### Ask Codebase Questions

Ask Claude questions you'd ask another engineer:

- How does logging work?
- How do I make a new API endpoint?
- What does this code do on line 134?
- Why does this call `foo()` instead of `bar()`?

### Let Claude Interview You

For larger features, have Claude gather requirements before coding:

```
I want to build [brief description]. Interview me using the AskUserQuestion tool.

Ask about technical implementation, UI/UX, edge cases, concerns, and tradeoffs.
Don't ask obvious questions — dig into the hard parts I might not have considered.

Keep interviewing until covered, then write a complete spec to SPEC.md.
```

Then start a **fresh session** to execute the spec. Clean context focused entirely on
implementation.

## Manage Your Session

### Course-Correct Early

- `Esc` — stop mid-action; context is preserved, redirect immediately
- `Esc + Esc` or `/rewind` — open rewind menu to restore previous state
- `"Undo that"` — have Claude revert its changes
- `/clear` — reset between unrelated tasks

After two failed corrections, `/clear` and write a better initial prompt incorporating what
you learned. A clean session with a better prompt almost always outperforms a long session
with accumulated corrections.

### Manage Context Aggressively

- `/clear` frequently between tasks to reset entirely
- Auto-compaction triggers near context limits; Claude summarizes what matters most
- `/compact <instructions>` for manual control (e.g., `/compact Focus on the API changes`)
- Partial rewind: `Esc + Esc` or `/rewind`, select a checkpoint, choose **Summarize from
  here** — condenses from that point while keeping earlier context intact
- Customize compaction in CLAUDE.md: `"When compacting, always preserve the full list of
  modified files and any test commands"`

### Use Subagents for Investigation

```
Use subagents to investigate how authentication handles token refresh,
and whether we have any existing OAuth utilities I should reuse.
```

Subagents explore in a separate context window, keeping your main conversation clean.
Also useful for post-implementation verification:

```
use a subagent to review this code for edge cases
```

### Rewind with Checkpoints

Every Claude action creates a checkpoint. `Esc + Esc` or `/rewind` opens the menu.

Options:
- Restore conversation only (keep code changes)
- Restore code only (keep conversation)
- Restore both
- Summarize from selected message

Checkpoints persist across sessions — close your terminal, still rewind later.

> **Note:** Checkpoints only track changes made *by Claude*, not external processes.
> Not a replacement for git.

### Resume Conversations

```bash
claude --continue    # Resume most recent conversation
claude --resume      # Select from recent conversations
```

Use `/rename` to give sessions descriptive names (`"oauth-migration"`, `"memory-leak-debug"`).
Treat sessions like branches — different workstreams can have separate persistent contexts.

## Automate and Scale

### Headless Mode

```bash
claude -p "Explain what this project does"
claude -p "List all API endpoints" --output-format json
claude -p "Analyze this log file" --output-format stream-json
```

Use in CI pipelines, pre-commit hooks, or any automated workflow. `--verbose` for debugging,
off in production. Pipe output: `claude -p "<prompt>" --output-format json | your_command`

### Parallel Sessions

Multiple sessions for quality-focused workflows — fresh context improves review since Claude
won't be biased toward code it just wrote.

| Session A (Writer)                                       | Session B (Reviewer)                                          |
|----------------------------------------------------------|---------------------------------------------------------------|
| `Implement a rate limiter for our API endpoints`         |                                                               |
|                                                          | `Review @src/middleware/rateLimiter.ts. Look for edge cases,  |
|                                                          | race conditions, consistency with existing middleware.`       |
| `Here's review feedback: [output]. Address these issues` |                                                               |

Or: one Claude writes tests, another writes code to pass them.

**Options:** Desktop app (visual, isolated worktrees), Claude Code on the web (cloud VMs),
Agent teams (automated coordination with shared tasks and messaging).

### Fan Out Across Files

```bash
for file in $(cat files.txt); do
  claude -p "Migrate $file from React to Vue. Return OK or FAIL." \
    --allowedTools "Edit,Bash(git commit *)"
done
```

Test on 2-3 files first, refine the prompt, then run at scale. `--allowedTools` restricts
what Claude can do in unattended runs.

### Safe Autonomous Mode

`--dangerously-skip-permissions` lets Claude work uninterrupted (no permission checks). Works
well for lint fixing, boilerplate generation. Use only in a container without internet access.

With `/sandbox` enabled, you get similar autonomy with better security — defined upfront
boundaries rather than bypassing all checks.

## Common Failure Patterns

| Pattern                   | Fix                                                         |
|---------------------------|-------------------------------------------------------------|
| Kitchen sink session      | `/clear` between unrelated tasks                            |
| Correcting over and over  | After 2 fails, `/clear` and write better initial prompt     |
| Over-specified CLAUDE.md  | Ruthlessly prune; convert satisfied rules to hooks          |
| Trust-then-verify gap     | Always provide verification (tests, scripts, screenshots)   |
| Infinite exploration      | Scope narrowly or use subagents to protect main context     |

## Develop Intuition

Patterns are starting points. Pay attention to what works:

- When Claude produces great output, notice the prompt structure and context you provided
- When Claude struggles, ask why — context too noisy? prompt too vague? task too big?

Over time, you'll know when to be specific vs open-ended, when to plan vs explore, when to
clear context vs let it accumulate.
