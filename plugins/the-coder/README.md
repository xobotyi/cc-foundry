# the-coder

Language-agnostic software engineering discipline for Claude Code.

## The Problem

**Claude writes code before understanding what exists.** It assumes API signatures from memory, guesses at method names,
and skips verification until compile failures force corrections. This wastes tokens debugging preventable errors and
burns context on fix attempts that could have been avoided with 30 seconds of upfront discovery.

**Tests get skipped.** Code that "looks right" ships without validation. Regressions appear in production. The symptom
is broken code — the cause is declaring "done" before actually verifying the work meets requirements.

**Abstractions multiply without justification.** Every task becomes an opportunity to add layers, extract interfaces,
and invent patterns the codebase doesn't need. The result is code bloat that makes future changes harder, not easier.

**Changes arrive in one enormous batch.** An agent works for an hour, never commits, and hands over a few thousand
uncommitted lines. Nobody can review that honestly, `git bisect` has nothing to work with, and a single bad decision
early on is now welded to everything built after it.

## The Solution

This plugin enforces a discovery-first workflow and provides an implementation-focused output style. The `coding` skill
interrupts assumption-based reasoning and requires verification before any code runs. The `software-engineer` style
brings engineering judgment, incremental commits, and a skill queue system that composes language-specific disciplines.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-coder
```

## Skills

### coding

Universal coding discipline that runs before language-specific skills. Enforces the core loop: Discover → Plan →
Implement → Verify. Contains assumption interrupt patterns that flag reasoning mistakes before they become code
mistakes. Requires reading actual API signatures instead of guessing them. Demands test execution before declaring work
complete. Includes debugging discipline (build a red feedback loop first, minimize the repro, rank falsifiable
hypotheses, bisect, never ship a fix you can't explain) and a hard rule against silencing failing checks — tests, lint,
and type errors get fixed, not suppressed.

Crucially, all of that happens before any code is written. The skill asks for an ordered list of changes up front — one
commit each, one kind of work each — and then binds execution to it: no code for the next entry until the current one is
committed. That ordering matters more than it looks. Tests applied to a finished diff arrive too late to help, because
by then the pieces are interleaved across the same files and lines, and an agent that built everything first faces an
untangling job that usually can't be done cleanly. The list is fed by the task statement, which already separates
writing new code from integrating it, and by discovery, which is where a needed refactor shows up and becomes the first
commit rather than a passenger in the last one.

The list usually opens with a dummy layer, integrated end to end and doing nothing, and then takes one capability at a
time in dependency order: the storage change standalone and verified, then the handler calling it, then the surface
above.

It also pins down what "atomic" means, because the word is where the discipline usually leaks. Atomic is a code
boundary, not a task boundary: the smallest change that leaves the tree building and its tests passing. An agent
reasoning that the whole assignment is one logical change is technically not wrong, and that is exactly how a
three-thousand-line diff gets justified. So the skill replaces the judgment call with a test — can this be cut into two
pieces that each build and pass? If it can, it isn't atomic, and the first piece gets committed now.

A second test sits beside that one, because deliverability alone misses a whole class of splits. A change does one kind
of work. New code ships apart from the wiring that integrates it; a refactor that makes room for a feature lands and
gets committed before the feature does. Both halves of those pairs build and pass together, so the first test is blind
to them, and the reviewer ends up separating what moved from what is new by hand. That is the review that quietly
doesn't happen. The audience is the point: a change is split for someone who has to read it, not for us to merge it.

It sizes the work as it goes. Crossing roughly 400 to 500 lines of production code means stop, commit what is coherent,
and build the next change on top of it — a checkpoint that triggers a commit rather than a quota to fill, so a 30-line
commit is finished work. Tests sit outside the budget and ship with the code they cover, which keeps a small feature
with a wide test surface as one honest commit. Atomicity wins where the two conflict: a rename across sixty files stays
one commit at any size, because splitting it leaves a commit whose tree doesn't build.

It also carries the comment and documentation policy, and that policy starts from zero. Code already says what it does,
and unlike a name or a test, a comment never fails loudly when it drifts — the reader has no way to tell a load-bearing
comment from one describing code that changed three refactors ago. So the skill does not ask Claude to judge whether a
comment is worth writing. It names five kinds that may exist — doc comments on public symbols, `SAFETY:` and `nolint:`
justifications, `shortcut:`, `constraint:`, and `why?:` — and nothing outside that list is written. Four of the five are
one-line markers with fixed grammar, which is what keeps the permitted set from growing back into prose.

The rule it replaces was "comment the non-obvious WHY," and it was replaced because it did not work: a model asked to
find a non-obvious why will find one in every function. A closed set gives it nothing to negotiate with.

What would have been a comment goes somewhere that survives better. The first move is almost always a rename — a comment
whose whole meaning fits in an identifier is a naming problem, and a name is read at every use site while a comment is
read once. After that: a test, a doc comment, a rule in the project's own rule document, a design note in the
architecture doc. Failing all of those, it is dropped, silently, which is the common and correct outcome.

Doc comments are the one thing that survives all of this intact, because they have a real reader — a caller holding the
signature and nothing else, who has to get it right without asking. That reader is the whole test. A convention that
says "document every exported symbol" can demand the slot exists, but it can't supply a single word of what goes in it,
so a doc written to satisfy the linter rather than the caller is the same waste as a comment written to satisfy a rule.
When the signature already answers the question, one line is the finished doc. When the caller would need a paragraph to
call the function safely, that's a finding about the signature, not a cue to write more prose.

Claude also stops inventing reasons. Code shows mechanism and hides intent, so a "why" recovered by reading code is a
guess — and a confident wrong reason is worse than none, because it survives review and nobody re-checks it. A reason
Claude actually holds gets stated plainly; a reason it inferred is either left out or marked `why?:` as the hypothesis
it is. "Unknown" is an acceptable answer.

Repairs happen without being asked. A doc that no longer matches its symbol gets rewritten and a comment outside the
five kinds gets removed, both reported in a line so the extra hunks read as deliberate. The scope is what the change
already touches — the files edited and the symbols read to make it — never a sweep of the repository. In a comment-heavy
codebase this cuts both ways: Claude won't add comments to match the local convention, and it won't strip comments it
had no reason to open.

**Use when:** Starting any code task — writing, modifying, debugging, or refactoring. This skill is a prerequisite for
implementation work and should run before language-specific skills engage.

**Invocation:** `/coding` or automatically activated by the `software-engineer` output style.

## Output Styles

### software-engineer

Implementation-focused persona with engineering judgment. Treats Claude as a peer engineer, not a code execution
service. Enforces the `coding` skill before implementation and composes multiple skills into a queue (e.g., `coding` →
`golang` → verification). Pushes back on bad approaches, surfaces concerns immediately, and prioritizes working code
over clever abstractions. Plans vertically — phase 1 is a tracer bullet end-to-end, and later phases fill that slice
bottom-up, one capability at a time in dependency order. Horizontal means one layer across every feature ("all DB, then
all API, then all UI"), and that is what gets rejected; building one feature's storage before that feature's handler is
dependency order and is correct.

The style treats its own terseness rules as governing two channels, not one: what Claude says to you, and what it writes
into files. Density applies to both, so a short answer attached to a padded diff doesn't count as terse. Rationale for a
decision goes in the response, the commit message, or an ADR, never into a comment.

A **Language Contract** section carries two absolute rules, held outside the style's own priority hierarchy so brevity
can never trade them away: write to ASD-STE100 Simplified Technical English, and use ubiquitous language — one name per
concept, taken from the domain and the existing codebase, carried unchanged through prose, identifiers, types, tests,
and commit messages. Technical names and verbs stay exempt from STE's vocabulary, so identifiers, types, and domain
terms are never watered down. Two names for one concept counts as a defect to surface, not a stylistic choice.

**Activate:** `/config` → **Output style** → `Software Engineer`, or set `"outputStyle": "Software Engineer"` in a
settings file. (The standalone `/output-style` command was removed in Claude Code v2.1.91.)

## Related Plugins

Language and platform disciplines are provided by separate plugins:

- **golang** — Go language conventions, idioms, and toolchain
- **javascript** — JavaScript and TypeScript conventions and patterns
- **frontend** — Frontend platform (CSS, accessibility)
- **backend** — Backend platform (observability, API design)
- **cli** — CLI platform (command-line design patterns)

## License

MIT
