# Vitest Mocking

Functions, modules, timers, environment variables, and globals.

## Mock Functions

### `vi.fn()` — Standalone Mock

Creates a trackable function. Optionally accepts an implementation:

```ts
const fn = vi.fn()                      // returns undefined
const fn = vi.fn((x: number) => x + 1)  // with implementation
```

### `vi.spyOn()` — Spy on Existing Method

Wraps an existing method while preserving the original. Returns a mock:

```ts
const spy = vi.spyOn(console, 'log')
// or spy on getter/setter:
const spy = vi.spyOn(obj, 'prop', 'get')
```

### Mock Methods (shared by `vi.fn` and `vi.spyOn`)

| Method | Effect |
|--------|--------|
| `.mockReturnValue(val)` | Always return `val` |
| `.mockReturnValueOnce(val)` | Return `val` on next call only |
| `.mockImplementation(fn)` | Replace implementation |
| `.mockImplementationOnce(fn)` | Replace for next call only |
| `.mockResolvedValue(val)` | Return `Promise.resolve(val)` |
| `.mockRejectedValue(err)` | Return `Promise.reject(err)` |
| `.mockClear()` | Clear call history, keep implementation |
| `.mockReset()` | Clear history + reset to original implementation |
| `.mockRestore()` | Reset + restore original object descriptor (spyOn only) |

### Mock State

```ts
fn.mock.calls        // array of argument arrays
fn.mock.results       // array of { type: 'return'|'throw', value }
fn.mock.lastCall      // arguments of last call
fn.mock.instances     // array of `this` contexts when called with `new`
```

### Cleanup Strategy

Set in config (recommended) or call manually:

```ts
// Config approach (preferred):
test: { restoreMocks: true }

// Manual approach:
afterEach(() => { vi.restoreAllMocks() })
```

| Config Option | Equivalent | Effect |
|---------------|------------|--------|
| `clearMocks` | `vi.clearAllMocks()` | Clear history only |
| `mockReset` | `vi.resetAllMocks()` | Clear history + reset impl |
| `restoreMocks` | `vi.restoreAllMocks()` | Above + restore spied originals |

## Module Mocking

### `vi.mock()` — Replace an Entire Module

**Hoisted to the top of the file.** Always runs before imports, regardless of where
you write it:

```ts
import { fetchUser } from './api'

// This executes BEFORE the import above
vi.mock('./api', () => ({
  fetchUser: vi.fn(),
}))
```

#### With `importOriginal` — Partial Mock

```ts
vi.mock(import('./api'), async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    fetchUser: vi.fn(),  // override only this export
  }
})
```

#### Type-safe module promise syntax

Use `import()` instead of a string for better IDE support and type inference:

```ts
vi.mock(import('./api'), async (importOriginal) => {
  const mod = await importOriginal()  // type is inferred
  return { ...mod, fetchUser: vi.fn() }
})
```

#### Auto-mocking

Call `vi.mock` without a factory to auto-mock all exports:

```ts
vi.mock('./api')  // all methods return undefined, arrays are empty
```

#### Spy mode — Track Without Replacing

```ts
vi.mock('./api', { spy: true })
// All exports keep original implementations but are wrapped in vi.fn()
```

### `vi.doMock()` — Non-Hoisted Mock

Not hoisted — runs at its position. Only affects **subsequent dynamic imports**:

```ts
vi.doMock('./config', () => ({ env: 'test' }))
const { env } = await import('./config')  // mocked
```

### `vi.hoisted()` — Define Variables Before Imports

Moves code to the top of the file, before `vi.mock`. Use to define mock references:

```ts
const mocks = vi.hoisted(() => ({
  fetchUser: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchUser: mocks.fetchUser,
}))

// Now you can configure the mock before tests:
mocks.fetchUser.mockResolvedValue({ name: 'Alice' })
```

### Default Export Caveat

ESM requires explicit `default` key:

```ts
vi.mock('./mod', () => ({
  default: { myMethod: vi.fn() },  // required for default export
  namedExport: vi.fn(),
}))
```

### `__mocks__` Directory

If `__mocks__/module.js` exists alongside the module (or at project root for
node_modules), `vi.mock('./module')` without a factory uses it automatically.

### Module Mock Pitfall: Internal Calls

```ts
// foobar.ts
export function foo() { return 'foo' }
export function foobar() { return `${foo()}bar` }
```

Mocking `foo` externally does NOT affect `foobar` because `foobar` references
`foo` directly within the same module. This is by design. Solutions:
- Refactor into separate modules
- Use dependency injection
- Accept that internal calls are not mockable

## `vi.spyOn` on Module Exports

Import as namespace and spy on individual exports:

```ts
import * as api from './api'

const spy = vi.spyOn(api, 'fetchUser').mockResolvedValue({ name: 'Bob' })
```

This does NOT work in Browser Mode (native ESM is sealed). Use
`vi.mock('./api', { spy: true })` instead.

## Fake Timers

### Setup and Teardown

```ts
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })
```

### Controlling Time

```ts
vi.advanceTimersByTime(1000)       // advance by 1s
vi.advanceTimersToNextTimer()      // run next scheduled timer
vi.runAllTimers()                  // run all pending timers
vi.runOnlyPendingTimers()          // run currently pending, not new ones

// For async timers (setTimeout with promises):
await vi.advanceTimersByTimeAsync(1000)
await vi.runAllTimersAsync()
```

### Mock System Time

```ts
vi.useFakeTimers()
vi.setSystemTime(new Date(2024, 0, 1))
expect(new Date().getFullYear()).toBe(2024)
vi.useRealTimers()
```

`vi.setSystemTime` works even without `vi.useFakeTimers()` — it will only mock
`Date.*` calls in that case.

### Config Defaults

```ts
test: {
  fakeTimers: {
    toFake: ['setTimeout', 'setInterval', 'Date', ...],  // default: all except nextTick
    loopLimit: 10_000,  // max timers in runAllTimers
  },
}
```

`nextTick` is not faked by default. Enable explicitly if needed:
`vi.useFakeTimers({ toFake: ['nextTick'] })`.

## Environment Variables

```ts
vi.stubEnv('NODE_ENV', 'production')  // stub process.env + import.meta.env
vi.unstubAllEnvs()                     // restore all

// Or set unstubEnvs: true in config for automatic cleanup
```

## Global Variables

```ts
vi.stubGlobal('__VERSION__', '1.0.0')
vi.unstubAllGlobals()

// Or set unstubGlobals: true in config
```

## `vi.mocked()` — Type Helper

Narrows TypeScript types to mock types. Does not change runtime behavior:

```ts
import { fetchUser } from './api'
vi.mock('./api')

vi.mocked(fetchUser).mockResolvedValue({ name: 'Alice' })
// With deep mocking:
vi.mocked(obj, { deep: true })
```

## `vi.waitFor()` and `vi.waitUntil()`

Retry a callback until it succeeds or times out:

```ts
await vi.waitFor(() => {
  if (!server.isReady) throw new Error('not ready')
}, { timeout: 5000, interval: 50 })

// waitUntil — fails immediately on throw, retries on falsy
const el = await vi.waitUntil(
  () => document.querySelector('.element'),
  { timeout: 500 }
)
```
