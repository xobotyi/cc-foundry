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

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Module system (ESM/CJS), `package.json` config, exports, imports | [modules.md](references/modules.md) |
| Event loop, timers, `process.nextTick`, non-blocking patterns | [event-loop.md](references/event-loop.md) |
| Streams, backpressure, pipeline, Transform | [streams.md](references/streams.md) |
| Error handling, `error.cause`, process-level error events | [errors.md](references/errors.md) |
| Security: input validation, dependency supply chain, DoS prevention | [security.md](references/security.md) |

Read the relevant reference before writing code in that area.

## Core Rules

These apply to ALL Node.js code. No exceptions.

### Module System

1. **Use ESM.** Set `"type": "module"` in `package.json`. Use `.mjs`/`.cjs` only when
   mixing module systems within one package.
2. **Use `node:` prefix** for all built-in imports: `import fs from 'node:fs'`.
3. **Import `process` explicitly.** `import process from 'node:process'`. Never rely on
   the `process` global — explicit imports make dependencies visible and enable proper
   tree-shaking in bundled environments.
4. **Define `"exports"` in `package.json`** for libraries. Encapsulate internals.
5. **Imports at module top.** No dynamic `import()` for statically-known dependencies.
6. **Use `import.meta.dirname`/`import.meta.filename`** instead of `__dirname`/`__filename`.

### Event Loop

1. **Never block the event loop.** No sync I/O in servers (`readFileSync`, `execSync`, etc.).
   Sync APIs are acceptable only in CLI scripts, startup code, or build tools.
2. **Offload CPU-intensive work** to worker threads or child processes.
3. **Bound input sizes.** Unbounded `JSON.parse`, regex, or iteration = DoS vector.
4. **Avoid vulnerable regex.** No nested quantifiers `(a+)*`, no overlapping alternations.

### Error Handling

1. **Use `async`/`await` with `try`/`catch`.** No callbacks for new code.
2. **Always `return await`** when returning promises from `try` blocks — preserves full
   stack traces.
3. **Extend `Error`.** Custom errors must extend `Error` and set a `code` property.
   Use `error.cause` for chaining: `new Error("context", { cause: originalErr })`.
4. **Distinguish operational vs programmer errors.** Operational (bad input, network
   failure) = handle gracefully. Programmer (null deref, assertion) = crash and restart.
5. **Register global handlers.** Always handle `process.on('unhandledRejection')` and
   `process.on('uncaughtException')`. Log, clean up, exit.
6. **Subscribe to `'error'` events** on all EventEmitters and streams.

### Process Lifecycle

1. **Graceful shutdown.** Handle `SIGTERM`/`SIGINT`: stop accepting connections, drain
   in-flight requests, close DB pools, then `process.exit(0)`.
2. **Log to stdout/stderr.** Let the infrastructure (Docker, systemd) handle log routing.
   Use structured JSON logging (pino, winston) in production.
3. **Set `NODE_ENV=production`** in production. It enables framework optimizations.
4. **Use `npm ci`** in CI/production. Never `npm install` — it ignores lockfile mismatches.

### Streams

1. **Use `pipeline()`** from `node:stream/promises` for stream composition. Never manual
   `.pipe()` chains — they don't propagate errors or handle cleanup.
2. **Respect backpressure.** Check `.write()` return value; wait for `'drain'` before
   continuing.
3. **Prefer `stream.Readable.from()`** for converting iterables/async iterables to streams.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `import fs from 'fs'` | `import fs from 'node:fs'` |
| `fs.readFileSync()` in server handler | `await fs.readFile()` or stream |
| `require()` in ESM project | `import` / `import()` |
| `__dirname` in ESM | `import.meta.dirname` |
| `.pipe(dest)` without error handling | `await pipeline(src, transform, dest)` |
| `return promise` in try block | `return await promise` |
| `process.exit(1)` without cleanup | Graceful shutdown handler |
| `console.log()` in production | Structured logger (pino) to stdout |
| `npm install` in CI | `npm ci` |
| `throw "string"` | `throw new Error("message")` |
| Unbounded `JSON.parse(userInput)` | Validate/limit input size first |
| `child_process.execSync()` in server | `child_process.exec()` or worker thread |
| `"main": "./index.js"` alone | `"exports": { ".": "./index.js" }` |
| Catching errors and ignoring them | Handle, log, or re-throw with cause |
| `process.on('uncaughtException')` then continue | Log, cleanup, exit |
| `process.env.FOO` (global) | `import process from 'node:process'` first |

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

```
Bad review comment:
  "According to Node.js best practices, you should use the node: prefix
   for built-in modules. Please update this import."

Good review comment:
  "Missing node: prefix: `import fs from 'fs'` -> `import fs from 'node:fs'`"
```

## Integration

This skill provides Node.js runtime conventions alongside other skills:

1. **javascript** — Language-level conventions (syntax, patterns, idioms)
2. **nodejs** (this skill) — Runtime-specific APIs and patterns
3. **typescript** — Type system conventions (when applicable)

The javascript skill governs language choices; this skill governs Node.js runtime decisions.

**Respect the event loop. When in doubt, make it async.**
