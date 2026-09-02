# Matchers

The parts of `expect` that a Jest-shaped habit does not reach for: Vitest-only matchers, the asymmetric set, the
retrying and non-fatal forms, and custom matcher registration.

## Vitest-only value matchers

- **`toBeOneOf([a, b, c])`** — passes when the value matches any member. Also exists as the asymmetric
  `expect.toBeOneOf([...])`, which is the readable way to say "string or undefined" inside a `toEqual`. Passing a `Set`
  is experimental.
- **`toBeNullable()`** — `null` or `undefined`. Narrower than `toBeFalsy`, wider than `toBeNull`.
- **`toSatisfy(fn)`** — passes when the predicate returns truthy. The escape hatch before writing a custom matcher.
- **`expect.assert(condition, message?)`** (Vitest 4) — Chai's `assert` re-exported onto `expect`, including
  `assert.isDefined` and `assert.exists`. It narrows the type for the rest of the test; the `expect.to*` chain does not.
- **`expect.unreachable(message?)`** — throws where control flow should not arrive.
- **`expect.closeTo(value, precision?)`** — the asymmetric form of `toBeCloseTo`, usable inside `toEqual`.

`toThrowError` is a deprecated alias of `toThrow`.

## Asymmetric matchers

Usable inside any equality matcher: `toEqual`, `toStrictEqual`, `toMatchObject`, `toContainEqual`, `toThrow`,
`toHaveBeenCalledWith`, `toHaveReturnedWith`, `toHaveResolvedWith`. Every one negates through `expect.not.*`.

- `expect.anything()` — anything but `null` or `undefined`
- `expect.any(Constructor)`
- `expect.arrayContaining([...])`, `expect.objectContaining({...})`, `expect.stringContaining('...')`,
  `expect.stringMatching(/re/)`
- `expect.closeTo(n, precision)`
- **`expect.schemaMatching(schema)`** (Vitest 4) — validates against any
  [Standard Schema v1](https://standardschema.dev/) object, so Zod, Valibot and ArkType schemas work as matchers
  directly

```js
expect(user).toEqual({
  id: expect.any(String),
  email: expect.schemaMatching(z.string().email()),
})
```

Asymmetric matchers are what makes a volatile field assertable without dropping the whole assertion.

## `expect.poll`

Retries the **assertion**, not the value, until it passes or the timeout expires.

```js
await expect.poll(() => document.querySelector('.item'), { timeout: 2000, interval: 50 }).toBeTruthy()
```

Every `expect.poll` assertion is asynchronous and must be awaited; since Vitest 3 an unawaited one fails with a warning.
Three matcher families do not work with it, each for its own reason:

- **snapshot matchers** — they always succeed, so polling never terminates on a real condition
- **`.resolves` / `.rejects`** — `poll` already awaits an asynchronous callback
- **`toThrow` and its aliases** — the condition is resolved before the matcher sees it

For a flaky value that must then be snapshotted, settle it first with `vi.waitFor(() => getValue())` and assert on the
result.

## `expect.soft`

Records the failure and continues, reporting every soft failure when the test ends. A hard `expect` failure still
terminates the test immediately, printing the soft failures collected so far. Only usable inside a `test` body.

Reach for it where several independent properties of one result are being checked and the first mismatch should not hide
the rest.

## Assertion counting

`expect.assertions(n)` requires exactly `n` assertions to have run; `expect.hasAssertions()` requires at least one. Both
exist for the case where the assertion sits inside a callback that might never fire. Inside `concurrent` tests, both
need the context-bound `expect`.

## Spy matchers

Beyond the Jest set (`toHaveBeenCalled`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`,
`toHaveBeenNthCalledWith`, `toHaveReturned*`), Vitest adds:

- **`toHaveBeenCalledBefore(other)` / `toHaveBeenCalledAfter(other)`** — relative ordering between two spies
- **`toHaveBeenCalledExactlyOnceWith(...args)`** — one call, those arguments; replaces the `toHaveBeenCalledTimes(1)`
  plus `toHaveBeenCalledWith(...)` pair
- **`toHaveResolved`, `toHaveResolvedTimes`, `toHaveResolvedWith`, `toHaveLastResolvedWith`, `toHaveNthResolvedWith`** —
  assert on what an async mock settled to, not what it returned

Vitest 4.1 added sinon-chai-shaped property assertions for migrating suites: `called`, `callCount(n)`, `calledWith`,
`calledOnce`, `calledOnceWith`, `calledTwice`, `calledThrice`, `returned`, `returnedWith`, `returnedTimes`,
`calledBefore`, `calledAfter`, alongside the pre-existing `lastCalledWith`, `nthCalledWith`, `lastReturnedWith` and
`nthReturnedWith`.

```js
expect(spy).to.have.been.calledOnceWith('arg')
```

## Async assertions

`.resolves` and `.rejects` unwrap the promise, and every matcher after them returns a promise.

**Vitest 4 fails a test whose `.resolves` or `.rejects` assertion was not awaited.** Vitest 3 only warned. An unawaited
async assertion passes unconditionally, which is why the behavior was tightened.

`toThrow` needs the call wrapped in a function — `expect(() => fn()).toThrow()`. The wrapper is unnecessary after
`.rejects`, which unwraps correctly on its own.

## Custom matchers

`expect.extend` registers a matcher for the whole run when called from a setup file.

```ts
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const { isNot } = this
    return {
      // never invert pass yourself — Vitest inverts it for `.not`
      pass: received >= floor && received <= ceiling,
      message: () => `${received} is${isNot ? ' not' : ''} within ${floor}–${ceiling}`,
      actual: received,
      expected: `${floor}–${ceiling}`,
    }
  },
})
```

`message` is called for both outcomes and phrases itself from `this.isNot`. **Never flip `pass` based on `isNot`** —
Vitest already does, and doing it again makes `.not` a no-op. Returning `actual` and `expected` gives the reporter a
diff for free.

TypeScript needs the interface augmented; without it the matcher exists at runtime and not at compile time. The
`import 'vitest'` line is load-bearing — it makes the file a module, and the declaration is ignored without it.

```ts
// vitest.d.ts
import 'vitest'
declare module 'vitest' {
  interface Matchers<T = any> {
    toBeWithinRange: (floor: number, ceiling: number) => T
  }
}
```

`this` carries `isNot`, `promise`, `equals`, `utils`, `currentTestName`, `testPath`, `environment` and `soft`. Compare
with `this.equals` rather than a hand-rolled deep comparison, so asymmetric matchers keep working inside the custom one.
An async matcher must be awaited at the call site: `await expect(v).toBeAsyncThing()`.

## Chai

Vitest ships Chai, so `expect(v).to.equal(2)`, `expect(v).to.be.true` and `expect(arr).to.have.lengthOf(3)` all work
alongside the Jest-style API. `chaiConfig` tunes Chai's own settings. Pick one style per project rather than mixing them
within a file.
