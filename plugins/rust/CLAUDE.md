# rust Plugin

Rust language discipline: ownership and borrowing, error handling, concurrency (threads/rayon and async), the
cargo/clippy/rustfmt toolchain, rustdoc, and LSP-powered code intelligence via `rust-analyzer`.

## Skills

- **`rust`** — core Rust conventions: ownership/borrowing, error handling (Result/`?`, thiserror vs anyhow), traits and
  generics, iterators, idioms, AI anti-patterns, concurrency (threads/rayon and async/Tokio), project structure, the
  cargo/clippy/rustfmt toolchain, rustdoc, Rust 2024 edition, and LSP-first navigation
- **`rust-testing`** — Rust testing conventions: built-in `#[test]`/integration/doctest layout plus cargo-nextest,
  proptest, insta, criterion, mockall, and rstest

## LSP Integration

Ships a `rust-analyzer` LSP server config (`.lsp.json`); Claude Code connects it to `.rs` files on install. The `rust`
skill enforces LSP-first navigation — use `goToDefinition` / `findReferences` / `hover` / `goToImplementation` / call
hierarchy for semantic navigation; Grep/Glob only for non-semantic text (comments, string literals, config).

**Prerequisite:** `rust-analyzer` in PATH (`rustup component add rust-analyzer`); it needs a buildable workspace and a
proc-macro server for full fidelity.

## Skill Dependencies

- `rust` — core language discipline. Concurrency lives here (CPU-bound parallelism _and_ async), so the async footguns
  load before any async code is written rather than depending on a separate skill activating.
- `rust-testing` — the test ecosystem; defers to `rust` for language conventions and cross-references its async content.
- Both assume the `the-coder` plugin for language-agnostic workflow (discovery, planning, verification).

## Plugin Scope

Rust language specifics, Rust-specific tooling (cargo, clippy, rustfmt, rust-analyzer), and the test ecosystem.
Language-agnostic practices come from `the-coder`; platform concerns from `cli`/`backend`. Library-specific skills
(axum, serde, sqlx) are deferred to post-v1.

## Conventions

- Lean on the type system and borrow checker — restructure ownership rather than cloning to silence the compiler
- CPU-bound / multicore work uses threads/rayon, not async — async is for I/O-bound concurrency only
- Errors propagate with `?`; libraries use typed `thiserror` enums, applications use `anyhow`; `.unwrap()`/`.expect()`
  only on provable invariants or in tests
- Module layout is `mod.rs`-free (`foo.rs` + `foo/bar.rs`); never introduce new `mod.rs` files
- Lint levels go in the `[lints]`/`[workspace.lints]` Cargo.toml table, not scattered `#![deny(...)]` or RUSTFLAGS
- Verification gates: `cargo fmt --check`; `cargo clippy -- -D warnings`; `cargo nextest run` **plus**
  `cargo test --doc` (nextest skips doctests)
- LSP tools for code navigation; Grep/Glob only for non-semantic text
- Target Rust 2024 edition / current stable — verify the actual `rustc --version` and Cargo.toml edition, do not assume
