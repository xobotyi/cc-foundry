---
name: golang
description: >-
  Write and review Go: idioms, error handling, concurrency, testing, project structure, the toolchain, and the language
  version a module's `go` directive permits.
when_to_use: >-
  Invoke whenever Go code is touched at all — writing, reviewing, refactoring, debugging, or exploring a Go project, or
  raising a module's `go` directive. Also invoke on the symptoms: a goroutine leaks or races, an error loses its
  context, a test flakes on timing, `go test` rejects a standard-library symbol, or a package resists naming. Covers
  the language, its standard library, and its toolchain; templ templates, Zog schemas, and Charm TUIs have their own
  skills, and language-agnostic workflow belongs to the coding skill.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

Simplicity is the highest Go virtue. Three biases decide most calls:

- **Resist abstraction until the cost of not abstracting is proven.** An interface, a type parameter, or a layer added
  in anticipation of a second caller is a defect.
- **Reach for the standard library first.** A dependency earns its place by doing what the standard library does not.
- **The `go` directive decides what may be written**, not the installed toolchain.

## Language Version

The `go` directive in `go.mod` sets the language version a module may use. Read it before writing code and never reach
for a feature above it. The `stdversion` analyzer reports a standard-library symbol newer than the directive: Go 1.27
and later fail `go test` on it, earlier toolchains report it under `go vet`.

Floor version per feature. Anything older than 1.21 is available in every supported module.

- **1.21** — `min`, `max`, `clear` builtins; `slices`, `maps`, `cmp`, `log/slog`; `context.WithoutCancel`;
  `errors.ErrUnsupported`; `sync.OnceValue`
- **1.22** — per-iteration loop variables; `for range int`; `math/rand/v2`; method and wildcard patterns in
  `net/http.ServeMux`
- **1.23** — range-over-func iterators; `iter`; iterator functions in `slices` and `maps`; `unique`; unbuffered timer
  channels
- **1.24** — generic type aliases; `os.Root`; `testing.B.Loop`; `t.Context`; `runtime.AddCleanup`; `omitzero` struct
  tag; `tool` directives; iterator functions in `strings`
- **1.25** — `testing/synctest`; `sync.WaitGroup.Go`; container-aware `GOMAXPROCS`
- **1.26** — `new(expr)`; self-referential type constraints; `errors.AsType`; `go fix` modernizers
- **1.27** — generic methods; field-selector keys in struct literals; `encoding/json/v2`; `uuid`; `strings.CutLast`

Read [`${CLAUDE_SKILL_DIR}/references/versions/go1.NN.md`] — one file per version, `go1.21.md` through `go1.27.md` —
when writing against a feature near the module's floor, and whenever raising the directive. Each carries what its
version added, which behavior changes the `go` directive gates, and the traps it introduced.

## Naming

- **Never `util`, `common`, `misc`, `shared`, `helpers`, or `types` as a package name.** Name a package for what it
  provides; one that resists naming is holding unrelated things.
- **Do not stutter.** The package name prefixes every qualified reference: `widget.New()`, never `widget.NewWidget()`.
- **Go source files are kebab-case**: `user-service.go`, `http-handler.go`.

## Interfaces

- **Define an interface where it is consumed**, never where it is implemented. Producers return concrete types.
- **Never define an interface for mocking.** Wait for a second implementation or a real consumer boundary.
- **Assert satisfaction at compile time** where the contract matters: `var _ http.Handler = (*Handler)(nil)`.

## Generics

- **Write the concrete version first.** Add type parameters when two or more implementations differ only by type — not
  in anticipation of a second caller.
- **Constrain by what the body uses.** `cmp.Ordered` when it compares, `any` when it only moves values. A constraint
  listing methods the function never calls is noise.
- **Prefer a type parameter to `any` plus a type switch** when callers know the type. It moves the failure to compile
  time and removes the assertion.
- **A function generic in a type it passes through unchanged is a function on `any`.** Drop the parameter.
- **Methods may declare their own type parameters** — put a generic operation in the type's namespace when it belongs
  there rather than the package's. Interface methods cannot be generic, so a generic method never satisfies an
  interface.

## Receivers

- **Never mix pointer and value receivers on one type.** Default to pointer; take a value receiver only for a small
  immutable value type.
- **Never take a pointer to a map, func, or channel** — they are already reference types.

## Context

- **Never store a `context.Context` in a struct or an option struct.** Pass it as the first parameter.
- **`context.Background()` only in `main()` and test setup.**
- **Never hand a request context to background work** — it is canceled when the response is sent. Use
  `context.WithoutCancel(r.Context())`.

## Declarations

- **Nil slices are valid and preferred**: `var s []string`, tested with `len(s) == 0`. Use `[]string{}` only where the
  JSON encoding must be `[]` rather than `null`. Pre-allocate when the size is known: `make([]T, 0, n)`.
- **`&T{}` for a pointer to a struct, `new(expr)` for a pointer to any other value** — `new(expr)` replaces the
  hand-rolled `ptr(v)` helper.
- **Start `iota` at 1** unless the zero value carries meaning: `const ( StatusActive Status = iota + 1; ... )`.
- **Name result parameters only where they document a caller obligation**, never to enable a naked return.

## Error Handling

- **Handle an error once — log it or return it, never both.** Logging and returning reports one failure at every level
  of the stack. If you log, degrade and stop; if you return, wrap and let the caller decide.
- **Wrap with context the underlying error does not already carry**: `fmt.Errorf("get user: %w", err)`. Lowercase, no
  trailing punctuation, no "failed to" prefix, `%w` last so the chain reads newest to oldest.
- **Use `%v` instead of `%w` when the wrapped error is an implementation detail** — `%w` commits your API to the
  dependency that produced it.
- **Match with `errors.Is` and `errors.As`, never `==` or a bare type assertion.** `errors.AsType[T]` is the generic
  form and needs no pre-declared target.
- **Wrap a sentinel before returning it** so callers cannot match it with `==`.
- **`errors.Join` only where every operation must be attempted** — closing a set of resources, validating every field.
  Never as a substitute for returning at the first failure on a sequential path.
- **Never silently drop an error from a deferred call.** Propagate a close error when no prior error exists; write
  `_ = f.Close()` where the drop is deliberate.
- **`MustXxx` panics only in package-level initialization and test helpers**, never in a request path.
- **Prefer the project's structured error package** — `ErrNotFound.Wrap(err)`, `e.NewFrom("context", err)` — over
  `fmt.Errorf` wherever one is in use, and use it for every error in that project.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/errors.md`] when the project uses golib/e, when designing a new error
type, or when a package needs internal panic/recover — it carries the golib/e API, the creation decision tree, and the
recover-at-the-boundary pattern.

## Gotchas

- **`:=` in an inner block silently shadows the outer variable**, `err` most often. Assign with `=` when the target is
  an outer variable.
- **`defer` evaluates its arguments immediately.** Capture later values in a closure: `defer func() { notify(s) }()`.
- **`defer` fires at function return, not at the end of a loop iteration.** Extract the loop body into a function.
- **`append` to a slice with spare capacity mutates the shared backing array**, and every slice over that array sees it.
  Cap with `s[:len(s):len(s)]` or copy.
- **A nil pointer in an interface is not nil.** Return an explicit `nil` from a function whose result type is an
  interface, never a typed nil.
- **Never copy a `sync.Mutex` or a struct holding one.** Copy slices and maps at API boundaries so callers cannot mutate
  your state.
- **Prefer `int`.** Sized integer types overflow silently, and only a protocol, a binary format, or a measured
  constraint justifies one.
- **`+=` in a loop is O(n²).** Use `strings.Builder` with `Grow`.
- **Name an inverted condition instead of commenting it**: `if cacheHit := err == nil; cacheHit {`. A name is read at
  the branch and cannot go stale.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/gotchas.md`] when one of these bites and the obvious fix does not hold
— it carries an annotated reproduction and fix for each.

## Concurrency

- **Every goroutine needs an exit condition and a way to wait for it.** No fire-and-forget: a goroutine nobody joins is
  a leak with a race attached.
- **No goroutines in `init()`.** Spawn them from a constructor that owns the lifecycle.
- **`context.Context` is the default cancellation mechanism.** Explicit stop and done channels belong only in code that
  predates it.
- **`wg.Go(f)` over `wg.Add(1)` plus `defer wg.Done()`** — the pair is where counter mistakes come from.
- **`errgroup.WithContext` over a hand-rolled WaitGroup and error collection.**
- **Channel buffer is zero or one.** A larger buffer requires knowing what stops it from filling.
- **Declare channel direction in signatures** (`<-chan`, `chan<-`) and close only from the sending side.
- **`select` picks a ready case at random**, not in source order. Drain the work channel after the stop signal where
  priority matters.
- **A nil channel blocks forever** — assign `nil` to a channel to remove its case from a `select` at runtime.
- **Mutexes are named fields, never embedded, never copied.** `defer mu.Unlock()` unless nanoseconds are measured. Reach
  for `atomic.Bool` and `atomic.Int64` for flags and counters.
- **`fmt.Errorf("%v", obj)` can deadlock** — it may call `obj.String()`, which may take the mutex you already hold.
  Format from fields you have already read.
- **Clone with `maps.Clone` inside the critical section.** Assigning a map or a slice shares the backing storage, so
  both variables see every write.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/concurrency.md`] when building a pipeline, a fan-out, a fan-in, or a
bounded worker pool — it carries the full pattern for each and the worker-with-lifecycle template.

## Testing

- **Table tests**: slice named `tests`, case named `tt`, inputs prefixed `give`, expectations prefixed `want`, every
  case under `t.Run` with a descriptive name. Every row must exercise every field.
- **Split into separate test functions** where cases need different setup, conditional assertions, or per-case mock
  configuration. A table whose fields only some rows use is two tests.
- **`require` for anything that makes the rest of the test meaningless** — error checks, nil guards. `assert` for
  independent value checks. `require.Equal` for structs and slices, never `reflect.DeepEqual`.
- **Never match an error by message text.** Use `errors.Is` or `errors.As`, and `require.ErrorContains` only where no
  sentinel exists.
- **`t.Fatal` only from the goroutine running the test.** Use `t.Errorf` and return in a spawned goroutine.
  `t.Parallel()` does not spawn one, so `t.Fatal` stays safe in a parallel subtest.
- **`t.Helper()` in setup helpers, never in an assertion wrapper** — there it hides the line that failed.
- **Use the self-undoing scoped helpers**: `t.TempDir()`, `t.Setenv()`, `t.Chdir()`, `t.Context()`, `t.Cleanup()`. A
  test that writes into its source directory or mutates the environment poisons the build cache, which keys on both.
- **Never `time.Sleep`.** For behavior that depends on time, run the test in a `synctest` bubble:
  `synctest.Test(t, func(t *testing.T) { ... })` gives it a fake clock that jumps forward the moment every goroutine in
  the bubble blocks, so a one-hour timeout resolves instantly. `synctest.Wait` blocks until the others are blocked.
- **`-race` on every run of concurrent code**, locally and in CI.
- **Prefer real service instances to mocks** — databases, caches, brokers. Gate the slow ones behind an environment
  variable and skip when it is unset.
- **Never assert on serialized output.** Parse and compare semantically; `json.Marshal` field order is not a contract.
- **Naming**: `Test_TypeName` for type-level tests, with `t.Run` per method or scenario. Black-box `package foo_test` by
  default; `package foo` in `foo_internal_test.go` where internals must be reached. Benchmarks in
  `foo_benchmark_test.go`.
- **Test doubles live in a package named for their subject plus `test`** — `creditcardtest` — with plain type names
  (`Stub`, `Fake`) where one type is doubled and prefixed names (`StubService`) where several are.
- **`for b.Loop()` for a benchmark loop.** The body runs once per `-count`, so setup outside it runs once, and arguments
  and results stay alive without a package-level sink.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/testing.md`] when writing the first test in a package, or when a test
needs `httptest` or `iotest` — it carries the table-test template, the parallel-with-teardown shape, and the utility
catalog.

## Project Structure

- **`internal/` by default.** Everything not deliberately part of the public API goes there, where it can be refactored
  without breaking anyone.
- **`cmd/<name>/` per binary**, holding `package main` and nothing else.
- **Start flat.** Add a directory when a package needs helpers of its own, a second command appears, or a sub-package
  serves a distinct importable purpose — never in anticipation.
- **Two import groups** — standard library, then everything else — separated by a blank line. Alias only to resolve a
  collision. Blank imports in `main` packages and tests only; dot imports in test files only.
- **Order a file by call order**: types and constants, constructor, exported methods grouped by receiver, unexported
  methods, helpers. Callers before callees.
- **Break compatibility in three commits** — add the new form, migrate the callers, delete the old form. Never combine a
  breaking change with new functionality.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/structure.md`] when creating a package or making a
backward-incompatible change — it carries the staged workflow and the package-naming examples.

## Configuration

For a constructor with three or more optional parameters, pick one shape and hold it across the package.

- **Option struct** where most callers set several options, or the options are shared across functions.
- **Functional options** where most callers set none, the option count is large, options need validation, or third
  parties must extend the set. Use the interface form, `type Option interface{ apply(*options) }`, and give every option
  a parameter: `rpc.FailFast(true)`, never `rpc.EnableFailFast()`.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/idioms.md`] when the choice is contested, or when a naming,
declaration, or embedding decision needs a worked example — it carries the decision table across both shapes.

## Types and Zero Values

- **Design the zero value to be useful.** `var buf bytes.Buffer` is ready to write to. Add a constructor only where a
  non-zero default is required.
- **Embed only where the promoted method set is the API you intend.** Embedding in an exported struct commits you to
  every exported method of the inner type, including the ones it has not added yet. Use a named field otherwise.
- **A type alias earns its place by adding meaning**: `type UserID string` does, `type MyString string` does not.
- **`Run` blocks until the work is done; `Start` returns immediately and owns a goroutine.** `Start` takes a context
  first.

## Standard Library

- **`slices` and `maps` over hand-written loops.** `slices.Contains`, `slices.SortFunc`, `slices.BinarySearch`,
  `slices.Compact`, `maps.Clone`, `maps.DeleteFunc`. A loop reimplementing one of these is a defect, not a style choice.
  Comparison helpers come from `cmp`.
- **`log/slog` for structured logging.** Reserve `log` for a binary's fatal path.
- **Iterators for sequences.** Return `iter.Seq[V]` or `iter.Seq2[K, V]` where the caller consumes elements one at a
  time and the whole set need not exist at once; return a slice where it is small and already materialized. Collect with
  `slices.Collect`, `slices.Sorted`, or `maps.Collect` — `maps.Keys` yields an iterator, so the ordered key slice is
  `slices.Sorted(maps.Keys(m))`.
- **Writing an iterator: stop as soon as `yield` returns false**, and release resources with `defer` inside the iterator
  function.
- **`os.Root` for any path that comes from outside the program.** Its methods refuse to escape the directory, symlinks
  included. `filepath.Clean` does not.
- **`math/rand/v2` over `math/rand`** for non-cryptographic randomness; `crypto/rand` where a value must be
  unpredictable.

## Documentation

- **Every exported symbol gets a doc comment starting with its name**, in complete sentences. Package documentation
  lives in `doc.go`.
- **Unexported symbols get none by default.** No external caller reads them, so non-obvious behavior there is a naming
  or shape problem first.
- **Update the doc comment in the edit that changes the symbol**, not afterwards.

## Global State

- **A library never forces global state.** Expose an instance API; a package-level convenience API is a thin proxy to an
  instance and belongs only in a binary.
- **Global state is acceptable only where it is logically constant, stateless, or free of external side effects.**

## Code Navigation

`gopls` is configured for `.go` files. Use LSP tools rather than Grep or Glob for anything that is a Go identifier —
they resolve imports, aliases, embedded types, and interface satisfaction, which text search cannot.

- **Where a symbol is defined** — `goToDefinition`
- **Every use of a symbol** — `findReferences`
- **Type, signature, or doc of a symbol** — `hover`
- **Symbols in one file** — `documentSymbol`; **across the module** — `workspaceSymbol`
- **Types satisfying an interface** — `goToImplementation`
- **Call graph in either direction** — `incomingCalls`, `outgoingCalls`

Grep and Glob stay correct for comments, string literals, log messages, build tags, config values, and file-name
patterns. Subagents exploring Go code reach the same LSP server — instruct them to use it.

## Toolchain

- **`golangci-lint run` must pass before a commit**, and **`golangci-lint fmt`** formats — never run `gofmt` or
  `goimports` separately.
- **`go fix` after raising the `go` directive.** It applies the modernizers mechanically; review the diff as a normal
  change.
- **`tool` directives in `go.mod` track executable dependencies.** Add with `go get -tool`, run with `go tool <name>`.
  Never reintroduce a `tools.go` blank-import file.

## Application

When **writing** Go, apply these conventions silently — do not narrate a rule while following it. Where existing code
contradicts one, follow the codebase and flag the divergence once.

When **reviewing** Go, cite the violation and show the fix inline. Do not lecture.

```
Bad:  "According to Go conventions, error strings should be lowercase..."
Good: errors.New("Not found.") -> errors.New("not found")
```

## Integration

The **coding** skill governs workflow — discovery, planning, verification. This skill governs Go implementation choices,
and wins on any question of how Go code should read. Both are active at once.

The **templ**, **zog**, and **charm-tui** skills own their library stacks and defer to this skill for language
conventions.

**When in doubt, write boring code.**
