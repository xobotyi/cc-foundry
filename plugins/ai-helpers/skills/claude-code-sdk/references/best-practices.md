# Best Practices for Claude Code

Claude Code is an agentic coding environment. Instead of writing code yourself and asking Claude to review, you describe
what you want and Claude explores, plans, and implements.

The core constraint: **Claude's context window fills up fast, and performance degrades as it fills.** Track context
usage with a custom status line.

## Give Claude a Way to Verify Its Work

The single highest-leverage thing you can do. Claude performs dramatically better when it can run tests, compare
screenshots, and validate outputs.

- **Provide verification criteria**: include test cases, expected outputs
- **Verify UI visually**: paste screenshots, ask Claude to screenshot results and compare
- **Address root causes**: paste the error, ask Claude to fix and verify

Verification can be a test suite, linter, or bash command. Invest in making it rock-solid.

## Explore First, Then Plan, Then Code

Separate research and planning from implementation to avoid solving the wrong problem.

1. **Explore** -- enter Plan Mode, read files, answer questions without changes
2. **Plan** -- create a detailed implementation plan (Ctrl+G to edit in text editor)
3. **Implement** -- switch to Normal Mode, code against the plan, run tests
4. **Commit** -- descriptive message and PR

Skip planning when scope is clear and the fix is small. Planning is most useful when uncertain about approach, modifying
multiple files, or unfamiliar with the code.

## Provide Specific Context

Reference specific files, mention constraints, point to example patterns:

- **Scope the task**: specify file, scenario, testing preferences
- **Point to sources**: direct Claude to git history, specific implementations
- **Reference patterns**: point to existing code patterns to follow
- **Describe symptoms**: provide error, likely location, and what "fixed" looks like

### Provide Rich Content

- `@` to reference files (Claude reads them before responding)
- Paste images directly (copy/paste or drag-and-drop)
- Give URLs for docs/API references (allowlist domains via `/permissions`)
- Pipe data: `cat error.log | claude`
- Let Claude fetch what it needs (bash commands, MCP tools, file reads)

## Configure Your Environment

### CLAUDE.md

Run `/init` to generate a starter. Include bash commands, code style, workflow rules. Keep it short and human-readable.

Include: bash commands Claude can't guess, non-default code style rules, test instructions, repo etiquette,
architectural decisions, dev environment quirks, common gotchas.

Exclude: anything Claude can figure out from code, standard language conventions, detailed API docs, frequently changing
info, long explanations, self-evident practices.

Add emphasis ("IMPORTANT", "YOU MUST") to improve adherence. Check into git for team contribution.

Import files with `@path/to/import` syntax. Place at `~/.claude/CLAUDE.md` (global), `./CLAUDE.md` (project), parent
directories (monorepos), or child directories (on-demand loading).

### Permissions

- `/permissions` to allowlist safe commands
- `/sandbox` for OS-level isolation
- `--dangerously-skip-permissions` for contained workflows (only in sandbox without internet)

### CLI Tools

Install `gh`, `aws`, `gcloud`, `sentry-cli`. Claude knows how to use them and can learn new ones:
`"Use 'foo-cli-tool --help' to learn about foo tool, then use it to solve A, B, C."`

### MCP Servers

`claude mcp add` to connect Notion, Figma, databases, monitoring, etc.

### Hooks

Deterministic actions at lifecycle points (unlike advisory CLAUDE.md). Claude can write hooks for you:
`"Write a hook that runs eslint after every file edit"`

### Skills

`SKILL.md` files in `.claude/skills/` for domain knowledge and reusable workflows. Auto-loaded when relevant or invoked
with `/skill-name`.

### Subagents

Specialized assistants in `.claude/agents/` with own context, tools, and model. Useful for isolated tasks.

### Plugins

`/plugin` to browse marketplace. Code intelligence plugins give precise symbol navigation and error detection.

## Communicate Effectively

### Ask Codebase Questions

Ask the same questions you'd ask a senior engineer: how does logging work, how to make a new endpoint, what does this
code do, why this approach instead of that one.

### Let Claude Interview You

For larger features, start with a minimal prompt and ask Claude to interview you:

```text
I want to build [brief description]. Interview me in detail using the AskUserQuestion tool.
Ask about technical implementation, UI/UX, edge cases, concerns, and tradeoffs.
Keep interviewing until we've covered everything, then write a complete spec to SPEC.md.
```

Then start a fresh session to execute the spec.

## Manage Your Session

### Course-Correct Early

- **Esc** -- stop mid-action, context preserved
- **Esc+Esc** or `/rewind` -- restore previous state or summarize from a message
- **"Undo that"** -- revert changes
- **`/clear`** -- reset context between unrelated tasks

After two failed corrections, `/clear` and write a better initial prompt.

### Manage Context Aggressively

- `/clear` frequently between tasks
- Auto compaction summarizes important content when approaching limits
- `/compact <instructions>` for controlled compaction (e.g., `/compact Focus on the API changes`)
- `Esc+Esc` > Summarize from here -- condense from a specific point
- CLAUDE.md instruction: `"When compacting, always preserve the full list of modified files"`
- `/btw` for side questions that don't enter conversation history

### Subagents for Investigation

Delegate research to subagents -- they explore in separate context and report back summaries:

```text
Use subagents to investigate how our authentication system handles token refresh.
```

### Checkpoints and Rewind

Every Claude action creates a checkpoint. Double-Esc or `/rewind` to restore conversation, code, or both. Persists
across sessions. Only tracks Claude's changes, not external processes.

### Resume Conversations

```bash
claude --continue    # Resume most recent
claude --resume      # Select from recent
```

Use `/rename` for descriptive session names.

## Automate and Scale

### Non-Interactive Mode

```bash
claude -p "prompt"                              # One-off
claude -p "prompt" --output-format json          # Structured output
claude -p "prompt" --output-format stream-json   # Streaming
```

### Parallel Sessions

- Claude Code desktop app -- multiple local sessions with isolated worktrees
- Claude Code on the web -- cloud infrastructure in isolated VMs
- Agent teams -- automated multi-session coordination

### Writer/Reviewer Pattern

Session A implements, Session B reviews with fresh context (no bias toward own code).

### Fan Out Across Files

```bash
for file in $(cat files.txt); do
  claude -p "Migrate $file from React to Vue. Return OK or FAIL." \
    --allowedTools "Edit,Bash(git commit *)"
done
```

Test on 2-3 files, refine prompt, then run at scale.

## Common Failure Patterns

- **Kitchen sink session** -- mixing unrelated tasks pollutes context. Fix: `/clear` between tasks.
- **Repeated corrections** -- failed approaches clutter context. Fix: after 2 failures, `/clear` and rewrite prompt.
- **Over-specified CLAUDE.md** -- too long, important rules get lost. Fix: prune ruthlessly, convert to hooks.
- **Trust-then-verify gap** -- plausible output without edge case handling. Fix: always provide verification.
- **Infinite exploration** -- unscoped investigation fills context. Fix: scope narrowly or use subagents.

## Develop Your Intuition

These patterns are starting points. Pay attention to what works. Notice prompt structure, context provided, and mode
when Claude produces great output. Over time you'll know when to be specific vs. open-ended, when to plan vs. explore,
when to clear vs. accumulate context.
