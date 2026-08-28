# Go 1.27

Released August 2026. Generic methods land, `encoding/json` is re-implemented on the v2 engine, and the toolchain starts
enforcing the language version on standard-library use by default.

## Language

- **Generic methods.** A method declaration may declare its own type parameters, so a generic operation can live in a
  type's namespace instead of the package's:

  ```go
  func (r *Rand) N[Int intType](n Int) Int
  ```

  Interface methods may not declare type parameters, and an interface method cannot be satisfied by a generic method.

- **A struct literal key may be any valid field selector**, not only a top-level field name, which initializes nested
  and embedded fields directly:

  ```go
  c := Config{Server.Addr: ":8080", Timeout: time.Second}
  ```

- **Function type inference is generalized** — it applies wherever a generic function is assigned to, or converted to, a
  matching function type, and to composite literals, conversions, and channel sends.

## Standard library

- **`encoding/json/v2` and `encoding/json/jsontext`** — `v2` is a full revision of `encoding/json` whose entry points
  (`Marshal`, `MarshalWrite`, `MarshalEncode`, `Unmarshal`, `UnmarshalRead`, `UnmarshalDecode`) take variadic `Options`.
  `jsontext` handles JSON syntax as a token and value stream. `v2` rejects invalid UTF-8 in strings and duplicate object
  names.
- **`encoding/json` is now backed by v2.** Behavior is preserved and the v1 API stays supported — migration is optional
  — but error message text differs, and `GOEXPERIMENT=nojsonv2` restores the old implementation. Unmarshal is
  significantly faster; marshal is at parity. In `v2` the `inline` tag option is named `embed`.
- **`uuid`** — generates and parses UUIDs in the standard library.
- **`crypto/mldsa`** — the post-quantum ML-DSA signature scheme from FIPS 204, wired into `crypto/x509` and, as
  `MLDSA44`/`MLDSA65`/`MLDSA87`, into TLS 1.3.
- **`strings.CutLast`** — slices a string around the last occurrence of a separator, replacing most `strings.LastIndex`
  arithmetic.
- **`synctest.Sleep`** — `time.Sleep` followed by `synctest.Wait`, the combination most bubble tests need.
- **`math/rand/v2` `(*Rand).N`** — the generic `N` is now a method as well as a package function, the first standard
  library use of generic methods.

## Toolchain

- **`go test` runs the `stdversion` vet check by default** — using a standard-library symbol newer than the file's
  effective language version now fails the test run, not just `go vet`.
- **`go fix` gained the `atomictypes`, `embedlit`, `slicesbackward`, and `unsafefuncs` modernizers.** `fmtappendf` was
  removed over stylistic concerns, and `waitgroup` was renamed `waitgroupgo`.
- **`go mod tidy` merges duplicate require blocks** for modules declaring `go 1.27` or later, enforcing at most two
  blocks — direct and indirect — while preserving attached comments.
- **`go doc` accepts `package@version`** (`go doc example.com/pkg@v1.2.3`) and the `-ex` flag to list or print runnable
  examples.
- **Removed GODEBUG settings are accepted at their final default value** in `go.mod` `godebug` entries and `//go:debug`
  comments, so a program that pinned a since-removed setting still builds. Setting one to its old value is an error.
- **The `bzr` version control system is no longer supported.**

## Runtime

- **Goroutine leak profiling is on by default** — the `goroutineleak` profile in `runtime/pprof` and the
  `/debug/pprof/goroutineleak` endpoint.
- **Small allocations are up to 30% cheaper** through size-specialized allocation routines.
- **Tracebacks carry `runtime/pprof` goroutine labels** for modules declaring `go 1.27` or later; disable with
  `GODEBUG=tracebacklabels=0`.

## Traps

- **`asynctimerchan` was removed permanently.** Timer and ticker channels are unbuffered for every module regardless of
  its `go` directive, so a module still declaring `go 1.22` or earlier loses the buffered behavior on this toolchain.
  See the timer rules in [Go 1.23](go1.23.md).
