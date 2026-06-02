# Pinned Crate Versions (as of 2026-06)

Date-stamped snapshot of the Rust testing ecosystem on Rust 2024 edition / current stable (~1.96). Suggest
dev-dependency versions when scaffolding tests, then reconcile against the project's lockfile.

## Contents

- [Verify Before Trusting](#verify-before-trusting)
- [Versions](#versions)
- [Cargo.toml dev-dependencies](#cargotoml-dev-dependencies)
- [Tools vs Dev-Dependencies](#tools-vs-dev-dependencies)
- [Version-Pinning Notes](#version-pinning-notes)
- [Doc Confirmation Status](#doc-confirmation-status)

## Verify Before Trusting

This block drifts. Treat it as a starting suggestion, never as ground truth:

- Read the project's `Cargo.lock` for the resolved version in use; match it before editing `Cargo.toml`.
- For a fresh add, run `cargo search <crate>` or `cargo add <crate> --dev` so Cargo resolves the latest compatible
  release against the project's edition and MSRV instead of a stale literal from this file.
- If a suggested version conflicts with the project's MSRV or an existing transitive pin, defer to the project and flag
  the divergence once.

## Versions

Runner and harness:

- **cargo-nextest** `0.9.137` — test runner binary (`cargo nextest run`)
- **criterion** `0.8.2` — statistical benchmark harness (`benches/`, `harness = false`)

Property and snapshot:

- **proptest** `1.11` — strategy-based property testing with shrinking
- **quickcheck** `1.1` — `Arbitrary`-derived property testing
- **insta** `1.47.2` — snapshot-testing library (the `Cargo.toml` dev-dependency)
- **cargo-insta** `1.47.2` — snapshot review CLI (`cargo insta review`); track in lockstep with `insta`

Mocking and fixtures:

- **mockall** `0.14.0` — `#[automock]` / `mock!` mock generation
- **rstest** `0.26.1` — `#[case]` parametrization and `#[fixture]` injection
- **test-case** `3.3.1` — lightweight `#[test_case(...)]` parametrization
- **serial_test** `3.5.0` — `#[serial]` to serialize tests touching shared global state

Assertions and CLI:

- **pretty_assertions** `1.4.1` — colored line-by-line diffs for `assert_eq!`/`assert_ne!`
- **assert_cmd** `2.2.2` — drive and assert on compiled binaries in integration tests
- **predicates** `3.1.4` — composable matchers used by `assert_cmd` (and `mockall`)

Async:

- **tokio** `1.52.3` — async runtime; enable the `test-util` feature for `time::pause`/`advance`
- **tokio-test** `0.4.5` — `assert_ready!`, `assert_pending!`, `task::spawn` test helpers

## Cargo.toml dev-dependencies

A representative `[dev-dependencies]` block; include only the crates the project uses, and re-resolve versions against
the lockfile rather than copying these literals verbatim:

```toml
[dev-dependencies]
proptest = "1.11"
insta = "1.47.2"
mockall = "0.14.0"
rstest = "0.26.1"
pretty_assertions = "1.4.1"
assert_cmd = "2.2.2"
predicates = "3.1.4"
serial_test = "3.5.0"
tokio = { version = "1.52.3", features = ["macros", "rt", "test-util"] }
tokio-test = "0.4.5"
criterion = "0.8.2"
```

A `criterion` benchmark also needs a `[[bench]]` target with `harness = false`:

```toml
[[bench]]
name = "my_bench"
harness = false
```

## Tools vs Dev-Dependencies

Two crates here are cargo-subcommand binaries, not `Cargo.toml` entries; installing them and adding a dependency are
distinct actions:

- **cargo-nextest** — install with `cargo install cargo-nextest --locked` (or `cargo binstall`). A binary, not a
  dev-dependency; nothing goes in `Cargo.toml` for it.
- **cargo-insta** — install the CLI with `cargo install cargo-insta`; add the **insta** library (same version) to
  `[dev-dependencies]`. CLI and library are versioned together — keep them on the same number.

Everything else in [Versions](#versions) is a `[dev-dependencies]` entry.

## Version-Pinning Notes

- Cargo's default `"x.y.z"` requirement is caret semantics. For `1.x`+ crates (`proptest`, `quickcheck`, `insta`,
  `tokio`, `assert_cmd`, `predicates`, `pretty_assertions`, `serial_test`, `test-case`) that allows compatible minor and
  patch upgrades.
- Pre-1.0 crates (`mockall` `0.14`, `criterion` `0.8`, `rstest` `0.26`, `cargo-nextest` `0.9`, `tokio-test` `0.4`) treat
  the first nonzero segment as the breaking axis — a `0.14 -> 0.15` bump is a breaking change. Pin these to the full
  `major.minor` (e.g. `mockall = "0.14"`) so a `cargo update` cannot silently jump APIs.
- `cargo-nextest` enforces its own minimum-version check via `.config/nextest.toml`; a project may require a newer
  nextest than is installed. Honor that floor rather than this snapshot.
- `mockall` async-trait mocking requires Rust 1.75+ for native `async fn` in traits, and is also compatible with the
  `async_trait` and `trait_variant` crates; the `#[automock]` attribute must appear before those macros.

## Doc Confirmation Status

The fetched upstream docs (proptest intro, mockall `docs.rs/latest`, nextest `running` page) do not print explicit
version strings, so no version number here is confirmed from a fetched doc — the numbers are the pinned 2026-06 snapshot
and must be re-verified against `Cargo.lock` and `cargo search`. What the docs do confirm:

- **proptest** is in passive, feature-complete maintenance — low churn, so a `1.x` pin ages well.
- **mockall** supports `#[automock]`, `mock!`, `Sequence`, the `nightly` feature, and async traits as described above.
- **cargo-nextest** `run` accepts `-p`/`--workspace`, `--lib`/`--test`, `-E`/`--filterset`, `--no-capture`, `--retries`,
  `--fail-fast`, and `-P`/`--profile` — the selectors the SKILL relies on.
