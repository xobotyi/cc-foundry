# Async and Promise Semantics

## Ordering

- **A `then` callback never runs synchronously**, even on an already-resolved promise. It is queued as a microtask and
  runs after the current stack unwinds.
- **Microtasks drain completely before the next macrotask.** Every pending `then` runs before any `setTimeout(…, 0)`. A
  microtask that queues another microtask keeps the loop from reaching a timer at all.
- **`await v` on a non-promise costs exactly one microtask tick**, the same as one `.then`. An `async` function and a
  `.then` chain started together interleave step for step.
- **`await` on a foreign thenable costs more.** The engine calls the object's `then` on a microtask and resolves on
  another, so a hand-rolled thenable lands one tick behind a native promise. Ordering that depends on this is a bug
  waiting for a library upgrade.
- **`queueMicrotask(fn)`** schedules work at the same priority as a promise callback without allocating a promise.

## Floating promises

A promise nobody awaits and nobody attaches a handler to is the most common async defect, and every form below produces
one:

- **`.map(async …)` without `Promise.all`** — the array holds promises; a rejection in any of them is unhandled.
- **`forEach(async …)`** — `forEach` ignores the returned promise entirely, so the loop finishes before any callback
  body does.
- **A `for await` whose first element rejects** — the loop throws and the remaining promises are never awaited.

Attach a handler to anything deliberately not awaited: `send().catch(reportError)`.

`Promise.all` and `Promise.race` attach a handler to every input, so nothing floats there. What leaks is the work: both
settle while the losing operations keep running, and their results are discarded. Pair a race with an `AbortController`
when a loser holds a resource.

## Choosing a combinator

- **`Promise.all`** — every result is required. Rejects on the first failure and abandons the rest.
- **`Promise.allSettled`** — every outcome matters. Never rejects; each element is `{ status, value }` or
  `{ status, reason }`, so reading `.value` on a failure silently yields `undefined`.
- **`Promise.any`** — the first success wins. Rejects with an `AggregateError` whose `errors` array holds every failure,
  only when all inputs reject.
- **`Promise.race`** — the first settlement wins, success or failure. Its main honest use is a timeout, and
  `AbortSignal.timeout` is better because it also stops the work.

## Error handling

- **`return` inside `finally` discards a pending throw.** `try { throw e } finally { return x }` returns `x` and loses
  `e` entirely. Never `return`, `break`, or `continue` out of a `finally`.
- **`return promise` inside a `try` does not catch its rejection.** The function returns before the promise settles, so
  the surrounding `catch` never runs. Write `return await promise` when the `try` must see the failure — that is the one
  case where `return await` is required rather than redundant.
- **An `Error` captures its stack where it is constructed, not where it is thrown or caught.** An error built inside a
  timer or an I/O callback carries only those frames; the code that awaited it does not appear at all. Construct the
  error at the point of failure and attach caller context through `cause`.

## Cancellation

- **`AbortController` is the cancellation protocol.** Pass `{ signal }` down; do not invent a `cancel()` method.
- **`AbortSignal.timeout(ms)`** produces a signal that aborts on its own, and **`AbortSignal.any([a, b])`** combines a
  caller's signal with a local one.
- **An aborted operation rejects with `signal.reason`, and the name is not always `AbortError`.** A manual `abort()`
  gives a `DOMException` named `AbortError`; `AbortSignal.timeout` gives one named `TimeoutError`. Branch on the name,
  not on the class, and distinguish an abort from a real failure before retrying — otherwise a cancelled request retries
  forever.
- **A signal does not unwind work already in flight.** Check `signal.aborted` between the stages of a long loop.

## Async iteration and cleanup

- **`for await...of` closes the iterator on `break` or `throw`**, so a `finally` inside an async generator runs.
- **An async generator serializes concurrent `next()` calls.** They queue rather than interleave.
- **`using` and `await using` release a resource on every exit path** where the engine baseline allows them. Where it
  does not, `try`/`finally` is the equivalent, one nested block per resource.

## Structuring

- **Start independent work together, await together.** Two sequential `await`s that do not depend on each other double
  the latency; `const [a, b] = await Promise.all([f(), g()])` does not.
- **Bound the concurrency of a large fan-out.** `Promise.all` over ten thousand items opens ten thousand operations at
  once. Chunk, or use a limiter.
- **`new Promise(...)` only wraps a callback API.** Anything else composes existing promises. Where a resolver must
  escape the executor, `Promise.withResolvers()` returns `{ promise, resolve, reject }` instead.
- **`Promise.try(fn)`** gives a function that may throw synchronously or asynchronously one failure channel.
