# Parallelism: CPU-bound multicore compute

High-resolution companion to the SKILL.md concurrency rules. Primary reference for **CPU-bound, multicore compute** --
work that saturates cores (parsing, hashing, image processing, number crunching, compression, graph traversal). SKILL.md
states the rules tersely; this file carries the extended bad/good code, decision tables, full method catalogs, and edge
cases.

## Contents

- [The one decision that comes first](#the-one-decision-that-comes-first)
- [std::thread::spawn and JoinHandle](#stdthreadspawn-and-joinhandle)
- [Scoped threads: borrowing stack data](#scoped-threads-borrowing-stack-data)
- [Send and Sync: what crosses a thread boundary](#send-and-sync-what-crosses-a-thread-boundary)
- [Rayon: data parallelism](#rayon-data-parallelism)
- [Rayon join and the work-stealing model](#rayon-join-and-the-work-stealing-model)
- [Sharing mutable state: Arc, Mutex, RwLock, atomics](#sharing-mutable-state-arc-mutex-rwlock-atomics)
- [Channels: moving work and ownership between threads](#channels-moving-work-and-ownership-between-threads)
- [Choosing channels vs shared mutex](#choosing-channels-vs-shared-mutex)
- [When NOT to reach for parallelism](#when-not-to-reach-for-parallelism)

## The one decision that comes first

**CPU-bound work parallelizes across cores with threads or rayon. It does not go faster under async.** Async
(`Future`/Tokio) interleaves tasks at `.await` suspension points; a CPU loop never suspends, so a single async task pins
one core and starves the runtime's other tasks. Async gives concurrency over I/O waits, not parallel arithmetic.

| Workload                                  | Tool                            | Why                                    |
| :---------------------------------------- | :------------------------------ | :------------------------------------- |
| Map/filter/reduce over a large collection | `rayon` parallel iterators      | One-word swap from `iter()`            |
| Recursive divide-and-conquer (sort, tree) | `rayon::join` / `rayon::scope`  | Fork-join + work-stealing fills cores  |
| A few long-lived heterogeneous workers    | `std::thread::spawn` + channels | Distinct roles, not uniform data       |
| Parallel work that borrows stack locals   | `std::thread::scope`            | Borrows non-`'static` locals safely    |
| Thousands of sockets / requests / files   | async / Tokio                   | I/O-bound, see `references/async.md`   |
| One blocking CPU job inside an async app  | `spawn_blocking` / a rayon pool | Keeps the CPU loop off runtime workers |

Inside Tokio, never run a CPU loop on a runtime worker; hand it to `spawn_blocking` or a rayon pool and `.await` the
result over a channel. Detail lives in `references/async.md`.

## std::thread::spawn and JoinHandle

`thread::spawn(f)` starts a native OS thread and returns a `JoinHandle<T>`. The closure must be `'static` (it may
outlive the spawning frame) and `Send` (it moves to another thread), so capture by `move`. `handle.join()` blocks until
the thread finishes and yields `thread::Result<T>` -- `Ok(value)` with the closure's return, or `Err(payload)` carrying
the `panic!` argument if that thread panicked. There is no parent/child relationship: a detached thread (handle dropped
without `join`) may outlive its spawner, and when `main` returns the whole process exits regardless of live threads.

A spawned thread's panic does **not** propagate to the spawner automatically -- it surfaces only when you `join` and
inspect the `Err`. Drop the handle and the panic vanishes silently. Join the handles you care about.

```rust
// BAD: detached threads, no join -- results lost, panics swallowed, main may exit first.
fn checksum_all(paths: Vec<PathBuf>) {
    for path in paths {
        std::thread::spawn(move || {
            let sum = expensive_hash(&path); // result goes nowhere
            // if this panics, nobody ever finds out
        });
    }
    // returns immediately; threads may still be running or already killed at process exit
}
```

```rust
// GOOD: collect handles, join each, propagate the value (and surface panics).
fn checksum_all(paths: Vec<PathBuf>) -> Vec<u64> {
    let handles: Vec<_> = paths
        .into_iter()
        .map(|path| std::thread::spawn(move || expensive_hash(&path)))
        .collect();

    handles
        .into_iter()
        .map(|h| h.join().expect("hashing thread panicked"))
        .collect()
}
```

Spawning one OS thread per work item is wasteful: each thread costs a stack (2 MiB default on Tier-1 platforms) and a
scheduler slot. Spawn a bounded number of threads (around `std::thread::available_parallelism()`), or use rayon, which
manages a right-sized pool. Configure name and stack size through `thread::Builder::new().name(..).stack_size(..)` when
a thread needs a non-default stack or must be identifiable in panic messages and OS tooling.

## Scoped threads: borrowing stack data

`thread::spawn` requires `'static` because the thread can outlive the caller. `thread::scope` removes that constraint:
the scope **guarantees all threads it spawns are joined before the scope returns**, so those threads may borrow data
that merely outlives the scope -- local stack variables, `&` and `&mut` slices -- with no `Arc` and no `'static`.

```rust
// BAD: trying to share a stack slice across plain spawn -- does not compile.
fn sum_halves(data: &[i64]) -> i64 {
    let (left, right) = data.split_at(data.len() / 2);
    // error[E0521]: borrowed data escapes; closure may outlive `data`
    let h1 = std::thread::spawn(move || left.iter().sum::<i64>());
    let h2 = std::thread::spawn(move || right.iter().sum::<i64>());
    h1.join().unwrap() + h2.join().unwrap()
}
```

```rust
// GOOD: scope ties thread lifetimes to the borrow -- no 'static, no Arc, no clone.
fn sum_halves(data: &[i64]) -> i64 {
    let (left, right) = data.split_at(data.len() / 2);
    std::thread::scope(|s| {
        let h1 = s.spawn(|| left.iter().sum::<i64>());
        let h2 = s.spawn(|| right.iter().sum::<i64>());
        h1.join().unwrap() + h2.join().unwrap()
    }) // all scoped threads are joined here before `scope` returns
}
```

Scoped threads may also take disjoint `&mut` borrows of the same buffer (e.g. via `split_at_mut`), letting threads write
different regions in parallel without a lock. `s.spawn` returns a `ScopedJoinHandle`; handles you do not join explicitly
are joined implicitly when the scope closes. Use scoped threads for a fixed, known set of parallel tasks over borrowed
data; use rayon when the work is a collection to be split adaptively.

## Send and Sync: what crosses a thread boundary

These two auto-traits are the compiler's data-race firewall. They are derived automatically; you rarely implement them.

- **`Send`** -- a value of this type can be _moved to another thread_. Required by `thread::spawn`, channel `send`, and
  `rayon`. Almost everything is `Send`; the notable exception is `Rc<T>` (non-atomic refcount).
- **`Sync`** -- `&T` can be _shared_ between threads (`T: Sync` iff `&T: Send`). Required to put a `&T` behind `Arc` or
  a scoped borrow. `Cell`/`RefCell` are `!Sync` (unsynchronized interior mutability); `Mutex`/`RwLock`/atomics are
  `Sync`.

The practical rules:

- `Rc<T>` / `RefCell<T>` are single-thread tools -- `Rc` is `!Send`, `RefCell` is `!Sync`. Across threads use `Arc<T>`
  for shared ownership and `Mutex`/`RwLock`/atomics for shared mutation.
- A compiler error like "`Rc<...>` cannot be sent between threads safely" is a design signal, not an obstacle to
  silence: swap `Rc`->`Arc`, `RefCell`->`Mutex`/`RwLock`, or restructure so the value never crosses the boundary.
- When you do hand-implement `Send`/`Sync` (raw pointers, FFI handles), it is `unsafe` and demands a `// SAFETY:`
  comment proving the synchronization invariant holds.

## Rayon: data parallelism

Rayon converts sequential iterator computations into parallel ones, guaranteeing data-race-free execution and engaging
parallelism only when the runtime workload justifies it. Add the dependency and bring the traits into scope with
`use rayon::prelude::*;` in every module that calls a parallel method -- the `par_*` methods live on extension traits.

The core move: replace `.iter()` / `.iter_mut()` / `.into_iter()` with `.par_iter()` / `.par_iter_mut()` /
`.into_par_iter()`. Most adapters (`map`, `filter`, `for_each`, `fold`, `reduce`, `flat_map`, `sum`, `collect`) carry
over unchanged, so the diff is often a single word.

```rust
// BAD: serial map over a large input -- uses one core regardless of how many exist.
fn thumbnails(images: &[Image]) -> Vec<Thumbnail> {
    images.iter().map(|img| resize(img)).collect()
}
```

```rust
// GOOD: par_iter spreads the same map across all cores; collect preserves input order.
use rayon::prelude::*;

fn thumbnails(images: &[Image]) -> Vec<Thumbnail> {
    images.par_iter().map(|img| resize(img)).collect()
}
```

Order and closure constraints:

- `collect()` from a parallel iterator preserves the **input order** even though work runs out of order -- you do not
  get a shuffled result.
- Parallel-iterator closures run on multiple threads, so each must be `Send`, and any captured shared state must be
  `Sync`. A closure that mutates one captured `Vec` will not compile -- accumulate with `reduce`/`fold` or write through
  `par_iter_mut`/atomics instead.

Catalog of the methods worth knowing (all from `rayon::prelude` unless noted):

- **`par_iter` / `par_iter_mut` / `into_par_iter`** -- parallel equivalents of `iter`/`iter_mut`/`into_iter`.
- **`par_bridge`** -- turns an _existing sequential_ `Iterator` (one without a native parallel form, e.g. lines from a
  reader) into a `ParallelIterator`. It does not preserve order and is less efficient than a true `par_iter`; prefer
  collecting into a `Vec` and using `par_iter` when the source allows it.
- **`reduce(identity, op)`** -- parallel fold to a single value with an associative `op` and an identity element. Use
  this for parallel sums/maxes/merges; the operation must be associative because subresults combine in arbitrary order.
- **`fold(identity, op).reduce(..)`** -- `fold` produces per-thread-chunk intermediates, `reduce` merges them; use when
  the per-item accumulator type differs from the item type.
- **`for_each`** -- parallel side-effecting iteration when there is no value to collect (writing to disk, sending on a
  channel, updating atomics).
- **`try_fold` / `try_reduce` / `find_any` / `find_first`** -- short-circuiting variants; `find_any` returns any match
  (fastest), `find_first` returns the first in iteration order.
- **`par_sort` / `par_sort_unstable`** -- parallel in-place sort of `&mut [T]` / `Vec<T>` (on the `ParallelSliceMut`
  extension trait).
- **`par_extend`** -- grow a collection from items produced in parallel.

```rust
// Parallel reduce: associative op + identity. Subresults combine in arbitrary order, so + is safe; subtraction is not.
use rayon::prelude::*;

fn total_size(files: &[Metadata]) -> u64 {
    files.par_iter().map(|m| m.len()).reduce(|| 0, |a, b| a + b)
}
```

## Rayon join and the work-stealing model

`rayon::join(a, b)` takes two closures and _potentially_ runs them in parallel, returning `(a_result, b_result)`.
"Potentially" is the whole point: rayon pushes the second closure onto a per-thread deque; if an idle worker is free it
**steals** and runs that job in parallel, otherwise the current thread just runs it inline. Idle workers steal from the
_back_ of busy workers' deques. This work-stealing scheduler keeps all cores busy without you partitioning the work, and
adds negligible overhead when no thread is free to steal -- so it is safe to `join` even on small subproblems.

`join` is the primitive behind divide-and-conquer parallelism:

```rust
// GOOD: parallel quicksort. join runs the two partitions concurrently when cores are idle,
// sequentially when they are not -- no manual thread management, near-zero overhead at the leaves.
use rayon::join;

fn par_quicksort<T: Send + Ord>(slice: &mut [T]) {
    if slice.len() <= 1 {
        return;
    }
    let mid = partition(slice);
    let (lo, hi) = slice.split_at_mut(mid);
    join(|| par_quicksort(lo), || par_quicksort(hi));
}
```

When two tasks are not enough, `rayon::scope(|s| { s.spawn(|_| ..); ... })` opens a fork-join scope that spawns any
number of tasks, each able to borrow stack data, and blocks at the closing brace until every spawned task completes --
the rayon analogue of `std::thread::scope`, but the tasks land on the work-stealing pool. `scope_fifo` prioritizes
same-thread spawns in FIFO order; the global pool size and worker count are tunable via `ThreadPoolBuilder`
(`current_num_threads()` reports the active count). `rayon::spawn` (no scope) requires `'static` captures, like
`std::thread::spawn`.

## Sharing mutable state: Arc, Mutex, RwLock, atomics

Immutable data shared across threads needs only `Arc<T>` -- atomic reference counting, clone the `Arc` (cheap, bumps a
counter) and move each clone into a thread. For _mutable_ shared state, wrap the data in a synchronization primitive and
that in an `Arc`:

- **`Arc<Mutex<T>>`** -- exclusive access; one thread holds the lock at a time. The default for shared mutation.
- **`Arc<RwLock<T>>`** -- many concurrent readers _or_ one writer. Choose it only for read-heavy data where reader
  concurrency outweighs the `RwLock`'s higher per-operation cost; for write-heavy or low-contention data, `Mutex` is
  faster and simpler.
- **`Arc<AtomicUsize>` / `AtomicU64` / `AtomicBool` (and friends)** -- lock-free single-word counters, flags, and
  accumulators. Far cheaper than a `Mutex` for one integer/bool; pick a `Relaxed` ordering for plain counters, stronger
  orderings only when an atomic guards access to other memory.

`Mutex::lock()` returns a `Result` (it errors only if the lock was _poisoned_ -- a thread panicked while holding it). A
held `MutexGuard` is a borrow: hold it for the shortest possible span, and never hold it across a blocking call or, in
async code, across `.await`.

```rust
// BAD: lock held across the whole heavy computation -- serializes every thread; the Mutex defeats the parallelism.
use std::sync::{Arc, Mutex};

fn tally(items: &[Item], totals: Arc<Mutex<Totals>>) {
    items.iter().for_each(|item| {
        let mut guard = totals.lock().unwrap();
        guard.merge(compute(item)); // compute() runs *inside* the critical section
    });
}
```

```rust
// GOOD: compute outside the lock; take the lock only to merge the finished result. Critical section is tiny.
use std::sync::{Arc, Mutex};

fn tally(items: &[Item], totals: Arc<Mutex<Totals>>) {
    items.iter().for_each(|item| {
        let partial = compute(item); // heavy work, no lock held
        totals.lock().unwrap().merge(partial); // guard dropped at end of statement
    });
}
```

```rust
// BETTER for pure accumulation: skip the shared lock entirely -- rayon reduce combines per-thread partials.
use rayon::prelude::*;

fn tally(items: &[Item]) -> Totals {
    items
        .par_iter()
        .map(compute)
        .reduce(Totals::default, |mut acc, partial| {
            acc.merge(partial);
            acc
        })
}
```

The progression above is the standard refactor: a shared `Mutex` is the fallback, not the goal. When the operation is a
reduction, `reduce`/`fold` eliminates the lock and the contention with it. Use `Arc<Mutex<T>>` when threads must mutate
genuinely shared state that has no reduction structure (a shared cache, a registry).

## Channels: moving work and ownership between threads

Channels pass _ownership_ of values between threads -- the sender loses access, the receiver gains it -- so they
sidestep shared-mutation locking entirely. Standard library: `std::sync::mpsc` (multi-producer, single-consumer).
`tx.send(v)` moves `v`; `rx.recv()` blocks for the next value and returns `Err` once all senders are dropped; iterating
`for v in rx` drains until then. Clone the `Sender` to get multiple producers.

```rust
// GOOD: fan out heterogeneous work to a fixed worker pool; collect results back over a channel.
use std::sync::mpsc;
use std::thread;

fn process_pool(jobs: Vec<Job>) -> Vec<Output> {
    let (result_tx, result_rx) = mpsc::channel();
    let workers = thread::available_parallelism().map(|n| n.get()).unwrap_or(4);

    thread::scope(|s| {
        let chunks = split_into(jobs, workers);
        for chunk in chunks {
            let tx = result_tx.clone();
            s.spawn(move || {
                for job in chunk {
                    tx.send(run(job)).expect("receiver dropped");
                }
            });
        }
        drop(result_tx); // drop the last sender so the loop below terminates
        result_rx.into_iter().collect()
    })
}
```

For richer needs use `crossbeam-channel`: multi-producer **multi-consumer** channels, a `select!` macro for waiting on
several channels at once, and faster bounded/unbounded queues -- the standard choice for work-stealing queues and
worker-pool plumbing beyond the single-consumer `mpsc`. In async code, use the runtime's channels
(`tokio::sync::mpsc`/`oneshot`) instead -- see `references/async.md`.

A common deadlock: forgetting to drop the extra `Sender`. `rx` only returns `Err`/ends iteration when _every_ `Sender`
is dropped; a lingering clone (including the original `tx` you cloned from) keeps `recv` blocking forever. `drop(tx)`
the originals once the workers own their clones.

## Choosing channels vs shared mutex

Both coordinate threads; they model different problems. Channels move ownership and fit pipelines and actor-style
designs; shared mutexes fit a single piece of state that many threads read and write in place.

| Dimension    | Channels (`mpsc` / crossbeam)              | `Arc<Mutex<T>>` / `Arc<RwLock<T>>`         |
| :----------- | :----------------------------------------- | :----------------------------------------- |
| Mental model | Transfer ownership; "share by sending"     | Shared in-place mutation behind a lock     |
| Best fit     | Pipelines, work queues, actor fan-in/out   | One state object many threads touch        |
| Coupling     | Producers/consumers decoupled by the queue | Holders coupled to the lock's contention   |
| Failure mode | Undropped senders deadlock; backlog grows  | Lock contention; lock-ordering cycles      |
| Backpressure | Bounded channel blocks the sender          | None -- work piles in the shared structure |

Default to channels for moving work between roles; use a shared mutex only when the data is inherently one shared object
with no clean ownership handoff. For pure parallel reductions, prefer rayon `reduce`/`fold` over both.

## When NOT to reach for parallelism

Parallelism adds threads, synchronization, and nondeterminism. Each has a cost; spend it only when the workload pays it
back.

- **The work is small.** Spawning threads or even a rayon split costs more than the computation for tiny inputs. A
  serial `.iter()` over a few hundred cheap items beats `par_iter` once thread-coordination overhead dominates. Measure
  first.
- **The work is I/O-bound, not CPU-bound.** Waiting on sockets, disks, or a database is not faster with more threads
  spinning on cores -- that is the async/Tokio domain (`references/async.md`).
- **The task is inherently sequential.** A fold with a non-associative dependency on the previous result (a running
  parser state, a Markov step) cannot be split; forcing it parallel produces wrong answers or needs so much locking the
  parallelism evaporates.
- **A shared `Mutex` would serialize everything.** If every iteration must take the same lock, threads run one-at-a-time
  plus locking overhead -- slower than serial. Restructure to a reduction or per-thread state first; if you cannot, do
  not parallelize.
- **Correctness is not yet established.** Parallelize a correct, profiled serial implementation. Parallelizing first
  multiplies the surface area for bugs that are hard to reproduce.

The reflex of the SKILL.md applies here too: when the borrow checker rejects a parallel design (a captured `Rc`, an
aliased `&mut`, a non-`Send` value crossing a thread), the fix is a clearer ownership structure -- scoped borrows, a
reduction, a channel handoff -- not a reflexive `.clone()`, `Arc<Mutex<_>>`, or `unsafe`.
