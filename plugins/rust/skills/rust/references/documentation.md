# Documentation and SemVer Discipline

Depth for rustdoc authoring and SemVer compatibility. The SKILL.md `## Doc Comments` section carries the
working-resolution rules (`//!` vs `///`, the conventional sections, `?` in doctests, `missing_docs`, intra-doc links,
semver-checks). This reference holds the extended examples, the full breaking-change catalog, the doctest annotation
matrix, and the edge cases behind each rule.

## Contents

- [Doc comment anatomy](#doc-comment-anatomy)
- [The conventional sections](#the-conventional-sections)
- [Doctests](#doctests)
- [Intra-doc links](#intra-doc-links)
- [Lints that enforce docs](#lints-that-enforce-docs)
- [The doc CI gate](#the-doc-ci-gate)
- [SemVer: what counts as a breaking change](#semver-what-counts-as-a-breaking-change)
- [Future-proofing attributes](#future-proofing-attributes)
- [cargo-semver-checks in CI](#cargo-semver-checks-in-ci)
- [cargo-semver-checks blind spots](#cargo-semver-checks-blind-spots)

## Doc comment anatomy

`//!` is an inner doc comment: it documents the item it is written _inside_. Use it only for the crate root (top of
`lib.rs`) and module bodies. `///` is an outer doc comment: it documents the item that _follows_ it - functions,
structs, fields, enum variants, trait items, consts. Per RFC 1574, when documenting a `mod` block prefer `///` on the
outside over `//!` on the inside, because the outside form keeps the doc next to the name being introduced.

The first line of any doc comment is the **summary**. Rustdoc reuses everything before the first blank line as the
search-result blurb and the module-index one-liner, so keep it to a single sentence. Write it in the third-person
present indicative: "Returns the number of elements", not "Return..." or "This function returns...". Do not restate the
type signature - rustdoc already renders and hyperlinks every type in the signature, so "Takes a `u32` and returns a
`u32`" is noise.

The recommended item structure, in order:

1. One-sentence summary (third-person present).
2. A more detailed prose explanation of behavior, edge cases, and intent.
3. At least one `# Examples` block that compiles and runs.
4. Any further conventional sections (`# Panics`, `# Errors`, `# Safety`) the item warrants.

Module-level (`//!`) docs give a high-level map of the module - what lives here and why - and each item documents itself
fully. Some duplication between the two is acceptable; never replace a type's own docs with "see the module-level
documentation".

When referring to a generic type in prose, write its full name: `Option<T>`, not bare `Option`; `Cow<'a, B>`, not the
fully-bounded form with its `where` clause. Backtick inline code fragments (`Result`, `&str`). A `<div class="warning">`
block, with a blank line between the tags and any Markdown inside, renders a callout for hazards worth flagging.

<example name="crate-and-item-docs">

```rust
//! Fast, allocation-free queue abstractions.
//!
//! This crate provides a fixed-capacity ring buffer ([`RingQueue`]) and a growable
//! variant. Reach for it when you need bounded backpressure without locking.
//!
//! # Layout
//!
//! The top-level module exposes [`RingQueue`]; the [`spsc`] submodule holds the
//! single-producer/single-consumer specialization.

/// A fixed-capacity FIFO ring buffer.
///
/// Pushes past capacity return the rejected value rather than reallocating, so the
/// queue never allocates after construction. For an unbounded queue, use
/// [`GrowQueue`] instead.
pub struct RingQueue<T> { /* ... */ }

impl<T> RingQueue<T> {
    /// Returns the number of elements currently queued.
    pub fn len(&self) -> usize { /* ... */ }
}
```

The summary on `len` is third-person present and does not echo the `-> usize` already shown in the signature.

</example>

## The conventional sections

These top-level (`#`) headings are the agreed vocabulary (RFC 1574). Always use the plural `# Examples` even for a
single example - it keeps tooling uniform. Place each only when the item warrants it; an empty `# Errors` heading is
worse than none.

- **`# Examples`** - at least one copy-pasteable block per public item. "Everything should have examples." Lead with the
  common case, then add further blocks for closures, error paths, or edge inputs, each introduced by a sentence.
- **`# Panics`** - every condition under which the function panics, aborts, or otherwise terminates abnormally. An
  undocumented panic on bad input leaves callers unable to defend against it. Recommended whenever a reachable panic
  exists (out-of-bounds index, failed invariant, integer overflow in debug).
- **`# Errors`** - for any function returning `Result`, describe which error variants are returned and the conditions
  that produce each. Name the error type and link it.
- **`# Safety`** - mandatory on every `unsafe fn`: state the invariants the _caller_ must uphold to call it soundly.
  This is the contract that lets a caller write a correct `// SAFETY:` comment at the call site.
- **`# Aborts`** / **`# Undefined Behavior`** - rarer, for code that calls `abort()` or that has UB when its contract is
  violated.

<example name="errors-and-panics-sections">

````rust
/// Parses a configuration file into a [`Config`].
///
/// # Errors
///
/// Returns [`ConfigError::Io`] if the file cannot be read, and
/// [`ConfigError::Parse`] if the contents are not valid TOML.
///
/// # Panics
///
/// Panics if `path` is empty, which indicates a programmer error rather than a
/// recoverable condition.
///
/// # Examples
///
/// ```
/// # use mycrate::{load_config, ConfigError};
/// let cfg = load_config("config.toml")?;
/// assert_eq!(cfg.port, 8080);
/// # Ok::<(), ConfigError>(())
/// ```
pub fn load_config(path: &str) -> Result<Config, ConfigError> { /* ... */ }
````

</example>

<example name="safety-section">

```rust
/// Returns a slice over `len` elements starting at `ptr`.
///
/// # Safety
///
/// The caller must guarantee that:
/// - `ptr` is valid for reads of `len * size_of::<T>()` bytes,
/// - the memory is initialized and properly aligned for `T`,
/// - the referenced data outlives the returned slice and is not mutated through
///   another pointer for the slice's lifetime.
pub unsafe fn slice_from_raw<'a, T>(ptr: *const T, len: usize) -> &'a [T] {
    // SAFETY: invariants are the caller's per the contract above.
    unsafe { std::slice::from_raw_parts(ptr, len) }
}
```

</example>

## Doctests

Code fences in doc comments compile and run under `cargo test --doc`. They are tests _and_ documentation, so they must
read as idiomatic, copy-pasteable usage - not as terse test scaffolding. Rustdoc defaults a bare unannotated fence to
Rust, so omit the `rust` tag inside doc comments (in long-form Markdown that GitHub renders, keep the explicit `rust`
tag for highlighting).

**Use `?`, not `.unwrap()`, for fallible calls.** A doctest body is wrapped in an implicit `fn main`, so to use `?` make
the example return a `Result`. The idiomatic pattern hides the return-type annotation with a `#` line:

<example name="doctest-question-mark">

**Bad - `.unwrap()` teaches a non-idiomatic habit and prints an ugly panic on failure:**

````rust
/// ```
/// let n: i32 = "42".parse().unwrap();
/// assert_eq!(n, 42);
/// ```
````

**Good - `?` with a hidden return-type tail:**

````rust
/// ```
/// let n: i32 = "42".parse()?;
/// assert_eq!(n, 42);
/// # Ok::<(), std::num::ParseIntError>(())
/// ```
````

</example>

**Hide setup with leading `#`.** A line whose first non-whitespace character is `#` (followed by a space, or `# ` then
code) is compiled and run but not rendered in the docs. Use it to hide imports, boilerplate, and the trailing
`Ok::<_, _>(())` so the visible example shows only what matters. To render a literal leading `#` (e.g. a Rust attribute
or a `#[derive]`), escape it as `##`.

<example name="doctest-hidden-setup">

````rust
/// Splits a CSV record into trimmed fields.
///
/// ```
/// # use mycrate::split_record;
/// let fields = split_record(" a , b ,c ");
/// assert_eq!(fields, ["a", "b", "c"]);
/// ```
````

The reader sees three lines; rustdoc still compiles the hidden `use`, so the example stays focused yet remains a
complete, runnable program.

</example>

**Choose the right fence annotation.** Annotations go on the opening fence, comma-separated (e.g. ` ```no_run `).

| Annotation     | Compiles  | Runs | Use when                                                                   |
| :------------- | :-------- | :--- | :------------------------------------------------------------------------- |
| (none)         | Yes       | Yes  | Default. The example is a correct, runnable demonstration.                 |
| `no_run`       | Yes       | No   | Code is valid but has side effects unfit for a test (network, files).      |
| `ignore`       | No        | No   | Pseudocode or a fragment that cannot compile standalone. Prefer `text`.    |
| `should_panic` | Yes       | Yes  | Demonstrating a documented panic; the test passes only if it panics.       |
| `compile_fail` | Must fail | No   | Demonstrating that misuse is rejected; passes only if it fails to compile. |
| `text`         | No        | No   | The block is not Rust at all (shell output, a config snippet, JSON).       |

Prefer `text` over `ignore` for non-Rust content: `ignore` silently disables a Rust block (a place for rot to hide),
whereas `text` correctly declares "this is not Rust." Reserve `ignore` for the rare Rust fragment that genuinely cannot
be made to compile.

<example name="compile-fail-and-should-panic">

````rust
/// A handle that must not outlive its parent.
///
/// Attempting to use it past the parent's scope fails to compile:
///
/// ```compile_fail
/// # use mycrate::{Parent, Handle};
/// let handle: Handle;
/// {
/// let parent = Parent::new();
/// handle = parent.handle();
/// } // parent dropped here
/// handle.read(); // borrow does not live long enough
/// ```
///
/// Reading past the end panics:
///
/// ```should_panic
/// # use mycrate::Buffer;
/// let buf = Buffer::with_len(4);
/// let _ = buf[10]; // index out of bounds
/// ```
````

</example>

## Intra-doc links

Link items by writing the path in brackets: ``[`RingQueue`]``, ``[`std::vec::Vec`]``, ``[`Self::len`]``,
``[`crate::config::Config`]``. Rustdoc resolves the path against what is in scope and emits the correct relative URL -
no hand-written `../struct.Foo.html` paths, which RFC 1574's examples predate and which rot the moment the module layout
changes. Backticks inside the brackets render the link as code.

Disambiguate when a name is ambiguous between namespaces: ``[`Clean`](trait@Clean)``, ``[`Clean`](struct@Clean)``,
``[`open`](fn@open)``, ``[`open`](macro@open)``. For a link text that differs from the target, use
``[the length][`Self::len`]`` or the reference form. Reference-style definitions keep prose readable:

<example name="intra-doc-link-styles">

```rust
/// Drains the queue into a [`Vec`], leaving it [empty].
///
/// See [`RingQueue::push`] for the inverse operation. Implements the
/// [`Iterator`] contract so it composes with [adapter chains][iter-adapters].
///
/// [empty]: RingQueue::is_empty
/// [iter-adapters]: std::iter#adapters
```

</example>

Enable the broken-links lint so a renamed or removed target fails the build instead of silently producing a dead link:
set `rustdoc::broken_intra_doc_links` to deny. Put it in the `[lints.rustdoc]` table of `Cargo.toml` (lint policy lives
in the `[lints]` table, not scattered attributes):

```toml
[lints.rustdoc]
broken_intra_doc_links = "deny"
```

## Lints that enforce docs

- **`missing_docs`** - warns on any undocumented public item. Libraries enable it so the doc surface cannot regress. Set
  it as a crate-wide rustc lint:

  ```toml
  [lints.rust]
  missing_docs = "warn"
  ```

  (Equivalent to `#![warn(missing_docs)]` at the crate root, but kept in the central lint table.) On items where a doc
  is redundant, override at the narrowest scope with `#[expect(missing_docs, reason = "...")]` so the override warns if
  it ever becomes stale - never a bare `#[allow]`.

- **`rustdoc::broken_intra_doc_links`** - catches dead `[`Item`]` links. Deny it.
- **`rustdoc::private_intra_doc_links`**, **`rustdoc::bare_urls`**, **`rustdoc::invalid_rust_codeblocks`** - additional
  `rustdoc::*` lints worth denying to keep generated docs clean; all live under `[lints.rustdoc]`.

When you change an exported symbol's signature or behavior, update its doc comment in the same edit. A doc describing
the old contract misleads - worse than no doc, because readers trust it.

## The doc CI gate

The documentation build is a verification gate alongside fmt/clippy/nextest. Run it with rustdoc warnings promoted to
errors so a broken link, an unresolved reference, or an `invalid_rust_codeblocks` finding fails CI:

```sh
RUSTDOCFLAGS="-D warnings" cargo doc --no-deps
```

- `RUSTDOCFLAGS="-D warnings"` turns every rustdoc lint warning into a hard error for this invocation. (Lint _policy_
  belongs in the `[lints]` table; this env var is the CI mechanism that makes the configured warnings fatal for the doc
  build, mirroring `clippy -- -D warnings`.)
- `--no-deps` documents only the current crate, not its entire dependency tree - faster, and it scopes failures to your
  own docs rather than a dependency's.

This gate is distinct from `cargo test --doc`, which _runs_ the doctests. Both are required: `cargo doc` catches
malformed docs and dead links; `cargo test --doc` catches examples that no longer compile or whose assertions fail.
`cargo nextest run` does not execute doctests, so the separate `--doc` run stays mandatory.

## SemVer: what counts as a breaking change

Cargo's convention: only a change to the left-most non-zero version component is incompatible. For `1.x` that is the
major number; for `0.y.z` a bump in `y` is the "major" (breaking) bump and `z` is "minor". `0.0.z` releases are always
treated as breaking. The categories below are _guidelines_ - a maintainer decides borderline cases - but they are the
shared vocabulary, and `cargo-semver-checks` lints against them.

**Change levels:** _Major_ requires a major bump. _Minor_ needs only a minor bump. _Possibly-breaking_ is a judgment
call - it can break some downstreams but not most, so weigh the likelihood.

### Items, structs, enums

- **Major** - renaming, moving, or removing any public item; any `cfg` gate that conditionally hides a public item.
- **Minor** - adding a new public item. (Rarely breaking via a glob import that introduces a trait-method ambiguity;
  glob imports of external items are a known hazard, so this is still classed minor.)
- **Major** - adding a private field to a struct whose fields are all currently public (breaks struct-literal
  construction); adding a public field when no private field exists (breaks construction and exhaustive matching).
- **Minor** - adding or removing private fields when the struct _already_ has at least one private field; that field
  already blocks struct-literal construction downstream.
- **Major** - for a tuple struct with public fields, adding/removing a private field if it shifts the _index_ of a
  public field.
- **Major** - adding a new enum variant to an enum that is not `#[non_exhaustive]` (breaks exhaustive `match`); adding
  new fields to an existing enum variant.

### Traits

- **Major** - adding a non-defaulted trait item (every implementor breaks); _any_ change to a trait item's signature
  (implementors must match it exactly, so even a generalization that would be safe on a free function breaks here);
  adding a trait item that makes the trait no longer object-safe (dyn-incompatible); adding a type parameter without a
  default.
- **Possibly-breaking** - adding a _defaulted_ trait item: usually safe, but can collide with an inherent or other-trait
  method of the same name and produce an ambiguity at call sites.
- **Minor** - adding a defaulted trait type parameter; making the trait object-safe again (the converse of breaking it).

### Generics and functions

- **Major** - tightening a generic bound (e.g. adding `: Eq`); generalizing a field to a generic where the type could
  now differ; capturing _more_ generic parameters in a return-position `impl Trait` (`use<...>`).
- **Minor** - loosening a generic bound; adding a defaulted type parameter; generalizing to a generic that yields the
  identical type for all existing uses; changing a generic type to a strictly more generic one; capturing _fewer_
  parameters in an RPIT.
- **Major** - adding or removing a function parameter (arity change); generalizing a function such that the new bound
  excludes a previously valid type (e.g. requiring `Copy`).
- **Minor** - generalizing a function to generics that still accept the original type (including `&dyn Trait` ->
  `<T: Trait + ?Sized>`, since every trait implements itself); making an `unsafe fn` safe (may trigger the harmless
  `unused_unsafe` lint downstream). Going the other way - safe to `unsafe` - is **major**.
- **Possibly-breaking** - introducing a new function type parameter (breaks only callers using explicit turbofish).

### `repr` and type layout

A default-representation type has no guaranteed layout, alignment, or size, so reordering or adding/removing fields
under the other rules is fine. Once a `repr` attribute pins layout, changes become observable:

- **Minor** - adding `repr(C)`, `repr(<int>)`, or `repr(transparent)` to a default-representation type; adding/removing
  a private field of a `repr(C)` type (subject to the private-field rules).
- **Major** - adding `repr(packed)` or `repr(align)`; removing any pinned `repr` (`packed`/`align`/`C`/`<int>`/
  `transparent`); reordering public fields of a `repr(C)` type; changing the `N` in `packed(N)`/`align(N)` when it
  alters layout; changing the primitive in a `repr(<int>)` enum.

### Attributes, environment, and Cargo

- **Major** - adding `#[non_exhaustive]` to an existing enum, variant, or struct that has no private fields (it removes
  struct-literal construction, `as`-cast of discriminants, and exhaustive matching for downstreams); switching a crate
  from `no_std` support to requiring `std`.
- **Possibly-breaking** - raising the minimum supported Rust version (conventionally treated as _minor_: document it via
  `package.rust-version`); tightening platform/environment requirements; removing an optional dependency (which
  implicitly defines a same-named feature unless you use `dep:` syntax).
- **Minor** - introducing new lints in your crate (e.g. adding `#[deprecated]` or `#[must_use]`) - downstreams that
  `deny(warnings)` may break, but new lints are an accepted fact of updates; adding a Cargo feature; adding a
  dependency; changing a dependency's enabled features - all as long as they do not transitively force a breaking
  change.
- **Major** - removing a Cargo feature; removing functionality/public items from a feature's enabled set.

## Future-proofing attributes

`#[non_exhaustive]` is the primary lever for keeping a type evolvable. Apply it **when first introducing** a type - not
later, because _adding_ it to an existing all-public type is itself a major break.

- On a **struct**: downstream crates cannot use struct-literal syntax (or functional-update `..`) to construct it, and
  cannot match it without a trailing `..`. You then add fields in minor releases. Provide a constructor and/or `Default`
  so callers have a supported way to build it.
- On an **enum**: downstream `match` must include a wildcard arm, so you can add variants in minor releases. Casting a
  variant to its discriminant with `as` is disallowed downstream.
- On an **enum variant**: the variant cannot be constructed or matched without `..`, letting you add fields to it later.

<example name="non-exhaustive-from-the-start">

```rust
/// Configuration for the connection pool.
///
/// Construct via [`PoolConfig::builder`]; the struct is `#[non_exhaustive]` so
/// new options can be added without a major version bump.
#[non_exhaustive]
pub struct PoolConfig {
    pub max_size: usize,
    pub timeout: std::time::Duration,
}

/// Errors returned by the pool.
#[non_exhaustive]
pub enum PoolError {
    Timeout,
    Closed,
    // A future Exhausted variant will not break downstream `match`es.
}
```

</example>

Complementary attributes: `#[deprecated = "use X instead"]` to phase an item out before a major release (a minor change
that only adds a lint); `#[must_use]` on functions whose result must be consumed (adding it later is minor but emits the
`unused_must_use` lint downstream). The sealed-trait pattern prevents downstream implementors, which converts several
otherwise-major trait changes into minor ones. To rename an item without breaking, keep the old name as a
`#[deprecated]` `pub use` re-export.

## cargo-semver-checks in CI

`cargo-semver-checks` lints a crate's public API against a baseline (by default the latest crates.io release) using
rustdoc's JSON output, and reports each violation with the specific item, file, line, and the matching entry in the
Cargo SemVer reference.

```sh
cargo install cargo-semver-checks --locked # or: cargo binstall cargo-semver-checks
cargo semver-checks # run before cargo publish
```

In GitHub Actions, use the maintained action, which defaults to current stable Rust and the latest tool version:

```yaml
- name: Check semver
  uses: obi1kenobi/cargo-semver-checks-action@v2
```

Operational notes:

- **Baseline selection.** Defaults to the latest crates.io release. For an unpublished crate or a pre-publish gate,
  point at a git revision or path: `--baseline-rev <rev>`, `--baseline-root <dir>`, `--baseline-rustdoc <json>`.
- **Feature coverage.** By default it checks every feature _except_ names matching `unstable`/`nightly`/`bench`/
  `no_std`, the `_` prefix, or `unstable-`/`unstable_` prefixes. Override with `--all-features`, `--default-features`,
  or `--only-explicit-features`. A breaking change reachable only under a non-default feature combination can be missed
  unless you broaden the feature set.
- **Targets.** If the public API differs by platform (`cfg(target_os)`, platform-specific deps), run once per relevant
  triple via `--target` (a CI matrix), since a single run only sees one target's API.
- **Conditional compilation.** Pass `--cfg` options through `RUSTDOCFLAGS` so it scans the right configuration.
- **Lint configuration.** Tune individual lints under `[package.metadata.cargo-semver-checks.lints]` (or the workspace
  equivalent): set `level` (`deny`/`warn`/`allow`) and `required-update` (`major`/`minor`). Configuration is read from
  the _current_ version's manifest, never the baseline's.
- **Rust-version coupling.** The tool reads rustdoc JSON, an unstable format. Pin the tool to a stable Rust version and
  update it alongside Rust upgrades. MSRV bumps in the tool itself are not treated as major.

`cargo-semver-checks` is designed to have **no false positives** - a reported violation should always be a real one with
a file and line; if it is not, file a bug.

## cargo-semver-checks blind spots

The tool does not yet have lints for every way to break SemVer, so a clean run is necessary but **not sufficient**.
Known gaps it will not catch:

- **Type changes** in a field or function-parameter type (e.g. `fn f(x: u32)` -> `fn f(x: u64)`).
- **Generic and lifetime** breaking changes.
- Breakage reachable only under a **subset of features** that the run did not activate.
- **Runtime/behavioral** changes - same signature, different behavior (a returned value's meaning, a relaxed invariant).
  These are outside any API-shape tool's reach; only review and tests catch them.
- Macro-related edge cases, which are a known source of tricky semver interactions.

Append `--verbose` to see the full list of checks the current tool version performs. Treat `cargo-semver-checks` as a
fast guardrail that catches the mechanical, shape-level breaks - pair it with the breaking-change catalog above and
human review for the categories it cannot yet see.
