# Best Practices Reference

Patterns for getting the most out of Claude Code.

## Core Constraint

**Claude's context window fills up fast, and performance degrades as it fills.**

Context holds your entire conversation, files Claude reads, and command outputs.
This can fill quickly. When full, Claude may "forget" earlier instructions or
make more mistakes.

## Give Claude Verification

**This is the single highest-leverage thing you can do.**

Claude performs dramatically better when it can verify its own work.

| Strategy                  | Before                                      | After                                                                                    |
|---------------------------|---------------------------------------------|------------------------------------------------------------------------------------------|
| Provide verification      | "implement email validation"                | "write validateEmail. test: user@example.com=true, invalid=false. run tests after"      |
| Verify UI visually        | "make dashboard look better"                | "[paste screenshot] implement this. take screenshot, compare, list differences and fix" |
| Address root causes       | "the build is failing"                      | "build fails with [error]. fix it, verify build succeeds. address root cause"           |

Verification can be tests, linter, or Bash commands that check output.

## Explore → Plan → Code

Separate research from implementation.

1. **Explore** (Plan Mode): Claude reads files, answers questions without changes
2. **Plan**: Ask Claude to create detailed implementation plan
3. **Implement** (Normal Mode): Let Claude code, verifying against plan
4. **Commit**: Ask Claude to commit with descriptive message

Skip planning for small, clear tasks. Use it when uncertain about approach,
changing multiple files, or unfamiliar with the code.

## Provide Specific Context

| Strategy                | Before                            | After                                                          |
|-------------------------|-----------------------------------|----------------------------------------------------------------|
| Scope the task          | "add tests for foo.py"            | "test foo.py covering logged-out edge case. avoid mocks"       |
| Point to sources        | "why weird API?"                  | "look through git history, summarize how API came to be"       |
| Reference patterns      | "add calendar widget"             | "look at HotDogWidget.php, follow pattern for calendar widget" |
| Describe symptoms       | "fix the login bug"               | "login fails after timeout. check src/auth/, especially refresh" |

### Rich Content

- Reference files with `@` instead of describing locations
- Paste images directly (copy/paste or drag-drop)
- Give URLs for documentation
- Pipe data: `cat error.log | claude`
- Let Claude fetch what it needs using Bash/MCP

## Configure Your Environment

### Write Effective CLAUDE.md

Run `/init` to generate starter file, then refine.

Include:

- Bash commands Claude can't guess
- Code style rules that differ from defaults
- Testing instructions
- Repository etiquette
- Architectural decisions
- Common gotchas

Exclude:

- Anything Claude can figure out by reading code
- Standard conventions Claude already knows
- Detailed API docs (link instead)
- Information that changes frequently
- File-by-file descriptions

**Keep it concise.** If Claude ignores rules, file is probably too long.

### Configure Permissions

- Use `/permissions` to allowlist safe commands
- Use `/sandbox` for OS-level isolation
- `--dangerously-skip-permissions` for contained workflows (in sandbox only)

### Use CLI Tools

Tell Claude to use `gh`, `aws`, `gcloud`, `sentry-cli` for external services.
CLI tools are the most context-efficient integration method.

### Connect MCP Servers

`claude mcp add` connects external tools like Notion, Figma, databases.

### Set Up Hooks

Hooks run scripts at specific workflow points. Unlike CLAUDE.md (advisory),
hooks are deterministic.

```
Write a hook that runs eslint after every file edit
```

### Create Skills

`.claude/skills/` for domain knowledge and reusable workflows.

### Create Subagents

`.claude/agents/` for specialized assistants that run in isolated context.

### Install Plugins

`/plugin` to browse marketplace. Plugins bundle skills, hooks, subagents, MCP.

## Communicate Effectively

### Ask Codebase Questions

Ask Claude questions you'd ask another engineer:

- How does logging work?
- How do I make a new API endpoint?
- What does this code do on line 134?
- Why does this call foo() instead of bar()?

### Let Claude Interview You

For larger features:

```
I want to build [brief description]. Interview me using AskUserQuestion tool.

Ask about technical implementation, UI/UX, edge cases, concerns, tradeoffs.
Don't ask obvious questions, dig into hard parts.

Keep interviewing until covered, then write spec to SPEC.md.
```

Then start fresh session to execute the spec.

## Manage Your Session

### Course-Correct Early

- `Esc`: Stop mid-action, context preserved
- `Esc + Esc` or `/rewind`: Restore previous state
- `"Undo that"`: Have Claude revert changes
- `/clear`: Reset between unrelated tasks

After two failed corrections, `/clear` and write better initial prompt.

### Manage Context Aggressively

- `/clear` frequently between tasks
- Auto-compaction summarizes when approaching limits
- `/compact <instructions>` for manual control
- Customize compaction in CLAUDE.md

### Use Subagents for Investigation

```
Use subagents to investigate how authentication handles token refresh
```

Subagents explore in separate context, keeping main conversation clean.

### Rewind with Checkpoints

Every Claude action creates checkpoint. Double-tap `Esc` or `/rewind` to open menu.

Options:

- Restore conversation only (keep code)
- Restore code only (keep conversation)
- Restore both

### Resume Conversations

```bash
claude --continue    # Resume most recent
claude --resume      # Select from recent
```

Use `/rename` to give descriptive names.

## Automate and Scale

### Headless Mode

```bash
claude -p "Explain what this project does"
claude -p "List all API endpoints" --output-format json
claude -p "Analyze this log file" --output-format stream-json
```

### Parallel Sessions

Multiple sessions enable quality-focused workflows:

| Session A (Writer)                         | Session B (Reviewer)                               |
|--------------------------------------------|----------------------------------------------------|
| Implement rate limiter                     |                                                    |
|                                            | Review implementation, look for edge cases         |
| Address review feedback                    |                                                    |

### Fan Out Across Files

```bash
for file in $(cat files.txt); do
  claude -p "Migrate $file from React to Vue" \
    --allowedTools "Edit,Bash(git commit *)"
done
```

## Common Failure Patterns

| Pattern                     | Fix                                                        |
|-----------------------------|------------------------------------------------------------|
| Kitchen sink session        | `/clear` between unrelated tasks                           |
| Correcting over and over    | After 2 fails, `/clear` and better initial prompt          |
| Over-specified CLAUDE.md    | Ruthlessly prune, convert to hooks                         |
| Trust-then-verify gap       | Always provide verification (tests, scripts, screenshots)  |
| Infinite exploration        | Scope narrowly or use subagents                            |

## Develop Intuition

Patterns are starting points. Pay attention to what works:

- When Claude produces great output, notice the prompt structure
- When Claude struggles, ask why (context too noisy? prompt too vague?)

Over time, you'll know when to be specific vs open-ended, when to plan vs
explore, when to clear context vs let it accumulate.
