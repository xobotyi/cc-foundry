# Rust 2024 Edition

High-resolution depth for the `rust` skill's edition-2024 route entry. Covers the edition changes that most affect
generated code, with the extended examples, decision tables, and migration mechanics that the SKILL.md summary omits.

## Contents

- [Verify Before You Assume](#verify-before-you-assume)
- [Migration: cargo fix --edition](#migration-cargo-fix---edition)
- [RPIT Precise Capturing](#rpit-precise-capturing)
- [Tail-Expression and if-let Temporary Drop Scope](#tail-expression-and-if-let-temporary-drop-scope)
- [static mut References Are a Hard Error](#static-mut-references-are-a-hard-error)
- [Other 2024 Items at a Glance](#other-2024-items-at-a-glance)

## Verify Before You Assume

The edition is a per-crate setting, not a toolchain global. A recent `rustc` can compile a 2015/2018/2021 crate, so the
installed compiler version tells you nothing about which rules apply to the code in front of you.

- Read the `edition = "..."` key under `[package]` in the relevant `Cargo.toml` before applying any rule below. In a
  workspace, a crate may inherit `edition` from `[workspace.package]` via `edition.workspace = true` — resolve the
  inheritance, do not assume.
- Read the actual `rustc --version` (and `cargo --version`) to confirm the toolchain is recent enough that 2024 is
  stable. Rust 2024 stabilized in Rust 1.85; these notes target current stable (~1.96, mid-2026).
- A 2024 rule (e.g. `static_mut_refs` as `deny`) only bites when the crate is on the 2024 edition. Do not "fix" 2021
  code to 2024 semantics unless the crate is actually on 2024 or you are running the migration.

## Migration: cargo fix --edition

The single entry point is `cargo fix --edition`. It applies the `rust-2024-compatibility` lint group and rewrites what
it safely can. What it handles differs sharply by feature.

- **RPIT lifetime overcapture** (`impl_trait_overcaptures`) — auto-fixed for named generics; manual when APIT is named.
- **Tail-expr drop order shift** (`tail_expr_drop_order`) — not auto-fixed; warns only, inspect and adjust by hand.
- **`static mut` references** (`static_mut_refs`) — not auto-fixed; no semantics-preserving rewrite exists.
- **`Captures<..>` trick removal** (no lint) — not auto-fixed; old trick still compiles, migrate manually.
- **Outlives (`'a`) trick** (no lint) — not auto-fixed; old trick still compiles, migrate manually.

Workflow: bump `edition` only via the migration, not by hand-editing `Cargo.toml`. Run `cargo fix --edition` on a clean
tree, review the diff, then resolve the warning-only lints (`tail_expr_drop_order`, `static_mut_refs`) manually before
flipping the edition. To preview the riskiest behavioral change without migrating, add `#![warn(tail_expr_drop_order)]`
at the crate root.

## RPIT Precise Capturing

**Lifetime Capture Rules 2024 (RFC 3498):** in Rust 2024, return-position `impl Trait` (RPIT) implicitly captures _all_
in-scope generic parameters — type, const, _and lifetime_ — when no `use<..>` bound is present. In 2021 and earlier,
lifetimes were only captured when they appeared syntactically in the RPIT bound. The `use<..>` bound (RFC 3617, stable
since 1.82, usable in all editions) is the lever to control exactly what is captured.

### What "captured" controls

A captured parameter may appear in the hidden type, and — more importantly for callers — it constrains how long the
opaque value may live. Over-capturing a lifetime needlessly shortens the returned value's usable lifetime.

```rust
// `use<'a>` captures the lifetime: the opaque type is tied to `'a` even
// though the hidden type `()` never uses it.
fn capture<'a>(_: &'a ()) -> impl Sized + use<'a> {}

fn test<'a>(x: &'a ()) -> impl Sized + 'static {
    capture(x) // ERROR: lifetime may not live long enough
}
```

```rust
// `use<>` captures nothing: the opaque value is `'static`-compatible.
fn capture<'a>(_: &'a ()) -> impl Sized + use<> {}

fn test<'a>(x: &'a ()) -> impl Sized + 'static {
    capture(x) // OK
}
```

### The 2021 -> 2024 behavioral shift

The default for an un-annotated lifetime flips. The function body need not change; the inferred capture set does.

```rust
fn f_implicit(_: &()) -> impl Sized {}
// In Rust 2021 and earlier, equivalent to:  fn f(_: &()) -> impl Sized + use<>  {}
// In Rust 2024 and later,    equivalent to:  fn f(_: &()) -> impl Sized + use<'_> {}
```

This aligns bare functions with the behavior that trait-impl methods, RPITIT (RPIT in trait definitions), and
`async fn`-produced `Future` types already had in every edition: they always capture all in-scope lifetimes.

### Capture-set rules (the full catalog)

What lands in the implicit capture set when `use<..>` is absent:

- **Type and const generics** — always captured, in every edition. `fn f<T, const N: usize>() -> impl Sized` is
  `use<T, N>` everywhere.
- **In-scope lifetimes** — captured in 2024 (the change); captured in 2021 only if syntactically present in the bound.
- **Outer-impl generics** — generics from an enclosing `impl<T, const C: usize>` block are in scope and captured. An
  inherent method `fn g<U>() -> impl Sized` inside such an impl is `use<T, U, C>`.
- **Higher-ranked binder lifetimes** — a lifetime introduced by `for<'a>` is in scope. (Capturing higher-ranked
  lifetimes in _nested_ opaque types is not yet supported by the compiler.)
- **APIT-introduced anonymous generics** — `fn f(_: impl Sized) -> impl Sized` has an anonymous type param that is in
  scope and captured; roughly `use<_0>`. It cannot be named in a `use<..>` bound without being given a real name.

### When to write an explicit `use<..>` bound

- The hidden type genuinely does not borrow an in-scope lifetime and callers need the result to outlive that lifetime
  (e.g. return something `'static`-usable): write `use<>` or list only the parameters actually needed.
- You want to deliberately freeze the public capture set so a future change to the body cannot silently widen what the
  return type borrows. The `use<..>` bound is part of the API contract.
- Leave `use<..>` off when capturing everything is fine and you may later want the hidden type to use those parameters —
  omitting the bound preserves that freedom.

### Migrating the legacy capture tricks

Both pre-1.82 workarounds still compile in 2024 (no auto-migration), but generated code should use neither — prefer a
bare RPIT or an explicit `use<..>`.

`Captures` trick -> `use<..>`:

```rust
// Legacy: marker-trait hack to force lifetime capture.
fn f<'a, T>(x: &'a (), y: T) -> impl Sized + Captures<(&'a (), T)> { (x, y) }

// All editions: precise capturing.
fn f<'a, T>(x: &'a (), y: T) -> impl Sized + use<'a, T> { (x, y) }

// Rust 2024: omit entirely, both are captured by default.
fn f<'a, T>(x: &'a (), y: T) -> impl Sized { (x, y) }
```

Outlives trick -> `use<..>`: the old `impl Sized + 'a` with a `T: 'a` bound imposed a surprising, incorrect restriction
on callers (it forced `T` to outlive `'a` even when `T`'s lifetimes were independent).

```rust
// Legacy: needs a bogus `T: 'a` bound just to make the trick work.
fn f<'a, T: 'a>(x: &'a (), y: T) -> impl Sized + 'a { (x, y) }

// All editions: precise capturing, no spurious bound on `T`.
fn f<T>(x: &(), y: T) -> impl Sized + use<'_, T> { (x, y) }

// Rust 2024: omit entirely.
fn f<T>(x: &(), y: T) -> impl Sized { (x, y) }
```

### Migration edge case: APIT cannot be auto-fixed

`impl_trait_overcaptures` inserts `use<..>` automatically for named generics, but when the parameter to exclude was
introduced by APIT it must first be given a name — which the tool cannot do, because naming it changes the public API
(turbofish becomes possible). The lint flags it for manual handling.

```rust
// 2021 — lint warns: `impl Sized` will capture more lifetimes in 2024.
fn f<'a>(x: &'a (), y: impl Sized) -> impl Sized { (*x, y) }

// Manual 2024 fix: name the APIT param so it can go in `use<..>`.
fn f<'a, T: Sized>(x: &'a (), y: T) -> impl Sized + use<T> { (*x, y) }
```

If turning the anonymous param into a turbofish-able named param is undesirable, the alternative is to accept the wider
capture (omit `use<..>` and let the lifetime be captured) — often the better call if the hidden type may use that
lifetime later.

## Tail-Expression and if-let Temporary Drop Scope

**Rust 2024 changes when temporaries in a tail expression are dropped.** This is a `Drop`-_timing_ change, not a syntax
change — the most insidious 2024 item because the same source can compile in both editions yet run destructors in a
different order, and because the migration lint only warns.

### The rule

In a block, function, or closure body, a temporary created in the **tail expression** (the final expression with no
trailing `;`) is now dropped:

- **before** the block's local variables, and
- **at the end of the block**, rather than being extended outward to the next-larger temporary scope (often the end of
  the enclosing statement).

In 2021, that temporary outlived the locals and was extended past the block boundary.

### Case 1 — a 2021 borrow-check error that now compiles

```rust
// 2021: error[E0597] `c` does not live long enough.
// 2024: compiles — the `Ref` temporary from `c.borrow()` drops first, then `c`.
fn f() -> usize {
    let c = std::cell::RefCell::new("..");
    c.borrow().len()
}
```

This is the intended ergonomic win: the temporary `Ref` no longer outlives the `RefCell` it borrows.

### Case 2 — a 2021 success that now fails to compile

```rust
// 2021: the `String` temporary is extended past the block and the `len()` call.
// 2024: it drops at the end of the inner block, so the borrow outlives its referent.
fn main() {
    let x = { &String::from("1234") }.len(); // 2024: error[E0716] temporary dropped while borrowed
}
```

Fix by lifting the block into a `let` binding, which engages temporary lifetime extension (the `String` behind the
reference lives long enough for the following statement):

```rust
fn main() {
    let s = { &String::from("1234") };
    let x = s.len();
}
```

### Case 3 — the silent behavioral change (no compile error)

The dangerous case is when both editions compile but observable `Drop` order differs. A tail expression that holds a
lock guard, a `Ref`/`RefMut`, a transaction, a span, or any value with a side-effecting `Drop` will now release it
_earlier_ (at the block's end, before the locals) than in 2021.

```rust
use std::sync::Mutex;

fn last_len(m: &Mutex<Vec<i32>>) -> usize {
    let backup = vec![0]; // a local
    m.lock().unwrap().len()
    // 2021: the MutexGuard (a tail-expr temporary) is dropped AFTER `backup`.
    // 2024: the MutexGuard is dropped BEFORE `backup`.
    // If `backup`'s Drop and the guard's Drop interact (e.g. both touch shared
    // state, or ordering matters for a lock/log/transaction), behavior shifts.
}
```

There is no error here — only a different runtime order. This is why the migration is warn-only.

### if-let temporary scope (companion change)

The same narrowing applies to temporaries in the scrutinee of an `if let` / `while let`: in 2024 a temporary created to
evaluate the matched expression is dropped at the end of the `if let` construct rather than being extended to the end of
the enclosing block. A guard or `Ref` produced inside an `if let (...) = expr { ... }` scrutinee is released sooner,
which likewise can change `Drop` ordering. Treat it as the same hazard class as the tail-expression change.

### Migration discipline

- There is **no semantics-preserving automatic rewrite** (per RFC 3606). `cargo fix --edition` runs
  `tail_expr_drop_order` but only emits warnings; it changes nothing.
- The lint fires only for temporaries whose type has a **non-trivial custom `Drop`** — exactly the values where order is
  observable. Treat every such warning as a manual review item, not noise.
- For a flat-out fix when order matters: bind the tail temporary to a named local so its drop point is explicit and
  edition-independent, e.g. `let n = m.lock().unwrap().len(); n`.
- To audit without migrating, add `#![warn(tail_expr_drop_order)]` at the crate root.

## static mut References Are a Hard Error

**In Rust 2024 the `static_mut_refs` lint is `deny` by default.** Taking a shared (`&`) or mutable (`&mut`) reference to
a `static mut` is rejected. Generated code must not produce `&MY_STATIC` / `&mut MY_STATIC` against a `static mut`.

### Why it is unsound, not merely discouraged

Merely _creating_ such a reference — even if it is never read or written — is _instantaneous_ undefined behavior,
because it violates Rust's mutability-XOR-aliasing rule. Upholding that rule for a `static mut` requires reasoning about
the whole program globally (reentrancy, interrupts, threads), which is exactly the kind of proof the language otherwise
makes unnecessary.

### Implicit references also trigger it

The reference need not have a visible `&`. Method calls and formatting auto-create references and are caught:

```rust
static mut NUMS: &[u8; 3] = &[0, 1, 2];

unsafe {
    println!("{NUMS:?}"); // ERROR: shared reference to mutable static
    let n = NUMS.len();   // ERROR: auto-ref for the method receiver
}
```

```rust
static mut X: i32 = 23;
static mut Y: i32 = 24;

unsafe {
    let y = &X;            // ERROR
    let ref x = X;         // ERROR — `ref` binding is a reference
    let (x, y) = (&X, &Y); // ERROR
}
```

### Alternatives, in order of preference

There is **no automatic migration** — the code must be rewritten. Prefer an immutable `static` of an interior-mutable
type with a _locally reasoned_ abstraction over any approach that keeps global reasoning. Decision order:

- **Counter / flag / single integer, pointer, bool** — `static` atomic (`AtomicU64`, `AtomicBool`).
- **Shared mutable compound data** — `static Mutex<T>` or `static RwLock<T>`.
- **One-time init, no inputs / const-buildable default** — `static LazyLock<T>`.
- **One-time init needing runtime inputs** — `static OnceLock<T>` (set once, get after).
- **`no_std`, atomics available** — atomic init-guard + `&raw const` access.
- **Raw pointer into FFI / C API** — `&raw mut` / `&raw const` (never a reference).
- **Hand-managed interior mutability with external sync** — `Sync` wrapper over `UnsafeCell`.

Atomic — replaces a scalar `static mut`:

```rust
use std::sync::atomic::{AtomicU64, Ordering};

// Was: static mut COUNTER: u64 = 0;
static COUNTER: AtomicU64 = AtomicU64::new(0);

fn bump() {
    COUNTER.fetch_add(1, Ordering::Relaxed); // pick Ordering deliberately per use case
}
```

Mutex — replaces a compound `static mut`:

```rust
use std::collections::VecDeque;
use std::sync::Mutex;

// Was: static mut QUEUE: VecDeque<String> = VecDeque::new();
static QUEUE: Mutex<VecDeque<String>> = Mutex::new(VecDeque::new());

fn push(s: String) {
    QUEUE.lock().unwrap().push_back(s);
}
```

`LazyLock` / `OnceLock` — replaces a `static mut` used for deferred initialization:

```rust
use std::sync::LazyLock;

// Was: static mut STATE: Option<GlobalState> = None;
static STATE: LazyLock<GlobalState> = LazyLock::new(GlobalState::new);
```

Use `OnceLock` instead when the constructor needs runtime inputs available only at a single init point (e.g. parsed CLI
args in `main`): `STATE.set(value)` once, then `STATE.get().unwrap()` thereafter.

### When you must keep a `static mut`: use raw borrows

For FFI or genuinely global state with external synchronization, keep the `static mut` but take a **raw pointer** via
the raw-borrow operators `&raw const` / `&raw mut` — never an intermediate reference:

```rust
static mut STATE: GlobalState = GlobalState::new();

unsafe extern "C" {
    fn example_ffi(state: *mut GlobalState);
}

fn main() {
    unsafe {
        // Was: example_ffi(&mut STATE as *mut GlobalState); // creates a reference -> UB + lint
        example_ffi(&raw mut STATE); // raw pointer, no reference ever exists
    }
}
```

The raw pointer does not make aliasing safe — it defers the obligation to the point of dereference, keeping the unsafe
reasoning small and local. You still must uphold aliasing across threads, interrupts, and reentrancy.

If a reference is truly unavoidable and you can prove exclusive access, narrow the `static_mut_refs` allowance as
tightly as possible (a single small function or module) or convert a raw pointer on demand (`&mut *&raw mut MY_STATIC`),
and keep the reference **short-lived** — never store it. Use raw pointers as the default unit and materialize a
reference only at the moment it is required.

## Other 2024 Items at a Glance

These also ship in Rust 2024 and affect generated code less often; apply the migration and watch for them.

- **`unsafe extern` blocks** — `extern` blocks declaring foreign items are written `unsafe extern "C" { ... }` in 2024
  (as in the FFI example above). Individual declared functions may then be marked `safe` or `unsafe`.
- **Unsafe attributes** — attributes that can cause unsoundness (e.g. `export_name`, `link_section`, `no_mangle`) must
  be written with the `unsafe(...)` wrapper: `#[unsafe(no_mangle)]`.
- **`gen` is a reserved keyword** — reserved for generator/`gen` blocks. Identifiers named `gen` must be written as the
  raw identifier `r#gen` in 2024 code.

For anything here, run `cargo fix --edition` and resolve the flagged lints; the precise rewrites are mechanical.
