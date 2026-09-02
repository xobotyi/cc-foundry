# `bun:test`

Depth on the `bun:test` runner: discovery, matchers, mocks, concurrency, and configuration.

## Discovery and filtering

`bun test` walks the working directory for `*.test.*`, `*_test.*`, `*.spec.*`, and `*_spec.*` with any of the extensions
`js`, `jsx`, `ts`, `tsx`, `mjs`, `cjs`, `mts`, `cts`.

- A positional argument filters by path substring, not by glob: `bun test foo bar` runs files whose path contains
  either. Glob patterns are not accepted here.
- A path starting with `./` or `/` names one file rather than a filter.
- `-t` / `--test-name-pattern` filters by test name with a regex.
- `[test] root` in `bunfig.toml` restricts the search directory; `[test] pathIgnorePatterns` excludes paths.

## Modifiers and parametrized tests

`test.skip`, `test.todo`, `test.only`, `test.failing`, `test.if(cond)`, `test.skipIf(cond)`, `test.todoIf(cond)`,
`test.concurrent`, `test.serial`, and the matching `describe.*` forms. Qualifiers chain:
`test.failing.each([1, 2, 3])("case %d", ...)`.

`test.each(table)` and `describe.each(table)` take an array of rows. A row that is an array spreads into separate
parameters; anything else arrives as one argument. Names take `printf` specifiers (`%d`, `%s`, `%o`, `%#` for the index,
`%%` for a literal percent).

Per-test options go in a third argument: `test("name", fn, { retry: 5 })` re-runs a failing test up to five times and
reports it as passing if any attempt passes; `{ repeats: 20 }` runs it twenty times and fails if any run fails.
`--retry <N>` sets a suite-wide default that a per-test `retry` overrides.

## Matchers

Jest's core set is implemented, including `.not`, `toBe`, `toEqual`, `toStrictEqual`, `toMatchObject`, `toHaveProperty`,
`toContain`, `toContainEqual`, `toThrow`, `toBeInstanceOf`, `resolves`, `rejects`, the full `toHaveBeenCalled*` and
`toHaveReturned*` families, `expect.extend`, `expect.anything()`, `expect.any()`, `expect.assertions()`, and
`expect.hasAssertions()`. Bun adds `toContainAllKeys`, `toContainValue`, `toContainValues`, `toContainAllValues`, and
`toContainAnyValues`. `expect.addSnapshotSerializer()` is not implemented; the compatibility tracking issue is
`oven-sh/bun#1825`.

From 1.4.0 `toContain()` compares with `===` rather than `Object.is`, matching Jest — `expect([-0]).toContain(0)` passes
and `expect([NaN]).toContain(NaN)` fails. `toBe()` still uses `Object.is` and `toContainEqual()` still uses deep
equality. From 1.4.0 `Temporal` objects compare by value in `toEqual`, `toStrictEqual`, `Bun.deepEquals`, and
`util.isDeepStrictEqual`; before that any two instances of the same class were equal.

## Type assertions

`expectTypeOf` from `bun:test` is Vitest-compatible and is a **no-op at runtime**. `bun test` passing says nothing about
the types — run `bunx tsc --noEmit` separately or the assertions check nothing.

```ts
expectTypeOf(greet).parameters.toEqualTypeOf<[string]>();
expectTypeOf(greet).returns.toEqualTypeOf<string>();
expectTypeOf([1, 2, 3]).items.toBeNumber();
```

## Snapshots

`toMatchSnapshot()` writes to `__snapshots__/`. `toMatchInlineSnapshot()` writes the value into the test file itself.
`toThrowErrorMatchingSnapshot()` and `toThrowErrorMatchingInlineSnapshot()` cover thrown errors. `-u` /
`--update-snapshots` rewrites them; under `--parallel` the coordinator merges snapshot writes across workers.

Property matchers keep volatile fields out of the stored value:

```ts
expect(user).toMatchSnapshot({ id: expect.any(String), createdAt: expect.any(Date) });
```

## Lifecycle

`beforeAll`, `beforeEach`, `afterEach`, and `afterAll` scope to the enclosing `describe`, or to the file when declared
at the top level, or to the whole run when declared in a `--preload` script. Hooks may be async and are awaited.

`onTestFinished(cb)` registers a callback for the current test that runs after every `afterEach`. It is not supported in
a concurrent test — use `test.serial` there.

Preload scripts run before any test file. Set them once in `bunfig.toml` rather than passing `--preload` each time:

```toml
[test]
preload = ["./setup.ts"]
```

Under `--parallel`, preload-level `beforeAll` and `afterAll` wrap **every** file, because a worker never knows which
file is its last. A preload with top-level `await` completes before any worker starts.

## Mocks

`mock(fn)` and `jest.fn(fn)` are the same thing. `vi.fn`, `vi.spyOn`, `vi.mock`, `vi.restoreAllMocks`,
`vi.resetAllMocks`, and `vi.clearAllMocks` exist for ported Vitest suites.

A mock carries `mock.calls`, `mock.results`, `mock.instances`, `mock.contexts`, `mock.lastCall`, and the methods
`mockClear`, `mockReset`, `mockRestore`, `mockImplementation`, `mockImplementationOnce`, `mockName`, `getMockName`,
`mockReturnThis`, `mockReturnValue(Once)`, `mockResolvedValue(Once)`, `mockRejectedValue(Once)`, and
`withImplementation(fn, cb)`.

The three global resets differ, and picking the wrong one is the usual cause of a mock that stops returning anything:

- **`mock.clearAllMocks()`** — clears `calls`, `results`, `instances`, `contexts`. Implementations survive.
- **`jest.resetAllMocks()`** / **`vi.resetAllMocks()`** — also drops implementations. From 1.4.0 this matches Jest;
  before, it behaved like `clearAllMocks`. After it, a `jest.fn(() => 42)` returns `undefined` and a `spyOn` spy returns
  `undefined` until `mockRestore()`.
- **`mock.restore()`** — restores every spied original. It does **not** undo a `mock.module()` override.

`spyOn(obj, "method")` wraps without replacing; chain `.mockResolvedValue(...)` to replace as well.

### `mock.module`

`mock.module(specifier, factory)` overrides a module for both `import` and `require`, and updates live ESM bindings even
for a module already imported. The specifier resolves like an ordinary import: relative path, absolute path, or package
name.

It is **not hoisted**. Unlike Jest's `jest.mock`, the call runs where it is written, so a module imported above it has
already been evaluated and its side effects have already happened. Put the override in a `--preload` script when the
original must never run.

`__mocks__` directories and automocking are not supported.

## Concurrency: three independent knobs

- **`--parallel[=N]`** — files, in processes. Spreads files across N worker processes. Implies `--isolate`.
- **`--concurrent` / `test.concurrent`** — tests, in one file. Lets async tests in a file overlap while one awaits.
- **`--shard=i/n`** — files, across machines. Runs the i-th deterministic slice of the suite.

They compose: `bun test --shard=2/4 --parallel` with `test.concurrent` inside a file is valid.

### `--parallel`

The main process becomes a coordinator, discovers files, and hands each worker one file at a time. Output is grouped by
file and never interleaved. Workers start lazily: the first starts immediately and the rest only once every running
worker has been busy for `--parallel-delay` milliseconds (default `5`), so a suite of tiny files runs on one worker.

Files are sorted by path and split into contiguous chunks, keeping directory neighbours — which usually share imports —
on one worker. A drained worker steals the back half of the largest remaining chunk.

Each worker sets `BUN_TEST_WORKER_ID` and `JEST_WORKER_ID` to its 1-based index, so a test can key a database name, port
range, or temp directory off it. Jest setups that already read `JEST_WORKER_ID` work unchanged.

The coordinator merges coverage, JUnit XML, and snapshot writes. `--bail` applies at file granularity: no new file
starts once the threshold is hit, but running files finish. A worker that calls `process.exit` has its current file
reported as failed and is replaced; a fatal signal aborts the whole run. With one effective worker the files run in the
main process, so `process.exit` ends the run with that code.

### `--isolate`

Runs each file in a fresh global inside one process. Between files Bun creates a new `globalThis`, clears the ESM and
CommonJS registries, closes servers, sockets, watchers, and subprocesses the file left open, cancels its timers,
restores fake timers, and re-runs `--preload`. Transpiled source and bytecode are cached at process level and shared
across globals, so only top-level module code runs again.

This is what Jest and Vitest do by default, and it is what makes "passes alone, fails in the suite" bugs disappear.
Plain `bun test` shares one global across every file, which is faster.

`--parallel --no-isolate` gives each worker one global and one module registry for every file it handles. On a suite of
many small files sharing a large module graph that is the fastest configuration, and the cost is that a file can observe
what an earlier file on the same worker left behind.

### `--shard` and `--timings`

Without timings, file `i` of the path-sorted list goes to shard `(i mod n) + 1` — balanced by count, not duration.

`--timings=<path>` (from 1.4.0) reads recorded per-file durations so both `--shard` and `--parallel` balance by wall
time. `--update-timings` writes them. Below 1.4.0 both flags are accepted and do nothing — no file is written and
sharding stays balanced by count, with no warning. The file is plain JSON, slowest first, so it doubles as a slow-test
report:

```json
{ "version": 1, "files": { "test/integration/build.test.ts": 41234, "src/router.test.ts": 112 } }
```

Paths are relative to the project root and values are milliseconds. A file with no entry is assumed to take the median
and is started first. `--timings` may be passed several times and the files are read as one table; `--update-timings`
writes to the **first** path. Under `--shard` the output holds only the files that shard ran, so the shards' outputs are
disjoint and add up to the whole suite when read together on the next run. Every shard must read the same set of timings
files or the shards do not add up.

## Runtime environment

- **`NODE_ENV` is `"test"`** unless already set in the environment or a `.env` file.
- **The runtime zone is UTC**, so date behavior is stable across machines. `process.env.TZ` stays unset, so a preload
  that branches on it reads `undefined`; set `TZ` in the environment to override the zone.
- **Per-test timeout is 5000 ms**; `--timeout` changes it, and a third argument to `test()` sets it per test.
- **An unhandled rejection or error between tests fails the run.** When it happens while the file is loading, none of
  that file's tests run at all and the process exits non-zero.
- `--smol` reduces the runner's memory use; `--inspect` attaches the debugger; `--define`, `--loader`, `--tsconfig`,
  `--conditions`, and `--env-file` all apply.

## Reporters and coverage

`--reporter=junit --reporter-outfile=./bun.xml` writes JUnit XML alongside the normal output. `--dots` is shorthand for
`--reporter=dots`.

`--coverage` with `--coverage-reporter=text|lcov` and `--coverage-dir`. In `bunfig.toml`, `[test] coverage`,
`coverageThreshold` (a number, or `{ line, function, statement }`), `coverageSkipTestFiles`,
`coveragePathIgnorePatterns`, `coverageReporter`, `coverageDir`, and `coverageIgnoreSourcemaps`.

`bun test` detects GitHub Actions and emits annotations with no configuration. It also detects an agent environment
(`CLAUDECODE`, `REPL_ID`, or `AGENT` set) and prints only failures and the summary.

## Fake timers

`jest.useFakeTimers()` takes over `setTimeout`, `setInterval`, and `Date`; `jest.advanceTimersByTime(ms)` moves them;
`jest.setSystemTime()` sets the clock; `jest.useRealTimers()` restores. `Bun.cron` schedules can be driven by the fake
clock (from 1.4.0). Under `--isolate`, fake timers a file leaves installed no longer leak into the next file (fixed in
1.4.0).

## `bunfig.toml` test keys

`root`, `preload`, `pathIgnorePatterns`, `smol`, `randomize`, `seed`, `rerunEach`, `retry`, `concurrentTestGlob`,
`onlyFailures`, `reporter`, and the coverage keys above. `[install]` settings are inherited by `bun test`. A CLI flag
overrides the config file.

`concurrentTestGlob` turns on concurrency for matching files only, which is the middle ground between `test.concurrent`
per test and `--concurrent` for everything.
