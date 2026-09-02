# Node 24 (Krypton)

Released 2025-05-06. Active LTS from 2025-10-28, maintenance from 2026-10-20, end of life 2028-04-30. Ships V8 13.6, npm
11, and undici 7.

The default floor for a service that must stay on an LTS line through 2028.

## Added

- **V8 13.6 language surface** — `Float16Array`, explicit resource management (`using` and `await using`,
  `Symbol.dispose`, `Symbol.asyncDispose`), `RegExp.escape`, `Error.isError`, WebAssembly Memory64.
- **`URLPattern` global** (24.0.0, Experimental) — no import needed.
- **`asyncLocalStorage.name`** (24.0.0) — labels an instance for diagnostics.
- **`import.meta.main`** (24.2.0, backported to 22.18.0; Early development) — true when the module is the process entry
  point. The stable equivalent for CommonJS is `require.main === module`.
- **`--watch-kill-signal`** (24.4.0, Active development) — the signal watch mode sends on restart, `SIGTERM` by default.
- **`--permission-audit`** (24.20.0) — runs every permission check and publishes each violation to a
  `node:permission-model:*` diagnostics channel without denying access.
- **`portable` option on `module.enableCompileCache()`** (24.12.0) — keeps the cache valid when the project directory
  moves.
- **`Buffer.poolSize` default raised from 8192 to 65536** (24.18.0) — the pooling threshold (`Buffer.poolSize >>> 1`)
  moves from 4 KiB to 32 KiB, so a retained slice of a small `Buffer.allocUnsafe` result pins 64 KiB. The change landed
  on the 26 line first (26.3.0) and was backported here, so 26.0 through 26.2 pool at the old 8192 — measured 8192 on
  26.2.0. A `>=24.18` floor gets the larger pool on the older runtime and the smaller one on the newer.
- **`#/`-prefixed subpath imports** (24.14.0) — `"#/lib/x.js"` in the `"imports"` field.

## Behavior changes

- **`--experimental-permission` renamed to `--permission`** (24.0.0). The old name is gone from this major.
- **`AsyncLocalStorage` runs on `AsyncContextFrame`** (24.0.0) — the default implementation changed. Context propagation
  through user-implemented thenables and through code that reached into `async_hooks` internals can behave differently
  from Node 22.
- **The test runner awaits subtests automatically** (24.0.0) — a subtest promise does not have to be returned or
  awaited. A Node 22 test that awaits explicitly still passes; a Node 22 test that forgot to starts passing here, which
  hides the bug on the older line.
- **Type stripping stops emitting an experimental warning** (24.3.0) and is marked Stable (24.12.0).
- **`url.parse()` runtime-deprecated** (24.0.0, DEP0169) — every call prints a warning. Use `new URL()`.
- **`args` with `{ shell: true }` runtime-deprecated** (24.0.0, DEP0190) — `child_process.spawn` and `execFile` do not
  escape the array under a shell, only join it with spaces, which is a command-injection hole.
- **Removed** — `tls.createSecurePair`, `SlowBuffer`, `fs.truncate` with a file descriptor, `OutgoingMessage._headers`
  and `_headersList`, `tls.Server.prototype.setOptions`, `net._setSimultaneousAccepts`.
- **Runtime-deprecated without `new`** — `node:zlib` classes, `node:repl` classes.

## Traps

- **`--permission` on this major does not restrict the network.** The restricted set is the file system, child
  processes, worker threads, native addons, WASI, and the inspector. `--allow-net` does not exist here; it arrived in
  25.0.0. A deployment that treats `--permission` as a sandbox on Node 24 has an unconfined egress path.
- **Corepack ships with this major and stops shipping with 25.** A `packageManager` field that relies on the bundled
  `corepack` binary works on this line and breaks on 26, where the binary is absent. Install `corepack` from the
  registry, or pin the package manager another way.
- **`--build-sea` does not exist on this major.** Single-executable builds go through `--experimental-sea-config` plus a
  separate injection step (`postject`). The one-flag path arrived in 25.5.0.
- **V8 13.6 implements `using` and `await using` natively.** A build that downlevels them produces a disposal order the
  runtime does not.
