---
name: golang
description: >-
  Go language conventions, idioms, and toolchain. Invoke when task involves any interaction
  with Go code — writing, reviewing, refactoring, debugging, or understanding Go projects.
---

# Go

Simplicity is the highest Go virtue. Resist abstraction until the cost of not abstracting
is proven.

## References

Extended examples, code patterns, and detailed rationale for the rules below live in
`references/`.

| Topic | Reference | Contents |
|-------|-----------|----------|
| Naming, declarations, interfaces, receivers, configuration, embedding | [idioms.md](references/idioms.md) | Extended code examples for each idiom, Go/bad vs good comparisons, decision criteria tables |
| Variable shadowing, defer traps, slice mutation, strings, copy safety | [gotchas.md](references/gotchas.md) | Annotated code showing each pitfall with fix patterns, global state examples |
| Error creation, wrapping, Is/As, structured errors (golib/e) | [errors.md](references/errors.md) | Error type decision tree, golib/e API (sentinels, fields, logging), wrapping context examples |
| Goroutines, channels, context, sync, errgroup, data races | [concurrency.md](references/concurrency.md) | Worker lifecycle patterns, pipeline/fan-out/fan-in code, data race scenarios with fixes |
| Table tests, subtests, assertions, test doubles, benchmarks | [testing.md](references/testing.md) | Full table-test template, testify usage, parallel subtests, httptest/iotest utilities |
| Project layout, packages, imports, file organization | [structure.md](references/structure.md) | Package naming examples, import grouping, backward-incompatible change staged workflow |

## Naming

### Variables — The Distance Rule

Name length scales with scope distance.

| Scope | Style | Examples |
|-------|-------|----------|
| Loop index | Single letter | `i`, `j`, `k` |
| Short function local | 1-3 chars | `r` (reader), `b` (buffer), `ctx` |
| Function parameter | Short but clear | `name`, `path`, `opts` |
| Package-level | Descriptive | `defaultTimeout`, `maxRetries` |
| Exported | Self-documenting | `ErrNotFound`, `DefaultClient` |

### Receivers

Use 1-2 letter type abbreviation: `c` for `Client`, `s` for `Server`. Never `self`, `this`,
`me`. Be consistent across all methods of a type.

### Initialisms

All-caps for known initialisms: `URL`, `HTTP`, `ID`, `API`, `SQL`, `XML`. In mixed
identifiers: `userID`, `httpClient`, `xmlHTTPRequest`.

### Packages

- Short, lowercase, singular: `user`, `http`, `auth`
- Named by what they provide, not what they contain
- Never `util`, `common`, `misc`, `shared`, `helpers`, `types`
- Callers use package name as prefix — don't stutter: `widget.New()` not `widget.NewWidget()`

### Getters and Setters

No `Get` prefix on getters. Setter uses `Set` prefix: `u.Name()` not `u.GetName()`,
`u.SetName(n)`.

### Interface Names

One-method interfaces use method name plus `-er`: `Reader`, `Writer`, `Formatter`, `Stringer`.
Honor canonical names — if your type has `String() string`, call it `String`, not `ToString`.

### Constants

MixedCaps only — never `ALL_CAPS` or `K` prefix. Name by role, not value. If a constant has
no role beyond its value, don't define it. `const MaxRetries = 12` (good) vs
`const Twelve = 12` (bad).

### Unexported Globals

Prefix with `_`: `_defaultPort`, `_maxRetries`. Exception: error values use `err` prefix:
`errNotFound`.

### Avoid Repetition

- Package name is part of every qualified reference: `widget.New()` not `widget.NewWidget()`
- Don't encode type in name: `var users int` not `var numUsers int`
- Strip context obvious from scope: method on `*Project` uses `Name()` not `ProjectName()`

## Interfaces

- **Consumer-side.** Define where used, not where implemented. Producers return concrete types.
- **No premature interfaces.** Wait for a concrete need. Don't define "for mocking."
- **Accept interfaces, return structs.**
- **Never pointer-to-interface.** Interfaces are already reference types.
- **Small interfaces.** Prefer 1-3 methods. `io.Reader` (1 method) is more powerful than any
  10-method interface.
- **Compile-time verification.** `var _ http.Handler = (*Handler)(nil)`.

## Receivers

### Pointer vs Value

Use **pointer receiver** when: method mutates receiver, receiver contains `sync.Mutex` or
similar, receiver is a large struct, or in doubt (default to pointer).

Use **value receiver** when: receiver is a small immutable value type (like `time.Time`),
receiver is a map/func/chan (already reference types), all fields are value types with no
mutability needs.

**Never mix** receiver types on a single type.

### Maps, Funcs, and Channels

Already reference types. Never use pointers to them: `func process(m map[string]int)` not
`func process(m *map[string]int)`.

## Context

- **First parameter.** `func Foo(ctx context.Context, ...)`.
- **Never store in structs.** Pass through call chains explicitly.
- **`context.Background()` only at the top level** — in `main()` or test setup.
- **Never include `context.Context` in option structs** — pass as separate parameter.

## Declarations

### Variable Style

- `var` for zero values: `var s string`, `var mu sync.Mutex`
- `:=` for initializations: `s := "hello"`, `n := computeSize()`
- Top-level: use `var`, omit type if obvious: `var _defaultPort = 8080`
- Specify type when it differs from expression: `var _e error = myError{}`

### Slices

- Nil slices are valid and preferred: `var s []string`
- Non-nil zero-length only when JSON encoding matters: `s := []string{}` (nil encodes as
  `null`, empty slice as `[]`)
- Check empty: `len(s) == 0`, not `s == nil`
- Pre-allocate when size known: `make([]T, 0, n)`

### Maps

- `make(map[K]V)` for programmatic population; `make(map[K]V, n)` with capacity hint
- Literal for fixed content: `map[string]int{"a": 1, "b": 2}`

### Structs

- Always use field names in literals
- Omit zero-value fields unless they provide meaningful context
- Zero-value struct: `var user User`
- Pointer: `&T{}` over `new(T)`

### Enums

Start `iota` at 1 to distinguish from zero-value (unless zero-value has meaning):
`const ( StatusActive Status = iota + 1; ... )`.

### Named Result Parameters

Use when they disambiguate or document caller obligations. Don't use just to enable naked
returns, or when the name repeats the type.

## Functions

- **Synchronous default.** Let callers add concurrency.
- **Return errors, never exit.** Only `main()` calls `os.Exit`/`log.Fatal`.
- **`defer` for cleanup.** Always.
- **Early return on error.** Happy path at minimum indentation.
- **Accept `io.Reader`, not filenames.** Improves reusability and testability.
- **Close transient resources.** `defer r.Body.Close()`, `defer rows.Close()`,
  `defer f.Close()`.

## Error Handling

### Core Rules

- **Always check errors.** Never discard with `_`.
- **Handle once.** Log OR return — never both. If logging, degrade gracefully (don't return
  the error). If returning, wrap with context and let the caller decide.
- **Wrap with context.** Prefer structured errors when the project uses them:
  `ErrNotFound.Wrap(err)` or `e.NewFrom("context", err)`. Standard fallback:
  `fmt.Errorf("context: %w", err)`. Avoid "failed to" prefix in both.
- **Error strings**: lowercase, no trailing punctuation. They compose:
  `"read config: open file: permission denied"`.
- **Don't panic.** Return errors. Reserve panic for truly irrecoverable states.
- **Use `errors.Is`/`errors.As`** — never `==` or direct type assertion on wrapped errors.

### Error Creation

| Caller needs to match? | Message | Use |
|------------------------|---------|-----|
| No | Static | `errors.New("not found")` |
| No | Dynamic | `fmt.Errorf("file %q missing", name)` |
| Yes | Static | Exported `var ErrNotFound = errors.New(...)` |
| Yes | Dynamic | Custom error type with `Error()` method |

### Sentinel Errors

Naming: exported `ErrXxx`, unexported `errXxx`. Always wrap sentinels before returning so
callers use `errors.Is`, not `==`.

### Custom Error Types

Naming: exported `XxxError`, unexported `xxxError`. Implement `Error() string`. Callers match
with `errors.As`.

### Structured Errors (golib/e)

When a project uses a structured error package like golib/e, prefer it consistently over
`fmt.Errorf`. See [errors.md](references/errors.md) for API details.

### Wrapping: %w vs %v

- `%w` wraps (callers can unwrap with `errors.Is`/`errors.As`) — default choice
- `%v` creates new error with original's text only — use when underlying error is an
  implementation detail
- **Wrap** when: caller provided the input that caused the error, or the underlying error is
  part of your API contract
- **Don't wrap** when: error source is an implementation detail (wrapping commits you to the
  underlying dependency)

### Wrapping Context

- Keep context succinct: `"get user: %w"` not `"failed to get user: %w"`
- Place `%w` at end of format string so error text mirrors chain structure (newest-to-oldest)
- Don't repeat information the underlying error already provides
- Don't annotate if annotation adds no new information — just return `err`

### In-Band Errors

Don't use sentinel return values (`-1`, `""`, `nil`) to signal failure. Return `(T, error)` or
`(T, bool)`.

### Must Functions

`MustXYZ` panics on error. Legitimate only for package-level initialization and test helpers.
Never use in request handlers or runtime code paths.

### Type Assertions

Always use comma-ok form: `s, ok := val.(string)`. Never `s := val.(string)` (panics on
wrong type).

### Defer Errors

Don't silently ignore errors from deferred calls (`f.Close()`, `rows.Close()`,
`resp.Body.Close()`). Propagate close error if no prior error exists. When intentionally
ignoring, use `_ =` to make it explicit.

### Internal Panic/Recover

Acceptable only when panics never escape package boundaries and a top-level deferred
`recover` translates them to errors. Rare — see
[errors.md](references/errors.md) for the full pattern.

### Error Flow

Indent errors, keep happy path flat. Early return on error, never nest the happy path in
`else` blocks.

## Gotchas

### Variable Shadowing

`:=` in inner blocks (if/for) silently hides outer variables. The `err` variable is
commonly shadowed. Use `go vet -shadow` or `golangci-lint` to detect. Always verify
assignments in inner blocks use `=` (not `:=`) when targeting outer-scope variables.

### Defer Argument Evaluation

`defer` evaluates arguments immediately, not when the deferred function runs. Use closures
to capture current values: `defer func() { notify(status) }()`.

### Defer in Loops

`defer` runs when the surrounding function returns, not at end of loop iteration. Extract
loop body to a function so `defer` fires per iteration.

### Slice Append Mutation

`append` on a slice with remaining capacity mutates the underlying array. Slices derived
from the same array see each other's writes. Fix: use full slice expression
`s[:len(s):len(s)]` to cap capacity, or explicit `copy`.

### Strings: Runes vs Bytes

`len(s)` returns byte count, not rune count. Use `range` over string to iterate runes (not
`s[i]`). Use `utf8.RuneCountInString(s)` for rune count.

### String Concatenation

Use `strings.Builder` with `Grow` when concatenating in a loop — `+=` is O(n^2). For a few
fixed strings, `+` or `fmt.Sprintf` is fine.

### Copy Safety

- Never copy `sync.Mutex` or types containing one
- Don't copy structs with pointer fields unless you understand aliasing
- Copy slices/maps at API boundaries to prevent external mutation

### Fixed Bit-Width Types

Prefer `int` unless a specific width is required by a protocol, binary format, or
performance constraint. `int8`, `uint16`, etc. are prone to silent overflow.

### Signal Boosting

When code does the opposite of what's common (e.g., checking `err == nil` instead of
`err != nil`), add a comment to draw attention.

### Typed Nil Interface Trap

A `(*T)(nil)` assigned to an interface is non-nil. Return explicit `nil` when the function
returns an interface type, never a typed nil.

## Concurrency

### Goroutine Lifecycle

Every goroutine must have: (1) a predictable exit condition, and (2) a way for other code
to wait for it to finish. No fire-and-forget goroutines — they leak memory and cause data
races.

### Cancellation: context.Context (Primary)

Use `context.Context` as the default for all goroutine lifecycle management. Caller creates
context with cancel, goroutine selects on `ctx.Done()`.

### Joining: sync.WaitGroup

Use `sync.WaitGroup` to wait for multiple goroutines to finish. It handles joining, not
cancellation. Call `wg.Add(1)` before launching, `defer wg.Done()` inside the goroutine.

### Worker Lifecycle Pattern

For long-lived goroutines, wrap in a struct with `context.Context` for cancellation and a
done channel or `WaitGroup` for joining. Close done channel via `defer close(w.done)` in
the run method.

### Stop + Done Channels (Alternative)

When `context.Context` is unavailable (infrastructure code predating context), use explicit
stop/done channels. Prefer `context.Context` in new code.

### Channels vs Mutexes

| Relationship | Mechanism | Why |
|-------------|-----------|-----|
| Parallel goroutines accessing shared state | `sync.Mutex` | Synchronization |
| Concurrent goroutines coordinating work | Channels | Communication/orchestration |
| Transferring ownership of a resource | Channels | Signaling completion |

Mutexes protect shared state. Channels coordinate independent actors.

### Channel Rules

- **Size: zero or one.** Larger buffers require justification — you must know what prevents
  the channel from filling.
- **Direction in signatures.** Specify `<-chan` or `chan<-` in function parameters/returns.
- **Close from sender side.** Never close from receiver.
- **Sends on closed channels panic.** Ensure all sends finish before closing.

### Pipeline Pattern

Stages connected by channels: each stage receives from upstream, processes, sends downstream.
Close output channel via `defer close(out)` in the goroutine.

### Fan-Out, Fan-In

Fan-out: multiple goroutines read from one channel. Fan-in: merge multiple channels into one
using a WaitGroup to close the merged channel when all inputs are done.

### Bounded Parallelism

Limit concurrent work with a fixed worker pool reading from a shared channel.

### Select Behavior

When multiple cases are ready, `select` picks one at random — not in source order. For
priority, drain the work channel after receiving the stop signal.

### Nil Channels

A nil channel blocks forever on send and receive. Set a channel to `nil` to remove it from
a `select` at runtime.

### errgroup

Prefer `errgroup.WithContext` over manual `sync.WaitGroup` + error collection. It manages
goroutine groups with error propagation and context cancellation. First non-nil error from
any goroutine is returned by `g.Wait()`.

### Context Propagation

Don't pass HTTP request context to background goroutines — it cancels when the response is
sent. Use `context.WithoutCancel(r.Context())` (Go 1.21+) for fire-and-forget background
work.

### Synchronization Primitives

- **Mutex:** zero-value is valid. Use named field `mu sync.Mutex`, never embed. Never copy.
  Use `defer mu.Unlock()` unless nanosecond performance matters.
- **Atomics:** for simple flags/counters, prefer `sync/atomic` types (`atomic.Bool`,
  `atomic.Int64`).

### Data Race Gotchas

- **Append on shared slices:** `append` isn't data-race-free when slice has spare capacity.
  Copy before passing to goroutines.
- **Map/slice assignment doesn't copy:** both variables point to same backing storage. Deep
  copy inside critical section (`maps.Clone`).
- **String formatting deadlocks:** `fmt.Errorf("%v", obj)` may call `obj.String()`, which may
  lock the same mutex. Validate before locking, or format with direct field access.

### Concurrency Rules

- No goroutines in `init()` — spawn in constructors with lifecycle management.
- Use `select` with done/context for cancellable operations.

## Testing

### Table-Driven Tests

- Slice named `tests`, each case `tt`
- Inputs prefixed `give`, outputs prefixed `want`
- Always use `t.Run` with descriptive names
- Use field names in struct literals
- Omit zero-value fields unless they add context
- Every row must use every field — uniform logic only

### When NOT to Use Table Tests

Split into separate `Test...` functions when: different cases need different setup/mocking,
conditional assertions inside the loop, complex mock configuration per case, or table fields
used only by some cases.

### Subtests

`t.Run` creates subtests: `t.Fatal` stops only the current subtest, run individually with
`go test -run=TestX/case`, shared setup/teardown via parent function.

### Parallel Tests

Call `t.Parallel()` in subtests. In Go 1.22+, `tt` is safe in the closure. For Go < 1.22,
shadow: `tt := tt`. Group parallel subtests with teardown by nesting under an intermediate
`t.Run("group", ...)`.

### Assertions (testify)

- **`require`** — stops test on failure. Use for error checks and nil guards.
- **`assert`** — reports failure, continues. Use for independent value checks.
- `require.Equal`/`assert.Equal` for struct and slice comparison — never `reflect.DeepEqual`
  directly.
- `assert.ElementsMatch` for order-independent slice comparison.

### Test Error Semantics

- Prefer `errors.Is` / `errors.As` for semantic matching
- `require.ErrorContains` for substring when no sentinel available
- Never use exact string matching on error messages

### t.Error vs t.Fatal

Prefer `t.Error` to report all failures at once. Use `t.Fatal` only for setup failures or
when a check makes subsequent checks impossible.

### t.Fatal in Goroutines

`t.Fatal`/`t.Fatalf`/`t.FailNow` must only be called from the goroutine running the test
function. Use `t.Errorf` + `return` in spawned goroutines. Note: `t.Parallel()` does NOT
create a new goroutine — `t.Fatal` is safe in parallel subtests.

### Test Helpers

Mark with `t.Helper()` so failures report the caller's line. Don't use `t.Helper()` in
assert-like wrappers — it hides the connection between failure and cause.

### Test Double Package Naming

Name by appending `test` to production package: `creditcardtest`. Use simple names (`Stub`,
`Fake`) when only one type needs doubling; prefix with type name (`StubService`,
`StubStoredValue`) when multiple. Prefix test double variables: `var spyCC creditcardtest.Spy`.

### Scoped Test Setup

Keep setup scoped to tests that need it. Don't use `init()` or package-level vars for test
data. Use `sync.Once` for expensive setup shared across tests.

### Test Cache Safety

Go's test cache uses file mtime and env values. Never write to source directory in tests —
use `t.TempDir()` for temp files and `t.Setenv()` for environment variables.

### Live Services Over Mocks

Prefer real service instances (databases, caches, brokers) over synthetic mocks. Gate slow
tests behind environment variables and skip when not set.

### Test Naming and Organization

- `Test_TypeName` with underscore for type-level tests, `t.Run()` for method/scenario
- Black-box preferred: `package foo_test` in `foo_test.go`
- White-box when needed: `package foo` in `foo_internal_test.go`
- Benchmark files: `foo_benchmark_test.go` or `foo_benchmark_internal_test.go`

### Block Scoping

Use bare blocks `{}` for logical grouping when separate test reporting is unnecessary. Use
`t.Run()` when you need parallel execution, selective running, or per-scenario reporting.

### Complementary Operations

Test complementary operations together (Put + Get) when it reduces duplication. Split only
when operations have independent failure modes.

### Compare Stable Results

Don't assert on serialization output — parse and compare semantically. Never depend on
`json.Marshal` field ordering.

### Runnable Examples

Write `func Example...` for complex APIs — godoc renders them, `go test` verifies them.
The `// Output:` comment makes the example a test.

### Race Detection

Always run tests with `-race` for concurrent code. Enable in CI. Use `//go:build !race` to
exclude specific files if needed.

### Avoid Sleeping

`time.Sleep` in tests creates flaky tests. Use channels, WaitGroups, or polling with timeout.
If synchronization is impossible, use a retry/poll loop with deadline.

### Testing Utilities

- `httptest.NewRequest`/`httptest.NewRecorder` for in-process HTTP handler testing
- `httptest.NewServer` for testing clients against fake servers
- `testing/iotest.ErrReader` for error-injecting readers
- `testing/iotest.OneByteReader` for one-byte-at-a-time reads

### Benchmarks

- Use `b.Loop()` (Go 1.24+) or `for i := 0; i < b.N; i++`
- `b.ResetTimer()` after expensive setup
- `b.ReportAllocs()` to track allocations
- Assign result to package-level var to prevent compiler elimination
- Use `-benchtime=5s` or `benchstat` for stable micro-benchmarks

## Project Structure

### Layout Principles

- **`internal/` for encapsulation.** All server logic, supporting packages not part of public
  API. Refactor freely without breaking external consumers.
- **`cmd/` for commands.** Each subdirectory declares `package main`. Install with
  `go install .../cmd/tool@latest`.
- **Start flat.** Add directories only when a package needs internal helpers, multiple commands
  exist, or sub-packages serve distinct importable purposes.

### Package Design

- Lowercase, no underscores: `userstore` not `user_store`
- Singular: `user` not `users`
- By purpose: `auth`, `cache`, `handler`

### Imports

Two groups separated by blank line: (1) standard library, (2) everything else. Alias only to
avoid conflicts. Blank imports (`import _ "pkg"`) only in `main` packages or tests. Dot
imports only in test files to resolve circular dependencies.

### Function Organization

Within a file, order by: (1) types, constants, variables, (2) constructor (`New...`),
(3) exported methods grouped by receiver, (4) unexported methods grouped by receiver,
(5) utility functions. Order by rough call order — callers before callees.

### File Organization

- One file per major type (for large types)
- Test file adjacent: `foo.go` -> `foo_test.go`
- Keep related code together — don't scatter features across files
- `doc.go` for package-level documentation if needed
- Kebab-case for Go source files: `user-service.go`, `http-handler.go`

### Backward-Incompatible Changes

Staged workflow: (1) add new code without touching old, (2) migrate callers, (3) remove old
code. Each step is a separate commit. Never combine breaking changes with new functionality.

## Configuration Patterns

For constructors with 3+ optional parameters, choose between option structs and functional
options.

### Option Structs

Use when most callers need several options, or options are shared across functions. Benefits:
self-documenting field names, zero-value omission, easy to share and extend. Never include
`context.Context` in option structs.

### Functional Options

Use when most callers need zero options, there are many options, or options require
validation. Use the interface form (`type Option interface{ apply(*options) }`) over closures
for testability. Options should accept parameters, not use presence as signal:
`rpc.FailFast(true)` not `rpc.EnableFailFast()`.

### Decision Criteria

| Factor | Option Struct | Functional Options |
|--------|--------------|-------------------|
| Most callers need several options | Prefer | Either |
| Most callers need zero options | Either | Prefer |
| Options need validation | Either | Prefer |
| Options shared across functions | Prefer | Either |
| Third-party extensibility needed | Avoid | Prefer |

## Zero-Value Design

Design types so the zero value is immediately useful — no constructor needed. `var buf
bytes.Buffer` is ready to use. Only write constructors when non-zero defaults are required.

## Embedding

Embedding promotes methods of the inner type to the outer type. Use embedding when promoted
methods ARE your intended API. Use named fields when you don't want to expose the inner
type's full method set. Never embed in public API structs unless the promoted surface is
intentional — it commits your API to every exported method including future additions.
Embedding in `internal/` types is lower risk.

## Long-Running Process Naming

- **Run** — blocks until process completes. Caller controls the goroutine.
- **Start** — returns immediately, spawns internal goroutine. Accept `context.Context` as
  first parameter for cancellation.

## Type Preferences

- Prefer `any` over `interface{}` (Go 1.18+). Only use `any` when truly accepting any type.
- Use type aliases for semantic meaning: `type UserID string` adds type safety.
  `type MyString string` adds nothing.

## Doc Comments

Every exported symbol gets a doc comment starting with its name. Complete sentences,
period-terminated. Package comment in `doc.go` or primary `.go` file. Unexported types:
comment when behavior is non-obvious, skip when trivial.

## Global State

Libraries must not force global state. Expose instance-based APIs. Global state is safe only
when logically constant, stateless, or has no external side effects. If providing convenience,
make the global API a thin proxy to an instance API, and restrict to binaries — never
libraries.

## Application

When **writing** Go code: apply all conventions silently — don't narrate each rule. If
an existing codebase contradicts a convention, follow the codebase and flag the divergence.

When **reviewing** Go code: cite the specific violation and show the fix inline. Don't
lecture — state what's wrong and how to fix it.

```
Bad:  "According to Go conventions, error strings should be lowercase..."
Good: "errors.New("Not found.") -> errors.New("not found")"
```

## Code Navigation — LSP Required

This plugin provides a `gopls` LSP server. When working with Go code, **always use LSP tools
for code navigation instead of Grep or Glob**. LSP understands Go's type system, scope rules,
and module boundaries — text search does not.

### Tool Routing

| Task | Tool | Operation | Why |
|------|------|-----------|-----|
| Find where a function/type/method is defined | LSP | `goToDefinition` | Resolves imports, aliases, embedded types |
| Find all usages of a symbol | LSP | `findReferences` | Scope-aware, no false positives |
| Get type signature, docs, or return types | LSP | `hover` | Instant type info |
| List all symbols in a file | LSP | `documentSymbol` | Structured output |
| Find a symbol by name across the project | LSP | `workspaceSymbol` | Searches all packages |
| Find concrete types implementing an interface | LSP | `goToImplementation` | Knows the type system |
| Find what calls a function | LSP | `incomingCalls` | Precise call graph |
| Find what a function calls | LSP | `outgoingCalls` | Structured dependency map |

**Still use Grep/Glob for:** text patterns in comments/strings/logs/TODOs, config values,
build tags, file-level patterns, finding files by name, content that isn't Go identifiers.

### LSP Anti-Patterns

| Don't | Do |
|-------|------|
| `Grep "func HandleRequest"` to find definition | `LSP goToDefinition` on a call site |
| `Grep "HandleRequest"` to find all usages | `LSP findReferences` on the symbol |
| `Grep "type.*interface"` to find implementations | `LSP goToImplementation` on the interface |
| `Read` a file just to check a function's signature | `LSP hover` on any reference to it |
| `Glob "**/*.go"` + `Grep` to find a type | `LSP workspaceSymbol` with the type name |

### Exploration Agents

When spawning subagents for Go codebase exploration, instruct them to use LSP tools for
navigation. Subagents have access to the same LSP server.

## Toolchain

- **`golangci-lint`**: single entry point for formatting and linting. Configure per project.
  - `golangci-lint run` — lint. Must pass before committing.
  - `golangci-lint fmt` — format. Use instead of running `gofmt`/`goimports` separately.

## Integration

The **coding** skill governs workflow (discovery, planning, verification); this skill governs
Go implementation choices. Both are active simultaneously.

**Simplicity is the highest Go virtue. When in doubt, write boring code.**
