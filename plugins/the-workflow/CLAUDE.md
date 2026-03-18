# the-workflow Plugin

Agentic workflow mechanics — the skills that make working with Claude Code effective across sessions, projects, and
teams. Covers persistent project context (CLAUDE.md), structured handoff across context boundaries, and workflow
patterns that apply regardless of what domain you're working in.

## Skills

| Skill       | Purpose                                                            |
| ----------- | ------------------------------------------------------------------ |
| `handoff`   | Triage conversation context into a structured transfer document (user-invoked only) |
| `claude-md` | CLAUDE.md instruction quality — writing, diagnosing, and improving |

## How It Works

The plugin addresses two sides of agentic workflow quality:

**Persistent context** — the `claude-md` skill applies prompt engineering principles to CLAUDE.md files. It teaches what
belongs in CLAUDE.md vs skills/hooks/settings, how to write instructions Claude actually follows, how to diagnose
instruction failures (buried, vague, stale, contradictory), and a systematic improvement workflow. The goal is not
completeness — it's compliance.

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
