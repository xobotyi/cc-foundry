# Type Testing

Depth on `expectTypeOf`, `assertType`, and the `typecheck` configuration.

Type tests are **not executed**. Vitest runs `tsc` (or `vue-tsc`) over the matched files and parses the diagnostics. A
dynamic test name, or one produced by `test.each` or `test.for`, is never evaluated and appears literally in the report.

## Setup

`typecheck.include` defaults to `['**/*.{test,spec}-d.?(c|m)[jt]s?(x)']`, so `foo.test-d.ts` is picked up without
configuration. `typecheck.enabled` defaults to `false`; `vitest --typecheck` turns it on, and `typecheck.only` runs
nothing else.

Since Vitest 2.1, overlapping `include` and `typecheck.include` produce two separate entries — the runtime test and the
type test — rather than the type check silently replacing the run.

Type errors in **source** files are reported too. `typecheck.ignoreSourceErrors: true` suppresses that when the project
tolerates them. `typecheck.checker` selects the binary, `typecheck.tsconfig` the config file, and
`typecheck.spawnTimeout` (default 10 000 ms) how long to wait for the checker to start.

`--allowOnly` and `-t` work against type tests.

## Choosing a matcher

Four matchers with different strictness. The wrong one passes on types it should reject.

- **`toEqualTypeOf<T>()`** — full mutual assignability. Fails on a missing property, passes on values of the same type.
  The strictest and the default choice.
- **`toMatchObjectType<T>()`** — a strict subset check for object types. Catches `readonly` differences that `toExtend`
  misses. The right matcher for "this object has at least these properties, exactly typed". Plain object types only; it
  fails on unions.
- **`toExtend<T>()`** — the actual type extends the expected one. The `toMatchObject` of the type world.
- **`toMatchTypeOf<T>()`** — deprecated in expect-type 1.2.0; `toExtend` is its replacement.

## Navigating a type

Chain into the shape rather than restating it: `parameters`, `parameter(n)`, `returns`, `resolves`,
`constructorParameters`, `instance`, `items`, `extract`, `exclude`, `branded`, `guards`, `asserts`, `toHaveProperty`.

```ts
expectTypeOf(mount).parameter(0).toExtend<{ name: string }>()
expectTypeOf(fetchUser).returns.resolves.toEqualTypeOf<User>()
```

Predicates: `toBeAny`, `toBeUnknown`, `toBeNever`, `toBeFunction`, `toBeObject`, `toBeArray`, `toBeString`,
`toBeNumber`, `toBeBoolean`, `toBeVoid`, `toBeSymbol`, `toBeNull`, `toBeUndefined`, `toBeNullable`, `toBeCallableWith`,
`toBeConstructibleWith`. Every one negates through `.not`.

`toBeAny` matters most: `any` satisfies every other assertion, so a type test that has silently degraded to `any` passes
everything. Assert `.not.toBeAny()` where the type came out of a generic or a library boundary.

## Reading the errors

The failure lands on the **expected** side, which reads backwards.
`expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: string }>()` produces a constraint mentioning
`"Expected: string, Actual: number"`. Read the property name and that phrase; ignore the rest of the sentence.

`toBe*` predicates fail differently — the type resolves to something non-callable, so the compiler reports
`This expression is not callable` and then `Type 'ExpectString<number>' has no call signatures`. The second line is the
real message.

## Type arguments over values

Prefer a type argument to a concrete value:

```ts
expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: string }>() // actionable error
expectTypeOf({ a: 1 }).toEqualTypeOf({ a: '' }) // vague error
```

The value form forces the compiler to infer the type argument, and the failure can only be reported against a generic
mismatch type. Where comparing two concrete values is genuinely more convenient, use `typeof`:
`expectTypeOf(one).toEqualTypeOf<typeof two>()`.

## `assertType`

`assertType<T>(value)` is the blunt alternative when `expectTypeOf` errors are unreadable. Pair it with
`// @ts-expect-error` to assert that a call _should_ fail:

```ts
assertType<number>(answer)
// @ts-expect-error answer is not a string
assertType<string>(answer)
```

A `@ts-expect-error` that stops erroring becomes an error itself, so this form fails when the type it guards is
loosened.
