---
name: nodejs
description: >-
  Write and review Node.js: the module system, package manifest, streams, event loop, process and worker lifecycle,
  the permission model, native TypeScript execution, `node:test`, and the runtime version `engines.node` permits.
when_to_use: >-
  Invoke whenever Node.js runtime code is touched at all — writing, reviewing, refactoring, or debugging a server, a
  CLI, a script, or a `package.json`, and whenever a project's Node floor is raised. Also invoke on the symptoms:
  `ERR_REQUIRE_ESM`, `ERR_REQUIRE_ASYNC_MODULE`, or `ERR_MODULE_NOT_FOUND`; an import that resolves in the bundler and
  not in Node; a `.ts` file Node refuses to run; a process that hangs at exit or dies with no stack; a stream that
  buffers without bound; a leaked HTTP connection; `ERR_ACCESS_DENIED`; a `node:test` mock or fake timer that does not
  take effect; or a flag that works on one Node major and not the next. Covers the Node runtime and `node:test`;
  JavaScript semantics belong to the javascript skill, types to typescript, the Bun runtime to bun, and Vitest to
  vitest.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

One thread runs every callback in a Node process, so anything that holds it holds the whole program. Three biases decide
most calls:

- **The `engines.node` floor decides what may be written**, not the `node` binary on the machine.
- **Read an API's stability index before depending on it.** Node ships an API for years before committing to it, and an
  experimental one can be deleted without a deprecation cycle.
- **Check the standard library before adding a dependency.** It absorbed `fetch`, a test runner, a file watcher, `glob`,
  SQLite, `.env` parsing, a script runner, and TypeScript execution.

## Node Version

`engines.node` in `package.json` is the floor a project claims. Read it before writing code and never reach for an API
above it. Nothing enforces it at run time — Node never reads the field, and npm checks it only under
`engine-strict=true` — so the floor holds by discipline and by CI running the oldest major it names.

**The installed binary is not the floor.** `node --version` reports what one machine has, not what the project supports.

Support windows, which decide whether a floor is defensible:

- **20** — end of life 2026-04-30. A floor of `>=20` claims a runtime that receives no fixes at all.
- **22** — maintenance from 2025-10-21, end of life 2027-04-30. Security and critical fixes only; no new capability.
- **24** — Active LTS from 2025-10-28, maintenance from 2026-10-20, end of life 2028-04-30.
- **26** — released 2026-05-05, Active LTS from 2026-10-28, end of life 2029-04-30.

Floor version per feature — the APIs and behavior changes that decide what may be written.

- **20.19.0** — `require(esm)` unflagged on the 20 line; syntax detection on by default
- **22.0.0** — `node --run`; `fs.glob`; `WebSocket` global; watch mode Stable; `assert { type: 'json' }` removed
- **22.12.0** — `require(esm)` unflagged on the 22 line; JSON modules Stable
- **22.13.0** — Permission Model Stable and `--permission` accepted; `node:sqlite` unflagged
- **22.15.0** — `module.registerHooks()`
- **22.16.0** — `import.meta.dirname` and `import.meta.filename` Stable; `--experimental-config-file`
- **22.18.0** — type stripping on by default; `import.meta.main`
- **22.21.0** — `--env-file` Stable; `NODE_USE_ENV_PROXY`
- **24.0.0** — `--experimental-permission` renamed `--permission`; `AsyncLocalStorage` on `AsyncContextFrame`;
  `URLPattern` global; test runner awaits subtests; `url.parse()` runtime-deprecated (DEP0169); `args` with
  `{ shell: true }` runtime-deprecated (DEP0190)
- **24.12.0** — type stripping Stable
- **24.20.0** — `--permission-audit`
- **26.0.0** — `Temporal` global; `module.register()` runtime-deprecated (DEP0205); `--experimental-transform-types`
  removed; `node:_stream_*` removed. It also inherits what 25 added and neither 22 nor 24 received: `--allow-net`, and
  with it network confinement under `--permission`
- **26.3.0** — `permission.drop()`

**No odd major is a defensible floor.** Node 21, 23, and 25 are end of life — 25 since 2026-06-01 — so a feature that
arrived on one is reachable only from the LTS major above it.

Read [`${CLAUDE_SKILL_DIR}/references/versions/node-NN.md`] — one file per LTS major: `node-20.md`, `node-22.md`,
`node-24.md`, `node-26.md` — when writing against a feature near the floor, and whenever raising the floor. Each carries
what its major added, the stability each addition holds, the behavior it changed, and the traps it introduced.

## Stability Index

Every documented API carries one, and it decides how the API may be used, not merely how finished it is.

- **2 - Stable** — protected by semver. Safe in a published library's surface.
- **1 - Experimental** — outside semver, and the level most unfinished APIs print. Three subdivisions refine it: **1.2 -
  Release candidate**, where no further breaking change is anticipated but none is ruled out; **1.1 - Active
  development**, nearing minimum viability; **1.0 - Early development**, unfinished and expecting substantial change.
- **3 - Legacy** — semver-protected and unmaintained. Bugs in it are not fixed. Migrate rather than report.
- **0 - Deprecated** — carries a DEP number and a migration.

What follows from the index:

- **An experimental API can be removed with no deprecation cycle.** `--experimental-transform-types` shipped in 22.7.0
  and was deleted in 26.0.0, taking the runtime path for TypeScript enums with it.
- **Never put an experimental API in a published library's public surface.** A consumer cannot see that the risk was
  taken on their behalf.
- **The index moves per major.** `TracingChannel` is Stable from 26.8.0 and experimental on 24; `module.register()` is
  supported on 24 and runtime-deprecated on 26. State the index for the floor, not for the machine.
- **Check the index rather than the flag.** Type stripping needs no flag from 22.18.0 and was not Stable until 24.12.0;
  an unflagged feature is not a committed one.

## Module System

- **Declare `"type"` in every `package.json`.** Without it, a `.js` or extensionless file is parsed as CommonJS and
  re-parsed as an ES module when that fails. The retry costs startup time on every ES module and turns a real syntax
  error into a confusing module-system error.
- **`.mjs` and `.cjs` override `"type"`; nothing overrides them.** Use them to place one file of the other kind inside a
  package, never as the default.
- **Node's resolver performs no extension search and no directory-index lookup.** It loads the specifier as written, so
  `./startup` resolves in a bundler and throws `ERR_MODULE_NOT_FOUND` here.
- **Import a builtin through `node:`** — `import fs from 'node:fs/promises'`. The prefix cannot be shadowed by a package
  of the same name, and `node:test` and `node:sqlite` resolve under no other specifier.
- **`import.meta.dirname` and `import.meta.filename` replace `__dirname` and `__filename`**, and exist only on `file:`
  modules.
- **The `assert` import-attribute form was removed in 22.0.0 and throws.** Only `with` parses.
- **`require()` of an ES module works** from 20.19.0 and 22.12.0, and throws `ERR_REQUIRE_ASYNC_MODULE` when anything in
  the graph uses top-level `await`. That is a property of the whole graph, so a transitive dependency can break a caller
  that did not change.
- **Reach for `module.registerHooks()`, not `module.register()`.** The latter is runtime-deprecated in 26.0.0 (DEP0205)
  and needs `--allow-worker` under the Permission Model, because its hooks run on a worker thread.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/modules.md`] when a specifier resolves in a bundler and not in Node,
when writing a loader hook, or when repeated start-up cost is worth caching — it carries what decides a file's module
system, the specifier rules, the two hook APIs, and the compile cache.

## Package Manifest

- **`"exports"` seals the package.** Once present, nothing outside the map is importable, deep relative paths included.
  Add it deliberately: it is the only way to keep internals private, and adding it to a published package is a breaking
  change.
- **Condition order in the map is the match order.** Earlier keys win, so write the most specific first.
- **`"default"` goes last and `"types"` first.** `"default"` matches every caller, and `"types"` is a convention of the
  type systems rather than a condition Node reads.
- **`"import"` and `"require"` describe the caller's syntax, not the target's format.** A `.mjs` file behind `"require"`
  is legal and loads through `require(esm)`.
- **Use `"module-sync"` instead of a dual build** where one ES module must serve both callers. Two builds of one package
  give a process two class identities and two copies of every module-level singleton.
- **`"imports"` keys start with `#`** and are the only path-alias mechanism that survives `node file.ts`, because
  nothing in the runtime reads `tsconfig.json`.
- **Every `"exports"` target starts with `./`.** Absolute paths, `file:` URLs, `../`, and any `.`, `..`, or
  `node_modules` segment are rejected with `ERR_INVALID_PACKAGE_TARGET`.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/modules.md`] when designing an `"exports"` map or publishing a package
that must serve both `require` and `import` — it carries the condition-matching rules, the target-path restrictions, and
the dual-package hazard.

## TypeScript Execution

Node erases type syntax and runs the result. It does not compile, does not type-check, and does not read
`tsconfig.json`.

- **Keep `tsc --noEmit` in the verification path.** Running a `.ts` file proves it parses, nothing more.
- **`import type` is mandatory for type-only imports.** Erasure is syntactic: without the keyword the import survives as
  a value import and fails at run time. `verbatimModuleSyntax: true` makes `tsc` enforce it.
- **Write the real extension in the specifier** — `import './x.ts'`, and `require('./x.ts')` in CommonJS. Node loads the
  file that exists; it does not rewrite `.js` to `.ts`.
- **Enums, `namespace` with runtime code, parameter properties, import aliases, and decorators raise
  `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`.** `--experimental-transform-types` handled some of them and was removed in
  26.0.0. Set `erasableSyntaxOnly: true` so the compiler rejects them first.
- **A dependency shipping `.ts` files cannot be loaded.** Node refuses TypeScript under any `node_modules` path,
  deliberately and at every version.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/typescript-execution.md`] when a `.ts` file fails to run, when
choosing between type stripping and a compiler, or when writing the `tsconfig.json` that matches the runtime — it
carries the flag history, the full refused-syntax list, and the matching compiler options.

## Blocking

- **No synchronous file, process, or crypto call on a request path.** `readFileSync`, `execSync`, `pbkdf2Sync`,
  `inflateSync` belong in CLIs, build scripts, and startup code that runs before the server listens.
- **Bound every input before parsing it.** `JSON.parse` is synchronous and scales with input size, so an unbounded body
  is a denial of service that needs no bug.
- **Never match a backtracking pattern against user input.** Nested quantifiers, overlapping alternations, and
  backreferences with repetition give one request the whole thread. Use `indexOf` or a linear engine.
- **Recursive `process.nextTick` starves I/O.** The tick queue drains to exhaustion before the loop advances, so a
  self-scheduling `nextTick` stops the process serving traffic while looking idle. `queueMicrotask` has the same
  property one level down.
- **`setImmediate` beats `setTimeout(fn, 0)` inside an I/O callback and races it at the top level.** Never encode either
  ordering as a dependency.
- **Partition long synchronous loops** with `setImmediate` between chunks, or move them to a worker.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/concurrency.md`] when a process stops serving traffic while looking
idle, or when one slow operation surfaces as an unrelated failure — it carries the loop phase order and the list of work
that shares the libuv thread pool.

## Streams

- **Compose with `pipeline` from `node:stream/promises`.** A `.pipe()` chain propagates neither errors nor destruction,
  so one failure leaves the rest of the chain open with its descriptors held.
- **Respect the return value of `write()`.** `false` means the buffer is over `highWaterMark`; keep writing and memory
  grows without any error being raised. `pipeline` and `for await` handle this.
- **`highWaterMark` is a threshold, not a cap.** A single write larger than it still buffers in full, and in object mode
  the count is objects rather than bytes.
- **Destroy a stream on the error path.** `stream.destroy(err)` releases the descriptor or socket; an undestroyed stream
  leaks it.
- **An unhandled `'error'` event crashes the process.** Every stream outside a `pipeline` needs a listener.
- **`readable.map`, `filter`, `take`, `reduce` and the rest are Experimental**, on every major through 26. They read
  like committed API and are not. Keep them out of a library's surface.
- **Do not stream data already in memory.** Streams earn their cost on unbounded or arriving-over-time input.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/streams.md`] when crossing between Node streams and web streams, when
writing a custom `Readable`, `Writable`, or `Transform`, or when tuning `highWaterMark` — it carries the interop matrix,
the platform-dependent defaults, and the whole-stream consumers.

## Errors and Exit

- **Set `process.exitCode` and let the loop drain.** `process.exit()` terminates immediately, and a write to a pipe or a
  socket may still be in flight — measured on 26.2.0/macOS, 512 KiB written to a pipe arrives as 64 KiB. A write to a
  file is synchronous and survives, which is why the loss reads as intermittent.
- **Match on `error.code`, never on the message.** Every built-in error carries one; messages change between minors.
- **`util.inspect` renders a `cause` chain**, so an error chained with `{ cause: err }` reaches a Node logger intact
  without the caller unwrapping it.
- **Never resume after `'uncaughtException'`.** Installing the listener disables the crash and leaves the process
  running with unknown state. Log, flush, exit.
- **An unhandled rejection is fatal by default.** Do not add `--unhandled-rejections=warn` to make a test suite pass.
- **`'exit'` listeners run synchronously only.** Anything asynchronous scheduled there never runs.
- **Cancel with `AbortSignal`.** `fetch`, `fs/promises`, `timers/promises`, `pipeline`, `stream.addAbortSignal`, and
  `events.on` all take `{ signal }`.
- **A cancelled call does not report itself the same way twice.** Node's own APIs reject with an `AbortError` carrying
  `code: 'ABORT_ERR'`; `fetch` rejects with a `DOMException` whose `code` is the number `20`; and a `fetch` deadline
  built from `AbortSignal.timeout(ms)` rejects with `name === 'TimeoutError'`, not `'AbortError'` — measured on 26.2.0.
  Test `signal.aborted` where the signal is in scope, and `err.name === 'AbortError' || err.name === 'TimeoutError'`
  where it is not.
- **Set the HTTP server timeouts.** `requestTimeout` defaults to 300000 ms and `keepAliveTimeout` to 5000 ms; the latter
  must be shorter than the idle timeout of any proxy in front, or the proxy reuses a socket Node has closed.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/lifecycle.md`] when writing a graceful shutdown, when a process
refuses to exit or exits without flushing, or when auditing server timeouts — it carries the shutdown sequence, the
deprecation flags, and the timeout defaults.

## Async Context and Diagnostics

- **`run(store, fn)` is the only Stable way to enter a store.** `enterWith` and `withScope` are Experimental, and
  `enterWith` applies for the rest of the current synchronous execution rather than for a scope — called inside one
  event handler it leaks into every later handler on the same emit.
- **Instrument with `diagnostics_channel`, not with a logger call.** Publishing to a channel with no subscriber costs
  nothing measurable, so the instrumentation can ship enabled.
- **Create a channel once at module top level** and guard expensive payload construction with `channel.hasSubscribers`.
- **Subscribers receive the message object by reference.** A subscriber that mutates it changes what the publisher and
  later subscribers see.
- **Measure loop lag with `perf_hooks.monitorEventLoopDelay()`**, not with a `setTimeout` drift estimate.
- **Get a stack out of a native crash with `--report-on-fatalerror`.** No JavaScript handler runs at that point.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/observability.md`] when context goes missing across an async boundary,
when adding tracing to a library, or when picking a profiling flag — it carries the context-loss diagnosis, the
`TracingChannel` contract, and the list of channels Node publishes itself.

## HTTP Client

- **Consume or cancel every response body**, on the error path too. undici does not release the connection until the
  body is read or cancelled, and the garbage collector is not prompt enough to save it — a pool exhausted this way
  stalls rather than errors.
- **`fetch` does not reject on a non-2xx status.** Check `res.ok`.
- **`fetch` has no total timeout.** Pass `signal: AbortSignal.timeout(ms)`, combined with the caller's signal through
  `AbortSignal.any`.
- **`http.Agent` options do not reach `fetch`.** It uses undici's global dispatcher; change it with a `dispatcher`
  option per request or `setGlobalDispatcher` process-wide.
- **`fetch` ignores `HTTP_PROXY` unless told otherwise** — `NODE_USE_ENV_PROXY=1` or `--use-env-proxy`, from 22.21.0 and
  24.5.0.
- **Drop to `node:http` for upgrades, `CONNECT`, trailers, or per-request agent control**, and to `node:http2` for
  HTTP/2, which `fetch` does not speak.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/http-client.md`] when tuning connection pooling, or when deciding
between `fetch` and `node:http` — it carries the dispatcher model and the undici version each Node major embeds.

## Workers and Processes

- **Workers are for CPU work.** Node's asynchronous I/O beats a worker at I/O, and each worker carries a full V8
  isolate.
- **Size a pool from `os.availableParallelism()`.** `os.cpus().length` ignores CPU affinity and container limits.
- **`--max-old-space-size` is per isolate.** Every worker adds its own heap, so the container limit must cover the sum.
- **A worker receives no signals.** The main thread must tell its workers to stop and wait for them, and
  `process.exit()` inside a worker ends only that thread.
- **A worker does not inherit the Permission Model.**
- **`process.env` in a worker is a copy** unless the `Worker` was constructed with `env: SHARE_ENV`.
- **Never pass an argument array together with `{ shell: true }`.** `spawn` and `execFile` join it with spaces without
  escaping, which is command injection — runtime-deprecated as DEP0190 in 24.0.0.
- **Raise `UV_THREADPOOL_SIZE` in the environment, not in the program.** The pool is built during initialization, so
  assigning `process.env.UV_THREADPOOL_SIZE` at run time does nothing.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/concurrency.md`] when building a worker pool, or when choosing between
`worker_threads`, `child_process`, and `cluster` — it carries how data crosses a thread boundary and the full list of
behavior differences inside a worker.

## Permission Model

- **`--permission` is a seat belt, not a sandbox.** Node's own documentation states it does not protect against
  malicious code. Never present it to a reviewer as containment for untrusted input.
- **It does not restrict the network below 25.0.0.** `--allow-net` does not exist on the 22 and 24 lines, so a process
  confined there still opens any socket it likes.
- **Symlinks are followed out of the granted set.** A relative link inside a granted directory reaches any path.
- **An already-open file descriptor is never checked**, including one inherited from the parent process.
- **A granted directory that exists gets an implicit `/*`; one that does not, does not.** Write the wildcard explicitly
  when the directory is created at run time.
- **Derive the grant list with `--permission-audit`** (24.20.0) before enforcing. It publishes every violation to a
  `node:permission-model:*` channel and denies nothing.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/permissions.md`] when confining a process, when a run fails with
`ERR_ACCESS_DENIED`, or when writing the grant list — it carries the full scope-to-flag map, the path-matching rules,
and everything the model does not cover.

## Supply Chain

- **`npm ci` in CI and in image builds.** It requires a lockfile, removes `node_modules` first, and fails rather than
  rewriting the lockfile when it disagrees with `package.json`.
- **Set `ignore-scripts=true` in `.npmrc`.** Lifecycle scripts run for the whole dependency tree with the runner's
  privileges, and this is where almost all registry compromise lands. Re-enable it per package where a build genuinely
  needs it.
- **Set `min-release-age` to a window in days** (npm 11.10.0). A compromised-account attack publishes a version that is
  minutes old, and the window is what blocks it. When no version of a dependency clears the window the command errors,
  so treat that exit as a signal rather than a reason to remove the setting. The `min-release-age-exclude` escape hatch
  needs npm 12.0.0, which no Node line bundles.
- **Publish from CI over OIDC trusted publishing**, not with a token. npm classic tokens were revoked on 2025-12-09, and
  a granular token with `Bypass 2FA` set overrides both account-level and package-level 2FA for publishing.
- **Node 22 ships npm 10**, so neither `min-release-age` nor trusted publishing works on that line without upgrading
  npm.
- **Corepack stopped shipping with Node 25**, so `"packageManager"` is inert unless `corepack` is installed separately.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/supply-chain.md`] when hardening an install, configuring publishing,
or auditing what a lockfile actually guarantees — it carries the trusted-publishing constraints, the provenance rules,
and the npm configuration keys.

## CLI and Flags

- **`node --run <script>` is not `npm run`.** It skips `pre` and `post` scripts, sets no `npm_package_*` variables, and
  does not pass `--env-file` variables to the command.
- **`--env-file` is read before the Permission Model initializes**, so `--permission` cannot restrict which file it
  reads, and the file can set `NODE_OPTIONS`.
- **The real environment overrides an `--env-file` value.** Later `--env-file` flags override earlier ones.
- **`NODE_OPTIONS` refuses `-e` and `-p`.** Node exits with `-e is not allowed in NODE_OPTIONS` rather than ignoring the
  flag.
- **A bare script path in `NODE_OPTIONS` is dropped silently** — the file never runs and nothing warns, measured on
  26.2.0. Load code from the variable with `--require` or `--import`.
- **`--test` defaults to process isolation**, one child per file, and reports asynchronous work that outlives a test as
  a failure rather than dropping it.
- **`--test` picks up `.ts` files** under the same name patterns unless `--no-strip-types` is passed.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/cli-and-flags.md`] when wiring a container entrypoint, building a
single executable, or choosing hardening flags — it carries the environment-file rules, the test-runner CLI surface, the
SEA build paths per major, and `--disable-proto`, `--frozen-intrinsics`, and `--secure-heap`.

## Testing with `node:test`

- **`test()` and `suite()` are the names; `it()` and `describe()` are aliases.** Subtests come from the context —
  `await t.test(...)` — and `beforeEach`/`afterEach` fire between subtests, not only between top-level tests.
- **Await every `t.test()`.** The runner awaits subtests from 24.0.0, but the 22 line does not, and the await is what
  makes ordering deterministic on both.
- **Assert through `t.assert.*`, not the bare `node:assert`.** Only the context-bound form is counted by `t.plan()`, so
  a bare `assert` leaves the plan short and the failure reads as a miscount rather than a wrong assertion.
- **`t.plan(n)` checks the moment the test function returns.** The default is `{ wait: false }`; an assertion arriving
  from a callback afterwards is not counted. Pass `{ wait: true }` or a millisecond budget.
- **Import `node:assert/strict`, never `node:assert`, outside a test.** The legacy surface compares with `==`, so
  `assert.equal(1, '1')` passes. `assert.CallTracker` was removed in 25.0.0 (DEP0173) — use `mock.fn()` and
  `fn.mock.callCount()`.
- **Prefer `t.mock` to the imported `mock`.** The context tracker is reset after each test; the module-level one is
  process-wide and needs a manual `mock.reset()` or `mock.restoreAll()`.
- **`mock.module()` needs `--experimental-test-module-mocks`.** Without the flag it is `undefined`, so the test dies on
  a `TypeError` instead of a clear message. It is Stability 1.0, the least settled part of the runner.
- **A destructured timer import is never mocked.** `import { setTimeout } from 'node:timers'` binds the real function
  before `mock.timers.enable()` runs. Call the global or the namespace property.
- **Pass `--test-reporter` explicitly.** The non-TTY default changed from `tap` to `spec` in 23.0.0, so a piped CI run
  emits a different format on 22 than on 24. Reporter output is not a stable contract — parse the `TestsStream` events
  instead.
- **Coverage is experimental and off**: `--experimental-test-coverage`, with core modules, `node_modules/`, and the test
  files excluded by default.
- **Never run `--test-update-snapshots` in CI.** It rewrites the baseline, turning every regression into a pass.
- **`--test-force-exit` hides an open handle rather than closing one.** Find it with `process.getActiveResourcesInfo()`.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/testing.md`] when writing the first test in a project, when a mock or
a fake timer does not take effect, or when wiring reporters and coverage thresholds — it carries the structure and hook
rules, the assertion surface, the mocking API with its restore semantics and flags, snapshots, the reporter pairing
rules, and the subtest-awaiting behavior that the shipped documentation states incorrectly.

## Application

When **writing** Node.js code, apply these rules silently — do not narrate a rule while following it. Where existing
code contradicts one, follow the codebase and flag the divergence once.

When **reviewing** Node.js code, cite the violation and show the fix inline. Do not lecture.

```
Bad:  "Node.js best practice is to avoid process.exit() because stdout writes..."
Good: process.exit(1) -> process.exitCode = 1
```

## Integration

The **javascript** and **typescript** skills own the language and the type system; this skill owns the runtime that
executes them. The split with `javascript` is resolution against syntax: `javascript` states what an ES module means,
this skill states how Node finds it, what `package.json` changes about that, and which of Node's own APIs accept a
signal. `typescript` states what each compiler option does; this skill states what Node erases and refuses.

`node:test` is this skill's, `bun:test` is the **bun** skill's, and the **vitest** skill owns Vitest. Which one a
project adopts is a project decision that no skill states. The **coding** skill governs workflow.

**Node enforces almost nothing it lets you declare — the floor, the permission grant, and the stability index each hold
by discipline, and the runtime reports no violation of any of them.**
