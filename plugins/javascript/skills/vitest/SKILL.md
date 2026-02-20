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

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Mocking | `references/mocking.md` | Full mocking rules, module mocking patterns, cleanup strategy |
| Assertions | `references/assertions.md` | Matcher tables, asymmetric matchers, soft assertions |
| Lifecycle | `references/lifecycle.md` | Hook execution order, test context, setup files, global setup |
| Configuration | `references/configuration.md` | Config file options, projects, pools, sharding, env vars |
| Coverage | `references/coverage.md` | Coverage providers, thresholds, ignore comments, performance |
| Jest migration | `references/jest-migration.md` | Jest API translation, key behavioral differences, Mocha/Sinon |

## Test Structure

1. **Import explicitly.** `import { describe, it, expect, vi } from 'vitest'` — do not
   rely on globals unless the project has `globals: true` configured.
2. **One concept per test.** Name tests by behavior: `'returns empty array when input
   is null'`, not `'test case 1'`.
3. **Use `describe` for grouping.** Group by unit (function, class, component), not by
   test type.
4. **Prefer `it` over `test`.** Both work, but `it` reads better inside `describe`:
   `describe('parseUrl', () => { it('extracts hostname', ...) })`.
5. **Use `it.each` / `describe.each`** for parametrized tests. Supports array form and
   template literal form with `$key` interpolation.
6. **Test modifiers:** `it.skip`, `it.only`, `it.todo`, `it.fails`, `it.skipIf(cond)`,
   `it.runIf(cond)`.
7. **Retry:** `it('name', { retry: 3 }, fn)`. **Repeat:** `it('name', { repeats: 100 }, fn)`.
8. **Concurrent tests:** `describe.concurrent(...)` — use `expect` from test context
   (destructured parameter) for correct snapshot/assertion tracking.

## Mocking

### Function Mocks

1. **`vi.fn()`** creates a standalone trackable mock. Optionally accepts implementation.
2. **`vi.spyOn(obj, 'method')`** wraps existing method while preserving original. Also
   supports `vi.spyOn(obj, 'prop', 'get')` for getters/setters.
3. **Prefer `vi.spyOn` over `vi.mock`** when you only need to observe or override a
   single export.

### Module Mocking

4. **`vi.mock()` is hoisted.** It moves to top of file regardless of where you write it.
   Always runs before imports.
5. **Factory must return an object** with explicit exports. ESM requires explicit `default`
   key: `vi.mock('./mod', () => ({ default: val, namedExport: vi.fn() }))`.
6. **Partial mocking with `importOriginal`:**
   `vi.mock(import('./api'), async (importOriginal) => ({ ...await importOriginal(), fetchUser: vi.fn() }))`.
7. **`vi.doMock()`** is not hoisted — runs at position. Only affects subsequent dynamic
   `import()` calls. Use when you need per-test mock behavior.
8. **`vi.mock` cannot intercept internal calls.** If `foo()` calls `bar()` in the same
   file, mocking `bar` externally does not affect `foo`. Refactor to separate modules or
   use dependency injection.

### Cleanup & Timers

9. **Always restore mocks.** Use `restoreMocks: true` in config (recommended) or
   `afterEach(() => vi.restoreAllMocks())`.
10. **Pair `vi.useFakeTimers()` with `vi.useRealTimers()`** — in `beforeEach`/`afterEach`
    or use `fakeTimers` config option.
11. **`vi.mocked(fn)`** narrows TypeScript types to mock types without runtime changes.

Full mocking rules (auto-mocking, spy mode, `vi.hoisted`, `__mocks__` directory, env/globals
stubbing, async helpers): see `references/mocking.md`.

## Assertions

### Value Matchers

| Matcher | Use When |
|---------|----------|
| `toBe(val)` | Primitives or same reference (`Object.is`) |
| `toEqual(val)` | Deep structural equality (ignores `undefined` in expected) |
| `toStrictEqual(val)` | Deep equality + checks `undefined` keys, sparse arrays, class types |
| `toMatchObject(subset)` | Object contains at least these properties |

### Core Rules

1. **Sync errors:** wrap in function: `expect(() => throwingFn()).toThrow('message')`.
2. **Async errors:** `await expect(asyncFn()).rejects.toThrow('message')`.
3. **Always `await` async assertions.** `await expect(promise).resolves.toEqual(...)` — an
   un-awaited assertion silently passes.
4. **`expect.poll(() => value, { timeout, interval })`** — retries assertion until pass or
   timeout. Prefer over manual `waitFor` loops.
5. **`expect.soft(val)`** continues after failure, reports all errors at end.
6. **Asymmetric matchers** inside `toEqual`, `toHaveBeenCalledWith`: `expect.any(Number)`,
   `expect.arrayContaining([...])`, `expect.objectContaining({})`,
   `expect.stringMatching(/regex/)`. Negate with `expect.not.*`.
7. **`expect.assertions(n)`** — exactly n assertions must run.
   **`expect.hasAssertions()`** — at least one. Guard against missing assertions in
   async code.

Truthiness, number, string/array/object matchers, type checks, spy assertions, custom
error messages, `expect.unreachable`: see `references/assertions.md`.

## Snapshots

1. **File snapshots:** `expect(val).toMatchSnapshot()` — writes to `.snap` file.
2. **Inline snapshots:** `expect(val).toMatchInlineSnapshot(\`"expected"\`)` — Vitest
   auto-updates the string argument.
3. **Property matchers for volatile data:** `toMatchSnapshot({ id: expect.any(String) })`.
   Never snapshot timestamps, random IDs, or other volatile data without matchers.
4. **Prefer inline snapshots** for small values — easier to review.
5. **Avoid large snapshots** — they become rubber-stamp reviews.
6. **Commit snapshot files.** Review them in PRs like any other code.
7. **Update with `vitest -u`** or press `u` in watch mode.

## Lifecycle

### Core Rules

1. **`beforeAll`/`afterAll`** run once per `describe` block (or per file at top level).
2. **`beforeEach`/`afterEach`** run before/after every test in current scope.
3. **Teardown via return value:** if `beforeAll` or `beforeEach` returns a function, it
   runs as teardown. **Vitest-specific, not in Jest.** Be careful not to accidentally
   return values — wrap in braces: `beforeEach(() => { setupFn() })`.
4. **`onTestFinished(fn)`** — register cleanup inside a test. Always runs regardless of
   pass/fail.
5. **`onTestFailed(fn)`** — runs only on failure. Useful for diagnostics.

### Setup Files

6. **`setupFiles: ['./test/setup.ts']`** — runs before each test file in the same process.
   Use for global hooks, custom matchers, shared setup.
7. **`globalSetup: ['./test/global-setup.ts']`** — runs once before any test workers.
   Use for expensive one-time setup (database seeding, server startup). Return a function
   for teardown.

Hook execution order, test context, hook order config, `provide`/`inject`, and
global vs setup file comparison: see `references/lifecycle.md`.

## Configuration

1. **Prefer `vitest.config.ts`** with `defineConfig` from `'vitest/config'`. Inherits Vite
   plugins and aliases automatically.
2. **If using `vite.config.ts`**, add `/// <reference types="vitest/config" />` directive.
3. **Use `projects`** (v3.2+, replaces deprecated `workspace`) for multi-environment setups.
   Every project must have a unique `name`.

Config file merging, key options table, pools and parallelism, environment variables,
in-source testing, and sharding: see `references/configuration.md`.

## Coverage

Set `coverage.include` to catch uncovered files. Use `v8` provider (default, recommended).
Set thresholds in config. Run coverage only in CI, not in watch mode.

Provider comparison, reporters, ignore comments, and performance tips:
see `references/coverage.md`.

## Extending Matchers

Define via `expect.extend({ matcherName(received, ...args) {} })`. Return `{ pass, message }`.
Add TypeScript declarations via `interface Matchers<T>` in `vitest.d.ts`.

Matcher context, TypeScript setup, and diff output: see `references/assertions.md`.

## Jest Migration

Replace `jest.*` with `vi.*`. Key differences: mock factory must return object with
explicit exports, `mockReset` restores original impl, auto-mocking requires explicit
`vi.mock()` call, hook return values are teardown functions.

Full API translation table, behavioral differences, and Mocha/Sinon migration:
see `references/jest-migration.md`.

## Application

When **writing** tests:
- Apply all conventions silently — don't narrate each rule being followed.
- Match the project's existing test style (naming, structure, assertion library).
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once.

When **reviewing** tests:
- Cite the specific issue and show the fix inline.
- Don't lecture — state what's wrong and how to fix it.

## Integration

The **javascript** skill governs language choices; this skill governs Vitest testing
decisions. Activate the relevant runtime skill (**nodejs** or **bun**) for
runtime-specific behavior.

**Test behavior, not implementation. When in doubt, mock less.**
