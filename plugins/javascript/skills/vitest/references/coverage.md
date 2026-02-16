# Vitest Coverage

Providers, configuration, including/excluding files, and ignoring code.

## Providers

| Provider | Package | Mechanism | Recommendation |
|----------|---------|-----------|----------------|
| `v8` (default) | `@vitest/coverage-v8` | V8 engine's native coverage | Recommended — fast, accurate since v3.2 |
| `istanbul` | `@vitest/coverage-istanbul` | Babel instrumentation | Use when not on V8 (Firefox, Bun) |

Install the provider package:

```bash
npm i -D @vitest/coverage-v8
# or
npm i -D @vitest/coverage-istanbul
```

## Basic Setup

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',  // default
      enabled: true,    // or use --coverage CLI flag
    },
  },
})
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "coverage": "vitest run --coverage"
  }
}
```

## Including and Excluding Files

**Critical:** Without `coverage.include`, only files loaded during tests appear in
the report. Set it to catch uncovered files:

```ts
coverage: {
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['**/types/**', '**/*.d.ts'],
}
```

Vitest automatically excludes test files (matching `test.include` patterns) from
coverage.

## Reporters

```ts
coverage: {
  reporter: ['text', 'html', 'lcov'],  // multiple reporters
}
```

Common reporters: `text` (terminal), `html` (browser), `lcov` (CI integration),
`json`, `clover`.

The `html` reporter integrates with Vitest UI — open the Coverage tab to browse
results.

## Thresholds

Enforce minimum coverage levels:

```ts
coverage: {
  thresholds: {
    lines: 80,
    branches: 80,
    functions: 80,
    statements: 80,
  },
}
```

The test run fails if any threshold is not met.

## Ignoring Code

Both providers support ignore comments. In TypeScript, add `@preserve` to prevent
esbuild from stripping the comment:

### V8 Ignore Hints

```ts
/* v8 ignore next -- @preserve */
function debugOnly() { /* ignored */ }

/* v8 ignore start -- @preserve */
if (process.env.DEBUG) {
  console.log('debug info')
}
/* v8 ignore stop -- @preserve */

/* v8 ignore file -- @preserve */
// Entire file excluded
```

### Istanbul Ignore Hints

```ts
/* istanbul ignore next -- @preserve */
if (process.env.DEBUG) { /* ignored */ }

/* istanbul ignore start -- @preserve */
// ... ignored block ...
/* istanbul ignore stop -- @preserve */
```

## V8 vs Istanbul Comparison

| Factor | V8 | Istanbul |
|--------|-----|---------|
| Speed | Faster (no instrumentation) | Slower (Babel transform step) |
| Memory | Lower | Higher |
| Accuracy | Identical to Istanbul since v3.2 | Battle-tested since 2012 |
| Runtime | V8-based only (Node, Chrome) | Any JS runtime |
| File limiting | Cannot limit — instruments all modules | Can limit to specific files |

**Default to V8** unless targeting a non-V8 runtime.

## Performance Tips

- Set `coverage.include` to limit the scope — avoids processing unrelated files.
- Use `v8` provider — no pre-instrumentation step.
- Run coverage only in CI, not in watch mode:
  ```json
  { "scripts": { "coverage": "vitest run --coverage" } }
  ```
- For very large projects, consider sharding with merged coverage:
  ```bash
  vitest run --shard=1/3 --coverage
  vitest run --shard=2/3 --coverage
  vitest run --shard=3/3 --coverage
  vitest run --merge-reports --coverage
  ```
