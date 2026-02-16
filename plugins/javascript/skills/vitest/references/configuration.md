# Vitest Configuration

Config structure, projects, environments, pools, and performance tuning.

## Config File

Vitest reads `vitest.config.ts` (highest priority) or falls back to `vite.config.ts`.
Use `defineConfig` from `'vitest/config'` — it includes Vitest type extensions:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Vitest options go here
  },
})
```

If using an existing `vite.config.ts`, add the triple-slash directive:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // ...
  },
})
```

### Merging Configs

When using separate Vitest and Vite configs, merge explicitly — Vitest config
**overrides**, it does not extend:

```ts
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.mjs'

export default mergeConfig(viteConfig, defineConfig({
  test: { /* ... */ },
}))
```

### Extending Defaults

```ts
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'packages/template/*'],
  },
})
```

## Key Options

### Test File Patterns

```ts
test: {
  include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],  // default
  exclude: ['**/node_modules/**', '**/.git/**'],     // default (v4+)
  dir: './src',  // limit search directory — faster than exclude
}
```

### Globals

Disabled by default. If enabled, update `tsconfig.json`:

```ts
// vitest.config.ts
test: { globals: true }
```

```json
// tsconfig.json
{ "compilerOptions": { "types": ["vitest/globals"] } }
```

### Environment

Controls the global environment for test files:

```ts
test: {
  environment: 'node',  // default: 'node' | 'jsdom' | 'happy-dom'
}
```

`jsdom` and `happy-dom` require separate installation:
`npm i -D happy-dom` or `npm i -D jsdom`.

### Timeouts

```ts
test: {
  testTimeout: 5000,   // default: 5000ms
  hookTimeout: 10000,  // default: 10000ms
}
```

### Mock Cleanup

```ts
test: {
  clearMocks: true,    // vi.clearAllMocks() before each test
  mockReset: true,     // vi.resetAllMocks() before each test
  restoreMocks: true,  // vi.restoreAllMocks() before each test
  unstubEnvs: true,    // vi.unstubAllEnvs() before each test
  unstubGlobals: true, // vi.unstubAllGlobals() before each test
}
```

**Recommendation:** Enable `restoreMocks: true` at minimum. It clears history and
restores `vi.spyOn` originals.

## Projects (Multi-Config)

Run different configurations within a single Vitest process. Replaces the deprecated
`workspace` option (v3.2+).

```ts
export default defineConfig({
  test: {
    projects: [
      'packages/*',                         // glob: each folder is a project
      {
        extends: true,                      // inherit root config
        test: {
          name: 'unit',
          include: ['**/*.unit.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
```

### Project Constraints

- Every project must have a unique `name`.
- Use `defineProject` (not `defineConfig`) in per-project config files for type safety.
- Root-only options (coverage, reporters) cannot be set per-project.

## Pools and Parallelism

### Pool Types

| Pool | Mechanism | When to Use |
|------|-----------|-------------|
| `forks` (default) | `child_process.fork` | Best compatibility, default choice |
| `threads` | `worker_threads` | Faster for large suites, some packages may break |
| `vmThreads` | VM context in threads | Isolation + performance (cannot disable isolation) |

```ts
test: {
  pool: 'forks',  // 'forks' | 'threads' | 'vmThreads'
}
```

### Parallelism Controls

```ts
test: {
  fileParallelism: true,  // run test files in parallel (default)
  maxWorkers: 4,          // limit worker count
  isolate: true,          // isolate each file (default)
}
```

**Performance tips:**
- `isolate: false` — skip per-file isolation for stateless tests (significant speedup).
- `pool: 'threads'` — faster than `forks` for large suites.
- `fileParallelism: false` — disable when debugging or tests share state.

### Concurrent Tests Within a File

```ts
describe.concurrent('suite', () => {
  it('test 1', async ({ expect }) => { /* ... */ })
  it('test 2', async ({ expect }) => { /* ... */ })
})
```

Use `expect` from the test context (destructured parameter) with concurrent tests
to ensure correct snapshot and assertion tracking.

## Environment Variables

Vitest autoloads only `VITE_`-prefixed vars from `.env` files. To load all:

```ts
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  test: {
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
```

## In-Source Testing

Test private functions alongside implementation:

```ts
// src/math.ts
export function add(a: number, b: number) { return a + b }

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest
  it('adds', () => { expect(add(1, 2)).toBe(3) })
}
```

Config:

```ts
test: { includeSource: ['src/**/*.{js,ts}'] }
```

For production builds, define `'import.meta.vitest': 'undefined'` to enable dead code
elimination. Add `"types": ["vitest/importMeta"]` to `tsconfig.json`.

Use in-source testing for small utilities only — use separate test files for complex
tests.

## Sharding (CI)

Split test files across machines:

```bash
vitest run --reporter=blob --shard=1/3  # machine 1
vitest run --reporter=blob --shard=2/3  # machine 2
vitest run --reporter=blob --shard=3/3  # machine 3
vitest run --merge-reports              # merge results
```

Vitest splits by file, not by test case. Combine with `--coverage` for merged
coverage reports.
