# Configuration

Depth on the config file, the option surface that changed across majors, projects, pools, and the experimental knobs.

## Where the config lives

`vitest.config.ts` **overrides** `vite.config.ts` entirely — the Vite file is ignored, not merged. Three shapes, in
descending order of how often they are right:

```ts
// vitest.config.ts — the default
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: {} })

// vite.config.ts — one config for app and tests
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
export default defineConfig({ test: {} })

// vitest.config.ts inheriting the Vite config deliberately
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'
export default mergeConfig(viteConfig, defineConfig({ test: {} }))
```

Vite options — `define`, `resolve.alias`, `plugins`, `server` — sit at the top level, never inside `test`. Defaults are
importable as `configDefaults` for extending rather than replacing a default array.

`process.env.VITEST` is set during a run, and `mode` is `test` or `benchmark`, which is how one `vite.config.ts`
branches without a second file.

## Options renamed or removed across majors

Every entry names the major that made the change. Anything a project still carries from the left column fails or is
ignored under Vitest 4.

- **`workspace` → `projects`** — deprecated in 3.2, removed in 4.0. `vitest.workspace.js` and `defineWorkspace` are
  gone; the array moves into `test.projects` in the root config. Vitest 4 accepts no separate file exporting projects.
- **`poolOptions.*` → top level** — removed in 4.0. `poolOptions.forks.execArgv` becomes `execArgv`,
  `poolOptions.threads.isolate` becomes `isolate`, `poolOptions.vmThreads.memoryLimit` becomes `vmMemoryLimit`.
- **`maxThreads` / `maxForks` → `maxWorkers`** — 4.0. The environment variables `VITEST_MAX_THREADS` and
  `VITEST_MAX_FORKS` become `VITEST_MAX_WORKERS`.
- **`singleThread` / `singleFork` → `maxWorkers: 1, isolate: false`** — 4.0. Tests that relied on module reset between
  files need a setup file calling `vi.resetModules()` in `beforeAll`.
- **`minWorkers`** — removed in 4.0; only `maxWorkers` ever affected scheduling.
- **`threads.useAtomics`** — removed in 4.0.
- **`coverage.all` and `coverage.extensions`** — removed in 4.0. The report now covers only files loaded during the run
  unless `coverage.include` says otherwise.
- **`coverage.ignoreEmptyLines`** — removed in 4.0; lines with no runtime code are never counted.
- **`coverage.experimentalAstAwareRemapping`** — removed in 4.0; AST-aware remapping is the only mode.
- **`poolMatchGlobs` and `environmentMatchGlobs`** — removed in 4.0. Express the same thing with `projects`.
- **`deps.external`, `deps.inline`, `deps.fallbackCJS`** — removed in 4.0 in favor of `server.deps.*`.
- **`deps.optimizer.web` → `deps.optimizer.client`** — 4.0.
- **`browser.testerScripts` → `browser.testerHtmlPath`** — removed in 4.0.
- **`browser.provider` string → provider factory** — 4.0. The factory comes from `@vitest/browser-playwright`,
  `@vitest/browser-webdriverio` or `@vitest/browser-preview`; the `@vitest/browser` package was dropped.
- **`basic` reporter** — removed in 4.0; equivalent to `['default', { summary: false }]`.
- **Reporter hooks `onCollected`, `onSpecsCollected`, `onPathsCollected`, `onTaskUpdate`, `onFinished`** — removed in
  4.0; the replacements landed in 3.0.
- **Options object as the third argument to `test` and `describe`** — removed in 4.0. It is the second argument; a bare
  timeout number as the last argument still works.
- **`VITE_NODE_DEPS_MODULE_DIRECTORIES` → `VITEST_MODULE_DIRECTORIES`** — 4.0, with the move from `vite-node` to Vite's
  Module Runner. `vitest/execute` was removed, and custom environments provide `viteEnvironment` instead of
  `transformMode`.

## Defaults worth knowing

- **`globals: false`** — no ambient `describe`/`it`/`expect`. Turning it on needs `"types": ["vitest/globals"]` in
  `tsconfig.json`, and some libraries (`@testing-library/react` auto-cleanup) require it.
- **`environment: 'node'`** — `jsdom`, `happy-dom` and `edge-runtime` are opt-in and each needs its package installed. A
  `// @vitest-environment jsdom` comment at the top of a file overrides it for that file.
- **`pool: 'forks'`**, **`isolate: true`**, **`fileParallelism: true`**.
- **`maxWorkers`** — all available parallelism when `watch` is off, half of it when on.
- **`clearMocks: false`, `mockReset: false`, `restoreMocks: false`** — each runs before every test when enabled.
- **`testTimeout: 5000`**, **`hookTimeout: 10000`**, **`retry: 0`**.
- **`watch: !process.env.CI && process.stdin.isTTY`**.
- **`allowOnly: !process.env.CI`** — a stray `.only` fails the run in CI rather than silently narrowing it.
- **`sequence.hooks: 'stack'`**.
- **`exclude`** — since 4.0, only `node_modules` and `.git`. Vitest 4 collects `dist`, `cypress`, `.cache`, `.output`,
  `.temp` and the common `*.config.js` files unless they are excluded. Prefer narrowing with `dir` over restoring the
  old list: `dir` limits the search instead of filtering its results.

## Projects

`test.projects` accepts glob patterns, config file paths, and inline config objects, mixed freely.

```ts
export default defineConfig({
  test: {
    projects: [
      'packages/*',
      '!packages/excluded',
      { extends: true, test: { name: 'jsdom', environment: 'jsdom' } },
      { test: { name: { label: 'node', color: 'green' }, environment: 'node' } },
    ],
  },
})
```

- Every project needs a unique `name`; without one Vitest assigns a number, or the nearest `package.json` name for a
  glob entry.
- **Nothing is inherited by default.** `extends: true` inherits the root config; `mergeConfig` with a shared file is the
  alternative. Use `defineProject` rather than `defineConfig` in a project file to get the narrower type.
- The root config is **not** a project unless listed. It still supplies global options and still runs its plugin hooks.
- `coverage`, `reporters` and `resolveSnapshotPath` are root-only — coverage covers the whole process, and only one
  reporter set exists.
- A glob that resolves to a file must be named `vitest.config.*` / `vite.config.*`, or `vitest.<name>.config.*` /
  `vite.<name>.config.*`.
- `--project <name>` filters the run and repeats for several.

Projects are the mechanism for per-directory `environment`, `isolate`, `fileParallelism` and `execArgv` — the capability
that `environmentMatchGlobs` and `poolMatchGlobs` used to provide badly.

## Pools

`pool` selects the worker mechanism. The default is `forks`.

- **`forks`** — one `child_process` per file. `process.chdir()` and other process APIs work. Survives native modules
  that are not thread-safe.
- **`threads`** — one `worker_thread` per file. Faster to start; process APIs are unavailable. Native addons (`prisma`,
  `bcrypt`, `canvas`) can segfault here. `Segmentation fault`, `Abort trap: 6` and `thread '<unnamed>' panicked` all
  mean: switch to `forks`.
- **`vmThreads` / `vmForks`** — a Node VM context per file inside a thread or process. Faster, and structurally leaky:
  native-module globals differ from the test environment's, so `err instanceof Error` can be `false` across that
  boundary; ES modules are cached forever with no API to clear them; global access is slower. `vmMemoryLimit` is the
  only lever. `isolate` has no effect, because the VM already isolates.

`execArgv` passes Node flags to the workers, per project if needed.

## Isolation

`isolate: true` gives each test file a fresh environment and forbids worker reuse. Turning it off reuses workers and is
the largest single speed lever for `node`-environment suites that hold no cross-file state.

What is lost: module registry, global mutations, `globalThis` stubs, and module-level singletons persist from one file
to the next in that worker. `worker`-scoped fixtures become genuinely shared. Setup files still re-execute per file for
their side effects, but the modules they import stay cached.

Scope the trade instead of taking it globally — one project with `isolate: false` for the pure files, another isolated
for the rest.

`fileParallelism: false` runs files one at a time and forces `maxWorkers` to `1`. It is the answer to a shared external
resource, not to a leak between files.

## Experimental options

Each is opt-in and version-anchored.

- **`experimental.viteModuleRunner: false`** (4.1) — runs tests with native `import` and no transforms at all. Faster
  startup and production-accurate module semantics; costs `import.meta.env`, Vite plugins, aliases, and the `istanbul`
  coverage provider. `vi.mock` and `vi.hoisted` still work through a Node loader hook (Node 22.15 and later), but
  `vi.spyOn` on a module namespace does not. Suited to server-side tests, not to `jsdom` component tests.
- **`experimental.fsModuleCache`** (4.0.11) — persists the transform cache to disk across runs, at
  `experimental.fsModuleCachePath`. Pays off when rerunning a few files with a large module graph; full-suite runs
  already amortize the cost through parallelism.
- **`experimental.nodeLoader`** (4.1) — the loader hook that makes mocking work when the module runner is off.
- **`experimental.importDurations`** (4.1) — reports slow imports, with `failOnDanger` to fail the run on them.
- **`experimental.openTelemetry`** (4.0.11), **`experimental.preParse`** (4.1.3), **`experimental.vcsProvider`**
  (4.1.1).

## Running and filtering

- **`vitest run`** — the form for CI and for any non-interactive caller. Bare `vitest` watches whenever stdin is a TTY
  and `CI` is unset, and that detection is not reliable enough to depend on.
- **`vitest <substring>`** — matches against the file path, not the file name.
- **`-t <regex>` / `--testNamePattern`** — matches the full name, `describe` titles included.
- **`vitest path/to/file.test.ts:10`** — runs the test containing line 10. Needs the full path with extension; ranges
  are unsupported.
- **`--tags-filter`** (4.1) — pytest-style expression over `tags`: `and`, `or`, `not`, `*`, and parentheses.
- **`--changed [ref]`** — files touched by uncommitted work, or since a commit or branch. `forceRerunTriggers` decides
  what forces a full run; the config file and `package.json` always do.
- **`--shard=i/n`** with `--reporter=blob`, then `vitest --merge-reports` — splits _files_, never cases. Blob output
  lands in `.vitest-reports`.
- **`--standalone`** — starts without running anything. Since 4.0 a filename argument alongside it runs immediately.
- **`--detect-async-leaks`** (4.1) — reports leaked handles and timers with source locations, through
  `node:async_hooks`. Adds overhead; a debugging tool, not a default.

## Tags

`tags` (4.1) declares labels in the config, with options that apply to every test carrying them.

```ts
tags: [
  { name: 'db', description: 'Database queries.', timeout: 60_000 },
  { name: 'flaky', retry: process.env.CI ? 3 : 0, timeout: 30_000, priority: 1 },
]
```

A tag not declared in the config fails the test before it starts, unless `strictTags` is off. Where several tags set the
same option, lower `priority` numbers win and untagged-priority entries merge first; options on the test itself outrank
every tag. Augment the `TestTags` interface to constrain the strings in TypeScript.

## In-source tests

`includeSource: ['src/**/*.{js,ts}']` collects `if (import.meta.vitest)` blocks inside source files, which reach private
state without exporting it. The production build must define `import.meta.vitest` as `undefined` so the bundler
eliminates the block — omitting that ships the tests.
