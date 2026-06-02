# Async Test Patterns

High-resolution depth for async tests under Tokio. The `rust-testing` SKILL.md states the working-resolution rules
(`#[tokio::test]`, paused virtual time, mock only at IO boundaries); this file holds the flavor decision matrix,
deterministic-time mechanics with bad/good pairs, the full tokio-test utility catalog, and the doctest gap in
nextest-only runs.

For runtime semantics behind `#[tokio::test]` (the executor model, `Send` bounds across `.await`, cancellation,
blocking-in-async), consult the `rust` skill's `references/async.md` - this file does not re-explain runtimes.

## Contents

- [Runtime flavors](#runtime-flavors)
- [Deterministic time](#deterministic-time)
- [tokio-test utilities](#tokio-test-utilities)
- [Mocking async IO with io::Builder](#mocking-async-io-with-iobuilder)
- [The runner reality: doctests](#the-runner-reality-doctests)
- [Edge cases](#edge-cases)

## Runtime flavors

`#[tokio::test]` builds a fresh runtime per test and `block_on`s the async body. The default is a **current-thread**
runtime (single-threaded); the `flavor` argument switches to a multi-threaded one. Each flavor maps to an explicit
`runtime::Builder` form - the attribute is sugar for that builder.

- **Default, single-threaded, deterministic ordering** - `#[tokio::test]`
- **Real parallelism across worker threads** - `#[tokio::test(flavor = "multi_thread", worker_threads = N)]`
- **Multi-thread, CPU-count workers (omit the count)** - `#[tokio::test(flavor = "multi_thread")]`
- **Start with the clock paused (auto-advance timers)** - `#[tokio::test(start_paused = true)]`

Selection rules:

- **Default to current-thread.** Gives deterministic task ordering and the lowest setup cost, and is the only flavor
  that supports auto-advancing paused time (see below). Most async logic tests need nothing more.
- **Reach for `multi_thread` only when the test genuinely needs concurrent execution on separate threads** - e.g.
  asserting that two `spawn`ed tasks run in parallel, or reproducing a data race. Multi-thread reintroduces
  nondeterministic scheduling, the opposite of what a test wants by default.
- **`worker_threads` defaults to the number of CPUs.** Pin it to a small explicit count (often `1` or `2`) for
  reproducibility; an unpinned count makes behavior depend on the machine running the test.
- **`start_paused = true` is shorthand** for `#[tokio::test]` plus an immediate `tokio::time::pause()`. Requires the
  Tokio `test-util` feature. Prefer it when the whole test runs on virtual time.

<example name="flavor-default-vs-multithread">

```rust
// GOOD: pure async logic - current-thread default, deterministic, cheap.
#[tokio::test]
async fn decodes_frame() {
    let frame = decode(b"\x01ok").await.unwrap();
    assert_eq!(frame.kind, Kind::Ok);
}

// GOOD: the test's whole point is real cross-thread parallelism - pin the worker count.
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn two_workers_drain_queue_concurrently() {
    let q = Queue::new();
    let (a, b) = tokio::join!(q.drain(), q.drain());
    assert_eq!(a + b, q.initial_len());
}
```

```rust
// BAD: multi_thread with no reason - adds scheduling nondeterminism and CPU-dependent worker count
// to a test that only awaits one future.
#[tokio::test(flavor = "multi_thread")]
async fn decodes_frame() {
    let frame = decode(b"\x01ok").await.unwrap();
    assert_eq!(frame.kind, Kind::Ok);
}
```

</example>

The equivalent hand-rolled form (use when the attribute's options are insufficient - e.g. a custom `on_thread_start`
hook) is a plain `#[test]` that builds the runtime and calls `block_on`.

```rust
#[test]
fn custom_runtime() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            assert!(do_work().await.is_ok());
        });
}
```

## Deterministic time

A test that calls a real `sleep`, reads the wall clock, or waits on a real timeout is **slow and flaky**: it pays real
wall-clock seconds and races CI scheduling jitter. Tokio's `test-util` feature exposes a virtual clock so timer tests
run instantly and deterministically.

- **`tokio::time::pause()`** freezes time. While paused, the runtime auto-advances the clock to the next scheduled timer
  the moment all tasks are idle (parked on a timer) - so `sleep`/`timeout`/`interval` fire instantly without wall-clock
  waiting. Auto-advance works only on the **current-thread** runtime.
- **`tokio::time::advance(dur)`** manually jumps the clock forward by `dur`, firing every timer that becomes due. Use it
  to fire timers at controlled points (e.g. between assertions) rather than letting them all auto-fire.
- **`tokio::time::resume()`** returns to the real clock if a single test needs both modes.
- Enable the feature in `Cargo.toml`: `tokio = { version = "...", features = ["test-util", "macros", "rt"] }`. Without
  `test-util`, `pause`/`advance`/`start_paused` do not exist.

<example name="real-sleep-vs-virtual-time">

```rust
// BAD: burns 100ms of real wall time per run and is flaky if CI is loaded - the assertion races
// the real timer. Multiply across a suite and the wall-clock cost is minutes.
#[tokio::test]
async fn debounce_emits_after_quiet_period() {
    let d = Debouncer::new(Duration::from_millis(100));
    d.signal();
    tokio::time::sleep(Duration::from_millis(150)).await; // real time
    assert_eq!(d.take(), Some(Event::Flush));
}
```

```rust
// GOOD: virtual time. advance() jumps the clock; the timer fires instantly. Zero wall-clock cost,
// fully deterministic, and the test documents the exact threshold (100ms boundary).
#[tokio::test(start_paused = true)]
async fn debounce_emits_after_quiet_period() {
    let d = Debouncer::new(Duration::from_millis(100));
    d.signal();

    tokio::time::advance(Duration::from_millis(99)).await;
    assert_eq!(d.take(), None, "must stay quiet just below the threshold");

    tokio::time::advance(Duration::from_millis(1)).await;
    assert_eq!(d.take(), Some(Event::Flush), "fires exactly at the threshold");
}
```

</example>

<example name="testing-a-timeout">

```rust
// GOOD: assert a timeout elapses without waiting for it. pause() + the future that never completes;
// advance past the deadline to make timeout() resolve to Err instantly.
#[tokio::test]
async fn request_times_out() {
    tokio::time::pause();
    let never = std::future::pending::<()>();
    let fut = tokio::time::timeout(Duration::from_secs(30), never);

    tokio::time::advance(Duration::from_secs(31)).await;
    assert!(fut.await.is_err(), "30s deadline must have elapsed");
}
```

</example>

Gotchas with virtual time:

- **Auto-advance needs the current-thread runtime.** On `multi_thread`, the clock does not auto-advance to the next
  timer; call `advance` explicitly. This is another reason to keep timer tests on the default flavor.
- **Auto-advance fires only when every task is idle.** If a task is busy-looping or blocked on something other than a
  timer, the clock will not move. A test that hangs under `start_paused` usually has a task that never parks.
- **`Instant::now()` from `std` is not virtualized** - only Tokio's clock (`tokio::time::Instant`, `sleep`, `interval`,
  `timeout`) responds to `pause`/`advance`. Code under test must use Tokio time, not `std::time`, to be controllable.

## tokio-test utilities

The `tokio-test` crate is a separate dev-dependency providing primitives for testing futures and hand-written
`poll`-based code. Add it under `[dev-dependencies]`.

Driving futures and one-off blocking:

- **`tokio_test::block_on(future)`** - runs a future to completion on a minimal current-thread runtime, blocking the
  caller. Use inside a plain `#[test]` (or a doctest) for one `await` point without the `#[tokio::test]` attribute. For
  full async tests, prefer `#[tokio::test]`.
- **`tokio_test::task::spawn(future)`** - wraps a future in a mock task you `poll` manually and inspect with
  `is_woken()`. Use it to assert the precise pending/ready transitions of a hand-written `Future` or poll-based type.

`Poll` assertions (operate on a value polled via `tokio_test::task`, returning the inner value where noted):

- **`assert_ready!(poll)`** - asserts `Poll::Ready` and returns the contained value.
- **`assert_pending!(poll)`** - asserts `Poll::Pending`.
- **`assert_ready_ok!(poll)`** - asserts `Poll::Ready(Ok(_))`, returns the `Ok` value.
- **`assert_ready_err!(poll)`** - asserts `Poll::Ready(Err(_))`, returns the `Err` value.
- **`assert_ready_eq!(poll, expected)`** - asserts ready and equal to `expected`.

`Result` / value assertions (operate on plain values, not `Poll`):

- **`assert_ok!(expr)`** - asserts `Ok`, returns the value.
- **`assert_err!(expr)`** - asserts `Err`, returns the error.
- **`assert_elapsed!(start, duration)`** - asserts an exact `duration` elapsed since `start` (+/-1ms); pair with paused
  time so the elapsed value is exact rather than wall-clock-noisy.

Choose by what you are proving:

- Testing **business logic** that happens to be async -> `#[tokio::test]` + ordinary `assert_eq!`. Do not reach for
  `assert_ready!`; you are testing outcomes, not poll states.
- Testing a **hand-written `Future`/`Stream`/`poll_*` implementation** -> `tokio_test::task::spawn` + `assert_ready!`/
  `assert_pending!` to pin the exact readiness contract.

<example name="manual-poll-assertions">

```rust
// GOOD: a hand-written Future must report Pending until the channel is fed, then Ready. Drive it
// manually and assert the transition - this is what assert_pending!/assert_ready! are for.
use tokio_test::{assert_pending, assert_ready_eq, task};

#[test]
fn waker_resolves_only_after_send() {
    let (tx, rx) = tokio::sync::oneshot::channel::<u8>();
    let mut fut = task::spawn(rx);

    assert_pending!(fut.poll());      // nothing sent yet
    assert!(!fut.is_woken());

    tx.send(7).unwrap();
    assert!(fut.is_woken());          // the send woke the task
    assert_ready_eq!(fut.poll(), Ok(7));
}
```

</example>

## Mocking async IO with io::Builder

`tokio_test::io::Builder` builds a mock that implements `AsyncRead` + `AsyncWrite` with a **scripted** sequence of reads
and writes. It is the right double for code that talks to a socket/stream behind the Tokio IO traits - no real network,
fully deterministic, and it asserts the exact byte protocol.

- `.read(bytes)` queues bytes the mock will hand to the code under test on its next read.
- `.write(bytes)` asserts the code writes exactly those bytes next; a mismatch panics.
- `.wait(dur)` injects a delay (combine with paused time to keep it instant).
- `.build()` produces the mock; the mock panics on drop if scripted actions remain unconsumed - so it doubles as an
  assertion that the protocol ran to completion.

<example name="io-builder-scripted-protocol">

```rust
// GOOD: drive a line protocol against a scripted mock. No sockets, deterministic, and the mock
// panics on drop if the code skips a scripted step - so completeness is asserted for free.
use tokio_test::io::Builder;

#[tokio::test]
async fn greets_then_echoes() {
    let mock = Builder::new()
        .write(b"HELLO\n")     // client must greet first
        .read(b"WELCOME\n")    // server responds
        .write(b"ping\n")      // client echoes
        .build();

    run_session(mock).await.unwrap();
}
```

```rust
// BAD: a real TcpStream binds a port, races the OS scheduler, and leaks state between tests.
// Reserve real sockets for a small number of end-to-end integration tests, not unit-level protocol checks.
#[tokio::test]
async fn greets_then_echoes() {
    let stream = tokio::net::TcpStream::connect("127.0.0.1:9000").await.unwrap();
    run_session(stream).await.unwrap();
}
```

</example>

To mock an async **trait** (a collaborator behind `async_trait`/`trait_variant`), use mockall and return a boxed future
from `.returning(|| Box::pin(async { ... }))` - see the mocking-and-fixtures reference. `io::Builder` is for the
`AsyncRead`/`AsyncWrite` byte-stream seam specifically.

## The runner reality: doctests

`cargo nextest run` builds each test binary, queries it for the tests it contains, and runs each test in its own process
in parallel. That model gives clean isolation for unit and integration tests - but **doctests are not test binaries
nextest can enumerate**, so nextest does not run them. A project whose only test command is `cargo nextest run` silently
skips every `///` example, including async doctests that use `block_on`.

The fix is mechanical and non-negotiable: pair nextest with a separate `cargo test --doc` step. Both belong in the
verification gate.

<example name="verification-gate">

```bash
# BAD: doctests silently skipped. Async examples in /// blocks never compile or run; rot goes unnoticed.
cargo nextest run

# GOOD: nextest for unit + integration, then cargo's own harness for doctests.
cargo nextest run
cargo test --doc
```

</example>

Writing an async doctest (it needs its own runtime - there is no `#[tokio::test]` attribute available in a doc block):

<example name="async-doctest">

````rust
/// Connects and fetches the banner.
///
/// ```
/// # use mycrate::Client;
/// let banner = tokio_test::block_on(async {
///     Client::connect("example").await?.banner().await
/// })?;
/// assert_eq!(banner, "ready");
/// # Ok::<(), mycrate::Error>(())
/// ```
pub async fn banner(&self) -> Result<String, Error> { /* ... */ }
````

- Use `tokio_test::block_on` (or build a runtime) inside the doc block - the `#[tokio::test]` attribute does not apply
  to doctest code.
- Hide runtime/import scaffolding with leading `#` so the rendered docs show only the meaningful lines.
- Mark an example ` ```no_run ` when it must compile but must not execute (e.g. it would open a real connection);
  `cargo test --doc` still compiles it, which is the point.

## Edge cases

- **`#[should_panic]` async test** - combine it with `#[tokio::test]`: `#[tokio::test]` then
  `#[should_panic(expected = "...")]`. A panic inside the async body propagates out of `block_on` and the harness
  catches it.
- **Spawned task panics** - on the default current-thread runtime a panic in a `tokio::spawn`ed task surfaces when you
  `.await` its `JoinHandle` (it returns `Err(JoinError)`); a detached spawned task's panic may be swallowed. Always
  `.await` the handle and assert on the `JoinError` when the test's point is that a task panicked.
- **Time and `multi_thread` together** - auto-advance does not apply; you must call `advance` explicitly, and timer
  ordering across threads is nondeterministic. Keep deterministic-time tests on the current-thread default.
- **`block_on` inside an existing runtime** - calling `tokio_test::block_on` (or `Runtime::block_on`) from within a
  `#[tokio::test]` body panics ("cannot block the current thread from within a runtime"). Use `block_on` only from a
  plain `#[test]` or a doctest, never nested inside an async test.
