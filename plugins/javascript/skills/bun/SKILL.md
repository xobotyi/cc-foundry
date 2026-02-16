---
name: bun
description: >-
  Bun runtime conventions, APIs, and toolchain. Invoke whenever task involves any
  interaction with Bun — serving HTTP, file I/O, shell scripting, testing, bundling,
  or package management with Bun.
---

# Bun

**Use Bun APIs, not Node.js polyfills. If Bun provides a native API for it, use it.**

Bun is a batteries-included JavaScript runtime. It replaces Node.js, npm, Jest, and
webpack with a single tool. Prefer Bun-native APIs (`Bun.serve`, `Bun.file`, `Bun.$`,
`bun:sqlite`, `bun:test`) over Node.js equivalents unless portability is an explicit
requirement.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| HTTP server, routing, static responses, streaming, error handling | [server.md](references/server.md) |
| File I/O, shell scripting, child processes, workers | [io-and-processes.md](references/io-and-processes.md) |
| Testing with `bun:test` — writing tests, mocks, runner config | [testing.md](references/testing.md) |
| SQLite, WebSockets, bundler, plugins, macros | [ecosystem.md](references/ecosystem.md) |
| Configuration (`bunfig.toml`), package manager, Node.js compat | [config-and-compat.md](references/config-and-compat.md) |

Read the relevant reference before writing code in that area.

## Core Rules

These apply to ALL Bun code. No exceptions.

### Prefer Bun-Native APIs

1. **`Bun.serve()`** over `http.createServer()`. Use `routes` for declarative routing.
2. **`Bun.file()` / `Bun.write()`** over `fs.readFile` / `fs.writeFile`.
3. **`Bun.$`** (shell API) over `child_process.exec` for shell commands.
4. **`Bun.spawn()`** over `child_process.spawn` for process management.
5. **`bun:sqlite`** over third-party SQLite packages.
6. **`bun:test`** over Jest/Vitest when the project runs on Bun.
7. **`Bun.password`** over `bcrypt` for password hashing.
8. **`Bun.sleep()`** over `setTimeout` wrappers for async delays.

### HTTP Server

1. **Use `routes` object** for declarative path matching (Bun v1.2.3+).
2. **Static `Response` objects** for health checks and redirects — zero-allocation.
3. **Return `Response` or `Promise<Response>`** from handlers. Standard Web API.
4. **`fetch` handler** as fallback for unmatched routes, not primary routing.
5. **Always implement `error` handler** in `Bun.serve()`.
6. **`development: true`** in dev for built-in error pages.

### File I/O

1. **`Bun.file()` is lazy.** Creating a `BunFile` does not read from disk.
2. **Use `.text()`, `.json()`, `.bytes()`, `.stream()`** on `BunFile` — it's a `Blob`.
3. **`Bun.write()` handles all types** — string, Blob, Response, ArrayBuffer.
4. **Use `node:fs` for directory ops** — `mkdir`, `readdir` (no Bun-specific API yet).

### Shell & Processes

1. **`$` tagged template** for shell commands. Cross-platform, injection-safe.
2. **`.text()` / `.json()` / `.lines()`** to read shell output.
3. **`.nothrow()`** when you want to handle exit codes manually.
4. **`Bun.spawn()`** for fine-grained process control (stdin/stdout piping).
5. **`Bun.spawnSync()`** for CLI tools; `Bun.spawn()` for servers.

### Testing

1. **Import from `bun:test`**, not `jest` or `vitest`.
2. **Jest-compatible API**: `test`, `describe`, `expect`, `mock`, `spyOn`.
3. **`mock.module()`** for module mocking — supports ESM live bindings.
4. **Use `--preload`** for mocks that must load before any imports.
5. **Run with `bun test`** — auto-discovers `*.test.*` and `*.spec.*` files.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `http.createServer((req, res) => ...)` | `Bun.serve({ routes: { ... } })` |
| `fs.readFileSync("f.txt", "utf8")` | `await Bun.file("f.txt").text()` |
| `fs.writeFileSync("f.txt", data)` | `await Bun.write("f.txt", data)` |
| `child_process.exec("ls -la")` | `await $\`ls -la\`` |
| `import { jest } from "@jest/globals"` | `import { mock, spyOn } from "bun:test"` |
| `new Response(Bun.file("f"))` for static | `"/path": new Response(await file.bytes())` |
| `app.get("/health", ...)` (Express) | `"/health": new Response("OK")` (zero-alloc) |
| `require("better-sqlite3")` | `import { Database } from "bun:sqlite"` |
| `bcrypt.hash(password)` | `await Bun.password.hash(password)` |
| `setTimeout(() => resolve(), ms)` | `await Bun.sleep(ms)` |
| `url.pathname === "/foo"` in fetch | `"/foo": handler` in `routes` object |
| Manual JSON body parsing | `await req.json()` (Web API on `BunRequest`) |

## Application

When **writing** Bun code:
- Apply all conventions silently — don't narrate each rule being followed.
- If an existing codebase uses Node.js patterns, follow codebase style but flag
  that Bun-native alternatives exist.
- For new projects, use Bun-native APIs throughout.

When **reviewing** Bun code:
- Cite the specific Node.js-to-Bun migration and show the fix inline.
- Don't lecture — state what's suboptimal and how to fix it.

```
Bad review comment:
  "According to Bun conventions, you should use Bun.file() instead of
   fs.readFileSync() for better performance."

Good review comment:
  "Use Bun.file: `fs.readFileSync("f.txt", "utf8")` ->
   `await Bun.file("f.txt").text()`"
```

## Toolchain

- **`bun run`**: Run scripts and files. Use `--watch` for dev, `--hot` for HMR.
- **`bun test`**: Built-in test runner. `--coverage` for coverage reports.
- **`bun install`**: Package manager. 25x faster than npm. Text lockfile (`bun.lock`).
- **`bun build`**: Bundler. `--target=bun` for server, `--target=browser` for client.
- **`bunfig.toml`**: Bun-specific config. Optional — Bun works without it.
- **`bunx`**: Execute packages without installing (like `npx`).

## Integration

This skill provides Bun-specific conventions alongside the **coding** skill:

1. **Coding** — Discovery, planning, verification discipline
2. **Bun** — Runtime-specific APIs and conventions
3. **Coding** — Final verification

The coding skill governs workflow; this skill governs Bun implementation choices.

**Use Bun APIs, not Node.js polyfills. When in doubt, check if Bun has a native API.**
