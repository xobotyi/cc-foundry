# rust

Rust language discipline plugin for Claude Code with built-in `rust-analyzer` LSP support.

## The Problem

Rust's ownership model, borrow checker, and trait system make it unforgiving — code that compiles is not necessarily
idiomatic, and idiomatic shapes are also the faster ones. AI coding agents reliably reproduce a known cluster of
anti-patterns: cloning to silence the borrow checker, scattering `.unwrap()` through library code, reaching for
`Rc<RefCell<T>>` and lifetime annotations instead of restructuring ownership, and modeling domains with raw strings. Two
further traps are specific to newcomers: conflating CPU-bound parallelism (threads/rayon) with I/O-bound async (Tokio),
and the compiler-invisible async footguns (holding a lock across `.await`, `select!` cancellation safety).

Beyond conventions, Claude Code's default code navigation — Grep and Glob — misses Rust's semantic structure. Text
search can't resolve `use` paths, distinguish shadowed bindings, find trait implementations, expand macros, or trace
call hierarchies.

## The Solution

This plugin provides language-discipline skills and a `rust-analyzer` LSP server. The `rust` skill covers core
conventions (ownership/borrowing, error handling, traits, iterators, idioms, anti-patterns, project structure, the
cargo/clippy/rustfmt toolchain, rustdoc, and Rust 2024 edition specifics) and folds in concurrency — both CPU-bound
parallelism (threads/rayon) and I/O-bound async (Tokio) — so the high-stakes footguns load before any async code is
written. The `rust-testing` skill covers the testing ecosystem. Both enforce LSP-first navigation.

## Prerequisites

Install `rust-analyzer` and ensure it is available in PATH:

```bash
rustup component add rust-analyzer
```

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install rust
```

## Skills

### rust

Core Rust language conventions and idioms across all Rust code. Covers ownership/borrowing/lifetimes, error handling
(`Result`/`?`, `thiserror` for libraries vs `anyhow` for applications, panic/unwrap policy), traits and generics
(`impl Trait` vs `dyn`), iterators over manual loops, pattern matching (`match`/`if let`/`let else`), idioms (newtype,
builder, `From`/`Into`/`TryFrom`, C-CONV cost semantics), the Rust API Guidelines checklist, AI-specific anti-patterns
mapped to Clippy lints, concurrency (threads/rayon for CPU-bound parallelism; `Future`/Tokio for I/O-bound async, with
the cancellation and lock-across-`.await` footguns), project structure (`mod.rs`-free layout, cargo workspaces, the
`[lints]` table), the cargo/clippy/rustfmt/nextest toolchain gates, rustdoc conventions, and Rust 2024 edition
specifics. Enforces LSP-first navigation.

**Use when:** writing, reviewing, refactoring, debugging, or exploring any Rust code.

### rust-testing

Rust testing conventions and frameworks. Covers built-in test layout (`#[cfg(test)] mod tests` for unit tests, `tests/`
for integration tests, doctests), the cargo-nextest runner (and pairing it with `cargo test --doc` since nextest skips
doctests), property testing (proptest, quickcheck), snapshot testing (insta), benchmarking (criterion), mocking
(mockall, used judiciously), parameterized/fixture tests (rstest), and async test patterns (`#[tokio::test]`).

**Use when:** writing, running, configuring, or debugging Rust tests.

## LSP Integration

This plugin bundles a `rust-analyzer` LSP server configuration. Once installed, Claude Code automatically starts
`rust-analyzer` for `.rs` files, enabling precise code intelligence:

| LSP Operation        | What It Does                            |
| -------------------- | --------------------------------------- |
| `goToDefinition`     | Jump to where a symbol is defined       |
| `findReferences`     | Find all usages of a symbol             |
| `hover`              | Get inferred type signature and docs    |
| `documentSymbol`     | List all symbols in a file              |
| `workspaceSymbol`    | Search for symbols across the workspace |
| `goToImplementation` | Find types implementing a trait         |
| `incomingCalls`      | Find what calls a function              |
| `outgoingCalls`      | Find what a function calls              |

## Related Plugins

- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)
- **cli** — CLI platform concerns (argument parsing, output formatting, configuration)
- **backend** — Backend platform concerns (observability, API design, service architecture)

## License

MIT
