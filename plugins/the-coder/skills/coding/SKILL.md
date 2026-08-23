---
name: coding
description: >-
  Coding workflow covering discovery, planning, implementation, and verification. Invoke whenever
  task involves any interaction with code — writing, modifying, debugging, refactoring, or
  understanding codebases. Runs discovery protocol before language-specific skills engage.
---

# Coding

**Discover before assuming. Verify before shipping.**

Every coding failure traces to one of three root causes:

- Acting on assumptions instead of evidence
- Skipping verification before declaring done
- Burning context on noise instead of signal

This skill prevents all three.

## Core Loop

Every task follows this sequence. No exceptions.

```
Discover → Plan → Implement → Verify
```

- **Discover**: Read the code. Trace dependencies. Understand what exists.
- **Plan**: Define success criteria. Scope the change. Identify risks.
- **Implement**: Write minimal code. Work incrementally. Stay simple.
- **Verify**: Run tests. Validate behavior. Confirm requirements met.

The loop exists because each step prevents a category of failure. Skipping discovery causes wrong assumptions. Skipping
planning causes scope creep. Skipping verification ships broken code.

**The threshold**: if you can describe the diff in one sentence, skip planning. Otherwise, plan first.

## The Assumption Interrupt

One declarative rule — apply it silently, don't narrate the check:

<assumption-rule>
Never build on a contract you haven't read in this session. Each of these is an unverified
assumption — and every unverified assumption is a potential compile failure, runtime bug, or
behavioral regression:

- Using a method/type/interface without having read its definition
- Recalling an API from memory instead of reading current source
- Planning changes to code you haven't read in this session
- Assuming a method signature, type structure, or interface shape

When you catch one, read the source before continuing. </assumption-rule>

<assumption-markers>
These words in your reasoning are RED FLAGS:
- "probably" → You don't know. Read it.
- "likely" → You're guessing. Check it.
- "should have" → Assumption. Verify it.
- "typically" → General knowledge, not this codebase. Read it.
- "I remember" → Memory is unreliable. Read it now.
- "usually" → This codebase may differ. Check it.
</assumption-markers>

## Discovery Protocol

Before planning or implementing, map the territory.

<discovery-protocol>

### 1. Map the Area

- Read files in the target directory
- Understand package/module structure
- Identify related files and established patterns

### 2. Trace Dependencies

- What does this code import/use?
- What imports/uses this code?
- Search for usages: grep for function/type names

### 3. Verify Contracts

- Read actual method signatures — don't assume
- Read interface and type definitions
- For third-party code: read vendored source OR fetch docs
- Verify: function exists, signature matches, types correct

### 4. Assess Impact

- Who calls what you're modifying?
- What tests cover this code?
- What might break?

### 5. Read the Scars

Intent leaves no trace in code, but change does. These shapes are worth noticing, and each one is a question, never a
conclusion — the provenance rule below binds here too, so nothing read off code shape is a fact until a witness outside
the code confirms it:

- **An exported symbol nobody calls** — possibly a fossil of whatever replaced it. Look for the successor.
- **Armor bolted on** — a guard, a retry, a sanitizing pass, a defensive copy around code that would not obviously need
  one. Something may have failed here.
- **A hack where a clean path exists** — serializing an object to text and parsing it back where a copy function would
  do. Ask what blocked the clean path.
- **Redundant repairs** — two layers fixing the same thing. One of them may be dead.

Chase each with git history, the tracker, or the person who owns the code. A confirmed answer narrows what your change
must not break; an unconfirmed one stays a question and constrains nothing.

</discovery-protocol>

Discovery is cheap. Debugging wrong assumptions is expensive.

## Planning Discipline

Before writing code, establish:

<planning-checklist>

- **Success criteria** — What does "done" look like? Define measurable outcomes, not vague goals.

  Bad: "improve the API" Good: "add pagination to /api/users, 100 items/page, response under 200ms"

- **Scope** — What files change? What stays untouched? Explicitly bound the change. Don't "helpfully improve" adjacent
  code.

- **Decomposition** — Before writing any code, write down the ordered list of changes you will make, one commit each.
  **This is where the work gets split.** Splitting at commit time means untangling a diff that was never built to come
  apart, and that rarely succeeds — the pieces are already interleaved across the same files and lines.

  Name each entry by its kind of work, because a change carries only one kind: refactor, new code, integration, fix,
  formatting, docs. Two sources feed the list:
  - **The task statement**, before you read any code. "Implement and integrate X" is already two entries: the new code
    standalone, then the wiring that puts it to use.
  - **Discovery**, once you have read the code. If the existing code needs a refactor to make room, that refactor is
    entry one, committed on its own, before any new code exists.

  Then work the list one entry at a time. Never write code for the next entry until the current one is committed. That
  rule is what makes the plan binding — without it the list is a note you abandon at the first opportunity.

  A dummy layer that integrates end to end and does nothing is usually entry one or two; after it, one capability at a
  time in dependency order — storage standalone and verified, then the handler that calls it, then the surface above.

- **Risks** — What could break? If modifying shared code, trace all callers first.

- **Verification strategy** — How will you prove it works? Tests > manual check > "it looks right". Define this BEFORE
  writing any implementation code.

</planning-checklist>

## Implementation Discipline

### Work Incrementally

Don't one-shot complex features. Build in committed steps: a small change, verified, committed, then the next change on
top of it.

<incremental-rules>
- One logical change at a time, sized by the split test below — never "the task is one change"
- Wear one hat at a time — never mix refactoring and behavior change in the same step. Refactor
  first with behavior identical, verify, then change behavior; a diff that does both can't be
  reviewed or bisected
- Verify each change works before moving to the next
- If a change touches 5+ files, break it into smaller steps
- Leave the codebase in a clean, working state at every step
- For multi-step tasks: track completed steps and remaining work
</incremental-rules>

### Commit as You Go

An uncommitted working tree is the unit nobody can review and nobody can bisect. Commit at each verified step during the
work, not once at the end. A large change is not one hard review — it is a review nobody does, and the defect that
survives it costs more than the whole change saved.

**Atomic is a code boundary, not a task boundary.** An atomic change is the smallest change that leaves the tree
working: it builds, its tests pass, nothing is half-wired. It is not the smallest change that satisfies the request. One
task is normally many atomic changes.

<split-test>
Run this before calling a change atomic: can it be cut into two pieces that each build and pass? If yes, it is not
atomic — cut it, commit the first piece, and repeat until the answer is no.

"The whole task is one logical change" is not the test. It is the reasoning that produces a 3000-line diff, and it is
wrong for a reason worth naming: a task being coherent says nothing about whether its parts can ship separately.
</split-test>

**A change is a review target, and it does one kind of work.** You do not split the work to make merging tidy. You split
it so a reviewer holds one question at a time. Both tests must pass:

<atomicity-tests>
- **Deliverable alone** — cut it in two: does each piece build and pass? If yes, it was not one change.
- **One kind of work** — does the diff carry implementation and refactoring? Formatting and logic? New code and the
  wiring that integrates it? If yes, it was not one change, even when every line serves the same feature.
</atomicity-tests>

The second test catches what the first cannot see. A refactor and the feature it enables build and pass together, so
deliverability alone keeps them in one diff — and the reviewer then separates "what moved" from "what is new" by hand,
which is the review that silently does not happen.

At equal correctness, smaller wins. Given two valid splits, take the finer one.

**Both tests belong to planning.** They decide the change list before code exists; here they only confirm the list held.
Applying them for the first time to a finished diff is already the failure — the pieces are interleaved by then, and
what comes out is a worse split than planning would have produced. If it happens, say so, salvage what separates
cleanly, and start the next task from a change list.

<commit-checkpoint>
- **Checkpoint at ~400-500 lines of production code.** Crossing it means stop, commit what is coherent, continue on top.
  This triggers a commit; it is not a quota to fill — a 30-line change is a finished commit, not an under-delivery.
- **Tests don't count toward the budget.** They ship in the commit with the code they cover, however long they run. A
  small feature with a wide test surface is one legitimate commit of a few thousand lines.
- **Atomicity outranks the budget only after the split test fails.** A mechanical rename across 60 files, or a signature
  change with all its callers, cannot be cut without leaving a broken tree, so it ships whole at any size. Run the test
  before invoking this. An oversized commit that could have been cut does not qualify, and this is not a licence to keep
  a feature whole because it feels like one thing.
- **Never start a second change on an uncommitted first.** Both then land as one blob, and neither can be reverted
  alone.
- **A phase is not a commit.** A planned phase (~100-200 lines, one verification gate) usually lands as one to three
  commits. Size the commit by this checkpoint, never by the phase boundary.
</commit-checkpoint>

The `git-commit` plugin's `commit` skill carries the pipeline for each checkpoint — unit boundaries, message,
validation.

### Write Simple Code

Agents overcomplicate by default. Actively resist this.

Before writing new code, climb the reuse ladder and stop at the first rung that holds. The ladder runs _after_ you
understand the problem — read the code the change touches and trace the real flow first, then climb. It shortens the
solution, never the reading: a small diff you don't understand is laziness dressed up as efficiency, not minimalism.

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
- Prefer functions over classes when either works
- Avoid inheritance unless the problem demands it
- Prefer explicit over implicit — no magic
- Keep permission checks and validation visible at the call site, not hidden in middleware the
  next reader won't find
- Use descriptive names — longer is better than ambiguous
- Do the simplest thing that works, then optimize if measured performance requires it
- Prefer deep modules — a small interface hiding substantial implementation — over shallow ones that
  expose nearly as much as they hide. A wrapper that only forwards calls earns nothing.
- Don't introduce a seam (interface, port, strategy) until two concrete implementations need it —
  typically production plus test. One implementation behind an interface is indirection, not abstraction.
- Deletion test before adding an abstraction: imagine the module gone. If its complexity reappears in
  every caller, it earns its place. If the complexity merely moves, it was a shallow pass-through —
  inline it.
</simplicity-rules>

### Write No Comments

Code states what it does, so a comment restating it hands the reader nothing. Worse, a comment cannot be verified by
anything: names, types, and tests fail loudly when they drift, while a comment describing code that no longer does that
goes on being read as true. The reader has no way to tell a load-bearing comment from a stale one.

**This governs commentary — prose addressed to a human reader.** Comment-syntax that a tool parses is not commentary and
is out of scope entirely. The test is the property, not a list: **if deleting it changes what builds, what runs, what a
checker reports, or what a generator emits, it is program text wearing comment clothing** — the way a shebang is. Every
language has these and no roster here could be complete; `//go:build`, `// Output:` in a Go example,
`# shellcheck disable=SC2086`, `# type: ignore`, JSDoc `@type` on a plain-JS symbol, and codegen or editor pragmas are
illustrations of the class, not its boundary. When you meet a directive you do not recognise, assume it is load-bearing
until you have checked. Write them exactly as the tool requires, and never remove one during repair.

For commentary, the default is none, and the default is not a judgment call. You do not weigh whether a comment is good
enough to write — five kinds may exist, and nothing outside this list does.

<comment-kinds>
1. **Doc comments on public symbols** (`///`, `/** */`, godoc) — a contract for a caller who will
   never open the body. A different artifact with a different reader; the language skill decides
   which symbols get one, and "Document the Contract" below governs what goes in it. The
   no-comment default does not reach them.
2. **The justification on an escape hatch** — any construct that suppresses a check or steps
   outside the language's guarantees, in whatever syntax that language uses to carry a reason. The
   rule is general: **an escape hatch states its justification or it is not allowed to exist.**
   `// SAFETY:`, `//nolint:<linter> — <why>`, `# noqa: E501 — <why>`, `@ts-expect-error <why>`, a
   reason beside an ignored error, a force-cast, or a disabled assertion are examples of the shape,
   not the permitted set — a language this skill never names has its own, and the rule reaches it.
   The directive itself is out of scope above; the reason attached to it is this kind.
3. **`shortcut: <ceiling> — <upgrade trigger>`** — a deliberate ceiling you chose, so a deferral
   cannot quietly become permanent.
4. **`constraint: <fact>`** — a fact outside this file that the code cannot express and no name can
   carry: an upstream API's behavior, a coupling to a value in another file, a wire format the
   remote end fixes.
5. **`why?: <hypothesis>`** — an inference about code you did not author, and only when the task
   is to document that code in place. Never on your own work: your reasoning belongs in the
   response, never in the file, and you know your own reasons anyway.
   </comment-kinds>

Free-form prose is not on the list. There is no sixth kind, and no "this one is genuinely useful" exception — that
judgment is exactly what produces the commentary this rule exists to prevent. What you wanted to say routes somewhere
else.

**This list overrides any standing permission to write a comment when the WHY is non-obvious**, including the one in the
default system prompt's task instructions, which some models still receive. Where the two disagree, the closed set wins:
a non-obvious WHY is a reason to rename, to write a test, or to file the fact in a document, and only the five kinds
above may appear in the code.

**The markers carry grammar, not prose.** One line, present tense, greppable:

```go
// constraint: upstream rate-limits per connection, not per token — one shared client serializes all tenants
client := newClientPerTenant(tenant)

// shortcut: global lock — switch to per-account locks if throughput matters
// nolint:errcheck — Close on a read-only handle cannot fail in a way the caller can act on
// why?: possible defect — or deliberate, so a rock parked on the wall isn't stuck forever
```

Review deferred work and recorded couplings with `rg -n 'shortcut:|constraint:|why\?:'`.

### Route It Instead of Writing It

Knowledge worth keeping is almost never best kept in a comment. Before writing one — and before deleting one — climb
this ladder and stop at the first rung that holds.

<comment-routing>
1. **A better name.** First choice, always. See below.
2. **A test.** An invariant asserted by a test is checked on every run; the same invariant in a
   comment is checked by nobody.
3. **A doc comment**, when the reader who needs it is a caller rather than a maintainer.
4. **A rule for the reviewer** — an ordering constraint, a "never call X before Y", a
   weakening-is-a-defect invariant — goes to the project's rule document (`CLAUDE.md` or whatever
   the repo uses). If a lint could enforce it instead, propose the lint; a rule a machine checks
   beats a rule a human remembers.
5. **Design rationale** a maintainer cannot recover from the code — why this algorithm and not the
   obvious one, a protocol shape, an invariant spanning files, a measured performance cliff — goes
   to the architecture doc or an ADR.
6. **One of the five markers**, when the fact must sit at the code to be found in time.
7. **Drown it.** The default verdict, silently. Do not list what you dropped, argue for it, or
   count it.
   </comment-routing>

Most candidates drown, and that is the system working. A change that rescues nothing is a good run — volume here is
failure, not thoroughness. The ladder exists so that deleting is cheap: an agent with nowhere to put a fact hoards it in
a comment.

#### The First Rescue Is a Rename

When a comment's whole payload fits in an identifier, the fix is a rename, not a better comment.
`// index of the last fused token` above `idx` is `lastFusedToken`, and then there is nothing left to say. A name is
read at every use site; a comment is read once, by whoever scrolls past it.

Applies to variables, fields, functions, types, and enum members alike. A comment compensating for a vague name is a
naming defect wearing a comment — rename first, then see what survives.

<rename-limits>
- **Private symbol** — free. Rename it in the same change.
- **Public symbol** — the name is API surface. Rename it with its callers in the same change when
  the blast radius is small; otherwise it is a change of its own kind and does not ride along with
  unrelated work.
- **Published in generated documentation** — frozen. Verify before proposing (grep the docs tree);
  for a frozen symbol the rescue falls back to a doc comment or drowns.
  </rename-limits>

#### A WHY You Inferred Is Not a WHY You Know

Code shows mechanism and hides intent. "This list is sorted" is visible in the source; "this list is sorted so it
renders stably on the debug camera" is not, and cannot be recovered by reading. So provenance decides whether you may
state a reason at all:

<why-provenance>
- **A reason you hold** — your own design decision, something the user told you, a fact from the
  ticket or the upstream docs. State it plainly, in whichever destination the routing ladder picks.
- **A reason you inferred by reading** — do not state it as fact. Either leave it out, or, when you
  were asked to document code you did not author, mark it `why?:` and let it stand as the
  hypothesis it is.
  </why-provenance>

Mark it even when you are confident: confidence is not knowledge, and a wrong reason stated as fact is the worst thing
you can write into a codebase — it survives review, it is never re-checked, and it makes the next maintainer defend a
constraint nobody imposed. When no hypothesis is plausible, `why?: unknown` is a finished answer. An honest gap outranks
a plausible invention.

### Document the Contract, Not Its Evolution

**A doc comment is written for a reader, and that reader is the only test.** Specifically: a caller who will never open
the implementation, has only the signature, and must get this right without asking you. Everything they cannot see, they
need. Everything they can already see is noise you are charging them for.

Never write one to satisfy a rule. A convention that says "document every exported symbol" is not a reader — it can tell
you a doc must exist, it cannot tell you a word of what goes in it. When the convention demands a slot and the signature
has already answered the caller's question, the honest doc is one line, and that line is finished work rather than an
under-delivery.

This is the same test as the no-comment default, not an exception to it. Docs survive where comments do not because
their reader is real and identifiable, so the rules on them are stricter, not looser.

<documentation-rules>
- **State the current contract** — what the symbol does, what it accepts, what it returns, how it
  fails, which invariants and side effects bind the caller. Present tense, current behavior,
  nothing else.
- **Length follows the reader, not the symbol** — the language convention decides which symbols get
  a doc; the caller decides how long it runs. When the signature already tells them everything, one
  line is the finished doc. Padding it to look thorough is how docs turn into poems.
- **A doc compensating for the signature is a design finding** — if the caller needs a paragraph to
  use a function safely, the parameters, types, or return shape are doing too little. Fix the
  signature and watch the doc shrink, exactly as a rename shrinks a comment.
- **Carry no history** — "as of v2 this also accepts a slice", "used to return an error", "kept for
  compatibility with the old loader". A doc narrating its own evolution is a changelog in the wrong
  file. A deprecation notice (`@deprecated`, `#[deprecated]`) is not history: it states the
  contract that holds now — "this will be removed, call X instead".
- **Cut the padding** — no preamble ("This function is responsible for..."), no signature restated
  in prose, no motivation essay, no closing summary. Lead with the verb.
- **Rewrite in place on change** — when behavior or a signature changes, replace the doc in the
  same edit so it describes the new contract. Never append the change to the old text.
  </documentation-rules>

```go
// BAD — preamble, signature restated in prose, history, ticket reference
// ParseConfig is a function that is responsible for parsing configuration.
// It takes an io.Reader and returns a pointer to a Config and an error.
// It used to take a path string, but we changed it to a reader in v2 so the
// report builder could pass a buffer (see #431).
func ParseConfig(r io.Reader) (*Config, error)

// GOOD — the contract as it stands, and only that
// ParseConfig reads TOML from r and returns the resulting Config. Unknown keys
// are rejected. The caller keeps ownership of r; ParseConfig never closes it.
func ParseConfig(r io.Reader) (*Config, error)
```

### Repair What You Read

A comment outside the five kinds, or a doc that no longer matches its symbol, is a defect — and you fix a defect you
meet without being asked. Run it through the routing ladder first: delete is the common outcome, but a comment carrying
a real constraint gets rescued before it goes.

<proactive-repair>
- **Scope is what you touch** — the files you edit and the symbols you read to make the change. Not
  the package, not a sweep of the repo. A comment you never had reason to open stays where it is.
  The default governs what you write; it is not a licence to strip a codebase.
- **Delete narration, history, and task references on sight.** They cost nothing to lose, and the
  diff records the removal.
- **Rewrite a doc that no longer matches its symbol.** A stale contract is worse than a missing
  one, because callers believe it.
- **Report the repair in one line** so a reviewer knows the extra hunks are deliberate, not
  accidental scope creep. Report what you rescued and where it went; never itemize what drowned.
- **Ask first when the repair is large or contested** — a doc that is wrong because the code is
  wrong, or a convention the codebase applies on purpose. Surface it; don't silently reverse it.
  </proactive-repair>

### Handle Errors Deliberately

<error-handling-rules>
- Fail fast — reject the bad state where it enters the system, not three layers deeper where it
  finally crashes
- Don't catch what you can't handle — log-and-continue converts a loud failure into silent
  corruption; let it propagate
- Add context when propagating — wrap the error with what was being attempted and with which
  inputs, so the operator can act without a debugger
- No silent fallbacks — substituting a default value on failure is a deliberate, visible decision,
  never a reflex
- Match the codebase's existing error strategy (exceptions, result types, error codes) — don't
  introduce a second one
</error-handling-rules>

### Isolate Dependencies for Testing

A module is hard to test when a dependency hides behind it. Match the strategy to the dependency's nature instead of
reaching for a mock by default.

<dependency-rules>
- **Pure logic, no I/O** — test through the interface directly. No doubles needed.
- **Locally substitutable (in-memory DB, temp filesystem, fake clock)** — run the real code against the
  substitute. A working stand-in beats a mock.
- **A service you own, across the network** — hide it behind a port with two adapters: the real HTTP/RPC
  one for production, an in-memory one for tests.
- **Third-party or external** — inject it behind your own narrow interface and mock that interface, not
  the vendor SDK.
</dependency-rules>

### Follow Existing Patterns

Before inventing a new pattern, search the codebase for existing ones. Consistency beats novelty.

<pattern-rules>
- Search for similar features/components as reference
- Match the existing error handling strategy
- Use the same testing patterns found in adjacent tests
- Follow the project's naming conventions
- Read CLAUDE.md and lint config for project-specific rules
- When two patterns contradict, pick one (more recent / more tested) — explain the choice, flag
  the other for cleanup. Never blend conflicting patterns into an average.
- If you think an existing convention is harmful, surface it explicitly. Don't fork it silently.
</pattern-rules>

### Refactor Targets

When the goal is to improve existing code, hunt for named smells and apply the matching move. Naming the smell turns
"this feels messy" into a concrete change.

<refactor-targets>
- **Duplication** — extract a shared function or type.
- **Long function doing several things** — split it along the boundaries of what it does.
- **Shallow module** (interface nearly as large as its implementation) — deepen it, or fold it into its
  caller.
- **Feature envy** (a function reaching repeatedly into another type's internals) — move the logic to the
  data it operates on.
- **Primitive obsession** (bare strings or ints carrying domain meaning) — introduce a value type.
</refactor-targets>

## Debugging Discipline

A bug fix is a claim about cause and effect. Debugging is how you earn the right to make it.

<debugging-protocol>

1. **Build the loop first** — capture the failing case as one re-runnable command that goes red on this bug and will go
   green when it's fixed. Run it at least once before theorizing: no red command, no hypothesis. A bug you can't
   reproduce isn't fixed by any change you make, only perturbed.

2. **Tighten the loop** — make it fast (skip unrelated setup, narrow the scope), sharp (assert the exact symptom, not
   "didn't crash"), and deterministic (pin time, seed randomness, isolate filesystem and network). For flaky bugs the
   goal is a higher reproduction rate, not a clean repro — loop the trigger, add stress, narrow timing windows until it
   fails often enough to debug against.

3. **Minimize the repro** — cut inputs, callers, config, and steps one at a time, re-running the loop after each cut,
   until every remaining element is load-bearing. Fewer moving parts, fewer suspects.

4. **Read the error literally** — the message names a symbol, a line, a state. Chase what it says before theorizing
   about what it might mean.

5. **Rank falsifiable hypotheses** — write 3–5 before testing any; a single hypothesis anchors on the first plausible
   idea. Each states its prediction: "if X is the cause, changing Y makes the bug disappear." No prediction — discard or
   sharpen it.

6. **Change one variable at a time** — each probe tests one prediction. Tag every debug log with a unique prefix (e.g.
   `[DBG-a4f2]`) so cleanup is a single grep. Two simultaneous changes that fix the bug tell you nothing about which one
   mattered, or what the other one broke.

7. **Bisect when lost** — no hypothesis survives contact? Halve the search space instead of staring: `git bisect` across
   history, disable half the pipeline, shrink the input to minimal.

8. **Explain the fix or keep digging** — "it works now but I don't know why" means the root cause is still at large and
   will return. Done means you can state why the bug happened and why the change removes it.

</debugging-protocol>

If you genuinely cannot build a loop, stop and say so — list what was tried, then ask for what's missing: a reproducing
environment, a captured artifact (log dump, trace, recording), or permission to add temporary instrumentation. Do not
hypothesize without a loop.

Before closing, turn the reproduction into a regression test — the bug that happened once is the bug most likely to
happen again — and grep the debug-log prefix to confirm no instrumentation survived.

## Verification Discipline

Verification is the single highest-leverage activity. Code that "looks right" but hasn't been tested is unverified code.

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
- The one legitimate case: the check itself is wrong (it asserts old behavior the task explicitly
  changes). Prove it, say so, then change the check visibly — never as a side effect.
</signal-rules>

<verification-protocol>

### Before Declaring Done

1. **Run the tests** — If tests exist, run them. If they don't exist for the code you changed, write them.

2. **Check for regressions** — If you modified existing behavior, run the full relevant test suite, not just new tests.

3. **Check both axes — spec and standards.** _Spec:_ does it do what was actually asked — the success criteria defined
   during planning — not merely something plausible? _Standards:_ does it follow this repo's documented conventions
   (CLAUDE.md, lint and type config, ADRs)? Check them separately: code can satisfy every convention and still implement
   the wrong thing, and a correct result can still violate the conventions. One axis passing never excuses the other.

4. **Review your own diff** — Read it as if reviewing someone else's code. Look for:
   - Leftover debug code or TODO comments
   - Any added comment outside the five permitted kinds; docs still describing the old contract
   - A comment that survived where a rename would have removed it
   - Missing error handling
   - Hardcoded values that should be configurable
   - Edge cases not covered
   - Dead code from previous attempts

5. **Type-check and lint** — If the project has type checking or linting, run it. Don't ship code with known warnings.

6. **Show evidence, not assertions** — Report the actual output of the check: the test summary line, the exit code, the
   screenshot. "Tests pass" is a claim; the output is proof the user can act on without re-running anything.

7. **Carry evidence for claims of absence** — "nothing calls this", "no test covers it", "it isn't used anywhere" are
   the claims most often asserted and least often checked. State the search that settles it — the exact command, run
   over the whole tree, and what it returned. An absence you cannot show a sweep for is an absence you do not claim.

8. **Disclose gaps** — If you skipped anything, couldn't verify an edge case, or are uncertain about a behavior, state
   it explicitly. "Done" means fully verified. "Done, but I didn't verify X" is better than a silent gap.

</verification-protocol>

### Self-Verification Patterns

<self-verification>
- Write a failing test first, then implement until it passes
- Tests must verify intent, not just behavior — a test that can't fail when business logic
  changes is testing nothing useful
- Use subagents for fresh-context review — they catch mistakes you'll miss in the same context
  where you wrote the code
- For UI changes: take a screenshot, compare to requirements
- For API changes: test with actual requests
- For refactors: verify identical behavior before and after
</self-verification>

## Context Management

Context is a finite resource with diminishing returns. Every token consumed reduces reasoning quality on the next
problem.

<context-rules>

### Protect Your Context

- Use subagents for investigation — they explore in separate context and return only summaries
- Don't read entire large files when you need a specific function — use grep/glob to find what you need
- After two failed corrections on the same issue, start fresh rather than accumulating failed approaches in context
- If you're losing track of what you've tried or why, say so — silent degradation wastes more time than admitting the
  context is exhausted

### Be Token-Efficient

- Search narrowly before searching broadly
- Read what you need, when you need it
- Don't pre-load files "just in case"
- Prefer just-in-time context retrieval over upfront loading

### Track Progress

- For multi-step work: summarize what's done, what's verified, what remains after each step — don't continue from a
  state you can't describe back to the user
- Leave the codebase in a clean state at every checkpoint
- Write clear commit messages that explain WHY, not just WHAT

</context-rules>

## Application

- Apply these disciplines silently — don't narrate the protocol, announce which step you are on, or report a check that
  found nothing. The user sees the result, not the process.
- Write with the same economy everywhere. Terseness that stops at the chat window and leaves a graphomaniac diff behind
  is not terseness: code, comments, docs, tests, and commit messages carry no filler either.
- If the codebase contradicts a rule here, follow the codebase and flag the divergence once. **The comment default is
  the exception**: a commented-out-everything codebase is a convention you neither match nor sweep. You do not write a
  new comment to fit in, and you do not strip comments you had no reason to open. Match the code's patterns, not its
  prose.

## Integration

This skill runs BEFORE language-specific skills.

Workflow:

1. **Coding skill** — Discovery, planning, discipline
2. **Language skill** (go, typescript, etc.) — Implementation following language-specific conventions
3. **Coding skill** — Verification, anti-pattern check

IMPORTANT: Return to the verification protocol of this skill before declaring any task complete.
