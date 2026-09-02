# Errors, Exit, and Server Lifecycle

## Process-level error events

- **An unhandled rejection is fatal by default.** `--unhandled-rejections` defaults to `throw` from 15.0.0: the
  `'unhandledRejection'` event fires, and with no listener the rejection is raised as an uncaught exception. A rejection
  during the entry module's static ES module loading phase is always fatal, whatever the mode.
- **Installing an `'uncaughtException'` listener disables the crash.** The process keeps running with a heap and a call
  stack in an unknown state. Log, flush, and exit — never resume. There is no supported way to continue safely.
- **`'exit'` listeners run synchronously only.** Anything asynchronous scheduled there never runs. Flush before exit,
  not during it.
- **`process.on('warning')`** receives deprecation warnings, `MaxListenersExceededWarning`, and experimental-feature
  notices. In a service, route it to the logger rather than stderr so it is not lost.

## Exit codes

- **Set `process.exitCode` and let the loop drain.** `process.exit()` terminates immediately and drops whatever write is
  still pending. Node exits on its own once nothing is.
- **Whether a pending write survives depends on the target and the platform.** A file is written synchronously and
  lands; a pipe or a socket may not. Measured on 26.2.0/macOS: 512 KiB written to `process.stdout` then
  `process.exit(0)` arrived as 64 KiB down a pipe and as 512 KiB into a file, while `process.exitCode` delivered all of
  it in both. The difference is why the loss reads as intermittent — do not rely on either side of it.
- **`process.exit(code)` accepts only a number or an integer string** from 20.0.0.
- **Force-exit only after a deadline**, on a timer you started when shutdown began.

## Error values

- **Every built-in error carries a `code`** (`ERR_MODULE_NOT_FOUND`, `ERR_REQUIRE_ASYNC_MODULE`, `ERR_ACCESS_DENIED`,
  `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). Match on `code`; messages are not a contract and change between minors.
- **`util.inspect` walks a `cause` chain**, so an error chained with `new Error(msg, { cause: err })` reaches a Node
  logger intact. A message built by string concatenation does not.
- **`AggregateError`** carries `errors` for the case where several failures happened. `Promise.any` produces one.
- **A cancelled call reports itself in three shapes.** Measured on 26.2.0: `fs/promises`, `timers/promises`, and
  `pipeline` reject with an `AbortError` carrying `code: 'ABORT_ERR'`; `fetch` on an aborted controller rejects with a
  `DOMException` named `AbortError` whose `code` is the number `20`; and `fetch` under `AbortSignal.timeout(ms)` rejects
  with a `DOMException` named `TimeoutError`, code `23`. Test `signal.aborted` where the signal is in scope. Where it is
  not, match `err.name === 'AbortError' || err.name === 'TimeoutError'` — matching `'AbortError'` alone misses every
  `fetch` deadline, which is the one case the caller wrote the signal for.

## Deprecation flags

- **`--throw-deprecation`** turns deprecation warnings into thrown errors, which is how a CI run finds them.
- **`--trace-deprecation`** prints the stack that triggered one.
- **`--pending-deprecation`** enables warnings for documentation-only deprecations that would otherwise stay silent.
- **`--disable-warning=DEP0205`** (or a warning type) silences one. It silences the notice, not the removal.

## HTTP server timeouts

The defaults are permissive; a public listener needs them set:

- **`server.requestTimeout`** — 300000 ms. Total time for a client to send the whole request.
- **`server.headersTimeout`** — the lesser of `requestTimeout` and 60000 ms. Time to send the headers, which is the slow
  loris window.
- **`server.keepAliveTimeout`** — 5000 ms of idle time on a keep-alive socket. It must be shorter than the idle timeout
  of any load balancer in front, or the balancer reuses a socket Node has already closed.
- **`server.timeout`** — 0, meaning no socket inactivity timeout.
- **`server.maxRequestsPerSocket`** — 0, meaning unlimited.

## Graceful shutdown

On `SIGTERM` and `SIGINT`:

1. Stop accepting new connections with `server.close()`. It waits for in-flight requests and fires its callback when the
   last one finishes.
2. Release idle keep-alive sockets with `server.closeIdleConnections()`, otherwise `server.close()` waits for the
   keep-alive timeout on every idle connection.
3. Drain the rest of the application — queue consumers, database pools, log transports.
4. `server.closeAllConnections()` after the deadline, then set `process.exitCode` and let the loop end.

**A worker thread never sees the signal.** Signals are delivered to the main thread only, so the main thread must tell
its workers to stop and wait for them.
