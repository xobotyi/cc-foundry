---
name: golang
description: >-
  Simplicity over cleverness, explicit over implicit: Go language conventions, idioms, and
  toolchain. Invoke when task involves any interaction with Go code — writing, reviewing,
  refactoring, debugging, or understanding Go projects.
---

# Go

**Simplicity is the highest Go virtue. Resist abstraction until the cost of not abstracting
is proven.**

Go rewards explicit, boring code. If your Go code feels clever, it's wrong.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Naming, declarations, interfaces, receivers, configuration, embedding | [idioms.md](references/idioms.md) |
| Variable shadowing, defer traps, slice mutation, strings, copy safety | [gotchas.md](references/gotchas.md) |
| Error creation, wrapping, Is/As, structured errors (golib/e) | [errors.md](references/errors.md) |
| Goroutines, channels, context cancellation, sync, errgroup, data races | [concurrency.md](references/concurrency.md) |
| Table tests, subtests, assertions, test doubles, benchmarks, live services | [testing.md](references/testing.md) |
| Project layout, packages, imports, file organization, breaking changes | [structure.md](references/structure.md) |

Read the relevant reference before writing code in that area.

## Core Rules

These apply to ALL Go code. No exceptions.

### Error Handling

1. **Always check errors.** Never discard with `_`.
2. **Handle once.** Log OR return — never both.
3. **Wrap with context.** Prefer structured errors when the project uses them:
   `ErrNotFound.Wrap(err)` or `e.NewFrom("context", err)`. Standard fallback:
   `fmt.Errorf("context: %w", err)`. Avoid "failed to" prefix in both.
4. **Error strings**: lowercase, no trailing punctuation.
5. **Don't panic.** Return errors. Reserve panic for truly irrecoverable states.
6. **Use `errors.Is`/`errors.As`** — never `==` or direct type assertion on wrapped errors.

### Naming

1. **Short scopes, short names.** `i`, `r`, `ctx`, `err`.
2. **Wide scopes, descriptive names.** Package-level vars need clarity.
3. **MixedCaps only.** `userID` not `user_id`. No underscores.
4. **Initialisms all-caps.** `URL`, `HTTP`, `ID` — `userID`, `httpClient`.
5. **Receivers**: 1-2 letter type abbreviation, consistent across all methods.
6. **Packages**: short, lowercase, singular. Never `util`, `common`, `misc`.

### Interfaces

1. **Consumer-side.** Define where used, not where implemented.
2. **No premature interfaces.** Wait for a concrete need.
3. **Accept interfaces, return structs.**
4. **Never pointer-to-interface.** Interfaces are already reference types.

### Context

1. **First parameter.** `func Foo(ctx context.Context, ...)`.
2. **Never store in structs.** Pass through call chains explicitly.

### Declarations

1. **`var` for zero values**, `:=` for initializations.
2. **Nil slices are valid.** `var s []string` over `s := []string{}`.
3. **Check empty**: `len(s) == 0`, not `s == nil`.
4. **Pre-allocate** when size is known: `make([]T, 0, n)`.
5. **`&T{}`** over `new(T)`.

### Functions

1. **Synchronous default.** Callers add concurrency.
2. **Return errors, never exit.** Only `main()` calls `os.Exit`/`log.Fatal`.
3. **`defer` for cleanup.** Always.
4. **Early return on error.** Happy path at minimum indentation.
5. **Accept `io.Reader`, not filenames.** Improves reusability and testability.
6. **Close transient resources.** `defer r.Body.Close()`, `defer rows.Close()`, `defer f.Close()`.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `if err != nil { ... } else { happy }` | `if err != nil { return err }` then happy path |
| `log.Printf(..., err); return err` | Wrap and return: `ErrX.Wrap(err)` or `fmt.Errorf("op: %w", err)` |
| `"failed to X: %w"` | `"X: %w"` — drop "failed to" prefix |
| Interface in producer package | Interface in consumer package |
| `func (self *Foo) Method()` | `func (f *Foo) Method()` |
| `func (u *User) GetName()` | `func (u *User) Name()` — no `Get` prefix |
| `t := i.(string)` | `t, ok := i.(string)` |
| `go func() { for { ... } }()` | Use `context.Context` for cancellation, WaitGroup for joining |
| `math/rand` for secrets | `crypto/rand` |
| `const MAX_RETRIES = 3` | `const MaxRetries = 3` — MixedCaps only |
| `var numUsers int` | `var users int` — don't encode type in name |
| `widget.NewWidget()` | `widget.New()` — package name already qualifies |
| `init()` with I/O or state | Explicit initialization in `main()` |
| `defer f.Close()` inside a loop | Extract loop body to a function |
| `break` in switch inside `for` | Use labeled `break` — `break loop` |
| `http.Error(...)` without `return` | Always `return` after `http.Error` |
| `func f() error` returning typed nil | Return explicit `nil`, not `(*T)(nil)` |
| `func Read(path string)` | `func Read(r io.Reader)` — accept interfaces |
| `http.DefaultClient` in production | Configure timeouts: `&http.Client{Timeout: ...}` |
| `var registry = map[...]...` (global) | Instance-based: `type Registry struct{...}` + `New()` |
| `return fmt.Errorf("open %s: %v", f, err)` (redundant) | Add meaning: `e.NewFrom("config unavailable", err)` or `fmt.Errorf("config unavailable: %v", err)` |
| `t.Fatal()` from spawned goroutine | Use `t.Error()` + `return` in goroutines |
| `init()` for test data loading | Scoped helpers: `data := mustLoad(t)` per test |

## Application

When **writing** Go code:
- Apply all conventions silently — don't narrate each rule being followed.
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once.

When **reviewing** Go code:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule — state what's wrong and how to fix it.

```
Bad review comment:
  "According to Go conventions, error strings should be lowercase
   and without trailing punctuation. Please update this."

Good review comment:
  "Error string should be lowercase: `errors.New("Not found.")` →
   `errors.New("not found")`"
```

## Toolchain

- **`golangci-lint`**: single entry point for formatting and linting. Configure per project.
  - `golangci-lint run` — lint. Must pass before committing.
  - `golangci-lint fmt` — format. Use instead of running `gofmt`/`goimports` separately.

## Integration

This skill provides Go-specific conventions alongside the **coding** skill:

1. **Coding** — Discovery, planning, verification discipline
2. **Go** — Language-specific idioms and conventions
3. **Coding** — Final verification

The coding skill governs workflow; this skill governs Go implementation choices.

**Simplicity is the highest Go virtue. When in doubt, write boring code.**
