# Go Idioms

Naming conventions, declaration patterns, interface design, receivers, configuration,
and type usage.

## Naming

### Variables

The distance rule: name length scales with scope distance.

| Scope | Style | Examples |
|-------|-------|----------|
| Loop index | Single letter | `i`, `j`, `k` |
| Short function local | 1-3 chars | `r` (reader), `b` (buffer), `ctx` |
| Function parameter | Short but clear | `name`, `path`, `opts` |
| Package-level | Descriptive | `defaultTimeout`, `maxRetries` |
| Exported | Self-documenting | `ErrNotFound`, `DefaultClient` |

**Receivers**: 1-2 letter abbreviation of the type. `c` for `Client`, `s` for `Server`.
Never `self`, `this`, `me`. Be consistent — if one method uses `c`, all methods use `c`.

### Initialisms

All-caps for known initialisms: `URL`, `HTTP`, `ID`, `API`, `SQL`, `XML`.
In mixed identifiers: `userID`, `httpClient`, `xmlHTTPRequest`.

### Packages

- Short, lowercase, singular: `user`, `http`, `auth`
- Named by what they provide, not what they contain
- Never `util`, `common`, `misc`, `shared`, `helpers`, `types`
- Callers use package name as prefix: `chubby.File` not `chubby.ChubbyFile`

### Getters and Setters

No `Get` prefix on getters. Setter uses `Set` prefix:

```go
// Bad
func (u *User) GetName() string { return u.name }

// Good
func (u *User) Name() string     { return u.name }
func (u *User) SetName(n string) { u.name = n }
```

### Interface Names

One-method interfaces use method name plus `-er`: `Reader`, `Writer`, `Formatter`,
`Stringer`. Honor canonical names — if your type has a `String() string` method, call
it `String`, not `ToString`.

### Constants

MixedCaps only — never `ALL_CAPS` or `K` prefix:

```go
// Good
const MaxPacketSize = 512
const defaultTimeout = 30 * time.Second

// Bad
const MAX_PACKET_SIZE = 512
const kMaxBufferSize = 1024
```

Name by role, not value. If a constant has no role beyond its value, don't define it:

```go
// Bad — name restates value
const Twelve = 12

// Good — name explains role
const MaxRetries = 12
```

### Unexported Globals

Prefix with `_`: `_defaultPort`, `_maxRetries`.
Exception: error values use `err` prefix: `errNotFound`.

### Avoid Repetition

Package name is part of every qualified reference — don't stutter:

```go
// Bad → Good
widget.NewWidget         → widget.New
widget.NewWidgetWithName → widget.NewWithName
db.LoadFromDatabase      → db.Load
```

Don't encode type in variable names:

```go
// Bad → Good
var numUsers int            → var users int
var nameString string       → var name string
var primaryProject *Project → var primary *Project
```

Strip context already obvious from scope:

```go
// Bad — in package "sqldb"
type DBConnection struct{}
// Good
type Connection struct{}

// Bad — method on *Project
func (p *Project) ProjectName() string
// Good
func (p *Project) Name() string
```

## Zero-Value Design

Design types so the zero value is immediately useful — no constructor needed:

```go
// Good — zero value is an empty, ready-to-use buffer
var buf bytes.Buffer
buf.WriteString("hello")

// Good — zero value is an unlocked mutex
var mu sync.Mutex
```

Only write constructors when non-zero defaults are required:

```go
func NewServer(addr string) *Server {
    return &Server{addr: addr, timeout: 30 * time.Second}
}
```

## Declarations

### Variable Style

```go
// Zero values — use var
var s string
var mu sync.Mutex
var buf bytes.Buffer

// Initialized values — use :=
s := "hello"
n := computeSize()

// Top-level — use var, omit type if obvious
var _defaultPort = 8080
var _errNotFound = errors.New("not found")

// Type differs from expression — specify type
var _e error = myError{}
```

### Slices

```go
// Nil slice (preferred for most cases)
var t []string

// Non-nil zero-length (only when JSON encoding matters: nil→null, []string{}→[])
t := []string{}

// Pre-allocate when size known
t := make([]string, 0, len(input))
```

### Maps

```go
// Empty map for programmatic population
m := make(map[string]int)

// With capacity hint
m := make(map[string]int, len(input))

// Fixed content — use literal
m := map[string]int{
    "a": 1,
    "b": 2,
}
```

### Structs

```go
// Always use field names
k := User{
    FirstName: "John",
    LastName:  "Doe",
}

// Omit zero-value fields unless they provide context
user := User{
    FirstName: "John",
    // Admin: false,  ← omit, zero value is obvious
}

// Zero-value struct — use var
var user User

// Pointer — use &T{}
sptr := &Config{Name: "prod"}
```

### Enums

Start at 1 to distinguish from zero-value (unless zero-value has meaning):

```go
type Status int

const (
    StatusActive Status = iota + 1
    StatusInactive
    StatusSuspended
)
```

### Named Result Parameters

Use when they disambiguate or document caller obligations:

```go
// Good — clarifies which *Node is which
func (n *Node) Children() (left, right *Node, err error)

// Good — caller must arrange to call cancel
func WithTimeout(parent Context, d time.Duration) (ctx Context, cancel func())
```

Don't use just to enable naked returns, or when the name repeats the type:

```go
// Bad — adds nothing
func (n *Node) Parent() (node *Node, err error)
```

## Interfaces

### Consumer-Side Design

Interfaces belong where they're used, not where they're implemented.

```go
// GOOD — consumer defines what it needs
package consumer

type UserStore interface {
    Get(ctx context.Context, id string) (*User, error)
}

func NewService(store UserStore) *Service { ... }
```

```go
// BAD — producer defines interface, returns it
package producer

type Store interface { Get(ctx context.Context, id string) (*User, error) }

func NewStore() Store { return &store{} }
```

Producers return concrete types. Consumers define the interface they need.
Don't define interfaces "for mocking" — design APIs testable via real implementations.

### Small Interfaces

Prefer 1-3 methods. `io.Reader` (1 method) is more powerful than any 10-method interface.

### Compile-Time Verification

```go
var _ http.Handler = (*Handler)(nil)
var _ fmt.Stringer = LogOutput(0)
```

## Receivers

### Pointer vs Value

Use a **pointer receiver** when:
- Method mutates the receiver
- Receiver contains `sync.Mutex` or similar
- Receiver is a large struct
- In doubt — default to pointer

Use a **value receiver** when:
- Receiver is a small, immutable value type (like `time.Time`)
- Receiver is a map, func, or chan (already reference types)
- All fields are value types with no mutability needs

**Never mix** receiver types on a single type.

### Maps, Funcs, and Channels

Already reference types. Don't use pointers to them:

```go
// Bad
func process(m *map[string]int) { ... }

// Good
func process(m map[string]int) { ... }
```

## Context

```go
// First parameter, always
func FetchUser(ctx context.Context, id string) (*User, error) { ... }

// Never store in structs
type Server struct {
    // ctx context.Context  ← WRONG
    db *sql.DB
}

// context.Background() only at the top level
func main() {
    ctx := context.Background()
    // ...
}
```

## Configuration Patterns

For constructors with 3+ optional parameters, choose between option structs and
functional options based on usage patterns.

### Option Structs

Use when most callers need to specify several options, or options are shared across
multiple functions:

```go
type ReplicationOptions struct {
    PrimaryRegions    []string
    ReadonlyRegions   []string
    OverwritePolicies bool
    Interval          time.Duration
    Workers           int
}

func EnableReplication(ctx context.Context, opts ReplicationOptions) { ... }
```

Benefits: self-documenting field names, zero-value omission, easy to share and extend.

**Never include `context.Context` in option structs** — pass it as a separate parameter.

### Functional Options

Use when most callers need zero or few options, there are many options, or options
require validation:

```go
type Option interface{ apply(*options) }

type options struct {
    timeout time.Duration
    logger  *slog.Logger
}

type timeoutOption time.Duration

func (t timeoutOption) apply(o *options) { o.timeout = time.Duration(t) }
func WithTimeout(d time.Duration) Option { return timeoutOption(d) }

func New(addr string, opts ...Option) (*Client, error) {
    o := options{timeout: 30 * time.Second}
    for _, opt := range opts {
        opt.apply(&o)
    }
    // ...
}
```

Use the interface form (not closures) for testability and debuggability.

Options should accept parameters, not use presence as signal:

```go
// Good — composable
rpc.FailFast(true)

// Bad — can't programmatically toggle
rpc.EnableFailFast()
```

### Decision Criteria

| Factor | Option Struct | Functional Options |
|--------|--------------|-------------------|
| Most callers need several options | Prefer | Either |
| Most callers need zero options | Either | Prefer |
| Options need validation | Either | Prefer |
| Options shared across functions | Prefer | Either |
| Third-party extensibility needed | Avoid | Prefer |

## Doc Comments

Every exported symbol gets a doc comment starting with its name:

```go
// Client manages connections to the message broker.
type Client struct { ... }

// Send publishes a message to the given topic.
// It returns an error if the connection is closed.
func (c *Client) Send(ctx context.Context, topic string, msg []byte) error {
```

- Complete sentences, period-terminated
- Package comment goes in `doc.go` or the primary `.go` file
- Unexported types: comment when behavior is non-obvious, skip when trivial

## Embedding

Embedding promotes methods of the inner type to the outer type.

**Use embedding when** the promoted methods ARE your intended API:

```go
// Good — ReadWriter should have Read and Write methods
type ReadWriter struct {
    *Reader
    *Writer
}
```

**Use named fields when** you don't want to expose the inner type's full method set:

```go
// Good — Server uses logger internally but doesn't expose Log(), Printf(), etc.
type Server struct {
    logger *slog.Logger
    db     *sql.DB
}
```

**Never embed in public API structs** unless the promoted surface is intentional — it
commits your API to every exported method of the embedded type, including future additions.

Embedding in `internal/` types is lower risk since the API surface is private.

## Long-Running Process Naming

Distinguish blocking vs non-blocking lifecycle methods:

- **Run** — blocks until the process completes. Caller controls the goroutine.
- **Start** — returns immediately, spawns an internal goroutine. Accept
  `context.Context` as the first parameter for cancellation.

```go
// Run blocks — caller decides concurrency
func (w *Worker) Run(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case job := <-w.jobs:
            w.process(job)
        }
    }
}

// Start returns immediately — manages its own goroutine
func (w *Worker) Start(ctx context.Context) {
    go w.Run(ctx)
}
```

## Type Preferences

### `any` Over `interface{}`

Prefer the `any` alias (Go 1.18+) over `interface{}`:

```go
// Good
func Process(data any) error { ... }

// Avoid
func Process(data interface{}) error { ... }
```

Only use `any` when truly accepting any type (marshaling, formatting). If the set
of types is known, use generics or concrete types.

### Type Aliases for Semantics

Use type aliases when they add type safety or semantic meaning:

```go
// Good — adds semantic clarity
type UserID string
type Timestamp int64

func GetUser(id UserID) (*User, error) { ... }

// Bad — no added meaning
type MyString string
```

## File Naming

Use kebab-case for Go source files:

```
user-service.go
http-handler.go
config-parser.go
```

Test files follow the same convention with suffixes:

```
user-service_test.go          # black-box tests (package foo_test)
user-service_internal_test.go # white-box tests (package foo)
```

## Avoid

- **Built-in name shadowing**: don't name variables `error`, `string`, `len`, `copy`
- **Naked returns**: only in very short functions. Prefer explicit returns.
- **`init()`**: avoid unless registering plugins. No I/O, no global state mutation.
- **Mutable globals**: use dependency injection instead.
- **Passing `*string` or `*io.Reader`**: pass the value directly — it's already small/ref.
- **Returning typed nil as interface**: a `(*T)(nil)` assigned to an interface is non-nil.
  Return explicit `nil` when the function returns an interface type.
