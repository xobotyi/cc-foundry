# Async Context and Diagnostics

## AsyncLocalStorage

`node:async_hooks` exports `AsyncLocalStorage`, Stability 2. It carries a value across every asynchronous continuation
without threading a parameter through the call graph — request identifiers, tenant context, a logger bound to a trace.

From Node 24.0.0 the implementation is `AsyncContextFrame`, which replaced the `async_hooks`-based one. Propagation
through user-implemented thenables and through code that reached into `async_hooks` internals can differ from Node 22.

### Which entry point to use

- **`als.run(store, callback)`** — the default. The store is visible inside `callback` and everything it schedules, and
  nowhere else. It is the only entry point that is Stability 2.
- **`als.getStore()`** — reads the current store, `undefined` outside any scope.
- **`AsyncLocalStorage.snapshot()`** — captures the current context as a function wrapper, for handing work to a
  scheduler that would otherwise lose it.
- **`AsyncLocalStorage.bind(fn)`** — binds one function to the current context.
- **`als.enterWith(store)`** — Stability 1. It changes the store for the **rest of the current synchronous execution**,
  not for a scope. Called inside one event handler, it leaks into every handler that runs after it on the same emit.
  Prefer `run`.
- **`als.withScope(store)`** (25.9.0, Stability 1) — a disposable scope for `using`. Without `using`, `dispose()` must
  be called by hand, and forgetting leaves the store set for the rest of the execution context, exactly like
  `enterWith`.

### Losing context

A store goes missing when the chain crosses something Node cannot instrument: a callback-based API with a custom queue,
a hand-written thenable, a native module that holds callbacks itself.

- Promisify a callback API with `util.promisify()` so the chain is native promises.
- Where that is impossible, wrap the operation in an `AsyncResource` and call it through `runInAsyncScope`.
- To locate the break, log `als.getStore()` after each suspect call; the last call before `undefined` is the culprit.

## diagnostics_channel

`node:diagnostics_channel`, Stability 2. A zero-cost publish point: `channel.publish(message)` does nothing measurable
while no subscriber is attached, so instrumentation can ship in production code.

- **Create the channel once at module top level** and reuse it. `diagnostics_channel.channel(name)` returns the same
  object for a name, but creating it per call adds lookup cost on the hot path.
- **Guard expensive message construction with `channel.hasSubscribers`.** Publishing is cheap; building the payload is
  not.
- **Messages are passed by reference.** A subscriber that mutates the message changes what later subscribers and the
  publisher see.
- **`channel.bindStore`, `unbindStore`, `runStores`, and `withStoreScope` are Stability 1** — the bridge between a
  channel and an `AsyncLocalStorage` is not committed.
- **`boundedChannel`** (26.1.0, Stability 1) limits how much a subscriber can cost.

### TracingChannel

`diagnostics_channel.tracingChannel(name)` (Stable from 26.8.0) groups five channels for one traceable action: `start`,
`end`, `asyncStart`, `asyncEnd`, `error`. Names follow `tracing:module.function:start` and so on.

- `traceSync`, `tracePromise`, and `traceCallback` run a function and publish the whole set.
- All five events for one action share the same event object, which is the correlation key — hold it in a `WeakMap`
  rather than adding fields.
- **Subscribing mid-trace produces a broken graph.** A subscription added after an action starts sees only later
  actions, by design.

### Channels Node publishes itself

All Stability 1. Names, by area:

- **HTTP** — `http.client.request.created`, `http.client.request.start`, `http.client.request.error`,
  `http.client.response.finish`, `http.server.request.start`, `http.server.response.created`,
  `http.server.response.finish`
- **HTTP/2** — `http2.client.stream.*` and `http2.server.stream.*` (`created`, `start`, `error`, `finish`, `close`, plus
  `bodyChunkSent` and `bodySent` on the client)
- **Modules** — `tracing:module.require:{start,end,error}`, `tracing:module.import:{asyncStart,asyncEnd,error}`
- **Net** — `net.client.socket`, `net.server.socket`, `tracing:net.server.listen:{asyncStart,asyncEnd,error}`
- **Process** — `child_process`, `process.execve`
- **Others** — `udp.socket`, `worker_threads`, `sqlite.db.query`, `locks.request.{start,grant,miss,end}`,
  `console.{log,info,debug,warn,error}`
- **Permission Model audit** — `node:permission-model:{fs,net,child,worker,inspector,wasi,addon,ffi}`, published under
  `--permission-audit`

## Profiling and reports

- **`--cpu-prof`** and **`--heap-prof`** (Stable from 22.4.0) write a V8 profile to disk at exit; `--cpu-prof-dir`,
  `--heap-prof-dir`, and the `-interval` forms control placement and sampling.
- **`process.report`** writes a JSON diagnostic report — stacks, heap statistics, resource usage, libuv handles.
  `--report-on-fatalerror`, `--report-on-signal`, and `--report-uncaught-exception` trigger it automatically; that is
  the only way to get a stack out of a process that died in native code.
- **`perf_hooks`** carries `performance.timerify`, `monitorEventLoopDelay` (an interval histogram, which is how event
  loop lag is measured rather than a `setTimeout` estimate), and `PerformanceObserver` for GC and HTTP entries.
- **`node --inspect`** opens the inspector, and under `--permission` the `SIGUSR1` listener that would open it is not
  installed at all.
