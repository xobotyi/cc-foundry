# Mocking

Depth on the mocking surface: how hoisting is implemented, what automocking produces, how the reset family differs, and
the environment-specific rules.

## What hoisting actually does

Vitest does not evaluate `vi.mock` where it is written. A plugin scans each test file for `vi.mock` and rewrites it:
every static import becomes a dynamic one, and the `vi.mock` call moves above them.

```js
// written
import { answer } from './answer.js'
vi.mock(import('./answer.js'))
console.log(answer())

// executed
vi.mock('./answer.js')
const __vitest_module_0__ = await __handle_mock__(() => import('./answer.js'))
console.log(__vitest_module_0__.answer())
```

Three consequences follow from the rewrite, and each is a distinct failure:

- **The factory closes over nothing.** It runs before every module-level binding in the file exists. A variable
  referenced there throws `Cannot access '__vi_import_0__' before initialization`.
- **`vi` must be imported from `vitest` in the same file.** The scan is static. A `vi` re-exported through a project
  helper module is not recognized, and the call is left where it was written. Enabling `globals` also satisfies the
  scan.
- **The rewrite is per file.** `vi.mock` inside a setup file does not affect a test file's imports, because the setup
  file's own imports are already cached by the time the test file runs. Call `vi.resetModules()` inside `vi.hoisted` to
  clear the caches first.

`vi.hoisted(factory)` runs its callback in the hoisted region and returns the value, which is the supported way to give
a factory something to close over.

```js
const mocks = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('./mailer.js', () => ({ send: mocks.send }))
```

Imports are unavailable inside `vi.hoisted` for the same reason. Reach a module from there with a dynamic `import()`, or
move the side effect into the imported module.

## The automocking algorithm

`vi.mock(path)` with no factory and no `__mocks__` file imports the original module and replaces it recursively:

- arrays become empty
- primitives stay untouched
- getters return `undefined`
- methods return `undefined`
- objects are deeply cloned
- class instances and their prototypes are cloned

`vi.mock(path, { spy: true })` produces the same shape but keeps every original implementation, so calls run for real
and are still tracked. This is the form to reach for when the assertion is "was it called correctly", not "what does it
return".

Automocked classes share state between instance and prototype: each instance's method is its own mock with its own call
history, and `Class.prototype.method` accumulates every instance's calls. Setting an implementation on the prototype
reaches instances that have none of their own. `.mockReset()` on an instance method does not break that inheritance.

## `__mocks__` directories

`vi.mock('axios')` with no factory looks for `__mocks__/axios.js` at the project root; `vi.mock('../increment.js')`
looks for `src/__mocks__/increment.js` beside the source. `deps.moduleDirectories` moves where dependency lookups
search.

The file is never loaded unless `vi.mock` is called for it. To get the always-on behavior, call `vi.mock` for each
module inside a setup file.

## The reset family

Four operations with four distinct effects. Choosing the wrong one produces either a leaked implementation or a spy that
cannot be reconfigured.

- **`mockClear()`** — empties `mock.calls`, `mock.results`, `mock.instances`. Implementation untouched.
- **`mockReset()`** — clears history and resets the implementation. `vi.fn(impl)` returns to `impl`; a bare `vi.fn()`
  becomes a function returning `undefined`. Also drops every queued `*Once` implementation. The object stays spied.
- **`mockRestore()`** — does `mockReset()` and restores the original property descriptor of a `vi.spyOn` target. On a
  `vi.fn()` mock it is identical to `mockReset()`.
- **`vi.restoreAllMocks()`** — restores `vi.spyOn` spies only. Unlike `mockRestore`, it does not clear history and does
  not reset implementations. Automocks are unaffected in Vitest 4.

The config switches `clearMocks`, `mockReset`, and `restoreMocks` each call the matching `vi.*AllMocks` function
**before** every test, and all three default to `false`. All three are hazardous with `concurrent` tests: one test
finishing resets mocks that overlapping tests are still using.

After `restoreMocks` runs, the original descriptor is back, so a retained spy reference no longer intercepts:

```js
const spy = vi.spyOn(cart, 'getApples').mockReturnValue(10)
cart.getApples() // 10
vi.restoreAllMocks()
cart.getApples() // 42
spy.mockReturnValue(10)
cart.getApples() // still 42 — the spy is detached
```

## Constructors and classes

Vitest 4 constructs the instance when a mock is called with `new`, instead of calling `mock.apply`. A mock
implementation for a class therefore has to be written with `function` or `class`; an arrow function raises
`<anonymous> is not a constructor` at call time.

```js
vi.spyOn(cart, 'Apples').mockImplementation(function () {
  this.getApples = () => 0
})

vi.spyOn(cart, 'Apples').mockImplementation(
  class MockApples {
    getApples() {
      return 0
    }
  },
)
```

## Mock naming and call order

Vitest 4 changed two observable defaults. `vi.fn().getMockName()` returns `vi.fn()` rather than `spy`, so snapshots
containing mocks print `[MockFunction]` instead of `[MockFunction spy]`; spies from `vi.spyOn` keep the original method
name. `mock.invocationCallOrder` starts at `1`, matching Jest, instead of `0`.

`mock.settledResults` is populated at invocation with an `'incomplete'` entry and rewritten when the promise settles.

## Virtual modules

A module that the code imports but the file system does not hold — an editor API, a platform global — fails
transformation before `vi.mock` can run. Resolve it first, then mock it.

```ts
// vitest.config.ts — redirect to a real file
export default defineConfig({
  test: { alias: { vscode: resolve(import.meta.dirname, './mock/vscode.js') } },
})
```

Or return the id unchanged from a plugin's `resolveId` hook, which marks it resolved without a file behind it, and
supply every export from the `vi.mock` factory.

## Environment differences

The mechanism differs by where tests run, and each mechanism has its own limit.

- **Node, jsdom, happy-dom** — Vite's module runner evaluates modules, so Vitest can substitute a mocked module and
  `vi.spyOn` works on an imported namespace object. This bends the ESM immutability rule deliberately.
- **`experimental.viteModuleRunner: false`** (Vitest 4.1) — native `import` with a Node loader hook (Node 22.15 and
  later). `vi.mock` and `vi.hoisted` still work; `vi.spyOn` on an ES module namespace does not, because the native
  loader enforces the seal. A `mock` query appears in stack traces.
- **Browser mode** — native ESM. The namespace object is sealed, so `vi.spyOn(module, 'name')` throws. Use
  `vi.mock('./module.js', { spy: true })` and reach the export through `vi.mocked`.

Mocking an exported `let` is impossible everywhere; export a function that mutates the internal value.

## `vi.doMock`

`vi.doMock` is not hoisted, so its factory closes over file-scope variables normally. It affects the next dynamic
`import()` of the module and nothing already imported — including static imports written below it, which ESM hoists
above it regardless.

```js
beforeEach(() => {
  vi.doMock('./increment.js', () => ({ increment: () => ++counter }))
})

test('uses the mock', async () => {
  const { increment } = await import('./increment.js')
})
```

It returns a `Disposable`: `using _ = vi.doMock('my-module')` calls `vi.doUnmock` when the block exits, where the
runtime supports explicit resource management. `vi.spyOn` returns one too.

## Fake timers

`vi.useFakeTimers()` replaces `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `setImmediate`,
`clearImmediate` and `Date`, using `@sinonjs/fake-timers`.

- `process.nextTick` and `queueMicrotask` are **not** faked by default. Add them through
  `vi.useFakeTimers({ toFake: ['nextTick', 'queueMicrotask'] })`.
- Faking `nextTick` hangs under `pool: 'forks'`, because `node:child_process` uses it internally. It works under
  `pool: 'threads'`.
- `vi.useRealTimers()` discards every timer scheduled while timers were fake.
- `vi.setSystemTime(date)` moves the clock without advancing timers.

`vi.setTimerTickMode` (Vitest 4.1) chooses how time moves: `'manual'` (the default — only `vi.advanceTimers*` moves it),
`'nextTimerAsync'` (jumps to the next timer after each macrotask), or `'interval'` with a millisecond step.

Advance deliberately rather than by a large number: `vi.advanceTimersToNextTimer()` fires exactly one,
`vi.runAllTimers()` drains the queue including timers scheduled during the drain, and `vi.runOnlyPendingTimers()` fires
what is already queued without following the chain. An endless interval makes `vi.runAllTimers()` throw after 10 000
iterations, tunable with `fakeTimers.loopLimit`. The `*Async` variants flush the microtask queue between timers, which
is what asynchronous code under test needs.

## Network and globals

Requests are not a Vitest concern — intercept them below the code under test with Mock Service Worker, configured in a
setup file with `onUnhandledRequest: 'error'` so an unrouted request fails loudly rather than reaching the network.

`vi.stubGlobal(name, value)` writes onto `globalThis`. Stubs persist across tests unless `unstubGlobals: true` is set or
`vi.unstubAllGlobals()` is called. `vi.stubEnv` behaves the same way against `unstubEnvs`.
