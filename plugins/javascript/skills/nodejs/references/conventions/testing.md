# `node:test`

Stability 2 from 20.0.0. The module resolves under the `node:` scheme only — `require('test')` throws
`MODULE_NOT_FOUND`. It ships with the runtime, so every knob is a CLI flag or a per-test option rather than a
configuration file, and a project using it carries no test dependency.

## Structure

- **`test()` and `suite()` are the primary names; `it()` and `describe()` are aliases** for them. Pick one pair per
  project.
- **Subtests come from the test context**, not the imported `test`:
  `test('parent', async (t) => { await t.test('child', ...) })`.
- **`beforeEach` and `afterEach` fire between subtests**, not only between top-level tests. `before` and `after` bracket
  the enclosing test or suite once.
- **Options go in the second argument or as a method suffix** —
  `{ skip, todo, only, concurrency, timeout, plan, signal }`, or `it.skip(...)`, `it.todo(...)`, `it.only(...)`.
  `--test-only` is required for `only` to take effect under the default isolation. With subtests, **every ancestor must
  also be marked `only`**, or the subset never runs; `t.runOnly(true)` does the same from inside a test.
- **`expectFailure`** (24.14.0 and 25.5.0) inverts the result: `it.expectFailure(...)` or `{ expectFailure: true }`
  passes only when the body throws, and fails when it passes. It records a known defect without deleting the assertion
  the way `todo` does.
- **`t.tags`, `t.filePath`, `t.fullName`, `t.workerId`** expose run metadata to the test body; `--test-name-pattern` and
  the tag filters select on it from the CLI.

## The subtest async contract

**The runner awaits subtests from 24.0.0.** An unawaited failing subtest fails its parent and the run — verified on
26.2.0, where the parent reports `✖` and the process exits 1.

`doc/api/test.md` on the 26 branch still carries the pre-24 sentence saying tests do not wait for their subtests and
that outstanding subtests are cancelled. That text is stale; the 24.0.0 changelog and the runtime both contradict it.

Await `t.test(...)` anyway. It is required on the 22 line, it is what makes the ordering deterministic, and it costs
nothing where the runner would have awaited for you.

## Assertions

- **Use `t.assert.*` inside a test, not the imported `node:assert`.** The context-bound forms (22.2.0) are the ones
  `t.plan()` counts; a bare `assert` call is invisible to the plan, so the count comes up short and the failure reads as
  a miscount rather than a wrong assertion.
- **`t.plan(count)` checks the moment the test function returns.** The default is `{ wait: false }`, so an assertion
  arriving later from a callback is not counted. Pass `{ wait: true }` for an unbounded wait or a number of milliseconds
  for a bounded one.
- **Import `node:assert/strict`, never `node:assert`, outside a test context.** The legacy surface compares with `==`,
  so `assert.equal(1, '1')` passes. The strict entry point makes every comparison `===`-based and adds the error diff.
- **`deepStrictEqual` for structures**; `partialDeepStrictEqual` (22.13.0 and 23.4.0; Stable from 22.17.0 and 24.0.0)
  asserts a subset, which is the right tool for a response object carrying fields the test does not own.
- **`assert.rejects` and `assert.throws` take a matcher**, not just a callback — a class, a regular expression, or a
  predicate. Passing only the function asserts that it threw something, which is rarely the intent.
- **`assert.CallTracker` was removed in 25.0.0** (DEP0173, End-of-Life) and is `undefined` on 26. Its replacement is
  `mock.fn()` with `fn.mock.callCount()`.

## Mocking

- **`t.mock` is scoped to one test and restored for you.** `mock.reset()` runs automatically on the test context's
  tracker after each test. The module-level `mock` import is process-wide and is **not** restored — using it means
  calling `mock.reset()` or `mock.restoreAll()` by hand.
- **`mock.reset()` and `mock.restoreAll()` differ.** Both restore original behavior; `reset()` also disassociates the
  mocks from the tracker, after which that tracker cannot touch them.
- **`mock.fn(original, implementation, { times: n })`** applies `implementation` for `n` calls and then reverts to
  `original`. The default is `Infinity`. Inspect and steer through `fn.mock` — `calls`, `callCount()`,
  `mockImplementation()`, `mockImplementationOnce()`, `resetCalls()`, `restore()`.
- **`mock.method`, `mock.getter`, `mock.setter`, and `mock.property`** patch an existing object and need no flag.
- **`mock.module()` needs `--experimental-test-module-mocks`.** Without the flag `mock.module` is `undefined` — verified
  on 26.2.0 — so the test dies with a `TypeError` on an undefined call rather than a legible message. It is Stability
  1.0 - Early development, the least settled part of the runner.
- **`mock.module` does not cache by default.** At `cache: false` every `require()` or `import()` builds a fresh mock;
  `cache: true` inserts it into the CommonJS cache so subsequent loads share it.

## Fake timers

`mock.timers.enable({ apis: ['setTimeout'] })`, then advance with `mock.timers.tick(ms)`.

- **A destructured import is never mocked.** `import { setTimeout } from 'node:timers'` binds the real function before
  the mock installs. Call the global, or the namespace property, instead.
- Enabling covers the global, `node:timers`, and `node:timers/promises` forms of whichever APIs are named.
- `Date` is mockable through the same tracker, which is what makes a time-dependent assertion deterministic. **Dates and
  timers are coupled when both are mocked** — advancing time with `tick()` also moves `Date.now()`.

## Snapshots

- **`t.assert.snapshot(value)`** and **`t.assert.fileSnapshot(value, path)`** (22.14.0 and 23.7.0).
- **`--test-update-snapshots` writes; without it the value is compared.** Never run the update flag in CI — it rewrites
  the baseline, turning every regression into a pass.
- Custom `serializers` run as a chain, each taking the previous one's output, before the result is coerced to a string.

## Coverage

Stability 1 - Experimental, behind `--experimental-test-coverage`.

- Core modules and `node_modules/` are excluded by default, and so are the test files themselves.
  `--test-coverage-include` adds paths back, `--test-coverage-exclude` drops them.
- `--test-coverage-lines`, `--test-coverage-branches`, and `--test-coverage-functions` set thresholds that fail the run.
- `/* node:coverage disable */` and `/* node:coverage enable */` bracket a region; `/* node:coverage ignore next */`
  skips one line and `/* node:coverage ignore next 3 */` skips a count.
- `NODE_V8_COVERAGE=dir` writes the raw V8 coverage files alongside the report.

## Reporters

Built in: `spec` (the default), `tap`, `dot`, `junit`, and `lcov` — the last only meaningful with the coverage flag. All
are importable from `node:test/reporters` (18.17.0 and 19.9.0) for composition.

- **The non-TTY default changed from `tap` to `spec` in 23.0.0.** A CI job piping output gets TAP on the 22 line and
  spec on 24 and later. Pass `--test-reporter` explicitly rather than depending on the default.
- **Reporter output is explicitly not a stable contract.** Anything parsing it will break between minors. For
  programmatic consumption, subscribe to the `TestsStream` events instead.
- **Multiple reporters require a destination each.** `--test-reporter` and `--test-reporter-destination` are paired by
  position, and a destination is `stdout`, `stderr`, or a file path. With one reporter the destination defaults to
  `stdout`.

## Failure modes worth knowing

- **Work that outlives a test is attributed to it, not dropped.** A subtest created after its parent finished is marked
  failed immediately, and a late `uncaughtException` or `unhandledRejection` is reported as a top-level diagnostic
  against the completed test.
- **A test file is a normal script.** Under the default process isolation, a file exiting non-zero fails whether or not
  it ever imported `node:test`.
- **`--test-force-exit` hides an open handle rather than closing one.** A run that will not end is holding a resource;
  identify it with `process.getActiveResourcesInfo()` before reaching for the flag.
