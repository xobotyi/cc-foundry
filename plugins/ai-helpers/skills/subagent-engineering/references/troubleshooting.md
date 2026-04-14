# Troubleshooting Subagents

Reference for the `subagent-engineering` skill. Covers diagnostic steps, error catalog, debug mode, and common failure
patterns for Claude Code subagents — including agent teams, background agents, worktree isolation, and the Agent SDK.

---

## Quick Symptom Index

- **Agent not found** → [Agent Discovery Failures](#agent-discovery-failures)
- **Wrong agent activates** → [Trigger Accuracy](#trigger-accuracy)
- **Agent never activates** → [Trigger Accuracy](#trigger-accuracy)
- **Permission / tool error** → [Tool Permissions](#tool-permissions)
- **Output wrong format** → [Output Format](#output-format)
- **Agent returns early** → [Task Incompletion](#task-incompletion)
- **Teammate not receiving messages** → [Agent Teams](#agent-teams)
- **Task coordination failure** → [Agent Teams](#agent-teams)
- **Background agent status unknown** → [Background Agents](#background-agents)
- **Worktree branch conflict** → [Worktree Isolation](#worktree-isolation)
- **SDK `settingSources` missing** → [Agent SDK](#agent-sdk)
- **Hook not firing** → [Hooks Configuration](#hooks-configuration)
- **Context exhaustion** → [Context Issues](#context-issues)
- **Slow / expensive** → [Performance](#performance)

---

## Agent Discovery Failures

The agent exists but `@agent-name` returns "agent not found" or similar.

Checklist:

- **File location** — agent file must be in `.claude/agents/` (project-scoped) or `~/.claude/agents/` (global). No other
  directories are scanned.
- **File extension** — must be `.md`. Files named `.txt`, `.yaml`, or without extension are ignored.
- **File name format** — must be lowercase-hyphenated: `code-reviewer.md`, not `CodeReviewer.md` or `code_reviewer.md`.
  The `@` reference uses the filename without extension.
- **Frontmatter syntax** — YAML frontmatter must be valid. A single syntax error (missing quote, bad indentation) causes
  the entire file to be skipped silently.
- **Required fields** — `name` and `description` are required. An agent without `description` will not appear in
  delegation decisions.

Verification steps:

1. Run `ls .claude/agents/` and confirm the file exists with the correct name and extension.
2. Open the file and validate frontmatter with a YAML linter or by checking indentation manually.
3. Confirm `name:` matches the filename stem exactly.

---

## Trigger Accuracy

### Over-triggering (agent activates for wrong requests)

Cause: description is too vague or uses generic language that matches many request types.

Fix:

- Narrow the description to specific nouns and verbs: "Reviews Go code for error handling patterns" not "Reviews code".
- Add a "when NOT to use" line in the description.
- Test with 5 out-of-scope requests; if any activate the agent, tighten further.

### Under-triggering (agent never activates for correct requests)

Cause: description is too specific, uses jargon the user won't use, or lacks delegation language.

Fix:

- Broaden with synonyms: "security audit, vulnerability scan, CVE check".
- Add explicit trigger phrases: "Invoke when the user asks to review, audit, or check security".
- Confirm the description contains "invoke when" or equivalent delegation signal.

### Broken (agent never activates regardless of input)

Cause: description has no delegation language, or frontmatter `name` field is missing.

Fix:

- Add an explicit "Invoke when:" line.
- Confirm `name:` field is present in frontmatter.
- Confirm the file is in the correct directory (see [Agent Discovery](#agent-discovery-failures)).

---

## Tool Permissions

### Tool not available to agent

Cause: tool not listed in `tools` frontmatter field, or field is missing entirely.

Fix:

- Add the tool to `tools:` list. Tool names are case-sensitive: `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`,
  `WebSearch`, `WebFetch`, `Task`, `TodoWrite`, `TodoRead`, `Bash`.
- If `tools:` is absent, the agent inherits the parent's tool set — check whether the parent session has the tool.

### Tool blocked despite being in `tools` list

Cause: `disallowedTools` in `settings.json` conflicts with the agent's `tools` list. `disallowedTools` takes precedence.

Fix:

- Check `settings.json` for `disallowedTools` entries that overlap with the agent's required tools.
- Either remove the tool from `disallowedTools` or accept the restriction and redesign the agent's approach.

### Permission denied on Bash command

Cause: the command is blocked by a hook or by `settings.json` permissions policy.

Fix:

- Check hooks in `settings.json` for `PreToolUse:Bash` matchers that might block the command.
- Verify the agent is using the narrowest command possible (prefer `Grep` over `bash grep`).

---

## Output Format

### Agent produces wrong structure

Cause: system prompt lacks explicit format specification.

Fix (apply in order until resolved):

1. Add a dedicated `## Output Format` section to the system prompt specifying exact structure, sections, and length.
2. Add a concrete example of expected output — agents follow examples more reliably than abstract descriptions.
3. Add a prefill-style opening line: "Start your response with: `## Summary`" to anchor the format.

### Output varies between runs

Cause: format instructions are ambiguous or placed too late in the system prompt.

Fix:

- Move format instructions to near the top of the system prompt, before workflow steps.
- Replace "should include" with "must include" — weaker language produces more variation.

---

## Task Incompletion

Agent returns before finishing all steps.

Cause: no sequential workflow, no explicit completion criteria, or no verification checklist.

Fix:

- Add numbered steps marked "complete IN ORDER before returning".
- Add a completion checklist at the end of the system prompt:
  ```
  Before returning, verify:
  - [ ] Step 1 completed
  - [ ] Step 2 completed
  - [ ] Output written to correct location
  ```
- Add an explicit final instruction: "Do not return until all checklist items are checked."

---

## Agent Teams

### Teammate not receiving messages

Cause: `SendMessage` tool not included in the sender's `tools` list, or message sent with wrong recipient name.

Diagnosis:

- Confirm `SendMessage` is in the sending agent's `tools` list.
- Confirm `to:` uses the teammate's name exactly as defined in `TeamCreate` — not a UUID, not a display name variant.
- Remember: plain text output is NOT visible to teammates. `SendMessage` is the only inter-agent communication channel.

Fix:

- Add `SendMessage` to `tools` in the sender's frontmatter.
- Verify recipient name spelling matches the team member name exactly.
- If broadcasting, use `to: "*"` sparingly — it scales linearly with team size.

### Task coordination failures

Symptoms: two agents work the same task, tasks run in wrong order, blocker tasks not respected.

Cause: missing `blockedBy` dependencies, or agents claimed the same task before `owner` was set.

Fix:

- Use `addBlockedBy` when creating dependent tasks to enforce order.
- Agents must call `TaskUpdate` with `owner` immediately when claiming a task — before starting work.
- Check `TaskList` before claiming to confirm no other agent already owns the task.
- Task descriptions must be fully self-contained — teammates have no shared conversation history, so all context (file
  paths, function names, acceptance criteria) must be in the description itself.

### TeammateIdle not firing

Cause: hook `event` field set incorrectly, or hook exit code is 0 (exit 2 is required to inject instructions).

Fix:

- Confirm hook event is `TeammateIdle` (not `AgentIdle` or similar).
- Exit with code `2` to inject new instructions; exit `0` means "continue normally".

### TaskCompleted hook not blocking completion

Cause: hook exits with 0 instead of 2.

Fix:

- Exit with `2` to block the task completion as a quality gate and return feedback.
- The hook receives task details as JSON on stdin — validate against acceptance criteria before deciding exit code.

---

## Background Agents

### Checking background agent status

Background agents run asynchronously. To check status:

- In Claude Code UI: check the Agents panel for the running agent's status indicator.
- Via SDK: poll the agent run object — status transitions through `running` → `completed` / `failed`.
- Look for `TaskCompleted` or `TeammateIdle` hook events if the agent is part of a team.

### Agent appears stuck

Cause: agent is waiting on a tool call that is blocked by a hook, or context is exhausted.

Fix:

- Check hook logs for `PreToolUse` events that may be blocking.
- Check if the agent has hit the context limit — look for truncation warnings in output.
- If context is exhausted, the agent cannot recover; cancel and restart with a more context-efficient prompt.

### Timeout handling

Background agents do not have a built-in timeout by default. For long-running agents:

- Set an explicit deadline in the task description: "Complete within 10 tool calls or return partial results."
- Use `TeammateIdle` hook to detect when an agent has been idle longer than expected and inject a stop instruction.
- Design agents to emit progress via `SendMessage` so the team lead can detect stalls.

---

## Worktree Isolation

### Worktree cleanup failure

Cause: `ExitWorktree` not called, or agent crashed before cleanup.

Fix:

- Always wrap worktree work in try/finally equivalent: emit cleanup instructions at the end of the system prompt.
- If a stale worktree exists: `git worktree remove --force <path>` from the main repo root.
- List existing worktrees with `git worktree list` to identify orphans.

### Branch conflicts in worktree

Cause: two agents checked out the same branch in separate worktrees, or agent created a branch that already exists.

Fix:

- Each agent must use a unique branch name — include a timestamp or agent ID in the branch name.
- Before `EnterWorktree`, check `git branch --list <name>` to confirm the branch does not already exist.
- If the branch exists and has unrelated changes, delete it (`git branch -D <name>`) only after confirming it is safe.

### Worktree changes not visible to main session

Cause: worktree writes to its own working tree; the main session's working tree is separate.

Fix:

- This is expected behavior. Merge or cherry-pick from the worktree branch into main after the agent completes.
- Do not expect the main session to see worktree file changes directly.

---

## Agent SDK

### `settingSources` missing (most common SDK failure)

Cause: the `ClaudeCodeOptions` object was constructed without the `settingSources` field, or it was set to an empty
array.

Symptom: agent runs with no settings applied — no tools, no hooks, no model restrictions — or throws a validation error
on startup.

Fix:

- Always include `settingSources` in options:
  ```typescript
  const options: ClaudeCodeOptions = {
    settingSources: ["user", "project"],
    // ...
  };
  ```
- Valid values: `"user"` (loads `~/.claude/settings.json`), `"project"` (loads `.claude/settings.json`), `"enterprise"`.
- If `settingSources` is intentionally empty (fully isolated agent), confirm this is deliberate — it disables all
  configured tools and hooks.

### `allowedTools` not including required tools

Cause: `allowedTools` in SDK options does not list a tool the agent's system prompt expects to use.

Symptom: agent attempts a tool call and receives a permission error; task fails mid-workflow.

Fix:

- Enumerate all tools the agent needs in `allowedTools`:
  ```typescript
  allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
  ```
- Tool names are case-sensitive and must match exactly.
- Cross-reference the agent's system prompt workflow steps against `allowedTools` before running.
- If using `disallowedTools` alongside `allowedTools`, `disallowedTools` takes precedence — check for conflicts.

### SDK agent exits without completing task

Cause: unhandled exception in the agent loop, or the agent returned `stop_reason: end_turn` before finishing.

Fix:

- Check the `ClaudeCodeResult` object for `stop_reason` and `error` fields.
- If `stop_reason` is `max_tokens`, increase `maxTokens` in options or reduce prompt verbosity.
- Wrap the SDK call in try/catch and log the full error object — SDK errors are often swallowed silently.

---

## Hooks Configuration

### Hook not firing

Diagnosis checklist:

- `event` field matches exactly: `PreToolUse`, `PostToolUse`, `Stop`, `TeammateIdle`, `TaskCompleted`.
- `matcher` pattern (if used) matches the tool name or agent name — test the regex independently.
- Hook script is executable: `chmod +x .claude/hooks/script.sh`.
- Hook script path is absolute or correctly relative to the project root.

### Hook fires but has no effect

Cause: hook exits with code 0 (no-op). Exit codes:

- **0** — continue normally
- **2** — inject content into context (for `PreToolUse` / `TeammateIdle`) or block (for `TaskCompleted`)

Fix:

- Confirm the script exits with the correct code for the intended effect.
- Add `set -e` to shell scripts to catch silent failures.

---

## Context Issues

### Context exhaustion mid-task

Cause: agent reads too many files, produces verbose output, or runs in a long session.

Fix:

- Add efficiency instructions: "Read each file at most once. Do not re-read files you have already processed."
- Restrict `tools` to prevent exploratory use (e.g., remove `Glob` if not needed).
- Switch to a smaller model (`haiku`) for token-intensive but cognitively simple tasks.

### Subagent isolated from parent context

This is expected behavior — subagents do not inherit the parent's conversation history. They receive only their system
prompt and the invocation message.

Fix:

- Include all necessary context in the agent's system prompt or in the invocation message.
- For dynamic context, pass it explicitly in the task description (agent teams) or in the `prompt` parameter (SDK).

---

## Performance

### Agent is slow

Primary levers, in order of impact:

- **Model** — switch from `opus` or `sonnet` to `haiku` for simple tasks
- **Tool calls** — each tool call adds latency; reduce unnecessary reads and searches
- **Output length** — verbose output takes longer to generate; add length constraints to the system prompt

### Agent is expensive

- Profile which tool calls are repeated unnecessarily
- Add "read each file at most once" instruction
- Restrict `tools` to the minimum set needed — fewer available tools means fewer exploratory calls
- Use `haiku` for subtasks that do not require reasoning

---

## Debug Mode

To get verbose agent execution output:

```bash
claude --debug @agent-name "test request"
```

Debug output includes:

- Tool calls attempted and their results
- Hook events fired and exit codes
- Token usage per turn
- Stop reason for each completion

Use debug output to pinpoint exactly which step fails in a multi-step workflow.
