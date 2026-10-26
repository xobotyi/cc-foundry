# the-workflow Plugin

Agentic workflow mechanics that hold across every project: persistent project context (CLAUDE.md and `.claude/rules/`),
structured context transfer across a boundary, and the user's corrections turned into that persistent context.

## Skills

- **`claude-md`** — CLAUDE.md and `.claude/rules/` authoring: what loads when, layer routing, writing, trimming,
  diagnosis of an ignored rule
- **`handoff`** — triage conversation context into a standalone transfer document. User-invoked only, via `/handoff`
- **`debrief`** — harvest the user's corrections from session transcripts and write each durable lesson into the
  instruction file it belongs in, through an approval gate. User-invoked only, via `/debrief`; the extractor is
  `scripts/extract-corrections.mjs`

## Skill Dependencies

- **`debrief` invokes `claude-md` before its gate.** Choosing the layer a lesson belongs in is `claude-md`'s subject,
  and `debrief` carries only the routing that is specific to a correction

## Plugin Scope

- The wording of instruction text belongs to `ai-helpers`' `prompt-engineering`, which `claude-md` declares as a hard
  `<prerequisite>`. `plugin.json` lists `ai-helpers` in `dependencies` for that prerequisite, so the dependency goes
  when the prerequisite goes ([ADR 1.3](/design-docs/adr/1.3-skill-dependencies.md))

## Conventions

**`claude-md`:**

- Every environment claim — loading order, compaction behavior, size thresholds, rules discovery — is verified against
  the Claude Code docs before it ships. These move with the CLI, and a stale claim in a skill is obeyed rather than
  discounted

**`handoff`:**

- Stays self-contained and under 200 lines — no reference files, no external dependencies. The skill runs when context
  is nearly full, which is the documented exception to the no-line-cap rule
  ([ADR 1.2](/design-docs/adr/1.2-skill-md-length.md))
- The state grade, the Contingencies section, and the closing read-back come from the I-PASS handoff protocol (Starmer
  et al., _Pediatrics_ 129:201-204); the recall-then-precision two-pass triage comes from Anthropic's
  context-engineering guidance. Each replaces an element real handoffs omit — do not cut them as ceremony
- `disable-model-invocation: true` stays. Without it the model suggests a handoff on nearly every request once a session
  passes ~500K tokens, disrupting the user's workflow
- That flag also removes the description from context, so neither `description` nor `when_to_use` routes anything. Both
  are still written, in the form every cc-foundry skill uses, for the one reader that sees them — a human scanning the
  `/` menu. Keep trigger phrasing out of `description`, where it only crowds the menu line
- Never give handoff `context: fork`. A forked skill runs as a subagent with no conversation history, and the
  conversation is handoff's only input

**`debrief`:**

- `disable-model-invocation: true` stays: the skill writes instruction files, so a run starts only when the user asks
  for one. The `handoff` rule on `description` and `when_to_use` applies here too
- Never give debrief `context: fork`. The gate needs the user's answer on each lesson, and a forked run has no user to
  ask
- The skill keeps no state between runs — a ledger of processed candidates grows without bound, and a cursor that skips
  sessions already read hides the recurrence that makes a lesson. Every run rereads its whole window; volume is handled
  by the two-pass index and pick, never by skipping history
- The transcript format is undocumented and changes between CLI versions. `.dev/extract-corrections.test.mjs` pins every
  marker the extractor relies on; run `vp test plugins/the-workflow` after any change to the script, and add a fixture
  entry for each new marker
- Transcript facts that defy a reasonable assumption, each pinned by that test:
  - A human prompt carries `origin.kind: "human"`. In a session whose entries carry `origin`, an entry without it is
    synthetic: a compaction summary, a teammate message, a typed slash command
  - A message the user types while the agent works is an `attachment` of type `queued_command`, not a `user` entry
  - An entry's `cwd` follows the agent's `cd`, so a session's repository comes from its first `cwd`: a
    `/.claude/worktrees/<name>` suffix folded off, then the nearest ancestor holding `.git`, where a linked worktree's
    `.git` file points through `gitdir` to the main repository. A transcript directory is keyed to the launch directory,
    so a session launched in a subdirectory lands in its own directory under the same repository
  - A resumed or forked session copies earlier entries into its own file under a new `sessionId` and the same `uuid`
  - SDK-driven sessions, such as a memory plugin's background observer, carry `entrypoint: sdk-*` and hold no human
    corrections
  - A skill the user types is a `<command-name>` entry followed by an `isMeta` entry that opens with
    `Base directory for this skill:`; a built-in command such as `/compact` has no such entry. A skill stays loaded
    across compaction, which re-attaches it in an `invoked_skills` attachment
  - A failed tool call is a `tool_result` with `is_error: true`, joined to its call by `tool_use_id`. A Bash error that
    opens with `Exit code N` is a command that ran and failed, which is ordinary work; one without it was refused before
    it ran, by the harness, a hook, or a permission
  - Auto memory is on unless `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, or the first settings layer that sets
    `autoMemoryEnabled` (managed, local, project, user) sets it `false`; `CLAUDE_CODE_DISABLE_AUTO_MEMORY=0` forces it
    on. Its directory is `autoMemoryDirectory` when set, else `projects/<slug>/memory` keyed to the git repository root,
    not to the launch directory. `MEMORY.md` is the index; every other `.md` file there is one memory
