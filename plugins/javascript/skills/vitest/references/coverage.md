# Coverage

Depth on the two providers, what `coverage.include` actually controls, thresholds, and the ignore-hint syntax that
survives transpilation.

## Providers

Both are separate packages and neither is installed with Vitest. `provider: 'v8'` is the default and needs
`@vitest/coverage-v8`; `provider: 'istanbul'` needs `@vitest/coverage-istanbul`. Vitest offers to install the missing
one; `VITEST_SKIP_INSTALL_CHECKS=1` suppresses that.

**`v8`** collects coverage at runtime through `node:inspector` and the Chrome DevTools Protocol, with no
pre-instrumentation. Results are remapped to source with AST analysis rather than `v8-to-istanbul`, so the reports match
Istanbul's accuracy. Vitest 3.2 added that remapping behind `coverage.experimentalAstAwareRemapping`; Vitest 4.0 removed
the flag and made it the only mode. Faster and lighter than Istanbul, and the default for that reason. It cannot limit
collection to specific modules, so a run that loads very many modules can be slower than Istanbul. It requires a V8
runtime — not Firefox, not Bun, and not Cloudflare Workers, which do not expose V8 coverage through the profiler.

**`istanbul`** rewrites source files with counter statements before running them. It works on any JavaScript runtime, it
can instrument a chosen subset of files, and it has thirteen years of production use behind it. It pays for that in a
transpile step, slower execution, larger files and higher memory.

Choose `v8` unless the runtime is not V8, or unless a measurement shows the module count is hurting.

## What appears in the report

Vitest 4 removed `coverage.all`. The report contains **only files loaded during the run** unless `coverage.include` says
otherwise.

This is the single most common coverage surprise on a Vitest 4 upgrade: a source file no test imports vanishes from the
report entirely, and the percentage rises.

```ts
coverage: {
  include: ['src/**/*.{ts,tsx}'], // uncovered files under src appear at 0%
  exclude: ['**/generated/**'],   // applied to what include matched
}
```

`exclude` filters the set `include` produced; without `include` it filters the loaded files. `coverage.extensions` was
removed in 4.0 along with `all` — the glob carries the extensions now.

Related switches: `allowExternal` admits files outside the project root, `excludeAfterRemap` re-applies `exclude` after
source-map remapping, `skipFull` hides fully covered files, `coverage.changed` (Vitest 4.1) limits the report to changed
files while still running every test — unlike `--changed`, which narrows the run itself — and `reportOnFailure` writes a
report even when tests fail.

## Thresholds

`coverage.thresholds` takes `lines`, `functions`, `branches` and `statements`. A positive number is a minimum
percentage; a **negative number is a maximum count of uncovered items**, which is the form that ratchets a legacy
codebase without breaking whenever the file count changes.

```ts
thresholds: {
  functions: 90,   // at least 90% of functions
  lines: -10,      // at most 10 uncovered lines
  perFile: true,   // applied per file rather than to the total
}
```

`autoUpdate: true` rewrites the thresholds into the config file whenever coverage improves, which keeps a ratchet
without manual edits. It rewrites a checked-in file, so it belongs in local runs rather than CI.

## Ignore hints

Each provider has its own comment prefix — `/* v8 ignore ... */` and `/* istanbul ignore ... */` — with `if`, `else`,
`next`, `file`, and `start`/`stop` forms. Vitest 4.0 dropped the `start`/`stop` pair; Vitest 4.1 reimplemented it for
both providers.

TypeScript is transpiled by esbuild, which **strips every comment that is not a legal comment**. An ignore hint written
plainly disappears before the provider sees it. Add `-- @preserve` so it survives:

```ts
/* v8 ignore if -- @preserve */
if (unreachableInTests) {
}

/* v8 ignore start -- @preserve */
// ...
/* v8 ignore stop -- @preserve */
```

The preserved comment can also reach the production bundle. `coverage.ignoreClassMethods` names methods to skip without
a comment at all, and Vitest 4 made it work for the v8 provider too.

## Running coverage

`--coverage` on the CLI, or `coverage.enabled: true`. Coverage is a root-only option — a project config cannot set it,
because collection spans the whole process.

Keep it out of watch mode: instrumentation and report generation cost time on every rerun and answer a question nobody
asks mid-edit.

Reporters (`coverage.reporter`) default to a set including `text` and `html`. `coverage.htmlDir` points the HTML output
elsewhere; `lcov` is the format most external services ingest.

When Vitest detects it is running inside an AI coding agent it trims the `text` reporter automatically: `skipFull: true`
hides fully covered files and `text-summary` is appended so totals stay visible. Explicitly configured reporters are
never removed.

## Sharded runs

A shard covers only the files it ran, so a per-shard report is never the project's coverage. Run each shard with
`--reporter=blob --shard=i/n`, collect `.vitest-reports` from every machine, and produce the report once with
`vitest --merge-reports --reporter=<name>`. Blob output omits file-based attachments; copy `attachmentsDir` alongside it
when tests write any.
