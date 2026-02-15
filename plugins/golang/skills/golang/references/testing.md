# Go Testing

Table-driven tests, assertions, test organization, benchmarks, and integration testing
strategies.

## Table-Driven Tests

The standard pattern for testing multiple inputs with the same logic:

```go
func TestParse(t *testing.T) {
    tests := []struct {
        name    string
        give    string
        want    int
        wantErr bool
    }{
        {
            name: "valid integer",
            give: "42",
            want: 42,
        },
        {
            name: "negative",
            give: "-7",
            want: -7,
        },
        {
            name: "invalid input",
            give: "abc",
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Parse(tt.give)
            if tt.wantErr {
                if err == nil {
                    t.Fatal("expected error, got nil")
                }
                return
            }
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if got != tt.want {
                t.Errorf("Parse(%q) = %d, want %d", tt.give, got, tt.want)
            }
        })
    }
}
```

### Conventions

- Slice named `tests`, each case `tt`
- Inputs prefixed `give`, outputs prefixed `want`
- Always use `t.Run` with descriptive names
- Use field names in struct literals (except test tables with 3 or fewer fields)
- Omit zero-value fields unless they provide meaningful context

### When NOT to Use Table Tests

Split into separate `Test...` functions when:
- Different cases need different setup or mocking logic
- Conditional assertions (branching) inside the loop
- Complex mock configuration per case (`shouldCallX`, `setupMocks func()`)
- Table fields are only used by some cases

Table tests must have uniform logic: every row uses every field.

## Subtests

`t.Run` creates subtests with key advantages:
- `t.Fatal` stops only the current subtest, not the parent
- Run individually: `go test -run=TestParse/valid`
- Shared setup/teardown via parent function

```go
func TestDatabase(t *testing.T) {
    db := setupTestDB(t) // shared setup

    t.Run("Insert", func(t *testing.T) {
        // t.Fatal here won't skip Read test
    })
    t.Run("Read", func(t *testing.T) {
        // ...
    })
    // teardown runs after all subtests
}
```

### Parallel Subtests

```go
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        t.Parallel()
        // test body — tt is safe in Go 1.22+
        // for Go < 1.22, shadow: tt := tt
    })
}
```

### Grouped Parallel With Teardown

Run a group in parallel, then wait before cleanup:

```go
func TestGrouped(t *testing.T) {
    // setup
    t.Run("group", func(t *testing.T) {
        t.Run("A", func(t *testing.T) { t.Parallel(); /* ... */ })
        t.Run("B", func(t *testing.T) { t.Parallel(); /* ... */ })
    })
    // teardown — runs after A and B complete
}
```

## Assertions

### testify: require vs assert

Use `github.com/stretchr/testify` for assertions:

- **`require`** — stops test on failure. Use when subsequent checks depend on this one.
- **`assert`** — reports failure, continues. Use when all checks should run independently.

```go
func Test_Service(t *testing.T) {
    t.Run("dependent checks", func(t *testing.T) {
        data, err := LoadData("test.json")
        require.NoError(t, err)   // stop — can't continue without data
        require.NotNil(t, data)   // stop — would panic below

        assert.Equal(t, "expected", data.Name)  // continue — report all failures
        assert.Equal(t, 42, data.Count)
    })
}
```

Default to `require` for error checks and nil guards. Use `assert` for independent
value checks within the same subtest.

### Struct and Slice Comparison

Use testify for struct and slice comparisons — `assert.Equal`/`require.Equal`
produce readable diffs on failure:

```go
require.Equal(t, wantUser, gotUser)
assert.ElementsMatch(t, wantItems, gotItems) // order-independent
```

Never use `reflect.DeepEqual` directly — testify wraps it with better output.

## t.Error vs t.Fatal

- **`t.Error`**: reports failure, test continues. Use for non-blocking checks.
- **`t.Fatal`**: reports failure, test stops. Use when continuation is meaningless.

In subtests, `t.Fatal` stops only the current subtest.

**Rule**: prefer `t.Error` to report all failures at once. Use `t.Fatal` only for
setup failures or when a check makes subsequent checks impossible.

## Test Helpers

Mark with `t.Helper()` so failures report the caller's line:

```go
func readTestFile(t *testing.T, path string) []byte {
    t.Helper()
    data, err := os.ReadFile(path)
    if err != nil {
        t.Fatal(err)
    }
    return data
}
```

Don't use `t.Helper()` in assert-like wrappers — it hides the connection between
failure and cause.

## Test Error Semantics

- Prefer matching on types (`errors.As`) or sentinels (`errors.Is`)
- If you don't care about error kind, just check `err != nil`
- When no sentinel or type exists, use `require.ErrorContains` for substring matching —
  it's more resilient than exact string comparison

```go
// Bad — brittle exact string matching
require.Equal(t, "user not found", err.Error())

// Good — semantic matching when sentinels exist
require.ErrorIs(t, err, ErrNotFound)

// Good — substring when no sentinel available
require.ErrorContains(t, err, "connection refused")
```

## t.Fatal and Goroutines

`t.Fatal`, `t.Fatalf`, and `t.FailNow` must only be called from the goroutine running
the Test function. Calling them from a spawned goroutine is incorrect and will panic.

```go
// Bad — t.Fatalf from spawned goroutine
go func() {
    if err := engine.Vroom(); err != nil {
        t.Fatalf("No vroom: %v", err) // WRONG — panics
    }
}()

// Good — use t.Errorf + return in goroutines
go func() {
    defer wg.Done()
    if err := engine.Vroom(); err != nil {
        t.Errorf("No vroom: %v", err)
        return
    }
}()
```

Note: `t.Parallel()` does NOT create a new goroutine for this purpose — `t.Fatal`
is still safe in parallel subtests.

## Test Double Package Naming

Name test helper packages by appending `test` to the production package name:

```go
package creditcardtest // test doubles for package creditcard

// Stub stubs creditcard.Service with no behavior.
type Stub struct{}

func (Stub) Charge(*creditcard.Card, money.Money) error { return nil }
```

When only one type needs doubling, use simple names (`Stub`, `Fake`). When multiple
types need doubling, prefix with the type name (`StubService`, `StubStoredValue`).

Prefix test double variables to distinguish from production types:

```go
var spyCC creditcardtest.Spy // clear that this is a test double
```

## Scoped Test Setup

Keep setup scoped to tests that need it. Don't use `init()` or package-level vars
for test data — it penalizes tests that don't need the setup:

```go
// Bad — all tests pay the cost, even those that don't need data
var dataset []byte
func init() { dataset = mustLoadDataset() }

// Good — only tests that need it call the helper
func TestParseData(t *testing.T) {
    data := mustLoadDataset(t) // scoped to this test
    // ...
}
```

For expensive setup shared across multiple tests, use `sync.Once`:

```go
var datasetOnce struct {
    once sync.Once
    data []byte
    err  error
}

func mustLoadDataset(t *testing.T) []byte {
    t.Helper()
    datasetOnce.once.Do(func() {
        datasetOnce.data, datasetOnce.err = os.ReadFile("testdata/dataset")
    })
    if datasetOnce.err != nil {
        t.Fatalf("Could not load dataset: %v", datasetOnce.err)
    }
    return datasetOnce.data
}
```

## Test Cache Safety

Go's test cache uses file mtime and environment values. Writing files in-place or
modifying env vars breaks caching and can cause CI failures.

Use scoped helpers:

```go
func TestWriteConfig(t *testing.T) {
    // TempDir creates and auto-cleans a temp directory scoped to this test
    dir := t.TempDir()
    path := filepath.Join(dir, "config.yaml")
    // write to path — won't affect cache or other tests

    // Setenv scopes env changes to this test's execution
    t.Setenv("APP_ENV", "test")
    // restored automatically when test ends
}
```

Never write to the source directory in tests — use `t.TempDir()` for temp files
and `t.Setenv()` for environment variables.

## Prefer Live Services Over Mocks

When testing integrations (databases, caches, message brokers), prefer spinning up
real service instances over synthetic mocks — it's more reliable and catches real
issues.

```go
func TestRedisCache(t *testing.T) {
    // Skip if container runtime not available
    if os.Getenv("DOCKERIZED_TESTS") != "true" {
        t.Skip("requires docker")
    }

    // Use real Redis, not a mock
    client := redis.NewClient(&redis.Options{Addr: redisAddr})
    defer client.Close()

    // Test against real behavior
    err := client.Set(ctx, "key", "value", 0).Err()
    require.NoError(t, err)
}
```

Gate slow or resource-intensive tests behind environment variables and skip when
not set. This keeps `go test ./...` fast while CI runs the full suite.

## Runnable Examples

Write `func Example...` functions for complex APIs. They serve as both
documentation and tests — godoc renders them, and `go test` verifies them:

```go
func ExampleConfig_WriteTo() {
    cfg := &Config{Name: "example"}
    if err := cfg.WriteTo(os.Stdout); err != nil {
        log.Fatal(err)
    }
    // Output:
    // {"name": "example"}
}
```

The `// Output:` comment makes the example a test — `go test` fails if output
doesn't match.

## Race Detection

Always run tests with `-race` for concurrent code:

```bash
go test -race ./...
```

The race detector instruments memory accesses at runtime. It catches data races that
may not manifest during normal execution. Enable in CI — the overhead (~2-10x slower)
is acceptable for tests.

Use `//go:build !race` to exclude specific test files from race detection if needed
(e.g., performance-sensitive benchmarks).

## Avoid Sleeping

`time.Sleep` in tests creates flaky tests. Use synchronization instead:

```go
// Bad — arbitrary sleep, may be too short or too long
go producer(ch)
time.Sleep(100 * time.Millisecond)
assert(len(results) == 5)

// Good — synchronize on the actual event
go producer(ch)
for i := 0; i < 5; i++ {
    <-ch
}

// Good — use channels, WaitGroups, or polling with timeout
select {
case <-done:
    // success
case <-time.After(5 * time.Second):
    t.Fatal("timed out waiting for completion")
}
```

If synchronization is impossible, use a retry/poll loop with a deadline instead
of a fixed sleep.

## Testing Utilities

### httptest

`net/http/httptest` provides in-process HTTP testing without network I/O:

```go
// Test a handler
func TestHandler(t *testing.T) {
    req := httptest.NewRequest("GET", "/users/1", nil)
    w := httptest.NewRecorder()

    handler(w, req)

    resp := w.Result()
    if resp.StatusCode != http.StatusOK {
        t.Errorf("status = %d, want 200", resp.StatusCode)
    }
}

// Test a client against a fake server
srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte(`{"ok": true}`))
}))
defer srv.Close()
// use srv.URL as base URL for the client under test
```

### iotest

`testing/iotest` provides error-injecting readers for resilience testing:

```go
// Test that your code handles read errors
r := iotest.ErrReader(errors.New("disk failure"))
_, err := ReadAll(r)
if err == nil {
    t.Fatal("expected error")
}

// Test with one-byte-at-a-time reader
r = iotest.OneByteReader(strings.NewReader("hello"))
```

## Benchmarks

```go
func BenchmarkFoo(b *testing.B) {
    for b.Loop() {
        foo()
    }
}
```

Key rules:
- Use `b.Loop()` (Go 1.24+) or `for i := 0; i < b.N; i++` for the benchmark loop
- Use `b.ResetTimer()` after expensive setup
- Use `b.ReportAllocs()` to track allocations
- Ensure the result is used (assign to package-level var) to prevent compiler
  optimization from eliminating the call
- Run with `-benchtime=5s` or use `benchstat` for stable micro-benchmarks

## Test Naming

### Function Naming

Use `Test_TypeName` with underscore separator for type-level tests, and `t.Run()`
for method/scenario subtests:

```go
func Test_Scanner(t *testing.T) {
    t.Run("Scan", func(t *testing.T) {
        // test Scanner.Scan
    })
    t.Run("ScanFile", func(t *testing.T) {
        // test Scanner.ScanFile
    })
}
```

### White-Box Testing

Use `_internal_test.go` suffix for tests that need access to unexported identifiers:

```
scanner_test.go                    # Black-box: package scanner_test (preferred)
scanner_internal_test.go           # White-box: package scanner
scanner_benchmark_test.go          # Black-box benchmarks
scanner_benchmark_internal_test.go # White-box benchmarks
```

Prefer black-box testing — it validates your public API and catches design issues.
Use white-box only when testing unexported logic that can't be exercised through
the public API.

## Block Scoping

Use bare blocks `{}` for logical grouping when separate test reporting is unnecessary:

```go
func Test_StoreAndRetrieve(t *testing.T) {
    store := NewStore()

    { // empty store returns nothing
        got, ok := store.Get("key")
        assert.False(t, ok)
        assert.Empty(t, got)
    }

    store.Put("key", "value")

    { // after Put, Get returns value
        got, ok := store.Get("key")
        assert.True(t, ok)
        assert.Equal(t, "value", got)
    }
}
```

Use `t.Run()` instead when you need parallel execution, selective running, or
per-scenario reporting.

## Combining Complementary Operations

Test complementary operations together when it reduces duplication:

```go
// Good — Put and Get are complementary
func Test_CachePutAndGet(t *testing.T) {
    cache := NewCache()
    cache.Put("key", "value")

    got, ok := cache.Get("key")
    require.True(t, ok)
    require.Equal(t, "value", got)
}
```

Split into separate tests only when operations have independent failure modes or
require different setup.

## Compare Stable Results

Don't assert on serialization output — it's fragile. Parse and compare semantically:

```go
// Bad — depends on json.Marshal field ordering
require.Equal(t, `{"a":1,"b":2}`, string(got))

// Good — compare parsed data
var result map[string]int
require.NoError(t, json.Unmarshal(got, &result))
assert.Equal(t, want, result)
```
