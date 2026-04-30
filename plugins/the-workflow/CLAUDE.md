# the-workflow Plugin

Agentic workflow mechanics — the skills that make working with Claude Code effective across sessions, projects, and
teams. Covers persistent project context (CLAUDE.md), structured handoff across context boundaries, and workflow
patterns that apply regardless of what domain you're working in.

## Skills

| Skill       | Purpose                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `handoff`   | Triage conversation context into a structured transfer document (user-invoked only)                  |
| `claude-md` | CLAUDE.md instruction quality — creating, writing, diagnosing, improving, and progressive disclosure |

## How It Works

The plugin addresses two sides of agentic workflow quality:

**Persistent context** — the `claude-md` skill applies prompt engineering principles to CLAUDE.md files. It covers
creating CLAUDE.md from scratch (with scaffold templates), writing instructions Claude follows, routing content to the
right layer (CLAUDE.md vs `.claude/rules/` vs skills/hooks/settings), diagnosing instruction failures (buried, vague,
stale, contradictory), progressive disclosure for files that outgrow their token budget, and a systematic improvement
workflow. The goal is not completeness — it's compliance.

**Context transfer** — the `handoff` skill guides the agent through a structured triage of its own context, producing a
prompt-quality document that a receiving agent (or the same agent in a new session) can use as a cold-start instruction
set. Two modes serve different receivers: self-handoff (session restart) and teammate handoff (delegation). Designed for
low token budgets — reads only from conversation context and targets 500-2000 token output.

## Conventions

- The handoff skill must remain self-contained: no references, no external dependencies
- Handoff SKILL.md must stay under 200 lines to minimize token cost when context is nearly full
- The handoff skill produces a standalone document — it must make sense without access to the originating conversation
- Handoff uses `disable-model-invocation: true` — the model must never autonomously decide to hand off. In long sessions
  (500K+ tokens), the model aggressively suggests handoff on every request, disrupting the user's workflow. Handoff is
  strictly a user decision via `/handoff`
