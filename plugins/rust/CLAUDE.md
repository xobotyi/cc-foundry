# rust Plugin

Rust language discipline: ownership and borrowing, error handling, concurrency (threads/rayon and async), the
cargo/clippy/rustfmt toolchain, rustdoc, and LSP-powered code intelligence via `rust-analyzer`.

## Skills

- **`rust`** — the language: ownership, errors, traits, iterators, concurrency, project structure, toolchain, rustdoc,
  edition 2024, LSP-first navigation
- **`rust-testing`** — the test ecosystem: unit/integration/doctest layout, cargo-nextest, proptest, insta, criterion,
  mockall, rstest

## LSP Integration

Ships a `rust-analyzer` LSP server config (`.lsp.json`); Claude Code connects it to `.rs` files on install. The `rust`
skill's LSP-first navigation rules assume that config ships — the two change together.

## Skill Dependencies

- Concurrency lives in `rust` — CPU-bound parallelism _and_ async — so the async footguns load with the language skill
  rather than behind a separate activation
- `rust-testing` owns how code is exercised and defers to `rust` for how it is written; async-test mechanics
  cross-reference the `rust` skill's async reference instead of restating it

## Plugin Scope

- Rust language specifics, Rust-specific tooling (cargo, clippy, rustfmt, rust-analyzer), and the test ecosystem
- Language-agnostic workflow comes from `the-coder`; platform concerns from `cli`/`backend`
- Library-specific skills (axum, serde, sqlx) are out of scope
