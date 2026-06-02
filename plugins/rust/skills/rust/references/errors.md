# Error Handling

High-resolution depth for the SKILL.md "Error Handling" section. SKILL.md states the rules; this file shows the
mechanics, the canonical templates, the library-vs-application decision, and the bad/good code for each.

## Contents

- [Result, Option, and `?` mechanics](#result-option-and--mechanics)
- [The library-vs-application split](#the-library-vs-application-split)
- [thiserror: the canonical library error type](#thiserror-the-canonical-library-error-type)
- [anyhow: application error handling](#anyhow-application-error-handling)
- [The panic / unwrap / expect policy](#the-panic--unwrap--expect-policy)
- [Error type design checklist](#error-type-design-checklist)

## Result, Option, and `?` mechanics

`Result<T, E>` is for operations that can fail with a reason the caller can interpret; `Option<T>` is for
absence-not-error (a lookup that found nothing is not a failure). Both are in the prelude, so `Ok`/`Err`/`Some`/`None`
need no path qualifier.

The `?` operator does two things in one character: on `Ok(v)`/`Some(v)` it unwraps to `v` and continues; on
`Err(e)`/`None` it returns early from the enclosing function. The early-return path makes match-and-rewrap boilerplate
unnecessary.

### `?` calls `From::from` on the error

The single most important mechanic: when `?` returns an `Err`, it passes the error through `From::from` to convert it
into the function's declared error type. A function whose error type implements `From<io::Error>` and
`From<ParseIntError>` can use `?` on both kinds of fallible call with zero conversion code. This is what thiserror's
`#[from]` generates (see below).

**Bad — manual match-and-rewrap, the pattern `?` exists to delete:**

```rust
fn read_username_from_file() -> Result<String, io::Error> {
    let mut username_file = match File::open("hello.txt") {
        Ok(file) => file,
        Err(e) => return Err(e),
    };
    let mut username = String::new();
    match username_file.read_to_string(&mut username) {
        Ok(_) => Ok(username),
        Err(e) => Err(e),
    }
}
```

**Good — `?` propagates and the standard library already provides a one-liner:**

```rust
fn read_username_from_file() -> Result<String, io::Error> {
    let mut username = String::new();
    File::open("hello.txt")?.read_to_string(&mut username)?;
    Ok(username)
}

// Or, since reading a file to a string is common, lean on the stdlib helper:
fn read_username_from_file() -> Result<String, io::Error> {
    fs::read_to_string("hello.txt")
}
```

### Where `?` is allowed

`?` requires the enclosing function's return type to be compatible with the value it is applied to (formally, the return
type must implement `FromResidual` for that residual):

- `?` on a `Result` requires the function to return `Result` (or another `FromResidual` type).
- `?` on an `Option` requires the function to return `Option`.
- You cannot mix the two. `?` will not convert `Result` to `Option` or vice versa. Bridge explicitly with `Result::ok`
  (Result -> Option) or `Option::ok_or` / `ok_or_else` (Option -> Result) before applying `?`.

**Bad — `?` in a `()`-returning `main` does not compile:**

```rust
fn main() {
    let f = File::open("hello.txt")?; // error: the `?` operator can only be used in a function that returns Result
}
```

**Good — `main` returns `Result`, so `?` works and the process exit code reflects success/failure:**

```rust
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let f = File::open("hello.txt")?;
    Ok(())
}
```

A `main` returning `Result<(), E>` exits `0` on `Ok(())` and nonzero on `Err`, printing the error's `Debug`
representation. `Box<dyn Error>` means "any error"; it keeps the signature correct as new error kinds are added to the
body. Any type implementing `std::process::Termination` is a valid `main` return type.

### `?` on `Option`

```rust
fn last_char_of_first_line(text: &str) -> Option<char> {
    text.lines().next()?.chars().last()
}
```

`next()?` returns `None` early from the whole function when there is no first line; otherwise it yields the line and the
chain continues. This is the `Option` analogue of error propagation.

## The library-vs-application split

The choice of error representation is driven by who consumes the error and whether they branch on its kind.

| Concern             | Library / crate boundary               | Application / binary             |
| :------------------ | :------------------------------------- | :------------------------------- |
| Crate role          | reusable code others call              | top-level `main`, glue, scripts  |
| Error shape         | one typed enum per module/crate        | one opaque `anyhow::Error`       |
| Caller matches kind | yes — distinct variants                | no — report and exit             |
| Tool                | `thiserror` derive                     | `anyhow` (or `eyre`)             |
| Public API          | error type is part of the stable API   | error type never crosses the API |
| New failure mode    | new enum variant (`#[non_exhaustive]`) | just `?` a new fallible call     |

The rule from the ecosystem (stated in thiserror's own docs, which point to anyhow for application code): use thiserror
when you want a dedicated error type so callers can handle different failures differently; use anyhow when you do not
care what error type the function returns, only that it propagates and reports well.

A crate can use both: thiserror for its own typed errors, and an `#[error(transparent)] Other(#[from] anyhow::Error)`
variant to absorb arbitrary upstream errors. Conversely, `anyhow::Error` accepts any `std::error::Error`, including your
thiserror enums, so a binary built on thiserror libraries does not have to abandon typed errors at the boundary.

## thiserror: the canonical library error type

`thiserror` is a derive macro for `std::error::Error`. It generates the same impls you would write by hand, so it does
not appear in your public API — switching to or from it by hand is not a breaking change. Errors may be enums, structs
with named fields, tuple structs, or unit structs.

### Canonical enum template

This one template exercises every attribute a library error type normally needs: a plain message variant, an
interpolated-field variant, a `#[from]` source-converting variant, an explicit `#[source]`, and an
`#[error(transparent)]` catch-all.

```rust
use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
#[non_exhaustive] // lets you add variants later without a breaking change
pub enum ConfigError {
    /// Plain message; no interpolation, no source.
    #[error("configuration is empty")]
    Empty,

    /// Interpolated fields. `{path}` -> self.path, `{0}` -> self.0 (tuple field).
    #[error("missing required key `{key}` in section `{section}`")]
    MissingKey { section: String, key: String },

    /// `#[from]` generates `impl From<io::Error> for ConfigError` AND implements
    /// `Error::source()` for this field. `?` on any `io::Error` now lands here.
    /// A `#[from]` variant must hold ONLY the source (plus an optional backtrace).
    #[error("failed to read config file")]
    Io(#[from] io::Error),

    /// Explicit `#[source]`: the variant carries its own message PLUS a wrapped
    /// cause that shows up in the error chain, but does NOT auto-generate `From`.
    #[error("could not parse `{path}`")]
    Parse {
        path: String,
        #[source]
        source: toml::de::Error,
    },

    /// `transparent` forwards both Display and source() straight to the inner
    /// error, adding no message of its own. Pair with `#[from]` for an
    /// "anything else" variant. The variant must hold exactly one field.
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}
```

### Attribute semantics

- **`#[error("...")]`** — generates the `Display` impl. `{field}` interpolates a named field; `{0}` a tuple field;
  `{field:?}` / `{0:?}` use `Debug`. Extra format args may be arbitrary expressions, and inside them a field is
  referenced as `.field` or `.0`: `#[error("bad index {idx}, max {}", .limits.hi)]`.
- **`#[from]`** — generates `From<SourceError>` for the enum, so `?` auto-converts that source into this variant. It
  _implies_ `#[source]` (the same field becomes the chain's cause), so never write both. The variant holds only the
  source field (and optionally a `Backtrace`).
- **`#[source]`** — marks the field returned by `Error::source()` without generating any `From`. Use it when the variant
  has its own context fields (like `path` above) and must not be constructible by a bare `?`. A field literally named
  `source` is picked up automatically without the attribute.
- **`#[error(transparent)]`** — delegates `Display` and `source()` to the single wrapped error, adding no message. Two
  uses: an "anything else" enum variant, and wrapping a private `ErrorRepr` enum behind an opaque public newtype so the
  representation can evolve without breaking the API.
- **`Backtrace`** — a field of type `std::backtrace::Backtrace` is auto-detected and surfaced via `Error::provide()`.
  Backtrace support and the `#[backtrace]` attribute require a **nightly** toolchain (`Error::provide` /
  `error_generic_member_access` is still unstable on stable Rust as of 1.96) — do not rely on it in stable-targeted
  crates.

### `#[from]` vs `#[source]` — when each is wrong

**Bad — `#[from]` where two different upstream calls return the same source type:**

```rust
#[derive(Debug, Error)]
pub enum LoadError {
    #[error("io failure")]
    Io(#[from] io::Error), // both the read AND the write below funnel here
}
// Now `read(...)?` and `write(...)?` are indistinguishable in the error: the
// caller cannot tell which operation failed. `#[from]` collapsed the context.
```

**Good — keep the convenience `#[from]` only where the source uniquely identifies the failure; otherwise add context
with `#[source]` and a `.map_err`:**

```rust
#[derive(Debug, Error)]
pub enum LoadError {
    #[error("failed to read {path}")]
    Read {
        path: String,
        #[source]
        source: io::Error,
    },
    #[error("failed to write {path}")]
    Write {
        path: String,
        #[source]
        source: io::Error,
    },
}

fn load(path: &str) -> Result<Vec<u8>, LoadError> {
    let bytes = fs::read(path).map_err(|source| LoadError::Read { path: path.into(), source })?;
    // ...
    Ok(bytes)
}
```

The trade-off: `#[from]` is ergonomic (bare `?`) but loses the call-site context that distinguishes two failures of the
same type; `#[source]` keeps the context at the cost of a `.map_err` at the call site. Choose `#[from]` when the source
type maps to exactly one logical failure; choose `#[source]` when you need per-call-site context.

### Opaque-wrapper pattern (stable public API)

When the internal error representation should be free to change without breaking downstream crates, expose an opaque
newtype and keep the real enum private:

```rust
// Public, opaque, easy to keep semver-compatible.
#[derive(Debug, Error)]
#[error(transparent)]
pub struct ParseError(#[from] ErrorRepr);

impl ParseError {
    pub fn line(&self) -> usize { /* expose only what you choose */ }
}

// Private; variants may be added/removed freely across minor versions.
#[derive(Debug, Error)]
enum ErrorRepr {
    #[error("unexpected token at line {line}")]
    UnexpectedToken { line: usize },
    #[error(transparent)]
    Io(#[from] io::Error),
}
```

## anyhow: application error handling

`anyhow::Error` is a trait-object-based error wrapping any type that implements `std::error::Error` (including your
thiserror enums). Use `anyhow::Result<T>` (an alias for `Result<T, anyhow::Error>`) as the return type of fallible
application functions, then `?` everything.

```rust
use anyhow::Result;

fn get_cluster_info() -> Result<ClusterMap> {
    let config = std::fs::read_to_string("cluster.json")?;
    let map: ClusterMap = serde_json::from_str(&config)?;
    Ok(map)
}
```

### Context: `.context()` and `.with_context()`

A bare low-level error ("No such file or directory") is hard to debug because it omits the high-level operation in
flight. Attach context at each layer so the printed error reads as a chain from intent down to root cause.

- **`.context(msg)`** — attaches a static or already-computed message. The argument is evaluated eagerly (even on the
  `Ok` path), so use it only for cheap values.
- **`.with_context(|| ...)`** — attaches a lazily-computed message; the closure runs only on the `Err` path. Use it
  whenever building the message allocates or formats (the common case for including a path or id).

**Bad — eager `format!` runs on every success too, and the error has no context:**

```rust
let content = std::fs::read(path).context(format!("Failed to read {}", path.display()))?;
//                                ^^^^^^^^ allocates the string even when read() succeeds
```

**Good — lazy closure pays the formatting cost only when it actually fails:**

```rust
use anyhow::{Context, Result};

fn main() -> Result<()> {
    let content = std::fs::read(path)
        .with_context(|| format!("Failed to read instrs from {}", path.display()))?;
    // ...
    Ok(())
}
```

Printed (via the `Debug` formatting that `main -> Result` uses):

```text
Error: Failed to read instrs from ./path/to/instrs.json

Caused by:
    No such file or directory (os error 2)
```

### One-off errors and early returns

- **`anyhow!("...")`** — construct an ad-hoc `anyhow::Error` from a format string (or wrap a non-anyhow error value):
  `return Err(anyhow!("missing attribute: {missing}"));`
- **`bail!("...")`** — shorthand for `return Err(anyhow!(...))`: `bail!("missing attribute: {missing}");`
- **`ensure!(cond, "...")`** — early-return an error if a condition is false, analogous to `assert!` but recoverable.

### Recovering a typed error from anyhow

The application layer is opaque by default, but you can still branch on a specific underlying error by downcasting (by
value, shared ref, or mutable ref):

```rust
match err.downcast_ref::<DataStoreError>() {
    Some(DataStoreError::Censored(_)) => Ok(Poll::Ready(REDACTED_CONTENT)),
    _ => Err(err),
}
```

### Backtraces

On Rust >= 1.65, anyhow captures a backtrace if the underlying error does not already provide one. Surfacing it is
controlled by environment variables: `RUST_BACKTRACE=1` (panics and errors), `RUST_LIB_BACKTRACE=1` (errors only),
`RUST_BACKTRACE=1` + `RUST_LIB_BACKTRACE=0` (panics only).

### Putting the split together

**Good — typed errors inside a library, anyhow at the binary's edge, context added per layer:**

```rust
// --- library crate: typed, matchable ---
#[derive(Debug, Error)]
pub enum StoreError {
    #[error("key `{0}` not found")]
    NotFound(String),
    #[error("backend unavailable")]
    Backend(#[from] io::Error),
}

pub fn fetch(key: &str) -> Result<Vec<u8>, StoreError> { /* ... */ }

// --- application crate: anyhow, contextual, report-and-exit ---
use anyhow::{Context, Result};

fn run(key: &str) -> Result<()> {
    let data = store::fetch(key)            // StoreError -> anyhow::Error via `?`
        .with_context(|| format!("loading record {key}"))?;
    process(&data).context("processing fetched record")?;
    Ok(())
}

fn main() -> Result<()> {
    run("alpha")
}
```

## The panic / unwrap / expect policy

A panic means "stop the program: a bug or unmet invariant was hit." It is not a recoverable-error channel. Genuinely
fallible operations (parsing, I/O, user input, network) return `Result`; never panic to signal something the caller
could handle, and never assume a panic will be caught.

`.unwrap()` and `.expect()` both panic on `Err`/`None`. They are permitted only in three situations:

1. On a **provable invariant** — you can prove from surrounding code that the value cannot be `Err`/`None`. Use
   `.expect("why this cannot fail")` so the message documents the proof.
2. Inside `const` contexts, where no `Result`-returning alternative exists.
3. In tests and examples, where a panic is the correct way to fail the run.

They are never a substitute for `?`.

### `expect` messages document the invariant, not the failure

The idiom (the "expect-as-precondition" pattern): the message states _why this cannot fail_, phrased so that if it ever
does fail, the panic text is the debugging lead. Prefer `expect` over `unwrap` in production-quality code for this
reason.

**Bad — `unwrap` as lazy propagation; a real I/O failure becomes an opaque crash:**

```rust
fn load_config() -> Config {
    let text = std::fs::read_to_string("config.toml").unwrap(); // panics on any I/O error
    toml::from_str(&text).unwrap()                              // panics on any parse error
}
```

**Good — fallible work returns `Result`; the only `expect` documents a genuine compile-time-known invariant:**

```rust
fn load_config(path: &Path) -> Result<Config, ConfigError> {
    let text = std::fs::read_to_string(path)?;
    let config = toml::from_str(&text)?;
    Ok(config)
}

// `expect` is justified here: the regex is a hard-coded literal, so a failure
// to compile it is a programmer bug, not a runtime condition.
static SEMVER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\d+\.\d+\.\d+$").expect("hard-coded SEMVER regex is a valid pattern")
});
```

### Bug vs error

A detected programming bug (index out of range on a slice you just built, a `match` arm that "can't happen") should
panic — it is not an `Error` variant. Reserve `Result` for conditions outside the program's control. Encoding a bug as a
recoverable error pushes impossible cases onto every caller; encoding a recoverable error as a panic crashes a program
that could have continued.

### Prefer making invalid states uncompilable

The strongest move removes the failure mode entirely. A `NonEmptyVec` whose constructor is the only way in, or a parsed
`Email` newtype, turns a pervasive runtime check into a single validated boundary — downstream code never re-checks and
never panics.

**Bad — every consumer must re-validate a raw `String`, and forgetting to is a latent panic/logic bug:**

```rust
fn send(to: String) { /* assumes `to` is a valid address; nothing enforces it */ }
```

**Good — validate once at the boundary; the type guarantees the invariant thereafter:**

```rust
pub struct Email(String);

impl Email {
    pub fn parse(raw: &str) -> Result<Self, EmailError> {
        if raw.contains('@') { Ok(Self(raw.to_owned())) } else { Err(EmailError::Missing) }
    }
}

fn send(to: Email) { /* `to` is provably a valid Email; no runtime check, no panic */ }
```

## Error type design checklist

A library error type composes well only if it satisfies the standard trait surface:

- **`std::error::Error`** — implemented (derive via thiserror); enables `source()` chaining and `Box<dyn Error>`
  interop.
- **`Display`** — a human-readable, lowercase, no-trailing-period message (generated by `#[error("...")]`).
- **`Debug`** — derived; required by the `Error` trait and used when a `Result`-returning `main` prints the error.
- **`Send + Sync + 'static`** — so the error crosses thread boundaries and slots into `anyhow::Error` and
  `Box<dyn Error + Send + Sync>`. A non-`Send` source field (for example one holding an `Rc`) silently makes the whole
  enum non-`Send`; keep sources thread-safe.
- **`source()` populated** — via `#[from]` or `#[source]` so the full causal chain prints under `Caused by:`.
- **Message hygiene** — error messages do not end with punctuation and are not capitalized, because they are composed
  into larger sentences and chains.
- **`#[non_exhaustive]`** on public error enums — lets you add variants later without a breaking change; forces
  downstream `match` to keep a wildcard arm.
