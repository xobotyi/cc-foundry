---
name: coding
description: >-
  Language-agnostic coding workflow: discovery, change decomposition, commit sizing, comment policy, and completion
  evidence.
when_to_use: >-
  Invoke whenever code is touched at all — writing, modifying, debugging, refactoring, or reading a codebase to
  understand it — and before the language skill rather than after it. Also invoke on the symptoms: a signature recalled
  instead of read, a diff grown past one reviewable change, a third fix that did not hold, a comment nothing can
  verify, or a "done" with no output behind it. Covers the shape of the work; syntax, idiom, and toolchain belong to
  the language skill.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

# Coding

**Discover before assuming. Verify before shipping.** Every coding failure traces to acting on assumptions instead of
evidence, declaring done without verification, or burning context on noise.

## Core Loop

```
Discover → Plan → Implement → Verify
```

- **Discover** — read the code, trace dependencies, understand what exists.
- **Plan** — define success criteria, scope the change, order the work.
- **Implement** — write minimal code, one change at a time, commit each.
- **Verify** — run the checks, confirm the requirement, show the evidence.

**The threshold**: if you can describe the diff in one sentence, skip planning. Otherwise, plan first.

## The Assumption Interrupt

Apply this silently — don't narrate the check.

<assumption-rule>
Never build on a contract you haven't read in this session. Each of these is an unverified
assumption, and every unverified assumption is a potential compile failure, runtime bug, or
behavioral regression:

- Using a method, type, or interface without having read its definition
- Recalling an API from memory instead of reading current source
- Planning changes to code you haven't read in this session
- Assuming a method signature, type structure, or interface shape

When you catch one, read the source before continuing. </assumption-rule>

<assumption-markers>
These words in your reasoning are the tell:
- "probably" → you don't know. Read it.
- "likely" → you're guessing. Check it.
- "should have" → assumption. Verify it.
- "typically" → general knowledge, not this codebase. Read it.
- "I remember" → memory is unreliable. Read it now.
- "usually" → this codebase may differ. Check it.
</assumption-markers>

## Discovery Protocol

<discovery-protocol>
- **Map the area** — read the files in the target directory and learn the module structure.
- **Trace dependencies** — what this code imports, what imports it. Grep the function and type names for usages.
- **Verify contracts** — read the actual signatures, interfaces, and type definitions. For third-party code, read the
  vendored source or fetch the docs. Confirm the function exists, the signature matches, the types line up.
- **Assess impact** — who calls what you are modifying, what tests cover it, what breaks.
</discovery-protocol>

### Read the Scars

Intent leaves no trace in code, but change does. Each shape below is a question, never a conclusion — the provenance
rule binds here, so nothing read off code shape is a fact until a witness outside the code confirms it.

- **An exported symbol nobody calls** — possibly a fossil of whatever replaced it. Look for the successor.
- **Armor bolted on** — a guard, a retry, a sanitizing pass, a defensive copy around code that would not obviously need
  one. Something may have failed here.
- **A hack where a clean path exists** — serializing an object to text and parsing it back where a copy would do. Ask
  what blocked the clean path.
- **Redundant repairs** — two layers fixing the same thing. One of them may be dead.

Chase each with git history, the tracker, or the person who owns the code. A confirmed answer narrows what your change
must not break; an unconfirmed one stays a question and constrains nothing.

## Planning Discipline

<planning-checklist>

- **Success criteria** — restate the task as something you can check. "Add validation" becomes "invalid inputs have
  tests, and those tests pass." "Fix the bug" becomes "a test reproduces it, and that test passes." A criterion you
  cannot run is not a criterion, and it is what forces you back to the user mid-task.

- **Scope** — what files change, what stays untouched. Bound it explicitly. Don't "helpfully improve" adjacent code.

- **Decomposition** — before writing any code, write the ordered list of changes you will make, one commit each. **This
  is where the work gets split.** Splitting at commit time means untangling a diff that was never built to come apart,
  and that rarely succeeds — the pieces are already interleaved across the same files and lines.

  Name each entry by its kind of work, because a change carries only one kind: refactor, new code, integration, fix,
  formatting, docs. Two sources feed the list:
  - **The task statement**, before you read any code. "Implement and integrate X" is already two entries: the new code
    standalone, then the wiring that puts it to use.
  - **Discovery**, once you have read the code. If the existing code needs a refactor to make room, that refactor is
    entry one, committed on its own, before any new code exists.

  A dummy layer that integrates end to end and does nothing is usually entry one or two; after it, one capability at a
  time in dependency order — storage standalone and verified, then the handler that calls it, then the surface above.

  Then work the list one entry at a time. Never write code for the next entry until the current one is committed. That
  rule is what makes the plan binding — without it the list is a note you abandon at the first opportunity.

- **Risks** — what could break. If modifying shared code, trace all callers first.

</planning-checklist>

## Implementation Discipline

### One Change at a Time

An uncommitted working tree is the unit nobody can review and nobody can bisect. Commit at each verified step during the
work, not once at the end. A large change is not one hard review — it is a review nobody does, and the defect that
survives it costs more than the whole change saved.

**Atomic is a code boundary, not a task boundary.** An atomic change is the smallest change that leaves the tree
working: it builds, its tests pass, nothing is half-wired. It is not the smallest change that satisfies the request. One
task is normally many atomic changes.

<atomicity-tests>
- **Deliverable alone** — cut it in two: does each piece build and pass? If yes, it was not one change. Cut it, commit
  the first piece, and repeat until the answer is no. "The whole task is one logical change" is not the test — it is the
  reasoning that produces a 3000-line diff.
- **One kind of work** — does the diff carry implementation and refactoring? Formatting and logic? New code and the
  wiring that integrates it? If yes, it was not one change, even when every line serves the same feature.
</atomicity-tests>

The second test catches what the first cannot see. A refactor and the feature it enables build and pass together, so
deliverability alone keeps them in one diff — and the reviewer then separates "what moved" from "what is new" by hand,
which is the review that silently does not happen. At equal correctness, take the finer split.

**Both tests belong to planning.** They decide the change list before code exists; here they only confirm the list held.
Applying them for the first time to a finished diff is already the failure. If it happens, say so, salvage what
separates cleanly, and start the next task from a change list.

Three things trigger a commit. Any one is enough, and they are not a sequence — most commits fire on the first.

<commit-triggers>
- **The entry is finished.** Whatever the change-list entry set out to do now works and its tests pass. Commit it at
  whatever size that turned out to be: completion is the trigger, not volume, and a 30-line commit is finished work
  rather than an under-delivery. The next entry is its own commit even when it touches the same files — the
  implementation lands, then the integration that wires it up lands separately.
- **The next step would cross the size checkpoint** of ~400-500 lines of production code. Commit before you start it,
  not after you cross it. A boundary chosen in advance is one you control; a boundary found afterwards leaves a
  finished diff to take apart, and that split is always worse than the one you would have planned.
- **You crossed the size checkpoint anyway.** Stop, commit what is coherent, and continue on top of it.
</commit-triggers>

Four rules qualify all three:

<commit-constraints>
- **Tests don't count toward the size checkpoint.** They ship in the commit with the code they cover, however long they
  run. A small feature with a wide test surface is one legitimate commit of a few thousand lines.
- **Atomicity outranks the size checkpoint only after the split test fails.** A mechanical rename across 60 files, or a
  signature change with all its callers, cannot be cut without leaving a broken tree, so it ships whole at any size. Run
  the test before invoking this.
- **Never start a second change on an uncommitted first.** Both then land as one blob, and neither can be reverted
  alone.
- **A phase is not a commit.** A planned phase usually lands as one to three commits. Size the commit by these triggers,
  never by the phase boundary.
</commit-constraints>

The `git-commit` plugin's `commit` skill carries the pipeline for each of these — unit boundaries, message, validation.

### Stay Inside the Change

- **Every changed line traces to the request.** Run that test over the finished diff; a line that traces to nothing is
  scope creep that got in while you were somewhere else.
- **Clean up the orphans your change created** — an import, a variable, a helper that your edit made unused.
  Pre-existing dead code is not yours to delete: mention it and leave it.
- **Wear one hat at a time.** Refactor first with behavior identical, verify, then change behavior. A diff that does
  both can't be reviewed or bisected.

### Write Simple Code

Agents overcomplicate by default. Before writing new code, climb the reuse ladder and stop at the first rung that holds.
The ladder runs _after_ you understand the problem — read the code the change touches and trace the real flow first,
then climb. It shortens the solution, never the reading: a small diff you don't understand is laziness dressed up as
efficiency.

<reuse-ladder>
1. **Does this need to exist?** Speculative need → skip it, say so in one line. (YAGNI)
2. **Already in this codebase?** A helper, util, type, or pattern that already lives here → reuse it. Re-implementing
   what's a few files over is the most common waste.
3. **Stdlib does it?** Use it.
4. **Native platform feature covers it?** `<input type="date">` over a picker lib, CSS over JS, a DB constraint over
   app-level code.
5. **An already-installed dependency solves it?** Use it. Never add a new dependency for what a few lines or an existing
   one can do.
6. **Can it be one line?** One line.
7. **Only then** write the minimum code that works.

Two rungs hold → take the higher one and move on. </reuse-ladder>

<simplicity-rules>
- Prefer functions over classes when either works; avoid inheritance unless the problem demands it
- Prefer explicit over implicit — no magic. Keep permission checks and validation visible at the call
  site, not hidden in middleware the next reader won't find
- Prefer deep modules — a small interface hiding substantial implementation — over shallow ones that
  expose nearly as much as they hide. A wrapper that only forwards calls earns nothing
- Don't introduce a seam (interface, port, strategy) until two concrete implementations need it —
  typically production plus test. One implementation behind an interface is indirection, not abstraction
- Deletion test before adding an abstraction: imagine the module gone. If its complexity reappears in
  every caller, it earns its place. If the complexity merely moves, it was a shallow pass-through
</simplicity-rules>

### Follow Existing Patterns

Search the codebase for an existing pattern before inventing one. Match the error handling, the testing patterns in
adjacent tests, and the naming conventions. Read CLAUDE.md and the lint config for project-specific rules. When two
patterns contradict, pick one (more recent, more tested), explain the choice, and flag the other for cleanup — never
blend them into an average. If you think an existing convention is harmful, surface it; don't fork it silently.

Read `references/patterns.md` when writing error paths, introducing a seam for testability, or improving existing code
rather than changing its behavior.

## Comments

The default is zero comments, and it is not a judgment call. Five kinds may exist and nothing outside the list does: a
doc comment on a public symbol, the justification on an escape hatch, `shortcut:`, `constraint:`, `why?:`. There is no
sixth kind and no "this one is genuinely useful" exception.

Before writing a comment, climb the routing ladder and stop at the first rung that holds: a better name, a test, a doc
comment, a rule in the project's rule document, a design note in the architecture doc, one of the five markers, or drown
it. Drown is the default verdict and it is silent.

Read `references/comments.md` before writing, repairing, or reviewing any comment or doc comment. It carries the full
closed set, the marker grammar, the rename limits, the provenance rule for a WHY, the doc-comment contract, and the
repair scope.

## Debugging

Read `references/debugging.md` when a test fails, a bug is reported, or behavior surprises you — before proposing a fix.
It carries the ordered protocol, the multi-component localization step, and the counter that turns a third failed fix
into a design question rather than a fourth fix.

## Verification Discipline

Verification is the highest-leverage activity in the loop. Code that "looks right" but hasn't been run is unverified.

### Never Silence the Signal

A failing check is information about the code, not an obstacle to green. Make checks pass by fixing the code — never by
weakening the check.

<signal-rules>
- Never delete, skip, or comment out a failing test to get green
- Never loosen an assertion until it passes — that asserts the bug, not the behavior
- Never add a lint or type suppression (`eslint-disable`, `# type: ignore`, `as any`) to silence an
  error you haven't understood
- Never wrap failing code in catch-and-ignore or a silent fallback — an error that vanishes is a
  bug that relocated
- The one legitimate case: the check itself is wrong, asserting old behavior the task explicitly
  changes. Prove it, say so, then change the check visibly — never as a side effect
</signal-rules>

### Before Declaring Done

1. **Run the tests.** If none cover the code you changed, write them. If you modified existing behavior, run the full
   relevant suite, not just the new tests.
2. **Check both axes.** _Spec:_ does it do what was asked — the success criteria from planning — not merely something
   plausible? _Standards:_ does it follow this repo's conventions (CLAUDE.md, lint and type config, ADRs)? Check them
   separately: code can satisfy every convention and implement the wrong thing, and a correct result can still violate
   the conventions.
3. **Review your own diff** as if it were someone else's. Leftover debug code, comments outside the five kinds, docs
   describing the old contract, missing error handling, hardcoded values, uncovered edge cases, dead code from earlier
   attempts.
4. **Type-check and lint.** Don't ship with known warnings.
5. **Disclose gaps.** "Done" means fully verified. "Done, but I didn't verify X" beats a silent gap.

### Evidence, Not Assertion

Every claim below needs its own proof. The third column is what people submit instead.

| Claim                 | Proof                                                  | Not proof                     |
| --------------------- | ------------------------------------------------------ | ----------------------------- |
| Tests pass            | this run's summary line and exit code                  | a previous run, "should pass" |
| Lint or types clean   | the tool's own exit code                               | the tests passing             |
| Build succeeds        | the build's exit code                                  | lint passing                  |
| Bug fixed             | a test of the original symptom, passing                | the code changed              |
| Regression test works | it went red with the fix reverted, green with it in    | it passes once                |
| Nothing calls this    | the search command and its output, over the whole tree | a grep in one directory       |
| A subagent finished   | the diff it left behind                                | its report                    |

The last two are the ones most often asserted and least often checked. An absence you cannot show a sweep for is an
absence you do not claim, and an agent's success report is a claim like any other.

### Self-Verification Patterns

- Write a failing test first, then implement until it passes.
- A test must be able to fail. One that cannot fail when the business logic changes is testing nothing.
- Use subagents for fresh-context review — they catch mistakes you'll miss in the context where you wrote the code.
- For UI changes, exercise the feature in a browser. Type checks and test suites verify code correctness, not feature
  correctness; if you can't test it, say so rather than claiming success.
- For refactors, verify identical behavior before and after.

## Context Management

- Don't pre-load files "just in case" — retrieve context when the need for it arrives, not before.
- After two failed corrections on the same issue, start fresh rather than accumulating failed approaches in context.
- If you're losing track of what you've tried, say so. Silent degradation wastes more time than admitting it.

## Application

Apply these disciplines silently. Don't narrate the protocol, announce which step you are on, or report a check that
found nothing.

When **writing** code: run discovery, work the change list, commit as each trigger fires, verify before reporting.

When **reviewing** code: cite the specific violation with `file:line` and show the fix. Don't lecture.

If the codebase contradicts a rule here, follow the codebase and flag the divergence once. **The comment default is the
exception**: a commented-out-everything codebase is a convention you neither match nor sweep. Match the code's patterns,
not its prose.

## Integration

This skill runs before the language skill and again before you declare done. It governs the shape of the work — what to
read, how to split it, when to commit, what may be a comment, what proves completion. The language skill governs syntax,
idiom, toolchain, and which symbols need a doc, and it wins on anything language-specific.

Return to the verification protocol above before declaring any task complete.
