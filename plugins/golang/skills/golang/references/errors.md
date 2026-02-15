# Go Error Handling

Error creation, wrapping, matching, structured error types, and error handling patterns.

## Error Creation Decision Tree

| Caller needs to match? | Message | Use |
|------------------------|---------|-----|
| No | Static | `errors.New("not found")` |
| No | Dynamic | `fmt.Errorf("file %q missing", name)` |
| Yes | Static | Exported `var ErrNotFound = errors.New(...)` |
| Yes | Dynamic | Custom error type with `Error()` method |

When using a structured error package, sentinels become objects with wrapping
methods — see [Structured Error Types](#structured-error-types) below.

## Sentinel Errors

```go
// Exported — part of your API contract
var ErrNotFound = errors.New("not found")
var ErrPermission = errors.New("permission denied")

// Unexported — internal use only
var errTimeout = errors.New("operation timed out")
```

**Naming**: exported `ErrXxx`, unexported `errXxx`.

Always wrap sentinels before returning so callers use `errors.Is`, not `==`:

```go
func Fetch(id string) error {
    if !exists(id) {
        return fmt.Errorf("fetch %q: %w", id, ErrNotFound)
    }
    // ...
}
```

## Custom Error Types

```go
// Exported — callers match with errors.As
type NotFoundError struct {
    Resource string
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s not found", e.Resource)
}

// Unexported — internal use
type resolveError struct {
    Path string
}

func (e *resolveError) Error() string {
    return fmt.Sprintf("resolve %q", e.Path)
}
```

**Naming**: exported `XxxError`, unexported `xxxError`.

## Structured Error Types

When a project uses a structured error package (e.g., `golib/e`), errors become
first-class objects with method-based wrapping and key-value metadata fields.

### Sentinels as Objects

```go
// Define sentinels as error objects, not bare values
var ErrNotFound = e.New("not found")
var ErrValidation = e.New("validation failed")

// Wrap via method — sentinel provides context, cause is the argument
func Fetch(id string) error {
    item, err := db.Get(id)
    if err != nil {
        return ErrNotFound.Wrap(err)
    }
    // ...
}
// → "not found: record does not exist"
```

### Structured Metadata

Attach key-value fields to errors for structured logging and diagnostics:

```go
return ErrValidation.Wrap(err,
    fields.F("user_id", userID),
    fields.F("retry_count", retries),
)
// → "validation failed (user_id=42, retry_count=3): field email is required"
```

Use snake_case for field keys. Fields are metadata for machines — the reason
string is for humans.

### Creating and Wrapping

```go
// New error with reason
return e.New("operation failed")

// Wrap existing error with context (new error wrapping cause)
return e.NewFrom("failed to create service", err)

// Convert any error to structured error (preserves message, not unwrappable)
return e.From(err)

// Sentinel wrapping — sentinel provides context, cause is the argument
var ErrNotFound = e.New("not found")
return ErrNotFound.Wrap(err)
```

### Adding Fields

```go
// Via constructor
return e.NewFrom("db query failed", err,
    fields.F("query", query),
    fields.F("duration_ms", elapsed.Milliseconds()),
)

// Via chaining (each call returns new instance)
return e.NewFrom("request failed", err).
    WithField("user_id", userID).
    WithField("retry_count", retries)

// Single field shorthand
return e.New("connection failed").WithField("host", "localhost")
```

### Error Logging Integration

Structured errors integrate with loggers via `e.Log()`:

```go
// Log extracts reason, wrapped error, and fields automatically
e.Log(err, logger.Error)
```

`e.Log` uses the error's `Reason()` as the log message, the wrapped error as
the error field, and attached fields as structured log fields. For non-structured
errors, it falls back to `err.Error()` as the message.

### Immutability

All methods return new error instances. Sentinels are safe to reuse:

```go
var ErrAuth = e.New("authentication failed")

// Each call returns a new error wrapping a different cause
return ErrAuth.Wrap(err)                        // new instance
return ErrAuth.Wrap(other, fields.F("ip", ip))  // another new instance
```

### When to Use Structured Errors

| Situation | Standard `fmt.Errorf` | Structured error package |
|---|---|---|
| Simple CLI tools | Sufficient | Overkill |
| Libraries with public API | Preferred | Either |
| Services with structured logging | Either | Preferred |
| Codebase with field-aware observability | Avoid | Preferred |

If your project uses a structured error package, prefer it consistently over
`fmt.Errorf` — mixing approaches fragments error handling patterns.

## Error Wrapping

### %w vs %v

- **`%w`**: wraps the error. Callers can unwrap with `errors.Is`/`errors.As`. Default choice.
- **`%v`**: new error with original's text only. Hides the underlying error. Use when the
  underlying error is an implementation detail.

```go
// Wrap — caller can inspect underlying error
return fmt.Errorf("query user %q: %w", id, err)

// Don't wrap — underlying error is implementation detail
return fmt.Errorf("process request: %v", err)
```

### When to Wrap

**Wrap** when:
- The caller provided the input that caused the error (e.g., an `io.Reader`)
- The underlying error is part of your documented API contract

**Don't wrap** when:
- The error source is an implementation detail (e.g., which database you use)
- Wrapping would commit you to an underlying dependency

Wrapping makes the error part of your API. If you wrap `sql.ErrNoRows`, you can never
switch databases without breaking callers who check for it.

### Context in Wrapping

Keep context succinct. Avoid "failed to" — it stacks up the call chain:

```go
// Bad — produces: "failed to get user: failed to query DB: connection refused"
return fmt.Errorf("failed to get user: %w", err)

// Good — produces: "get user: query DB: connection refused"
return fmt.Errorf("get user: %w", err)
```

### %w Placement

Place `%w` at the end of the format string so error text mirrors chain structure
(newest-to-oldest):

```go
// Good — prints: "read config: open file: permission denied"
return fmt.Errorf("read config: %w", err)

// Bad — prints oldest-to-newest, confusing
return fmt.Errorf("%w: read config", err)
```

### Avoid Redundant Context

Don't repeat information the underlying error already provides:

```go
// Bad — "settings.txt" appears twice in output
if err := os.Open("settings.txt"); err != nil {
    return fmt.Errorf("could not open settings.txt: %v", err)
}

// Good — adds meaning without duplicating path
if err := os.Open("settings.txt"); err != nil {
    return fmt.Errorf("launch codes unavailable: %v", err)
}
```

Don't annotate if the annotation adds no new information:

```go
// Bad — just return err
return fmt.Errorf("failed: %v", err)
```

## errors.Is and errors.As

### errors.Is — Match Sentinel Values

```go
if errors.Is(err, ErrNotFound) {
    // err, or any error it wraps, matches ErrNotFound
}
```

Walks the entire error chain. Never use `err == ErrNotFound`.

### errors.As — Match Error Types

```go
var nfe *NotFoundError
if errors.As(err, &nfe) {
    // nfe is set to the matched error
    log.Printf("resource not found: %s", nfe.Resource)
}
```

Takes pointer-to-pointer for pointer error types. Walks the entire chain.

### Custom Is/As Methods

Error types can customize matching:

```go
func (e *Error) Is(target error) bool {
    t, ok := target.(*Error)
    if !ok {
        return false
    }
    return (e.Path == t.Path || t.Path == "") &&
           (e.User == t.User || t.User == "")
}
```

## Handle Errors Once

The most common error handling mistake: logging AND returning.

```go
// BAD — error handled twice
u, err := getUser(id)
if err != nil {
    log.Printf("could not get user %q: %v", id, err)
    return err // caller will also log/handle
}

// GOOD — wrap and return, let caller decide
u, err := getUser(id)
if err != nil {
    return fmt.Errorf("get user %q: %w", id, err)
}

// GOOD — log and degrade gracefully (don't return the error)
if err := emitMetrics(); err != nil {
    log.Printf("emit metrics: %v", err)
    // continue — metrics are not critical
}
```

## Error Flow

Indent errors, keep happy path flat:

```go
// Good — early return, flat happy path
data, err := fetch(url)
if err != nil {
    return err
}
result := process(data)
return save(result)

// Bad — nested happy path
if data, err := fetch(url); err == nil {
    if err := save(process(data)); err == nil {
        return nil
    } else {
        return err
    }
} else {
    return err
}
```

## Avoid In-Band Errors

Don't use sentinel return values (`-1`, `""`, `nil`) to signal failure:

```go
// Bad — caller might miss the error
func Lookup(key string) int // returns -1 if not found

// Good — error is explicit
func Lookup(key string) (int, error)

// Good — ok pattern for simple presence checks
func Lookup(key string) (value string, ok bool)
```

## Don't Panic

Reserve `panic` for truly irrecoverable conditions:
- Violated invariants that indicate a programming error
- `template.Must` and similar initialization helpers

For everything else, return errors. Even in tests, prefer `t.Fatal` over `panic`.

## Must Functions

`MustXYZ` names indicate functions that panic on error. Legitimate only for:
- Package-level initialization: `var re = regexp.MustCompile(...)`
- Test helpers: `mustMarshal(t, v)` (use `t.Fatal`, not `panic`)

```go
// Good — package-level "constant"
var defaultVersion = MustParse("1.2.3")

// Bad — runtime panic on user input
func Handle(w http.ResponseWriter, r *http.Request) {
    v := MustParse(r.FormValue("version")) // will panic
}
```

Never use `Must` in request handlers or runtime code paths.

## Type Assertions

Always use the comma-ok form:

```go
// Bad — panics on wrong type
s := val.(string)

// Good — graceful handling
s, ok := val.(string)
if !ok {
    return fmt.Errorf("expected string, got %T", val)
}
```

## Defer Errors

Don't silently ignore errors from deferred calls. Common offenders: `f.Close()`,
`rows.Close()`, `resp.Body.Close()`, `tx.Rollback()`.

```go
// Bad — close error silently dropped
defer f.Close()

// Good — propagate close error if no prior error
defer func() {
    closeErr := f.Close()
    if err == nil {
        err = closeErr
    }
}()

// Acceptable — error is non-critical, explicitly ignore
defer func() { _ = resp.Body.Close() }()
```

When ignoring a defer error, use `_ =` to make it explicit. Add a comment if the
rationale isn't obvious.

## Internal Panic/Recover

Panics as internal control flow are acceptable **only** when:
- They never escape across package boundaries
- A top-level deferred `recover` translates them to returned errors
- The panic type is distinguishable from unexpected panics

```go
type syntaxError struct{ msg string }

func parseInt(in string) int {
    n, err := strconv.Atoi(in)
    if err != nil {
        panic(&syntaxError{"not a valid integer"})
    }
    return n
}

func Parse(in string) (_ *Node, err error) {
    defer func() {
        if p := recover(); p != nil {
            sErr, ok := p.(*syntaxError)
            if !ok {
                panic(p) // re-panic: not ours
            }
            err = fmt.Errorf("syntax error: %v", sErr.msg)
        }
    }()
    // ... calls parseInt internally
}
```

This pattern is rare — only use for deeply nested internal parsers where plumbing
error returns adds complexity without value.

## Error Strings

- Lowercase (unless beginning with proper noun or acronym)
- No trailing punctuation
- They compose: `fmt.Errorf("read config: %w", err)` → `"read config: open file: permission denied"`

```go
// Good
errors.New("something bad")
fmt.Errorf("read %q: %w", path, err)

// Bad
errors.New("Something bad.")
fmt.Errorf("Failed to read %q: %w", path, err)
```
