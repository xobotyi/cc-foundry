# Go 1.22

Released February 2024. Fixes the loop-variable capture bug that shaped a decade of Go idioms, and makes `net/http`
routing expressive enough to replace most third-party routers.

## Language

- **Loop variables are per-iteration.** Each iteration of a `for` loop creates new variables. A goroutine or closure
  that captures the loop variable now sees that iteration's value.
- **`for` ranges over integers.** `for i := range 10` iterates `0` through `9`.

  ```go
  for i := range 10 {
      fmt.Println(10 - i)
  }
  ```

## Standard library

- **`math/rand/v2`** — the first `v2` package in the standard library. `IntN`, `Int32N`, `Int64N`, `UintN` replace the
  `Intn`/`Int31n` spellings; the generic `N` works with any integer type, so `rand.N(5*time.Minute)` is a random
  duration. Sources are `ChaCha8` and `PCG`; the global generator is always randomly seeded, and `Read` is gone — use
  `crypto/rand.Read`.
- **Method and wildcard patterns in `net/http.ServeMux`** — `"POST /items/create"` restricts the method, `/items/{id}`
  captures a segment read back with `Request.PathValue`, `/files/{path...}` captures the rest of the path, and
  `/exact/match/{$}` matches the trailing slash exactly. The more specific pattern wins regardless of registration
  order; overlapping patterns that are equally specific conflict and panic.
- **`go/version`** — validates and compares Go version strings.

## Toolchain

- **`go work vendor`** creates a vendor directory for a whole workspace, used when `-mod=vendor` is in effect.
- **`go vet` no longer reports loop-variable capture** in files whose effective language version is 1.22 or later. The
  diagnostic remains for older files, where the bug is still real.
- **New `go vet` checks** — `append` with no values to append, a non-deferred `time.Since(t)` inside a `defer`
  statement, and mismatched key-value pairs in `log/slog` calls.
- **`go test -cover` reports 0.0% for packages without test files** instead of `[no test files]`.
- **`go get` no longer works outside a module** in `GO111MODULE=off` mode.

## Traps

- **`x := x` loop copies become dead code.** Once the module declares `go 1.22`, the shadow copy that guarded against
  capture is redundant. Delete it rather than leaving a misleading idiom in place.
- **Routing patterns changed incompatibly.** `{` and `}` in a pattern now have meaning, and escaped-path handling
  changed. `GODEBUG=httpmuxgo121=1` restores the Go 1.21 matcher.
- **Loop variables in 3-clause `for` loops are copied per iteration too.** A `sync.Locker` declared in the loop header
  is copied — see the `copylock` diagnostic added in [Go 1.24](go1.24.md).

## Preview

Range-over-function iterators were available under `GOEXPERIMENT=rangefunc`. They shipped in [Go 1.23](go1.23.md).
