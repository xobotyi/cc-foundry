---
name: bun
description: >-
  Write and review Bun: the Bun-native API surface against its `node:` equivalents, the HTTP and WebSocket server, file
  and process I/O, the shell, the data clients, `bun:test`, the bundler and compiled binaries, and the package manager.
when_to_use: >-
  Invoke whenever Bun code or a Bun project is touched at all — writing, reviewing, refactoring, debugging, or
  configuring one, or deciding whether a `Bun.*` API replaces a dependency. Also invoke on the symptoms: a request dies
  after ten seconds with no error, a stack trace or an error page reaches the browser, `postinstall` stops running for a
  package that used to build, a mocked module still ran its side effects, `bun install` lays out `node_modules`
  differently than the last machine did, a compiled binary reads a config file it should not, or a `node:` API behaves
  differently under Bun than under Node. Covers the Bun runtime and its toolchain, `bun:test` included; JavaScript
  semantics belong to the javascript skill, types to typescript, Node's own APIs to nodejs, and Vitest to vitest.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

Bun's value is that the runtime, the toolchain, and the batteries are one binary. Two biases decide most calls:

- **Reach for what already ships.** A dependency earns its place by doing what `Bun.*`, `bun:*`, and the bundled
  toolchain do not. Adding one that duplicates a built-in is a defect.
- **Write `node:` only where Bun has no native equivalent, or where the code must also run under Node.** Portability is
  a requirement to state, not a habit to keep.

## Release Version

Bun ships one stable line and no long-lived support branches, so `bun upgrade` moves a machine to whatever release is
newest. Pin the version in CI (`oven-sh/setup-bun`, `bun-version`) so a developer machine and a runner agree, and state
the release a feature needs in the sentence that uses it. Never write "the latest version supports X".

The rules below assume 1.3.0 or later unless a version anchor says otherwise. Floors for the features these rules
reference:

- **1.3.0** — `Bun.sql` for MySQL, MariaDB, and SQLite; `Bun.redis`; `Bun.secrets`; `Bun.YAML`; catalogs;
  `test.concurrent`, `test.serial`, and `--concurrent`; `--randomize`; `expectTypeOf`
- **1.3.2** — the isolated linker as the default for new monorepos; `nativeDependencies`; `ignoreScripts`
- **1.3.3** — `test(..., { retry })`
- **1.3.4** — `jest.useFakeTimers()`; `URLPattern`; `--compile` stops auto-loading `tsconfig.json` and `package.json`
- **1.3.5** — `Bun.Terminal`; `Bun.stringWidth`; `bun:bundle` feature flags; `trustedDependencies` limited to npm
  sources
- **1.3.6** — `Bun.JSONC`; `Bun.Archive`; `Bun.build({ files })`; `metafile: true`
- **1.3.7** — `Bun.JSON5`; `Bun.JSONL`; `Bun.wrapAnsi`
- **1.3.8** — `Bun.markdown`; `--metafile-md`
- **1.3.9** — `bun run --parallel`; bytecode for ES modules
- **1.3.10** — `optimizeImports`; standard TC39 decorators; `--compile --target=browser` for a single HTML file
- **1.3.11** — `Bun.cron()`; `Bun.sliceAnsi`
- **1.3.12** — `Bun.WebView`
- **1.3.13** — `bun test --parallel`, `--isolate`, `--shard`, `--changed`; `Range` and conditional requests in
  `Bun.serve`
- **1.3.14** — `Bun.Image`; the global virtual store; HTTP/3 in `Bun.serve`; HTTP/2 and HTTP/3 in `fetch()`
- **1.4.0** — Node 26 compatibility; `Bun.XML`; `Bun.isStandaloneExecutable`; `Bun.spawn({ cgroup })`; directory routes;
  `bun audit fix`, `bun dedupe`, `bun prune`, `bun pm diff`, `bun pm licenses`; `bun test --timings`; `--asset`;
  `lockfileVersion: 2`

## Prefer the Built-in

Reach for the built-in, and drop the package it replaces from `package.json`.

- **HTTP server** — `Bun.serve()` over `http.createServer()`, Express, or Fastify
- **Files** — `Bun.file()` and `Bun.write()` over `node:fs` read and write helpers
- **Directories** — `node:fs`. There is no `Bun.*` equivalent for `mkdir` or `readdir`
- **Globbing** — `Bun.Glob` over `glob` and `fast-glob`
- **Shelling out** — `Bun.$` over `child_process.exec`, `zx`, `execa`, `cross-env`, and `rimraf`
- **Processes** — `Bun.spawn` and `Bun.spawnSync` over `child_process.spawn`
- **Pseudo-terminals** — `Bun.Terminal` over `node-pty` (1.3.5)
- **SQLite** — `bun:sqlite` over `better-sqlite3`
- **Postgres, MySQL, MariaDB** — `Bun.sql` over `pg` and `mysql2` (1.3.0)
- **Redis and Valkey** — `Bun.redis` over `ioredis` (1.3.0)
- **S3-compatible storage** — `Bun.S3Client` over `@aws-sdk/client-s3`
- **Password hashing** — `Bun.password` over `bcrypt` and `argon2`
- **Testing** — `bun:test` over Jest
- **Bundling** — `Bun.build()` and `bun build` over webpack, Rollup, and esbuild
- **Images** — `Bun.Image` over `sharp` (1.3.14)
- **Headless browsing** — `Bun.WebView` over Puppeteer (1.3.12)
- **Markdown** — `Bun.markdown` over `marked` (1.3.8)
- **Scheduling** — `Bun.cron()` over `node-cron` (1.3.11)
- **Running scripts concurrently** — `bun run --parallel` over `npm-run-all` and `concurrently` (1.3.9)
- **Config formats** — `Bun.TOML`, `Bun.YAML`, `Bun.JSON5` (1.3.7), `Bun.JSONC` (1.3.6), `Bun.XML` (1.4.0) over
  `@iarna/toml`, `js-yaml`, `json5`, `jsonc-parser`, and `fast-xml-parser`
- **Newline-delimited JSON** — `Bun.JSONL` over `ndjson` (1.3.7)
- **Tarballs** — `Bun.Archive` over `tar` (1.3.6)
- **Terminal string width** — `Bun.stringWidth` (1.3.5), `Bun.wrapAnsi` (1.3.7), `Bun.sliceAnsi` (1.3.11) over
  `string-width`, `wrap-ansi`, `slice-ansi`, and `cli-truncate`
- **Route patterns** — `URLPattern` over `path-to-regexp` (1.3.4)
- **Credential storage** — `Bun.secrets` over a plaintext dotfile, for local development tools
- **Sleeping, hashing, comparison, compression** — `Bun.sleep`, `Bun.hash`, `Bun.CryptoHasher`, `Bun.deepEquals`,
  `Bun.gzipSync`, `Bun.zstdCompressSync`

Two boundaries hold in the other direction. **Web Streams are the native currency** — `Bun.file().stream()`,
`Response.body`, and `proc.stdout` are all `ReadableStream`, so `node:stream` is for code shaped around Node, not the
default. **`crypto.randomUUID()` is the standard v4 UUID**; `Bun.randomUUIDv7()` is the time-ordered variant, not a
replacement for it.

## HTTP Server

- **Declare routes in the `routes` object**, and keep `fetch` for genuinely unmatched requests. Precedence is exact,
  then parameterized, then wildcard, then the global catch-all — not source order.
- **Never deploy without either an `error` handler or an explicit `development: false`.** `development` defaults to
  `process.env.NODE_ENV !== "production"`, so a server whose environment does not set `NODE_ENV=production` renders
  Bun's contextual error page to any client that can trigger a throw. On 1.3.14 that page is a ~67 KB HTML overlay
  carrying the thrown error's payload in an embedded `__bunfallback` script.
- **An `error` handler decides the response body in both modes** and replaces the error page when `development` is on.
  Without one, `development: false` answers 500 with the body `Something went wrong!` (measured on 1.3.14). The stack
  trace reaches stderr either way, so a missing handler costs you the response, never the log.
- **`idleTimeout` is 10 seconds and it covers a request whose handler has not yet written a byte.** A slow handler, a
  long poll, or a server-sent-events stream is killed mid-response and the client sees a connection reset. Raise
  `idleTimeout`, or call `server.timeout(req, 0)` for the one request that needs it.
- **Return a `Response` instance as the route value for anything fixed** — health checks, redirects, constant JSON. Bun
  dispatches it with no allocation and caches it for the server's lifetime, so `server.reload()` is the only way to
  change it.
- **`req.cookies` writes are applied to the response only under `routes`.** Inside a bare `fetch` handler nothing is
  tracked and you build `Set-Cookie` yourself.
- **`server.upgrade(req)` must be followed by returning `undefined`**, never a `Response`.
- **Treat the return of `send()` and `publish()` as a status, not a byte count.** `-1` is backpressure and `0` is
  dropped; from 1.4.0 `publish()` also returns `0` when the topic has no subscribers.
- **WebSocket handlers are declared once per server**, in the `websocket` object, not per socket. Type `ws.data` through
  the handler object's `data` property.
- **`Response.error()` and any status outside 100–999 route to `error()`** and answer 500 (1.4.0). Earlier releases
  wrote an invalid status line.

Read [`${CLAUDE_SKILL_DIR}/references/http-server.md`] when serving files or a directory, wiring WebSocket pub/sub,
tuning server lifecycle or timeouts, or enabling HTTP/2 or HTTP/3 — it carries the five route value shapes and their
caching and `404` behavior, the directory-route path rules, the full `websocket` option set with its defaults, and the
`stop`, `reload`, and `closeIdleConnections` semantics.

## Files

- **`Bun.file(path)` is lazy.** Constructing it touches no disk; `size` is `0` and `exists()` is `false` for a missing
  path rather than throwing.
- **`Bun.write(dest, data)` takes anything**: string, `Blob`, `BunFile`, `ArrayBuffer`, `TypedArray`, or `Response`. It
  picks the fastest syscall for the pair, so copying a file is `Bun.write(Bun.file(dst), Bun.file(src))`, not a manual
  read-then-write.
- **`file.writer()` returns a `FileSink` for incremental writes**, and the process stays alive until `.end()` is called.
  `.unref()` opts out.
- **`Bun.stdin`, `Bun.stdout`, and `Bun.stderr` are `BunFile`s**, so streaming a file to stdout is one `Bun.write` call.

## Shell and Processes

- **Interpolated values in `Bun.$` are single literal strings**, so command injection is closed by construction. Two
  holes remain and neither is Bun's to close: spawning `bash -c "...${input}"` hands control to a real shell, and an
  external command may read attacker-supplied text as its own flag (`--upload-pack=`). Validate arguments you pass on.
- **Only glob patterns written in the template expand** (1.4.0). A `*` arriving through `${...}`, a shell variable,
  command substitution, or quoted text is literal, and `?`, `[...]`, and a leading `!` are literal everywhere.
- **A non-zero exit throws `ShellError`.** Use `.nothrow()` where you check `exitCode` yourself.
- **`Bun.$` is not `/bin/sh`.** It is an in-process interpreter, so `.sh` files run identically on Windows and the
  builtin set is fixed.
- **`stderr` defaults to `"inherit"` in `Bun.spawn`, so `proc.stderr` is `undefined`.** Pass `stderr: "pipe"` to read
  it. `stdout` defaults to `"pipe"` and `stdin` to `null`.
- **The parent process does not exit while a child is alive.** Call `proc.unref()` for a child that must not hold it
  open.
- **Set `serialization: "json"` for IPC with a Node process.** The default `"advanced"` is JavaScriptCore's format and
  Node cannot read it.

Read [`${CLAUDE_SKILL_DIR}/references/shell-and-processes.md`] when redirecting shell I/O into JavaScript objects,
driving an interactive program through a PTY, applying cgroup limits, or spawning a `Worker` — it carries the
redirection and builtin tables, the stdio option matrix, the `Bun.Terminal` platform differences, and the worker
options.

## Testing

- **Import from `bun:test`**, never from `jest` or `vitest`. `jest.*` and `vi.*` exist inside `bun:test` for ported
  suites.
- **`mock.module()` is not hoisted.** Unlike `jest.mock`, it runs where it is written, so a module imported above it has
  already been evaluated and its side effects have already happened. Put the override in a `--preload` script when the
  original must never run.
- **Pick the right global reset.** `mock.clearAllMocks()` clears history and keeps implementations;
  `jest.resetAllMocks()` also drops them (1.4.0 — before, it behaved like `clearAllMocks`); `mock.restore()` restores
  spied originals and undoes no `mock.module()` override.
- **`expectTypeOf` is a no-op at runtime.** A green `bun test` proves nothing about types — run `bunx tsc --noEmit`
  separately.
- **`bun test` sets `NODE_ENV=test` unless it is already set, and runs in UTC.** `process.env.TZ` stays unset — the
  runtime zone is UTC, not an environment variable a preload can read.
- **An unhandled rejection between tests fails the run.** When it happens while a file loads, none of that file's tests
  run at all.
- **Three concurrency knobs are independent**: `--parallel` spreads files across processes, `--concurrent` and
  `test.concurrent` overlap async tests inside one file, `--shard=i/n` splits files across machines (`--parallel` and
  `--shard` from 1.3.13). `--parallel` implies `--isolate`.
- **Reach for `--parallel --no-isolate` on a suite of many small files sharing a large import graph.** Isolation
  re-evaluates every import per file, and on that shape plain `bun test` beats isolated workers.
- **Key per-worker resources off `BUN_TEST_WORKER_ID`** (or `JEST_WORKER_ID`) so parallel workers do not share a
  database or a port.
- **The default per-test timeout is 5000 ms.**

Read [`${CLAUDE_SKILL_DIR}/references/testing.md`] when writing the first test in a project, configuring CI sharding,
reaching for a matcher or a snapshot form, or debugging a mock that stopped returning values — it carries the discovery
patterns, the matcher inventory, the mock-reset semantics in full, the `--timings` sharding workflow, and the
`bunfig.toml` test keys.

## Package Manager

- **`trustedDependencies` replaces Bun's built-in allow list; it never extends it.** Adding one package silently
  disables `postinstall` for every package the built-in list covered, so re-list the ones you still need. `[]` opts out
  of lifecycle scripts entirely.
- **The built-in list applies only to npm-registry sources** (1.3.5). A `file:`, `link:`, `git:`, or `github:`
  dependency named `esbuild` inherits nothing from the real `esbuild`.
- **The linker default comes from the lockfile's `configVersion`, not from a global setting.** A new monorepo gets the
  isolated linker (1.3.2); a new single-package project and every project whose lockfile predates 1.3.2 get the hoisted
  one. Two machines therefore lay out `node_modules` differently unless `bun.lock` is committed.
- **The isolated linker still permits phantom dependencies by default.** Set `[install] hoist = false` to stop
  `node_modules/.bun/node_modules` from being created.
- **Run `bun ci` in CI, not `bun install`.** Bun does not turn on the frozen lockfile automatically; `bun ci` is
  `bun install --frozen-lockfile`.
- **`--production` implies `--frozen-lockfile` and skips `devDependencies`, but removes nothing already installed.**
  `bun prune --production` (1.4.0) is what shrinks a build image.

Read [`${CLAUDE_SKILL_DIR}/references/package-manager.md`] when configuring a monorepo, choosing a linker, hardening a
supply chain, or diagnosing an install that differs between machines — it carries the `configVersion` table, the
`trustedDependencies` modes, workspaces and catalogs, the `--filter` grammar, `minimumReleaseAge` and the security
scanner, and the `bunfig.toml` install keys.

## Building and Compiling

- **`Bun.build()` rejects with an `AggregateError` on failure.** `throw` defaults to `true`, so `result.success` is
  meaningful only when you pass `throw: false`. Checking `success` on a default build reads a value that never arrives.
- **`target` defaults to `"browser"`.** Set `target: "bun"` for server code, which also emits the `// @bun` pragma so
  the runtime skips re-transpiling.
- **Ship `--compile --minify --sourcemap --bytecode` for a production binary.** Bytecode needs `target: "bun"`, and for
  ES modules it needs `--compile` as well (1.3.9).
- **A compiled binary does not auto-load `tsconfig.json` or `package.json`** (1.3.4), but it does auto-load `.env` and
  `bunfig.toml`. Pass `--no-compile-autoload-dotenv` and `--no-compile-autoload-bunfig` where a deployment must not read
  files from its working directory.
- **Cross-compile with `--target bun-<os>-<arch>[-musl]`.** From 1.4.0 x64 ships only the baseline build and the
  `-march=haswell` build is gone, so `-baseline` and `-modern` resolve to the same binary and neither is a choice.
- **A macro's return value must be serializable and its arguments statically known.** Code inside `node_modules` cannot
  invoke a macro, though your own code may import one from a package.
- **`Bun.markdown.html()` does not sanitize.** Raw HTML, event-handler attributes, and `javascript:` hrefs pass through
  verbatim, so untrusted Markdown needs a sanitizer before it reaches a browser.

Read [`${CLAUDE_SKILL_DIR}/references/build-and-compile.md`] when configuring a bundle, embedding assets in an
executable, writing a plugin, or reaching for a macro — it carries the full `Bun.build` option set, code-splitting and
`optimizeImports` behavior, the cross-compilation targets, the embedded-file and `/$bunfs` rules, the plugin hooks, and
the macro serialization constraints.

## Data Clients

- **Open `bun:sqlite` with `{ strict: true }`.** Without it a missing bind parameter is not an error — a typo binds
  nothing and the query returns a wrong result silently.
- **`db.query()` caches the compiled statement (20 most recent); `db.prepare()` does not.** Use `prepare()` for SQL
  generated at runtime so one-off queries do not evict the statements that repeat.
- **Enable WAL** with `PRAGMA journal_mode = WAL` for anything with concurrent readers.
- **Set `safeIntegers: true` when a column can exceed 2^53.** The default returns `number` and rounds silently.
- **Every interpolation in a `Bun.sql` template is a parameter.** Use the `sql()` helper for identifiers, column
  subsets, and value lists; `sql.unsafe` escapes nothing.
- **`Bun.sql` queries are lazy** — they start on `await` or `.execute()`, and `.cancel()` stops a running one.
- **Release a reserved connection.** `sql.reserve()` takes one out of the pool until `release()`, or use `using`.
- **Set `prepare: false` behind PgBouncer in transaction mode.**

Read [`${CLAUDE_SKILL_DIR}/references/data-clients.md`] when choosing a client, closing a SQLite database cleanly,
building dynamic SQL, or configuring pooling and TLS — it carries the `bun:sqlite` close and WAL-sidecar semantics, the
`Bun.sql` fragment helpers and query modes, and the `Bun.redis` and `Bun.S3Client` configuration.

## Configuration and Environment

- **`bunfig.toml` configures the runtime, `bun test`, `bun install`, and `bun run`.** A CLI flag overrides it; a
  project's `bunfig.toml` overrides `.npmrc` for the same key (1.4.0).
- **`.env` files load automatically**, in order: `.env`, then `.env.{development,production,test}` by `NODE_ENV`, then
  `.env.local` (skipped when `NODE_ENV=test`), then `.env.{mode}.local`. Values expand `$VAR` references unless the `$`
  is escaped.
- **Bun invoked as `node` does not load `.env`** (1.4.0) — under `bun --bun`, `bunx --bun`, or a `node` symlink. A
  `package.json` script calling `node` under `bun --bun run` therefore sees those variables as `undefined`. Pass
  `--env-file` to keep them.
- **Disable automatic loading in production with `--no-env-file` or `env = false`.** Files named by `--env-file` still
  load.
- **`bunfig.toml` parsing is strict** (1.4.0): an unquoted string value, a missing newline between pairs, or an integer
  past `Number.MAX_SAFE_INTEGER` is a `SyntaxError` at startup.
- **`Bun.YAML` follows YAML 1.2** (1.3.5), so `yes`, `no`, `on`, and `off` parse as strings. An `on:` key in a GitHub
  Actions workflow is the string `"on"`.

## Node Compatibility

From 1.4.0 Bun targets Node 26 and reports itself as such; 1.3.x reports Node 24. Most packages run unchanged. Reach for
a `node:` module deliberately in these cases:

- **`node:sea`** — not implemented. `bun build --compile` is the replacement and a different API.
- **`node:test`** — partial. Write `bun:test`.
- **`node:crypto` beyond BoringSSL** — no `ed448`, `x448`, `rsa-pss`, `dsa`, `dh`, `secp256k1`, or the CCM, OCB, XTS,
  and `chacha20-poly1305` ciphers.
- **`node:async_hooks`** — `AsyncLocalStorage` works but does not propagate into `Worker`, `MessagePort`, or
  `BroadcastChannel`. `createHook` and the async-id APIs are stubs.
- **HTTP load balancing across processes** — `node:cluster` shares an HTTP socket only on Linux, through `SO_REUSEPORT`.
- **`node:v8` `serialize`/`deserialize`** — JavaScriptCore's wire format, not V8's, so a buffer does not travel between
  Bun and Node.
- **Loader hooks** — `module.register` is a no-op. Use `Bun.plugin`.

Read [`${CLAUDE_SKILL_DIR}/references/node-compat.md`] when porting a Node codebase, when a `node:` API behaves
differently under Bun, or when a package that works under Node fails — it carries the per-module gap list and the
`fetch`, Web API, and module-resolution behavior changes in 1.4.0 that break working code.

## Application

When **writing** Bun, apply these conventions silently — do not narrate a rule while following it. Where existing code
uses a `node:` API that has a Bun-native equivalent, follow the codebase. Flag the alternative once.

When **reviewing** Bun, cite the violation and show the fix inline. Do not lecture.

```
Bad:  "Bun's build API generally prefers rejection over a status flag, so you may want to..."
Good: if (!result.success) -> Bun.build() rejects; catch the AggregateError, or pass throw: false
```

## Integration

The **javascript** and **typescript** skills own the language and the type system; this skill states only where Bun
departs from them. The **nodejs** skill owns what a `node:` module does — this skill owns only where Bun's
implementation is absent, partial, or behaves differently, and never teaches Node itself.

`bun:test` and `bun install` are this skill's, and the **vitest** skill owns Vitest. Which of them a project adopts is a
project decision, not a rule either skill states. The **coding** skill governs workflow.
