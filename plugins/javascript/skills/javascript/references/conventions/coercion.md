# Coercion, Equality, and Values

## The four equality algorithms

- **`==` (IsLooselyEqual)** — coerces. Same type compares as `===`. `null` and `undefined` are equal to each other and
  to nothing else, except an object with the legacy `[[IsHTMLDDA]]` slot (`document.all`), which is loosely equal to
  both.
- **`===` (IsStrictlyEqual)** — no coercion, but `+0 === -0` is `true` and `NaN === NaN` is `false`.
- **`Object.is` (SameValue)** — like `===` except `Object.is(NaN, NaN)` is `true` and `Object.is(0, -0)` is `false`.
- **SameValueZero** — like `Object.is` except `0` and `-0` are one value. Not exposed as a function.

Which algorithm a built-in uses is the whole trap:

- `indexOf`, `lastIndexOf`, and `switch`/`case` use **strict equality** — `[NaN].indexOf(NaN)` is `-1`, and `case NaN:`
  never matches.
- `includes`, `Map` keys, and `Set` members use **SameValueZero** — `[NaN].includes(NaN)` is `true`, and a `Map` stores
  `-0` under the key `0`.

That split produces a real bug: `[1, , 3].indexOf(undefined)` is `-1` because `indexOf` skips holes, while
`[1, , 3].includes(undefined)` is `true` because `includes` treats a hole as `undefined`.

## Where `-0` comes from

Unary negation of a zero, `Math.round`, `Math.floor`, `Math.min(-0, +0)`, and `Math.pow(-Infinity, -3)` all produce `-0`
without a `-0` in the input. `~~(-0)` and `-0 << 2 >> 2` lose the sign, because ToInt32 has one zero. `-0` survives
`===` unnoticed and shows up only through `Object.is`, `1 / v === -Infinity`, or `String(v)` after `Object.is`.

## Number

- **`toFixed` rounds the binary double, not the decimal you wrote.** `(1.005).toFixed(2)` is `"1.00"` and
  `(1.45).toFixed(1)` is `"1.4"`, because neither decimal is exactly representable. For money, hold integer minor units
  or a decimal library, and format with `Intl.NumberFormat`.
- **`Number.MAX_SAFE_INTEGER + 1` and `+ 2` are the same value.** Above 2^53 − 1, integer arithmetic silently loses
  precision. Use `BigInt` for identifiers and counters that can exceed it.
- **`Number.isInteger(1e100)` is `true`.** It tests "has no fractional part", not "is a safe integer". Use
  `Number.isSafeInteger`.
- **`parseInt` stops at the first invalid character.** `parseInt("1e3")` is `1`, `parseInt("0x10")` is `16`. Prefer
  `Number(s)` for a whole-string conversion, and note that `Number("")` is `0` while `parseInt("")` is `NaN`.
- **`["1","7","11"].map(parseInt)` is `[1, NaN, 3]`**, because `map` passes the index as the radix. Any built-in with
  optional parameters is unsafe as a bare callback: write `map((s) => parseInt(s, 10))`.
- **`typeof NaN` is `"number"` and `typeof null` is `"object"`.** Test for `NaN` with `Number.isNaN`, never the global
  `isNaN`, which coerces first: `isNaN("abc")` is `true`.

## BigInt

- Arithmetic never mixes: `1n + 1` throws `TypeError`. Convert explicitly.
- Comparison does mix: `1n == 1` and `1n < 2` are `true`. `1n === 1` is `false`.
- `JSON.stringify(1n)` throws `TypeError`. Serialize with `String(v)`, a `toJSON` method, or `JSON.rawJSON`.
- `Math.*` rejects BigInt. There is no `Math.max` over BigInts.

## Objects and property order

- **Integer-like keys come first, ascending, regardless of insertion order.** `Object.keys({ b: 1, 2: 1, a: 1, 1: 1 })`
  is `["1", "2", "b", "a"]`. This holds for `Object.keys`, `Object.entries`, `for...in`, and `JSON.stringify`. A map
  keyed by numeric ids therefore reorders itself; use a `Map` when order matters.
- **A `Map` is not enumerable as an object.** `Object.entries(new Map([[1, 2]]))` is `[]`, and `JSON.stringify` of a
  `Map` is `{}`. Convert with `Object.fromEntries(map)` or `[...map]`.
- **`Set` and `Map` preserve insertion order** and deduplicate by SameValueZero.

## Copying

- **Spread and `Object.assign` are shallow**, copy only own enumerable properties, and drop the prototype: spreading a
  class instance gives a plain object with no methods.
- **Spread reads getters and writes data properties.** `{ ...src }` invokes `src`'s getter once and stores the result;
  the copy has a plain value, not an accessor.
- **`Object.assign` triggers setters on the target**, spread does not. That difference decides which one is safe when
  the target is a reactive object.
- **`structuredClone` is deep but not universal.** It throws `DataCloneError` on functions, symbols, and DOM nodes; it
  discards the prototype, so a class instance clones to a plain object; and it preserves `Map`, `Set`, `Date`, `RegExp`,
  typed arrays, and cycles.
- **A null-prototype dictionary does not survive `structuredClone`.** The clone is an ordinary object carrying
  `Object.prototype`, so cloning an `Object.create(null)` map reopens every collision the null prototype closed. Rebuild
  it with `Object.assign(Object.create(null), clone)`, or hold the data in a `Map`, which clones as a `Map`.

## Prototype pollution

- **`JSON.parse` is safe by itself.** `JSON.parse('{"__proto__": {...}}')` creates an own `__proto__` data property and
  does not change the prototype. The pollution happens in whatever merges that object afterwards with a recursive
  assignment.
- **An object literal is not safe.** `{ __proto__: x }` sets the prototype, because that is literal syntax rather than a
  property.
- **Use `Object.create(null)` or a `Map` for a dictionary keyed by external input.** A null-prototype object has no
  `toString`, `hasOwnProperty`, or `constructor` to collide with, which is exactly why `Object.groupBy` returns one.

## JSON

- `undefined`, functions, and symbols are **dropped from an object** and **replaced with `null` in an array**.
- `toJSON` is consulted before serialization; `Date.prototype.toJSON` is why a `Date` becomes an ISO string.
- Key order follows the property order rules above, so a serialized object is never a stable comparison target. Compare
  parsed values, not strings.

## Dates

`new Date("2026-01-01")` is parsed as UTC midnight. `new Date("2026-01-01T00:00")` is parsed as local midnight. The two
differ by the offset, which is how an off-by-one-day bug enters a report. Parse with an explicit offset, or use
`Temporal` where the engine baseline allows it.
