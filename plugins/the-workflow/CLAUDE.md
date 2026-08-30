# the-workflow Plugin

Agentic workflow mechanics — the two sides of workflow quality that hold across every project: persistent project
context (CLAUDE.md and `.claude/rules/`) and structured context transfer across a boundary.

## Skills

- **`claude-md`** — CLAUDE.md and `.claude/rules/` authoring: what loads when, layer routing, writing, trimming,
  diagnosis of an ignored rule
- **`handoff`** — triage conversation context into a standalone transfer document. User-invoked only, via `/handoff`

## Conventions

**`claude-md`:**

- Every environment claim — loading order, compaction behavior, size thresholds, rules discovery — is verified against
  the Claude Code docs before it ships. These move with the CLI, and a stale claim in a skill is obeyed rather than
  discounted

**`handoff`:**

- Stays self-contained and under 200 lines — no reference files, no external dependencies. The skill runs when context
  is nearly full, which is the documented exception to the no-line-cap rule (`docs/adr/0002`)
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
