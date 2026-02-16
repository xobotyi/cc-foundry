---
name: vitest
description: >-
  Vitest testing framework conventions and practices. Invoke whenever task involves any
  interaction with Vitest — writing tests, configuring vitest.config.ts, mocking modules,
  debugging test failures, snapshots, coverage, or migrating from Jest.
---

# Vitest

**Test behavior, not implementation. Mock boundaries, not internals.**

Vitest is a Vite-native test framework with Jest-compatible APIs. It shares your app's
Vite config (aliases, plugins, transforms) so tests run against the same code you ship.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| vitest.config.ts, defineConfig, projects, environments, pools | [configuration.md](references/configuration.md) |
| vi.fn, vi.mock, vi.spyOn, module mocking, hoisting, timers, pitfalls | [mocking.md](references/mocking.md) |
| expect API, matchers, extending matchers, snapshots, async assertions | [assertions.md](references/assertions.md) |
| beforeAll/afterAll, beforeEach/afterEach, setup files, test context | [lifecycle.md](references/lifecycle.md) |
| v8/istanbul providers, include/exclude, ignoring code, reporters | [coverage.md](references/coverage.md) |
| Jest-to-Vitest migration, key differences, Mocha+Sinon migration | [jest-migration.md](references/jest-migration.md) |

Read the relevant reference before writing or reviewing tests.

## Core Rules

### Test Structure

1. **Import explicitly.** `import { describe, it, expect, vi } from 'vitest'` — do not
   rely on globals unless the project has `globals: true` configured.
2. **One concept per test.** Name tests by behavior: `'returns empty array when input
   is null'`, not `'test case 1'`.
3. **Use `describe` for grouping.** Group by unit (function, class, component), not by
   test type.
4. **Prefer `it` over `test`.** Both work, but `it` reads better inside `describe`:
   `describe('parseUrl', () => { it('extracts hostname', ...) })`.

### Mocking

1. **Mock at boundaries.** Mock HTTP, file system, databases, timers — not your own code.
2. **`vi.mock` is hoisted.** It moves to the top of the file regardless of where you
   write it. Use `vi.hoisted()` to define variables referenced inside the factory.
3. **Prefer `vi.spyOn` over `vi.mock`** when you only need to observe or override a
   single export. Import the module as a namespace: `import * as mod from './mod'`.
4. **Always restore mocks.** Use `afterEach(() => vi.restoreAllMocks())` or set
   `restoreMocks: true` in config.
5. **`vi.mock` cannot intercept internal calls.** If `foo()` calls `bar()` in the same
   file, mocking `bar` externally does not affect `foo`. Refactor or use dependency
   injection.

### Assertions

1. **`toBe` for primitives, `toEqual` for objects.** `toStrictEqual` when you care about
   `undefined` keys and class types.
2. **Await async assertions.** `await expect(promise).resolves.toEqual(...)` — an
   un-awaited assertion silently passes.
3. **Use `expect.soft` for multi-check tests.** Reports all failures instead of stopping
   at the first.
4. **`expect.poll` for async conditions.** Retries the assertion until it passes or
   times out — prefer over manual `waitFor` loops.

### Configuration

1. **Prefer `vitest.config.ts`** with `defineConfig` from `'vitest/config'`. It inherits
   Vite plugins and aliases automatically.
2. **Use `projects` for multi-environment setups.** Separate unit (node) and browser
   tests into distinct projects with different `environment` or `browser` settings.
3. **Coverage: set `coverage.include`.** Without it, only files loaded during tests
   appear in reports. Define `include: ['src/**/*.{ts,tsx}']` to catch uncovered files.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `vi.mock('./mod', () => 'value')` | `vi.mock('./mod', () => ({ default: 'value' }))` — ESM requires object with explicit exports |
| `expect(asyncFn()).resolves.toBe(x)` (no await) | `await expect(asyncFn()).resolves.toBe(x)` |
| Mock everything in a module | Mock only what you need with `importOriginal` or `vi.spyOn` |
| `vi.mock` inside `beforeEach` expecting per-test behavior | Use `vi.doMock` (not hoisted) or control behavior via `mockReturnValueOnce` |
| `jest.fn()` | `vi.fn()` — Vitest uses `vi`, not `jest` |
| `jest.requireActual(...)` | `await vi.importActual(...)` — always async in Vitest |
| Inline `vi.useFakeTimers()` without cleanup | Pair with `vi.useRealTimers()` in `afterEach`, or use `fakeTimers` config |
| `globals: true` without tsconfig update | Add `"types": ["vitest/globals"]` to `tsconfig.json` `compilerOptions` |
| Test internal function calls within the same module | Refactor to separate modules or use dependency injection |
| `snapshot` for volatile data (timestamps, IDs) | Use `expect.any(Number)` or property matchers: `toMatchSnapshot({ id: expect.any(String) })` |

## Application

When **writing** tests:
- Apply all conventions silently — don't narrate each rule being followed.
- Match the project's existing test style (naming, structure, assertion library).
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once.

When **reviewing** tests:
- Cite the specific issue and show the fix inline.
- Don't lecture — state what's wrong and how to fix it.

## Toolchain

- **`vitest`**: run tests. `vitest` (watch mode), `vitest run` (single run).
- **`vitest --coverage`**: generate coverage report. Requires `@vitest/coverage-v8`
  or `@vitest/coverage-istanbul`.
- **`vitest --ui`**: open browser-based test UI. Requires `@vitest/ui`.
- **`vitest typecheck`**: run type-level tests with `expectTypeOf`.

## Integration

This skill provides Vitest-specific conventions alongside the **javascript** and
**typescript** skills:

1. **JavaScript/TypeScript** — Language conventions and patterns
2. **Vitest** — Testing framework conventions and APIs
3. **Runtime** (Node.js/Bun) — Runtime-specific APIs and behavior

The language skills govern code style; this skill governs testing choices.

**Test behavior, not implementation. When in doubt, mock less.**
