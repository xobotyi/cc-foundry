---
name: zog
description: >-
  Zog schema validation library: schema definition, parsing, validation, error handling, HTTP/JSON/env
  integration, custom tests, and transforms. Invoke whenever task involves any interaction with Zog — writing schemas,
  parsing input, validating structs, handling errors, or integrating with HTTP handlers.
---

# Zog

Zod-inspired schema validation for Go. Declarative schema builder with runtime parsing and validation. Import as
`z "github.com/Oudwins/zog"`.

<critical>

- All fields are **optional by default** (opposite of Zod)
- Schema keys in `z.Shape{}` must match **struct field names**, not input data keys — use struct tags (`json`, `form`,
  `zog`) for input key mapping
- All schemas return `ZogIssueList`
- Check errors with `len(errs) > 0`, not `errs != nil`
- Zog **panics on schema misconfiguration** (destination type mismatch, missing struct fields) but never on invalid
  input data
- Do not depend on test execution order — tests may run in parallel in future versions

</critical>

## Parse vs Validate

Two entry points, same schemas:

- `schema.Parse(data, &dest, ...opts)` — coerces untyped input into destination. Use at IO boundaries (HTTP, JSON, env)
- `schema.Validate(&value, ...opts)` — validates existing Go values. No coercion. More efficient when data is already
  typed

**Key difference:** `Validate` treats zero values as missing when `Required()` is set. Use `z.Ptr()` + `.NotNil()` to
distinguish "not provided" from "zero value":

```go
// Parse can distinguish 0 from missing
z.Int().Required().Parse(0, &dest) // ok

// Validate cannot — use pointer
z.Ptr(z.Int()).NotNil().Validate(&valPtr) // nil = missing, *0 = valid
```

**Prefer `Validate` when data is already typed.** Use `Parse` when accepting external input that needs coercion.

## Schema Types

### Primitives

All primitive `.Parse()` / `.Validate()` return `ZogIssueList`.

**String:**

- `z.String()` — base string schema
- `.Trim()` — transform: trims whitespace
- `.Min(n)`, `.Max(n)`, `.Len(n)` — length validators
- `.Email()`, `.URL()`, `.UUID()`, `.IPv4()` — format validators
- `.Match(regex)` — regex match
- `.Contains(s)`, `.ContainsUpper()`, `.ContainsDigit()`, `.ContainsSpecial()` — content validators
- `.HasPrefix(s)`, `.HasSuffix(s)` — prefix/suffix validators
- `.OneOf([]string{...})` — enum-like validation (replaces Zod's `z.Enum()`)
- `.Not()` — negates the next test

**Numbers:**

- `z.Int()`, `z.Int32()`, `z.Int64()`, `z.Float32()`, `z.Float64()` — numeric schemas
- `.GT(n)`, `.GTE(n)`, `.LT(n)`, `.LTE(n)`, `.EQ(n)` — comparison validators
- `.OneOf([]T{...})` — enum-like validation
- `.Not()` — negates the next test

**Bool:**

- `z.Bool()` — boolean schema
- `.True()`, `.False()`, `.EQ(v)` — value validators

**Time:**

- `z.Time()` — validates `time.Time`
- `.After(t)`, `.Before(t)`, `.Is(t)` — temporal validators
- `z.Time(z.Time.Format(layout))` — parse strings using layout (default: `time.RFC3339`). Coercion only works with
  `Parse()`, not `Validate()`

### Complex Types

**Struct:**

```go
schema := z.Struct(z.Shape{
    "name": z.String().Required(),
    "age":  z.Int().GT(0),
})
```

- `.Pick("key1", map[string]bool{"a": true})` — shallow copy with only specified fields
- `.Omit("key1", map[string]bool{"a": true})` — shallow copy without specified fields
- `.Extend(z.Shape{...})` — shallow copy with additional fields
- `.Merge(other1, other2)` — merge schemas, last wins on conflict
- Structs cannot be `Required()` or `Optional()` — use `z.Ptr(z.Struct(...))` for optional structs

**Slice:**

```go
schema := z.Slice(z.String().Required())
```

- `.Min(n)`, `.Max(n)`, `.Length(n)` — size validators
- `.Contains(val)` — element presence validator
- `.Not()` — negates the next test

**Pointer:**

```go
z.Ptr(z.String()) // pointer to string
```

- `.NotNil()` — equivalent to `Required()` for other types

**Boxed:**

```go
z.Boxed[BoxType, InnerType](innerSchema, unboxFunc, boxFunc)
```

Wraps a schema with custom box/unbox logic for types like `sql.NullString`, `driver.Valuer`, or custom wrappers. The
`unboxFunc` extracts the inner value; `boxFunc` creates the wrapper from validated value (can be `nil` if boxing not
needed).

### Custom Primitive Schemas

For named types based on primitives:

```go
type Env string
z.StringLike[Env]().OneOf([]Env{"prod", "dev"})
```

Available: `z.StringLike[T]()`, `z.IntLike[T]()`, `z.FloatLike[T]()`, `z.UintLike[T]()`, `z.BoolLike[T]()`

### CustomFunc

Quick validation for non-primitive types without defining a full schema:

```go
z.CustomFunc(func(valPtr *uuid.UUID, ctx z.Ctx) bool {
    return valPtr.IsValid()
}, z.Message("invalid uuid"))
```

Does not support coercion.

## Generic Schema Methods

Available on all schema types:

- `.Required()` — field must be present and non-zero
- `.Optional()` — field can be absent (default behavior)
- `.Default(val)` / `.DefaultFunc(fn)` — use this value when input is zero. Takes priority over `Required()`. Tests
  still run
- `.Catch(val)` / `.CatchFunc(fn)` — on any error, set destination to this value and stop execution
- `.Test(z.Test{...})` — complex custom test (like Zod's `superRefine`)
- `.TestFunc(fn, ...opts)` — simple custom test (like Zod's `refine`)
- `.Transform(func(valPtr *T, ctx z.Ctx) error)` — post-validation in-place mutation

Execution order: nil check → default/required → coerce → validation loop (tests + transforms in order) → catch on error

## Struct Tags

Schema keys match struct field names by default. Use struct tags for input key mapping:

- `json` — JSON input
- `form` — form data
- `query` — query params
- `env` — environment variables
- `zog` — catch-all, works for any input

Priority: `json`/`form`/`query`/`env` → `zog` → schema field name

```go
type User struct {
    Name     string `zog:"first-name"`
    LastName string `query:"last_name" json:"last-name"`
}
```

## Custom Tests

**Simple (refine-like):** Return `bool` — Zog creates the issue:

```go
z.String().TestFunc(func(data *string, ctx z.Ctx) bool {
    return *data == "expected"
}, z.Message("must be expected"))
```

For structs/slices, the parameter is `any` — cast manually:

```go
z.Struct(z.Shape{...}).TestFunc(func(dataPtr any, ctx z.Ctx) bool {
    user := dataPtr.(*User)
    return user.Name != ""
})
```

**Complex (superRefine-like):** Add issues manually via context:

```go
z.String().Test(z.Test{
    Func: func(val any, ctx z.Ctx) {
        s := val.(string)
        if !isValid(s) {
            ctx.AddIssue(ctx.Issue().SetMessage("invalid value"))
        }
    },
})
```

**Reusable tests:** Wrap in functions returning `z.Test[T]`:

```go
func MinWords(n int, opts ...z.TestOption) z.Test[any] {
    options := []z.TestOption{z.Message(fmt.Sprintf("must have at least %d words", n))}
    options = append(options, opts...)
    return z.TestFunc(func(val any, ctx z.Ctx) bool {
        s := val.(*string)
        return len(strings.Fields(*s)) >= n
    }, options...)
}
```

## Transforms

Post-validation mutation via pointer. Runs in declaration order with tests:

```go
z.String().Min(3).Transform(func(valPtr *string, ctx z.Ctx) error {
    *valPtr = strings.ToLower(*valPtr)
    return nil
})
```

Struct transforms receive `any` — cast to struct pointer:

```go
z.Struct(z.Shape{...}).Transform(func(dataPtr any, ctx z.Ctx) error {
    user := dataPtr.(*User)
    user.FullName = user.First + " " + user.Last
    return nil
})
```

Returning an error from a transform stops execution and produces an issue.

## Preprocess

Transform input **before** parsing. Pure function — creates a copy:

```go
z.Preprocess(func(data any, ctx z.Ctx) (any, error) {
    s, ok := data.(string)
    if !ok {
        return nil, fmt.Errorf("expected string, got %T", data)
    }
    return strings.Split(s, ","), nil
}, z.Slice(z.String().Email().Required()))
```

**Footgun:** With `Validate()`, the `data` argument is a pointer to the value, not the raw input.

## Error Handling

### ZogIssue

```go
type ZogIssue struct {
    Code    zconst.ZogIssueCode // issue identifier (e.g., "required", "min", "email")
    Path    []string            // location in data structure (nil for root primitives)
    Value   any                 // input value that caused the issue
    Dtype   string              // destination type
    Params  map[string]any      // test parameters (may be nil)
    Message string              // human-readable, user-safe message
    Err     error               // underlying error or nil
}
```

All schemas return `ZogIssueList = []*ZogIssue`. Each issue has a `Path` field:

- Primitive root: `nil`
- Struct field: `[]string{"name"}`
- Nested: `[]string{"address", "streets", "[0]"}`
- Path to string: `issue.PathString()` or `z.Issues.FlattenPath(issue.Path)`

### Formatting Strategies

- `z.Issues.Flatten(errs)` — `map[path][]messages`. Root issues under `"$root"` key (`zconst.ISSUE_KEY_ROOT`)
- `z.Issues.Treeify(errs)` — nested tree mirroring data structure. Each node has `errors` array and `properties`/`items`
- `z.Issues.Prettify(errs)` — human-readable string with `✖` prefix and `→ at path` lines

### Issue Codes

Common codes: `required`, `coerce`, `custom`, `min`, `max`, `len`, `email`, `uuid`, `url`, `match`, `gt`, `gte`, `lt`,
`lte`, `eq`, `one_of_options`, `after`, `before`, `true`, `false`, `prefix`, `suffix`, `contains_upper`,
`contains_digit`, `contains_special`, `contained`

HTTP-specific: `invalid_json`, `invalid_form`, `invalid_query`

### Custom Messages

Per-test: `z.Message("text")`, `z.MessageFunc(fn)`, `z.IssueCode("code")`, `z.IssuePath("path")`

```go
z.String().Min(5, z.Message("must be at least 5 chars"))
```

Per-execution: `z.WithIssueFormatter(fn)` — overrides all messages for one `Parse`/`Validate` call

Global: Override `conf.DefaultIssueMessageMap[zconst.TypeString][zconst.IssueCodeRequired]` or replace
`conf.IssueFormatter`

## Test Options

Options passed to any test:

- `z.Message("...")` — static issue message
- `z.MessageFunc(func(e *ZogIssue, ctx z.Ctx))` — dynamic issue message
- `z.IssueCode("...")` — override issue code
- `z.IssuePath("...")` — override issue path

## Execution Options

Options passed to `Parse()` / `Validate()`:

- `z.WithCoercer(fn)` — per-schema coercion override (Parse only)
- `z.WithIssueFormatter(fn)` — override message formatting for this execution
- `z.WithCtxValue(key, val)` — pass custom data to tests/transforms via `ctx.Get(key)`

## Context

`z.Ctx` interface available in tests, transforms, and preprocessors:

- `ctx.Get(key)` — retrieve value set via `z.WithCtxValue()`
- `ctx.AddIssue(issue)` — add a custom issue
- `ctx.Issue()` — create a new issue pre-filled with current schema context (path, value, type)

## HTTP Integration (zhttp)

```go
import "github.com/Oudwins/zog/zhttp"

errs := userSchema.Parse(zhttp.Request(r), &user)
```

`zhttp.Request(r)` auto-detects content type (JSON, form, query params). Only supports parsing into structs.

Invalid input produces a root issue with code `invalid_json`, `invalid_form`, or `invalid_query` — the schema does not
run.

## JSON Integration (zjson)

```go
import "github.com/Oudwins/zog/parsers/zjson"

errs := userSchema.Parse(zjson.Decode(bytes.NewReader(jsonBytes)), &user)
```

Accepts `io.Reader` or `io.ReaderCloser`. Only supports structs.

## Environment Variables (zenv)

```go
import "github.com/Oudwins/zog/zenv"

errs := envSchema.Parse(zenv.NewDataProvider(), &cfg)
```

Use `env` or `zog` struct tags for key mapping. Coercion handles string-to-type conversion automatically.

## i18n

```go
import (
    "github.com/Oudwins/zog/i18n"
    "github.com/Oudwins/zog/i18n/en"
    "github.com/Oudwins/zog/i18n/es"
)

// Setup
i18n.SetLanguagesErrsMap(map[string]i18n.LangMap{
    "en": en.Map,
    "es": es.Map,
}, "en") // default language

// Per-execution
schema.Parse(data, &dest, z.WithCtxValue(i18n.LangKey, "es"))
```

Single language: set `conf.DefaultErrMsgMap = es.Map`.

## Global Configuration

Via `github.com/Oudwins/zog/conf`:

- `conf.Coercers.Float64 = func(data any) (any, error) {...}` — override type coercion
- `conf.DefaultCoercers.Float64(data)` — fallback to default coercer
- `conf.DefaultIssueMessageMap` — override issue messages per type and code
- `conf.IssueFormatter` — replace the global issue formatter

## Patterns

### Struct Validate Method

```go
var userSchema = z.Struct(z.Shape{
    "ID":   z.Int().Required(),
    "Name": z.String().Required().Min(2),
})

func (u *User) Validate() z.ZogIssueList {
    return userSchema.Validate(u)
}
```

### HTTP Handler

```go
func handleCreate(w http.ResponseWriter, r *http.Request) {
    var user User
    if errs := userSchema.Parse(zhttp.Request(r), &user); len(errs) > 0 {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(z.Issues.Flatten(errs))
        return
    }
    // user is valid and populated
}
```

### Environment Config

```go
var envSchema = z.Struct(z.Shape{
    "PORT": z.Int().GT(1000).LT(65535).Default(3000),
    "DB_HOST": z.String().Default("localhost"),
})

var Env = func() Config {
    var c Config
    if errs := envSchema.Parse(zenv.NewDataProvider(), &c); len(errs) > 0 {
        log.Fatal(z.Issues.Prettify(errs))
    }
    return c
}()
```

## Limitations

- No `z.Map()` schema
- `zhttp` and `zjson` only parse into structs
- Structs/slices do not support `Catch()`; structs do not support `Default()`
- Deeply nested schemas incur reflection overhead
- `Pick`, `Omit`, `Extend`, `Merge` are not type-safe

## Application

When **writing** code with Zog: apply all conventions silently — don't narrate each rule. Always check errors with
`len(errs) > 0`. Define schemas as package-level `var`, not inside functions. If an existing codebase contradicts a
convention, follow the codebase and flag the divergence once.

When **reviewing** code with Zog: cite the specific violation and show the fix inline. Proactively flag: `errs != nil`
checks (must be `len(errs) > 0`), missing `Required()` on mandatory fields, schema keys not matching struct field names,
and missing struct tags for external input mapping.

## Integration

The **golang** skill governs Go language conventions. This skill governs Zog-specific API and patterns. When both apply,
Zog idioms (e.g., `z.Shape{}` key naming) take precedence over general Go naming rules within schema definitions.
