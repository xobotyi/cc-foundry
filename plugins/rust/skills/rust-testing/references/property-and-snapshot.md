# Property, Snapshot, and Benchmark Testing

Depth behind the `rust-testing` SKILL.md "Property, Snapshot, and Benchmarks" rules. The SKILL.md states when to reach
for each tool; this reference holds the strategy/generator mechanics, the snapshot review workflow, the benchmark
harness wiring, extended bad/good examples, and edge cases. Read it before authoring non-trivial property tests,
snapshot suites, or benchmarks.

The three techniques answer different questions. Property testing asks "does this invariant hold across the whole input
space?" Snapshot testing asks "did this large output change, and was the change intended?" Benchmarking asks "how fast
is this, and did it regress?" None replaces example-based unit tests; they complement them.

## Contents

- [proptest vs quickcheck — when to use which](#proptest-vs-quickcheck--when-to-use-which)
- [Property testing with proptest](#property-testing-with-proptest)
- [Property testing with quickcheck](#property-testing-with-quickcheck)
- [Writing good properties](#writing-good-properties)
- [Snapshot testing with insta](#snapshot-testing-with-insta)
- [The cargo insta review workflow](#the-cargo-insta-review-workflow)
- [Benchmarking with criterion](#benchmarking-with-criterion)
- [black_box and why benchmarks lie without it](#black_box-and-why-benchmarks-lie-without-it)

## proptest vs quickcheck — when to use which

Both belong to the QuickCheck family: generate random inputs, run the property, and on failure **shrink** the
counterexample to a minimal reproduction. The architectural difference drives the choice.

| Dimension              | proptest                                        | quickcheck                                  |
| ---------------------- | ----------------------------------------------- | ------------------------------------------- |
| Generation model       | Per-value `Strategy` objects, composed          | Per-type `Arbitrary` trait, one impl/type   |
| Shrinking              | Tracked per-value with generation; flexible     | Per-type binary search over numbers, lists  |
| Custom input domains   | First-class (`prop::collection`, `prop_oneof!`) | Hand-write `Arbitrary`, harder to constrain |
| Compile cost / weight  | Heavier (macro + strategy machinery)            | Lighter, fewer dependencies                 |
| Constraining one value | Trivial (e.g. `0..100i32`, regex strings)       | Awkward — filter or use a newtype wrapper   |

- **Reach for proptest** when inputs need a tailored domain: bounded ranges, weighted variants, structured values with
  interdependent fields, or strings matching a pattern. Per-value strategies make "generate a `Vec` of 1..=10 sorted
  `u8`s" a one-liner, and proptest's shrinking improves on quickcheck's (the quickcheck README points users at proptest
  for better shrinking). The richer default for custom input domains.
- **Reach for quickcheck** when the standard `Arbitrary` impls already cover your types (integers, floats, tuples,
  bools, `Vec`, `String`, `Option`, `Result`) and you want minimal compile-time and dependency weight. The property is
  just a function whose parameters are `Arbitrary`.
- **Pick one per crate.** Do not mix both frameworks in one crate; the duplicated dependency weight and two generation
  models earn nothing.

## Property testing with proptest

proptest drives a property body through the `proptest!` macro. Each parameter is bound to a `Strategy` after the `in`
keyword; the body asserts with `prop_assert!`/`prop_assert_eq!` (which integrate with shrinking) rather than bare
`assert!`.

```rust
use proptest::prelude::*;

fn encode(input: &[u8]) -> String { /* ... */ }
fn decode(text: &str) -> Vec<u8> { /* ... */ }

proptest! {
    // Round-trip invariant: decode(encode(x)) == x for any byte vector.
    #[test]
    fn encode_decode_round_trips(input in prop::collection::vec(any::<u8>(), 0..256)) {
        let restored = decode(&encode(&input));
        prop_assert_eq!(restored, input);
    }

    // Bounded numeric domain, expressed directly in the strategy.
    #[test]
    fn clamp_stays_in_range(x in -1000i32..1000, lo in -100i32..0, hi in 0i32..100) {
        let c = x.clamp(lo, hi);
        prop_assert!(c >= lo && c <= hi);
    }
}
```

Strategy building blocks: `any::<T>()` for the default domain, numeric ranges (`0..100u32`) as their own strategies,
`prop::collection::vec(elem, size_range)` for collections, `prop_oneof![a, b, c]` for tagged alternatives, and
`.prop_map(...)` / `.prop_filter(...)` to transform or constrain a strategy. Compose them to describe exactly the inputs
your property is defined over, instead of generating everything and discarding most of it.

**Determinism and the failure cache.** proptest seeds its RNG deterministically and, on failure, persists the seed of
the minimal counterexample to a `proptest-regressions/` file. Commit that file: it pins the regression so the same
counterexample is retried first on every future run. Treat it like a `.snap` — a checked-in test artifact.

## Property testing with quickcheck

quickcheck converts a property function into a test via the `#[quickcheck]` attribute (from `quickcheck_macros`) or the
`quickcheck!` macro. Parameters must implement `Arbitrary`; the return type implements `Testable` (`bool` is the common
case). On failure the inputs are shrunk to a smaller counterexample.

```rust
fn reverse<T: Clone>(xs: &[T]) -> Vec<T> {
    let mut rev = vec![];
    for x in xs.iter() {
        rev.insert(0, x.clone());
    }
    rev
}

#[cfg(test)]
mod tests {
    use super::*;
    use quickcheck_macros::quickcheck;

    #[quickcheck]
    fn double_reversal_is_identity(xs: Vec<isize>) -> bool {
        xs == reverse(&reverse(&xs))
    }
}
```

**Custom types** need a hand-written `Arbitrary` impl that builds the value from the generator:

```rust
use quickcheck::{Arbitrary, Gen};

#[derive(Clone, Debug)]
struct Point {
    x: i32,
    y: i32,
}

impl Arbitrary for Point {
    fn arbitrary(g: &mut Gen) -> Point {
        Point { x: i32::arbitrary(g), y: i32::arbitrary(g) }
    }
}
```

**Conditional properties — discard, do not pre-filter by hand.** When a property holds only on a subset of inputs,
return `TestResult` instead of `bool` and discard out-of-domain inputs. A discarded test neither passes nor fails;
quickcheck draws a fresh input to replace it.

```rust
use quickcheck::{quickcheck, TestResult};

fn prop_singletons_are_self_reverse(xs: Vec<isize>) -> TestResult {
    if xs.len() != 1 {
        return TestResult::discard();
    }
    TestResult::from_bool(xs == reverse(&xs))
}
```

Heavy reliance on `discard()` is a smell: if quickcheck cannot find 100 valid cases within 10,000 tries it gives up and
runs fewer tests. When most inputs get discarded, encode the constraint in the type (a newtype with a tailored
`Arbitrary`) or switch to a proptest strategy that generates only valid inputs.

**Tuning iteration count.** Crank `QUICKCHECK_TESTS` (or `QuickCheck::tests`) for a release-cycle hammer run with a
bounded duration, rather than looping `cargo test` indefinitely. `quickcheck` only catches panics and assertion failures
— a stack overflow in the code under test escapes without a recorded witness.

## Writing good properties

The hard part of property testing is naming an invariant that holds for all inputs yet is strong enough to catch bugs.
Useful categories:

- **Round-trip** — `decode(encode(x)) == x`, `parse(render(x)) == x`. Catches asymmetric encoder/decoder bugs.
- **Idempotence** — `f(f(x)) == f(x)` for normalizers, sorts, dedup.
- **Oracle / model** — compare the optimized implementation against a slow, obviously-correct reference. The quickcheck
  Sieve-of-Eratosthenes case study uses a naive `is_prime` oracle: `sieve(n)` must equal
  `(0..=n).filter(|&i| is_prime(i)).collect()`. A weak property ("every output is prime") missed that the sieve dropped
  `2`; the stronger oracle property caught it and shrank to `n = 2`.
- **Invariant preservation** — output is always sorted, always within bounds, length is conserved.

A property that merely restates the implementation tests nothing. Prefer an independent oracle over re-deriving the same
computation in the test.

## Snapshot testing with insta

insta asserts that a value's serialized form matches a stored reference snapshot. Use it for large or structural output
where hand-asserting every field is noise: serialized data, rendered templates, `Debug` dumps, parser ASTs, CLI output.
The snapshot makes intent diffable — a behavior change shows up as a reviewable diff, not a wall of `assert_eq!`.

Macro selection by what you are snapshotting:

- **`assert_snapshot!(value)`** — a value that is already a `String` or `Display`s to text. The default for rendered
  strings and pre-formatted output.
- **`assert_debug_snapshot!(value)`** — any `Debug` type; insta pretty-prints it with `{:#?}`. The default for structs,
  enums, and collections without a custom serializer.
- **`assert_json_snapshot!(value)`** — a `Serialize` type rendered as JSON (requires the `json` feature). Use
  `assert_yaml_snapshot!`/`assert_ron_snapshot!` for the other serializer formats. Serializer snapshots support
  **redactions** — replace nondeterministic fields (timestamps, UUIDs, generated IDs) with a stable placeholder so the
  snapshot stays deterministic.

```rust
#[test]
fn renders_invoice_summary() {
    let invoice = Invoice::sample();
    // File snapshot: stored under tests/snapshots/<module>__renders_invoice_summary.snap
    insta::assert_debug_snapshot!(invoice);
}

#[test]
fn formats_error_message() {
    let msg = format_error(Error::NotFound { id: 7 });
    // Inline snapshot: the expected value is embedded; cargo insta fills the empty string.
    insta::assert_snapshot!(msg, @"");
}
```

**File vs inline snapshots.** With no `@"..."` argument, insta writes a separate `.snap` file under a `snapshots/`
directory beside the test. With an `@"..."` argument, the snapshot is stored inline in the source and `cargo insta`
rewrites the literal in place. Inline suits short, single-line outputs kept next to the assertion; file snapshots suit
large multi-line output that would bloat the source.

**Commit the snapshots.** Both `.snap` files and accepted inline literals are checked into version control — they are
the expected values. A snapshot diff in code review is the signal that behavior changed. Pending, not-yet-accepted
snapshots are written as `.snap.new` files; never commit `.snap.new`.

## The cargo insta review workflow

`cargo insta` is the companion CLI (`cargo install cargo-insta`) that drives the accept/reject loop. The cadence:

1. Run the tests. A changed or new snapshot fails the assertion and writes a `.snap.new` pending file.
2. Run `cargo insta review` to step through every pending snapshot interactively, viewing the diff and choosing accept
   (write it to the `.snap`), reject (discard the pending file), or skip.
3. Re-run the tests; accepted snapshots now match. Commit the updated `.snap` files together with the code change.

Non-interactive variants: `cargo insta accept` takes all pending snapshots at once (use only when you have already
reviewed the diffs), `cargo insta reject` discards them, and `cargo insta test` runs tests with snapshot updating
enabled in one step. Set `INSTA_FORCE_PASS` or use `--review` flags per the project's convention.

**CI must never accept silently.** Snapshots are assertions, not suggestions — an unreviewed change must fail the build.
Enforce this with the check mode:

- `INSTA_UPDATE=no` — never write or update snapshot files; a mismatch is a hard test failure. Set this in the CI
  environment so a developer who forgot to run `cargo insta review` gets a red build instead of a snapshot quietly
  rewritten.
- `cargo insta test --check` — runs the suite and fails on any snapshot that does not already match, without producing
  `.snap.new` files. The explicit CI gate.

Locally the default is the opposite: insta writes `.snap.new` so you can review. That is why the CI override is
mandatory, not optional.

## Benchmarking with criterion

criterion is a statistics-driven micro-benchmarking harness: it runs each benchmark many times, fits a model, stores
results between runs, and reports whether performance regressed or improved against the previous run. Because it
replaces the test harness, the `Cargo.toml` wiring is mandatory and the most common setup mistake.

```toml
[dev-dependencies]
criterion = { version = "0.8", features = ["html_reports"] }

[[bench]]
name = "throughput"          # matches benches/throughput.rs
harness = false              # REQUIRED: disable the default libtest harness
```

`harness = false` tells cargo not to inject the built-in test harness into the benchmark binary, leaving `main` to
criterion's `criterion_main!`. Omit it and the binary tries to run under libtest, which does not understand criterion
benchmarks. Place the file in `benches/` next to `src/`; run with `cargo bench`.

```rust
// benches/throughput.rs
use criterion::{criterion_group, criterion_main, Criterion};
use std::hint::black_box;

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn bench_fib(c: &mut Criterion) {
    c.bench_function("fib 20", |b| {
        // black_box the input so the optimizer cannot precompute the result.
        b.iter(|| fibonacci(black_box(20)));
    });
}

criterion_group!(benches, bench_fib);
criterion_main!(benches);
```

The closure passed to `bench_function` receives a `Bencher`; `b.iter(|| ...)` is the timed inner loop, run repeatedly so
criterion gathers a statistical distribution rather than a single noisy sample. Use `c.benchmark_group(...)` to compare
related benchmarks and `group.throughput(...)` to report bytes/elements per second.

**Benchmarks measure; they are not correctness tests.** They do not run under `cargo nextest run` or `cargo test`, are
not part of the verification gate, and a benchmark passing says nothing about correctness. Keep the assertion of "is it
right?" in tests and "is it fast?" in benches.

**Set `CRITERION_DEBUG=1`** when filing a criterion bug or debugging plot generation — it emits diagnostic output and
(with gnuplot) saves the generated plot scripts.

## black_box and why benchmarks lie without it

The optimizer is the enemy of an honest micro-benchmark. If the benchmarked input is a compile-time constant and the
output is unused, LLVM may constant-fold the whole computation away or hoist it out of the timed loop — the benchmark
then measures an empty loop and reports an absurdly fast, meaningless number.

`std::hint::black_box` is the standard-library fence: an opaque identity function the optimizer must treat as capable of
reading its argument and producing any value, so it cannot fold across it. Wrap **both** ends:

- **Inputs** — `fibonacci(black_box(20))` stops the compiler from precomputing the result for the known constant `20`.
- **Outputs** — `black_box(result)` in `b.iter` stops dead-code elimination from removing a computation whose result is
  discarded.

```rust
// Wrong: 20 is a constant and the result is unused — the optimizer may delete the work.
b.iter(|| fibonacci(20));

// Right: the input is hidden from constant folding and the result is observed.
b.iter(|| black_box(fibonacci(black_box(20))));
```

Prefer `std::hint::black_box` (stable in `std`) over the older `criterion::black_box` re-export. criterion's `b.iter`
already black-boxes the closure's return value, so the highest-value placement is around inputs that would otherwise
constant-fold; add it around outputs too when the body's result would be dropped.

## Why not the built-in `#[bench]`

Rust's built-in `#[bench]` attribute and `test::Bencher` live behind the unstable `test` feature and require a nightly
toolchain — frozen for years and unavailable on stable. Do not write `#[bench]` functions for a stable project; use
criterion in `benches/` instead. criterion runs on stable, gives statistical regression detection the built-in harness
never had, and is the de facto community standard.
