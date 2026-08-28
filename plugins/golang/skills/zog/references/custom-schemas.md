# Custom schemas

Four escalating options for a type the built-in constructors do not cover, plus input reshaping, the coercion hooks, and
the experimental constructors. Reach for the cheapest option that works.

## A named type over a primitive

The `Like` constructors are generic over the underlying type, so every validator stays typed to the named type.

```go
type Env string

const (
	Prod Env = "prod"
	Dev  Env = "dev"
)

type Status int

var schema = z.Struct(z.Shape{
	"Environment": z.StringLike[Env]().OneOf([]Env{Prod, Dev}),
	"Status":      z.IntLike[Status]().OneOf([]Status{1, 2}),
})
```

`z.StringLike[T ~string]`, `z.BoolLike[T ~bool]`, `z.IntLike[T]`, `z.UintLike[T]`, and `z.FloatLike[T]` cover this case.
Passing a plain `z.String()` against a `type Env string` field panics with a type-cast error.

## One validation on an arbitrary type

`z.CustomFunc` wraps a predicate as a schema. It is the cheapest option for a type Zog knows nothing about.

```go
z.CustomFunc(func(valPtr *uuid.UUID, ctx z.Ctx) bool {
	return *valPtr != uuid.Nil
}, z.Message("invalid uuid"))
```

The signature is `z.CustomFunc[T any](fn func(ptr *T, ctx Ctx) bool, opts ...TestOption) *z.Custom[T]`. The value
arrives as a pointer to avoid copying. `z.Custom` performs no coercion, so under `Parse` the input must already be a
`T`; anything else produces a `coerce` issue.

## A wrapper type

`z.Boxed` runs an existing schema against a value held inside a wrapper — `sql.NullString`, a `driver.Valuer`, an option
type.

```go
type NullString struct {
	String string
	Valid  bool
}

var nullStringSchema = z.Boxed(
	z.String().Min(3),
	func(ns NullString, ctx z.Ctx) (string, error) {
		if !ns.Valid {
			return "", errors.New("null string is not valid")
		}
		return ns.String, nil
	},
	func(s string, ctx z.Ctx) (NullString, error) {
		return NullString{String: s, Valid: true}, nil
	},
)
```

The signature is
`z.Boxed[B any, T any](schema ZogSchema, unbox UnboxFunc[B, T], box CreateBoxFunc[T, B]) *BoxedSchema[B, T]`, where `B`
is the wrapper and `T` is the inner value. `Parse` takes the raw input and writes a `B`; `Validate` takes a `*B`.
`z.Boxed` arrived in v0.21.10.

## A schema written from scratch

`z.Use` adapts a type implementing `z.EXPERIMENTAL_PUBLIC_ZOG_SCHEMA`, which in v0.22.2 requires five methods:

```go
type EXPERIMENTAL_PUBLIC_ZOG_SCHEMA interface {
	Process(ctx *internals.SchemaCtx)
	Validate(ctx *internals.SchemaCtx)
	GetType() zconst.ZogType
	SetCoercer(c z.CoercerFunc)
	ToZSS() *zss.ZSSSchema
}
```

The upstream documentation lists four; `ToZSS` is required and returns a `*zss.ZSSSchema` from
`github.com/Oudwins/zog/pkgs/zss/core`. Returning `nil` from it is enough for a schema that is never serialized.

`Process` handles `Parse`: coerce `ctx.Data`, write through `ctx.ValPtr`, and add issues. `Validate` handles the
already-typed value at `ctx.ValPtr`. Add issues with `ctx.AddIssue(ctx.Issue().SetMessage(...))` and
`ctx.IssueFromCoerce(err)`; never panic. `internals` carries no compatibility promise across minor versions.

Wrap it and use it anywhere a schema goes:

```go
z.Struct(z.Shape{"ID": z.Use(&myCustomSchema{})})
z.Slice(z.Use(&myCustomSchema{}))
z.Ptr(z.Use(&myCustomSchema{}))
```

## Reshaping input before a schema runs

`z.Preprocess(fn, schema)` transforms the incoming value and hands the result to the schema. The function is pure: it
returns a new value rather than mutating one.

```go
var emails = z.Preprocess(func(data any, ctx z.Ctx) (any, error) {
	s, ok := data.(string)
	if !ok {
		return nil, fmt.Errorf("expected string, got %T", data)
	}
	return strings.Split(s, ","), nil
}, z.Slice(z.String().Email().Required()))
```

The signature is `z.Preprocess[F any, T any](fn func(data F, ctx Ctx) (T, error), schema ZogSchema)`.

- Keep `F` as `any` unless the input type is fixed. Under `Parse` the input is whatever the caller passed; under
  `Validate` it is a **pointer** to the value being validated, and a mismatch panics rather than reporting an issue.
- `PreprocessSchema.Validate` accepts `*T` or `**T` and panics on anything else.
- An error returned from the function becomes an issue and stops execution.

## Coercion

A coercer converts an arbitrary input into the schema's Go type during `Parse` only.

```go
type CoercerFunc = func(original any) (value any, err error)
```

Per schema:

```go
z.String(z.WithCoercer(func(data any) (any, error) {
	return fmt.Sprint(data), nil
}))
```

Globally, through `github.com/Oudwins/zog/conf`:

```go
conf.Coercers.Float64 = func(data any) (any, error) {
	if str, ok := data.(string); ok && strings.Contains(str, ",") {
		return parseCommaDecimal(str)
	}
	return conf.DefaultCoercers.Float64(data)
}
```

`conf.Coercers` and `conf.DefaultCoercers` are structs with `Bool`, `String`, `Int`, `Float64`, `Uint`, `Time`, and
`Slice` fields. Unlike the message map, `conf.Coercers` is read on every parse, so assigning a field takes effect
immediately. A coercer returning a value of the wrong Go type panics.

## Maps

`z.EXPERIMENTAL_MAP` validates a Go map. It arrived in v0.22.1 and the name signals that it may change.

```go
schema := z.EXPERIMENTAL_MAP[string, int](z.String(), z.Int())
var m map[string]int
errs := schema.Parse(map[string]any{"one": 1}, &m)
```

The key schema must satisfy `z.PrimitiveZogSchema[K]`; the value schema is any schema. The result carries `.Min`,
`.Max`, `.Len`, `.Required`, `.Optional`, `.Default`, `.DefaultFunc`, `.Test`, `.TestFunc`, and `.Transform`.

## Recursive schemas

`z.EXPERIMENTAL_RECURSIVE` builds a schema that references itself. It arrived in v0.22.1.

```go
type Node struct {
	Value int
	Self  *Node
}

var nodeSchema = z.EXPERIMENTAL_RECURSIVE(func(self z.RecursiveSchema[*z.PointerSchema]) *z.PointerSchema {
	return z.Ptr(z.Struct(z.Shape{
		"Value": z.Int().Required(),
		"Self":  self(),
	}))
})
```

`self()` returns a lazily materialized reference, resolved once under a `sync.Once` and safe for concurrent use. `self`
also accepts updater functions, of which only the first ever runs. An updater receives the shared schema rather than a
clone, so mutating it through a builder method corrupts every other reference to the same node.
