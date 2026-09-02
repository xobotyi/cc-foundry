# `node:test`

Stability 2 from 20.0.0. The module resolves under the `node:` scheme only — `require('test')` fails.

The runner is deliberately smaller than a framework: there is no `expect`, no automatic module mocking, no transform
pipeline. What it does have is bundled with the runtime, so it needs no dependency and no configuration file.

## Structure

- **`test()` and `suite()` are the primary names; `it()` and `describe()` are aliases** for them. Pick one pair per
  project.
- **Subtests come from the test context**, not from the imported `test`:
  `test('parent', async (t) => { await t.test('child', ...) })`.
- **`beforeEach` and `afterEach` fire between subtests**, not only between top-level tests.
- **Assert with `t.assert.*`, not the bare `node:assert`.** The context-bound forms (22.2.0) are what `t.plan()` counts;
  a bare `assert` call is invisible to the plan and the count silently fails to match.
- **`t.plan(count)` checks immediately after the test function returns.** The default is `{ wait: false }`, so an
  assertion that lands later is not counted and the plan fails. Pass `{ wait: true }` or a millisecond budget when
  assertions arrive from a callback.
- **`expectFailure`** (24.14.0 and 25.5.0) inverts the result: `it.expectFailure(...)` or `{ expectFailure: true }`
  passes only when the body throws. It marks a known defect without deleting the test the way `todo` does.

## Awaiting subtests

**The runner awaits subtests from 24.0.0.** An unawaited failing subtest fails its parent and the run — verified on
26.2.0, where the parent reports `✖` and the process exits 1.

`doc/api/test.md` on the 26 line still carries the pre-24 sentence saying tests do not wait for their subtests and that
outstanding subtests are cancelled. That text is stale; the changelog for 24.0.0 and the runtime disagree with it.
Awaiting `t.test(...)` explicitly remains correct and portable, and it is required on the 22 line.

## Mocking

- **`mock.module()` is unavailable without `--experimental-test-module-mocks`.** Without the flag `mock.module` is
  `undefined` — verified on 26.2.0 — so a test file that mocks a module fails with a `TypeError` rather than a clear
  message. It is Stability 1.0 - Early development, the least settled part of the runner.
- **`mock.module` does not cache by default.** With `cache: false` (the default) every `require()` or `import()` builds
  a fresh mock; `cache: true` inserts it into the CommonJS cache instead.
- **`mock.fn()`, `mock.method()`, `mock.getter()`, `mock.setter()`, and `mock.property()`** cover the rest, and none of
  them need a flag.
- **Restore between tests.** `mock.reset()` and `mock.restoreAll()` are not automatic; `t.mock` scopes to one test and
  is restored for you, which is why the context form is the default choice.

## Fake timers

`mock.timers.enable({ apis: ['setTimeout'] })` then `mock.timers.tick(ms)`.

- **A destructured import is not mocked.** `import { setTimeout } from 'node:timers'` captures the real function before
  the mock installs. Call the global, or the namespace property, instead.
- Enabling covers the global, `node:timers`, and `node:timers/promises` forms of whichever APIs are named.

## Snapshots

- **`t.assert.snapshot(value)`** and **`t.assert.fileSnapshot(value, path)`** (22.14.0 and 23.7.0).
- **`--test-update-snapshots` writes**; without it the value is compared. Never run the update flag in CI, where it
  turns every regression into a passing test.
- Custom `serializers` run in sequence, each taking the previous one's output.

## Coverage

Stability 1 - Experimental, behind `--experimental-test-coverage`.

- Core modules and `node_modules/` are excluded by default; `--test-coverage-include` overrides that, and
  `--test-coverage-exclude` drops paths. Test files themselves are excluded.
- `--test-coverage-lines`, `-branches`, and `-functions` set thresholds that fail the run.
- `/* node:coverage disable */` and `/* node:coverage enable */` bracket lines to ignore;
  `/* node:coverage ignore next */` skips one line and `/* node:coverage ignore next 3 */` skips a count.
- Reporters receive coverage through the `'test:coverage'` event.

## Failure modes worth knowing

- **Work that outlives a test is attributed to it, not dropped.** A subtest created after its parent finished is marked
  failed immediately, and a late `uncaughtException` or `unhandledRejection` is reported as a top-level diagnostic
  against the completed test.
- **A test file is a normal script.** Under the default process isolation, exiting non-zero fails the file whether or
  not it imported `node:test` at all.
- **`--test-force-exit` hides a leak rather than fixing one.** A run that will not end has an open handle; find it with
  `process.getActiveResourcesInfo()` before reaching for the flag.
