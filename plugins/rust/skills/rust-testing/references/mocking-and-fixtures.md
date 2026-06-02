# Mocking and Fixtures

Depth for the SKILL's mocking decision rule, `rstest` parameterization/fixtures, `serial_test`, and `assert_cmd` +
`predicates` CLI testing. SKILL.md states the rules; this file holds worked examples, full catalogs, and edge cases.
Target: Rust 2024 edition, current stable.

## Contents

- [The Test-Double Ladder](#the-test-double-ladder)
- [Trait-Seam Doubles Before Reaching for mockall](#trait-seam-doubles-before-reaching-for-mockall)
- [mockall: Where It Earns Its Place](#mockall-where-it-earns-its-place)
- [mockall API Catalog](#mockall-api-catalog)
- [Call-Order Assertions Are an Anti-Pattern](#call-order-assertions-are-an-anti-pattern)
- [mockall Edge Cases](#mockall-edge-cases)
- [rstest: Parameterized Cases](#rstest-parameterized-cases)
- [rstest: Fixtures](#rstest-fixtures)
- [rstest: Value Lists and Async](#rstest-value-lists-and-async)
- [serial_test and nextest Isolation](#serial_test-and-nextest-isolation)
- [assert_cmd: Black-Box CLI Testing](#assert_cmd-black-box-cli-testing)
- [predicates: Assertion Catalog](#predicates-assertion-catalog)

## The Test-Double Ladder

Pick the lowest rung that still proves the behavior. Each rung up adds coupling between the test and the code's internal
structure, which makes refactors break tests that should not care.

- **Real implementation** — call the actual collaborator. Use for pure logic, no external dependency. Cost: none.
- **In-memory fake** — working impl backed by memory. Use for a stateful collaborator reused across tests. Cost:
  write/maintain the fake once.
- **Hand-written double** — small struct with canned answers. Use for one or two stubbed responses where a fake is
  overkill. Cost: per-test boilerplate.
- **mockall** — generated mock with expectations. Use for an IO / nondeterministic boundary behind a trait. Cost: macro
  weight, expectation upkeep.

The boundary that justifies mockall is non-determinism or external IO you cannot run in a unit test: network sockets,
filesystem, system clock, randomness, a payment gateway. Pure logic and in-memory state never justify it.

## Trait-Seam Doubles Before Reaching for mockall

Define the collaborator behind a trait so the production type and the test double are interchangeable. The function
under test depends on the trait, not a concrete type.

```rust
/// The seam: production code depends on this, not on a concrete client.
trait Clock {
    fn now(&self) -> u64; // unix seconds
}

struct SystemClock;
impl Clock for SystemClock {
    fn now(&self) -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
}

fn is_expired(clock: &impl Clock, deadline: u64) -> bool {
    clock.now() >= deadline
}
```

A hand-written double is often all you need. It is faster to read than a mock and has no macro magic:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    /// Hand-written double: a fixed clock with one canned answer.
    struct FixedClock(u64);
    impl Clock for FixedClock {
        fn now(&self) -> u64 {
            self.0
        }
    }

    #[test]
    fn reports_expired_at_or_after_deadline() {
        assert!(is_expired(&FixedClock(100), 100));
        assert!(!is_expired(&FixedClock(99), 100));
    }
}
```

An in-memory fake is the right rung for a stateful collaborator. As a real working implementation, it catches the same
class of bugs the production implementation would, and it is reusable across the whole test suite:

```rust
trait UserRepo {
    fn insert(&mut self, id: u64, name: &str);
    fn get(&self, id: u64) -> Option<String>;
}

#[cfg(test)]
#[derive(Default)]
struct InMemoryRepo {
    rows: std::collections::HashMap<u64, String>,
}

#[cfg(test)]
impl UserRepo for InMemoryRepo {
    fn insert(&mut self, id: u64, name: &str) {
        self.rows.insert(id, name.to_owned());
    }
    fn get(&self, id: u64) -> Option<String> {
        self.rows.get(&id).cloned()
    }
}
```

When this fake answers the test honestly and the assertion is on observable state (`repo.get(id)`), there is no reason
to mock `UserRepo`. Mocking it would force the test to assert which methods ran instead of what the data ended up being.

## mockall: Where It Earns Its Place

Reach for mockall when the boundary is genuinely an IO/non-deterministic seam and writing a fake would mean
reimplementing the external service. The two entry points:

- `#[automock]` on a trait (or a struct with a single `impl` block) generates `MockMyTrait` automatically. This is the
  default.
- `mock! { ... }` for things `#[automock]` cannot reach: foreign/external traits, structs with multiple `impl` blocks,
  multiple or inherited traits on one mock.

`#[automock]` on a trait that abstracts the network boundary:

```rust
use mockall::automock;
use mockall::predicate::*;

#[automock]
trait PaymentGateway {
    fn charge(&self, account: &str, cents: u64) -> Result<String, String>; // Ok(txn_id)
}

fn checkout(gw: &dyn PaymentGateway, account: &str, total: u64) -> Result<String, String> {
    gw.charge(account, total)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn charges_the_card_exactly_once() {
        let mut gw = MockPaymentGateway::new();
        gw.expect_charge()
            .with(eq("acct-1"), eq(4_200u64))
            .times(1) // call count IS the contract here: bill once, not twice
            .returning(|_, _| Ok("txn-99".to_owned()));

        let txn = checkout(&gw, "acct-1", 4_200).unwrap();
        assert_eq!("txn-99", txn);
    }
}
```

`times(1)` here is legitimate: "charge the card exactly once" is part of the observable contract, not an internal call
ordering. Double-charging is a real bug the assertion guards against.

Use `mock!` for an external trait you do not own. The mock struct name is the given name with `Mock` prepended:

```rust
mock! {
    MyStruct {}                 // struct name, less the "Mock" prefix
    impl Clone for MyStruct {   // foreign trait to mock
        fn clone(&self) -> Self;
    }
}

let mut mock1 = MockMyStruct::new();
let mock2 = MockMyStruct::new();
mock1.expect_clone().return_once(move || mock2);
let _cloned = mock1.clone();
```

## mockall API Catalog

Every expectation needs a return value (unless the `nightly` feature is on and the return type implements `Default`).
Set it one of these ways:

- **`return_const(v)`** — a constant value cloned on each call.
- **`returning(|args| ...)`** — a closure taking the method's arguments by value; computes the return per call.
- **`return_once(move || ...)`** — `FnOnce`; for returning a non-`Clone` value or triggering a one-shot side effect.
- **`return_const_st` / `returning_st` / `return_once_st`** — non-`Send` return values; add runtime access checks (the
  wrapped value panics if touched from another thread).

Argument matching:

- **`.with(predicate, ...)`** — one `predicates` matcher per argument; panics on mismatch. Matchers take reference
  arguments **by value** (a `&u32` arg is matched with `|x: &u32|`, not `|x: &&u32|`).
- **`.withf(|a, b| ...)`** — shorthand for the `function` predicate; the closure receives arguments by reference.
- **`.withf_st(...)`** — `withf` for non-`Send` argument types.

Multiple expectations on the same method are evaluated in FIFO order; the first matching one wins. Order them from most
specific to a final fallback:

```rust
let mut mock = MockFoo::new();
mock.expect_open()
    .with(eq(String::from("something.txt")))
    .returning(|_| Some(5));
mock.expect_open()
    .return_const(None); // fallback for every other path
```

Call counts:

- **`.times(n)`** — exactly `n` calls; also accepts a range.
- **`.never()`** — must never be called.
- Default (no call-count set) — any number of calls, including zero.

Reference returns: the returned reference must live as long as the mock or be `'static`. `&self` methods use
`return_const`; `&mut self` methods use `return_var` or `returning`. For `&str`/`&Path`/`&OsStr`/`&CStr`/`&[T]` mockall
uses the owned form automatically — `expect_name().return_const("abcd".to_owned())` for `fn name(&self) -> &str`.

Static methods and module functions have **global** expectations set through a `Context` object
(`MockA::foo_context()`); they require your own synchronization across tests (see `serial_test` below). A mock object's
`checkpoint()` validates and clears its expectations mid-test but does not checkpoint static methods.

Async traits: `#[automock]` is compatible with native `async fn` in traits and with `async_trait`/`trait_variant`. The
`#[automock]` attribute must appear **before** the `#[async_trait]`/`#[trait_variant::make]` attribute, and those macros
must be imported under their canonical names. For `impl Future`/`impl Stream` returns, pin in the expectation:

```rust
mock.expect_foo()
    .returning(|| Box::pin(async { 42 }));
```

## Call-Order Assertions Are an Anti-Pattern

mockall ships `Sequence` and `.in_sequence(&mut seq)` to assert the order across calls. Do not use them to lock the
internal call order of the code under test. Ordering assertions encode _how_ the code is written, so a harmless refactor
that reorders independent calls breaks a test even though behavior is unchanged.

```rust
// ANTI-PATTERN: asserts the internal call graph, not behavior.
let mut seq = mockall::Sequence::new();
let mut cache = MockCache::new();
let mut db = MockDb::new();
cache.expect_get().times(1).in_sequence(&mut seq).returning(|_| None);
db.expect_load().times(1).in_sequence(&mut seq).returning(|_| Row::default());
// This test now fails if the code checks the DB before the cache, even when
// the returned value is identical. It tests implementation, not contract.
```

```rust
// BETTER: assert the observable outcome. The order is the code's business.
let mut cache = MockCache::new();
let mut db = MockDb::new();
cache.expect_get().returning(|_| None);
db.expect_load().returning(|_| Row { id: 7, name: "ada".into() });

let row = load_user(&cache, &db, 7);
assert_eq!(7, row.id); // what the caller observes
assert_eq!("ada", row.name);
```

Reserve `times`/`never` and argument matchers for cases where the call itself is the contract (charge once, never delete
when dry-run is set). `Sequence` is justified only when ordering is part of the externally observable protocol (e.g. a
wire protocol that must send `HELLO` before `AUTH`), not the code's private control flow.

## mockall Edge Cases

- **Mocking a struct (not a trait)** creates a namespace clash: the mock has a different type name than the real struct.
  Use the `mockall_double` crate's `#[double]` on the import so the mock is swapped in only under `cfg(test)`. Prefer
  introducing a trait seam instead, which sidesteps the problem.
- **Generic methods with `'static` params** make the `expect_*` method generic; usually call it with a turbofish
  (`mock.expect_foo::<i16>()`). Expectations for different generic params are independent.
- **Generic lifetime params** force `withf` over `with`, forbid the lifetime in the return type, and forbid a method
  having both a generic lifetime and a generic type parameter at once.
- **`impl Trait` returns** are transformed to `Box<dyn Trait>` internally — return `Box::new(value)` in the expectation.
  This fails for `impl Clone`/`impl Sized` or multi-trait `impl Debug + Display`; refactor to a named opaque type
  instead.
- **Associated types** are specified as metaitems: `#[automock(type Key=u16; type Value=i32;)]`.
- **`nightly` feature** lets expectations whose return type is `Default` omit the return value, and yields better error
  messages.

## rstest: Parameterized Cases

Replace a hand-rolled loop or copy-pasted near-identical tests with `#[case(...)]` rows. Each row generates a separate
test with its own name, so a single failing input is reported in isolation instead of failing the whole loop.

```rust
use rstest::rstest;

#[rstest]
#[case(0, 0)]
#[case(1, 1)]
#[case(5, 5)]
#[case(6, 8)]
fn fibonacci(#[case] input: u32, #[case] expected: u32) {
    assert_eq!(expected, fib(input));
}
```

Magic conversion: when an argument type implements `FromStr`, pass a string literal and rstest builds the value. Useful
for addresses, durations, and other parse-from-text types:

```rust
use std::net::SocketAddr;

#[rstest]
#[case("1.2.3.4:8080", 8080)]
#[case("127.0.0.1:9000", 9000)]
fn check_port(#[case] addr: SocketAddr, #[case] expected: u16) {
    assert_eq!(expected, addr.port());
}
```

## rstest: Fixtures

A `#[fixture]` is a function returning any Rust type; an `#[rstest]` test resolves each argument by its name to the
matching fixture function. Fixtures hide setup so the test body shows only the behavior under test, and fixtures may
themselves consume other fixtures.

```rust
use rstest::{fixture, rstest};

#[fixture]
fn empty_repository() -> InMemoryRepo {
    InMemoryRepo::default()
}

// A fixture that builds on another fixture.
#[fixture]
fn alice_and_bob(mut empty_repository: InMemoryRepo) -> InMemoryRepo {
    empty_repository.insert(1, "Bob");
    empty_repository.insert(2, "Alice");
    empty_repository
}

#[rstest]
fn finds_seeded_users(alice_and_bob: InMemoryRepo) {
    assert_eq!(Some("Alice".to_owned()), alice_and_bob.get(2));
}
```

Fixtures resolve by standard name resolution, so an identically named fixture defined in a different module gives a
different value. This lets each test module define its own `repository` fixture (empty vs pre-populated) without name
collisions:

```rust
mod empty_cases {
    use super::*;

    #[fixture]
    fn repository() -> InMemoryRepo {
        InMemoryRepo::default()
    }

    #[rstest]
    fn starts_empty(repository: InMemoryRepo) {
        assert_eq!(None, repository.get(1));
    }
}
```

## rstest: Value Lists and Async

`#[values(...)]` generates the cartesian product of the listed values across arguments — one test per combination. Use
it for exhaustive small state-machine checks:

```rust
#[rstest]
fn always_terminates(
    #[values(State::Init, State::Start, State::Processing)] state: State,
    #[values(Event::Error, Event::Fatal)] event: Event,
) {
    assert_eq!(State::Terminated, state.process(event)); // 3 x 2 = 6 generated tests
}
```

Async cases combine `#[rstest]` with the async test attribute. rstest exposes an `async-timeout` feature (enabled by
default) for `#[timeout(...)]` on async tests:

```rust
#[rstest]
#[case(2, 4)]
#[case(3, 9)]
#[tokio::test]
async fn squares(#[case] n: u32, #[case] expected: u32) {
    assert_eq!(expected, square_async(n).await);
}
```

## serial_test and nextest Isolation

`cargo nextest run` executes every test in its own process, so independent tests are already isolated from one another's
process-global state. That covers the common case — but it does not protect tests that share state _outside_ the
process: a fixed network port, a shared file path, an environment variable, a real database row, or mockall's global
static-method `Context` expectations. Two such tests running in parallel (in separate processes or threads) still race.

Mark those tests `#[serial]` from the `serial_test` crate. Tests sharing a `#[serial]` key never run concurrently with
each other; the runner serializes them:

```rust
use serial_test::serial;

#[test]
#[serial]
fn binds_the_shared_port() {
    // owns localhost:8080 for the duration; no parallel test may also bind it
}

#[test]
#[serial]
fn also_uses_the_shared_port() {
    // serialized against the test above
}
```

Interaction notes:

- `#[serial]` serializes _within_ a single test binary's run. nextest's process-per-test model parallelizes across
  tests, so without `#[serial]` two tests touching the same external resource race even though each is in its own
  process. The attribute, not the runner, provides the mutual exclusion.
- Prefer eliminating shared state over serializing: use a `tempfile` scratch directory per test, bind port `0` to get an
  OS-assigned free port, or inject a fake clock instead of reading the system clock. Reach for `#[serial]` only when the
  shared resource is genuinely global and cannot be parameterized away.
- Keep `#[serial]` sets small. A large serial group throttles the whole suite back to sequential execution and erases
  nextest's parallelism gains.

## assert_cmd: Black-Box CLI Testing

For a binary crate, test the compiled binary as an external user would: spawn it, feed args/stdin/env, and assert on
exit code, stdout, and stderr. Put these in `tests/` so they exercise the real executable. `Command::cargo_bin(name)`
locates the binary that Cargo just built (`name` is the `[[bin]]` name).

```rust
use assert_cmd::Command;
use predicates::prelude::*;

#[test]
fn prints_greeting_and_exits_zero() {
    let mut cmd = Command::cargo_bin("mytool").unwrap();
    cmd.arg("greet").arg("--name").arg("ada");
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Hello, ada"));
}

#[test]
fn rejects_missing_argument() {
    let mut cmd = Command::cargo_bin("mytool").unwrap();
    cmd.arg("greet"); // no --name
    cmd.assert()
        .failure()
        .code(2)
        .stderr(predicate::str::contains("required"));
}
```

Configuring the command before `.assert()`:

- **`.arg(...)` / `.args([...])`** — pass arguments.
- **`.env(k, v)` / `.envs(...)` / `.env_remove(k)` / `.env_clear()`** — control the child environment.
- **`.current_dir(path)`** — run from a specific working directory (pair with a `tempfile` scratch dir for filesystem
  tests).
- **`.write_stdin(bytes)` / `.pipe_stdin(path)`** — feed stdin.
- **`.timeout(duration)`** — kill a hung child.

Validating the result:

- **`.assert()`** runs the command eagerly and returns an `Assert`. Chain `.success()`, `.failure()`, `.interrupted()`,
  `.code(n)`, `.stdout(pred)`, `.stderr(pred)`.
- `.success()` is **not** implicit — assert it explicitly when you expect a clean exit.
- stdout/stderr are **not** trimmed before reaching the predicate. Match with `predicate::str::contains` or wrap a
  predicate with `.trim()` rather than asserting exact equality on whitespace-sensitive output.
- For everything else, `.get_output()` returns the raw `Output`.

`assert_cmd` pairs with `assert_fs`/`tempfile` for filesystem fixtures and `predicates` for the assertions below.

## predicates: Assertion Catalog

`assert_cmd` accepts any `predicates::Predicate`. Bring them in with `use predicates::prelude::*;` and reach for
`predicate::...`. Catalog of the ones used in CLI tests:

String predicates (for stdout/stderr):

- **`predicate::str::contains(needle)`** — substring; `.count(n)` requires exactly `n` occurrences.
- **`predicate::str::starts_with(s)` / `ends_with(s)`** — prefix/suffix.
- **`predicate::str::is_empty()`** — empty output.
- **`predicate::str::diff(expected)`** — like equality but reports a diff on failure.
- **`predicate::str::is_match(regex)`** — regex match; `.count(n)` for occurrence count.
- **`.trim()` / `.normalize()`** — adapters that trim whitespace / normalize line endings before the inner predicate
  runs (use these instead of exact-equality matching on output that may have a trailing newline).

Value predicates (for `.code(...)` style checks and general use):

- **`predicate::eq(v)` / `ne(v)`** — equality / inequality.
- **`predicate::lt / le / gt / ge`** — ordering for `PartialOrd` types.
- **`predicate::float::is_close(v)`** — use instead of `eq` for floats.
- **`predicate::in_iter([...])` / `in_hash([...])`** — membership in a set.
- **`predicate::function(|&x| ...)`** — wrap any `Fn(&T) -> bool` as a predicate.

Filesystem predicates (with `assert_fs`/`current_dir`):

- **`predicate::path::exists()` / `missing()`**, **`is_file()` / `is_dir()` / `is_symlink()`**.
- **`predicate::path::eq_file(path)`** — contents equal another file's.

Combinators (any predicate composes):

- **`a.and(b)`** — both must hold.
- **`a.or(b)`** — at least one holds.
- **`a.not()`** — must not hold.
- **`pred.name("...")`** — attach a readable name for clearer failure output.

```rust
// Compose: stdout must mention the version and not contain a stack trace.
cmd.assert().success().stdout(
    predicate::str::contains("v1.2.3").and(predicate::str::contains("panicked").not()),
);
```
