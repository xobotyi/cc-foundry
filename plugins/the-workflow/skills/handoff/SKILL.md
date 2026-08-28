---
name: handoff
description: >-
  Triage this conversation into a standalone transfer document — decisions, constraints, resource identifiers,
  verification state, and remaining work — for a session restart or a teammate.
when_to_use: >-
  Run before work crosses a context boundary — a session restart, a delegation to a teammate, an async resumption, or a
  compaction that will take the detail behind the current state with it. Also worth running once a session has grown
  long enough that the next compaction is close, while the reasoning is still recoverable. Covers the transfer document
  only: it reads this conversation and gathers nothing new.
argument-hint: "[self|teammate]"
arguments: mode
disable-model-invocation: true
compatibility: >-
  Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use, disable-model-invocation, argument-hint,
  arguments)
---

**A handoff document is a prompt.** The receiver has no access to this conversation, so everything it needs must be on
the page — and everything it does not need competes with what it does.

## Mode

`$mode` selects the receiver. Empty means self.

- **self** — the receiver holds your project knowledge. Task state, decisions, remaining work. No codebase orientation.
- **teammate** — the receiver may hold none of it. Adds codebase orientation, skill and tool pointers, and conventions.

## Triage

Two passes, in this order. A single pass sorts for precision and loses the subtle context that turns out to be
load-bearing — which is the documented failure of aggressive compaction.

1. **Recall.** Collect everything relevant. Over-collect; nothing is cut yet.
2. **Precision.** Cut what the categories below mark as noise, and only then.

<preserve>

**Keep** — state that does not survive the boundary any other way:

- Decisions and their rationale, including options considered and rejected. A rejected option that arrives without its
  reason gets proposed again by the receiver
- Constraints discovered during the work
- Contingencies — the failure modes you can foresee and the receiver cannot. "If the integration test still fails after
  a rebuild, it is the fixture cache, not the code." This is the element handoffs omit most often
- External resource identifiers — URLs, issue IDs, file paths with line numbers, branch names, commit SHAs
- Verification state, in both directions: what was checked and its result, and what was **not** checked
- Negative state — work that looks started and is not. "No branch, no edit, no commit" stops the receiver assuming a
  base that does not exist
- Remaining work in priority order
- Blockers and open questions

</preserve>

<drop>

**Drop** — noise in transfer:

- Intermediate exploration and search paths
- Content already committed to files or git history
- Content already captured in an upstream artifact — a PRD, plan, ADR, or tracker issue. Reference it by path or ID
- Anything derivable from the codebase — file structure, function signatures
- Raw tool output

</drop>

**A failed attempt is a decision, not exploration.** It belongs under Decisions with the reason it failed, whenever that
reason still constrains the remaining work. Drop only the attempts that constrain nothing.

**Do not reconstruct what compaction took.** A handoff usually runs late, when part of the conversation is already
summarized. Where the detail is gone, write what is known and mark the gap — a confident reconstruction is the one
failure the receiver cannot detect.

## Document Structure

Produce a markdown document. Omit any section with no content; an empty header is noise.

Open with the state grade. It is the first thing both readers hit — the user scanning before they paste, and the agent
reading before it acts — and it decides what the receiver does first.

- **clean** — the plan holds. Continue from Remaining Work.
- **watch** — something is off and has not stopped the work. Verify it before building on it, and say what it is.
- **blocked** — work cannot proceed, or the plan itself is in doubt. Resolve that before anything else.

```markdown
# Handoff: [task name]

**State: clean | watch | blocked** — [one clause: why, and what it forces first]

## Context

[1-2 sentences: what this work is and where it stands]

## Decisions

- [decision]: [rationale]

## Constraints

- [constraint]: [why it matters]

## External Resources

- [resource type]: [identifier or URL]

## Remaining Work

1. [highest-priority next step]
2. [subsequent steps]

## Contingencies

- If [condition the receiver will hit]: [what it means and what to do]

## Verification State

- [what was checked, and the result]
- [what was not checked]

## Open Questions

- [question]: [what is needed to resolve it]

---

Before acting: restate the task, the state grade, and your first step in two or three sentences, and name anything in
this document that is ambiguous or contradicts what you find. Then proceed without waiting for confirmation.
```

In **teammate** mode, add these three sections before Decisions:

```markdown
## Codebase Orientation

- [file or directory]: [relevance to this task]

## Skills and Tools

- [skill or tool]: [why the receiver needs it]

## Conventions

- [convention]: [where it is documented]
```

## Compression

Target 500-2000 tokens. When the work is larger than that:

- **Decisions, constraints, and contingencies** — keep every one. These are why the document exists, and losing one
  produces a wrong decision downstream
- **External resources** — keep the identifiers, drop the descriptions around them
- **Remaining work** — the top 5-7 items, with the rest collapsed into one "Also:" line
- **Verification state** — collapse what passed into a count; never collapse what was not checked. An unverified area is
  worth more to the receiver than a passing test, because it is the thing they must not build on
- **Codebase orientation** — only the files the receiver will open

## Operating Rules

- **Print, do not write.** Print the document into the conversation for the user to copy. Write a file only when the
  user asks for one by name. The user controls delivery.
- **Gather nothing.** Read only what is already in this conversation. Do not open files, search the codebase, or query
  memory — context is nearly full, which is why the handoff is happening.
- **Every decision carries its rationale.** Without it the receiver re-derives the decision or trusts it blindly.
- **Identifiers, not descriptions.** "PR #247", not "the pull request we opened". "src/auth/middleware.ts:42", not "the
  auth file around line 42".
- **Redact secrets and personal data.** Strip API keys, tokens, passwords, and PII. The document gets printed, copied,
  and pasted somewhere else.
- **Write it standalone.** Every reference resolves without this conversation, and without any file this session
  produced but did not commit.
- **Write for the paste.** The user copies the document and it becomes the receiver's first message — the
  highest-authority position in that session. That is why the closing read-back is obeyed, and why nothing may point at
  a handoff file, a scratch note, or a path that exists only here.

If Decisions or Remaining Work comes out empty after real work was done, the triage missed something. Re-read the
conversation rather than emitting the document.
