---
name: adr
description: >-
  Write, rewrite, and delete architecture decision records in `design-docs/adr/` and their always-loaded index
  `design-docs/ADR.md`, as living records that state the decision in force.
when_to_use: >-
  Invoke whenever a decision is recorded, changed, or retired; whenever code an ADR governs is changed, moved, or
  removed; whenever a task conflicts with an ADR; and whenever a file in `design-docs/adr/` or `design-docs/ADR.md` is
  touched. Also invoke on the symptoms: code contradicts an ADR, an agent proposes again an option an ADR rejected, a
  link points at a missing ADR, the work for a decision marked pending lands. Covers the record and its index;
  choosing between options inside a planning initiative belongs to alignment, which hands each decision here.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**An ADR states the decision in force.** It holds the rule as it stands, why it holds, what it costs, what lost, and
what would reopen it. Agents write, rewrite, merge, and delete ADRs; git holds every earlier wording, and the tree holds
only decisions that hold today. The main readers are agents about to change the code a decision governs, so the current
rule leads and nothing replaced sits above it.

## What earns an ADR

- **Write an ADR for a decision that passes both tests.** A viable alternative lost for a reason that can be stated, and
  a future agent without the ADR would plausibly undo the choice.
- **A decision that fails either test gets no ADR.** Where a reader still needs its reason, it becomes one rule with its
  reason, about 30 words, in the documentation of the item or module that owns it, or in CLAUDE.md where it is a
  convention for agents.
- **Write the ADR once the decision is made.** Options still open live in the planning document or the conversation; the
  ADR directory holds no proposals.
- **Take every reason from evidence**: the task, the user's words, a measurement, an issue. A reason the evidence does
  not give is written as unknown or as `per <issue>`, never inferred — a plausible reason the project never had steers
  every later reader.

## Files and identity

- **An ADR lives at `design-docs/adr/<group>.<n>-<topic>.md`.** The group is the number of the planning initiative that
  records the decision; a project that runs no initiatives uses group `1`.
- **ADRs and the index stay in `design-docs/`** when the initiative that recorded them moves to `completed/`.
- **A new ADR takes the highest number in its group plus one.** Deleting the group's last ADR frees its number for the
  next one; a gap in the middle stays a gap.
- **A branch that lands after another took the same number renumbers its own ADR on rebase**, and fixes every reference
  to it in the branch.
- **The topic names the question the ADR answers, not the answer**: `sync-transport`, not `sync-uses-websocket`. A
  rewrite changes the title, never the filename. A topic whose scope changes is renamed, and every reference moves in
  the same change.
- **Cite an ADR by its path from the repository root**, `/design-docs/adr/<file>`, with the number in the link text. For
  a path that no longer resolves, `git log -1 -- <path>` shows the commit that removed or renamed the file.

## Shape

Start every ADR from `${CLAUDE_SKILL_DIR}/assets/adr-template.md`. Its parts, in order:

- **Header** — `Date` (when the ADR was first written), `Governs` (the paths the rule binds, from the repository root,
  then the public items), and when they apply, `Pinned by` (the tests that fail when the rule breaks) and the pending
  line of [Decided, not yet built](#decided-not-yet-built).
- **Summary** — one to three sentences: the context, the choice, and the trade it accepts.
- **Decision** — the rule in full sentences, each with its scope. Where there are several rules, each opens with a bold
  name, and other text cites it by that name. Exhaustive behavior — every case a function handles — lives in the
  governed item's own documentation, which the Decision links; the ADR states the rule at the level that stops it from
  being undone.
- **Why** — the forces behind the choice. At most one deciding figure per fact, with what it was measured on and the
  date. A sampled result is a share with its sample size: "72% of 57 sampled".
- **Consequences** — what the rule costs and what it gets wrong, one magnitude each, with the issue that tracks it, or
  "accepted" where no issue will.
- **Rejected** — one line per option a reader could propose again, with the fact that decided against it.
- **Revisit if** — the assumption whose change reopens the decision, and the confidence held in it.
- **History** — newest first, one line per rule change: `- YYYY-MM-DD — <the rule it touched>: <why it changed>`,
  followed by `(<issue>)` where one exists. A new ADR has no History section; its first rule change adds one. The line
  carries what moved the rule — the Decision shows where the rule stands and Rejected shows where it was.

**Size.** Summary through Revisit if aims at 65 lines or fewer. At 100 lines, look for a second decision to split off,
or for exhaustive behavior to move into the code's documentation. Past 150 lines, split or cut before committing.
History does not count toward these limits, so a rule that keeps changing shows it there instead of being split for it.

## Never in an ADR

- A `Revised <date>` block, an `## Amendment` section, a "(revised below)" marker, or a sentence that sets the old rule
  against the new one.
- A `Status` line, or a `supersedes`, `superseded by`, `amends`, or `extends` line. Every ADR in the tree is in force;
  the pending line is the only state it carries.
- A numbered list, unless the order is what the list states, and a reference to an item by its position.
- Tables of deltas, tallies of samples beyond the one deciding figure, cost runs with ranges or machine load, and an
  account of how the variants were built and measured. These belong in the PR body.
- A count of the codebase as it stands — tests, files, declarations. It is false after the next change; a dated figure
  that decided the rule is not such a count.
- A restatement of another ADR's rule. Link that ADR.

## Changing a decision

**One test sorts every change: does the question this ADR answers still need its own answer?**

- **Yes, with a new answer** — rewrite Summary through Revisit if so the file reads as the current rule, and add one
  History line. Delete the replaced wording; git holds it. A replaced rule that a reader could propose again becomes a
  Rejected line, with the fact that decided against it.
- **Yes, and another ADR answers it** — move what this ADR still decides into that ADR, add a History line there naming
  what it absorbed and why, and delete this file.
- **Yes, but it no longer earns an ADR** — move it as one rule with its reason to the place that owns it, and delete the
  file.
- **No** — the code it governed is gone, or the change it ordered is finished: delete the file. An option that could
  return becomes a Rejected line in the ADR that owns the surviving question.

Rules that hold across every branch:

- **A change that alters no rule adds no History line** — a wording fix, a link, a re-anchored path.
- **The commit that deletes an ADR says what it retired, why, and where its content went.** That message is the only
  trace a dead link leads to.
- **Merge, demote, and delete ADRs, and rewrite one the task changed, without asking.** Name each one in the summary of
  the change.
- **Rewrite an ADR to match the code only on evidence that the decision changed on purpose** — the task, the user's
  instruction, an issue. Without that evidence the code is what breaks the rule: fix the code, or mark the gap with a
  pending line and report it.
- **Stop and ask when a task conflicts with an ADR.** Reversing a decision is the user's call; carrying the reversal out
  is the agent's.
- **Split off a sub-rule whose driver the parent's Why does not give and which has its own Rejected options**, when the
  sub-rule earns an ADR on its own; otherwise it stays in the parent. The parent's Decision links the split ADR, and the
  split ADR takes the History lines of the rules it takes.
- **Check documentation that states the same behavior as a Decision** — a README, a doc comment — in the same change,
  and fix the wrong text there.

## Decided, not yet built

- **An ADR whose rule the code does not meet yet carries a pending line in its header**:
  `- **Implementation:** pending — <what the code does not do yet> (<issue> | not scheduled)`. A new ADR names all of
  it; a rewrite names the part it changed. Agents read the line as the direction to build toward, and the code it names
  as legacy.
- **The change that completes the implementation brings the ADR to what was built and removes the line**, in the same
  commit: the Decision as built where it differs from the plan, the Consequences as measured, the Why's deciding figure
  from the built code. A History line follows only where the facts changed the rule.
- **A partial implementation narrows the line** to what remains.

## The index

`design-docs/ADR.md` lists every ADR and is imported into the project's CLAUDE.md, so every session holds it — including
sessions that never load this skill.

- **Create the index with the first ADR**, from `${CLAUDE_SKILL_DIR}/assets/adr-index-template.md`, and add an import of
  it to the project's CLAUDE.md: `@design-docs/ADR.md` from the repository root.
- **Keep the preamble's wording.** It is the instruction every session reads.
- **Give each ADR one line**: `- [<group>.<n> <title>](/design-docs/adr/<file>)`. `Governs`, `Revisit if`, and the
  pending line stay in the ADR — every field in the index is paid for in every session.
- **Group the lines into areas.** An area is `## <path>`, the top-level unit the ADR's first `Governs` path sits in: a
  crate, a package, a module directory. Areas run alphabetically by path, lines by number.
- **Update the line in the same change** that adds, deletes, or retitles an ADR or moves its first `Governs` path.

## The state a change leaves

A change that touches an ADR, or code an ADR governs, leaves the repository in this state:

- No file in the repository links to an ADR path that does not exist.
- Every `Governs` path exists. Removed or moved code takes its ADRs with it: deleted, narrowed, or re-pointed.
- No pending line names work the change completed.
- Every ADR has exactly one index line, and the line matches its number, title, and area.
- No two ADRs in a group share a number.

## Related skills

- **alignment** — settles decisions during a planning initiative and hands each one to this skill. This skill owns the
  ADR, its format, its number, and the index; alignment adds no rule of its own to them.
