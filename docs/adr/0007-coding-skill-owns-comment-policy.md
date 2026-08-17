# 0007 — The `coding` skill owns comment and documentation policy, stated in full

- **Status:** accepted
- **Date:** 2026-08-17

## Context

Agents running cc-foundry's coding artifacts wrote comments that narrate what the code plainly does, recorded change
history in comments and doc strings ("used to take a path string, changed in v2"), and padded doc comments on public
functions into prose that restates the signature.

Claude Code carries a precise rule against exactly this, in the `# Doing tasks` section of the default system prompt:
"Default to writing no comments... Don't explain WHAT the code does." That section is gated by the output-style
frontmatter flag `keep-coding-instructions`, and both cc-foundry styles set it `true`.

The flag turned out to be irrelevant. `# Doing tasks` belongs to the classic system prompt, and lean-prompt models never
receive it — Opus 4.8, Opus 5, Fable 5 — so neither value of the flag changes their prompt. Sonnet 5 still gets the
classic prompt, so the split runs through one model generation. Verbatim text, gate, and model roster:
`plugins/ai-helpers/skills/output-style-engineering/references/coding-instructions.md`.

Nothing in the marketplace covered the gap. `the-writer` declared code comments out of scope and pointed at `the-coder`,
which had no comment policy; the TypeScript and JavaScript skills exempted doc comments from a "no comments default"
that no cc-foundry artifact defined. Meanwhile the `coding` skill's only comment convention told agents to _add_ one
(`shortcut:` markers), the language skills required a doc comment on every exported symbol, and the styles applied
ASD-STE100 to comments — three instructions about writing them, none about whether they should exist.

## Decision

The `coding` skill states comment and documentation policy in full, as its own rules, rather than as deltas against the
default prompt.

- **The reader is the test.** A comment or doc line that hands the next reader nothing the code already gives is waste.
  A convention demanding a doc is not a reader, so compliance never justifies a line.
- **Comments carry the non-obvious WHY.** What the code does, how it got here, and which task or caller motivated it all
  read like a WHY and are not.
- **Docs state the current contract**, at the length the caller needs — one line when the signature says the rest. No
  history, no changelog. A deprecation notice is not history: it states the contract that holds now.
- **The output styles carry no copy of these rules.** They scope density to both channels (what the agent says, and what
  it writes into files) and route rationale to the response, the commit message, or an ADR. Rules live in one place.
- Language skills keep their own placement rules — which symbols require a doc. This policy governs the content.

## Consequences

- On lean-prompt models the skill is the only source of comment policy, which is the case that motivated this.
- On classic-prompt models two rules overlap the built-in section. Accepted: the wording agrees, and correctness on the
  model in use beats saving two bullets on the other.
- `the-writer`'s out-of-scope pointer and the JS/TS references to a "no comments default" now resolve to something real.
- The policy is pinned to a behavior of Anthropic's default prompt that can change without notice. When
  `coding-instructions.md` is re-derived against a newer version, check whether the overlap still agrees.

Shipped in the-coder v1.9.0 and ai-helpers v1.19.0.
