# Error Handling, Dependency Isolation, Local Shape, and Refactor Targets

How error paths behave, how a dependency is isolated for a test, the four local shapes that collapse to something
smaller, and the named smells with the move each one takes.

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

Four shapes a function's body takes when it grew by accretion. Each has a collapse that removes the shape instead of
explaining it.

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
