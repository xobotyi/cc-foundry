# Jest to Vitest Migration

Key differences, API mapping, and common gotchas.

## Quick API Translation

| Jest | Vitest | Notes |
|------|--------|-------|
| `jest.fn()` | `vi.fn()` | Same API surface |
| `jest.spyOn(obj, 'method')` | `vi.spyOn(obj, 'method')` | Same API |
| `jest.mock('./mod')` | `vi.mock('./mod')` | Factory return differs (see below) |
| `jest.requireActual('./mod')` | `await vi.importActual('./mod')` | Always async |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` | Same `@sinonjs/fake-timers` internally |
| `jest.setTimeout(n)` | `vi.setConfig({ testTimeout: n })` | Different API |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` | Same behavior |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` | See `mockReset` difference below |
| `jest.restoreAllMocks()` | `vi.restoreAllMocks()` | Same concept |

### Type Changes

```ts
// Jest
let fn: jest.Mock<(name: string) => number>

// Vitest
import type { Mock } from 'vitest'
let fn: Mock<(name: string) => number>
```

## Key Differences

### 1. Globals Are Not Default

Jest provides `describe`, `it`, `expect` globally. Vitest requires explicit imports:

```ts
import { describe, it, expect, vi } from 'vitest'
```

Or enable `globals: true` in config and add `"types": ["vitest/globals"]` to
`tsconfig.json`.

### 2. Module Mock Factory Returns an Object

In Jest, the factory return value IS the default export. In Vitest, you must return
an object with explicit exports:

```ts
// Jest
jest.mock('./mod', () => 'hello')

// Vitest
vi.mock('./mod', () => ({
  default: 'hello',
}))
```

### 3. `mockReset` Behavior Differs

- **Jest:** `mockReset` replaces implementation with empty function returning `undefined`.
- **Vitest:** `mockReset` restores the original implementation passed to `vi.fn(impl)`.

```ts
const fn = vi.fn(() => 42)
fn.mockReset()
fn()  // returns 42 in Vitest, undefined in Jest
```

### 4. `mock.mock` State Is Persistent

Jest recreates mock state on `.mockClear()`. Vitest holds a persistent reference:

```ts
const mock = vi.fn()
const state = mock.mock
mock.mockClear()
state === mock.mock  // true in Vitest, false in Jest
```

### 5. Auto-Mocking Is Not Automatic

Jest auto-mocks `__mocks__` directories. Vitest requires explicit `vi.mock()` calls.
To replicate Jest behavior, call `vi.mock` in `setupFiles`:

```ts
// test/setup.ts
vi.mock('axios')  // uses __mocks__/axios.js if it exists
```

### 6. Hook Return Values

`beforeAll`/`beforeEach` return values are treated as teardown functions in Vitest:

```ts
// WRONG — accidentally returns a value that Vitest treats as teardown
beforeEach(() => setActivePinia(createTestingPinia()))

// CORRECT — explicit void
beforeEach(() => { setActivePinia(createTestingPinia()) })
```

### 7. Hook Execution Order

Jest runs hooks sequentially (list order). Vitest uses **stack order** by default
(reverse for teardown). To match Jest behavior:

```ts
test: {
  sequence: { hooks: 'list' },
}
```

### 8. Test Name Separator

Jest: `"describe title test title"` (space)
Vitest: `"describe title > test title"` (chevron)

### 9. Snapshot Differences

- Header: `// Vitest Snapshot v1` vs `// Jest Snapshot v1`
- `printBasicPrototype` defaults to `false` (cleaner output)
- `toThrowErrorMatchingSnapshot` prints `[Error: msg]` not just `"msg"`

### 10. Environment

Jest defaults to `jsdom`. Vitest defaults to `node`. Set explicitly:

```ts
test: { environment: 'jsdom' }
```

## Migration Checklist

1. Replace `jest.*` calls with `vi.*` equivalents
2. Replace `jest.requireActual` with `await vi.importActual`
3. Update mock factories to return objects with explicit exports
4. Add explicit imports or enable `globals: true`
5. Wrap `beforeEach` return values in braces if not void
6. Install `vitest` and remove `jest`, `ts-jest`, `babel-jest`
7. Move `jest.config.js` options to `vitest.config.ts`
8. Update `tsconfig.json` types if using globals
9. Update snapshot files (`vitest -u`)
10. Set `environment: 'jsdom'` if tests need DOM APIs

## Mocha + Chai + Sinon Migration

### Test Structure

Mocha's `before`/`after` map to Vitest's `beforeAll`/`afterAll`:

```ts
// Mocha                         // Vitest
before(() => {})                 beforeAll(() => {})
after(() => {})                  afterAll(() => {})
beforeEach(() => {})             beforeEach(() => {})  // same
afterEach(() => {})              afterEach(() => {})    // same
```

### Chai Assertions

Work directly — Vitest includes Chai:

```ts
import { expect } from 'vitest'
expect(value).to.equal(42)         // Chai-style works
expect(value).toBe(42)             // Jest-style also works
```

### Sinon Replacements

```ts
// Sinon                           // Vitest
sinon.spy()                        vi.fn()
sinon.spy(obj, 'method')           vi.spyOn(obj, 'method')
stub.returns(42)                   mock.mockReturnValue(42)
stub.callsFake(fn)                 mock.mockImplementation(fn)
sinon.useFakeTimers()              vi.useFakeTimers()
clock.tick(1000)                   vi.advanceTimersByTime(1000)
sinon.restore()                    vi.restoreAllMocks()
```

### Sinon-Chai Assertions

Vitest (4.1+) supports Chai-style spy assertions natively:

```ts
expect(spy).to.have.been.called
expect(spy).to.have.been.calledOnce
expect(spy).to.have.been.calledWith('arg')
expect(spy).to.have.been.calledBefore(otherSpy)
```

No need for `sinon-chai` plugin.
