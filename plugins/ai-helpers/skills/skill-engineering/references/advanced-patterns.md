# Advanced Skill Patterns

Reference for multi-file skills, fork pattern, workflow skills, composable skills, verifiable intermediate outputs,
permission scoping, plugin packaging, Agent SDK integration, and agent teams.

---

## Multi-File Skills

A skill directory can contain any number of supporting files alongside `SKILL.md`. Use this when the main skill body
would exceed ~500 lines, or when reference material is only needed for specific sub-tasks.

**Canonical layout:**

```text
my-skill/
├── SKILL.md          # Required — overview, routing, and behavioral rules
├── reference.md      # Detailed API or domain docs
├── examples.md       # Sample outputs showing expected format
└── scripts/
    └── helper.py     # Script Claude can execute via Bash
```

**Rules for supporting files:**

- `SKILL.md` must stay self-sufficient — all behavioral rules go here, not in supporting files
- Supporting files hold catalog/lookup content loaded on demand for specific sub-tasks
- Reference each supporting file from `SKILL.md` with an explicit description so Claude knows what it contains and when
  to load it
- Never split behavioral constraints across files — agents skip files they haven't been explicitly directed to read

**Referencing supporting files in `SKILL.md`:**

```markdown
## Additional resources

- For complete API field reference, see [reference.md](reference.md)
- For format examples, see [examples.md](examples.md)
```

Use `${CLAUDE_SKILL_DIR}` to build absolute paths that survive regardless of working directory:

```markdown
See [reference.md](${CLAUDE_SKILL_DIR}/reference.md) for the full field list.
```

---

## Dynamic Context Injection

The `` !`<command>` `` syntax executes a shell command before the skill content reaches Claude. The command's stdout
replaces the placeholder — Claude receives the rendered output, not the command itself.

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- Diff: !`gh pr diff`
- Comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Task
Summarize the intent, risk, and missing test coverage.
```

**Execution order:** All `` !`...` `` substitutions run as preprocessing — before Claude sees anything.

**Multi-line variant** — use a fenced block opened with ` ```! `:

````markdown
## Environment
```!
node --version
git status --short
cat package.json | jq '.dependencies | keys'
```
````

**When to use dynamic injection:**

- Live data that changes between invocations (PR diffs, git status, CI output)
- Environment fingerprinting (versions, flags, installed tools)
- Seeding context that would otherwise require Claude to run discovery commands

**When not to use it:** Static content that belongs in `SKILL.md` directly; large outputs that would blow the context
budget before Claude even starts.

To disable shell execution for user/project/plugin skills cluster-wide, set `"disableSkillShellExecution": true` in
settings. Bundled and managed skills are unaffected.

---

## Fork Pattern (`context: fork`)

`context: fork` runs the skill in an isolated subagent context. The skill body becomes the subagent's prompt. It has no
access to your conversation history.

```yaml
---
name: deep-research
description: Research a topic thoroughly without polluting main context
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:

1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

**`agent` field** — specifies which subagent configuration to use:

- `Explore` — read-only tools, optimized for codebase exploration
- `Plan` — analysis without code changes
- `general-purpose` — full tool access (default when `agent` is omitted)
- Any custom subagent from `.claude/agents/` by name

**When fork is required:**

- The skill reads many files (context isolation prevents main conversation bloat)
- The task is self-contained with no need for conversation history
- You want subagent-level tool scoping independent of the main session

**Fork vs inline — decision rule:**

| Situation                                   | Pattern                                                                       |
| :------------------------------------------ | :---------------------------------------------------------------------------- |
| Skill adds knowledge Claude applies inline  | No fork — inline                                                              |
| Skill runs a self-contained investigation   | `context: fork` + `agent: Explore`                                            |
| Skill executes a workflow with side effects | `context: fork` + `agent: general-purpose` + `disable-model-invocation: true` |
| Skill coordinates other agents              | `context: fork` + team workflow                                               |

**Warning:** `context: fork` only makes sense for skills with explicit tasks. A skill containing guidelines ("use these
conventions") without an actionable task will produce no meaningful output in a forked context.

---

## Workflow Skills

Workflow skills encode multi-phase processes with explicit checkpoints. They are almost always user-invoked
(`disable-model-invocation: true`) because they have side effects or require deliberate timing.

```yaml
---
name: release
description: Cut a release and publish
disable-model-invocation: true
context: fork
allowed-tools: Bash(git *) Bash(npm *) Bash(gh *)
---

Cut a release for version $ARGUMENTS.

## Phase 1 — Verification
1. Run `npm test` — abort if any test fails
2. Run `npm run lint` — abort if any error (warnings ok)
3. Confirm CHANGELOG has an entry for $ARGUMENTS

## Checkpoint
Report pass/fail for each check above. Stop here if any failed.

## Phase 2 — Release
4. Bump version in package.json to $ARGUMENTS
5. Commit: `git commit -am "chore: release $ARGUMENTS"`
6. Tag: `git tag v$ARGUMENTS`
7. Push: `git push && git push --tags`
8. Publish: `npm publish`

## Phase 3 — Post-release
9. Create GitHub release: `gh release create v$ARGUMENTS --generate-notes`
10. Report the release URL
```

**Structural rules for workflow skills:**

- Name phases explicitly — "Phase 1", "Phase 2" etc.
- Place a checkpoint block between phases that have irreversible actions
- Each phase has a clear input state and output state
- Abort conditions are explicit — "abort if X" not "consider aborting"
- `context: fork` keeps side effects isolated from the main conversation

---

## Verifiable Intermediate Outputs

Workflow skills with external side effects must verify each phase before proceeding. The pattern: run the action, then
run a verification command, then report the result before moving to the next phase.

```markdown
## Phase 1 — Build
1. Run `npm run build`
2. Verify: `ls dist/` — confirm output files exist
3. Report: list the generated files

## Checkpoint
Stop if build output is missing or empty.

## Phase 2 — Deploy
...
```

**Verification strategies by action type:**

- File writes → `ls` or `cat` the output
- Database changes → `SELECT` the affected rows
- API calls → check the response code and key fields
- Git operations → `git log --oneline -3` or `git status`
- Test runs → parse exit code AND scan for "failed" in output

Verifiable intermediate outputs prevent the failure mode where Claude reports success but the actual effect silently
failed.

---

## Composable Skills (Skills Invoking Skills)

Skills can invoke other skills using `/skill-name` in their instructions, composing workflows from focused building
blocks.

```yaml
---
name: fix-and-ship
description: Fix a GitHub issue and ship it
disable-model-invocation: true
---

Fix issue $ARGUMENTS and ship it:

1. /fix-issue $ARGUMENTS
2. After the fix is confirmed, /commit
3. After commit, /create-pr
```

**When composability adds value:**

- Each sub-skill is independently useful and already well-tested
- The composition is a specific workflow, not just a concatenation of prompts
- The sub-skills have stable interfaces (their `$ARGUMENTS` contracts are clear)

**Anti-patterns:**

- Chaining skills that are too tightly coupled (better as a single workflow skill)
- Invoking skills purely to avoid writing instructions inline (adds indirection without gain)
- Assuming a sub-skill's output format in the parent (fragile coupling)

---

## Permission Scoping (`allowed-tools`)

`allowed-tools` grants pre-approval for specific tools while the skill is active. It does not restrict access — it only
removes the per-use approval prompt for listed tools.

**Syntax:**

```yaml
# Space-separated string
allowed-tools: Read Grep Glob Bash(git *)

# YAML list
allowed-tools:
  - Read
  - Bash(npm run test)
  - Bash(gh pr *)
```

**Scoping patterns:**

- `Bash` — approves all Bash commands (use only in tightly controlled skills)
- `Bash(git *)` — approves any git subcommand
- `Bash(npm run test)` — approves exactly this command, nothing else
- `Read Grep Glob` — approves read-only exploration tools

**`allowed-tools` in CLI vs SDK:**

- CLI: `allowed-tools` frontmatter is fully enforced per-skill
- SDK: `allowed-tools` frontmatter is **ignored**; control tool access via `allowedTools` in SDK query options instead

**Permission rules for controlling which skills Claude can invoke:**

```text
# Allow only specific skills (in /permissions deny rules)
Skill(commit)
Skill(review-pr *)

# Deny all skills
Skill
```

Syntax: `Skill(name)` for exact match, `Skill(name *)` for prefix match with any arguments.

---

## Invocation Control

Two frontmatter fields control who can invoke a skill:

- `disable-model-invocation: true` — only the user can invoke (via `/skill-name`); description removed from context
- `user-invocable: false` — only Claude can invoke; hidden from the `/` menu

**Decision rule:**

- Has side effects or requires deliberate timing → `disable-model-invocation: true`
- Background knowledge users shouldn't invoke directly → `user-invocable: false`
- Default — both user and Claude can invoke

`user-invocable` only controls menu visibility, not Skill tool access. To block programmatic invocation, use
`disable-model-invocation: true`.

---

## Skill-Scoped Hooks

The `hooks` frontmatter field attaches lifecycle hooks scoped to a specific skill — they activate only when the skill
runs, not for the entire session.

```yaml
---
name: edit-and-lint
description: Edit files with automatic lint on every save
hooks:
  PostToolUse:
    - matcher: Edit
      hooks:
        - type: command
          command: npm run lint --silent
---

Edit the requested files. Lint runs automatically after each edit.
```

**Common hook patterns for skills:**

- `PostToolUse` on `Edit` — run formatters or linters after every file change
- `PostToolUse` on `Bash` — log or validate command output
- `PreToolUse` on `Bash` — gate commands against a policy check

Skill-scoped hooks are more precise than session-level hooks in `settings.json` — they activate only for the duration of
the skill's work, reducing unintended side effects on unrelated tasks.

---

## Plugin Packaging

Plugins bundle skills, hooks, subagents, and MCP servers into a single installable unit.

**Plugin skill layout:**

```text
my-plugin/
├── .claude-plugin/
│   └── plugin.json       # Plugin metadata and version
├── skills/
│   └── my-skill/
│       └── SKILL.md
├── agents/
│   └── my-agent.md
├── hooks/
│   └── post-edit.sh
└── LICENSE
```

**Plugin skill namespace:** Plugin skills load under the `plugin-name:skill-name` namespace, preventing conflicts with
project and personal skills of the same name.

**Skill locations — precedence (highest to lowest):**

- Enterprise (managed settings)
- Personal (`~/.claude/skills/`)
- Project (`.claude/skills/`)
- Plugin (`<plugin>/skills/`)

When skills share the same name across levels, higher-priority location wins. Plugin namespace prevents cross-level
conflicts.

**Distributing skills at different scopes:**

- Team → commit `.claude/skills/` to version control
- Plugin → create a `skills/` directory in your plugin, publish to marketplace
- Organization → deploy via managed settings (`~/.claude/managed-settings.json`)

---

## Agent SDK Integration

When using skills programmatically via the Claude Agent SDK, the filesystem-based model still applies — skills cannot be
registered programmatically.

**Minimum configuration to enable skills in the SDK:**

```python
# Python
options = ClaudeAgentOptions(
    cwd="/path/to/project",          # Must contain .claude/skills/
    setting_sources=["user", "project"],  # Required — skills not loaded by default
    allowed_tools=["Skill", "Read", "Bash"],
)
```

```typescript
// TypeScript
const options = {
  cwd: "/path/to/project",
  settingSources: ["user", "project"],  // Required — skills not loaded by default
  allowedTools: ["Skill", "Read", "Bash"],
};
```

**Critical: `setting_sources` / `settingSources` is required.** Without it, skills are never loaded even if `"Skill"` is
in `allowed_tools`. This is the most common SDK integration failure.

**Skill locations loaded by source:**

- `"project"` → `.claude/skills/` relative to `cwd`
- `"user"` → `~/.claude/skills/`
- Plugin skills are loaded automatically if the plugin is installed

**Tool access in SDK — `allowed-tools` frontmatter is ignored.** Control tool access through `allowedTools` in query
options. Combine with `permissionMode: "dontAsk"` to deny anything not in the list:

```typescript
const options = {
  settingSources: ["user", "project"],
  allowedTools: ["Skill", "Read", "Grep", "Glob"],
  permissionMode: "dontAsk",  // Deny tools not in allowedTools
};
```

---

## Agent Teams

Skills can coordinate multiple agents via team workflows. This pattern is used for parallelizable work, quality checks,
or specialized role separation.

**Team pattern — skill-as-orchestrator:**

```yaml
---
name: parallel-review
description: Run parallel code review across multiple dimensions
context: fork
disable-model-invocation: true
---

Orchestrate a multi-agent code review of $ARGUMENTS:

1. Create a team with TeamCreate
2. Create specialized review tasks with TaskCreate:
   - Security review: injection, auth, secrets exposure
   - Performance review: N+1 queries, unnecessary allocations
   - Test coverage: missing edge cases, brittle assertions
3. Spawn agents with team_name so they join as teammates
4. Wait for all tasks to complete
5. Aggregate findings and produce a final report
```

**When team coordination belongs in a skill:**

- Workflow is well-defined and repeatable (same phases each time)
- The user wants `/parallel-review` as a direct command
- Orchestration logic is domain-specific and should be versioned with the codebase

**When team coordination belongs in ad-hoc prompts:** One-off investigations, exploratory work, or workflows that vary
significantly each time — these don't benefit from the overhead of packaging.

**Team workflow constraints:**

- Always use `TeamCreate` → `TaskCreate` → spawn with `team_name` (never standalone subagents for user-requested
  parallel work)
- Standalone subagents pollute the caller's context; teammates communicate via `SendMessage` summaries
- Tasks shared via task list; agents claim, update, and complete them

---

## Skill Content Lifecycle

Understanding how skill content persists through a session prevents common confusion:

- **At invocation** — rendered `SKILL.md` content enters the conversation as a single message
- **After invocation** — content stays for the rest of the session; Claude Code does not re-read the skill file
- **At compaction** — the most recent invocation of each skill is re-attached after summary (up to 5,000 tokens per
  skill, 25,000 token shared budget); older skills can be dropped if the budget is exceeded
- **Re-invocation** — re-invoke a skill after compaction to restore full content if it was dropped

If a skill stops influencing behavior mid-session, it was likely dropped during compaction. Re-invoke it, or strengthen
description and instructions so the model maintains alignment without repeated prompting.

---

## Effort and Model Override

Per-skill model and effort overrides let high-stakes skills use a stronger model without changing the session default:

```yaml
---
name: architecture-review
description: Deep architectural analysis of a proposed design
model: opus
effort: max
context: fork
---

Analyze the architectural implications of $ARGUMENTS...
```

**Effort levels:** `low`, `medium`, `high`, `max` (Opus 4.6 only). Overrides session effort level for this skill's
execution.

**Model field:** Accepts any model identifier. The skill runs with this model regardless of session model.

Use model/effort overrides sparingly — they increase cost. Reserve for skills where output quality directly affects
correctness (security reviews, design decisions, migration planning).
