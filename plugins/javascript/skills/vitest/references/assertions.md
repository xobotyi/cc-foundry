# Vitest Assertions

The `expect` API, matchers, snapshots, and extending with custom matchers.

## Basics

Vitest provides both Jest-compatible and Chai assertion APIs:

```ts
expect(value).toBe(2)           // Jest-style (preferred in Vitest)
expect(value).to.equal(2)       // Chai-style (also works)
```

Optional second argument for custom error messages:

```ts
expect(value, 'should be positive').toBeGreaterThan(0)
```

## Value Matchers

### Equality

| Matcher | Use When |
|---------|----------|
| `toBe(val)` | Primitives or same reference (`Object.is`) |
| `toEqual(val)` | Deep structural equality (ignores `undefined` in expected) |
| `toStrictEqual(val)` | Deep equality + checks `undefined` keys, sparse arrays, class types |
| `toMatchObject(subset)` | Object contains at least these properties |

### Truthiness

| Matcher | Checks |
|---------|--------|
| `toBeTruthy()` | Truthy (not `false`, `0`, `''`, `null`, `undefined`, `NaN`) |
| `toBeFalsy()` | Falsy |
| `toBeNull()` | `=== null` |
| `toBeUndefined()` | `=== undefined` |
| `toBeDefined()` | `!== undefined` |
| `toBeNaN()` | `Number.isNaN` |

### Numbers

| Matcher | Checks |
|---------|--------|
| `toBeGreaterThan(n)` | `> n` |
| `toBeGreaterThanOrEqual(n)` | `>= n` |
| `toBeLessThan(n)` | `< n` |
| `toBeCloseTo(n, digits?)` | Floating-point comparison (default 2 decimal digits) |

### Strings, Arrays, Objects

| Matcher | Checks |
|---------|--------|
| `toContain(item)` | Array includes item, or string includes substring |
| `toContainEqual(obj)` | Array contains item with matching structure |
| `toHaveLength(n)` | `.length === n` |
| `toHaveProperty(key, val?)` | Property exists (with optional value check) |
| `toMatch(regex\|string)` | String matches pattern |

### Type Checks

```ts
expect(value).toBeTypeOf('string')       // typeof check
expect(value).toBeInstanceOf(MyClass)    // instanceof check
expect(value).toBeOneOf(['a', 'b', 'c']) // value is one of these
```

### Errors

```ts
// Sync — must wrap in a function:
expect(() => throwingFn()).toThrow('message')
expect(() => throwingFn()).toThrow(/pattern/)
expect(() => throwingFn()).toThrow(ErrorClass)

// Async — use rejects:
await expect(asyncFn()).rejects.toThrow('message')
```

## Spy/Mock Assertions

| Matcher | Checks |
|---------|--------|
| `toHaveBeenCalled()` | Called at least once |
| `toHaveBeenCalledTimes(n)` | Called exactly `n` times |
| `toHaveBeenCalledWith(...args)` | Called with these args (at least once) |
| `toHaveBeenLastCalledWith(...args)` | Last call used these args |
| `toHaveBeenNthCalledWith(n, ...args)` | Nth call (1-indexed) used these args |
| `toHaveReturned()` | Returned successfully (no throw) |
| `toHaveReturnedWith(val)` | Returned this value |

## Async Assertions

### `resolves` / `rejects`

**Always `await`** — un-awaited assertions pass silently:

```ts
await expect(fetchData()).resolves.toEqual({ id: 1 })
await expect(failingFn()).rejects.toThrow('error')
```

### `expect.poll` — Retry Until Pass

Retries the assertion callback until it succeeds or times out:

```ts
await expect.poll(() => document.querySelector('.el')).toBeTruthy()
await expect.poll(() => getCount(), { timeout: 5000, interval: 100 }).toBe(5)
```

Does not support snapshot matchers or `.resolves`/`.rejects`.

## Soft Assertions

`expect.soft` continues the test after failure, reporting all errors at the end:

```ts
expect.soft(a).toBe(1)  // fail but continue
expect.soft(b).toBe(2)  // also checked
// both failures reported
```

Mix with regular `expect` — a hard `expect` failure stops the test and reports
all soft failures accumulated so far.

## Asymmetric Matchers

Use inside `toEqual`, `toHaveBeenCalledWith`, etc.:

```ts
expect(obj).toEqual({
  id: expect.any(Number),
  name: expect.any(String),
  tags: expect.arrayContaining(['important']),
  meta: expect.objectContaining({ version: 1 }),
  email: expect.stringContaining('@'),
  slug: expect.stringMatching(/^[a-z-]+$/),
})

// Negation:
expect(arr).toEqual(expect.not.arrayContaining(['secret']))
```

### `expect.closeTo` — Floats in Objects

```ts
expect({ sum: 0.1 + 0.2 }).toEqual({ sum: expect.closeTo(0.3, 5) })
```

## Assertion Count

Guard against missing assertions in async code:

```ts
test('callbacks fire', async () => {
  expect.assertions(2)       // exactly 2 assertions must run
  // or:
  expect.hasAssertions()     // at least 1 assertion must run
})
```

## Snapshots

### File Snapshots

```ts
expect(result).toMatchSnapshot()          // writes to .snap file
expect(result).toMatchSnapshot({ id: expect.any(String) })  // shape match
```

Update with `vitest -u` or press `u` in watch mode.

### Inline Snapshots

```ts
expect(result).toMatchInlineSnapshot(`"expected value"`)
// Vitest auto-updates the string argument
```

### File Snapshots (Custom Path)

```ts
await expect(html).toMatchFileSnapshot('./output/basic.html')
```

Async — must `await`.

### Error Snapshots

```ts
expect(() => fn()).toThrowErrorMatchingSnapshot()
expect(() => fn()).toThrowErrorMatchingInlineSnapshot(`"error msg"`)
```

### Snapshot Best Practices

- **Commit snapshot files.** Review them in PRs like any other code.
- **Use property matchers** for volatile data (IDs, timestamps):
  `toMatchSnapshot({ createdAt: expect.any(Date) })`.
- **Prefer inline snapshots** for small values — easier to review.
- **Avoid large snapshots** — they become rubber-stamp reviews.
- Vitest sets `printBasicPrototype: false` by default (cleaner output than Jest).

## Extending Matchers

### Define Custom Matcher

```ts
// In setupFiles or test file:
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling
    return {
      pass,
      message: () => `expected ${received} to be within [${floor}, ${ceiling}]`,
    }
  },
})
```

### TypeScript Declaration

```ts
// vitest.d.ts
import 'vitest'

declare module 'vitest' {
  interface Matchers<T = any> {
    toBeWithinRange(floor: number, ceiling: number): T
  }
}
```

Add `vitest.d.ts` to `tsconfig.json` `include`. The `Matchers` interface covers
`expect().*`, `expect.*` (asymmetric), and `expect.extend` simultaneously.

### Matcher Context

Inside a matcher function, `this` provides:
- `this.isNot` — `true` if `.not` was used
- `this.equals(a, b)` — deep equality with asymmetric matcher support
- `this.utils` — formatting utilities
- `this.currentTestName` — full test name

Return `{ actual, expected }` alongside `pass` and `message` to get automatic
diff output on failure.

## `expect.unreachable`

Marks a line that should never execute:

```ts
try {
  await build(dir)
  expect.unreachable('should have thrown')
} catch (err) {
  expect(err).toBeInstanceOf(Error)
}
```
