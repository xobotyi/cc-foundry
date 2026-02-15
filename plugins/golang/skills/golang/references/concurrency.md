# Go Concurrency

Goroutine lifecycle, channels, pipelines, synchronization primitives, and data race prevention.

## Goroutine Lifecycle

Every goroutine must have:
1. A **predictable exit condition** (or a way to signal stop)
2. A way for other code to **wait for it to finish**

Goroutines that violate this leak memory, hold references, and cause data races.

### Context-Based Cancellation (Primary)

`context.Context` is the idiomatic mechanism for cancellation propagation in Go.
Use it as the default for all goroutine lifecycle management:

```go
func (w *Worker) Run(ctx context.Context) error {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()
    for {
        select {
        case <-ticker.C:
            flush()
        case <-ctx.Done():
            return ctx.Err()
        }
    }
}

// Caller controls lifecycle
ctx, cancel := context.WithCancel(context.Background())
go w.Run(ctx)

// Later: signal stop
cancel()
```

### WaitGroup Pattern (Joining)

Use `sync.WaitGroup` to wait for multiple goroutines to finish — it handles
joining, not cancellation:

```go
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func(item Item) {
        defer wg.Done()
        process(item)
    }(item)
}
wg.Wait()
```

### Worker With Lifecycle Management

For long-lived goroutines, wrap in a struct. Use `context.Context` for
cancellation and a done channel or `WaitGroup` for joining:

```go
type Worker struct {
    done chan struct{}
}

func NewWorker(ctx context.Context) *Worker {
    w := &Worker{
        done: make(chan struct{}),
    }
    go w.run(ctx)
    return w
}

func (w *Worker) run(ctx context.Context) {
    defer close(w.done)
    for {
        select {
        case <-ctx.Done():
            return
        default:
            // work
        }
    }
}

func (w *Worker) Wait() {
    <-w.done
}
```

### Stop + Done Pattern (Alternative)

When `context.Context` is unavailable (e.g., infrastructure code that predates
context, or standalone signal channels), use explicit stop/done channels:

```go
stop := make(chan struct{})
done := make(chan struct{})

go func() {
    defer close(done)
    ticker := time.NewTicker(interval)
    defer ticker.Stop()
    for {
        select {
        case <-ticker.C:
            flush()
        case <-stop:
            return
        }
    }
}()

// Later: signal stop and wait
close(stop)
<-done
```

Prefer `context.Context` over raw stop/done channels in new code.
```

## Channels vs Mutexes

Choose based on goroutine relationship:

| Relationship | Mechanism | Why |
|-------------|-----------|-----|
| Parallel goroutines accessing shared state | `sync.Mutex` | Synchronization |
| Concurrent goroutines coordinating work | Channels | Communication / orchestration |
| Transferring ownership of a resource | Channels | Signaling completion |

**Parallel** = doing the same thing simultaneously (e.g., workers processing a queue).
**Concurrent** = doing different steps of a pipeline (e.g., producer → consumer).

Mutexes protect shared state. Channels coordinate independent actors.

## Channels

### Size: Zero or One

Channels should be unbuffered (0) or size 1. Larger buffers require justification —
you must know what prevents the channel from filling and blocking writers.

```go
c := make(chan int)    // unbuffered — synchronous handoff
c := make(chan int, 1) // buffered — one item of slack
```

### Direction in Signatures

Specify channel direction in function signatures:

```go
func producer() <-chan int            // receive-only return
func consumer(ch <-chan int)          // receive-only parameter
func pipe(in <-chan int) <-chan int   // both directions
```

## Pipeline Pattern

A pipeline is stages connected by channels. Each stage receives from upstream,
processes, and sends downstream.

```go
func gen(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

func sq(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}
```

### Fan-Out, Fan-In

**Fan-out**: multiple goroutines read from the same channel.
**Fan-in**: merge multiple channels into one.

```go
func merge(cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)
    wg.Add(len(cs))
    for _, c := range cs {
        go func(c <-chan int) {
            defer wg.Done()
            for n := range c {
                out <- n
            }
        }(c)
    }
    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

### Cancellation with Done Channel

Every pipeline should accept a `done` channel for cancellation:

```go
func sq(done <-chan struct{}, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case out <- n * n:
            case <-done:
                return
            }
        }
    }()
    return out
}
```

Close `done` to broadcast cancellation to all stages. Prefer `context.Context` over
raw done channels in production code.

### Bounded Parallelism

Limit concurrent work with a fixed worker pool:

```go
const numWorkers = 20
paths, errc := walkFiles(done, root)
c := make(chan result)

var wg sync.WaitGroup
wg.Add(numWorkers)
for i := 0; i < numWorkers; i++ {
    go func() {
        defer wg.Done()
        for path := range paths {
            data, err := os.ReadFile(path)
            select {
            case c <- result{path, md5.Sum(data), err}:
            case <-done:
                return
            }
        }
    }()
}
go func() {
    wg.Wait()
    close(c)
}()
```

### Select Chooses Randomly

When multiple cases are ready, `select` picks one at random — not in source order:

```go
// Bug — disconnect may fire before all messages are consumed
for {
    select {
    case v := <-messageCh:
        process(v)
    case <-disconnectCh:
        return // may fire early if both channels are ready
    }
}
```

For a single-producer scenario, use a single channel or unbuffered channels.
For multi-producer, drain the work channel after receiving the stop signal.

### Nil Channels

A nil channel blocks forever on send and receive. Use this to remove cases from
`select` at runtime:

```go
func merge(ch1, ch2 <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for ch1 != nil || ch2 != nil {
            select {
            case v, ok := <-ch1:
                if !ok { ch1 = nil; continue }
                out <- v
            case v, ok := <-ch2:
                if !ok { ch2 = nil; continue }
                out <- v
            }
        }
    }()
    return out
}
```

Setting a channel to `nil` removes it from the `select` — the case will never fire.

## errgroup

`golang.org/x/sync/errgroup` manages a group of goroutines with error propagation
and context cancellation:

```go
g, ctx := errgroup.WithContext(ctx)

for _, url := range urls {
    g.Go(func() error {
        return fetch(ctx, url)
    })
}

if err := g.Wait(); err != nil {
    // first non-nil error from any goroutine
}
```

Prefer `errgroup` over manual `sync.WaitGroup` + error collection.

## Context Propagation

### Don't Propagate Request Context to Background Work

An HTTP request context cancels when the response is sent. Passing it to a background
goroutine causes premature cancellation:

```go
// Bug — context cancels when response is written
func handler(w http.ResponseWriter, r *http.Request) {
    resp := doWork(r.Context())
    go publish(r.Context(), resp) // may cancel immediately
    writeResponse(w, resp)
}

// Fix — detach from request lifecycle
func handler(w http.ResponseWriter, r *http.Request) {
    resp := doWork(r.Context())
    go publish(context.WithoutCancel(r.Context()), resp)
    writeResponse(w, resp)
}
```

`context.WithoutCancel` (Go 1.21+) creates a context that inherits values but not
cancellation. Use it for fire-and-forget background work.

## Synchronization

### Mutexes

- Zero-value is valid — no `new(sync.Mutex)` needed
- Never embed in structs — use a named field: `mu sync.Mutex`
- Never copy a mutex
- Use `defer mu.Unlock()` unless nanosecond performance matters

```go
type SafeMap struct {
    mu   sync.Mutex
    data map[string]string
}

func (m *SafeMap) Get(key string) string {
    m.mu.Lock()
    defer m.mu.Unlock()
    return m.data[key]
}
```

### Atomics

For simple flags or counters, prefer `sync/atomic` types:

```go
type Server struct {
    running atomic.Bool
}

func (s *Server) Start() {
    if s.running.Swap(true) {
        return // already running
    }
    // ...
}
```

## Data Race Gotchas

### Append on Shared Slices

`append` isn't data-race-free when the slice has spare capacity:

```go
// Race — both goroutines write to index 0 of the same backing array
s := make([]int, 0, 1)
go func() { s1 := append(s, 1); fmt.Println(s1) }()
go func() { s2 := append(s, 2); fmt.Println(s2) }()
```

Fix: copy the slice before passing to goroutines.

### Map/Slice Assignment Doesn't Copy

Assigning a map or slice to a new variable copies the header, not the data.
Both variables point to the same backing storage:

```go
// Race — balances and m share the same map data
func (c *Cache) AverageBalance() float64 {
    c.mu.RLock()
    m := c.balances // NOT a copy — same underlying data
    c.mu.RUnlock()
    for _, v := range m { /* race with AddBalance */ }
}

// Fix — deep copy inside critical section
func (c *Cache) AverageBalance() float64 {
    c.mu.RLock()
    m := maps.Clone(c.balances)
    c.mu.RUnlock()
    // safe to iterate m without lock
}
```

### String Formatting Deadlocks

`fmt.Errorf("%v", obj)` may call `obj.String()`, which may lock the same mutex:

```go
// Deadlock — UpdateAge holds Lock, String() tries RLock (same mutex)
func (c *Customer) UpdateAge(age int) error {
    c.mu.Lock()
    defer c.mu.Unlock()
    if age < 0 {
        return fmt.Errorf("invalid age for %v", c) // calls c.String()
    }
    c.age = age
    return nil
}

func (c *Customer) String() string {
    c.mu.RLock() // deadlock — already write-locked
    defer c.mu.RUnlock()
    return fmt.Sprintf("id=%s age=%d", c.id, c.age)
}
```

Fix: validate before locking, or format with direct field access (`c.id`) instead
of `%v`.

## Rules

1. **Synchronous by default.** Let callers add concurrency.
2. **No fire-and-forget goroutines.** Every goroutine must be joinable.
3. **No goroutines in `init()`.** Spawn in constructors with lifecycle management.
4. **Close channels from the sender side.** Never close from the receiver.
5. **Use `select` with done/context** for cancellable operations.
6. **Sends on closed channels panic.** Ensure all sends finish before closing.
