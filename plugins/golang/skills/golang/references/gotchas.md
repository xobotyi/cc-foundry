# Go Gotchas

Common pitfalls that compile but produce incorrect behavior at runtime.

## Variable Shadowing

Redeclaring a variable in an inner block hides the outer one. This compiles but silently
uses the wrong variable:

```go
// Bad — err in outer scope never set
var client *Client
var err error
if tracing {
    client, err := createTracedClient() // shadows outer err
    _ = client
}
if err != nil { // always nil — wrong err
```

```go
// Good — explicit assignment
var client *Client
var err error
if tracing {
    client, err = createTracedClient() // assigns outer err
}
```

Be especially careful with `:=` in `if`/`for` blocks. The `err` variable is commonly
shadowed. Use `go vet -shadow` or `golangci-lint` to detect.

## Defer

### Argument Evaluation

`defer` evaluates arguments immediately, not when the deferred function runs:

```go
// Bug — status is "" at defer time
var status string
defer notify(status)
status = "done"

// Fix 1 — closure captures variable
defer func() { notify(status) }()

// Fix 2 — pass pointer
defer notify(&status)
```

### Defer in Loops

`defer` runs when the surrounding function returns, not at end of loop iteration.
Inside a loop, deferred closes accumulate until the function exits:

```go
// Bug — file descriptors leak until function returns
for _, path := range paths {
    f, err := os.Open(path)
    if err != nil { return err }
    defer f.Close() // won't close until outer function returns
}

// Fix — extract to function
for _, path := range paths {
    if err := processFile(path); err != nil {
        return err
    }
}

func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil { return err }
    defer f.Close()
    // ...
}
```

## Slices: Append Mutation

`append` on a slice with remaining capacity mutates the underlying array. Slices
derived from the same array see each other's writes:

```go
// Dangerous — s2 and s3 share backing array
s := make([]int, 0, 5)
s = append(s, 1, 2, 3)
s2 := append(s, 4)  // writes to index 3
s3 := append(s, 5)  // overwrites index 3 — s2[3] is now 5
```

**Fix**: use full slice expression or copy:

```go
// Safe — cap limited, forces new allocation
s2 := append(s[:len(s):len(s)], 4)

// Safe — explicit copy
s2 := make([]int, len(s), len(s)+1)
copy(s2, s)
s2 = append(s2, 4)
```

## Strings

### Runes vs Bytes

`len(s)` returns byte count, not rune count. A UTF-8 character can span 1–4 bytes.
Use `range` over a string to iterate runes, not `s[i]`:

```go
s := "café"
len(s)             // 5 (bytes), not 4 (runes)
utf8.RuneCountInString(s) // 4

// Iterate runes — use range value
for _, r := range s {
    fmt.Printf("%c", r)
}

// Access ith rune — convert first
r := []rune(s)[3] // 'é'
```

### Concatenation

Use `strings.Builder` when concatenating in a loop. `+=` allocates a new string
each iteration:

```go
// Bad — O(n²) allocations
s := ""
for _, v := range items {
    s += v
}

// Good — single allocation with Grow
var b strings.Builder
b.Grow(totalLen)
for _, v := range items {
    b.WriteString(v)
}
result := b.String()
```

For a few fixed strings, `+` or `fmt.Sprintf` is fine.

## Copy Safety

- Don't copy structs with pointer fields unless you understand aliasing
- Never copy a `sync.Mutex` or types containing one
- Copy slices/maps at API boundaries to prevent external mutation:

```go
func (d *Driver) SetTrips(trips []Trip) {
    d.trips = make([]Trip, len(trips))
    copy(d.trips, trips)
}
```

## Global State

Libraries must not force clients to use global state. Expose instance-based APIs and
let callers manage lifecycle:

```go
// Bad — global registry, untestable, order-dependent
package sidecar

var registry = make(map[string]*Plugin)

func Register(name string, p *Plugin) error { /* modifies global */ }
```

```go
// Good — instance-based, testable, composable
package sidecar

type Registry struct { plugins map[string]*Plugin }

func New() *Registry { return &Registry{plugins: make(map[string]*Plugin)} }

func (r *Registry) Register(name string, p *Plugin) error { ... }
```

Global state is safe only when it is logically constant, stateless (e.g., caches
where hits and misses are indistinguishable), or has no external side effects.

If you must provide convenience, make the global API a thin proxy to an instance API
(like `http.Handle` proxying to `http.DefaultServeMux`), and restrict global API
usage to binaries — never in libraries.

## Fixed Bit-Width Types

Use `int8`, `uint16`, `int32`, etc. with caution — they are prone to overflow
errors. Prefer `int` unless a specific width is required by a protocol, binary
format, or performance constraint.

```go
// Bad — silent overflow risk
var count int8 = 200 // overflows to -56

// Good — use int unless width matters
var count int = 200
```

## Signal Boosting

When code does the opposite of what's common, add a comment to draw attention:

```go
// Uncommon — checking err == nil (no error), not err != nil
if err := doSomething(); err == nil { // if NO error
    // ...
}
```
