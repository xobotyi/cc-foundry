# Event Loop, Workers, and Blocking

## Loop phases

libuv runs the loop in a fixed order: timers, pending callbacks, idle/prepare, poll, check (`setImmediate`), close
callbacks. Between every individual callback, Node drains the `process.nextTick` queue first and then the promise
microtask queue, both to exhaustion.

The consequences that matter:

- **`process.nextTick` outranks promises**, and a recursive `nextTick` never yields to the poll phase — the process
  stops handling I/O without ever appearing busy in a CPU profile of user code. `queueMicrotask` has the same starvation
  property one level down.
- **`setImmediate` fires before `setTimeout(fn, 0)` inside an I/O callback**, deterministically, because the check phase
  follows the poll phase. Called from the main module's top level, the two race on loop start-up cost and the order is
  not defined. Never encode either ordering as a dependency.
- **Timer delay is a floor, not a promise.** A timer scheduled for 1 ms fires after the current callback and every
  queued tick and microtask finish.

## What blocks

Everything on the main thread that is not I/O:

- **Synchronous file, process, and crypto APIs** — `readFileSync`, `execSync`, `pbkdf2Sync`, `scryptSync`,
  `inflateSync`. Legitimate in a CLI, a build script, and startup code before the server listens. Never in a request
  path.
- **Unbounded `JSON.parse` and `JSON.stringify`.** Both are synchronous and scale with input size. Cap the request body
  before parsing, not after.
- **Backtracking regular expressions.** Nested quantifiers (`(a+)*`), overlapping alternations (`(a|a)*`), and
  backreferences with repetition give an attacker a one-request denial of service. Match with `indexOf` or a linear
  engine (RE2) where the pattern touches user input.
- **Large synchronous loops over collections.** Partition and yield with `setImmediate` between chunks, or move the work
  off-thread.

The libuv thread pool (4 threads by default) serves every asynchronous `fs` API, `dns.lookup()`, the asynchronous
`crypto` APIs (`pbkdf2`, `scrypt`, `randomBytes`, `randomFill`, `generateKeyPair`), and every asynchronous `zlib` API.
Saturating it stalls every other user of it — which is why one slow file operation can present as a DNS failure. Raise
it with the `UV_THREADPOOL_SIZE` environment variable in the process environment; setting
`process.env.UV_THREADPOOL_SIZE` from inside the program does nothing, because the pool is created during runtime
initialization before user code runs.

## Worker threads

`node:worker_threads` is Stability 2, and it is for CPU work. Node's own asynchronous I/O beats a worker at I/O, and
each worker carries a full V8 isolate.

- **Size the pool from `os.availableParallelism()`**, which honors CPU affinity and container limits. `os.cpus().length`
  does not.
- **Data crosses by structured clone.** `workerData` and `postMessage` copy. Move an `ArrayBuffer` with a transfer list
  to avoid the copy, and share a `SharedArrayBuffer` to avoid it entirely.
- **`--max-old-space-size` is per isolate.** Every worker adds its own heap on top of the main one, so the container
  limit must cover the sum. `resourceLimits` on the `Worker` constructor caps a single worker.

### Differences inside a worker

- `process.exit()` ends the thread, not the process. `process.abort()` is unavailable.
- `process.chdir()` and the user- and group-id setters are unavailable; `process.title` cannot be set.
- Signals are not delivered — `process.on('SIGTERM')` never fires in a worker.
- `process.env` is a copy. Mutations are invisible to other threads and to native addons unless the `Worker` was
  constructed with `env: SHARE_ENV`. On Windows the copy is case-sensitive while the main thread's is not.
- The Permission Model does not inherit into a worker.
- `node:trace_events` is unsupported, and IPC channels from a parent process are unreachable.
- `worker.terminate()` can stop execution at any instruction. Anything that must complete needs an explicit shutdown
  message and an acknowledgement.
- A native addon loads in more than one thread only if it is context-aware.

## Processes

- **`worker_threads` for CPU-bound work in one process; `child_process` for running another program; `cluster` for
  sharing a listening socket across processes.** A container orchestrator that already runs one process per core makes
  `cluster` redundant.
- **`child_process.spawn` and `execFile` with an argument array do not invoke a shell** and are the safe default.
  Passing `args` together with `{ shell: true }` joins them with spaces without escaping, which is command injection —
  runtime-deprecated as DEP0190 in 24.0.0.
- **`{ shell: '' }` is almost always a mistake** (DEP0196): it is neither "use the default shell" nor "no shell".

## Cancellation

`AbortController` and `AbortSignal` are the runtime-wide cancellation mechanism: `fetch`, `fs/promises`, timers under
`timers/promises`, `stream.addAbortSignal`, `events.on`, and `pipeline` all accept `{ signal }`.

- **`AbortSignal.timeout(ms)`** builds a self-firing signal, and **`AbortSignal.any([...])`** combines them.
- **A signal with many listeners warns.** `events.setMaxListeners(n, signal)` raises the cap for a long-lived signal
  that many operations subscribe to.
- **Aborting rejects with an `AbortError`** whose `name` is `'AbortError'`. Match on that, not on the message.
