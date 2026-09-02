# Fixtures and Lifecycle

Depth on the test context, `test.extend`, fixture scoping, and the exact order hooks run in.

## Built-in test context

The first argument to every test callback is the context. Destructure it — the fixture system reads the destructuring
pattern to decide what to initialize, so `(context) => context.db` leaves `db` uninitialized.

- **`task`** — read-only metadata about the running test.
- **`expect`** — an `expect` bound to this test. Required for snapshots and `expect.assertions` inside `concurrent`
  tests, because the global `expect` cannot tell overlapping tests apart.
- **`skip(note?)` / `skip(condition, note?)`** — abandons the rest of the test and marks it skipped. The conditional
  form arrived in Vitest 3.1.
- **`annotate(message, type?, attachment?)`** (Vitest 3.2) — attaches a note that reporters display.
- **`signal`** (Vitest 3.2) — an `AbortSignal` aborted on timeout, on Ctrl+C, on `vitest.cancelCurrentRun()`, and when
  another test fails while `bail` is set. Pass it to `fetch` so a timed-out test stops its own work.
- **`onTestFinished` / `onTestFailed`** — the hooks of the same name, bound to this test.

## `test.extend`: two syntaxes

The builder pattern (Vitest 4.1) infers each fixture's type from the factory's return value. The Playwright-compatible
object syntax needs the types declared as a generic parameter.

```ts
// builder — cleanup registered, value returned
const test = baseTest
  .extend('config', { port: 3000, host: 'localhost' })
  .extend('server', async ({ config }, { onCleanup }) => {
    const server = await listen(config)
    onCleanup(() => server.close())
    return server
  })

// object — cleanup after use()
const test = baseTest.extend<{ server: Server }>({
  server: async ({ config }, use) => {
    const server = await listen(config)
    await use(server)
    await server.close()
  },
})
```

Both compose: `.extend<{...}>({...})` may be followed by builder `.extend(name, fn)` calls on the same chain, and an
already-extended `test` may be extended again in another file.

`onCleanup` may be called **once per fixture**; a second call throws. Two resources means two fixtures, which is the
shape that makes the dependency order explicit anyway.

## Fixture options

The second argument to the builder form takes the options; the object syntax uses a `[factory, options]` tuple.

- **`scope: 'test'`** — the default. A fresh value per test.
- **`scope: 'file'`** — one value per test file.
- **`scope: 'worker'`** — one value per worker. Identical to `file` while isolation is on, because each file gets its
  own worker; with `isolate: false` it is shared across every file that lands in the same worker. Under `vmThreads` and
  `vmForks` it always behaves as `file`, since each file has its own VM context.
- **`auto: true`** — initialized for every test whether or not it is destructured. The escape hatch for a fixture whose
  value is a side effect.
- **`injected: true`** — the default value may be replaced per project through `provide` in the project config.

## Scope access rules

A fixture reaches its own scope and every longer-lived one, never a shorter-lived one.

- **`worker`** — worker fixtures
- **`file`** — worker and file fixtures
- **`test`** — worker, file and test fixtures, plus the built-in test context

A fixture with no declared scope is a `test` fixture, so it is unreachable from `worker` and `file` fixtures — declare
the scope explicitly on anything a longer-lived fixture depends on. Only `test` fixtures see `task`, `expect` and
`skip`; a `file` fixture that needs the file path reads `expect.getState().testPath`.

With the object syntax, `$worker`, `$file` and `$test` keys in the generic parameter give the builder pattern's
compile-time scope checking (Vitest 3.2).

## `test.override`

`test.override(name, value)` (Vitest 4.1) replaces a fixture for the enclosing suite and its children. Calls chain, an
object form overrides several at once, and a function form takes `onCleanup` like `extend`. Nested suites may override
again.

Two limits: a fixture cannot be introduced by `override` (use `extend`), and `scope` and `auto` cannot be changed.
Overriding a non-`test` fixture inside a `describe` throws — do it at module top level, or make the fixture `injected`
and set the value per project. Under `isolate: false`, overriding a `worker` fixture changes it for every later file in
that worker.

`test.scoped` is the deprecated predecessor of `test.override`.

## Fixture initialization

Fixtures initialize lazily, in dependency order, only for the tests that destructure them. A fixture nothing asks for
never runs its factory.

Suite-level hooks reach `file` and `worker` fixtures only, and only when called on the extended `test` object.

```ts
test.beforeAll(async ({ database }) => {}) // sees file/worker fixtures
beforeAll(async ({ database }) => {}) // database is undefined
```

Asking for a `test` fixture from `test.beforeAll` throws.

## Hook execution order

Inside one suite, per test:

1. `aroundEach` setup, outermost registration first
2. `beforeEach`, in registration order
3. the test body
4. `afterEach`, reverse registration order under the default `sequence.hooks: 'stack'`
5. `onTestFinished` callbacks, always reverse order, regardless of `sequence.hooks`
6. `onTestFailed` callbacks, only when the test failed
7. `aroundEach` teardown, innermost first

`aroundAll` wraps the whole suite, outside `beforeAll` and `afterAll`. With nested `describe` blocks, a parent's
`aroundEach` wraps the child's, and a parent's `beforeEach` runs before the child's.

`sequence.hooks` takes `'stack'` (the default: `after` hooks reversed), `'list'` (everything in registration order —
Jest's behavior), or `'parallel'` (one group at a time, bounded by `maxConcurrency`; parent-suite hooks still precede
the current suite's).

## Teardown by return value

`beforeAll` and `beforeEach` treat a returned function as teardown. This is why a concise arrow body is a hazard:

```js
beforeEach(() => setActivePinia(createTestingPinia())) // return value becomes teardown
beforeEach(() => {
  setActivePinia(createTestingPinia())
}) // correct
```

## `aroundEach` and `aroundAll`

Added in Vitest 4.1 for the case a `before`/`after` pair cannot express: the test must run _inside_ a call — a database
transaction, an `AsyncLocalStorage` run, a tracing span.

```ts
test.aroundEach(async (runTest, { db }) => {
  await db.transaction(runTest)
})
```

`runTest()` runs the `beforeEach` hooks, the test, its fixtures and the `afterEach` hooks; `runSuite()` runs everything
in the suite. Failing to call it fails the test — and for `aroundAll`, skips the whole suite. Fixtures the callback
destructures initialize before `runTest()` and tear down after the teardown half, so they are usable on both sides. The
timeout applies separately to the setup half and the teardown half, defaulting to 10 seconds from `hookTimeout`.

Prefer `beforeEach` with a returned teardown function when no wrapping call is involved — `around` hooks pay for nesting
that a pair does not need.

## Setup files and global setup

The two run in different processes and are not interchangeable.

- **`setupFiles`** — run in the worker, in the same context as the tests, **before each test file**. Register hooks,
  custom matchers, and DOM cleanup here. Multiple files run in parallel unless `sequence.setupFiles` says otherwise.
  With `isolate: false` they still re-execute per file, but their imported modules stay cached. Editing one reruns
  everything in watch mode.
- **`globalSetup`** — runs once in the main process before any worker exists, and only when at least one test is queued.
  It has a separate global scope, so tests cannot read its variables; pass values with `project.provide(key, value)` and
  read them with `inject(key)` imported from `vitest`. Keys must be strings and values structured-cloneable, because
  they cross a process boundary. Its exported `teardown`, or the function returned from `setup`, runs after the whole
  run, in reverse order across files. In watch mode it does not re-run between reruns — use `project.onTestsRerun` for
  that.

## Concurrency

`test.concurrent` groups adjacent concurrent tests and runs them with `Promise.all`, bounded by `maxConcurrency`. No
extra worker is created, so it buys nothing for synchronous work — only for tests that wait.

`beforeAll` and `afterAll` still run once for the group; `beforeEach` and `afterEach` run per test and may overlap.
Inside a concurrent test, use the context `expect`, and avoid `clearMocks`, `mockReset` and `restoreMocks`, all of which
reach across overlapping tests.

`sequence.concurrent: true` makes concurrency the project-wide default.
