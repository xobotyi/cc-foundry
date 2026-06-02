# Project Structure: Layout, Workspaces, Lints, Profiles

Depth behind the SKILL.md "Project Structure" rules. Read this when laying out modules, setting up a workspace,
configuring lint policy, or tuning build profiles. SKILL.md states the rules; this file holds the worked examples, full
catalogs, decision tables, and edge cases.

## Contents

- [Module file layout (mod.rs-free)](#module-file-layout-modrs-free)
- [Crate roots and target directories](#crate-roots-and-target-directories)
- [Cargo workspaces](#cargo-workspaces)
- [Dependency and field inheritance](#dependency-and-field-inheritance)
- [Feature unification](#feature-unification)
- [The [lints] table](#the-lints-table)
- [Build profiles](#build-profiles)
- [MSRV via rust-version](#msrv-via-rust-version)

## Module file layout (mod.rs-free)

`mod foo;` is a load directive, not a C-style `#include`: it tells the compiler where a module's body lives and where it
sits in the module tree. The compiler accepts two file paths for a module `foo` declared in the crate root:

- `src/foo.rs` — the modern, idiomatic path.
- `src/foo/mod.rs` — the older, still-supported path.

Use the first. The `mod.rs` style causes editor confusion: a large project accumulates dozens of files all named
`mod.rs`, indistinguishable in a tab bar or fuzzy-finder. Pick one style per module — using both paths for the same
module is a compile error; mixing styles across modules in one project compiles but is discouraged for the same
navigability reason.

Nesting rule: a submodule's file goes in a directory named for its parent. Module `hosting`, a child of
`front_of_house`, lives at `src/front_of_house/hosting.rs`. Putting it at `src/hosting.rs` makes the compiler treat it
as a child of the crate root, not of `front_of_house`. The directory tree mirrors the module tree.

<example name="mod-rs-free-layout">

**Do — `mod.rs`-free: the module file sits beside its submodule directory.**

```
src/
  lib.rs                  // mod front_of_house;  (declares the module)
  front_of_house.rs       // mod hosting;          (the front_of_house body + declares submodule)
  front_of_house/
    hosting.rs            // the hosting body
```

```rust
// src/lib.rs
mod front_of_house;

pub use crate::front_of_house::hosting; // re-export; `use` does not affect which files compile

// src/front_of_house.rs
pub mod hosting;

// src/front_of_house/hosting.rs
pub fn add_to_waitlist() {}
```

**Don't — new `mod.rs` files: every module folds into an identically-named file.**

```
src/
  lib.rs
  front_of_house/
    mod.rs               // many of these across a project become indistinguishable
    hosting/
      mod.rs
```

</example>

When the codebase already uses `mod.rs` pervasively, follow it and flag the divergence once rather than converting
file-by-file — consistency within a crate wins. The hard rule: _never introduce a new_ `mod.rs` file.

`mod` loads a file exactly once in the tree; other files reach the loaded code by its path
(`crate::front_of_house::hosting`) brought into scope with `use`. `use` never decides what compiles — only `mod` does.

## Crate roots and target directories

A package's crate roots and conventional directories:

- **`src/lib.rs`** — library crate root. The crate's public API surface.
- **`src/main.rs`** — binary crate root. A package may have both a library and one binary.
- **`src/bin/*.rs`** — additional binary targets; each file (or each `src/bin/<name>/main.rs`) is its own binary, named
  for the file. Use `default-run = "name"` in `[package]` to pick which `cargo run` launches.
- **`examples/*.rs`** — example programs, built by `cargo build --examples`, run by `cargo run --example <name>`. They
  link against the library and are good living documentation.
- **`benches/*.rs`** — benchmark targets (`cargo bench`).
- **`tests/*.rs`** — integration tests; each file is a separate crate that exercises the public API only.

## Cargo workspaces

A workspace is a set of packages (members) managed together. Members share one `Cargo.lock` and one `target/` directory
at the workspace root, and `cargo check --workspace` runs across all of them.

Three sections are recognized **only in the root manifest** and silently ignored in member manifests:

- `[patch]` — dependency overrides
- `[replace]` — dependency overrides (deprecated)
- `[profile.*]` — compiler settings (see [Build profiles](#build-profiles))

Putting any of these in a member crate is a frequent, silent mistake: the section is ignored with no error, so the
intended override or profile tweak never applies.

### Virtual manifest

Prefer a **virtual manifest** for multi-crate projects: a root `Cargo.toml` with `[workspace]` but no `[package]`. There
is no "primary" crate; all crates live in sibling directories. A virtual manifest has no `package.edition` to infer
from, so the resolver version must be set explicitly.

<example name="virtual-workspace-root">

**Do — virtual root manifest with explicit resolver, glob members, and shared tables.**

```toml
# Cargo.toml (workspace root)
[workspace]
members  = ["crates/*"]
resolver = "3"

[workspace.package]
edition      = "2024"
rust-version = "1.85"
license      = "MIT OR Apache-2.0"
repository   = "https://github.com/example/project"

[workspace.dependencies]
serde   = { version = "1", features = ["derive"] }
tokio   = { version = "1", default-features = false }
my-core = { path = "crates/core" }

[workspace.lints.rust]
unsafe_code = "forbid"

[workspace.lints.clippy]
all = { level = "deny", priority = -1 }
```

</example>

`resolver = "3"` is the current resolver (the default for edition 2024 packages); it builds on resolver 2 and adds MSRV-
aware version selection. A virtual workspace must name it because it cannot infer the resolver from an edition.

`members` accepts glob patterns (`crates/*`). Any path dependency inside the workspace directory becomes a member
automatically. `exclude` removes paths; `default-members` chooses which members bare commands operate on at the root (a
virtual workspace defaults to all members, as if `--workspace` were passed).

A package cannot be both a workspace root (contain `[workspace]`) and a member of another workspace (contain
`package.workspace`). When a member is not under the root directory, point it back with `package.workspace = "..."`.

## Dependency and field inheritance

`[workspace.dependencies]` declares versions and feature sets once; members inherit with `{ workspace = true }`. This is
the single source of truth for dependency versions across the workspace.

Two constraints on the workspace dependency table:

- Dependencies declared there **cannot** be `optional`.
- `features` listed there are **additive** with any `features` a member adds at the inheritance site.

The member-side gotcha: when inheriting, a member must **not** re-specify `version` or `default-features` — those come
from the workspace entry. A member may _add_ `features` and may set `optional = true` at the inheritance site. Re-
specifying `default-features` on the member is the common error; keep that decision in the workspace table so every
member agrees.

<example name="dependency-inheritance">

**Do — version and default-features live in the workspace; members only add features or mark optional.**

```toml
# Workspace root
[workspace.dependencies]
serde = { version = "1", default-features = false }

# crates/api/Cargo.toml
[dependencies]
serde = { workspace = true, features = ["derive"] }   # adds a feature; inherits version + default-features

# crates/store/Cargo.toml
[dependencies]
serde = { workspace = true, optional = true }          # optional only at the member site
```

**Don't — re-specifying version or default-features in the member defeats the single source of truth.**

```toml
# crates/api/Cargo.toml
[dependencies]
serde = { workspace = true, version = "1.0.200", default-features = false }  # version/default-features here is wrong
```

</example>

`[workspace.package]` does the same for package metadata. A member opts into each field with `field.workspace = true`.
Inheritable keys: `authors`, `categories`, `description`, `documentation`, `edition`, `exclude`, `homepage`, `include`,
`keywords`, `license`, `license-file`, `publish`, `readme`, `repository`, `rust-version`, `version`. (`license-file` and
`readme` resolve relative to the workspace root; `include` and `exclude` relative to the member's own root.)

```toml
# crates/core/Cargo.toml
[package]
name         = "my-core"        # name is always per-member; never inherited
version.workspace      = true
edition.workspace      = true
rust-version.workspace = true
license.workspace      = true

[lints]
workspace = true                # opt into [workspace.lints]; see below
```

MSRV for these mechanisms: `workspace.package` and `workspace.dependencies` need Cargo 1.64+; `workspace.lints` is
respected as of 1.74.

## Feature unification

Cargo builds each dependency **once**, with the **union** of every feature any part of the graph enabled on it. Features
are package-local: enabling `foo` on one crate does not enable a feature named `foo` on another.

The consequence drives the cardinal rule: **features must be additive**. Enabling a feature may only add capability; it
must never remove or change existing behavior, because some other crate in the graph may also depend on the un-featured
behavior. Two crates depending on `winapi` with disjoint feature sets get one `winapi` compiled with the union of both.

The most common violation is a `no_std` toggle. Because features only add, you cannot have a feature that _removes_
`std`. Invert it: define a `std` feature that _enables_ `std`, make it part of `default`, and let consumers disable it
with `default-features = false`.

<example name="no-std-feature">

**Do — a `std` feature that adds capability; absence means `no_std`.**

```toml
[features]
default = ["std"]
std = []
```

```rust
#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "std")]
pub fn read_from_disk() { /* needs std */ }
```

**Don't — a `no_std` feature subtracts behavior, so the union with any `std`-needing crate breaks the build.**

```toml
[features]
no_std = []   # disabling functionality via a feature is not additive
```

</example>

Related mechanics:

- An `optional = true` dependency implicitly defines a same-named feature; the `dep:name` syntax inside `[features]`
  suppresses that implicit feature so an internal dependency is not user-selectable.
- `"pkg/feat"` enables `feat` on `pkg` and activates `pkg` if it is optional; `"pkg?/feat"` enables the feature only if
  something else already activated `pkg`.
- `default-features = false` in a member does **not** guarantee defaults are off — if any other crate in the graph pulls
  the dependency without that flag, unification turns defaults back on.
- Mutually exclusive features are an anti-pattern; if unavoidable, guard with
  `#[cfg(all(feature = "a", feature = "b"))] compile_error!(...)`.
- Resolver 2/3 stops unifying across boundaries that should not share features: per-target deps for inactive targets,
  build-deps/proc-macros vs normal deps, and dev-deps unless a test/example target needs them. This can build a
  dependency more than once; `cargo tree --duplicates` and `cargo tree -e features -i <pkg>` diagnose feature flow.

## The [lints] table

Set lint levels in the `[lints]` (or `[workspace.lints]`) table in `Cargo.toml` — the canonical, auditable home for lint
policy. This replaces scattered `#![deny(...)]` crate attributes and `RUSTFLAGS`, which fragment policy across files and
the environment and do not inherit across a workspace.

Each lint maps to a level and an optional priority:

```toml
[lints.rust]
unsafe_code = "forbid"           # shorthand for { level = "forbid", priority = 0 }

[lints.clippy]
enum_glob_use = "deny"
```

Levels correspond to rustc lint levels: `forbid`, `deny`, `warn`, `allow`. The table name is the tool: the part before
`::` in a lint name. `unsafe_code` (no `::`) belongs under `[lints.rust]`; `clippy::enum_glob_use` belongs under
`[lints.clippy]` as `enum_glob_use`.

### The priority field: resolving group-vs-specific conflicts

`priority` is a **signed integer**. Lower (especially negative) numbers have lower priority and are applied first;
higher numbers override them. This is the mechanism for "deny a whole group, but allow one lint inside it." Without an
explicit priority, a group lint and a specific lint at the same priority (0) apply in an unspecified order, and the
group can clobber the per-lint exception.

<example name="lints-priority">

**Do — give the group a negative priority so the specific override wins.**

```toml
[lints.clippy]
pedantic            = { level = "warn", priority = -1 }  # whole group first, lower priority
missing_errors_doc  = "allow"                            # specific lint, priority 0, overrides the group
```

**Don't — leave both at the default priority and hope the order is right.**

```toml
[lints.clippy]
pedantic           = "warn"   # priority 0
missing_errors_doc = "allow"  # also priority 0 — which wins is unspecified
```

</example>

Lint policy is local: Cargo applies `[lints]` only to the current package, never to dependencies (it caps dependency
lints via `--cap-lints`). In a workspace, define the policy once under `[workspace.lints]` and have each member opt in
with a `[lints]` table containing `workspace = true`. Respected as of Cargo 1.74.

For a narrow, in-code exception to a project-global lint, prefer `#[expect(lint, reason = "...")]` over `#[allow(...)]`:
`expect` warns when the lint stops firing, so a stale suppression surfaces instead of rotting silently.

## Build profiles

Profiles tune compiler settings. Cargo has four built-ins — `dev`, `release`, `test`, `bench` — auto-selected by the
command (`cargo build` -> `dev`, `cargo test` -> `test` inheriting `dev`, `cargo bench` -> `bench` inheriting `release`,
`cargo install` -> `release`). Choose a profile explicitly with `--profile=NAME`; `--release` is shorthand for
`--profile=release`. The selected profile applies to all targets (lib, bin, example, test, bench).

**Profiles only apply from the workspace root manifest.** Cargo reads `[profile.*]` only at the workspace root and
ignores any `[profile.*]` in dependencies or member crates. A profile tweak placed in a member is silently dropped.

### Profile setting catalog

Each setting and what it controls:

- **`opt-level`** — optimization: `0`-`3`, `"s"` (size), `"z"` (size, no loop vectorization). Higher is not always
  faster; measure.
- **`lto`** — link-time optimization: `false` (thin-local), `"thin"`, `true`/`"fat"` (whole-graph), `"off"`. `"thin"`
  gets most of `"fat"`'s gains at much lower link cost.
- **`codegen-units`** — number of parallel codegen units. Default 256 (incremental) / 16 (non-incremental). Set to `1`
  to maximize optimization quality at the cost of compile parallelism.
- **`panic`** — `"unwind"` or `"abort"`. `abort` drops unwinding machinery for smaller binaries and no unwind paths.
- **`strip`** — `"none"`, `"debuginfo"`, `"symbols"` (`true` == `"symbols"`, `false` == `"none"`). Shrinks release
  binaries by removing symbols/debug info.
- **`debug`** — debug info amount: `0`/`false`/`"none"`, `"line-tables-only"`, `1`/`"limited"`, `2`/`true`/`"full"`.
- **`debug-assertions`** — toggles `cfg(debug_assertions)` and `debug_assert!`.
- **`overflow-checks`** — panic on integer overflow when enabled.
- **`incremental`** — reuse on-disk artifacts to speed recompiles; workspace members and path deps only.
- **`split-debuginfo`**, **`rpath`** — debug-info placement and runtime library search path.

`dev` defaults: `opt-level = 0`, `debug = true`, `debug-assertions = true`, `overflow-checks = true`, `lto = false`,
`incremental = true`, `codegen-units = 256`. `release` defaults: `opt-level = 3`, `debug = false`,
`debug-assertions = false`, `overflow-checks = false`, `lto = false`, `incremental = false`, `codegen-units = 16`.

### Optimized release profile and custom profiles

A maximally-optimized release tightens the three knobs that trade compile time for runtime/size:

```toml
# Cargo.toml at the WORKSPACE ROOT
[profile.release]
lto           = "thin"   # or `true` for fat LTO if the extra link time is acceptable
codegen-units = 1        # best optimization; serial codegen
strip         = "symbols"
panic         = "abort"  # smaller binary, no unwinding — choose only if no code relies on catching panics
```

`panic = "abort"` caveats: tests, benchmarks, build scripts, and proc macros ignore the `panic` setting (the test
harness requires `unwind`), and building a test under an `abort` profile forces dependencies to rebuild with `unwind`.

Define a **custom profile** with `inherits` to start from a built-in and override selectively. Output lands in
`target/<profile-name>/`.

```toml
[profile.release-lto]
inherits = "release"
lto      = true
```

```sh
cargo build --profile release-lto   # artifacts in target/release-lto/
```

### Per-package overrides

Override settings for specific packages with `[profile.<p>.package.<name>]`, for all non-workspace dependencies with
`[profile.<p>.package."*"]`, and for build scripts/proc-macros with `[profile.<p>.build-override]`. Precedence, first
match wins:

1. `[profile.dev.package.name]` — a named package
2. `[profile.dev.package."*"]` — any non-workspace member
3. `[profile.dev.build-override]` — build scripts, proc macros, their deps
4. `[profile.dev]` — the profile's own settings
5. Cargo built-in defaults

Two edge cases: **overrides cannot set `panic`, `lto`, or `rpath`** (those are whole-graph decisions). And raising the
opt-level of a generics-heavy dependency via an override often does nothing — generic code is monomorphized in the crate
that _uses_ it, so it picks up the _consumer's_ opt-level. At opt-level 2/3 a crate also stops sharing monomorphized
items across crates; use opt-level 1 when optimizing dependencies for development to keep that sharing.

## MSRV via rust-version

Declare the minimum supported Rust version with `rust-version` in `[package]`, or inherit it via
`rust-version.workspace = true` from `[workspace.package]`:

```toml
[package]
name         = "my-core"
rust-version = "1.85"
```

`rust-version` documents the floor your package supports; the resolver (version 3) uses it to prefer dependency versions
compatible with that floor. Set it to a version you actually build and test against, and bump it deliberately — raising
MSRV is a breaking change for downstream consumers pinned below it.
