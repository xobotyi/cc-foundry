# Go 1.21

Released August 2023. The version that made the `go` directive authoritative: from here on, the toolchain treats the
declared language version as a strict minimum and keys compatibility decisions to it.

## Language

- **`min` and `max` builtins** — return the smallest or largest of a fixed number of ordered arguments. No import, no
  generic helper.
- **`clear` builtin** — `clear(m)` deletes all map entries; `clear(s)` zeroes all slice elements. It does not shrink a
  slice.
- **Package initialization order is specified** — packages sort by import path, then initialize in dependency order.
  Programs that relied on an unspecified order may change behavior.
- **Type inference is stronger** — a generic function may be passed as an argument to another generic function without
  explicit instantiation, inference considers methods when assigning to an interface, and untyped constant arguments of
  different kinds unify the way constant expressions do.

## Standard library

- **`log/slog`** — structured logging with levels. The standard choice for new code; `log` remains for trivial output.
- **`slices`** — generic operations over slices of any element type: `Sort`, `SortFunc`, `Contains`, `Index`, `Insert`,
  `Delete`, `BinarySearch`, `Equal`, `Max`, `Min`, `Compact`, `Clone`, `Reverse`.
- **`maps`** — generic operations over maps: `Clone`, `Equal`, `DeleteFunc`.
- **`cmp`** — the `Ordered` constraint plus `Less` and `Compare`, the building blocks the `slices` comparison functions
  take.
- **`context.WithoutCancel`** — a copy of a context that keeps values but is not canceled with the parent. The correct
  way to hand request-scoped values to background work.
- **`context.WithDeadlineCause`, `context.WithTimeoutCause`, `context.AfterFunc`** — attach a cause to a deadline
  (retrieved with `context.Cause`), and register a function to run once a context is canceled.
- **`errors.ErrUnsupported`** — the standard sentinel for "this operation is not supported here". Wrap it instead of
  inventing a per-package equivalent.
- **`sync.OnceFunc`, `sync.OnceValue`, `sync.OnceValues`** — lazy initialization without declaring a `sync.Once` field.
- **`testing/slogtest`** — validates a `slog.Handler` implementation.

## Toolchain

- **The `go` line is a strict minimum.** `go 1.21.0` in `go.mod` means the module cannot be built by Go 1.20. Older
  toolchains report the version requirement instead of failing on unresolved imports or syntax.
- **The `toolchain` directive** suggests a minimum toolchain, which may be newer than the `go` minimum. The `go` command
  finds or downloads that toolchain automatically.
- **GODEBUG is keyed to the `go` line.** Non-breaking behavior changes select old or new behavior from the `go` line of
  the main module. Upgrading the toolchain while leaving the `go` line alone preserves the old behavior.
- **Profile-guided optimization is generally available.** A `default.pgo` file in the main package directory enables it
  with no flag.

## Traps

- **`panic(nil)` now panics with `*runtime.PanicNilError`.** `recover` is guaranteed non-nil when called directly by a
  deferred function. Code that panicked with an untyped `nil` and detected it by a nil `recover` result breaks. The old
  behavior returns under `GODEBUG=panicnil=1`, applied automatically to modules declaring `go 1.20` or earlier.
- **`clear` on a slice zeroes, it does not truncate.** For "empty this slice", use `s = s[:0]` or `s = nil`.
