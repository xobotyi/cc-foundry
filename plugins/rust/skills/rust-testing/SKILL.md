---
name: rust-testing
description: >-
  Rust testing conventions and frameworks: built-in #[test], integration, and doctest layout plus the
  cargo-nextest runner and the proptest, insta, criterion, mockall, and rstest ecosystem. Invoke whenever
  task involves any interaction with Rust tests — writing, running, configuring, or debugging tests in
  .rs files and Cargo projects.
---

# Rust Testing

Prefer real implementations and hand-written fakes over heavy mocking — a test wired to a mock asserts how the code
calls its collaborators, not what the code does. Tests are documentation that runs: a reader should learn the intended
behavior from the test name, the arrange/act/assert shape, and the doctest examples on public items. Test the public
contract, not the private call graph.

## Route to Reference

- **Test layout depth** — `${CLAUDE_SKILL_DIR}/references/layout.md` Unit vs integration vs doctest mechanics, `tests/`
  crate-per-file model, `tests/common/mod.rs` shared-helper pattern, binary-crate `lib.rs` split, doctest attributes
  (`no_run`, `should_panic`, `ignore`, hidden `#` lines), `assert_matches!` and `pretty_assertions` usage
- **Property and snapshot testing, benchmarks** — `${CLAUDE_SKILL_DIR}/references/property-and-snapshot.md` proptest vs
  quickcheck strategy authoring and shrinking, insta inline/file snapshots and `cargo insta review`, criterion harness
  setup and `std::hint::black_box`
- **Mocking and fixtures** — `${CLAUDE_SKILL_DIR}/references/mocking-and-fixtures.md` mockall `#[automock]` vs `mock!`,
  predicates and call counts, the trait-seam pattern for in-memory fakes, rstest `#[case]`/`#[fixture]` params,
  serial_test, assert_cmd + predicates for CLI integration
- **Async tests** — `${CLAUDE_SKILL_DIR}/references/async-tests.md` `#[tokio::test]` flavors, `tokio::time::pause`/
  `advance` for deterministic timers, tokio-test macros; cross-references the `rust` skill async reference for runtime
  semantics
- **Pinned crate versions** — `${CLAUDE_SKILL_DIR}/references/versions.md` date-stamped dev-dependency versions for the
  testing ecosystem crates ("as of 2026-06")

Read the relevant reference before writing non-trivial tests in that area.

## Test Layout

- Place unit tests in a `#[cfg(test)] mod tests` block in the same file as the code under test; bring the parent into
  scope with `use super::*`. `#[cfg(test)]` keeps test code (and its helpers) out of the build artifact.
- Use unit tests to exercise private items — Rust's privacy rules let a child `tests` module reach its ancestors, so
  testing internals is possible. Reserve this for genuinely tricky private logic; prefer driving private code through
  the public API.
- Place integration tests in the top-level `tests/` directory, next to `src/`. Cargo compiles each file as its own
  crate, so they reach only the public API via `use my_crate::...` — exactly as an external consumer would.
- Share integration-test helpers from `tests/common/mod.rs`, not `tests/common.rs`. The `mod.rs` form is not compiled as
  a separate test crate, so it produces no spurious empty "running 0 tests" section. Import it with `mod common;`.
- For a binary crate, keep `main.rs` a thin shell that calls into `lib.rs`; integration tests then exercise the library
  crate, since only library crates expose items to external `use`.
- Write doctests as `///` examples on public items. They double as compiled documentation and run under
  `cargo test --doc`. Hide setup lines with a leading `#` and use ` ```no_run ` for examples that must compile but not
  run.

## Assertions

- Use `assert!` for booleans and `assert_eq!`/`assert_ne!` for value equality; add a trailing message argument when the
  failure is not self-explanatory.
- Use `assert_matches!` to assert a value matches a pattern (including enum variants with bindings) — it is stable in
  `std` as of Rust 1.96 and requires `use std::assert_matches::assert_matches;`.
- Add `pretty_assertions` as a dev-dependency and `use pretty_assertions::{assert_eq, assert_ne};` in test modules when
  comparing large structs or collections — it renders colored line-by-line diffs instead of one unreadable line.

## Runner

- Run unit and integration tests with `cargo nextest run` — it builds each test binary, queries it for tests, and runs
  every test in its own process in parallel, giving clean per-test isolation and output.
- Always pair it with `cargo test --doc`. Nextest does not run doctests, so a project that only runs nextest silently
  skips every doctest. Both commands belong in the verification gate.
- Scope runs with the same selectors as cargo: `-p <pkg>`/`--workspace`, `--lib`/`--test <name>`, `-E <filterset>` for
  expression filtering, and `--no-capture` to see test stdout/stderr.
- Drive flaky-test triage with `--retries <N>` and stop early with `--fail-fast`; prefer fixing nondeterminism over
  leaving retries on permanently.

## Mocking Decision Rule

Default to the cheapest test double that still proves the behavior, escalating only when the boundary forces it:

- **Real implementation** — call the actual code. The default for pure logic and anything with no external dependency.
- **In-memory fake** — a real working implementation backed by memory (e.g. a `HashMap`-backed store behind a repository
  trait). Preferred for stateful collaborators; the fake is reusable across many tests.
- **Hand-written double** — a small struct implementing the collaborator's trait with canned answers. Use when a fake is
  overkill and you need one or two stubbed responses.
- **mockall** — generate a mock with `#[automock]` (or `mock!` for foreign/multi-trait types) only at IO or
  nondeterministic boundaries: network, filesystem, clock, randomness, external services behind a trait seam.

Define collaborators behind a trait so the production type and the test double are interchangeable. Assert on observable
outcomes — return values, resulting state, emitted effects — not on which methods were called in which order. Do not use
mockall `Sequence`/`in_sequence` to lock internal call order; ordering assertions make tests break on harmless
refactors. Argument matchers and call counts are acceptable when the call itself is the contract (e.g. "charge the card
exactly once").

## Property, Snapshot, and Benchmarks

- Reach for property testing when a function must hold an invariant across a large input space (round-trips,
  idempotence, ordering). Use `proptest` (generates and shrinks values from declarative strategies) or `quickcheck`
  (derives generators from `Arbitrary`); proptest is the richer default for custom input domains.
- Use `insta` for snapshot testing of large or structural output (serialized data, rendered text, debug dumps). Review
  and accept changes with `cargo insta review`; commit the approved `.snap` files. Snapshots make intent diffable rather
  than hand-asserting every field.
- Put benchmarks in `benches/` with `criterion`, set `harness = false` on the `[[bench]]` target in Cargo.toml, and wrap
  benchmarked inputs/outputs in `std::hint::black_box` so the optimizer cannot fold the work away. Benchmarks measure;
  they are not correctness tests.

## Async Tests

- Annotate async tests with `#[tokio::test]`. Default to the current-thread flavor; use
  `#[tokio::test(flavor = "multi_thread", worker_threads = N)]` only when the test genuinely needs real parallelism.
- Make time deterministic with `tokio::time::pause()` and `tokio::time::advance(duration)` instead of real `sleep`.
  Advancing virtual time fires timers instantly and removes wall-clock flakiness from timeout and interval tests.
- Mock async-trait collaborators with mockall (compatible with `async_trait`/`trait_variant`), returning futures via
  `.returning(|| Box::pin(async { ... }))`. The mocking decision rule applies unchanged — mock only at IO boundaries.

## Application

When **writing** tests:

- Apply these conventions silently; do not narrate each rule. Name tests for the behavior under test, not the method.
- Match the surrounding project: if it already standardizes on `cargo test`, rstest fixtures, or a specific assertion
  crate, follow that and flag any divergence once rather than rewriting wholesale.
- Add the verification gate commands you rely on (`cargo nextest run`, `cargo test --doc`) when introducing tests to a
  project that lacks them.

When **reviewing** tests:

- Flag mocks at non-IO boundaries, assertions on internal call order, and doctests that would be skipped by a
  nextest-only gate. Cite the specific test and show the corrected form inline.
- Flag nondeterminism (real sleeps, wall-clock reads, unseeded randomness, shared global state without `serial_test`) as
  a flaky-test risk and propose the deterministic alternative.

## Integration

The `rust` skill governs language conventions (ownership, error handling, module layout, the cargo/clippy/rustfmt
gates); this skill governs test structure and the testing ecosystem. When both apply, defer to `rust` for how the code
under test is written and to this skill for how it is exercised. For async runtime semantics behind `#[tokio::test]`
(executor model, `Send` bounds, cancellation), consult the `rust` skill's async reference rather than restating it here.

## Quality Checks

- Unit tests live in `#[cfg(test)] mod tests`; integration tests in `tests/` touch only the public API; shared helpers
  in `tests/common/mod.rs`.
- Every behavior has a clear arrange/act/assert shape and a name that reads as documentation.
- The verification gate runs both `cargo nextest run` and `cargo test --doc` — doctests are never silently skipped.
- Mocking escalates real -> in-memory fake -> hand-written double -> mockall, and stops at the lowest rung that proves
  the behavior; no assertions on internal call order.
- Async and time-dependent tests are deterministic (paused virtual time, seeded randomness, no real sleeps).
