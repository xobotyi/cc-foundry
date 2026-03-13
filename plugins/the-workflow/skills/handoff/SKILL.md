---
name: handoff
description: >-
  Structured work handoff across context boundaries: triage decisions, constraints,
  and remaining work into a prompt-quality transfer document. Invoke whenever task
  involves handing off work — session restart, teammate delegation, async resumption,
  or any context boundary crossing.
---

# Handoff

A handoff document is a prompt — an instruction set for the receiving agent. Triage
your context into a structured, information-dense transfer document that preserves
high-value state and drops noise.

## Mode

Two modes, determined by who receives the handoff:

- **Self** — receiver shares project knowledge. Task state, decisions, remaining work.
  Minimal codebase orientation.
- **Teammate** — receiver may lack project context. Adds codebase orientation,
  skill/tool recommendations, and convention pointers.

If the user doesn't specify, ask.

## Triage

Separate your context into two categories before writing anything.

<preserve>

**Keep** — state that must survive the boundary:

- Decisions made and their rationale
- Constraints discovered during work
- External resource identifiers (URLs, issue IDs, file paths, branch names)
- Quality/verification state (what was tested, what passed/failed)
- Remaining work in priority order
- Blockers and open questions

</preserve>

<drop>

**Drop** — noise in transfer:

- Intermediate exploration and search paths
- Failed approaches (unless the failure constrains remaining work)
- Content already committed to files or git history
- Information derivable from the codebase (file structure, function signatures)
- Raw tool output

</drop>

## Document Structure

Generate a markdown document. Omit sections with no content — empty headers are noise.

### Self-Handoff

```markdown
# Handoff: [task name]

## Context
[1-2 sentences: what this work is about and its current state]

## Decisions
- [decision]: [rationale]

## Constraints
- [constraint]: [why it matters]

## External Resources
- [resource type]: [identifier/URL]

## Remaining Work
1. [highest priority next step]
2. [subsequent steps...]

## Verification State
- [what was tested/verified and result]
- [what remains untested]

## Open Questions
- [question]: [context needed to resolve]
```

### Teammate Handoff

Same structure as self-handoff, with these sections added before Decisions:

```markdown
## Codebase Orientation
- [key file/directory]: [relevance to this task]

## Recommended Skills & Tools
- [skill or tool]: [why it's needed]

## Conventions
- [convention]: [where it's documented]
```

## Compression

Target 500-2000 tokens. When work is extensive:

- **Decisions** — keep all. Highest-value content.
- **Constraints** — keep all. Losing these causes wrong decisions.
- **External resources** — keep identifiers, drop obvious descriptions.
- **Remaining work** — top 5-7 items. Collapse minor items into "Also:" line.
- **Verification state** — summarize as "X of Y verified, [specific failures]."
- **Codebase orientation** (teammate mode) — only files the receiver will touch.

## Self-Check

After generating the handoff, verify:

- [ ] Decisions section is populated (if any decisions were made)
- [ ] Remaining work is populated (if work is incomplete)
- [ ] External resource IDs are present (if external systems were used)
- [ ] No raw tool output or intermediate exploration leaked in
- [ ] Document is under 2000 tokens

If Decisions or Remaining Work is empty when work was done, the triage missed
something. Re-examine the conversation.

## Critical Rules

- **No information gathering.** Read only from context already in the conversation.
  Do not fetch files, search code, or query memory — context may be nearly full.
- **Rationale with every decision.** A decision without rationale forces re-derivation
  or blind trust.
- **Identifiers, not descriptions.** "PR #247" not "the pull request we opened."
  "src/auth/middleware.ts:42" not "the auth file around line 42."
- **The document is standalone.** The receiver has no access to this conversation.
