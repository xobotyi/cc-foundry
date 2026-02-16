# Bun Testing

Built-in Jest-compatible test runner. Import from `bun:test`.

## Running Tests

```sh
bun test                           # all test files
bun test ./specific.test.ts        # specific file (use ./ prefix)
bun test foo bar                   # files matching "foo" or "bar"
bun test -t "pattern"              # filter by test name regex
bun test --watch                   # re-run on changes
bun test --coverage                # generate coverage report
```

Auto-discovers: `*.test.{js,jsx,ts,tsx}`, `*_test.*`, `*.spec.*`, `*_spec.*`.

### Key CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--timeout` | 5000 | Per-test timeout (ms) |
| `--bail` | - | Stop after N failures |
| `--retry` | 0 | Retry failed tests N times |
| `--concurrent` | false | Run tests in parallel |
| `--max-concurrency` | 20 | Max parallel tests |
| `--rerun-each` | 0 | Run each test N extra times |
| `--randomize` | false | Random execution order |
| `--seed` | - | Reproducible random order |
| `--update-snapshots` | false | Update snapshot files |
| `--preload` | - | Scripts to run before tests |
| `--reporter=junit` | - | JUnit XML output (needs `--reporter-outfile`) |

### AI Agent Mode

Set `CLAUDECODE=1` or `AGENT=1` to suppress passing test output — only failures
shown.

## Writing Tests

```ts
import { test, expect, describe } from "bun:test";

test("basic", () => {
  expect(2 + 2).toBe(4);
});

describe("group", () => {
  test("nested", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
```

### Timeouts

```ts
test("slow op", async () => { /* ... */ }, 500);  // 500ms timeout
```

Timed-out tests throw uncatchable exceptions. Child processes spawned in the test
are auto-killed.

### Test Modifiers

| Modifier | Effect |
|----------|--------|
| `test.skip(name, fn)` | Skip this test |
| `test.todo(name, fn)` | Mark as TODO (not run) |
| `test.only(name, fn)` | Run only this test (needs `--only`) |
| `test.if(cond)(name, fn)` | Run if condition is truthy |
| `test.skipIf(cond)(name, fn)` | Skip if condition is truthy |
| `test.todoIf(cond)(name, fn)` | TODO if condition is truthy |
| `test.failing(name, fn)` | Pass if test fails, fail if it passes |
| `test.concurrent(name, fn)` | Run concurrently (even without `--concurrent`) |
| `test.serial(name, fn)` | Force sequential (even with `--concurrent`) |

Modifiers chain: `test.failing.each([...])("name %d", fn)`.

### Parametrized Tests

```ts
test.each([
  [1, 2, 3],
  [4, 5, 9],
])("%p + %p = %p", (a, b, expected) => {
  expect(a + b).toBe(expected);
});

// Object form — single argument
test.each([
  { a: 1, b: 2, expected: 3 },
])("add($a, $b) = $expected", ({ a, b, expected }) => {
  expect(a + b).toBe(expected);
});
```

Format specifiers: `%p` (pretty), `%s` (string), `%d` (number), `%i` (int),
`%j` (JSON), `%#` (index).

`describe.each` also works for parametrized suites.

### Retries and Repeats

```ts
test("flaky", async () => { /* ... */ }, { retry: 3 });    // retry up to 3x
test("stress", () => { /* ... */ }, { repeats: 20 });       // run 21 times total
```

Cannot combine `retry` and `repeats` on the same test.

### Assertion Counting

```ts
test("async assertions", async () => {
  expect.hasAssertions();        // at least one assertion must run
  expect.assertions(2);          // exactly 2 assertions must run
  // ...
});
```

### Lifecycle Hooks

```ts
import { beforeAll, beforeEach, afterEach, afterAll } from "bun:test";

beforeAll(() => { /* once before all tests */ });
beforeEach(() => { /* before each test */ });
afterEach(() => { /* after each test */ });
afterAll(() => { /* once after all tests */ });
```

Can also be defined in `--preload` scripts for global setup.

## Matchers

Full Jest matcher compatibility. Key matchers:

**Equality**: `.toBe()`, `.toEqual()`, `.toStrictEqual()`
**Truthiness**: `.toBeTruthy()`, `.toBeFalsy()`, `.toBeNull()`, `.toBeUndefined()`,
`.toBeDefined()`, `.toBeNaN()`
**Numbers**: `.toBeGreaterThan()`, `.toBeLessThan()`, `.toBeCloseTo()`
**Strings/Arrays**: `.toContain()`, `.toHaveLength()`, `.toMatch()`
**Objects**: `.toHaveProperty()`, `.toMatchObject()`
**Errors**: `.toThrow()`, `.toBeInstanceOf()`
**Promises**: `.resolves`, `.rejects`
**Mocks**: `.toHaveBeenCalled()`, `.toHaveBeenCalledWith()`,
`.toHaveBeenCalledTimes()`
**Snapshots**: `.toMatchSnapshot()`, `.toMatchInlineSnapshot()`

All support `.not` inversion.

## Mocks

### Function Mocks

```ts
import { test, expect, mock } from "bun:test";

const fn = mock(() => 42);
fn(1, 2);

expect(fn).toHaveBeenCalledWith(1, 2);
fn.mock.calls;     // [[1, 2]]
fn.mock.results;   // [{ type: "return", value: 42 }]
```

`jest.fn()` is an alias for `mock()`.

### Mock Methods

| Method | Description |
|--------|-------------|
| `.mockImplementation(fn)` | Set implementation |
| `.mockImplementationOnce(fn)` | Set for next call only |
| `.mockReturnValue(val)` | Set return value |
| `.mockReturnValueOnce(val)` | Set for next call only |
| `.mockResolvedValue(val)` | Set resolved promise value |
| `.mockRejectedValue(val)` | Set rejected promise value |
| `.mockClear()` | Clear call history |
| `.mockReset()` | Clear history + remove implementation |
| `.mockRestore()` | Restore original implementation |

### Spies

```ts
import { spyOn } from "bun:test";

const spy = spyOn(object, "method");
object.method();
expect(spy).toHaveBeenCalled();

spy.mockImplementation(() => "mocked");  // override behavior
```

### Module Mocks

```ts
import { mock } from "bun:test";

mock.module("./api-client", () => ({
  fetchUser: mock(async (id: string) => ({ id, name: "Mock" })),
}));
```

Key behaviors:
- Works for ESM and CJS
- Updates live bindings — existing imports see the mock
- Supports relative paths, absolute paths, and package names
- Use `--preload` to mock before any imports (prevents side effects)

### Global Mock Cleanup

```ts
mock.restore();         // restore all spied functions
mock.clearAllMocks();   // clear call history for all mocks
```

Common pattern — add to `afterEach`:

```ts
afterEach(() => {
  mock.restore();
  mock.clearAllMocks();
});
```

### Vitest Compatibility

`vi` is available as an alias: `vi.fn()`, `vi.spyOn()`, `vi.mock()`.

## Snapshot Testing

```ts
expect({ a: 1 }).toMatchSnapshot();
expect(value).toMatchInlineSnapshot(`"expected"`);
```

Update snapshots: `bun test --update-snapshots` (or `-u`).

## Type Testing

```ts
import { expectTypeOf } from "bun:test";

expectTypeOf<string>().toEqualTypeOf<string>();
expectTypeOf(fn).parameters.toEqualTypeOf<[string]>();
expectTypeOf(fn).returns.toEqualTypeOf<number>();
```

Type assertions are no-ops at runtime — run `bunx tsc --noEmit` to verify.

## Configuration via bunfig.toml

```toml
[test]
preload = ["./setup.ts"]
root = "./__tests__"
coverage = true
coverageThreshold = { line = 0.8, function = 0.8 }
coverageReporter = ["text", "lcov"]
retry = 3
timeout = 10000
```
