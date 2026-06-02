# Rust Anti-Patterns Mapped to Clippy Lints

High-resolution catalogue of the anti-patterns AI agents reliably emit in Rust, the idiomatic fix for each, and the
Clippy lint (or compiler lint) that catches it. The SKILL.md states the rules; this file is the depth behind them:
extended before/after code, decision tables, full lint catalogue, and the baseline lint posture to bake into a project.

Each entry follows one shape: **symptom -> idiomatic fix -> the lint that flags it.** A lint in the `allow`-by-default
`restriction` or `pedantic` group is noted, because catching the pattern requires opting the lint in (see
[Baseline Lint Posture](#baseline-lint-posture)).

## Contents

- [Quick Catalogue](#quick-catalogue)
- [Gratuitous `.clone()` to dodge the borrow checker](#gratuitous-clone-to-dodge-the-borrow-checker)
- [`.unwrap()` / `.expect()` abuse](#unwrap--expect-abuse)
- [`Rc<RefCell<T>>` graphs and shared-mutable soup](#rcrefcellt-graphs-and-shared-mutable-soup)
- [Stringly-typed APIs](#stringly-typed-apis)
- [Unnecessary `unsafe`](#unnecessary-unsafe)
- [Reinventing std / itertools](#reinventing-std--itertools)
- [Java/Go-style OOP](#javago-style-oop)
- [Premature generics](#premature-generics)
- [`#![deny(warnings)]` baked into source](#denywarnings-baked-into-source)
- [Baseline Lint Posture](#baseline-lint-posture)

## Quick Catalogue

Lookup catalogue of symptom -> fix -> lint. Lints marked `(R)` are `restriction`-group and `(P)` are `pedantic`-group:
both are `allow` by default and must be opted in. Everything else fires under `clippy::all` (warn/deny by default).

- **`.clone()` to silence a borrow error** -> restructure ownership: borrow, split, `Cow`, or `Arc`. Lint:
  `redundant_clone`.
- **`.clone()` on a `Copy` type** -> drop the call; `Copy` already copies. Lint: `clone_on_copy`.
- **`.clone()` on `Rc`/`Arc` instead of `Rc::clone(&x)`** -> call `Rc::clone(&x)` to make the refcount bump explicit.
  Lint: `clone_on_ref_ptr` `(R)`.
- **`&str` -> `String` -> back, or `x.to_owned().method()`** -> operate on the borrow; skip the round-trip allocation.
  Lint: `unnecessary_to_owned`, `redundant_clone`.
- **`*(&x)` then re-borrow** -> use `x` directly. Lint: `borrow_deref_ref`.
- **`.unwrap()` in library / non-test code** -> propagate with `?`, or `.expect("invariant proof")`. Lint: `unwrap_used`
  `(R)`.
- **`.expect("...")` with a non-proof message** -> make the message state why failure is impossible. Lint: `expect_used`
  `(R)`.
- **`.map(...).unwrap_or(...)` to fake a default** -> `.map_or(default, f)`. Lint: `map_unwrap_or` `(P)`.
- **`Rc<RefCell<T>>` web for a graph / tree** -> index-based arena: `slotmap` / `generational-arena` / `petgraph`. Lint:
  design lint; see below.
- **`Rc`/`Arc` cycle that never drops** -> break the cycle with `Weak`. Lint: none; manual review.
- **`Arc<Mutex<...>>` exposed in a public API** -> hide the wrapper behind `&T` / `&mut T` / `T`. Lint: `rc_mutex`,
  `rc_buffer` `(R)`.
- **`Mutex<usize>` for a counter** -> use an atomic (`AtomicUsize`). Lint: `mutex_atomic` `(R)`.
- **API takes `&str` for a typed value (id, kind, currency)** -> newtype (`UserId(u64)`) or `enum`. Lint: design lint;
  see below.
- **`&String` / `&Vec<T>` parameter** -> take `&str` / `&[T]`. Lint: `ptr_arg`.
- **`unsafe` block with no justification** -> remove it, or add a `// SAFETY:` comment and encapsulate. Lint:
  `undocumented_unsafe_blocks` `(R)`.
- **public `unsafe fn` with no `# Safety` section** -> document the invariants the caller must uphold. Lint:
  `missing_safety_doc`.
- **many `unsafe` ops crammed in one block** -> one block per operation, each with its own `// SAFETY:`. Lint:
  `multiple_unsafe_ops_per_block` `(R)`.
- **`for i in 0..v.len() { v[i] }`** -> `for x in &v` / iterator adapter. Lint: `needless_range_loop`.
- **`match opt { Some(x) => Some(f(x)), None => None }`** -> `opt.map(f)`. Lint: `manual_map`.
- **`for x in it { if let Some(y) = x { ... } }`** -> `for y in it.flatten() { ... }`. Lint: `manual_flatten`.
- **`.iter().map(|x| x.clone())`** -> `.iter().cloned()` / `.copied()`. Lint: `map_clone`.
- **`.collect::<Vec<_>>()` only to re-iterate** -> keep the iterator lazy; collect once at the end. Lint:
  `needless_collect` `(nursery)`.
- **`.or(expensive())` / `.unwrap_or(expensive())`** -> `.or_else(|| ...)` / `.unwrap_or_else(|| ...)`. Lint:
  `or_fun_call`.
- **OO interface ported as `trait` + `Box<dyn>` everywhere** -> concrete type -> generic -> `dyn`, in that order. Lint:
  design lint; see below.
- **`impl Deref` to fake inheritance** -> compose traits / forward methods explicitly. Lint: design lint;
  M-ESSENTIAL-FN-INHERENT.
- **generic param introduced for a single caller** -> use the concrete type; generalize on the third use. Lint: design
  lint; rule of three.
- **`#![deny(warnings)]` in `lib.rs` / `main.rs`** -> move warning-denial to CI flags; set levels in `[lints]`. Lint:
  none; review + `[lints]` table.

The rest of the file expands the entries that need code, rationale, or a decision procedure.

## Gratuitous `.clone()` to dodge the borrow checker

The single most common AI tell. The model hits a borrow-checker error and, instead of restructuring ownership, sprinkles
`.clone()` until the error disappears. The code compiles, allocates needlessly, and hides the design flaw.
`clippy::redundant_clone` (perf group) catches a clone provably never needed; deeper cases (a clone that _is_ used but
shouldn't exist) need the checklist below, not a lint.

### Before-you-clone checklist

Run top to bottom. Stop at the first option that compiles. `.clone()` is the last resort, not the first reach.

1. **`&T` - borrow instead of own.** Does the callee actually need ownership, or just to read? Change the parameter to
   `&T` (or `&str` / `&[T]`). Most "needs a clone" errors are really "took `T` by value when `&T` would do."
2. **Split the borrow / narrow the scope.** Two borrows of the same value conflict only if their lifetimes overlap.
   Non-lexical lifetimes end a borrow at its last use - reorder so the first borrow finishes before the second begins,
   or borrow disjoint fields separately.
3. **`Cow<'_, T>` - borrow now, own only if mutated.** When a function usually borrows but occasionally needs an owned,
   modified copy, `Cow` defers the allocation to the branch that actually mutates.
4. **`Arc<T>` / `Rc<T>` - share genuine ownership.** When the value truly has no single owner (a cache entry, a config
   read by many tasks), cheap reference-counted sharing beats deep-copying. Use `Arc` across threads, `Rc` single-
   threaded. Bump the count explicitly with `Arc::clone(&x)`, not `x.clone()` (see `clone_on_ref_ptr`).
5. **`.clone()` - last.** Only when the value is small, `Copy`-like, or a deep copy is the genuine intent (you want two
   independent owned values). Then the clone is correct and carries no smell.

### Examples

```rust
// Bad: clone to escape a borrow error. `name` is owned, copied, then thrown away.
fn greet(name: String) -> String {
    let upper = name.clone().to_uppercase(); // redundant_clone: to_uppercase borrows
    format!("{upper}, formerly {name}")
}

// Good (step 1): borrow. The function never needed ownership of `name`.
fn greet(name: &str) -> String {
    let upper = name.to_uppercase();
    format!("{upper}, formerly {name}")
}
```

```rust
// Bad: clone inside a loop to satisfy a moved-value error.
fn totals(items: &[Item]) -> Vec<Summary> {
    let mut out = Vec::new();
    for item in items {
        let copy = item.clone(); // clones every element every iteration
        out.push(summarize(copy));
    }
    out
}

// Good (step 1 + iterators): pass the borrow through.
fn totals(items: &[Item]) -> Vec<Summary> {
    items.iter().map(summarize_ref).collect()
}
```

```rust
// Bad: always allocate, even when no normalization is needed.
fn normalize(input: &str) -> String {
    let mut s = input.to_string(); // unconditional allocation
    if s.contains(' ') {
        s = s.replace(' ', "_");
    }
    s
}

// Good (step 3): Cow allocates only on the branch that mutates.
use std::borrow::Cow;
fn normalize(input: &str) -> Cow<'_, str> {
    if input.contains(' ') {
        Cow::Owned(input.replace(' ', "_"))
    } else {
        Cow::Borrowed(input)
    }
}
```

```rust
// Bad: deep-clone a large config so two tasks can read it.
let a = config.clone();
let b = config.clone();
spawn(move || use_config(a));
spawn(move || use_config(b));

// Good (step 4): share one allocation; clone is a refcount bump.
use std::sync::Arc;
let config = Arc::new(config);
let a = Arc::clone(&config);
let b = Arc::clone(&config);
spawn(move || use_config(a));
spawn(move || use_config(b));
```

`clone_on_copy` is the trivial sub-case: calling `.clone()` on an `i32`, `bool`, or any `Copy` type. The call does
nothing the implicit copy wouldn't - delete it.

## `.unwrap()` / `.expect()` abuse

AI agents reach for `.unwrap()` to make fallible code typecheck quickly, turning every recoverable error into a panic. A
panic means "stop the program" - it is never a way to propagate a recoverable error upstream, and callers must never
assume it will be caught (a downstream `panic = "abort"` profile turns any stray panic into an immediate abort).

Use `?` for propagation and a typed error for the API. `.unwrap()` / `.expect()` are permitted only where panic is the
correct response: a **provable invariant** (with `.expect("why this cannot fail")` recording the proof), a `const`
context, a poisoned-lock result, or test code.

`clippy::unwrap_used` and `clippy::expect_used` are `restriction`-group lints (`allow` by default). Opt them in for
library crates and bin crates that must not panic; leave them off - or scoped via `#[expect(...)]` - in tests.

```rust
// Bad: every failure is a panic; the caller has no recourse.
fn load_port(raw: &str) -> u16 {
    raw.parse().unwrap() // unwrap_used; panics on any non-numeric input
}

// Good: parsing is genuinely fallible -> return Result, propagate with ?.
fn load_port(raw: &str) -> Result<u16, std::num::ParseIntError> {
    let port = raw.parse()?;
    Ok(port)
}
```

```rust
// Acceptable: the invariant is proven one line up; expect documents the proof.
let first = items.first().expect("items is non-empty: checked by caller above");

// Acceptable: const context and test code may panic freely.
const MASK: u32 = 0xFF;
#[test]
fn parses() {
    assert_eq!(load_port("8080").unwrap(), 8080); // unwrap in tests is fine
}
```

A bare `.expect("failed")` is no better than `.unwrap()` - the message must state _why the failure is impossible_, not
restate that something failed. If you cannot write that proof, the operation is fallible and belongs in a `Result`.

## `Rc<RefCell<T>>` graphs and shared-mutable soup

When asked for a tree, graph, or doubly-linked structure, AI agents reflexively reach for `Rc<RefCell<T>>` (or
`Arc<Mutex<T>>`). This compiles, but moves ownership and borrow checking to runtime: `RefCell` borrow rules now panic at
runtime instead of failing to compile, and `Rc` cycles leak because the strong count never reaches zero.

Idiomatic Rust represents linked structures with **indices into an arena**, not pointers. Nodes live in a `Vec`-backed
container; edges are integer keys. This sidesteps the borrow checker cleanly (an index is `Copy` and owns nothing),
makes traversal cache-friendly, and cannot leak through cycles.

### Choosing the container

- **Stable keys, frequent insert/remove, no reuse bugs** -> `slotmap`. Generational keys: a removed-then-reused slot
  invalidates old keys.
- **Simple arena, keys valid for the arena's lifetime** -> `generational-arena`. Lighter than `slotmap`; generational
  keys guard against stale use.
- **Graph algorithms (traversal, shortest path, toposort)** -> `petgraph`. Ships the algorithms; nodes/edges are
  indices, not pointers.
- **Tree where you only ever push and never remove** -> `Vec<Node>` + indices. No dependency; children stored as `usize`
  indices into the `Vec`.

`Rc<RefCell<T>>` remains correct for genuine shared _single-threaded_ ownership of a value with interior mutability that
is **not** a cyclic graph - e.g. a shared observer handle, a small cache. Use it deliberately, not as the default graph
representation.

```rust
// Bad: a tree as Rc<RefCell<...>>. Borrow rules now panic at runtime; cycles leak.
use std::cell::RefCell;
use std::rc::Rc;
struct Node {
    value: i32,
    children: Vec<Rc<RefCell<Node>>>,
}

// Good: arena of nodes, children referenced by index. No Rc, no RefCell, no leaks.
struct Tree {
    nodes: Vec<Node>,
}
struct Node {
    value: i32,
    children: Vec<usize>, // indices into Tree::nodes
}
impl Tree {
    fn add(&mut self, value: i32, parent: Option<usize>) -> usize {
        let id = self.nodes.len();
        self.nodes.push(Node { value, children: Vec::new() });
        if let Some(p) = parent {
            self.nodes[p].children.push(id);
        }
        id
    }
}
```

### Breaking cycles with `Weak`

When a back-reference is unavoidable in an `Rc`/`Arc` design (a child pointing at its parent), make exactly one
direction `Weak`. `Weak` does not contribute to the strong count, so the cycle can drop. Upgrade it to access:

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;
struct Node {
    parent: RefCell<Weak<Node>>,   // Weak: does not keep the parent alive -> no cycle
    children: RefCell<Vec<Rc<Node>>>,
}
// Access the parent by upgrading; None if it has been dropped.
fn parent_of(node: &Node) -> Option<Rc<Node>> {
    node.parent.borrow().upgrade()
}
```

Related lints: `clippy::rc_mutex` flags `Rc<Mutex<T>>` (a single-threaded `Rc` paired with a thread-safe `Mutex` is
almost always a mistake - use `Rc<RefCell<T>>` or `Arc<Mutex<T>>`); `clippy::mutex_atomic` flags a `Mutex` guarding a
value an atomic could hold; `clippy::rc_buffer` flags `Rc<String>` / `Rc<Vec<T>>` where `Rc<str>` / `Rc<[T]>` is leaner.

## Stringly-typed APIs

AI agents model domain values as raw `String`s and enumerations as string constants: a function takes a `&str` "kind",
compares it against `"admin"`, and trusts the caller to spell it right. This pushes every validation to runtime and
makes invalid states representable.

Encode the value in the type system: a **newtype** for a validated scalar, an **enum** for a closed set of variants. The
compiler then rejects typos and unhandled cases, and parsing happens once at the boundary. Prefer the strongest `std`
type as early as possible - `PathBuf`/`Path` for filesystem paths, never `String`.

```rust
// Bad: stringly-typed role and id. Typos compile; every caller can pass garbage.
fn grant(role: &str, user_id: &str) -> Result<(), Error> {
    if role == "admin" { /* ... */ } // "Admin", "amdin" silently miss
    let id: u64 = user_id.parse()?;  // re-parsed at every call site
    // ...
    Ok(())
}

// Good: enum for the closed set, newtype for the validated id. Illegal states won't compile.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Role { Admin, Member, Guest }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct UserId(u64);

impl std::str::FromStr for UserId {
    type Err = std::num::ParseIntError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(UserId(s.parse()?)) // parse once, at the boundary
    }
}

fn grant(role: Role, user: UserId) -> Result<(), Error> {
    match role {
        Role::Admin => { /* ... */ }
        Role::Member | Role::Guest => { /* ... */ }
    }
    Ok(())
}
```

The closely related parameter smell - `&String` / `&Vec<T>` in a signature - is caught by `clippy::ptr_arg`: take `&str`
/ `&[T]` so callers can pass slices, literals, and sub-ranges without allocating. There is no single lint for "stringly
typed"; it is a design review item, reinforced by the newtype guidance in the API guidelines.

## Unnecessary `unsafe`

AI agents add `unsafe` to reach for `transmute`, raw-pointer tricks, or to fake `Send`/`Sync` on a type the compiler
refused - "clever tricks" to dodge a bound. **Unsound abstractions are never acceptable**: there is no good-enough
reason. If you cannot encapsulate something safely, expose an `unsafe fn` and document its contract instead of hiding
unsoundness behind a safe-looking wrapper.

Rules for the rare legitimate `unsafe`:

- **Every `unsafe` block carries a `// SAFETY:` comment** stating which invariants make it sound.
  `clippy::undocumented_unsafe_blocks` (restriction) flags blocks without one; `clippy::unnecessary_safety_comment`
  flags a `// SAFETY:` on code that is not actually `unsafe`.
- **One operation per block.** `clippy::multiple_unsafe_ops_per_block` (restriction) flags blocks doing several unsafe
  things at once, so each gets its own justification.
- **Every public `unsafe fn` has a `# Safety` doc section** listing the caller's obligations. The default-on
  `clippy::missing_safety_doc` flags omissions.
- **Soundness boundaries are module boundaries.** Inside a module, a safe function may rely on an invariant another item
  in the same module upholds; that invariant must never depend on code outside the module.
- **If the crate has no business using `unsafe` at all, forbid it:** `#![forbid(unsafe_code)]` at the crate root makes
  any `unsafe` a hard compile error (`forbid` cannot be locally overridden, unlike `deny`).

```rust
// Bad: a "clever trick" to bypass a missing Send bound. Unsound; data races possible.
struct AlwaysSend<T>(T);
unsafe impl<T> Send for AlwaysSend<T> {} // lying to the compiler about T

// Bad: undocumented unsafe block.
let val = unsafe { *raw_ptr }; // undocumented_unsafe_blocks: why is this sound?

// Good: justify it, or do not write it. The comment is the price of the keyword.
// SAFETY: `raw_ptr` came from `Box::into_raw` above and has not been freed,
// so it is non-null, aligned, and points to an initialized `T`.
let val = unsafe { *raw_ptr };
```

```rust
// Good: a crate that needs no unsafe forbids it outright.
#![forbid(unsafe_code)]
```

## Reinventing std / itertools

AI agents write manual loops and hand-rolled logic for operations the standard library expresses in one combinator. The
manual version is longer, bypasses bounds-check elision, and hides intent. Express transformations as iterator adapter
chains; index only when the index is itself the data.

Each of these has a default-on Clippy lint that suggests the replacement:

- **`for i in 0..v.len()`** indexing `v[i]` -> `for x in &v` or an adapter. Lint: `needless_range_loop`.
- **`match opt { Some(x) => Some(f(x)), None => None }`** -> `opt.map(f)`. Lint: `manual_map`.
- **`for x in it { if let Some(y) = x { ... } }`** -> `for y in it.flatten()`. Lint: `manual_flatten`.
- **`.iter().map(|x| x.clone())`** -> `.iter().cloned()` (or `.copied()` for `Copy`). Lint: `map_clone`.
- **`.or(make())` / `.unwrap_or(make())`** where `make()` is non-trivial -> `.or_else(|| make())` /
  `.unwrap_or_else(|| make())` so the fallback is lazy. Lint: `or_fun_call`.
- **`.collect::<Vec<_>>()` then immediately re-iterate** -> keep the iterator lazy. Lint: `needless_collect`
  (`nursery`).

```rust
// Bad: index loop, manual Option mapping, eager fallback allocation.
let mut names = Vec::new();
for i in 0..users.len() {                 // needless_range_loop
    let label = match users[i].nick() {   // manual_map
        Some(n) => Some(n.to_uppercase()),
        None => None,
    };
    names.push(label.unwrap_or(default_name())); // or_fun_call: default_name() always runs
}

// Good: one adapter chain. Bounds-check-friendly, lazy, intent-revealing.
let names: Vec<String> = users
    .iter()
    .map(|u| {
        u.nick()
            .map(str::to_uppercase)
            .unwrap_or_else(default_name) // lazy: only runs when nick() is None
    })
    .collect();
```

For windowing, grouping, chunking, and cartesian products, reach for `itertools` rather than hand-rolling state machines
over indices. If std or a well-known crate already names the operation, do not re-derive it.

## Java/Go-style OOP

Agents trained on object-oriented codebases import OO structure that Rust does not use: an interface translated verbatim
into a trait fronted by `Box<dyn>` everywhere, `impl Deref` used to fake inheritance, free functions stuffed into `impl`
blocks as static methods.

### Prefer types over generics, generics over `dyn`

When a function needs a dependency, climb this ladder only as far as required:

- **One implementation, plus a test/mock variant** -> concrete type (enum-dispatched). No trait needed; static dispatch,
  zero indirection.
- **Callers supply their own implementation** -> generic `impl Trait` param. Monomorphized, inlinable, no allocation;
  keeps the trait narrow.
- **Generics cause excessive nesting / type-param infection** -> `dyn Trait` behind a newtype. Erase the type; wrap so
  the API surface stays clean.

```rust
// Bad: C#/Java interface ported wholesale; dyn + Rc wrapper leaks into every signature.
trait Database {
    fn load(&self, id: Id) -> Object;
}
async fn start(db: Rc<dyn Database>) { /* ... */ } // wrapper infects the API

// Good: accept the narrowest trait as a generic; static dispatch, no wrapper.
trait LoadObject {
    fn load(&self, id: Id) -> Object;
}
async fn start(db: impl LoadObject) { /* ... */ }
```

### No `Deref` polymorphism, trait composition over inheritance

`Deref` exists to make smart pointers transparent, not to inherit methods. Using it to expose an inner type's methods on
a wrapper is the `deref` anti-pattern: method resolution becomes surprising and the relationship is invisible. Compose
behavior with traits instead, and keep essential functionality **inherent** - implement the real logic in an `impl Type`
block and have any trait impl forward to it (the inverse, offloading core methods into traits, forces users to hunt for
which traits to `use`).

Build a wide capability from narrow traits via subtraits (`trait DataAccess: LoadObject + StoreObject {}`), not a deep
base-class hierarchy.

### Free functions are first-class

A function that does not act on a receiver does not belong in an `impl` block. `clippy::*` does not flag this directly
(the guideline is M-REGULAR-FN), but it is a clear AI tell: `Database::check_parameters(p: &str)` should just be a
module-level `fn check_parameters(p: &str)`.

## Premature generics

Agents generalize on the first occurrence: a function used once gains a `<T: Trait>` parameter "for flexibility,"
bloating signatures and monomorphized code for a flexibility no caller uses. Apply the **rule of three** - write the
concrete type the first and second time; introduce the generic on the _third_ genuine use, when the shared shape is real
rather than imagined.

```rust
// Bad: generic with a single caller that only ever passes &str.
fn log_line<T: AsRef<str>>(line: T) {
    println!("{}", line.as_ref());
}
log_line("done"); // the only call site in the codebase

// Good: concrete until a second type actually shows up.
fn log_line(line: &str) {
    println!("{line}");
}
```

The same restraint applies to wrappers and type parameters in public APIs: a service-like type should not force users to
name `Foo<Bar<Baz>>`. Keep `Rc`/`Arc`/`Box`/`RefCell` out of public signatures (`clippy::rc_buffer`, `clippy::rc_mutex`
catch some of these); expose `&T`, `&mut T`, or `T`, and hide the wrapper internally. There is no lint for "too generic
too early" - it is a design judgment, enforced by review.

## `#![deny(warnings)]` baked into source

Agents add `#![deny(warnings)]` (or scattered `#![deny(...)]` attributes) to the crate root to look strict. This is a
trap: a future compiler adds a new warning, or a dependency bump surfaces one, and the crate that built yesterday fails
to build today - for downstream users who cannot edit your source. Lint _denial_ is a CI policy, not a source-code fact.

The idiomatic posture:

- **Set lint levels in the `[lints]` / `[workspace.lints]` table** in `Cargo.toml` - one auditable place, inherited
  across the workspace, not scattered `#![deny(...)]` attributes or `RUSTFLAGS`.
- **Promote warnings to errors only in CI**, via `cargo clippy --all-targets --all-features -- -D warnings`. The build
  stays green locally and for downstream consumers; CI is where "no warnings" is enforced.
- **Override a project-global lint at a narrow scope with `#[expect(lint, reason = "...")]`, not `#[allow]`.** `expect`
  emits a warning when the lint _stops_ firing, so stale overrides are caught automatically; `#[allow]` rots silently.
  Reserve `#[allow]` for generated code and macros.

```rust
// Bad: in lib.rs. A new compiler warning breaks the build for everyone downstream.
#![deny(warnings)]
```

```toml
# Good: levels declared once, in Cargo.toml. CI adds `-D warnings`; source stays portable.
[lints.rust]
unsafe_code = "forbid"

[lints.clippy]
all = { level = "warn", priority = -1 }
```

```rust
// Good: a single, justified, self-expiring override at the narrowest scope.
#[expect(clippy::unused_async, reason = "API fixed; will perform I/O in a later release")]
pub async fn ping() {}
```

## Baseline Lint Posture

A project that wants the compiler to catch the anti-patterns above should enable the lint groups broadly and opt in a
selection of `restriction` lints. Declare everything in `Cargo.toml` (workspace-wide via `[workspace.lints]`); the
`priority = -1` on group entries lets individual lints below them override the group level.

```toml
[lints.rust]
ambiguous_negative_literals   = "warn"
missing_debug_implementations = "warn"
redundant_imports             = "warn"
redundant_lifetimes           = "warn"
trivial_numeric_casts         = "warn"
unsafe_op_in_unsafe_fn        = "warn"
unused_lifetimes              = "warn"

[lints.clippy]
# Major groups. priority = -1 so the specific lints below win on conflict.
correctness = { level = "warn", priority = -1 }
suspicious  = { level = "warn", priority = -1 }
style       = { level = "warn", priority = -1 }
complexity  = { level = "warn", priority = -1 }
perf        = { level = "warn", priority = -1 }
pedantic    = { level = "warn", priority = -1 }
cargo       = { level = "warn", priority = -1 }
# nursery   = { level = "warn", priority = -1 }  # optional; more false positives

# Selected `restriction` lints that catch AI anti-patterns. The restriction group
# must NOT be enabled wholesale - pick lints case by case.
allow_attributes_without_reason = "warn"
clone_on_ref_ptr                = "warn"
undocumented_unsafe_blocks      = "warn"
unnecessary_safety_comment      = "warn"
multiple_unsafe_ops_per_block   = "warn"
# For no-panic library / bin crates, also opt in:
# unwrap_used = "warn"
# expect_used = "warn"
```

Notes on this posture:

- **Never enable the `restriction` group as a whole.** Its lints intentionally forbid reasonable code, sometimes
  contradict each other, and often have no suggested fix. Enable individual restriction lints deliberately.
- **`unwrap_used` / `expect_used` belong on no-panic crates**, scoped off in tests with `#[expect(...)]`. Enabling them
  globally on a binary that legitimately uses test helpers produces noise.
- **`pedantic` carries occasional false positives** - that is why it is `allow` by default. Enabling it `warn` (not
  `deny`) and overriding individual offenders with `#[expect(..., reason = "...")]` keeps the signal without breaking
  builds.
- **Pair this with the toolchain gate** `cargo clippy --all-targets --all-features -- -D warnings` in CI, which is what
  turns these `warn` levels into a hard gate without baking denial into source.
