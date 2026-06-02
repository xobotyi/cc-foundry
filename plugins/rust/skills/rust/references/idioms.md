# Core Idioms (High-Resolution)

Depth behind the SKILL.md `Ownership and Borrowing`, `Traits and Generics`, and `Iterators and Pattern Matching`
sections: worked bad/good code, decision tables, full conversion catalogs, and the edge cases the terse rules omit. The
SKILL.md rules are the thesis; this file is the zoom-in. Do not re-skim the SKILL.md rules here.

## Contents

- [Ownership and Borrowing](#ownership-and-borrowing)
  - [Accept the least-owning type](#accept-the-least-owning-type)
  - [Split borrows](#split-borrows)
  - [Scoped blocks and narrow borrows](#scoped-blocks-and-narrow-borrows)
  - [`Cow` for borrow-or-own](#cow-for-borrow-or-own)
- [Dispatch: `impl Trait` vs generics vs `dyn`](#dispatch-impl-trait-vs-generics-vs-dyn)
- [Iterator adapters over index loops](#iterator-adapters-over-index-loops)
- [`match` vs `if let` vs `let else`](#match-vs-if-let-vs-let-else)
- [The newtype idiom](#the-newtype-idiom)
- [The builder idiom](#the-builder-idiom)
- [Conversions: `From`/`Into`/`TryFrom`](#conversions-frominto-tryfrom)
- [The `as_`/`to_`/`into_` cost cheat-table](#the-as_to_into_-cost-cheat-table)

## Ownership and Borrowing

### Accept the least-owning type

A parameter asks for the weakest capability that does the job. Owning when you only read forces the caller to clone or
give up their value; borrowing the heavier type (`&String`, `&Vec<T>`) blocks callers who hold only the lighter view (a
string literal, an array, a slice).

```rust
// Bad: forces the caller to own a String and a Vec, blocks &str literals and arrays.
fn count_hits(needle: &String, haystack: &Vec<String>) -> usize {
    haystack.iter().filter(|line| line.contains(needle)).count()
}

// Good: &str accepts literals, String, Box<str>, Cow; &[String] accepts Vec, arrays, slices.
fn count_hits(needle: &str, haystack: &[String]) -> usize {
    haystack.iter().filter(|line| line.contains(needle)).count()
}
```

Deref coercion makes `&str`/`&[T]` strictly more general than `&String`/`&Vec<T>` at zero cost. Return owned values
(`String`, `Vec<T>`); borrow in parameters. When the function reads but need not name the concrete type and cheap
construction is acceptable, accept `impl AsRef<str>` / `impl AsRef<Path>` / `impl AsRef<[u8]>` for maximum caller
flexibility (M-IMPL-ASREF) - but keep that bound out of struct fields, which become infected by it; store the resolved
`String`/`PathBuf` instead.

Accept the lighter type, not the heavier:

- **Read a string:** `&str`, not `&String`
- **Read a slice:** `&[T]`, not `&Vec<T>`
- **Read, don't name the type, cheap to build:** `impl AsRef<str>`, not `&String`
- **Read raw bytes:** `&[u8]`, not `&Vec<u8>`
- **Read a filesystem path:** `&Path`, not `&PathBuf` / `&str`
- **Read N pieces from one reader:** `R: Read` by value (caller passes `&mut r`), not a fresh reader per call

A reader/writer function taking `R: Read` / `W: Write` by value can still be fed a `&mut R`, because `&mut R: Read` - so
one signature serves both owned and borrowed callers (C-RW-VALUE). Use `&Path`/`PathBuf` for anything touching the OS; a
`String` cannot represent every valid path (M-STRONG-TYPES).

### Split borrows

`.clone()` to dodge a borrow conflict is almost always the wrong fix - it copies data to silence a structural problem.
The borrow checker tracks borrows per-field on a struct, so borrowing two distinct fields mutably at once is legal; it
rejects only borrowing the _whole_ struct twice. Restructure so each borrow names the narrowest field.

```rust
struct Editor {
    buffer: String,
    cursor: usize,
}

// Bad: a clone of the whole buffer just to read its len while mutating cursor.
impl Editor {
    fn clamp_cursor(&mut self) {
        let snapshot = self.buffer.clone(); // wasteful: copies the entire buffer
        if self.cursor > snapshot.len() {
            self.cursor = snapshot.len();
        }
    }
}

// Good: split the borrow across fields - read buffer.len(), write cursor, no clone.
impl Editor {
    fn clamp_cursor(&mut self) {
        let max = self.buffer.len(); // immutable borrow of buffer ends on this line
        self.cursor = self.cursor.min(max); // mutable borrow of cursor only
    }
}
```

When a method needs to read one field while mutating another and the borrow checker refuses (it cannot see _through_ a
`&mut self` method call), pull the fields out with a destructuring `let` so each gets its own borrow:

```rust
// Good: destructure self so `items` and `index` are independent borrows.
fn advance(&mut self) {
    let Self { items, index } = self;
    if *index + 1 < items.len() {
        *index += 1;
    }
}
```

### Scoped blocks and narrow borrows

Non-lexical lifetimes end a borrow at its last use, not at the end of the enclosing block - but a value held in a
binding lives until that binding drops. Introduce an explicit `{ }` scope to drop a guard or borrow before the next
access, especially a `MutexGuard` (which would otherwise deadlock a second lock or hold the lock across an `.await`).

```rust
// Bad: the guard lives until the end of the function, holding the lock far too long.
fn record(state: &Mutex<Vec<u32>>, value: u32) {
    let mut guard = state.lock().unwrap();
    guard.push(value);
    expensive_unrelated_work(); // lock still held - needless contention
}

// Good: scope the guard so the lock releases before the unrelated work.
fn record(state: &Mutex<Vec<u32>>, value: u32) {
    {
        let mut guard = state.lock().unwrap();
        guard.push(value);
    } // guard dropped here, lock released
    expensive_unrelated_work();
}
```

Reach for `Rc`/`Arc` only for genuine shared ownership (a graph, a cache, a value with no single owner), never to dodge
a lifetime annotation. Smart pointers (`Rc`, `Arc`, `Box`, `RefCell`) are implementation details - keep them out of
public signatures, which should speak in `&T`, `&mut T`, or `T` (M-AVOID-WRAPPERS).

### `Cow` for borrow-or-own

`Cow<'a, B>` (clone-on-write) holds either a borrow (`Cow::Borrowed`) or an owned value (`Cow::Owned`) behind one type.
Use it when a function usually returns its input untouched but occasionally must allocate a modified copy - the common
path stays allocation-free, and only the rare path pays.

```rust
use std::borrow::Cow;

// Bad: always allocates a new String even when nothing needed escaping.
fn escape(input: &str) -> String {
    input.replace('<', "&lt;")
}

// Good: borrow through unchanged when clean; allocate only when an escape is required.
fn escape(input: &str) -> Cow<'_, str> {
    if input.contains('<') {
        Cow::Owned(input.replace('<', "&lt;"))
    } else {
        Cow::Borrowed(input)
    }
}
```

`Cow` is also the idiomatic field type for a struct that may hold either borrowed config data or an owned default. Do
not reach for it when the function always allocates (return `String`) or always borrows (return `&str`) - `Cow` earns
its place only when the branch splits.

## Dispatch: `impl Trait` vs generics vs `dyn`

Static dispatch is the default. The escalation ladder is **concrete type -> generic / `impl Trait` -> `dyn Trait`**;
climb a rung only when the rung below cannot express what you need (M-DI-HIERARCHY).

`impl Trait` in **argument** position is sugar for an anonymous generic: `fn f(x: impl Trait)` equals
`fn f<T: Trait>(x: T)`. In **return** position it hides one concrete type the compiler picks - every code path must
return the _same_ type, so two different iterator chains in two `if` arms will not compile under one `impl Iterator`
return.

```rust
// Bad: dyn dispatch and a heap allocation for what is statically one known type.
fn evens(v: &[i32]) -> Box<dyn Iterator<Item = i32> + '_> {
    Box::new(v.iter().copied().filter(|n| n % 2 == 0))
}

// Good: impl Trait returns the concrete iterator, monomorphized and inlinable, no Box.
fn evens(v: &[i32]) -> impl Iterator<Item = i32> + '_ {
    v.iter().copied().filter(|n| n % 2 == 0)
}
```

Switch from `impl Trait` to a **named** generic (`fn f<T: Trait>`) when the caller must name `T` or supply it by
turbofish, or when the same `T` appears in two positions that must agree.

Reach for `dyn Trait` only for genuine runtime polymorphism: a heterogeneous collection, a plugin boundary, or to break
deep monomorphization that bloats compile time and binary size. **Always write `dyn` explicitly** (`Box<dyn Error>`,
`&dyn Handler`); bare trait-object syntax has been a hard error since edition 2021. Prefer a custom wrapper newtype
`dyn` over leaking `Box<dyn ...>` / `Arc<dyn ...>` in public signatures, so the representation can evolve later
(M-DI-HIERARCHY).

| Axis                     | Generic / `impl Trait` (static)            | `dyn Trait` (dynamic)                         |
| :----------------------- | :----------------------------------------- | :-------------------------------------------- |
| Dispatch                 | resolved at compile time, inlinable        | vtable lookup at runtime                      |
| Code size                | one copy per concrete type (monomorphized) | one shared copy                               |
| Heterogeneous collection | impossible (`Vec<T>` is one `T`)           | the reason it exists (`Vec<Box<dyn T>>`)      |
| Heap allocation          | none required                              | usual (`Box`/`Arc`) for owned objects         |
| Dyn compatibility        | no constraint                              | trait must be dyn-compatible                  |
| Public-API caller naming | caller may need to name/supply `T`         | caller never names a concrete type            |
| Best when                | hot path, one or few known types           | plugins, dynamic sets, monomorphization bloat |

## Iterator adapters over index loops

Express transformations as adapter chains, not manual index arithmetic. Adapters are lazy (nothing runs until a consumer
like `collect`/`sum`/`for` pulls), elide bounds checks the compiler cannot remove from `v[i]`, and state the intent
(`filter`, `map`) instead of encoding it in index bookkeeping.

```rust
// Bad: manual index loop, a mutable accumulator, and a bounds check per access.
fn sum_of_squares_of_evens(v: &[i32]) -> i32 {
    let mut total = 0;
    for i in 0..v.len() {
        if v[i] % 2 == 0 {
            total += v[i] * v[i];
        }
    }
    total
}

// Good: a declarative chain. `copied()` turns &i32 into i32 so arithmetic and sum work.
fn sum_of_squares_of_evens(v: &[i32]) -> i32 {
    v.iter().copied().filter(|n| n % 2 == 0).map(|n| n * n).sum()
}
```

- `for x in &collection` over `for i in 0..collection.len()`; index only when the index itself is data (e.g. you need
  the position to build output).
- `.copied()` (or `.cloned()`) early in a chain converts an iterator of `&T` to `T` for `Copy` (resp. `Clone`) types so
  downstream closures and `sum`/`product`/`min` work on values, not references.
- `collect()` is type-directed: annotate the binding (`let v: Vec<_> =` / `let m: HashMap<_, _> =`) or turbofish
  (`.collect::<Vec<_>>()`) so the target collection is unambiguous. Collecting into `Result<Vec<_>, E>` short-circuits
  on the first `Err`, turning an iterator of `Result`s into one `Result` - the idiomatic fallible-map.
- Collection iterator methods follow the fixed trio: `iter()` yields `&T`, `iter_mut()` yields `&mut T`, `into_iter()`
  yields `T` and consumes the collection. A method named `into_iter` returns a type named `IntoIter` (C-ITER,
  C-ITER-TY).

## `match` vs `if let` vs `let else`

```rust
enum Command {
    Move { x: i32, y: i32 },
    Quit,
    Say(String),
}
```

- **`match`** when more than one variant is handled or exhaustiveness matters. Let the compiler enforce that every
  variant is covered; a trailing `_ => {}` silently swallows variants added later, so reserve it for cases where new
  variants genuinely should be ignored.

```rust
// Good: exhaustive - adding a Command variant forces this match to be updated.
fn run(cmd: Command) {
    match cmd {
        Command::Move { x, y } => reposition(x, y),
        Command::Quit => shutdown(),
        Command::Say(text) => emit(&text),
    }
}
```

- **`if let` / `while let`** for a single pattern where the other cases need no action. `while let Some(x) = it.next()`
  drains an iterator or a queue cleanly.

- **`let ... else`** to bind-or-bail: bind the happy path at the outer scope, and in the `else` divert with a diverging
  expression (`return`, `continue`, `break`, `bail!`, `panic!`). This keeps the success path un-indented instead of
  nesting it inside a `match`/`if let` arm.

```rust
// Bad: the happy path is buried one level deeper inside the match, and `text` is
// trapped in the arm's scope.
fn shout(cmd: Command) -> String {
    match cmd {
        Command::Say(text) => text.to_uppercase(),
        _ => return String::new(),
    }
}

// Good: let-else bails early; `text` is bound in the function body, happy path flat.
fn shout(cmd: Command) -> String {
    let Command::Say(text) = cmd else {
        return String::new();
    };
    text.to_uppercase()
}
```

The `else` block of `let else` **must diverge** - it cannot fall through to bind the variable, so it has to leave the
current control flow. Destructure in the pattern itself (function params, `let`, match arms) rather than reaching into
`.0` / `.field` afterward.

## The newtype idiom

A newtype is a tuple struct wrapping one value to give it a distinct type and its own invariants. It costs nothing at
runtime (the wrapper is erased) and buys three things: it makes illegal states unrepresentable, it lets you implement
foreign traits on foreign types (the orphan-rule workaround), and it self-documents what a bare `String`/`u64` means.

```rust
// Bad: every id and quantity is an interchangeable primitive - easy to transpose,
// and any String is accepted as an email with no validation.
fn charge(user: u64, order: u64, email: String, cents: u64) { /* ... */ }

// Good: distinct types make a transposed argument a compile error, and Email can only
// be constructed through a validating conversion.
struct UserId(u64);
struct OrderId(u64);
struct Email(String);

fn charge(user: UserId, order: OrderId, email: Email, amount: Cents) { /* ... */ }
```

Validate once at the construction boundary (via `TryFrom`, below) so the rest of the program holds a value that is
correct by construction - a parsed `Email` newtype beats a runtime `is_valid(&str)` check scattered at every use site.
When grouping 4+ constructor parameters, a newtype often replaces a confusable parameter list (`Account` + `Currency`
instead of four bare arguments) and pairs with cascaded initialization (M-INIT-CASCADED, C-NEWTYPE). Implement the
common traits on the newtype as semantics allow (`Debug`, `Clone`, `PartialEq`, ...) - the wrapper does not inherit them
from the inner type.

## The builder idiom

`Builder` is Rust's name for what other languages call a factory; a builder that produces items repeatedly is still a
builder. Use one when a type has **4 or more arbitrary initialization permutations**; below that, inherent constructors
(`new`, `with_capacity`, `with_a_b`) are clearer and a builder is over-engineering (M-INIT-BUILDER).

Builder conventions:

- Provide a shortcut `Foo::builder()` that returns `FooBuilder`. Do **not** give the builder a public `new`.
- Setter methods are named for the value (`fn timeout(self, d: Duration)`), not `set_timeout`. They are chainable (take
  and return `self`).
- The terminal method is `.build()`, returning `Foo` (or `Result<Foo, _>` when construction can fail).
- Pass **required** parameters when creating the builder, not as optional setters; setters are for the optional knobs.

```rust
// Good: chainable owning setters, build() terminal, required `addr` passed up front.
struct Server { addr: SocketAddr, workers: usize, name: Option<String> }
struct ServerBuilder { addr: SocketAddr, workers: usize, name: Option<String> }

impl Server {
    fn builder(addr: SocketAddr) -> ServerBuilder {
        ServerBuilder { addr, workers: 4, name: None }
    }
}

impl ServerBuilder {
    fn workers(mut self, n: usize) -> Self { self.workers = n; self }
    fn name(mut self, name: impl Into<String>) -> Self { self.name = Some(name.into()); self }
    fn build(self) -> Server {
        Server { addr: self.addr, workers: self.workers, name: self.name }
    }
}
// let s = Server::builder(addr).workers(8).name("api").build();
```

Do not accept a `FooBuilder` as a function parameter - importing a builder as a dependency is an unidiomatic port of OO
factories. When a function needs to construct items on demand, accept `impl Fn() -> Foo` instead (M-CONCISE-NAMES).

## Conversions: `From`/`Into`/`TryFrom`

Implement conversions through the standard traits so generic code and the `?` operator interoperate; do not invent
ad-hoc methods where a standard trait fits (C-CONV-TRAITS).

- **Implement `From`, get `Into` free.** `From<A> for B` automatically provides `A: Into<B>` via a blanket impl. **Never
  implement `Into` or `TryInto` directly** - they are blanket-derived from `From`/`TryFrom`, and a manual impl is
  redundant and can conflict.
- **`TryFrom` for fallible conversions.** When a conversion can fail (narrowing an integer, parsing/validating a
  string), implement `TryFrom<A> for B` with a meaningful `Error` associated type; its `TryInto` falls out for free.
- **`AsRef` / `AsMut`** for cheap reference-to-reference views into a wrapped value.
- A `From` impl gives the `?` operator a conversion: returning `Err(e)` where `e: Into<TargetError>` is what lets `?`
  propagate across error types. `From<u16> for u32` exists (always safe); `From<u32> for u16` does not - that direction
  is `TryFrom<u32> for u16`, erroring when the value overflows.

```rust
// Good: validating constructor as TryFrom - the only way to get an Email is to pass
// the check. From-style infallible impls would be wrong here because it can fail.
struct Email(String);

impl TryFrom<String> for Email {
    type Error = InvalidEmail;
    fn try_from(s: String) -> Result<Self, Self::Error> {
        if s.contains('@') {
            Ok(Email(s))
        } else {
            Err(InvalidEmail)
        }
    }
}

// Infallible direction: From<UserId> for u64 gives `let n: u64 = id.into();` for free.
struct UserId(u64);
impl From<UserId> for u64 {
    fn from(id: UserId) -> u64 {
        id.0
    }
}
```

When a public function takes a value it will own, accepting `impl Into<T>` lets callers pass either a `T` or anything
convertible to it (`name: impl Into<String>` accepts `&str` and `String`). Never use `()` as an error type - it
implements neither `Error` nor `Display` and cannot carry meaning; define a real error type even if it is a unit struct
(C-GOOD-ERR).

## The `as_`/`to_`/`into_` cost cheat-table

A conversion method's prefix is a contract about cost and ownership (C-CONV). Honor it: misnaming hides an allocation
(calling an expensive method `as_`) or implies one that isn't there.

| Prefix  | Cost                  | Ownership            | `self` taken      | Means                                |
| :------ | :-------------------- | :------------------- | :---------------- | :----------------------------------- |
| `as_`   | Free                  | borrowed -> borrowed | `&self`           | cheap borrowed view; no allocation   |
| `to_`   | Expensive             | borrowed -> owned    | `&self`           | allocates or computes; not free      |
| `into_` | Variable (often free) | owned -> owned       | `self` (consumes) | consumes `self`, transfers ownership |

Canonical examples from `std`:

- `str::as_bytes(&self) -> &[u8]` - free reinterpretation of the same bytes. `as_`.
- `Path::to_str(&self) -> Option<&str>` - borrowed in, borrowed out, but runs a UTF-8 check, so the cost is nontrivial;
  `as_str` would be a lie. `to_`.
- `str::to_lowercase(&self) -> String` - iterates and allocates a new owned `String`. `to_`.
- `f64::to_radians(self) -> f64` - `Copy` type, owned to owned, but `into_radians` would mislead because the input is
  not really consumed; `to_` signals the computation. (`as_` would wrongly imply free, and passing `&f64` is not
  warranted for a cheap `Copy` value.)
- `String::into_bytes(self) -> Vec<u8>` - consumes the `String`, hands back its backing `Vec<u8>`, free. `into_`.
- `BufWriter::into_inner(self)` - consumes the wrapper to return the inner writer, but may run an **expensive flush**;
  `into_` covers the "variable cost" case. A wrapper around a single value exposes it via `into_inner()`.

Getters drop the `get_` prefix (`fn first(&self) -> &First`, not `get_first`); the `mut` qualifier mirrors the return
type position (`as_mut_slice`, not `as_slice_mut`). `get` is reserved for the one obvious value (`Cell::get`) and for
index-style access returning `Option` (with `unsafe fn get_unchecked` variants). A getter that does nontrivial work
(`Path::to_str`) takes `to_`, not `as_`, even when it stays borrowed-to-borrowed.
