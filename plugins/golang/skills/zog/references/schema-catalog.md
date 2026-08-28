# Schema catalog

Every constructor, modifier, and validator on the Zog schema types, with the signature the compiler accepts. Import as
`z "github.com/Oudwins/zog"`.

## Constructors

Every constructor except `z.Struct` and `z.Ptr` takes a trailing `opts ...SchemaOption`.

- **`z.String()`** — destination `string`
- **`z.StringLike[T ~string]()`** — destination any named type whose underlying type is `string`
- **`z.Bool()`** — destination `bool`
- **`z.BoolLike[T ~bool]()`** — destination any named type whose underlying type is `bool`
- **`z.Int()`, `z.Int32()`, `z.Int64()`, `z.Uint()`** — destination `int`, `int32`, `int64`, `uint`
- **`z.Float()`, `z.Float64()`, `z.Float32()`** — destination `float64`, `float64`, `float32`
- **`z.IntLike[T]()`, `z.UintLike[T]()`, `z.FloatLike[T]()`** — destination any named numeric type
- **`z.Time()`** — destination `time.Time`
- **`z.Struct(shape z.Shape)`** — destination a struct pointer
- **`z.Slice(schema ZogSchema, opts ...SchemaOption)`** — destination a slice
- **`z.Ptr(schema ZogSchema)`** — destination a pointer

`z.Float` and `z.Float64` are the same constructor. `z.Shape` is `map[string]ZogSchema`; the deprecated alias `z.Schema`
names the same type.

The `Like` numeric constructors are generic over `z.Numeric`, which is `constraints.Integer | constraints.Float` and so
covers every signed and unsigned integer width plus both float widths.

## Modifiers on every primitive schema

Available on `z.String`, the numeric schemas, `z.Bool`, and `z.Time`.

- `.Required(opts ...TestOption)` — the value must be present; see the required semantics in the skill body
- `.Optional()` — the default state, and useful only to undo an inherited `.Required()`
- `.Default(v T)` / `.DefaultFunc(func() T)` — replace a missing value, outranking `.Required()`
- `.Catch(v T)` / `.CatchFunc(func() T)` — on any issue, write this value and stop
- `.Test(t z.Test[*T])` / `.TestFunc(fn z.BoolTFunc[*T], opts ...TestOption)` — custom validation
- `.Transform(fn z.Transform[*T])` — in-place mutation at this position in the chain
- `.Parse(data any, dest *T, opts ...ExecOption) z.ZogIssueList`
- `.Validate(val *T, opts ...ExecOption) z.ZogIssueList`

`.DefaultFunc` and `.CatchFunc` were added in v0.22.1.

## String validators

`.Min(n)`, `.Max(n)`, `.Len(n)`, `.Email()`, `.URL()`, `.UUID()`, `.IP()`, `.IPv4()`, `.IPv6()`,
`.Match(re *regexp.Regexp)`, `.Contains(sub T)`, `.ContainsUpper()`, `.ContainsDigit()`, `.ContainsSpecial()`,
`.HasPrefix(s T)`, `.HasSuffix(s T)`, `.OneOf(enum []T)`, `.Trim()`, `.Not()`.

Every one except `.Trim()` and `.Not()` takes a trailing `opts ...TestOption`.

- `.OneOf` replaces Zod's `z.Enum` and exists on strings and numbers only.
- `.Trim()` is a transform, not a test. It runs at its position in the chain.
- `.Not()` returns a restricted interface that omits `Min`, `Max`, `Test`, `TestFunc`, and a second `Not`, so
  `z.String().Not().Min(3)` does not compile.

## Numeric validators

`.GT(n)`, `.GTE(n)`, `.LT(n)`, `.LTE(n)`, `.EQ(n)`, `.OneOf(enum []T)`, `.Not()`, each with a trailing
`opts ...TestOption`.

## Bool validators

`.True()`, `.False()`, `.EQ(v T)`. None of the three accepts a `TestOption`.

## Time validators

`.After(t time.Time, opts ...TestOption)`, `.Before(t time.Time, opts ...TestOption)`,
`.EQ(t time.Time, opts ...TestOption)`. There is no `.Is()`.

Set the layout a string input is parsed with through a schema option:

```go
z.Time(z.Time.Format(time.RFC3339))
z.Time(z.Time.FormatFunc(func(data string) (time.Time, error) { return time.Parse(time.RFC1123, data) }))
```

`z.Time` is a package-level variable of type `z.TimeFunc`, which is why `z.Time.Format` reads as a method on the
constructor. The layout applies to coercion, so it has no effect under `Validate`.

## Struct schema

`.Test`, `.TestFunc`, `.Transform`, `.Parse`, `.Validate`, plus four shape helpers:

- `.Pick(picks ...any) *StructSchema` — a shallow copy holding only the named keys
- `.Omit(vals ...any) *StructSchema` — a shallow copy without the named keys
- `.Extend(shape z.Shape) *StructSchema` — a shallow copy with extra keys
- `.Merge(other *StructSchema, others ...*StructSchema) *StructSchema` — later schemas win on a key collision

`Pick` and `Omit` accept either bare key strings or a `map[string]bool`, and neither is type-checked against the
destination struct. A key that names no struct field panics at execution.

`.Required()` and `.Optional()` exist on a struct schema and return the receiver unchanged.

## Slice schema

`.Min(n)`, `.Max(n)`, `.Len(n)`, `.Contains(value any)`, `.Not()`, `.Required()`, `.Optional()`, `.Default(val any)`,
`.DefaultFunc`, `.Test`, `.TestFunc`, `.Transform`. The size validator is `.Len`, not `.Length`. A slice schema has no
`.Catch`.

## Pointer schema

`z.Ptr(schema)` carries `.NotNil(opts ...TestOption)`, `.Parse`, and `.Validate`, and nothing else. Put every other
modifier on the inner schema.

## Test options

Passed as trailing arguments to any validator, and to `.Required()`.

- `z.Message(msg string)` — a fixed message
- `z.MessageFunc(fn func(e *z.ZogIssue, ctx z.Ctx))` — a message computed from the issue
- `z.IssueCode(code zconst.ZogIssueCode)` — replace the issue code
- `z.IssuePath(path []string)` — replace the issue path; the argument is a slice, not a string
- `z.Params(params map[string]any)` — values interpolated into a message template as `{{key}}`

A message template also expands `{{value}}` to the offending input.

## Schema options

Passed to a constructor, never to `Parse` or `Validate`.

- `z.WithCoercer(fn conf.CoercerFunc)` — replace coercion for this schema
- `z.Time.Format(layout string)` and `z.Time.FormatFunc(fn)` — time layouts

## Execution options

Passed to `Parse` and `Validate`, never to a constructor.

- `z.WithCtxValue(key string, val any)` — read back inside a test or transform with `ctx.Get(key)`
- `z.WithIssueFormatter(fn z.IssueFmtFunc)` — replace message formatting for this call only
- `z.WithErrFormatter` — the deprecated spelling of `z.WithIssueFormatter`

## The execution context

`z.Ctx` reaches every test, transform, and preprocessor.

- `ctx.Get(key string) any` — a value set by `z.WithCtxValue`
- `ctx.AddIssue(e *z.ZogIssue)` — record an issue
- `ctx.Issue() *z.ZogIssue` — a new issue with the current path, value, and type already filled in

`ctx.NewError` and `ctx.HasErrored` are on the interface and deprecated; do not call either.

## Issue codes

`zconst.ZogIssueCode` is a string. The `IssueCodeXxx` constants carry these values:

`custom`, `required`, `not_nil`, `coerce`, `fallback`, `eq`, `one_of_options`, `min`, `max`, `len`, `contained`, `lte`,
`lt`, `gte`, `gt`, `email`, `uuid`, `match`, `url`, `ip`, `prefix`, `suffix`, `contains_upper`, `contains_lower`,
`contains_digit`, `contains_special`, `after`, `before`, `true`, `false`, `invalid_json`, `invalid_form`,
`invalid_multipart_form`, `invalid_query`.

`.Not()` prefixes the code of the test it negates with `not_`, so `z.String().Not().Email()` reports `not_email`.

The `ErrCodeXxx` constants name the same strings and are deprecated.

## Type constants

`zconst.ZogType` is a string, used as the first key of a `LangMap` and as `ZogIssue.Dtype`: `string`, `number`, `bool`,
`time`, `slice`, `map`, `struct`, `ptr`, `custom`, `preprocess`, `boxed`, `any`.

`zconst.ISSUE_KEY_ROOT` is `"$root"`. `zconst.ZogTag` is `"zog"`.
