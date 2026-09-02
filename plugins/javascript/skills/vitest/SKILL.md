---
name: vitest
description: >-
  Write and review Vitest tests: structure, assertions, fixtures and lifecycle, the mocking surface and its hoisting
  rules, snapshots, configuration and projects, pools and isolation, coverage, type tests, and migration from Jest.
when_to_use: >-
  Invoke whenever Vitest is touched at all — writing or reviewing a test, editing a vitest config, mocking a module,
  adding a fixture, running a suite, or reading a failure. Also invoke on the symptoms: a mock leaks between tests, a
  `vi.mock` factory cannot see a variable, an async assertion passes when it should not, a snapshot will not settle,
  coverage reports the wrong files, a suite is slow or flaky, or a config key from an older major is rejected. Covers
  Vitest; the test runners bundled with Node and Bun belong to the nodejs and bun skills, JavaScript semantics to
  javascript, the type system to typescript, and what is worth testing to the coding skill.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

A test earns its place by failing when the behavior breaks, and at no other time. Three biases decide most calls:

- **Mock the boundary, never the unit under test.** Every mock asserts that the real thing cannot run here. Most such
  assertions are false, and each false one buys a test that keeps passing after the code is wrong.
- **Prefer a fixture to a hook.** `test.extend` initializes on demand, tears down in its own scope, and declares its
  dependencies in the signature. A `beforeEach` runs for every test in scope whether that test needs it or not.
- **The installed major decides what may be written**, not the shape recalled from an older one.

## Version and Toolchain

Vitest 4 is the target. Read the installed version out of the lockfile before touching a config file — the configuration
surface moved in 3.2, 4.0 and 4.1, and a key from the wrong one is silently ignored or loudly rejected.

Vitest 4.1 requires Node `^20 || ^22 || >=24` and Vite `^6 || ^7 || ^8`. Vitest 4.0 shipped requiring Vite 6 and Node
20; 4.1 added Vite 8 and uses the installed `vite` rather than a bundled copy.

What changed, by version. Every removal below is rejected or ignored under Vitest 4; the 4.1 entries are additions and
need 4.1 installed.

- **3.2** — `workspace` deprecated in favor of `projects`; fixture scopes (`test`, `file`, `worker`) added; AST-aware v8
  coverage remapping added behind `coverage.experimentalAstAwareRemapping`
- **4.0** — `workspace` removed; `poolOptions.*` flattened to top level; `maxThreads`/`maxForks` became `maxWorkers`;
  `singleThread`/`singleFork` became `maxWorkers: 1, isolate: false`; `minWorkers` removed; `coverage.all` and
  `coverage.extensions` removed; `environmentMatchGlobs` and `poolMatchGlobs` removed; `deps.external`/`deps.inline`
  moved under `server.deps`; browser providers became separate packages taking a factory; the `basic` reporter and the
  pre-3.0 reporter hooks removed; the third-argument options object on `test` and `describe` removed
- **4.1** — `aroundEach` and `aroundAll` hooks; the `test.extend` builder pattern with type inference; `test.override`;
  test tags with `--tags-filter`; `--detect-async-leaks`; `vi.defineHelper`; `vi.setTimerTickMode`;
  `experimental.viteModuleRunner`

Read [`${CLAUDE_SKILL_DIR}/references/configuration.md`] when reconciling a config written against an older major — it
carries the rename inventory entry by entry, each with the major that made the change.

## Test Structure

- **Import from `vitest` explicitly.** `globals` defaults to `false`. Add ambient globals only where the project already
  sets `globals: true`, which also needs `"types": ["vitest/globals"]` in `tsconfig.json`.
- **Name a test after the behavior it pins, in a phrase that scans.** `'returns an empty array for a null input'`, not
  `'should correctly return an empty array when the provided input value is null or undefined'`. A long name is read in
  a list of forty.
- **Pass options as the second argument**: `test('name', { retry: 2 }, fn)`. The third-argument form was removed in
  Vitest 4. A bare timeout number as the last argument still works, and excludes the options object.
- **`test.for` over `test.each` when a case needs the test context.** `each` spreads an array row into positional
  parameters; `for` passes the row as one value and gives the test context as the second parameter, which is what a
  concurrent snapshot needs.
- **Never leave `.only` in a commit.** `allowOnly` defaults to `!process.env.CI`, so CI fails the run rather than
  quietly testing one case.
- **`it.fails` asserts that a test fails**, which is how a known bug is recorded without leaving the suite red.
  `test.todo` never runs, so it never tells you the bug was fixed; a `fails` test goes red the moment it starts passing.

## Assertions

- **`toEqual` ignores `undefined` properties**, so it passes on a field that should not exist. Reach for `toStrictEqual`
  where `undefined` keys, sparse array holes and class identity are part of the contract.
- **Always `await` `.resolves` and `.rejects`.** Vitest 4 fails a test whose async assertion was never awaited; Vitest 3
  only warned, because an unawaited async assertion never runs and passes unconditionally.
- **Wrap a throwing call in a function**: `expect(() => parse(bad)).toThrow(/unexpected/)`. After `.rejects` the wrapper
  is wrong — the promise is already unwrapped.
- **Assert a volatile field with an asymmetric matcher, never by deleting the assertion.** `expect.any(String)`,
  `expect.objectContaining`, `expect.arrayContaining`, `expect.stringMatching`, and `expect.schemaMatching(schema)`
  (Vitest 4) for a Standard Schema validator. All of them negate through `expect.not.*`.
- **`expect.poll(() => value, { timeout, interval })` over a hand-written retry loop.** It retries the assertion, must
  be awaited, and does not work with snapshot matchers, `.resolves`/`.rejects`, or `toThrow`.
- **`expect.soft` where several independent properties of one result are checked** and the first mismatch should not
  hide the rest.
- **`expect.assertions(n)` or `expect.hasAssertions()` whenever an assertion sits inside a callback** that might never
  fire.
- **`toHaveBeenCalledExactlyOnceWith(...)` over the `toHaveBeenCalledTimes(1)` plus `toHaveBeenCalledWith(...)` pair.**

Read [`${CLAUDE_SKILL_DIR}/references/matchers.md`] when reaching for a matcher whose exact semantics matter, or when
writing a custom matcher — it carries the Vitest-only matcher set, the spy and async matcher families, and the
`expect.extend` contract with its TypeScript declaration.

## Test Context and Fixtures

- **Destructure the context.** The fixture system reads the destructuring pattern to decide what to initialize;
  `(ctx) => ctx.db` leaves `db` uninitialized.
- **Use the context `expect` inside `concurrent` tests.** The global `expect` cannot attribute snapshots or
  `expect.assertions` to overlapping tests.
- **Build fixtures with the builder pattern** (Vitest 4.1), which infers each type from the factory's return value:
  `test.extend('db', async ({}, { onCleanup }) => { ... })`. The Playwright-style object syntax with `use()` stays
  correct and needs the types declared by hand.
- **`onCleanup` may be called once per fixture.** Two resources is two fixtures — which makes the teardown order
  explicit anyway.
- **Declare `scope` on anything a longer-lived fixture depends on.** A fixture with no scope is `test`-scoped, and a
  `file`- or `worker`-scoped fixture cannot reach it. Only `test` fixtures see `task`, `expect` and `skip`.
- **Suite-level hooks must be called on the extended `test`** — `test.beforeAll(({ db }) => ...)`. The global
  `beforeAll` receives no fixtures. Asking a suite-level hook for a `test`-scoped fixture throws.
- **`test.override` (Vitest 4.1) replaces a fixture for a suite**; it cannot introduce one and cannot change `scope` or
  `auto`. `test.scoped` is its deprecated predecessor.
- **Pass values from `globalSetup` with `provide`/`inject`, never a module-level variable.** Global setup runs in the
  main process with its own global scope; keys must be strings and values structured-cloneable.

## Lifecycle Hooks

- **Never let a hook body return a value by accident.** A function returned from `beforeAll` or `beforeEach` is run as
  teardown. Write `beforeEach(() => { setup() })`, not `beforeEach(() => setup())`.
- **`afterEach` runs in reverse registration order** under the default `sequence.hooks: 'stack'`. `'list'` gives Jest's
  order; `'parallel'` runs a group at once, bounded by `maxConcurrency`.
- **`onTestFinished` for cleanup registered inside a test** — it runs on pass and on fail, always in reverse order,
  regardless of `sequence.hooks`. `onTestFailed` for diagnostics only.
- **Reach for `aroundEach`/`aroundAll` (Vitest 4.1) only when the test must run _inside_ a call** — a database
  transaction, an `AsyncLocalStorage` run, a tracing span. The callback must call `runTest()` or `runSuite()`. A missed
  `runTest()` fails the test; a missed `runSuite()` skips every test in the suite. A `beforeEach` returning a teardown
  function covers everything else more cheaply.
- **`setupFiles` run in the worker before each test file; `globalSetup` runs once in the main process** before any
  worker exists. Expensive shared state belongs in `globalSetup`; hook and matcher registration belongs in `setupFiles`.
- **`concurrent` buys nothing for synchronous tests.** No extra worker is created, so the gain is only on tests that
  wait. Avoid `clearMocks`, `mockReset` and `restoreMocks` alongside it — each reaches across overlapping tests.

Read [`${CLAUDE_SKILL_DIR}/references/fixtures-and-lifecycle.md`] when designing shared setup, choosing a fixture scope,
or explaining an unexpected hook order — it carries the built-in context, both `extend` syntaxes, the scope access
table, and the exact nested execution order.

## Mocking

- **`vi.spyOn(obj, 'method')` before `vi.mock`.** Replacing one export is recoverable; replacing a module is a standing
  claim about every export it has, including the ones added later.
- **A `vi.mock` factory closes over nothing.** The call is hoisted above every import, so any variable it names is still
  uninitialized and the reference throws a temporal-dead-zone error —
  `Cannot access '__vi_import_0__' before initialization` when what it names is an import. Put the value in `vi.hoisted`
  and reference that.
- **`vi` must come from `vitest` in the same file, or `globals` must be on.** The hoisting pass is a static scan; a `vi`
  re-exported through a project helper is not recognized and the call stays where it was written.
- **Write the module specifier as `import('./mod.js')`, not a string.** `vi.mock(import('./mod.js'), ...)` types
  `importOriginal`, constrains the factory's return to the real module's exports, and updates when the file moves.
- **A factory returns the whole namespace, with `default` as an explicit key.** An omitted export throws when the code
  reaches it.
- **`vi.mock(path, { spy: true })` when the question is "was it called correctly".** It tracks every export while
  keeping the real implementation, and is the only way to observe module exports in browser mode.
- **`vi.mock` cannot intercept a call between two functions in one file.** `foobar()` calling `foo()` in the same module
  holds a direct reference. This is intended and will not change — split the module or inject the dependency.
- **`vi.doMock` where the mock must vary per test.** It is not hoisted, so it closes over file-scope variables, and it
  affects only the next dynamic `import()` — never a static import written below it.
- **Know which reset you mean.** `mockClear` empties history. `mockReset` also restores the original implementation —
  `vi.fn(impl)` returns to `impl`, which is the opposite of Jest. `mockRestore` also detaches a `vi.spyOn` spy.
  `vi.restoreAllMocks` detaches spies **without** clearing history or resetting implementations, and leaves automocks
  alone in Vitest 4.
- **Pick the config switch by what has to be undone.** All three (`clearMocks`, `mockReset`, `restoreMocks`) default to
  `false` and run before each test. `restoreMocks` only detaches `vi.spyOn` spies and clears nothing, so it does not
  isolate call history on its own; `clearMocks` empties history, and `mockReset` also resets implementations.
- **Mock a class implementation with `function` or `class`, never an arrow function.** Vitest 4 constructs mocks called
  with `new`; an arrow function raises `<anonymous> is not a constructor`.
- **Intercept HTTP below the code under test with Mock Service Worker**, configured in a setup file with
  `onUnhandledRequest: 'error'`. Stubbing `fetch` tests the stub.
- **A `__mocks__` file is never loaded unless `vi.mock()` names the module.** Jest's always-on behavior means calling
  `vi.mock` per module in a setup file.

Read [`${CLAUDE_SKILL_DIR}/references/mocking.md`] when a mock does not take effect, leaks between tests, or has to work
in browser mode — it carries the hoisting transform, the automocking algorithm, the reset matrix, virtual modules, and
the per-environment differences.

## Fake Timers

- **Pair `vi.useFakeTimers()` with `vi.useRealTimers()`** in `beforeEach`/`afterEach`, or configure `fakeTimers`
  globally. A leaked fake clock breaks every later file in a non-isolated worker.
- **`vi.useFakeTimers()` fakes every timer API present on the global object** except `process.nextTick` and
  `queueMicrotask` — `performance` and `requestAnimationFrame` included, not only `setTimeout` and `Date`. Measured on
  Vitest 4.1.11.
- **`toFake` replaces that default set, it does not extend it.** `toFake: ['setTimeout']` leaves `Date` real, so the
  list must name every API the test needs. Measured on Vitest 4.1.11.
- **`nextTick` cannot be faked under the default `forks` pool.** Vitest 4.1.11 refuses it outright:
  `vi.useFakeTimers({ toFake: ["nextTick"] }) is not supported in node:child_process. Use --pool=threads if mocking nextTick is required.`
  It throws for `toFake` passed to the call and for `fakeTimers.toFake` set in the config alike, and it tests for a
  child process rather than a pool name. Take the fix the message names, or leave `nextTick` off the list — the v4 docs
  describe a hung process instead, which is the outcome this guard exists to prevent.
- **Advance deliberately.** `vi.advanceTimersToNextTimer()` fires one timer; `vi.runOnlyPendingTimers()` fires what is
  queued without following the chain; `vi.runAllTimers()` drains everything and throws after 10 000 iterations on an
  endless interval.
- **Use the `*Async` variants when the code under test awaits between timers** — they flush the microtask queue in
  between.
- **`vi.setSystemTime(date)` to fix the clock** without advancing any timer.

Read [`${CLAUDE_SKILL_DIR}/references/mocking.md`] when a timer helper does not advance what it should — its fake-timer
section carries the full set of faked APIs, `fakeTimers.loopLimit`, and the `vi.setTimerTickMode` modes.

## Snapshots

- **Prefer `toMatchInlineSnapshot` for a small value.** It is reviewed in the same diff as the code that changed it.
- **Give every volatile field a property matcher**: `toMatchSnapshot({ id: expect.any(String) })`. A snapshot holding a
  timestamp trains everyone to run `-u`.
- **Never run `-u` on a red suite without reading the diff.** Updating is how a regression becomes the expected value.
- **A snapshot too large to read is a rubber stamp, not a test** — assert the handful of properties that matter instead.
- **In CI, a missing or obsolete snapshot fails the run**, not only a mismatch. An obsolete entry is one whose test was
  renamed or deleted; delete the entry in the same change.

Read [`${CLAUDE_SKILL_DIR}/references/snapshots.md`] when writing a serializer, a custom snapshot matcher, or
reconciling snapshot output that differs from Jest — it carries the four snapshot forms, the serializer contract, and
the Jest output divergences.

## Configuration

- **`vitest.config.ts` overrides `vite.config.ts` entirely.** It is not merged. Where the app config must be shared,
  either put `test` inside `vite.config.ts` with `/// <reference types="vitest/config" />`, or `mergeConfig` the two
  deliberately.
- **`plugins` and `define` are Vite-only and sit at the top level**, never under `test`. `alias` and `server` exist in
  both places and mean different things: `test.alias` merges over `resolve.alias`, and `test.server.deps` controls
  inlining and externalization, not Vite's dev server. The Vitest 4 docs mark `test.server` deprecated without naming a
  replacement, and it is still where `deps.inline` and `deps.external` live.
- **Extend a default array rather than replacing it**: `exclude: [...configDefaults.exclude, ...]`.
- **Since Vitest 4, `exclude` covers only `node_modules` and `.git`.** `dist`, `cypress`, `.cache`, `.output` and the
  common `*.config.js` files are collected unless excluded. Narrow the search with `dir` instead — it limits where
  Vitest looks rather than filtering what it found.

## Projects

- **`projects` for anything that needs a second environment, pool, alias set or isolation setting.** It replaced
  `workspace` (deprecated 3.2, removed 4.0) and both `environmentMatchGlobs` and `poolMatchGlobs` (removed 4.0).
- **Every project needs a unique `name`.**
- **A project inherits nothing by default.** Add `extends: true` to take the root config, or compose with `mergeConfig`.
  Use `defineProject` rather than `defineConfig` in a project file for the narrower type.
- **`coverage`, `reporters` and `resolveSnapshotPath` are root-only** and silently ignored in a project config.
- **The root config is not itself a project** unless it is listed among them.

Read [`${CLAUDE_SKILL_DIR}/references/configuration.md`] when creating a config file or laying out projects in a
monorepo — it carries the three config-file shapes, the defaults with their exact values, what a project entry may be,
and the naming rule a glob entry must satisfy.

## Pools and Isolation

- **Leave `pool: 'forks'` alone unless a measurement says otherwise.** It is the Vitest 4 default and the compatible
  one: `process.chdir` works and native modules do not segfault.
- **`Segmentation fault`, `Abort trap: 6` or `thread '<unnamed>' panicked` means switch off `threads`.** A native addon
  in a worker thread is the cause.
- **`vmThreads` and `vmForks` leak by construction** — ES modules are cached with no API to clear them, and native
  module globals differ, so `err instanceof Error` can be `false` across the boundary. `isolate` has no effect there.
- **`isolate: false` is the biggest single speed gain available to a `node`-environment suite, and its biggest
  correctness cost.** Module registry, `globalThis` mutations and module-level singletons persist across files in the
  same worker. Scope it to a project holding the files that hold no state, never to the whole run.
- **`fileParallelism: false` for a shared external resource**, not for a leak between files — it forces `maxWorkers`
  to 1.
- **`maxWorkers` replaced `maxThreads` and `maxForks` in Vitest 4**, and `VITEST_MAX_WORKERS` replaced the two matching
  environment variables. It accepts a percentage string.

Read [`${CLAUDE_SKILL_DIR}/references/configuration.md`] when choosing a pool or scoping isolation to part of a suite —
it carries the four pools side by side, what isolation costs when it is off, and the experimental knobs with the release
each landed in.

## Coverage

- **Set `coverage.include` explicitly.** Vitest 4 removed `coverage.all`, so without it the report holds only files some
  test imported — an untested file simply vanishes and the percentage rises.
- **`v8` is the default and the right default.** Vitest 4 remaps its results through AST analysis — introduced behind a
  flag in 3.2, the only mode since 4.0 — which matches Istanbul's accuracy at lower cost. Choose `istanbul` for a non-V8
  runtime, or when the module count makes v8 slower.
- **Neither provider ships with Vitest**: `@vitest/coverage-v8` or `@vitest/coverage-istanbul`.
- **An ignore hint needs `-- @preserve`.** esbuild strips comments during transpilation, so `/* v8 ignore if */`
  disappears before the provider sees it; `/* v8 ignore if -- @preserve */` survives.
- **A negative threshold is a maximum count of uncovered items**, which ratchets a legacy codebase where a percentage
  cannot.

Read [`${CLAUDE_SKILL_DIR}/references/coverage.md`] when tuning what appears in a report, setting thresholds, or merging
coverage across shards — it carries the provider trade-offs, the include/exclude semantics, and the full ignore-hint
syntax.

## Type Testing

- **Type tests are not executed.** Vitest runs `tsc` over `*.test-d.ts` and parses the diagnostics, so a name built by
  `test.each` is never evaluated.
- **`toEqualTypeOf<T>()` by default; `toMatchObjectType<T>()` for a strict object subset.** `toExtend` is the loose
  form, and `toMatchTypeOf` is deprecated in its favor.
- **Assert `.not.toBeAny()` on anything crossing a generic or library boundary.** `any` satisfies every other assertion,
  so a degraded type passes the whole file.

Read [`${CLAUDE_SKILL_DIR}/references/type-testing.md`] when writing type tests or decoding an `expectTypeOf` error — it
carries the matcher set, the navigation chain, and the `typecheck` options.

## Benchmarks

- **`vitest bench` collects `*.bench.*` and `*.benchmark.*` files.** Benchmarking is experimental and outside SemVer —
  pin the version before depending on the output shape.
- **Compare against a stored baseline**: `vitest bench --outputJson main.json` on the base branch, `--compare main.json`
  on the change.
- **Options come from tinybench** — `time` (500 ms), `iterations` (10), `warmupTime` (100 ms), `warmupIterations` (5),
  plus `setup` and `teardown` per cycle.

## Browser Mode

- **Browser mode is stable as of Vitest 4** and is the honest way to test anything that depends on layout, focus, or
  real pointer events. `jsdom` and `happy-dom` remain right for code that only touches the DOM API.
- **The provider is a factory from its own package**, not a string: `provider: playwright()` from
  `@vitest/browser-playwright`. Vitest 4 dropped `@vitest/browser` and moved the context imports to `vitest/browser`.
- **`vi.spyOn` on a module namespace throws in the browser.** Native ESM seals it. Use `vi.mock(path, { spy: true })`.
- **Put browser tests in their own project** so the Node suite does not pay for a browser it does not use.

Read [`${CLAUDE_SKILL_DIR}/references/browser-mode.md`] when setting up browser mode, writing locator queries, or adding
visual regression tests — it carries the provider packages, the locator surface, and the screenshot stability
constraints.

## Running Vitest

- **Always `vitest run` from a script, a CI job, or an agent.** Bare `vitest` watches whenever stdin is a TTY and `CI`
  is unset; that detection is fragile, and a watching process never exits.
- **Filter narrowly rather than rerunning everything**: a path substring, `-t <regex>` against the full name including
  `describe` titles, or `file.test.ts:42` to run the test containing a line.
- **`--changed [ref]` while iterating**, defaulting to uncommitted work and accepting a commit or branch.
- **`--shard=i/n` with `--reporter=blob`, then one `vitest --merge-reports`.** Sharding splits files, never cases.
- **`--detect-async-leaks` (Vitest 4.1) when a suite hangs or flakes** — it names the leaked handles and their source
  locations, at a runtime cost that makes it a debugging tool rather than a default.

Read [`${CLAUDE_SKILL_DIR}/references/configuration.md`] when a filter selects the wrong files, or when setting up
sharding or test tags — it carries the exact matching rule for every filter form, the blob and merge flow, and the tag
declaration and priority resolution.

## Migrating from Jest

Three behavioral differences catch a mechanical `jest.` → `vi.` rename:

- **`mockReset` restores the original implementation** rather than replacing it with a stub returning `undefined`.
- **A `vi.mock` factory returns the module namespace**, with `default` as an explicit key, not the default export
  itself.
- **A function returned from `beforeEach` is teardown**, so a concise arrow body changes meaning.

Read [`${CLAUDE_SKILL_DIR}/references/jest-migration.md`] when porting a suite from Jest, or from Mocha, Chai and Sinon
— it carries the full API translation, the globals and auto-mocking differences, and the snapshot output divergences.

## Application

When **writing** tests, apply these conventions silently — do not narrate a rule while following it. Where the existing
suite contradicts one, follow the suite and flag the divergence once.

When **reviewing** tests, cite the violation and show the fix inline. Do not lecture.

```
Bad:  "Vitest best practice suggests awaiting async assertions..."
Good: expect(fetchUser(1)).rejects.toThrow()  ->  await expect(fetchUser(1)).rejects.toThrow()
```

## Integration

The **coding** skill decides what is worth testing and when; this skill decides how a Vitest test is written. Both are
active at once.

This skill covers Vitest and nothing else. `node:test` belongs to the **nodejs** skill and `bun:test` to the **bun**
skill, because each ships with its runtime. `expectTypeOf` and the `typecheck` options are this skill's, being its own
API and its own config keys; the type system they exercise is the **typescript** skill's, and the language under test is
the **javascript** skill's.

**When in doubt, mock less.**
