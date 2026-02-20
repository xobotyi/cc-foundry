---
name: nodejs
description: >-
  Node.js runtime conventions, APIs, and ecosystem patterns. Invoke whenever task involves
  any interaction with Node.js runtime — server code, CLI tools, scripts, module system,
  streams, process lifecycle, or package configuration.
---

# Node.js

**Respect the event loop. Every blocking operation is a scalability bug.**

Node.js rewards async-first, stream-oriented code. If your Node.js code fights the
event loop, it's wrong.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Module system | `references/modules.md` | ESM/CJS comparison tables, file extension rules, conditional exports patterns |
| Event loop | `references/event-loop.md` | Phase order, execution priority, blocking operations table, worker pool |
| Streams | `references/streams.md` | Stream types table, pipeline patterns, backpressure details |
| Error handling | `references/errors.md` | Error categories table, global handlers, centralized error handling |
| Security | `references/security.md` | Supply chain threats table, HTTP security headers, process hardening |

## Module System

- **Use ESM.** Set `"type": "module"` in `package.json`. Use `.mjs`/`.cjs` only when
  mixing module systems within one package.
- **Use `node:` prefix** for all built-in imports: `import fs from 'node:fs'`. Prevents
  package name collision attacks and is unambiguous.
- **Import `process` explicitly.** `import process from 'node:process'`. Never rely on
  the `process` global — explicit imports make dependencies visible.
- **Define `"exports"` in `package.json`** for libraries. Encapsulates internals — only
  paths listed in `"exports"` are importable by consumers.
- **Imports at module top.** No dynamic `import()` for statically-known dependencies.
- **Use `import.meta.dirname`/`import.meta.filename`** instead of `__dirname`/`__filename`.
- **Use `import.meta.resolve()`** instead of `require.resolve()` in ESM.
- **Always set `"type"` explicitly** in `package.json`, even in CJS packages — future-proofs
  the package and helps tooling.
- **Use conditional exports** for dual CJS/ESM packages. Order: `types` > `import` >
  `require` > `default`. Always include `"default"` as fallback.
- **Place `"types"` first** in conditional exports when publishing TypeScript declarations.
- **Use `#` imports** (`"imports"` in `package.json`) for clean internal paths without
  `../../../`. Supports conditional resolution for platform-specific implementations.
- **Keep `"main"` alongside `"exports"`** only for backward compatibility with old Node.js
  or bundlers. Never use `"main"` alone for new packages.
- **JSON imports in ESM** require `with { type: 'json' }` attribute.
- **Use `createRequire()`** from `node:module` only when you must `require()` in ESM
  (e.g., native addons).
- **CJS interop:** default import from CJS always works. Named imports work if CJS uses
  static export patterns; otherwise destructure the default.
- **`require()` can load synchronous ESM** (no top-level `await`). For ESM with
  top-level `await`, use dynamic `import()`.
- **Self-referencing:** a package can import its own exports by name when `"exports"` is
  defined.

File extension rules and ESM vs CJS comparison tables: see `references/modules.md`.

## Event Loop

Node.js uses a single-threaded event loop for JavaScript and a libuv worker pool for
expensive I/O and CPU tasks.

### Core Rules

- **Never block the event loop.** No sync I/O in servers (`readFileSync`, `execSync`,
  `crypto.pbkdf2Sync`, `zlib.inflateSync`). Sync APIs are acceptable only in CLI scripts,
  startup code, or build tools.
- **Offload CPU-intensive work** to `worker_threads` or child processes. For main-thread
  CPU work, partition into chunks with `setImmediate()` between iterations.
- **Bound input sizes.** Unbounded `JSON.parse`, `JSON.stringify`, regex, or iteration =
  DoS vector. A 50MB JSON string blocks the loop for ~2 seconds.
- **Avoid vulnerable regex.** No nested quantifiers `(a+)*`, no overlapping alternations
  `(a|a)*`, no backreferences with repetition. Use `safe-regex2`, RE2, or `indexOf`.
- **Prefer `setImmediate()` over recursive `process.nextTick()`.** `nextTick` starves I/O
  if called recursively. Use `nextTick` only when you must run before any I/O in the
  current tick (e.g., emitting events after construction before listeners attach).
- **Prefer `queueMicrotask()`** over `process.nextTick()` for new code — it's
  cross-platform and web-standard.
- **Inside I/O callbacks, `setImmediate` always fires before `setTimeout(fn, 0)`.** Outside
  I/O, the order is non-deterministic — do not depend on it.
- **Use `AbortController`** for cancellable timers and operations.

Phase order, execution priority, blocking operations table, and worker pool details:
see `references/event-loop.md`.

## Streams

Streams process data incrementally — use them for large files, HTTP bodies, data
transformation pipelines, and proxying. Do not use streams when data is already fully in
memory.

### Core Rules

- **Use `pipeline()`** from `node:stream/promises` for stream composition. Never manual
  `.pipe()` chains — they don't propagate errors or handle cleanup.
- **Respect backpressure.** Check `.write()` return value; wait for `'drain'` event before
  continuing. `pipeline()` handles this automatically.
- **Prefer `Readable.from()`** for converting iterables/async iterables to streams.
- **Use async iteration** (`for await (const chunk of stream)`) as the simplest way to
  consume readable streams. Backpressure is handled automatically.
- **Use `readline` with `createInterface`** for line-by-line file processing.
- **`highWaterMark`** defaults to 16 KiB for byte streams, 16 objects for object mode.
  It's a hint, not a hard limit.
- **Object mode streams** count objects (not bytes) against `highWaterMark`. Enable with
  `{ objectMode: true }`.
- **Destroy streams explicitly** when you need to abort: `stream.destroy(new Error('msg'))`.
- **Custom Readable:** prefer async generators with `Readable.from()` over class-based
  `_read()` implementation unless you need fine-grained control.
- **Custom Transform:** implement `_transform(chunk, encoding, callback)` and optionally
  `_flush(callback)` for end-of-stream processing.
- **Custom Writable:** implement `_write(chunk, encoding, callback)` and optionally
  `_final(callback)` for cleanup before `'finish'` event.

Stream types table and `.pipe()` pitfalls: see `references/streams.md`.

## Error Handling

### Core Rules

- **Use `async`/`await` with `try`/`catch`.** No callbacks for new code.
- **Always `return await`** when returning promises from `try` blocks — preserves full
  stack traces and ensures `catch` fires for rejections.
- **Extend `Error`.** Custom errors must extend `Error`, set a `code` property for
  programmatic matching (not message strings, which change), and set `name`.
- **Use `error.cause`** for chaining: `new Error("context", { cause: originalErr })`.
  The full chain is visible via `util.inspect()` and structured loggers.
- **Match errors by `error.code` or `instanceof`**, never by message string.
- **Register global handlers.** Always handle `process.on('unhandledRejection')` and
  `process.on('uncaughtException')`. Log, clean up, exit. Since Node.js 15+, unhandled
  rejections crash the process by default.
- **Never resume after `uncaughtException`.** The process state is unknown — log, cleanup,
  exit.
- **Subscribe to `'error'` events** on all EventEmitters and streams. An unhandled `'error'`
  event crashes the process. `pipeline()` handles stream errors automatically.
- **Handle `process.on('warning')`** for non-fatal process warnings (deprecations, memory
  leaks, experimental features).
- **Use centralized error handlers.** Don't scatter error handling across every middleware.
  Use a single error handler that maps error types to HTTP responses without leaking
  internals.
- **Handle once: log OR throw, not both.** `catch (e) { log(e); throw e }` causes
  duplicate logging.
- **Never swallow errors** in event handlers — always re-emit or log.

Error categories table and operational vs programmer error strategies:
see `references/errors.md`.

## Process Lifecycle

- **Graceful shutdown.** Handle `SIGTERM`/`SIGINT`: stop accepting connections, wait for
  in-flight requests (with timeout), close DB pools, flush logs, then `process.exit(0)`.
  Force-exit on timeout.
- **Log to stdout/stderr.** Let infrastructure (Docker, systemd) handle log routing.
  Use structured JSON logging (pino, winston) in production.
- **Set `NODE_ENV=production`** in production. It enables framework optimizations and
  disables debug output.
- **Use `npm ci`** in CI/production. Never `npm install` — it ignores lockfile mismatches.

## Security

### Input Validation

- **Validate everything from outside** — request bodies, query params, headers, file
  uploads, environment variables from untrusted sources. Use schema validation (zod, ajv,
  typebox).
- **Limit request body size** at the HTTP layer before parsing. Set per-content-type limits.
  Unbounded payloads exhaust memory.
- **Validate `Content-Length` header** before reading the body.
- **Use streaming JSON parsers** (`stream-json`, `@streamparser/json`) for very large
  JSON payloads.

### HTTP Security

- **Configure server timeouts.** Defaults are too permissive. Set `headersTimeout`,
  `requestTimeout`, `timeout`, `keepAliveTimeout`, `maxRequestsPerSocket`.
- **Use security headers** (via `helmet` or equivalent): `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.
- **Delegate TLS/gzip to reverse proxy.** Node.js should not terminate TLS or compress
  responses in production — let nginx/HAProxy/cloud LB handle TLS termination, compression,
  rate limiting, and WAF rules.

### Secrets & Process Hardening

- **Never hardcode secrets** in source code. Use environment variables from secure vaults.
- **Never commit `.env` files** — add to `.gitignore`.
- **Use `crypto.timingSafeEqual()`** for secret comparison (prevents timing attacks).
- **Use `crypto.scrypt()` or `crypto.pbkdf2()`** (async versions) for password hashing.
- **Avoid shell injection.** Never use `exec()` with user-controlled strings. Use
  `execFile()` or `spawn()` with argument arrays.
- **Never use `eval()`, `new Function()`, or dynamic `require()`** with user input.
- **Run as non-root** in Docker — use a dedicated user.
- **Limit V8 heap** with `--max-old-space-size` to prevent memory exhaustion.

Supply chain threats table, dependency auditing, and security checklist:
see `references/security.md`.

## Application

When **writing** Node.js code:
- Apply all conventions silently — don't narrate each rule being followed.
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once.
- Prefer `node:fs/promises` over callback-based `node:fs`.
- Prefer `node:stream/promises` for pipeline operations.

When **reviewing** Node.js code:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule — state what's wrong and how to fix it.

## Integration

The **javascript** skill governs language choices; this skill governs Node.js runtime
decisions. Activate **typescript** alongside both when working with TypeScript.

**Respect the event loop. When in doubt, make it async.**
