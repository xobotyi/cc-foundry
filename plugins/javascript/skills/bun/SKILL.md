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

## References

| Reference | Contains |
|-----------|----------|
| `references/server.md` | Route types, file response patterns, WebSocket pub/sub, server config |
| `references/io-and-processes.md` | File I/O details, shell API, child processes, workers |
| `references/testing.md` | Test modifiers, parametrized tests, mocking, snapshots, CLI flags |
| `references/ecosystem.md` | SQLite API, bundler options, plugins, macros |
| `references/config-and-compat.md` | bunfig.toml sections, Node.js compatibility, env vars |

## Prefer Bun-Native APIs

Rule: if `Bun.*` or `bun:*` has it, use it. Fall back to `node:*` only when there's no
Bun-native alternative or when portability to Node.js is required.

Core mappings: `Bun.serve()` over `http.createServer()`, `Bun.file()`/`Bun.write()` over
`node:fs`, `Bun.$` over `child_process.exec`, `bun:sqlite` over `better-sqlite3`,
`bun:test` over Jest/Vitest, `Bun.password` over `bcrypt`, `Bun.sleep()` over `setTimeout`
wrappers, `Bun.spawn()` over `child_process.spawn`. Use `node:fs` for directory ops —
no Bun API yet. Use Web Streams API over `node:stream`.

Full API preference table: see `references/io-and-processes.md`.

## HTTP Server

### Routing

1. **Use `routes` object** (v1.2.3+) for declarative path matching. Preferred over
   `fetch`-based routing.
2. **Route types:** exact (`"/users/all"`, highest priority), parameterized
   (`"/users/:id"`, `req.params.id`), wildcard (`"/api/*"`), per-method
   (`{ GET: handler, POST: handler }`).
3. **Precedence:** exact > parameterized > wildcard > global catch-all.
4. **`fetch` handler** as fallback for unmatched routes, not primary routing.
5. **Always implement `error` handler** in `Bun.serve()`.
6. **`development: true`** in dev for built-in error pages.

### Static Responses

7. **Use static `Response` objects** for health checks, redirects, fixed JSON — they are
   zero-allocation after init, cached for server lifetime.
8. **Call `server.reload()`** to update static responses at runtime.

### Request Object

9. **Route handlers receive `BunRequest`** (extends `Request`) with `params` (auto
   URL-decoded) and `cookies` (auto-tracked `CookieMap`).
10. **TypeScript infers param shape** when route is a string literal.
11. **Cookie changes are auto-tracked** — `Set-Cookie` headers added automatically when
    using `req.cookies.set()` / `.delete()`.

### WebSocket

12. **Upgrade via `server.upgrade(req, { data })`** in the `fetch` handler.
13. **Use native pub/sub** for topic-based broadcasting: `ws.subscribe("topic")`,
    `ws.publish("topic", data)`.
14. **Type `ws.data`** via the `data` property on the `websocket` handler object.

WebSocket limits, server configuration, file response patterns, HTML imports, and server
lifecycle details: see `references/server.md`.

## File I/O

1. **`Bun.file()` is lazy.** Creating a `BunFile` does not read from disk. It conforms
   to `Blob`.
2. **Read with `.text()`, `.json()`, `.bytes()`, `.stream()`, `.arrayBuffer()`** on
   `BunFile`.
3. **Check existence:** `await file.exists()`. Access `file.size` and `file.type`.
4. **`Bun.write()` handles all types** — string, Blob, Response, ArrayBuffer, BunFile.
   Uses fastest syscall per platform (`copy_file_range`, `sendfile`, `clonefile`).
5. **Incremental writing:** use `file.writer()` (`FileSink`). Call `.flush()` to flush
   buffer, `.end()` to flush + close (required to let process exit).
6. **Built-in stdio references:** `Bun.stdin` (readonly), `Bun.stdout`, `Bun.stderr`.
7. **Use `node:fs` for directory ops** — `mkdir`, `readdir`. No Bun-specific API yet.
8. **`import.meta.dir`** gives the directory of the current file.

## Shell API — `Bun.$`

Cross-platform bash-like shell with JavaScript interop. Runs in-process (not `/bin/sh`).

1. **`$` tagged template** for shell commands. Interpolated values are auto-escaped —
   injection-safe by default.
2. **Read output:** `.text()` (string, auto-quiets), `.json()` (parsed), `.lines()`
   (async iterator), `.blob()`, or `await $\`...\`` for `{ stdout, stderr }` Buffers.
3. **`.quiet()`** to suppress stdout/stderr output.
4. **Non-zero exit codes throw `ShellError`** by default. Use `.nothrow()` to handle exit
   codes manually. Configure globally: `$.nothrow()` or `$.throws(false)`.
5. **Piping and redirection** work: `|`, `>`, `2>&1`, `< ${Bun.file("input.txt")}`,
   `< ${response}`.
6. **Set environment/cwd:** `.env({ FOO: "bar" })`, `.cwd("/tmp")`. Global defaults:
   `$.env(...)`, `$.cwd(...)`.
7. **Security:** interpolated variables are escaped (no command injection), but argument
   injection is still possible (external commands interpret their own flags). Spawning
   `bash -c` bypasses Bun's protections.

## Child Processes

1. **`Bun.spawn()`** for fine-grained async process control. Access `proc.pid`,
   `proc.stdout`, `proc.exited`, `proc.exitCode`. Kill with `proc.kill()`.
2. **`Bun.spawnSync()`** for blocking execution. Rule: `spawnSync` for CLI tools,
   `spawn` for servers.
3. **Timeout and abort:** `{ timeout: 5000, killSignal: "SIGKILL" }` or pass
   `AbortController.signal`.
4. **IPC between Bun processes:** `Bun.spawn(["bun", "child.ts"], { ipc(message) {} })`.

Stdin/stdout options, workers, and process details: see `references/io-and-processes.md`.

## Testing — `bun:test`

1. **Import from `bun:test`**, not `jest` or `vitest`.
2. **Jest-compatible API:** `test`, `describe`, `expect`, `mock`, `spyOn`, `beforeAll`,
   `beforeEach`, `afterEach`, `afterAll`.
3. **Run with `bun test`** — auto-discovers `*.test.*` and `*.spec.*` files.
4. **Cleanup:** `mock.restore()` restores all spied functions, `mock.clearAllMocks()`
   clears history. Add to `afterEach`.
5. **`mock.module("./path", () => ({ ... }))`** for module mocking. Works for ESM and CJS.

Test modifiers, parametrized tests, mocking details, snapshots, CLI flags, and
bunfig.toml test config: see `references/testing.md`.

## SQLite, Bundler, Plugins, Macros

- **SQLite:** use `bun:sqlite` — native, synchronous, 3-6x faster than `better-sqlite3`.
  Enable WAL mode. Use prepared statements and transactions.
- **Bundler:** `Bun.build()` with targets `"bun"`, `"browser"`, `"node"`. Check
  `result.success` and iterate `result.logs` on failure.
- **Plugins:** `Bun.plugin()` with `setup(build)` — extend module resolver and loader.
  Register via bunfig.toml `preload`.
- **Macros:** compile-time code execution via `{ type: "macro" }` import. Return value
  inlined; must be JSON-serializable.

Full SQLite API, bundler options, plugin patterns, and macro constraints:
see `references/ecosystem.md`.

## Utilities

### Hashing & Passwords

- `Bun.password.hash(pw)` — argon2id default. Also supports `"bcrypt"`.
- `Bun.password.verify(pw, hash)` — auto-detects algorithm.
- `Bun.hash("data")` — fast non-crypto (Wyhash).
- `new Bun.CryptoHasher("sha256")` — crypto hashing.

### Sleep & Timing

- `await Bun.sleep(ms)` — async. `Bun.sleepSync(ms)` — blocking.
- `Bun.nanoseconds()` — high-resolution timer.

### Comparison & Inspection

- `Bun.deepEquals(a, b)` — deep equality. `Bun.deepMatch(subset, obj)` — partial match.
- `Bun.inspect(obj)` — `console.log` format as string. `Bun.peek(promise)` — read without
  awaiting.

### Compression

- Gzip: `Bun.gzipSync(data)` / `Bun.gunzipSync(data)`.
- Deflate: `Bun.deflateSync(data)` / `Bun.inflateSync(data)`.
- Zstd: `Bun.zstdCompressSync(data)` / `Bun.zstdDecompressSync(data)`.

### Paths, UUIDs, Streams

- `Bun.randomUUIDv7()` — time-ordered. `crypto.randomUUID()` — standard v4.
- Stream helpers: `Bun.readableStreamToText/JSON/Bytes/Blob/Array/ArrayBuffer(stream)`.
- `Bun.escapeHTML("<script>")`, `Bun.stringWidth("hello")`.

### Environment & Metadata

- `Bun.version`, `Bun.revision` (git hash), `Bun.env` (alias for `process.env`),
  `Bun.main` (entrypoint path).
- `import.meta.dir`, `import.meta.file`, `import.meta.path` — current file info.

### HTMLRewriter

- Cloudflare-compatible HTML streaming transformer. Works on `Response` objects and strings.

## Package Manager — `bun install`

Drop-in replacement for npm/yarn/pnpm. ~25x faster.

1. **Lockfile:** `bun.lock` (text, default since v1.2) or `bun.lockb` (binary).
2. **Does NOT run `postinstall`** of dependencies by default (security). Add to
   `trustedDependencies` in `package.json` to allow.
3. **Workspaces** supported via `package.json` `workspaces` field.
4. **Auto-install:** when no `node_modules` found, Bun resolves packages on the fly.
5. **`bunx`:** execute package binaries without installing (like `npx`).
6. **`bun install --production`** skips devDependencies.

## Configuration & Compatibility

bunfig.toml sections, environment variable loading, and Node.js API compatibility details:
see `references/config-and-compat.md`.

## Application

When **writing** Bun code:
- Apply all conventions silently — don't narrate each rule being followed.
- If an existing codebase uses Node.js patterns, follow codebase style but flag
  that Bun-native alternatives exist.
- For new projects, use Bun-native APIs throughout.

When **reviewing** Bun code:
- Cite the specific Node.js-to-Bun migration and show the fix inline.
- Don't lecture — state what's suboptimal and how to fix it.

## Integration

The **javascript** skill governs language choices; this skill governs Bun runtime and
toolchain decisions. Activate **typescript** alongside both when working with TypeScript.

**Use Bun APIs, not Node.js polyfills. When in doubt, check if Bun has a native API.**
