# Go 1.26

Released February 2026. Two small language additions that remove common boilerplate, and a rewritten `go fix` that
mechanizes idiom upgrades.

## Language

- **`new` accepts an expression.** `new(expr)` allocates a variable initialized to `expr` and returns its address, which
  collapses the "pointer to a value" dance that optional struct fields require:

  ```go
  type Person struct {
      Name string `json:"name"`
      Age  *int   `json:"age"` // age if known; nil otherwise
  }

  p := Person{Name: name, Age: new(yearsSince(born))}
  ```

- **A generic type may refer to itself in its own type parameter list.** Self-referential constraints are now legal:

  ```go
  type Adder[A Adder[A]] interface {
      Add(A) A
  }
  ```

## Standard library

- **`errors.AsType[T]`** — the generic form of `errors.As`. Type-safe, faster, and it drops the declare-then-pass-a-
  pointer ritual: `if pathErr, ok := errors.AsType[*fs.PathError](err); ok {`.
- **`slog.NewMultiHandler`** — fans one record out to several handlers; `Enabled` reports true if any handler is
  enabled.
- **`signal.NotifyContext` cancels with a cause** identifying which signal arrived, readable with `context.Cause`.
- **`testing.T.ArtifactDir`** — a directory for test output files, persisted under `-outputdir` when
  `go test -artifacts` is set and discarded otherwise.
- **`testing.B.Loop` no longer blocks inlining** in the loop body. Every remaining `b.N` benchmark can now be converted
  without a performance surprise.
- **`crypto/hpke`** — Hybrid Public Key Encryption per RFC 9180, including post-quantum hybrid KEMs.
- **`io.ReadAll` allocates about half as much** and returns a minimally sized slice.

## Toolchain

- **`go fix` is the home of the modernizers.** It runs on the same analysis framework as `go vet` and rewrites code to
  current idioms and APIs — dozens of fixers, plus a source-level inliner driven by `//go:fix inline` directives. Run it
  when raising the `go` directive of a module. The historical, obsolete fixers were deleted.
- **`go mod init` targets one version back.** A `1.N` toolchain writes `go 1.(N-1).0`, so a new module is buildable by
  every supported release. Override with `go get go@version`.
- **`cmd/doc` and `go tool doc` were deleted.** `go doc` takes the same flags and arguments.
- **`pprof -http` opens the flame graph by default**; the old graph view lives under `/ui/graph`.

## Runtime

- **The Green Tea garbage collector is the default**, cutting collection overhead by 10–40% in allocation-heavy
  programs, with a further 10% on Intel Ice Lake, AMD Zen 4, and newer through vector scanning. The
  `GOEXPERIMENT=nogreenteagc` opt-out was removed in [Go 1.27](go1.27.md).
- **Heap base address randomization** is on.
- **Goroutine leak profile** available under `GOEXPERIMENT=goroutineleakprofile` — reports goroutines blocked on a
  concurrency primitive that no runnable goroutine can reach, which is the shape of the classic "early return from a
  fan-in loop leaks every worker" bug. Default from Go 1.27.

## Traps

- **The Go 1.24 `GOEXPERIMENT=synctest` API was removed.** Code still calling `synctest.Run` must move to
  `synctest.Test`.
