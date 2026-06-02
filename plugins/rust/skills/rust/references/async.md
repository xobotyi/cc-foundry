# Async Rust

Depth behind the SKILL.md async rules: the poll-based execution model, runtime selection (2026), the four
compiler-invisible footguns with extended bad/good examples, and the "do you even need async?" decision. SKILL.md states
the rules; this file holds the rationale, catalogs, and edge cases.

For CPU-bound parallelism (threads, scoped threads, rayon, `Arc<Mutex>`, channels), see
`${CLAUDE_SKILL_DIR}/references/parallelism.md`. Async and parallelism are different tools for different workloads; pick
the model from the workload before writing any concurrent code.

## Contents

- [The Execution Model: Lazy, Poll-Based Futures](#the-execution-model-lazy-poll-based-futures)
- [Runtime Selection (2026)](#runtime-selection-2026)
- [Footgun 1: Holding a `std` Lock Across `.await`](#footgun-1-holding-a-std-lock-across-await)
- [Footgun 2: Blocking Calls in Async](#footgun-2-blocking-calls-in-async)
- [Footgun 3: CPU-Bound Loops in Async](#footgun-3-cpu-bound-loops-in-async)
- [Footgun 4: `select!` and Cancellation Safety](#footgun-4-select-and-cancellation-safety)
- [Cancellation-Safety Catalog](#cancellation-safety-catalog)
- [Do You Even Need Async?](#do-you-even-need-async)

## The Execution Model: Lazy, Poll-Based Futures

An `async fn` does not run when called. It returns a `Future` - an inert state machine that does nothing until an
executor (the runtime) `poll`s it. This is the root cause behind most async surprises: the code between `.await` points
only advances when the runtime drives the future, and a future that is never awaited never runs at all.

`async` code needs a runtime to execute it. The standard library defines the `Future` trait and the `async`/`await`
syntax but ships no executor. Choose and install a runtime (Tokio, in practice).

Two consequences shape everything below:

- **Lazy.** Building a future has no side effects. `let f = fetch();` starts nothing; only `f.await` (or spawning it)
  drives it. Dropping a future before it completes simply discards the in-progress work - which is exactly what
  cancellation is (see Footgun 4).
- **Cooperative.** A future yields control to the runtime only at an `.await`. Between two `.await` points the task
  holds its thread and nothing else on that thread runs. Block, spin, or sleep synchronously between awaits and you
  starve every other task sharing that thread.

```rust
// Lazy: nothing has happened yet.
let work = async {
    println!("running");
    download().await
};
// "running" has NOT printed. The future is inert.

work.await; // Now it runs and prints.
```

Async concurrency is not parallelism. One runtime interleaves many tasks at their `.await` points; on a multi-thread
runtime that interleaving may also spread across cores, but async itself buys concurrency (juggling many in-flight
operations), not parallel CPU throughput. For parallel CPU throughput, use threads/rayon.

## Runtime Selection (2026)

- **Tokio** - the default for servers, network services, and anything doing many concurrent I/O operations. The most
  widely used runtime, surpassing all others in usage combined. It ships a multi-threaded work-stealing runtime plus a
  single-threaded variant, async versions of the standard library's I/O, timers, and synchronization primitives, and the
  largest ecosystem (axum, tonic, reqwest, sqlx all target it). Scaffold new async services on Tokio unless a specific
  constraint dictates otherwise.
- **async-std** - deprecated. Do not scaffold new code on it; migrate off it when touching old code. Route async work
  through Tokio (or, for libraries, stay runtime-agnostic over the `Future` trait and the `futures` crate).
- **smol / embedded executors** - niche. Reasonable only for tiny binaries or `no_std`/embedded targets where Tokio's
  footprint is unacceptable. Not the default.

Libraries should avoid hard-coding a runtime: depend on `futures`/`std` traits and let the binary pick Tokio. Binaries
pick Tokio.

### Choosing the Tokio flavor

- **multi-thread (`#[tokio::main]`)** - servers and most apps; work-stealing spreads tasks across cores.
- **single-thread (`current_thread`)** - tests, CLIs, `!Send` task graphs, deterministic ordering needs.

A multi-thread runtime requires every spawned task to be `Send` (the work-stealing scheduler may move it between
threads). A `current_thread` runtime can run `!Send` tasks via `spawn_local`, at the cost of no parallelism.

## Footgun 1: Holding a `std` Lock Across `.await`

This is the single most common async footgun and it is invisible until you try to `tokio::spawn` the future. A
`std::sync::MutexGuard` is `!Send`. If the guard is alive across an `.await`, the compiler infers the whole future is
`!Send`, and `tokio::spawn` (multi-thread runtime) rejects it with an error that points at the `.await`, not at the
lock - so the cause is non-obvious.

Worse than the type error: even if it compiled, holding a `std` lock across an await is a correctness hazard. The task
can be suspended at the await while still holding the lock; another task on the same thread that wants the lock blocks
the entire runtime thread, and you can deadlock.

The fix is almost never `tokio::sync::Mutex`. Restructure so the guard does not live across the await. Three idioms, in
order of preference:

```rust
// BAD: guard is held across .await -> future is !Send, won't spawn; deadlock risk.
async fn increment_and_send(data: &Mutex<State>, tx: &Sender<u64>) {
    let mut guard = data.lock().unwrap();
    guard.counter += 1;
    tx.send(guard.counter).await.unwrap(); // guard still alive across this await
} // guard dropped here
```

```rust
// GOOD (preferred): copy/clone the needed value out, then drop the guard before awaiting.
async fn increment_and_send(data: &Mutex<State>, tx: &Sender<u64>) {
    let next = {
        let mut guard = data.lock().unwrap();
        guard.counter += 1;
        guard.counter // Copy out
    }; // guard dropped at end of block
    tx.send(next).await.unwrap();
}
```

```rust
// GOOD (explicit drop): when the value can't leave the lock, drop the guard by name.
async fn process(data: &Mutex<State>, tx: &Sender<Summary>) {
    let mut guard = data.lock().unwrap();
    let summary = guard.summarize();
    drop(guard); // end the borrow explicitly before the await
    tx.send(summary).await.unwrap();
}
```

```rust
// GOOD (scope the lock in a helper): keep the critical section synchronous, await outside it.
fn next_counter(data: &Mutex<State>) -> u64 {
    let mut guard = data.lock().unwrap();
    guard.counter += 1;
    guard.counter
}

async fn increment_and_send(data: &Mutex<State>, tx: &Sender<u64>) {
    let next = next_counter(data); // no guard escapes; nothing held across await
    tx.send(next).await.unwrap();
}
```

### When `tokio::sync::Mutex` is actually warranted

Reach for `tokio::sync::Mutex` only when a lock genuinely must be held across an `.await` - e.g. you must hold a
connection's write half locked while performing an async write to it, with no way to split the critical section. Treat
this as a design smell, not a default:

- Its `.lock()` is itself an `.await` and is **not cancellation-safe** (it uses a fairness queue; cancellation loses
  your place - see the catalog below).
- It is slower than a `std::sync::Mutex` and adds runtime coupling.
- Needing a lock across an await usually signals that shared state and async I/O are entangled where they should be
  separated (lock, extract, unlock, then await).

So: `std::sync::Mutex` for the common case (lock, mutate/copy, unlock - all synchronous, no await inside);
`tokio::sync::Mutex` only when the held-across-await requirement is real and unavoidable.

## Footgun 2: Blocking Calls in Async

A blocking call inside an async task stalls the runtime thread for its entire duration. On a multi-thread runtime it
ties up one worker (and can stall others via the scheduler); on a `current_thread` runtime it freezes everything.
Blocking includes synchronous file/network I/O, `std::thread::sleep`, blocking channel `recv`, synchronous database
drivers, and any C library that blocks.

```rust
// BAD: synchronous file read and a blocking sleep inside an async task.
async fn load_config(path: &Path) -> String {
    std::thread::sleep(Duration::from_secs(1)); // freezes the worker thread
    std::fs::read_to_string(path).unwrap()        // blocking syscall on the runtime
}
```

Fix depends on whether an async equivalent exists:

```rust
// GOOD: use the runtime's async I/O and async timer.
async fn load_config(path: &Path) -> io::Result<String> {
    tokio::time::sleep(Duration::from_secs(1)).await; // async timer, yields to runtime
    tokio::fs::read_to_string(path).await
}
```

```rust
// GOOD: no async version exists (legacy blocking DB driver) -> offload to spawn_blocking.
async fn query_legacy(conn: LegacyConn, id: u64) -> Row {
    tokio::task::spawn_blocking(move || conn.blocking_query(id)) // runs on the blocking pool
        .await
        .expect("blocking task panicked")
}
```

`spawn_blocking` moves the work to a dedicated thread pool sized for blocking work, so it does not occupy an async
worker. Tokio's file I/O is itself implemented on `spawn_blocking` under the hood (operating systems generally do not
provide truly async file APIs), so for heavy file workloads a plain thread pool is no worse than Tokio.

`spawn_blocking` is for work that **waits** (blocking I/O, blocking FFI). It is the wrong tool for work that
**computes** - see the next footgun.

## Footgun 3: CPU-Bound Loops in Async

A long CPU-bound loop in an async task never reaches an `.await`, so it never yields, so it monopolizes its runtime
thread for the whole computation - starving every other task on that thread. Async gives zero parallel speedup for CPU
work; it only interleaves at await points.

```rust
// BAD: CPU-bound hashing loop directly in an async task -> blocks the runtime thread.
async fn hash_all(items: Vec<Item>) -> Vec<Hash> {
    items.iter().map(|i| expensive_hash(i)).collect() // no await; starves the runtime
}
```

The instinct to wrap it in `spawn_blocking` is wrong. `spawn_blocking` is tuned for tasks that block (wait), not for
parallel compute; flooding it with CPU work spawns many threads that fight for cores and degrade throughput. For
CPU-bound work, hand it to a real data-parallel pool - rayon - and bridge the result back with a channel:

```rust
// GOOD: offload CPU-bound work to rayon; bridge the result back to async via a oneshot.
async fn hash_all(items: Vec<Item>) -> Vec<Hash> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    rayon::spawn(move || {
        let hashes = items.par_iter().map(|i| expensive_hash(i)).collect();
        let _ = tx.send(hashes); // receiver may have been dropped (cancellation); ignore
    });
    rx.await.expect("rayon task panicked")
}
```

This keeps the async runtime free to juggle I/O while rayon saturates the CPU cores in parallel. The decision rule:
**work that waits -> `spawn_blocking`; work that computes -> rayon.** Full rayon patterns (`par_iter`, thread pools,
`join`/`scope`) live in `${CLAUDE_SKILL_DIR}/references/parallelism.md`.

## Footgun 4: `select!` and Cancellation Safety

`tokio::select!` runs several async branches concurrently on the current task and returns when the **first** completes,
**cancelling the remaining branches** - they are dropped mid-flight. Because dropping a future at an `.await` discards
its in-progress state, any partial work in a losing branch is silently lost. This is fine for stateless waits and a
data-loss bug for stateful reads/writes.

A future is **cancellation-safe** if dropping it before completion and recreating it is a no-op - you lose no progress.
The rule of thumb: inspect every `.await` inside the operation; if restarting from scratch at any of those suspension
points would lose committed data, it is not cancel-safe.

### The two bugs

```rust
// BAD #1: read_exact is NOT cancel-safe. If the timer wins, bytes already read into `buf`
// are discarded with the dropped future -> stream corruption / lost bytes.
loop {
    tokio::select! {
        result = socket.read_exact(&mut buf) => handle(result),
        _ = tokio::time::sleep(timeout) => break, // cancels read_exact mid-read
    }
}
```

```rust
// BAD #2: re-creating the future inside the loop. Each iteration builds a fresh timeout
// future, so the deadline restarts every time the other branch fires -> the timeout
// effectively never elapses.
loop {
    tokio::select! {
        msg = rx.recv() => process(msg),
        _ = tokio::time::sleep(timeout) => break, // NEW 5s timer every iteration
    }
}
```

### The fixes

For a timeout that must span the whole loop, create the future **once outside** the loop, pin it, and poll `&mut` it
each iteration so the same future (and its deadline) persists:

```rust
// GOOD: pin the timeout once outside the loop; poll &mut it so the deadline persists.
let sleep = tokio::time::sleep(timeout);
tokio::pin!(sleep); // pin in place so it can be polled by &mut across iterations

loop {
    tokio::select! {
        msg = rx.recv() => process(msg), // recv() IS cancel-safe; losing it loses nothing
        _ = &mut sleep => {
            handle_timeout();
            break;
        }
    }
}
```

For the read, prefer a cancel-safe primitive. `read` / `read_buf` are cancel-safe (they report how much was read and
make no all-or-nothing promise); `read_exact` is not. If you must use a non-cancel-safe op in a `select!`, give it a
stable home so its state survives cancellation - pin it once outside the loop and select on `&mut fut`, so the same
in-progress future is resumed rather than dropped:

```rust
// GOOD: pin the non-cancel-safe future once; selecting on &mut resumes it instead of
// dropping its partial state when another branch wins.
let read = socket.read_exact(&mut buf);
tokio::pin!(read);

loop {
    tokio::select! {
        result = &mut read => { handle(result); break; }
        _ = shutdown.recv() => break, // read future is parked, not destroyed
    }
}
```

### Other `select!` edge cases

- **Racy `if` preconditions.** A precondition like `if !sleep.is_elapsed()` can read `true` between the loop check and
  the poll, letting an expired branch be skipped. Prefer an unconditional `loop { select! { ... break ... } }` over
  `while !cond { select! { ..., if cond } }`.
- **Panic on all-disabled.** `select!` panics if every branch is disabled (by `if` preconditions or non-matching
  patterns) and there is no `else` arm. Provide an `else =>` when preconditions can all be false.
- **No parallelism.** All branches run on the current task on one thread; a branch that blocks the thread freezes the
  others. For parallelism, `tokio::spawn` each future and `select!` on the `JoinHandle`s.
- **Reuse requires `Unpin`.** Using the same future across `select!` iterations needs it to be `Unpin`; achieve that
  with `tokio::pin!` (stack) or `Box::pin` (heap), as in the fixes above.

### When to reach past `select!`

`loop { select! { ... } }` over many sources is where cancellation-safety bugs breed. To consume multiple streams, merge
them (`tokio_stream::StreamExt::merge`, `futures::stream::select_all`) into one stream and
`while let Some(x) = s.next().await` - `next()` is cancel-safe and merging removes the per-branch drop hazard entirely.
To race for the first completion, ecosystem helpers (`futures::select`, `futures_concurrency::Race`) read more clearly
than a hand-rolled `select!`.

## Do You Even Need Async?

Async is not free: it colors functions (`async` propagates up the call graph), pulls in a runtime, complicates
backtraces, and introduces every footgun above. Choose the model from the workload first; do not default to async.

| Workload                               | Use                     | Why                                             |
| :------------------------------------- | :---------------------- | :---------------------------------------------- |
| CPU-bound compute (parse, hash, image) | threads / rayon         | Async gives zero parallel speedup for CPU work  |
| Reading a lot of files                 | plain thread pool       | OSes lack async file APIs; Tokio is no faster   |
| One request / a single blocking call   | sync std / blocking lib | No concurrency to exploit; async adds only cost |
| A few concurrent blocking I/O tasks    | OS threads              | Simpler than a runtime for low task counts      |
| Thousands of concurrent I/O operations | async / Tokio           | One runtime juggles huge numbers in flight      |

The decision tree:

1. Is the work CPU-bound? -> threads or rayon. Stop. (See `${CLAUDE_SKILL_DIR}/references/parallelism.md`.)
2. Is it trivial sequential I/O (one request, a few files)? -> sync `std` or a blocking library. Stop.
3. Is it a small number of concurrent blocking tasks? -> spawn OS threads. Stop.
4. Is it many concurrent I/O operations where a thread-per-task model would be wasteful? -> async / Tokio.

Only step 4 justifies async. If you need both async I/O and heavy CPU work in one program, mix the models: Tokio for the
I/O, rayon for the compute, bridged with a channel (Footgun 3).
