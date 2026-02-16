# Vitest Lifecycle

Hooks, setup files, global setup, test context, and execution order.

## Hook Execution Order

Within each test file:

1. **File-level code** — runs immediately during import
2. **`describe` callbacks** — run immediately (register tests as side effects)
3. **`beforeAll`** — once before all tests in the suite
4. **For each test:**
   - `beforeEach` hooks (parent-to-child order)
   - Test function
   - `afterEach` hooks (child-to-parent, reverse order by default)
   - `onTestFinished` callbacks (always reverse order)
   - `onTestFailed` callbacks (if test failed)
5. **`afterAll`** — once after all tests in the suite

### Nested Suites

Hooks follow hierarchical nesting — outer `beforeEach` runs before inner `beforeEach`,
and outer `afterEach` runs after inner `afterEach`:

```ts
describe('outer', () => {
  beforeEach(() => console.log('outer beforeEach'))

  describe('inner', () => {
    beforeEach(() => console.log('inner beforeEach'))
    afterEach(() => console.log('inner afterEach'))

    it('test', () => console.log('test'))
  })

  afterEach(() => console.log('outer afterEach'))
})
// Output: outer beforeEach → inner beforeEach → test →
//         inner afterEach → outer afterEach
```

### Hook Order Configuration

```ts
test: {
  sequence: {
    hooks: 'stack',  // default: reverse order for teardown (recommended)
    // 'list' — Jest-compatible: same order for setup and teardown
    // 'parallel' — run hooks in parallel (fastest, use with caution)
  },
}
```

## Hooks API

### `beforeAll` / `afterAll`

Run once per `describe` block (or per file if at top level):

```ts
let db: Database

beforeAll(async () => {
  db = await createTestDatabase()
  return () => db.close()  // return value = teardown function
})
```

**Teardown return value:** If `beforeAll` or `beforeEach` returns a function, it
runs as teardown. This is a Vitest-specific feature (not in Jest). Be careful not
to accidentally return values:

```ts
beforeEach(() => setupPinia())           // BAD if setupPinia returns something
beforeEach(() => { setupPinia() })       // GOOD — explicit void
```

### `beforeEach` / `afterEach`

Run before/after every test in the current scope:

```ts
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})
```

### `onTestFinished`

Register cleanup inside a test. Always runs, regardless of pass/fail:

```ts
it('creates temp file', async () => {
  const file = createTempFile()
  onTestFinished(() => fs.unlinkSync(file))
  // ...
})
```

### `onTestFailed`

Runs only when the test fails — useful for diagnostics:

```ts
it('complex integration', ({ onTestFailed }) => {
  onTestFailed(() => {
    console.log('Current state:', JSON.stringify(state))
  })
  // ...
})
```

## Test Context

Each test receives a context object as its first parameter:

```ts
it('uses context', ({ expect, task }) => {
  // expect is scoped to this test — required for concurrent tests
  expect(1 + 1).toBe(2)
})
```

Available properties:
- `expect` — test-scoped expect (required for concurrent + snapshots)
- `task` — test metadata (name, file, etc.)
- `onTestFinished(fn)` — register cleanup
- `onTestFailed(fn)` — register failure handler

### Extending Test Context

```ts
import { beforeEach } from 'vitest'

interface TestContext {
  db: Database
}

beforeEach<TestContext>(async (context) => {
  context.db = await createTestDatabase()
})

it<TestContext>('queries data', ({ db }) => {
  expect(db.query('SELECT 1')).toBeTruthy()
})
```

## Setup Files

Files that run before **each test file**. Use for global hooks, custom matchers,
or shared setup:

```ts
// vitest.config.ts
test: {
  setupFiles: ['./test/setup.ts'],
}
```

```ts
// test/setup.ts
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())

// Register custom matchers globally:
expect.extend({ /* ... */ })
```

### Setup File Behavior

- Runs in the **same process** as tests (has access to test globals).
- Runs **before each test file** (not once globally).
- Setup files run in **parallel** by default. Set `sequence.setupFiles: 'list'`
  for sequential execution.
- Editing a setup file triggers a full re-run in watch mode.

## Global Setup

Runs once before **any** test workers start. Use for expensive one-time setup
(database seeding, server startup):

```ts
// vitest.config.ts
test: {
  globalSetup: ['./test/global-setup.ts'],
}
```

```ts
// test/global-setup.ts
import type { TestProject } from 'vitest/node'

export default function setup(project: TestProject) {
  const server = startServer()
  project.provide('port', server.port)

  return () => server.close()  // teardown
}
```

### Sharing Data: `provide` / `inject`

Global setup runs in a **different scope** from tests. Use `provide`/`inject`
to pass serializable data:

```ts
// global-setup.ts
project.provide('wsPort', 3000)

// test file
import { inject } from 'vitest'
const port = inject('wsPort')  // 3000
```

Declare the type:

```ts
declare module 'vitest' {
  export interface ProvidedContext {
    wsPort: number
  }
}
```

### Global Setup vs Setup Files

| | Global Setup | Setup Files |
|---|---|---|
| Scope | Main process | Worker (same as tests) |
| Runs | Once before all tests | Before each test file |
| Access test APIs | No | Yes |
| Share data with tests | `provide`/`inject` | Direct globals |
| Use for | Server startup, DB seeding | Custom matchers, cleanup hooks |

## Concurrent Tests

```ts
describe.concurrent('parallel tests', () => {
  it('fast test 1', async ({ expect }) => { /* ... */ })
  it('fast test 2', async ({ expect }) => { /* ... */ })
})
```

Rules:
- Use `expect` from test context (not global) for snapshots and assertions.
- Each concurrent test gets its own `beforeEach`/`afterEach`.
- `beforeAll`/`afterAll` still run once, before/after all concurrent tests.

## Test Modifiers

```ts
it.skip('disabled test', () => {})
it.only('run only this', () => {})
it.todo('not implemented yet')
it.fails('expected to fail', () => { throw new Error() })

// Conditional:
it.skipIf(process.env.CI)('local only', () => {})
it.runIf(process.env.CI)('CI only', () => {})
```

## Parametrized Tests

```ts
it.each([
  { input: 1, expected: 2 },
  { input: 2, expected: 4 },
])('doubles $input to $expected', ({ input, expected }) => {
  expect(double(input)).toBe(expected)
})

// With template literal:
it.each`
  input | expected
  ${1}  | ${2}
  ${2}  | ${4}
`('doubles $input to $expected', ({ input, expected }) => {
  expect(double(input)).toBe(expected)
})
```

## Retry and Repeat

```ts
it('flaky test', { retry: 3 }, () => { /* retries up to 3 times on failure */ })
it('stress test', { repeats: 100 }, () => { /* runs 100 times */ })

// Via describe:
describe('flaky suite', { retry: 2 }, () => { /* ... */ })
```
