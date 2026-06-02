# API Guidelines Review Rubric

High-resolution depth for the `rust` skill. SKILL.md states the terse rules (RFC 430 casing, eager derives, the
`as_`/`to_`/`into_` cost prefixes); this file is the **review rubric**: the full Rust API Guidelines `C-*` checklist
grouped by category, run before finalizing any public type, trait, or function, plus extended bad/good examples and the
decision tables for `#[non_exhaustive]`, `#[must_use]`, and the common-trait derives.

Source of truth: the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) checklist and naming chapter.
Run this rubric against the **public** surface only - private items have no compatibility contract and need not satisfy
naming-for-callers or future-proofing rules.

## Contents

- [How to run the rubric](#how-to-run-the-rubric)
- [The C-\* checklist by category](#the-c--checklist-by-category)
- [Naming (RFC 430) in depth](#naming-rfc-430-in-depth)
- [C-COMMON-TRAITS: the derive catalog](#c-common-traits-the-derive-catalog)
- [#[non_exhaustive] for evolvable types](#non_exhaustive-for-evolvable-types)
- [#[must_use] placement](#must_use-placement)
- [Type-safety and future-proofing examples](#type-safety-and-future-proofing-examples)
- [Edge cases and judgment calls](#edge-cases-and-judgment-calls)

## How to run the rubric

The checklist is a gate the public API passes before a type or trait is finished. For each new or changed public item,
walk the relevant category and confirm each `C-*` holds, or record why it is waived. Most items map to a one-line yes/no
judgment; the ones with depth (`C-CASE`, `C-CONV`, `C-COMMON-TRAITS`, `C-NEWTYPE`, `C-SEALED`, `C-STRUCT-PRIVATE`) have
dedicated sections below.

When **reviewing**, cite the `C-*` id and the rule, then show the corrected signature inline - do not lecture in the
abstract. When **writing**, satisfy these silently; do not narrate "per C-GETTER I will omit `get_`".

## The C-\* checklist by category

The guidelines group into nine categories. Each entry is the `C-*` id, the rule, and the failure it prevents.

### Naming (crate aligns with Rust naming conventions)

- **C-CASE** - casing conforms to RFC 430; see [Naming in depth](#naming-rfc-430-in-depth).
- **C-CONV** - ad-hoc conversion methods are prefixed `as_` (free borrow view), `to_` (expensive), `into_` (consuming);
  see the [cost table](#c-conv-the-conversion-cost-table).
- **C-GETTER** - getters omit `get_`: `fn first(&self) -> &First`, not `get_first`. Use bare `get` only when one obvious
  value is gotten (`Cell::get`). Unsafe bounds-skipping variants are `get_unchecked` / `get_unchecked_mut`.
- **C-ITER** - collection methods that produce iterators are `iter` (`&U`), `iter_mut` (`&mut U`), `into_iter` (`U`).
  Applies to conceptually homogeneous collections and to methods, not free functions.
- **C-ITER-TY** - the iterator type name matches the producing method: `into_iter` returns `IntoIter`, `iter` returns
  `Iter`, `keys` returns `Keys`. Name these inside their owning module (`vec::IntoIter`).
- **C-FEATURE** - Cargo feature names carry no placeholder words: `serde`, not `use-serde` or `with-serde`; `std`, not
  `use-std`. Features are additive, so a negative name like `no-std` as a feature is wrong.
- **C-WORD-ORDER** - type names use one consistent word order, matching std: `ParseAddrError` (verb-object-error) to
  match `ParseIntError`, not `AddrParseError`. The exact order is free; consistency within the crate is the rule.

### Interoperability (crate interacts nicely with other libraries)

- **C-COMMON-TRAITS** - eagerly derive `Copy`, `Clone`, `Eq`, `PartialEq`, `Ord`, `PartialOrd`, `Hash`, `Debug`,
  `Display`, `Default` wherever semantics allow; see the [derive catalog](#c-common-traits-the-derive-catalog).
- **C-CONV-TRAITS** - conversions use the std traits `From`, `TryFrom`, `AsRef`, `AsMut` so generic code and `?`
  interoperate. `From` gives `Into` for free and `TryFrom` gives `TryInto` — never implement `Into`/`TryInto` directly,
  and never write an ad-hoc `to_foo`/`from_foo` where a trait fits.
- **C-COLLECT** - collection types implement `FromIterator` (enables `.collect()`) and `Extend` (enables `.extend()`).
- **C-SERDE** - data structures implement Serde `Serialize`/`Deserialize`, gated behind an optional `serde` feature so
  the dependency is not forced on users who do not need it.
- **C-SEND-SYNC** - types are `Send` and `Sync` wherever the data allows. These are auto-derived; review only when a raw
  pointer or `!Send` field forces a negative answer, and document why.
- **C-GOOD-ERR** - error types are meaningful and well-behaved: implement `Error` + `Display` + `Debug`, are
  `Send + Sync + 'static`, and their `Display` is a useful one-line message (lowercase, no trailing period). See the
  `errors.md` reference for the full error-type contract.
- **C-NUM-FMT** - numeric wrapper types that are bit-meaningful implement `LowerHex`/`UpperHex`, `Octal`, `Binary`.
- **C-RW-VALUE** - generic functions reading or writing take `R: Read` / `W: Write` **by value**, not `&mut R`; the
  blanket `impl Read for &mut R` lets callers still pass a reference when they want.

### Macros (crate presents well-behaved macros)

- **C-EVOCATIVE** - macro input syntax evokes the generated output (a struct-defining macro looks like a struct).
- **C-MACRO-ATTR** - macros compose with attributes; forward `#[derive(...)]`, `#[cfg(...)]`, doc comments to the items
  they emit.
- **C-ANYWHERE** - item-producing macros work anywhere an item is allowed (module scope, inside `fn`, inside a block).
- **C-MACRO-VIS** - item macros accept a visibility specifier (`pub`) on the items they declare.
- **C-MACRO-TY** - type position in a macro accepts `$t:ty` fragments, not just bare identifiers, so callers can pass
  paths and generics.

### Documentation (crate is abundantly documented)

- **C-CRATE-DOC** - crate-root `//!` docs are thorough and include a runnable example.
- **C-EXAMPLE** - every public item carries a rustdoc example. See `documentation.md` for rustdoc conventions.
- **C-QUESTION-MARK** - doc examples use `?` for fallibility, never `try!`, never `.unwrap()`.
- **C-FAILURE** - function docs include `# Errors` (what a `Result` returns on failure), `# Panics` (when it can panic),
  and `# Safety` (invariants for an `unsafe fn`).
- **C-LINK** - prose hyperlinks related items with intra-doc links (`[`Type`]`, `[`mod::func`]`).
- **C-METADATA** - `Cargo.toml` declares `authors`, `description`, `license`, `homepage`, `documentation`, `repository`,
  `keywords`, `categories`.
- **C-RELNOTES** - release notes / CHANGELOG document every significant change so users can audit upgrades.
- **C-HIDDEN** - `#[doc(hidden)]` hides implementation details that leak into rustdoc but are not part of the contract.

### Predictability (legible code that acts how it looks)

- **C-SMART-PTR** - smart pointers add no inherent methods; methods live on the pointee so `Deref` does not collide. Use
  associated functions (`Rc::clone(&x)`) for pointer-level operations.
- **C-CONV-SPECIFIC** - a conversion lives on the more specific of the two types involved (the wrapper, not the
  primitive).
- **C-METHOD** - a function with a clear receiver is a method (`self`), not a free function taking the receiver as an
  argument.
- **C-NO-OUT** - functions return their output; they do not take `&mut` out-parameters to fill. Return a tuple or a
  struct for multiple outputs.
- **C-OVERLOAD** - operator overloads (`Add`, `Mul`, ...) match the mathematical/intuitive meaning; never overload an
  operator to do something surprising.
- **C-DEREF** - only smart pointers implement `Deref`/`DerefMut`. Do not use `Deref` to fake inheritance or to expose a
  field's methods on a wrapper.
- **C-CTOR** - constructors are static inherent methods (`Foo::new`, `Foo::with_capacity`), not free functions or `From`
  impls dressed up as constructors.

### Flexibility (supports diverse real-world use)

- **C-INTERMEDIATE** - functions expose intermediate results to avoid duplicate work (e.g. return the parsed value and
  the consumed length, not just the value).
- **C-CALLER-CONTROL** - the caller decides where to copy and place data: take `&str`/`&[T]` and let the caller own
  allocation, rather than allocating internally and returning owned data the caller may not need.
- **C-GENERIC** - functions minimize assumptions by accepting generics (`impl AsRef<Path>`, `impl IntoIterator`) in
  argument position, widening the set of callable types.
- **C-OBJECT** - a trait that may be useful as a trait object is kept object-safe (no generic methods, no `Self` by
  value, no associated consts) so `dyn Trait` works.

### Type safety (leverages the type system)

- **C-NEWTYPE** - newtypes give static distinctions; see the [examples](#type-safety-and-future-proofing-examples).
- **C-CUSTOM-TYPE** - arguments convey meaning through types, not `bool` or `Option`. A bare `bool` parameter at a call
  site is unreadable (`set(true, false)`); a two-variant enum names each state.
- **C-BITFLAG** - a set of flags is a `bitflags!`-generated type, not a C-style enum, so combinations are representable.
- **C-BUILDER** - complex values are constructed with a builder; see the builder rules below and in `idioms.md`.

### Dependability (unlikely to do the wrong thing)

- **C-VALIDATE** - functions validate their arguments, preferring static validation (parse into a type that cannot be
  invalid) over runtime checks, and runtime checks over no checks.
- **C-DTOR-FAIL** - destructors (`Drop`) never fail. A `drop` that can fail (flush, close) also exposes an explicit
  fallible method (`close(self) -> Result<()>`) so the caller can observe the error.
- **C-DTOR-BLOCK** - a destructor that may block exposes a non-blocking alternative for callers who cannot block in
  `drop`.

### Debuggability (conducive to easy debugging)

- **C-DEBUG** - every public type implements `Debug`. This is the most-violated interoperability rule in AI-written
  code; deriving `Debug` is nearly always correct and unblocks `dbg!`, `assert_eq!`, and `#[derive(Debug)]` on holders.
- **C-DEBUG-NONEMPTY** - the `Debug` representation is never empty: a value always prints something, even if just the
  type name, so logs are not silently blank.

### Future proofing (free to improve without breaking users)

- **C-SEALED** - sealed traits prevent downstream implementations; see [the pattern](#c-sealed-sealing-a-trait).
- **C-STRUCT-PRIVATE** - public structs keep fields private and expose accessors, so adding a field or changing
  representation is non-breaking. Public fields are a permanent API commitment.
- **C-NEWTYPE-HIDE** - newtypes hide implementation types that would otherwise leak (return `struct Iter(...)` wrapping
  a complex iterator type, not the raw `Map<Filter<...>>`).
- **C-STRUCT-BOUNDS** - data structures do **not** repeat derived trait bounds on the struct definition; put `T: Trait`
  bounds on the `impl`, not the `struct`, so the struct stays usable with non-conforming `T`.

### Necessities (to whom they matter, they really matter)

- **C-STABLE** - every public dependency of a 1.0 crate is itself 1.0; do not expose a pre-1.0 type in your public API.
- **C-PERMISSIVE** - the crate and its dependencies carry a permissive license (commonly `MIT OR Apache-2.0`). Gate this
  with `cargo deny check licenses`.

## Naming (RFC 430) in depth

### C-CASE: casing table

RFC 430 maps each construct to a casing. Acronyms and compound contractions count as **one word** in `UpperCamelCase`
(`Uuid`, `Stdin`, `Usize`) and are lower-cased in `snake_case` (`is_xid_start`). In `snake_case` /
`SCREAMING_SNAKE_CASE`, a "word" is never a single letter unless it is the last word: `btree_map`, not `b_tree_map`; but
`PI_2`, not `PI2`.

- **Modules, functions, methods, local variables** - `snake_case`
- **Types, traits, enum variants** - `UpperCamelCase`
- **Statics, constants** - `SCREAMING_SNAKE_CASE`
- **Macros** - `snake_case!`
- **General constructors** - `new`, or `with_more_details` for a parameterized one
- **Conversion constructors** - `from_some_other_type`
- **Type parameters** - concise `UpperCamelCase`, usually a single uppercase letter (`T`, `K`, `V`)
- **Lifetimes** - short lowercase, usually one letter (`'a`, `'de`, `'src`)
- **Crate names** - never suffixed/prefixed `-rs` or `-rust`; every crate is Rust

```rust
// Bad: acronym treated as multiple words; get_ prefix; SCREAMING for a const that uses PI2 form.
pub struct HTTPClient { /* ... */ }
pub struct UUID(u128);
impl HTTPClient {
    pub fn get_timeout(&self) -> Duration { /* ... */ }
}
pub const PI2: f64 = std::f64::consts::TAU;

// Good: acronyms are one word; getter drops get_; const word boundary is correct.
pub struct HttpClient { /* ... */ }
pub struct Uuid(u128);
impl HttpClient {
    pub fn timeout(&self) -> Duration { /* ... */ }
}
pub const PI_2: f64 = std::f64::consts::TAU;
```

### C-CONV: the conversion cost table

The prefix is a promise about cost and ownership. The wrong one misleads every caller about runtime cost.

| Prefix  | Cost      | Ownership flow                                                         | std example          |
| :------ | :-------- | :--------------------------------------------------------------------- | :------------------- |
| `as_`   | Free      | borrowed -> borrowed (a view into the representation)                  | `str::as_bytes`      |
| `to_`   | Expensive | borrowed -> borrowed; borrowed -> owned (non-`Copy`); `Copy` -> `Copy` | `str::to_lowercase`  |
| `into_` | Variable  | owned -> owned (non-`Copy`); consumes `self`                           | `String::into_bytes` |

Subtleties from std that catch agents:

- `Path::to_str` is `to_`, not `as_`, because it runs a UTF-8 validation pass - nontrivial cost forbids `as_`.
- `BufWriter::into_inner` is `into_`, and its potentially expensive flush is acceptable: `into_` cost is "variable".
  `BufReader::into_inner` is also `into_` but cheap - the prefix marks consumption, not a cost guarantee.
- A `to_`/`into_` on a `Copy` scalar takes the value, not a reference: `f64::to_radians(self)`, because `&f64` buys
  nothing. Naming it `into_radians` would lie, since the input is not conceptually consumed.
- When a wrapper associates one inner value with higher-level semantics, expose the inner value via `into_inner()`
  (`BufReader`, `AtomicBool`, `GzDecoder`).
- If `mut` is part of the returned type, it appears where it would in the type: `as_mut_slice` (returns `&mut [T]`),
  preferred over `as_slice_mut`.

```rust
// Bad: as_ implies free, but this allocates and computes.
impl Celsius {
    pub fn as_fahrenheit(&self) -> Fahrenheit { /* arithmetic + new allocation-free struct */ }
    pub fn as_label(&self) -> String { format!("{} C", self.0) } // allocates -> not as_
}

// Good: arithmetic on a Copy scalar consumes by value (to_); allocation is to_.
impl Celsius {
    pub fn to_fahrenheit(self) -> Fahrenheit { /* ... */ }
    pub fn to_label(&self) -> String { format!("{} C", self.0) }
}
```

### C-GETTER, C-ITER, C-ITER-TY: accessor and iterator names

```rust
pub struct Grid { cells: Vec<Cell> }

impl Grid {
    // C-GETTER: no get_ prefix; mut variant carries mut adjacent to what it returns.
    pub fn origin(&self) -> &Cell { &self.cells[0] }
    pub fn origin_mut(&mut self) -> &mut Cell { &mut self.cells[0] }

    // C-ITER: the three-method group, matching ownership of the yielded item.
    pub fn iter(&self) -> Iter<'_> { /* yields &Cell */ }
    pub fn iter_mut(&mut self) -> IterMut<'_> { /* yields &mut Cell */ }
}

// C-ITER-TY: type names mirror the producing method.
pub struct Iter<'a> { /* Iterator<Item = &'a Cell> */ }
pub struct IterMut<'a> { /* Iterator<Item = &'a mut Cell> */ }
pub struct IntoIter { /* Iterator<Item = Cell> */ }
```

`C-ITER` is for conceptually homogeneous collections only. `str` is bytes-guaranteed-UTF-8, so it offers `bytes()` and
`chars()` instead of an `iter` group, because there is no single obvious element type. Free functions that return
iterators (e.g. a `percent_encode` function) are exempt from the `iter`/`iter_mut`/`into_iter` naming - but still name
their iterator type after themselves (`PercentEncode`).

### C-WORD-ORDER: consistent word order

Std error types use verb-object-error order: `ParseIntError`, `ParseFloatError`, `StripPrefixError`, `JoinPathsError`. A
new "address failed to parse" error is `ParseAddrError`, not `AddrParseError`, to match. The order itself is a free
choice; pick one and hold it across the whole crate.

## C-COMMON-TRAITS: the derive catalog

Eagerly derive these where the type's semantics allow. The default for nearly every public data type is
`#[derive(Debug, Clone, PartialEq, Eq, Hash)]`, adding `Copy`, `Ord`, `Default`, and a manual `Display` as fit. A
missing derive is a silent interoperability hole: callers cannot use your type as a `HashMap` key, `assert_eq!` it, or
`#[derive(Debug)]` a struct that holds it.

### When each trait fits

- **Debug** - derive on every public type, always (C-DEBUG). The one near-universal derive.
- **Clone** - derive when duplication is meaningful and all fields are `Clone`. Omit for handles to unique resources (a
  file lock, a one-shot sender).
- **Copy** - add only for small, plain-old-data types where a bitwise copy is correct and cheap (coordinates, small
  enums, newtypes over scalars). Never `Copy` a type owning heap data; never `Copy` a type with move-only semantics.
  `Copy` requires `Clone`.
- **PartialEq / Eq** - derive `PartialEq` for value types. Add `Eq` only when equality is total and reflexive - types
  containing `f64`/`f32` get `PartialEq` but **not** `Eq` (NaN breaks reflexivity).
- **Hash** - derive when the type is a sensible map/set key. Must agree with `Eq`: `a == b` implies
  `hash(a) == hash(b)`. So a type without `Eq` (e.g. float-containing) should not derive `Hash`.
- **PartialOrd / Ord** - derive when there is a meaningful ordering. `Ord` requires `Eq`; float-containing types get
  `PartialOrd` only. Derived order is lexicographic by field declaration order - reorder fields deliberately or hand-
  write `Ord` if the field order is not the sort priority.
- **Default** - derive when a zero/empty value is genuinely meaningful and unambiguous. Do not invent a `Default` for a
  type that has no natural default (a `Connection` to a required URL).
- **Display** - never derived; implement by hand only for types meant to be read by humans (errors, string-like
  wrappers). Most types need only `Debug`.

### Derive decision matrix

Columns are the question to answer; a row is a type shape. This is a genuine 2D lookup (type shape x trait).

| Type shape                         | Copy | Clone | Eq  | Hash | Ord | Default     |
| :--------------------------------- | :--- | :---- | :-- | :--- | :-- | :---------- |
| Scalar newtype (`struct Id(u64)`)  | yes  | yes   | yes | yes  | yes | maybe       |
| Plain struct, all `Eq` fields      | no\* | yes   | yes | yes  | yes | maybe       |
| Struct containing `f64`            | no   | yes   | no  | no   | no  | maybe       |
| Owns heap data (`Vec`, `String`)   | no   | yes   | yes | yes  | yes | yes         |
| Holds a unique resource (file, fd) | no   | no    | no  | no   | no  | no          |
| Field-less enum (C-like)           | yes  | yes   | yes | yes  | yes | one variant |

\* `Copy` for a plain struct is allowed only when every field is `Copy` and a bitwise copy is the intended semantics;
default to leaving it off unless the type is conceptually a small value.

```rust
// Bad: a public type with no derives - uninspectable, uncomparable, unusable as a key.
pub struct Point { pub x: i32, pub y: i32 }

// Good: small POD value gets the full eager set.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Default)]
pub struct Point { pub x: i32, pub y: i32 }

// Good: float-containing type stops at PartialEq/PartialOrd (NaN is not reflexive).
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Default)]
pub struct Vec2 { pub x: f64, pub y: f64 }
```

## #[non_exhaustive] for evolvable types

`#[non_exhaustive]` marks a public enum, struct, or variant as open to future extension, forcing downstream crates to
account for additions. Adding a variant or field to a `#[non_exhaustive]` type is a **non-breaking** change; doing the
same to a normal type is a breaking change. Apply it when the type will grow but you want semver-minor freedom.

What it forces on downstream crates (it has no effect within the defining crate):

- A `#[non_exhaustive]` enum cannot be matched without a wildcard arm - every `match` must end in `_ => ...`.
- A `#[non_exhaustive]` struct cannot be constructed with a struct literal or destructured exhaustively; callers use a
  constructor and the functional-update / `..` rest pattern.

```rust
// Public error enum that will gain variants over time.
#[non_exhaustive]
#[derive(Debug)]
pub enum ConfigError {
    NotFound,
    Parse(String),
}

// Downstream code is forced to handle future variants:
match err {
    ConfigError::NotFound => { /* ... */ }
    ConfigError::Parse(msg) => { /* ... */ }
    _ => { /* new variants land here, no breakage */ }
}

// Config struct that may gain fields. Callers cannot build it with a literal,
// so a new field does not break them.
#[non_exhaustive]
#[derive(Debug, Clone, Default)]
pub struct Config {
    pub retries: u32,
    pub timeout_ms: u64,
}
```

### Apply / skip decision

- **Apply** to public error enums (almost always - error variants accrete), to config/option structs that will grow, and
  to event/message enums that model an evolving protocol.
- **Apply** to a single variant (`#[non_exhaustive] Variant { .. }`) when that variant's fields will grow but the
  variant set is fixed.
- **Skip** for closed sets that are complete by definition - `enum Direction { North, South, East, West }`, a binary
  `enum Endianness { Big, Little }`. Forcing a `_` arm on a genuinely exhaustive enum just hides missing-variant bugs.
- **Skip** for structs whose fields are inherently the entire contract (a `Point { x, y }`); making it
  `#[non_exhaustive]` blocks the natural literal construction for no gain.
- **Trade-off:** `#[non_exhaustive]` costs downstream ergonomics (forced wildcard, no literal construction). Use it
  where evolvability outweighs that cost, not reflexively.

## #[must_use] placement

`#[must_use]` makes the compiler warn when a return value is dropped without use. It catches the class of "called a pure
function and threw away the answer" bugs. `Result` and `Option` are already `#[must_use]` in std, so a function
returning `Result` inherits the warning - adding `#[must_use]` to your own types and builder methods extends the net.

Where it earns its place:

- **Types that should never be silently dropped** - annotate the type: a `#[must_use]` `struct Guard` (an RAII guard
  whose whole point is to be held), a builder type, a future-like lazy value.
- **Builder methods returning `Self`** - a builder chain dropped without `.build()` did nothing; mark the builder type
  `#[must_use]` so an abandoned chain warns.
- **Pure-computation methods** - a method that only computes and returns, with no side effect, is a bug if its result is
  ignored: `Vec::is_empty`, `i32::checked_add`. Annotate the function (or rely on its `Result`/`Option` return).
- **`Result`-returning functions** - already covered by `Result`'s own `#[must_use]`; you need not re-annotate unless
  the function returns a custom type.

```rust
// Type-level: an abandoned builder is always a bug.
#[must_use = "a Request builder does nothing until `.send()` is called"]
pub struct RequestBuilder { /* ... */ }

impl RequestBuilder {
    pub fn header(mut self, k: &str, v: &str) -> Self { /* ... */ self }
    pub fn send(self) -> Result<Response, Error> { /* ... */ }
}

// Function-level: a pure query whose result is discarded is almost certainly wrong.
impl Account {
    #[must_use]
    pub fn balance(&self) -> Money { self.balance }
}
```

Do **not** annotate functions called primarily for side effects (`Vec::push` returns `()`; a logging call). The warning
should fire only where ignoring the value is a real mistake.

## Type-safety and future-proofing examples

### C-NEWTYPE and C-CUSTOM-TYPE

Wrap primitives that carry domain meaning so the compiler rejects mismatches; replace boolean/optional flags with named
types so call sites read clearly.

```rust
// Bad: interchangeable primitives; a bool soup at the call site.
fn transfer(from: u64, to: u64, amount: u64, allow_overdraft: bool, notify: bool) { /* ... */ }
transfer(payee, payer, 100, true, false); // which arg is which? what do the bools mean?

// Good: newtypes prevent swapped arguments; enums name each state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct AccountId(u64);
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Cents(u64);

pub enum Overdraft { Allow, Deny }
pub enum Notification { Send, Suppress }

fn transfer(from: AccountId, to: AccountId, amount: Cents, overdraft: Overdraft, notify: Notification) { /* ... */ }
```

### C-STRUCT-PRIVATE and C-STRUCT-BOUNDS

```rust
// Bad: public fields freeze the representation; bounds on the struct infect every use.
pub struct Cache<K: Eq + Hash, V> {
    pub map: HashMap<K, V>, // exposing the field commits to HashMap forever
    pub hits: u64,
}

// Good: private fields with accessors free the representation; bounds live on the impl.
pub struct Cache<K, V> {
    map: HashMap<K, V>,
    hits: u64,
}

impl<K: Eq + Hash, V> Cache<K, V> {
    pub fn hits(&self) -> u64 { self.hits }
}
```

### C-SEALED: sealing a trait

A sealed trait can be named and used by downstream crates but not implemented by them, so you can add methods later
without breaking implementors. The pattern is a private supertrait the downstream cannot name.

```rust
mod private {
    pub trait Sealed {}
}

// Downstream can call `T: HttpBody` but cannot `impl HttpBody for TheirType`,
// because they cannot implement the private `Sealed` supertrait.
pub trait HttpBody: private::Sealed {
    fn len(&self) -> usize;
    fn is_empty(&self) -> bool {
        self.len() == 0
    } // C-COMMON-TRAITS: a public `len` always pairs with `is_empty` (clippy::len_without_is_empty)
}

impl private::Sealed for Bytes {}
impl HttpBody for Bytes {
    fn len(&self) -> usize { self.as_ref().len() }
}
```

Seal a trait when it is an implementation detail you expose for use but not for extension (it lets you add required
methods later). Do **not** seal a trait whose purpose is downstream implementation (an extension point, a plugin
interface) - sealing it defeats the trait.

### C-BUILDER

Use a builder for types with many optional or interdependent construction parameters; a builder reads at the call site
and stays non-breaking as options are added. In Rust a builder is the idiomatic "factory" - accept `impl Fn() -> T`
rather than a builder-typed callback parameter. Two shapes: consuming (`self -> Self`, terminal `build(self)`) for
one-shot construction, and `&mut self -> &mut Self` for reuse. See `idioms.md` for the builder template.

## Edge cases and judgment calls

- **Naming-for-callers applies to public items only.** A private helper named `get_thing` violates nothing; the rubric
  gates the surface downstream crates see. Run it after you have decided what is `pub`.
- **`Eq`/`Hash`/`Ord` track each other.** Never derive `Hash` without `Eq`, or `Ord` without `Eq` + `PartialOrd`. The
  compiler enforces the supertrait chain, but the semantic agreement (equal values hash equal) is on you. A
  float-containing type is the canonical case where the chain stops at the `Partial*` versions.
- **`#[non_exhaustive]` vs sealed traits** solve adjacent problems: `#[non_exhaustive]` keeps a _type_ open to new
  variants/fields; a sealed _trait_ keeps a trait open to new methods. Reach for the one matching what will grow.
- **`Default` is not free reflexivity.** Deriving `Default` requires every field to be `Default`. A type with a
  mandatory field (a URL, an id) has no honest default - provide a `new(required) -> Self` constructor instead, and skip
  `Default`.
- **`Copy` is a forever promise.** Adding `Copy` later is non-breaking, but removing it is breaking and changes move
  semantics at every call site. Add `Copy` only when the type is conceptually a small value and you are confident it
  will stay heap-free.
- **Codebase consistency overrides the guidelines.** When a crate has an established divergent convention (a different
  word order, public fields by design, no `#[non_exhaustive]`), follow it and flag the divergence once rather than
  rewriting file by file.
