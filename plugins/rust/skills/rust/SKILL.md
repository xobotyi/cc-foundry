---
name: rust
description: >-
  Rust language conventions, idioms, error handling, concurrency (CPU-bound parallelism with
  threads/rayon and I/O-bound async with Tokio), the cargo/clippy/rustfmt toolchain, and rustdoc.
  Invoke whenever task involves any interaction with Rust code — writing, reviewing, refactoring,
  debugging, or understanding .rs files and Cargo projects.
---

# Rust

Lean on the type system and the borrow checker. They are the design surface, not an obstacle. When the compiler rejects
code, the ownership model is wrong — restructure who owns and who borrows rather than reaching for `.clone()`, `Rc`, or
`unsafe` to silence it. Make illegal states unrepresentable: encode invariants in types so the wrong code fails to
compile instead of failing at runtime. A fight with the borrow checker is a design review the compiler is giving you for
free.

## Route to Reference

Read the reference before doing focused work in its area; SKILL.md alone is sufficient for routine code.

- **Idioms and ownership patterns** — `${CLAUDE_SKILL_DIR}/references/idioms.md` borrowing/ownership restructuring,
  `impl Trait` vs generics vs `dyn`, iterator adapters, `match`/`if let`/`let else`, newtype and builder patterns,
  `From`/`Into`/`TryFrom`, the `as_`/`to_`/`into_` cost cheat-table
- **Error handling** — `${CLAUDE_SKILL_DIR}/references/errors.md` `Result`/`Option`/`?`, `thiserror` enum templates,
  `anyhow` `.context()`, the panic/`unwrap`/`expect` policy, error-type design (`Display`/`Error`/`Send`/`Sync`)
- **Anti-patterns** — `${CLAUDE_SKILL_DIR}/references/anti-patterns.md` AI-produced anti-patterns mapped to the Clippy
  lints that catch them, with the idiomatic fix for each
- **API design** — `${CLAUDE_SKILL_DIR}/references/api-guidelines.md` the Rust API Guidelines `C-*` checklist, RFC 430
  naming, `#[non_exhaustive]`, `#[must_use]`, common-trait derives, sealed traits, builders
- **Parallelism** — `${CLAUDE_SKILL_DIR}/references/parallelism.md` threads, scoped threads, rayon, `Send`/`Sync`,
  channels, shared state (`Arc`/`Mutex`) — the CPU-bound multicore path
- **Async** — `${CLAUDE_SKILL_DIR}/references/async.md` the `Future`/executor model, Tokio, the compiler-invisible
  footgun checklist (blocking in async, holding `!Send` across `.await`), "do you even need async?"
- **Project structure** — `${CLAUDE_SKILL_DIR}/references/structure.md` `mod.rs`-free layout, cargo workspaces, the
  `[lints]`/`[workspace.lints]` table, profiles, features, MSRV
- **Toolchain** — `${CLAUDE_SKILL_DIR}/references/toolchain.md` the fmt/clippy/nextest/deny verification gates,
  rust-analyzer configuration, recommended compiler and Clippy lint sets
- **Edition 2024** — `${CLAUDE_SKILL_DIR}/references/edition-2024.md` Rust 2024 edition specifics and migration via
  `cargo fix --edition`
- **Documentation** — `${CLAUDE_SKILL_DIR}/references/documentation.md` rustdoc conventions, doctests, `missing_docs`,
  intra-doc links, semver-checks

## Naming

- Casing follows RFC 430: `UpperCamelCase` for types/traits/enum variants, `snake_case` for functions/methods/modules,
  `SCREAMING_SNAKE_CASE` for consts/statics.
- Acronyms are one word in `UpperCamelCase` (`Uuid`, `Stdin`, not `UUID`, `StdIn`); lower-cased in `snake_case`.
- Getters omit the `get_` prefix: `fn first(&self) -> &First`, not `fn get_first`. Use `get` only when one obvious value
  is gotten (e.g. `Cell::get`).
- Ad-hoc conversion methods signal cost through their prefix: `as_` = free borrow-to-borrow view; `to_` = expensive
  (allocates or computes); `into_` = consuming, ownership transfer.
- Collection iterators are `iter` (`&T`), `iter_mut` (`&mut T`), `into_iter` (`T`); the iterator type name matches the
  method (`into_iter` -> `IntoIter`).
- Names use consistent verb-object word order (`ParseAddrError`, matching `ParseIntError`). Drop weasel words —
  `Manager`, `Service`, `Factory`, `Helper`, `Util` rarely belong in a type name; name the thing for what it is
  (`Bookings`, not `BookingService`), append a quality only when it does something specific (`BookingDispatcher`).
- A `Builder` is Rust's name for a factory. Accept `impl Fn() -> Foo` rather than a `FooBuilder` parameter.

## Ownership and Borrowing

- Accept the least-owning type that does the job: `&str` over `&String`, `&[T]` over `&Vec<T>`, `&T` over `T` when not
  consuming. Return owned values; borrow in parameters.
- Treat `.clone()` as a signal, not a fix. A clone to satisfy the borrow checker usually means lifetimes or ownership
  are structured wrong — split the borrow, narrow the scope, or restructure who owns the data.
- Reach for `Rc`/`Arc` only for genuine shared ownership (a graph, a cache, a value with no single owner), not to dodge
  a lifetime annotation.
- Prefer adjusting a function to take `&self`/`&T` over cloning at the call site. Borrow at the narrowest scope so a
  mutable borrow ends before the next access begins (non-lexical lifetimes allow this).
- Use lifetime elision wherever it applies; write explicit lifetimes only when the compiler asks or when they document a
  real relationship between inputs and outputs.

## Error Handling

- Functions that can fail return `Result<T, E>`; absence-not-error returns `Option<T>`. Propagate with `?`, do not
  match-and-rewrap.
- Libraries define typed errors with `thiserror` (one enum, `#[error("...")]` per variant, `#[from]` for source
  conversions). Applications use `anyhow::Result` and attach `.context(...)` at each layer.
- Error types implement `std::error::Error`, `Display`, `Debug`, and are `Send + Sync + 'static` so they cross threads
  and compose with `anyhow`/`Box<dyn Error>`.
- `.unwrap()` and `.expect()` are permitted only on a provable invariant (with `.expect("why this cannot fail")`
  documenting the proof), inside `const` contexts, or in tests. They are never error-propagation.
- A detected programming bug panics; it is not an `Error`. A panic means "stop the program" — never use panics to
  communicate recoverable errors upstream, and never assume a panic will be caught. Genuinely fallible operations
  (parsing, I/O, user input) return `Result`.
- Prefer making invalid states uncompilable over validating at runtime: a `NonEmptyVec` or a parsed `Email` newtype
  beats a runtime check on a raw `Vec`/`String`.

## Traits and Generics

- Static dispatch is the default: generics (`fn f<T: Trait>`) or `impl Trait` in argument and return position.
  Monomorphization keeps it allocation-free and inlinable.
- Use `dyn Trait` only for genuine runtime polymorphism — heterogeneous collections (`Vec<Box<dyn Draw>>`), plugin
  boundaries, or breaking deep monomorphization. Always write `dyn` explicitly (`Box<dyn Error>`, `&dyn Handler`);
  bare-trait-object syntax has been an error since edition 2021.
- `impl Trait` in argument position is shorthand for an anonymous generic; in return position it hides a concrete type.
  Switch to a named generic when the caller must name the type or supply it via turbofish.
- Derive the common traits eagerly where they fit: `Debug` on every public type, plus `Clone`, `Copy`, `PartialEq`,
  `Eq`, `Hash`, `PartialOrd`, `Ord`, `Default` as semantics allow. Implement `Display` for types meant to be read by
  humans (errors, string-like wrappers).
- Implement conversions via the standard traits — `From` (which gives `Into` free), `TryFrom`, `AsRef`, `AsMut` — not
  ad-hoc methods, so generic code and `?` interoperate.

## Iterators and Pattern Matching

- Express transformations as iterator adapter chains (`.iter().filter().map().collect()`), not manual index loops. They
  are bounds-check-friendly, lazy, and clearer.
- Reach for `for x in &collection` over `for i in 0..collection.len()`; index only when the index itself is the data.
- `match` arms must be exhaustive — let the compiler enforce that every variant is handled rather than ending with a
  catch-all `_` that silently swallows new variants.
- Use `if let` / `while let` for single-pattern matches, and `let ... else { return / continue / bail }` to bind-or-
  bail in one line instead of nesting the happy path inside a `match`.
- Destructure in the pattern (function params, `let`, match arms) rather than reaching into fields by `.0`/`.field`
  afterward.

## Concurrency: Choose the Right Model First

**Pick the concurrency model from the workload before writing any concurrent code — this decision is not
interchangeable:**

- **CPU-bound / multicore compute** (parsing, hashing, image processing, number crunching) -> OS threads or **rayon**
  (`par_iter`). **Never reach for async here** — async provides zero parallel speedup for CPU work; it only interleaves
  tasks at `.await` points on (often) a single logical flow.
- **Many concurrent I/O operations** (thousands of sockets, requests, file handles) -> **async / Tokio**. Async wins by
  not blocking a thread while waiting on I/O, letting one runtime juggle huge numbers of in-flight operations.
- **A handful of blocking I/O tasks** -> plain threads are simpler than dragging in an async runtime; use async only
  when the concurrency count makes a thread-per-task model wasteful.

Further rules once the model is chosen:

- Shared state crosses threads via `Arc<Mutex<T>>` / `Arc<RwLock<T>>`; immutable shared data via `Arc<T>`. Move work and
  ownership across threads with channels (`std::sync::mpsc`, `crossbeam`, or `tokio::sync` in async).
- Public types should be `Send` (and usually `Sync`) so they work under Tokio and behind runtime abstractions. A `!Send`
  value held across an `.await` makes the whole future `!Send` — keep `Rc`/`RefCell` out of async scopes that span an
  await.
- Never block in async: no `std::thread::sleep`, no synchronous file/network I/O, no long CPU loops on the runtime.
  Offload CPU work with `tokio::task::spawn_blocking` or a rayon pool, and use the runtime's async timers/IO.
- The borrow checker does not see deadlocks or blocking-in-async — those footguns are invisible at compile time. Read
  `references/async.md` before writing async code.

## Project Structure

- Use the `mod.rs`-free layout: a module `foo` lives in `foo.rs`, its submodules in `foo/bar.rs`. Never create new
  `mod.rs` files.
- Set all lint levels in the `[lints]` (or `[workspace.lints]`) table in `Cargo.toml`, not in scattered `#![deny(...)]`
  attributes or `RUSTFLAGS`. This keeps lint policy in one auditable place and inherited across the workspace.
- Override a project-global lint at a narrow scope with `#[expect(lint, reason = "...")]`, not `#[allow]` — `expect`
  warns when the lint stops firing, preventing stale overrides. (`#[allow]` is acceptable on generated code/macros.)
- Multi-crate projects use a cargo workspace with a shared `[workspace.lints]` and `[workspace.dependencies]`. Split a
  crate when a submodule is independently useful — many small crates compile faster and prevent dependency cycles.
- Keep `unsafe` confined to the smallest possible module; soundness boundaries are module boundaries. Every `unsafe`
  block carries a `// SAFETY:` comment justifying it. Never write sound-looking safe wrappers over unsound assumptions.

## Toolchain Gates

Code is not done until these pass (run via Bash, surfacing each command):

- `cargo fmt --check` — formatting is non-negotiable; never hand-format.
- `cargo clippy --all-targets --all-features -- -D warnings` — Clippy clean across the whole build graph, warnings as
  errors. Fix the cause; suppress a lint only with a scoped `#[expect(..., reason = "...")]`.
- `cargo nextest run` **and** `cargo test --doc` — nextest is the fast test runner but does **not** execute doctests, so
  the separate `--doc` run is mandatory to keep documentation examples honest.
- `cargo deny check` (or `cargo audit`) — gate dependencies for advisories, license, and source policy.

## Doc Comments

- `//!` documents the crate root and modules; `///` documents items (functions, types, fields, variants). Write docs as
  part of the change, not after.
- Use the standard rustdoc sections: `# Examples`, `# Panics` (when the fn can panic), `# Errors` (what a `Result`
  returns on failure), `# Safety` (the invariants a caller of an `unsafe` fn must uphold).
- Doctests use `?` for fallible calls (wrap the body so it returns `Result`), never `.unwrap()` — examples are also
  documentation of idiomatic usage.
- Libraries enable `#![warn(missing_docs)]` so every public item is documented. Link related items with intra-doc links
  (`[`Type`]`, `[`mod::func`]`).
- When you change an exported symbol's signature or behavior, update its doc comment in the same edit — a stale doc is
  worse than none.

## Code Navigation (LSP Required)

A `rust-analyzer` LSP is configured for `.rs` files. For semantic navigation, use LSP tools — they understand types,
traits, and macro expansion in ways text search cannot:

- **goToDefinition** — jump to where a symbol is defined (through re-exports and macros).
- **findReferences** — every real use of a symbol, not textual name collisions.
- **hover** — resolved type, signature, and docs at a position.
- **workspaceSymbol** — locate a type/fn/trait by name across the workspace.
- **goToImplementation** — concrete implementors of a trait, or the trait a method satisfies.
- **incomingCalls / outgoingCalls** — call hierarchy for impact analysis before a change.

Use Grep/Glob only for non-semantic text: comments, string literals, config files, log messages, `Cargo.toml` entries.
Reaching for Grep to find a definition or all callers is a mistake when the LSP resolves it precisely.

## Integration

- **the-coder** owns the language-agnostic workflow — discovery, planning, verification loop. This skill governs
  Rust-specific conventions only; defer the workflow mechanics to `the-coder` and apply these rules within it.
- **rust-testing** owns the test ecosystem (`#[test]`/integration/doctest layout, cargo-nextest, proptest, insta,
  criterion, mockall, rstest). When writing or reviewing tests, that skill leads; it relies on this skill for general
  language conventions and on `references/async.md` for async-test mechanics.
- When this skill's conventions conflict with an established pattern already pervasive in the codebase, the codebase
  wins — follow it and flag the divergence once.

## Application

When **writing** Rust:

- Apply every convention above silently — do not narrate "per RFC 430 I'll name this...". Just write idiomatic code.
- Match the surrounding codebase. If it diverges from these conventions consistently (e.g. uses `mod.rs`, a different
  error crate), follow the codebase and note the divergence once rather than fighting it file-by-file.
- Run the toolchain gates before declaring the work done.

When **reviewing** Rust:

- Cite the specific violation (file:line and the rule), then show the corrected code inline. Do not lecture in the
  abstract.
- Prioritize correctness and soundness (unsound `unsafe`, blocking-in-async, panics-as-errors, data races) over style
  nits; let `cargo fmt` and Clippy carry the mechanical issues.
- Confirm the concurrency model fits the workload (CPU-bound vs I/O-bound) before reviewing the concurrency details.

---

The borrow checker is a collaborator, not an adversary. When it pushes back, the answer is almost never `.clone()`,
`Rc`, or `unsafe` — it is a clearer ownership structure. Encode invariants in types so wrong code does not compile, keep
`unsafe` rare and justified, and let the toolchain gates (fmt, clippy, nextest + doctests, deny) be the final word on
done.
