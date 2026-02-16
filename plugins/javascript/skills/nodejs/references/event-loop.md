# Node.js Event Loop

Event loop phases, timers, microtasks, and non-blocking patterns.

## Architecture

Node.js uses a single-threaded event loop for JavaScript execution and a libuv worker
pool for expensive I/O and CPU tasks.

```
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout, setInterval callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  System-level callbacks (TCP errors, etc.)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  Internal only
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  I/O callbacks, incoming connections
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  setImmediate callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │  socket.on('close', ...)
   └───────────────────────────┘
```

Between **every** phase transition, Node.js drains the microtask queue:
1. `process.nextTick()` callbacks (highest priority)
2. Promise `.then()`/`catch()`/`finally()` callbacks

## Execution Priority

```
process.nextTick()     →  Runs before ANY other queued work (between phases)
Promise microtasks     →  Runs after nextTick, before next phase
setTimeout(fn, 0)      →  Timers phase (minimum ~1ms delay)
setImmediate(fn)       →  Check phase (after poll)
I/O callbacks          →  Poll phase
```

### Key Insight

`process.nextTick()` starves the event loop if called recursively. Prefer
`setImmediate()` for deferring work to the next iteration:

```js
// BAD — starves I/O, timers never fire
function recursiveNext() {
  process.nextTick(recursiveNext);
}

// GOOD — yields to I/O between iterations
function recursiveImmediate() {
  setImmediate(recursiveImmediate);
}
```

Use `process.nextTick()` only when you need to run something before any I/O in the
current tick (e.g., emitting events after construction but before the caller can
attach listeners).

## Don't Block the Event Loop

The event loop is shared across all clients. Blocking it blocks everyone.

### What Blocks

| Operation | Impact | Fix |
|-----------|--------|-----|
| `fs.readFileSync()` | Blocks on disk I/O | `await fs.readFile()` |
| `child_process.execSync()` | Blocks on subprocess | `child_process.exec()` |
| `crypto.pbkdf2Sync()` | CPU-bound | `crypto.pbkdf2()` (async) |
| `zlib.inflateSync()` | CPU-bound | `zlib.inflate()` (async) |
| `JSON.parse(hugeString)` | O(n) CPU | Limit input size, stream parse |
| `JSON.stringify(hugeObj)` | O(n) CPU | Limit depth, stream serialize |
| Vulnerable regex | O(2^n) CPU | Use safe-regex, RE2, or `indexOf` |
| Tight `while` loop | CPU-bound | Break into chunks with `setImmediate` |

### Partitioning CPU Work

For CPU-bound tasks that must run on the main thread, partition into chunks:

```js
function processChunk(items, index, chunkSize, callback) {
  const end = Math.min(index + chunkSize, items.length);
  for (let i = index; i < end; i++) {
    // process items[i]
  }
  if (end < items.length) {
    setImmediate(() => processChunk(items, end, chunkSize, callback));
  } else {
    callback();
  }
}
```

For heavy computation, prefer `worker_threads`:

```js
import { Worker, isMainThread, parentPort } from 'node:worker_threads';

if (isMainThread) {
  const worker = new Worker(import.meta.filename);
  worker.on('message', (result) => console.log(result));
  worker.postMessage({ data: heavyInput });
} else {
  parentPort.on('message', (msg) => {
    const result = expensiveComputation(msg.data);
    parentPort.postMessage(result);
  });
}
```

## Worker Pool (libuv Thread Pool)

These Node.js APIs use the libuv thread pool (default 4 threads, configurable via
`UV_THREADPOOL_SIZE`, max 1024):

**I/O-intensive:**
- `dns.lookup()`, `dns.lookupService()`
- All `fs` async operations (except `fs.FSWatcher`)

**CPU-intensive:**
- `crypto.pbkdf2()`, `crypto.scrypt()`, `crypto.randomBytes()`, `crypto.randomFill()`
- All `zlib` async operations

If your app makes heavy use of these, increase `UV_THREADPOOL_SIZE`:

```bash
UV_THREADPOOL_SIZE=16 node server.js
```

Rule of thumb: set it to at least the number of concurrent I/O operations you expect.

## Timers

### `setTimeout` vs `setImmediate`

- `setTimeout(fn, 0)` — fires in the timers phase (next loop iteration, ~1ms minimum)
- `setImmediate(fn)` — fires in the check phase (after poll)

Inside an I/O callback, `setImmediate` always fires before `setTimeout(fn, 0)`:

```js
import fs from 'node:fs';

fs.readFile('/dev/null', () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
// Output: immediate, timeout (always in this order)
```

Outside I/O, the order is non-deterministic. Don't depend on it.

### `AbortController` for Cancellable Timers

```js
const ac = new AbortController();

setTimeout(() => {
  console.log('This may not run');
}, 5000, undefined, { signal: ac.signal });

// Cancel the timer
ac.abort();
```

## `queueMicrotask` vs `process.nextTick`

Both run before the next event loop phase, but:

| | `process.nextTick` | `queueMicrotask` |
|---|---|---|
| Queue | nextTick queue | microtask queue (with Promises) |
| Priority | Runs first | Runs after all nextTick callbacks |
| Standard | Node.js-specific | Web standard (cross-platform) |
| Starvation risk | Higher (recursive calls block I/O) | Same risk, but standard |

Prefer `queueMicrotask()` for new code — it's cross-platform and standard.
Use `process.nextTick()` only when you need to guarantee execution before any I/O
or Promise callbacks.
