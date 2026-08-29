# Error Handling, Dependency Isolation, and Refactor Targets

Read this when writing error paths, introducing a seam for testability, or improving existing code rather than changing
its behavior.

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
