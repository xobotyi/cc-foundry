# the-workflow Plugin

Agentic workflow mechanics — the skills that make working with Claude Code effective across sessions, projects, and
teams. Covers persistent project context (CLAUDE.md), structured handoff across context boundaries, and workflow
patterns that apply regardless of what domain you're working in.

## Skills

- **`handoff`** — triage conversation context into a structured transfer document (user-invoked only)
- **`claude-md`** — CLAUDE.md and `.claude/rules/` authoring: what loads when, layer routing, writing, trimming,
  diagnosis

## How It Works

The plugin addresses two sides of agentic workflow quality:

**Persistent context** — the `claude-md` skill owns the CLAUDE.md and `.claude/rules/` artifacts. It leads with the
loading model (what loads at launch, what loads on demand, what survives compaction) because routing and trimming
decisions are wrong whenever that model is wrong, then covers layer routing (CLAUDE.md vs `.claude/rules/` vs
skills/hooks/settings/memory), what content belongs in the file, writing rules, trimming against the 200-line target,
and diagnosis of an ignored rule (never loaded, vanished after compaction, buried, vague, stale, contradictory, wrong
artifact). `references/scaffold.md` carries the canonical section order, the creation workflow, and monorepo layouts.
The goal is not completeness — it's compliance.

**Context transfer** — the `handoff` skill guides the agent through a structured triage of its own context, producing a
prompt-quality document that a receiving agent (or the same agent in a new session) can use as a cold-start instruction
set. Two modes serve different receivers: self-handoff (session restart) and teammate handoff (delegation). Designed for
low token budgets — reads only from conversation context and targets 500-2000 token output.

## Conventions

- `claude-md` carries a hard `<prerequisite>` on `ai-helpers:prompt-engineering` (ADR 0003). Generic instruction-writing
  craft — concreteness, the instruction budget, timelessness — stays in `prompt-engineering`; `claude-md` carries only
  what is specific to the CLAUDE.md and rules artifacts
- Every environment claim in `claude-md` — loading order, compaction behavior, size thresholds, rules discovery — is
  verified against the Claude Code docs before it ships. These move with the CLI, and a stale claim in a skill is obeyed
  rather than discounted
- The handoff document travels by user copy-paste and lands as the receiver's first message. Two consequences the skill
  depends on: a directive written into it is obeyed, which is what makes the closing read-back work; and it may never
  reference a file the receiving side does not have, including a handoff file this session did not commit
- Four of handoff's elements are ported from clinical and agent prior art, not invented: the state grade, the
  contingencies section, and the closing read-back come from the I-PASS handoff mnemonic (Starmer et al., _Pediatrics_
  129:201-204), which was itself built around the three elements observers found most often absent from real handoffs.
  The recall-then-precision two-pass triage comes from Anthropic's context-engineering guidance on compaction. Do not
  cut them as ceremony — each replaces a documented omission
- The handoff skill must remain self-contained: no references, no external dependencies
- Handoff SKILL.md must stay under 200 lines to minimize token cost when context is nearly full
- The handoff skill produces a standalone document — it must make sense without access to the originating conversation
- Handoff uses `disable-model-invocation: true` — the model must never autonomously decide to hand off. In long sessions
  (500K+ tokens), the model aggressively suggests handoff on every request, disrupting the user's workflow. Handoff is
  strictly a user decision via `/handoff`
- That flag also removes the description from context entirely, so neither `description` nor `when_to_use` routes
  anything on a model-disabled skill. Both are still written, matching the form every cc-foundry skill uses, and both
  are addressed to the one reader that sees them — a human scanning the `/` menu. Keep the trigger phrasing out of
  `description`, where it would only crowd the menu line
- Never give handoff `context: fork`. A forked skill runs as a subagent with no conversation history, and the
  conversation is handoff's only input
