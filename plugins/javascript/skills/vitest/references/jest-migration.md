# Migrating from Jest

A translation surface for a reader arriving from Jest or from Mocha, Chai and Sinon. The API is deliberately
Jest-shaped; the entries below are the places where a mechanical rename is not enough.

## The mechanical part

`jest.*` becomes `vi.*`, imported from `vitest`. `jest.requireActual` becomes `await vi.importActual`.
`jest.setTimeout(5000)` becomes `vi.setConfig({ testTimeout: 5000 })`.

There is no `jest` type namespace. Import the types: `import type { Mock } from 'vitest'`, and
`let fn: Mock<(name: string) => number>`.

## Globals are off

`globals` defaults to `false`, so `describe`, `it` and `expect` are imports. Either add the imports or set
`globals: true` in the config plus `"types": ["vitest/globals"]` in `tsconfig.json`.

Keeping globals off has one consequence worth planning for: libraries that register cleanup through the ambient hooks —
Testing Library's auto DOM cleanup among them — do nothing without them. Register the cleanup explicitly in a setup file
instead.

## Module mocks return an object

A Jest factory returns the default export. A Vitest factory returns the whole module namespace, with `default` as an
explicit key.

```js
jest.mock('./some-path', () => 'hello')

vi.mock('./some-path', () => ({ default: 'hello' }))
```

An export the factory omits throws a clear error when the code reaches it, rather than being `undefined`.

## Auto-mocking is opt-in

A `__mocks__` file is never loaded unless `vi.mock()` names the module. Jest's always-on behavior is reproduced by
calling `vi.mock` for each module inside a setup file.

A module mock does not reach a third-party library that imports the same module, because that library is externalized.
Add it to `server.deps.inline` to bring it into the transformed graph.

## `mockReset` differs

Jest's `mockReset` replaces the implementation with a function returning `undefined`. **Vitest's `mockReset` restores
the original implementation** — `vi.fn(impl).mockReset()` goes back to `impl`, and a spy goes back to spying on the real
method.

The mock state object is also persistent. Jest recreates `mock` on `mockClear`, so it must be re-read; Vitest keeps the
same reference, so `const state = mock.mock` stays valid across a clear.

## Hooks may return a teardown function

`beforeAll` and `beforeEach` treat a returned function as teardown. A concise arrow body that happens to return
something is therefore reinterpreted:

```js
beforeEach(() => setActivePinia(createTestingPinia())) // return value read as teardown
beforeEach(() => {
  setActivePinia(createTestingPinia())
}) // correct
```

Hook ordering also differs. Jest runs hooks as a list; Vitest defaults to `sequence.hooks: 'stack'`, which reverses the
`after` hooks. `sequence: { hooks: 'list' }` restores Jest's order.

## No done callback

Vitest does not support the callback style. Rewrite to `async`/`await`, or wrap the callback API in a promise the test
awaits.

## Unawaited async assertions fail

Vitest 4 fails a test whose `.resolves` or `.rejects` assertion was never awaited. Under Jest such an assertion passes
silently, so a migrated suite can surface failures that were always there.

## Names, environment variables and timers

- Test names join with `>`, not a space. `expect.getState().currentTestName` returns `suite > test`.
- `JEST_WORKER_ID` becomes `VITEST_POOL_ID`, always at most `maxWorkers`. `VITEST_WORKER_ID` is a distinct value: a
  unique per-worker counter unaffected by `maxWorkers`.
- `NODE_ENV` is set to `test` when unset, as in Jest.
- Jest's legacy timers are unsupported; the modern `@sinonjs/fake-timers` behavior is the only one.
- `jest.replaceProperty` has no direct equivalent — `vi.stubEnv` or `vi.spyOn` covers the cases.

## Snapshots

Snapshot output differs from Jest in four ways that all show up as diff noise on the first run. The header comment, the
`printBasicPrototype: false` default, the `>` hint separator, and the full-error rendering of
`toThrowErrorMatchingSnapshot`. Vue projects that used a jest-cli preset need `jest-serializer-vue` in
`snapshotSerializers`.

## Custom snapshot matchers

Composables come from `Snapshots` exported by `vitest`, not from `jest-snapshot` (experimental, Vitest 4.1.3).

```ts
import { Snapshots } from 'vitest'
const { toMatchSnapshot } = Snapshots
```

## From Mocha, Chai and Sinon

The suite structure is unchanged: `describe`, `it`, and hooks named `beforeAll`/`afterAll` instead of Mocha's
`before`/`after`.

Chai assertions work as written, because Vitest ships Chai. Sinon's spy assertions work too — Vitest supports the
sinon-chai property style (`expect(spy).to.have.been.calledOnceWith('a')`) alongside the Jest style, so the assertions
need no rewrite.

The creation calls do change:

- `sinon.spy()` → `vi.fn()`
- `sinon.stub(obj, 'method')` → `vi.spyOn(obj, 'method')`
- `sinon.mock(obj)` → no equivalent; use spies
- `stub.returns(v)` → `mockReturnValue(v)`; `onFirstCall().returns(v)` → `mockReturnValueOnce(v)`
- `stub.callsFake(fn)` → `mockImplementation(fn)`
- `spy.restore()` → `mockRestore()`; `sinon.restore()` → `vi.restoreAllMocks()`
- `sinon.useFakeTimers()` / `clock.tick(n)` → `vi.useFakeTimers()` / `vi.advanceTimersByTime(n)`

Both use `@sinonjs/fake-timers` underneath, so timer semantics carry over. The behavioral difference to plan for is
parallelism: Mocha runs files sequentially, Vitest runs them in parallel workers by default.
