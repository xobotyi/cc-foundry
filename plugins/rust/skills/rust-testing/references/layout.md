# Test Layout and Assertions

High-resolution depth behind the `rust-testing` SKILL.md "Test Layout" and "Assertions" rules. Read this when placing a
test in the wrong layer would change behavior (private-item access, crate boundaries, spurious empty test sections,
silently-skipped doctests) or when an assertion's failure output is hard to read.

## Contents

- [The three test kinds at a glance](#the-three-test-kinds-at-a-glance)
- [Unit tests: `#[cfg(test)] mod tests`](#unit-tests-cfgtest-mod-tests)
- [Integration tests: the `tests/` directory](#integration-tests-the-tests-directory)
- [Shared helpers: `tests/common/mod.rs`](#shared-helpers-testscommonmodrs)
- [Binary crates: split `main.rs` over `lib.rs`](#binary-crates-split-mainrs-over-librs)
- [Doctests: `///` examples that compile and run](#doctests--examples-that-compile-and-run)
- [Doctest attribute catalog](#doctest-attribute-catalog)
- [Assertion macros](#assertion-macros)
- [`assert_matches!` and `debug_assert_matches!`](#assert_matches-and-debug_assert_matches)
- [`pretty_assertions` for readable diffs](#pretty_assertions-for-readable-diffs)

## The three test kinds at a glance

Rust splits tests into two categories - unit and integration - plus doctests as a third compiled-example form. Each
occupies a different location and sees a different slice of the crate. Pick the layer by what the test must reach, not
by habit.

| Kind        | Location                        | Compiled as                 | Sees             | `#[cfg(test)]`? |
| :---------- | :------------------------------ | :-------------------------- | :--------------- | :-------------- |
| Unit        | same file as code under test    | part of the crate, test cfg | private + public | yes (on module) |
| Integration | `tests/*.rs`, sibling of `src/` | one separate crate per file | public API only  | no (implicit)   |
| Doctest     | `///` comment on a public item  | one wrapped crate per block | public API only  | no (implicit)   |

The column that drives the decision is "Sees": only unit tests reach private items, because only they are compiled
_inside_ the crate. Integration tests and doctests are external consumers and reach the public surface exactly as a
downstream crate would.

## Unit tests: `#[cfg(test)] mod tests`

Place unit tests in a child module of the file holding the code under test, annotate the module `#[cfg(test)]`, and pull
the parent into scope with `use super::*`.

```rust
pub fn add_two(a: u64) -> u64 {
    internal_adder(a, 2)
}

// Private - no `pub`. Only reachable from inside this crate.
fn internal_adder(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_two_to_input() {
        assert_eq!(add_two(2), 4);
    }

    #[test]
    fn internal_adder_sums_both_operands() {
        // Reaches the private fn: `tests` is a child module, and a child can
        // use items from its ancestors.
        assert_eq!(internal_adder(2, 2), 4);
    }
}
```

**Why `#[cfg(test)]` on the module, not just `#[test]` on the functions.** `cfg(test)` is a configuration gate: the
whole module compiles only under `cargo test`, never under `cargo build`. This keeps test code - and any helper
functions, fixture constants, and dev-only imports inside the module - out of the shipped artifact, cutting compile time
and binary size. Integration tests do not need this attribute because Cargo already compiles the `tests/` directory only
during `cargo test`.

**Why `use super::*`.** The `tests` module is an ordinary inner module subject to normal visibility rules. A child
module can reference items in its ancestor modules, so the glob brings the entire parent module - public and private -
into test scope without per-item `use` lines.

**On testing private items.** Rust's privacy rules permit it; whether you should is debated. Reserve direct
private-function tests for genuinely tricky internal logic. Default to driving private code through the public API so
the test survives refactors of the internals.

<example name="private-access-only-from-unit-tests">

**Bad - attempting to test a private function from an integration test:**

```rust
// tests/internals.rs  -- this is a SEPARATE crate
use my_crate::internal_adder; // error[E0603]: function `internal_adder` is private

#[test]
fn internal() {
    assert_eq!(internal_adder(2, 2), 4);
}
```

**Good - private logic stays in a unit test inside the source file:**

```rust
// src/lib.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn internal() {
        assert_eq!(internal_adder(2, 2), 4);
    }
}
```

</example>

## Integration tests: the `tests/` directory

Create a top-level `tests/` directory next to `src/`. Cargo compiles **each file in `tests/` as its own crate**, so a
test there reaches only the public API and must bring the crate in with `use my_crate::...` - exactly as an external
consumer would.

```
adder
|-- Cargo.toml
|-- src
|   `-- lib.rs
`-- tests
    `-- integration_test.rs
```

```rust
// tests/integration_test.rs
use adder::add_two;

#[test]
fn it_adds_two() {
    assert_eq!(add_two(2), 4);
}
```

The `use adder::add_two;` line is mandatory here and was unnecessary in unit tests: each integration file is a distinct
crate, so the library must be imported into each test crate's scope. No `#[cfg(test)]` is needed - Cargo treats the
whole directory as test-only.

**Output anatomy.** `cargo test` prints one section per source: unit tests under `Running unittests src/lib.rs`, then a
separate `Running tests/<file>.rs` section for _each_ integration file, then `Doc-tests <crate>`. Every file under
`tests/` produces its own section. **If any section fails, later sections do not run** - a failing unit test suppresses
all integration and doctest output, so a green integration run is meaningless until the unit tests pass.

**Scoping.** Run one integration file with `cargo test --test integration_test` (the file stem, no `.rs`). Run one
function by passing its name as a filter.

## Shared helpers: `tests/common/mod.rs`

When several integration files share setup, extract it - but the naive extraction creates a phantom test target.

<example name="common-helper-naming">

**Bad - `tests/common.rs`:** Cargo compiles it as its own integration crate and prints a spurious empty section, even
though it has no `#[test]` functions and is never called directly:

```
     Running tests/common.rs (target/debug/deps/common-92948b65e88960b4)

running 0 tests

test result: ok. 0 passed; 0 failed; ...
```

**Good - `tests/common/mod.rs`:** the `mod.rs`-in-subdirectory form is the older module-path convention that Rust still
understands. Files in subdirectories of `tests/` are **not** compiled as separate crates and get no output section.

```
tests
|-- common
|   `-- mod.rs
`-- integration_test.rs
```

```rust
// tests/common/mod.rs
pub fn setup() {
    // setup code shared across integration test files
}
```

```rust
// tests/integration_test.rs
use adder::add_two;

mod common; // resolves to tests/common/mod.rs

#[test]
fn it_adds_two() {
    common::setup();
    assert_eq!(add_two(2), 4);
}
```

</example>

Declare the helper in each consuming file with `mod common;` and call through the module path (`common::setup()`). The
declaration is the same `mod` statement used anywhere else; only the on-disk `mod.rs` layout differs.

## Binary crates: split `main.rs` over `lib.rs`

A project with only `src/main.rs` and no `src/lib.rs` cannot have integration tests reach its functions: a `use`
statement cannot pull items out of a binary crate, because only **library** crates expose items for external `use`.
Binary crates are meant to be run, not imported.

Fix it with the standard binary layout. Keep `src/main.rs` a thin shell that parses arguments and calls into the
library; put the real logic in `src/lib.rs`. Integration tests then exercise the library with `use my_crate::...`. If
the library is correct, the few lines in `main.rs` will work too, and that sliver needs no integration test of its own.

```rust
// src/main.rs -- thin shell
fn main() {
    my_crate::run();
}
```

```rust
// src/lib.rs -- testable logic
pub fn run() {
    // real work lives here, reachable from tests/
}
```

## Doctests: `///` examples that compile and run

Write usage examples as fenced code blocks inside `///` doc comments on public items. `rustdoc` extracts each block,
compiles it, and runs it; they double as living documentation that cannot silently drift from the code. They run under
`cargo test --doc` (and the doctest section of a plain `cargo test`).

**Preprocessing rustdoc applies to every block** (predicts what actually compiles):

- Common `allow` lints are injected (`unused_variables`, `unused_mut`, `dead_code`, and similar) so small snippets do
  not warn.
- If the block contains no `extern crate`, `extern crate <yourcrate>;` is inserted automatically.
- If the block contains no `fn main`, the whole snippet is wrapped in `fn main() { ... }`.

A doctest "passes" the same way a unit test does: it compiles and runs without panicking. Use the `assert!` family to
prove a computed result, so a regression panics and fails the doctest.

````rust
/// Adds two to the input.
///
/// # Examples
///
/// ```
/// let result = mycrate::add_two(2);
/// assert_eq!(result, 4);
/// ```
pub fn add_two(a: u64) -> u64 {
    a + 2
}
````

**Hide setup with leading `#`.** A line beginning with `#` inside a doctest is compiled but omitted from the rendered
docs. Use it to satisfy the compiler without cluttering the example. Escape a literal leading `#` (e.g. inside a string
or macro) by doubling it to `##`.

````rust
/// ```
/// # use mycrate::Config; // compiled, hidden from rendered docs
/// let cfg = Config::default();
/// assert!(cfg.is_valid());
/// ```
````

**Using `?` in a doctest.** A bare `?` fails to compile because the implicit wrapping `fn main()` returns `()`. Fix it
with a hidden `main` returning a `Result`, plus a hidden `Ok(())`:

````rust
/// ```
/// use std::io;
/// # fn main() -> io::Result<()> {
/// let mut input = String::new();
/// io::stdin().read_line(&mut input)?;
/// # Ok(())
/// # }
/// ```
````

Since 1.34 you may instead omit `main` and disambiguate the error type with a trailing hidden
`# Ok::<(), io::Error>(())` - written with `(())` and no intermediate whitespace so rustdoc recognizes the implicit
`Result`-returning wrapper.

**Edition note (2024).** Starting in the 2024 edition, compatible doctests in a crate are merged into one file before
compiling, for speed; each still runs in its own process. A test sensitive to source position (e.g. asserting on
`Location::caller().line()`) breaks under merging - mark it ` ```standalone_crate ` so it is compiled on its own.

## Doctest attribute catalog

Annotate the opening fence to change how rustdoc treats the block. Each is independent; combine with commas.

- **(none)** - compile and run; must not panic. The default; prefer it.
- **`should_panic`** - must compile and **must** panic at run time; fails if it does not panic.
- **`no_run`** - compile but do not run. Use for examples that must type-check but cannot execute in CI: network
  fetches, infinite loops, code demonstrating UB.
- **`ignore`** - neither reliably compiled nor run. Avoid: it is the bluntest option. Prefer `text` for non-Rust
  snippets or `#`-hidden setup to keep a real example. Use only as a last resort.
- **`compile_fail`** - compilation must fail; the test fails if it compiles. Documents what the API rejects. Brittle
  across compiler versions, since a future release may accept previously-rejected code.
- **`edition2015` / `edition2018` / `edition2021` / `edition2024`** - compile under the named edition rather than the
  crate's.
- **`text`** - treat the block as plain prose, not Rust; never compiled.
- **`standalone_crate`** - exempt this block from 2024-edition doctest merging; compile it on its own.

<example name="no_run-for-non-executable-examples">

**Bad - a network example that runs in CI with no network and flakily fails:**

````rust
/// ```
/// let body = mycrate::fetch("https://example.com")?;
/// ```
````

**Good - `no_run` keeps the type-check, drops the execution:**

````rust
/// ```no_run
/// let body = mycrate::fetch("https://example.com").unwrap();
/// ```
````

</example>

## Assertion macros

Pick the macro by the shape of the expectation, and attach a message only when the failure is not self-explanatory from
the values the macro already prints.

- **`assert!(cond)`** - for a boolean condition. On failure prints only `assertion failed: <expr source>`, not the
  operand values, so reserve it for genuine booleans (e.g. `larger.can_hold(&smaller)`), and add a custom message when
  the expression alone will not explain the failure.
- **`assert_eq!(a, b)` / `assert_ne!(a, b)`** - for value (in)equality. On failure they print both operands under `left`
  and `right` using `Debug`, making the cause obvious. Operands must implement `PartialEq` and `Debug`; for your own
  types this is usually `#[derive(PartialEq, Debug)]`. Order is irrelevant - Rust labels them `left`/`right`, not
  `expected`/`actual`.

```text
thread 'tests::it_adds_two' panicked at src/lib.rs:12:9:
assertion `left == right` failed
  left: 5
 right: 4
```

**Custom failure messages.** Arguments after the required ones are forwarded to `format!`, so you can interpolate
runtime values. Use a message when `assert!` would otherwise print only the source expression:

```rust
assert!(
    result.contains("Carol"),
    "greeting did not contain name, value was `{result}`"
);
```

**`should_panic` precision.** A bare `#[should_panic]` test passes if the body panics for _any_ reason, including the
wrong one. Pin it to the intended failure with `expected`, which requires the panic message to contain the substring:

```rust
#[test]
#[should_panic(expected = "less than or equal to 100")]
fn rejects_out_of_range() {
    Guess::new(200);
}
```

**`Result`-returning tests.** A test may return `Result<(), E>` and use `?` in its body, failing on the first `Err`:

```rust
#[test]
fn it_works() -> Result<(), String> {
    if add(2, 2) == 4 {
        Ok(())
    } else {
        Err(String::from("two plus two does not equal four"))
    }
}
```

`#[should_panic]` is incompatible with a `Result`-returning test. To assert an error, do **not** use `?` on the value -
assert on it directly with `assert!(value.is_err())`.

## `assert_matches!` and `debug_assert_matches!`

`std::assert_matches::assert_matches!` asserts that a value matches a pattern, and is stabilized in `std` as of Rust
**1.96**. Prefer it over `assert!(matches!(value, pattern))`: on failure it prints the `Debug` representation of the
actual value, whereas `assert!(matches!(...))` reports only that the condition was false, never _what_ the value was.

Import it explicitly - it is not in the prelude:

```rust
use std::assert_matches::assert_matches;
```

The pattern syntax is identical to a `match` arm and the `matches!` macro: alternation with `|`, bindings, and an
optional `if` guard. A second form takes a trailing custom message, like the other assert macros.

```rust
use std::assert_matches::assert_matches;

let a = Some(345);

assert_matches!(a, Some(_));
assert_matches!(a, Some(345) | None);   // alternation
assert_matches!(a, Some(x) if x > 100); // bind + guard
// assert_matches!(a, Some(x) if x < 100); // would panic, printing `Some(345)`
```

**`debug_assert_matches!`** is the same check compiled out in release builds (like `debug_assert!`). Use it for internal
invariants where the check is too costly to keep in release; use `assert_matches!` in tests, where assertions must
always run.

<example name="assert_matches-over-assert-matches-bool">

**Bad - `assert!(matches!(...))` hides the actual value on failure:**

```rust
// Failure message: `assertion failed: matches!(result, Ok(Status::Active))`
// - you never learn what `result` actually was.
assert!(matches!(result, Ok(Status::Active)));
```

**Good - `assert_matches!` prints the real value:**

```rust
use std::assert_matches::assert_matches;

// Failure message includes the Debug of `result`, e.g. `Err(Timeout)`.
assert_matches!(result, Ok(Status::Active));
```

</example>

Note: a legacy `assert_matches` crate exists from before stabilization. On Rust 1.96+ prefer the `std` macro and drop
the dependency.

## `pretty_assertions` for readable diffs

When `assert_eq!`/`assert_ne!` compare large structs or collections, the default single-line `left`/`right` dump is
nearly unreadable - the diverging field is buried in one long line. Add the `pretty_assertions` dev-dependency and
shadow the std macros inside the test module for a colored, line-by-line diff instead.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::{assert_eq, assert_ne};

    #[test]
    fn configs_match() {
        assert_eq!(actual_config(), expected_config());
    }
}
```

The `use` shadows `std`'s macros only within the test module - production code is untouched, and `pretty_assertions`
stays a dev-only dependency. Call sites do not change; only the failure rendering improves. Reserve it for multi-field
structs and collections, where the diff earns its keep; for scalar comparisons the std output is already clear.
