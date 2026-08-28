# Go 1.24

Released February 2025. Completes generic type aliases, gives tests a directory sandbox and a correct benchmark loop,
and moves tool dependencies into `go.mod`.

## Language

- **Generic type aliases.** A type alias may declare type parameters, the same way a defined type does:

  ```go
  type Pair[T any] = struct{ A, B T }
  ```

## Standard library

- **`os.Root`** — directory-limited filesystem access. `os.OpenRoot(dir)` returns a `*os.Root` whose methods (`Open`,
  `Create`, `Mkdir`, `Stat`, and most other `os` operations) refuse any path that escapes the directory, including
  through a symlink. Use it wherever a path comes from outside the program.
- **`testing.B.Loop`** — `for b.Loop() { ... }` replaces `for range b.N`. The body runs exactly once per `-count`, so
  setup and cleanup outside the loop execute once rather than per iteration, and call parameters and results stay alive,
  which stops the compiler from optimizing the body away.
- **`testing.T.Context` and `testing.B.Context`** — a context canceled after the test finishes and before cleanup
  functions run.
- **`testing.T.Chdir` and `testing.B.Chdir`** — change the working directory for the duration of the test.
- **`runtime.AddCleanup`** — attaches a cleanup function that runs once an object is unreachable. Prefer it over
  `runtime.SetFinalizer`: several cleanups may attach to one object, they work on interior pointers, they do not leak on
  reference cycles, and they do not delay freeing.
- **`weak`** — weak pointers, for caches and canonicalization maps that `unique` does not cover.
- **Iterators in `strings`** — `Lines`, `SplitSeq`, `SplitAfterSeq`, `FieldsSeq`, `FieldsFuncSeq`.
- **`omitzero` in struct tags** — omits a field whose value is the zero value for its type, or whose `IsZero() bool`
  method reports true. Unlike `omitempty` it omits a zero `time.Time`, which is what most code intends.
- **`encoding.TextAppender` and `encoding.BinaryAppender`** — append a representation to an existing byte slice instead
  of allocating a new one per call.
- **`crypto/hkdf`, `crypto/pbkdf2`, `crypto/sha3`, `crypto/mlkem`** — promoted from `golang.org/x/crypto`, plus
  post-quantum ML-KEM.
- **`sync.Map` was reimplemented** — modifications of disjoint key sets contend far less, with no ramp-up time.

## Toolchain

- **`tool` directives in `go.mod`** — track executable dependencies without the `tools.go` blank-import workaround. Add
  with `go get -tool`, run with `go tool <name>`, upgrade all with `go get tool`, install all with `go install tool`.
- **`go build` records the module version from version control** — the VCS tag or commit, with a `+dirty` suffix for
  uncommitted changes. Disable with `-buildvcs=false`.
- **`go build -json` and `go install -json`** report build output and failures as structured JSON; `go test -json` now
  interleaves build JSON with test results.
- **New `go vet` `tests` analyzer** — malformed test, fuzz, benchmark, and example declarations, some of which silently
  stop a test from running. It is part of the subset that `go test` runs.
- **`GOAUTH`** configures authentication for private module fetches.

## Behavior gated by the `go` directive

- **`go vet` reports `fmt.Printf(s)` with a non-constant format string** only for files at language version 1.24 or
  later, so upgrading a toolchain does not break CI on older modules. Use `fmt.Print` for a non-constant string.
- **`go vet buildtag`** rejects a point release in a build constraint: write `//go:build go1.23`, not
  `//go:build go1.23.1`.

## Traps

- **`copylock` now flags a 3-clause `for` loop that carries a `sync.Locker`.** Since Go 1.22 each iteration copies the
  previous iteration's value, and copying a lock is never safe.
- **`testing/synctest` in this version is experimental and has a different API.** It required `GOEXPERIMENT=synctest`
  and exposed `Run`, not `Test`. Write against the [Go 1.25](go1.25.md) API.
