# Error Handling, Dependency Isolation, Local Shape, Running Less, and Refactor Targets

How error paths behave, how a dependency is isolated for a test, the four local shapes and what each one collapses to,
which execution and allocation a change can skip, and the named smells with the move each one takes.

## Handle Errors Deliberately

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

## Isolate Dependencies for Testing

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

## Local Shape

Four shapes a function's body takes when it grew by accretion, and the rewrite each one takes. Three of them remove the
shape; the callback case below keeps it and buys an early exit instead, which is the whole of what it offers.

**Two of these change behavior, so they are not behavior-identical refactors.** Collapsing a flag drops the work the old
form did after the answer was known; moving a declaration changes when its computation runs. Both ship as a deliberate
fix with the change stated, never inside a refactor commit that promises identical behavior.

<shape-rules>
- **A flag set and then returned is a return in disguise.** A boolean initialized false, set on failure
  paths, then consumed once by a single check that returns or raises — collapse it to a direct exit at each
  set site. The flag form usually keeps working after the answer is known and reports the same failure more
  than once, and the collapse ends both: confirm the dropped work is disposable before you make it. Where
  the set site is inside a callback that cannot return through its caller, return from the callback at the
  set site and guard its first line on the flag, so later invocations do no work. That form keeps the flag
  and buys the early stop rather than a smaller body.
- **Declarations don't promise.** Declare at first use, not in an up-front batch. Values computed far above
  their consumers are promises the reader carries to the bottom of the function; where they already sit in
  a structure in scope, read them at the use site rather than aliasing them at all. Move a computation only
  when nothing between the two positions can change its result, and it neither fails nor mutates on the
  way — otherwise give it a better name and leave it where it is.
- **Assembling a value field by field is a constructor you refused to write.** The same run of
  `x.a = …; x.b = …` at every call site belongs in a constructor, factory, or literal. Write it and the
  guards on "optional" fields usually die with it, because the type can finally state which fields are
  required.
- **One guard style per function.** Early-outs are one-liners or they are blocks — don't mix the two forms
  gratuitously in one body. A guard whose message needs a local to build it stays expanded, and that is not
  a mix.
</shape-rules>

## Running Less

Code that never runs beats code made faster, and memory never allocated beats memory reused. Each rule below removes
execution or allocation; none adds code to do it.

<running-less-rules>
- **Compute a value on the path that reads it.** A lookup, a format, or a query above an early return
  that skips its consumer runs for nothing. Move it below the exit only under the Local Shape rule for
  moving a computation: nothing between the two positions changes its result.
- **Do once what does not change.** A value constant across iterations leaves the loop; one constant
  across requests is built at startup. A pattern compiled, a formatter constructed, or a config parsed
  per call is the common case.
- **Ask the source for only what you use.** Filter, project, and limit in the query, not after the fetch.
  Fetch a batch in one round trip — a call inside a loop over rows is the N+1 shape.
- **Stream what is large or unbounded.** A file, a result set, a response body: process it as it
  arrives. A whole-file read to check the first line holds the file to use one line.
- **Copy or convert only at a boundary.** Serializing to text and parsing it back, a defensive copy of
  data nothing mutates, a conversion between two shapes the code owns — each allocates and moves nothing
  forward. An existing one may be a scar: chase it as one before you remove it.
- **A cache, a pool, a memo table, or a hand-tuned loop is new code and new memory.** It needs a
  measurement that names the cost it removes, and it ships with its invalidation or not at all.
</running-less-rules>

## Refactor Targets

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

A refactor is one kind of work and ships as its own change, with behavior identical before and after.
