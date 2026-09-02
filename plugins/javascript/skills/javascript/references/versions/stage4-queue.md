# Stage 4 queue (unratified)

The Stage 4 queue. TC39 lists these four as finished and expected in the 18th edition; none is in a ratified
specification, and their engine support is uneven. Treat everything here as gated on the project's declared engine
baseline rather than on an edition number.

Stage 4 means the specification text is merged and the feature will not change. It says nothing about whether the
engines a project targets can run it.

## Explicit Resource Management

`using` and `await using` declarations, `Symbol.dispose` and `Symbol.asyncDispose`, `DisposableStack`,
`AsyncDisposableStack`, and `SuppressedError`.

Engine floors: Chrome 134, Firefox 141, Node.js 24. No Safari 26.x release implements it, so an engine baseline
including Safari 26 has no unflagged implementation.

Semantics, verified by execution:

- **Disposal runs in reverse declaration order** when the block exits, on any path — normal completion, `return`,
  `break`, `continue`, or `throw`.
- **A non-disposable value throws `TypeError` at the declaration line**, not at scope exit. `null` and `undefined` are
  accepted and disposed as no-ops, which is what makes conditional acquisition possible.
- **The disposal method is captured at declaration.** Reassigning `obj[Symbol.dispose]` afterwards has no effect.
- **`using` is a `const`-like binding** — no reassignment.
- **`using` is illegal at the top level of a script and legal at the top level of a module**, because a module scope
  ends and a script scope does not.
- **`await using` disposes sequentially**, awaiting each `[Symbol.asyncDispose]()` before calling the next.
- **An error during disposal produces a `SuppressedError`.** Its `error` property holds the later error, `suppressed`
  the earlier one; several failures nest into a chain.
- **`DisposableStack`** decouples acquisition scope from disposal scope: `use()` registers a disposable,
  `adopt(value, onDispose)` wraps a value that has no disposal protocol, `defer(fn)` registers a bare action, and
  `move()` transfers ownership out of the current scope so a successful constructor can keep what a failed one would
  have released.

## Temporal

The replacement date and time API: `Temporal.PlainDate`, `PlainTime`, `PlainDateTime`, `ZonedDateTime`, `Instant`,
`Duration`, and the plain year/month types. Immutable values, explicit time zones and calendars, no month-zero indexing.

Engine floors: Chrome 144, Firefox 139, Node.js 26. No Safari 26.x release implements it; it is enabled in Safari
Technology Preview, so Safari 27 is the earliest that can.

## Joint Iteration

`Iterator.zip(iterables)` and `Iterator.zipKeyed(object)`. Engine floors: Chrome 153, Firefox 148. Absent from Node.js
26 and from every Safari 26.x release.

## Atomics.pause

A hint to the CPU inside a spin-wait loop. Chrome 133, Firefox 137, Safari 18.4, and present in Node.js 26.

## Not Stage 4

- **Decorators and Decorator Metadata are Stage 2.7.** No engine ships them. Anything named "decorators" in a project
  runs through TypeScript or Babel, and TypeScript's `experimentalDecorators` implementation is the older, incompatible
  design. Never assume the two agree.
- **ShadowRealm is Stage 2.7.**
- **Import Defer (`import defer`) and Source Phase Imports are Stage 3** — specification-stable but still subject to
  change.
