# Node 26

Released 2026-05-05. Current until 2026-10-28, Active LTS from then, maintenance from 2027-10-20, end of life
2029-04-30. Ships V8 14.6, npm 11, and undici 8. `NODE_MODULE_VERSION` is 147, so every native addon needs rebuilding
against this major.

Writing a floor of `>=26` before 2026-10-28 pins a project to a Current line, which takes breaking changes on a
six-month cadence. Wait for the LTS transition unless a feature listed here is load-bearing.

## Added

- **`Temporal` enabled by default** (26.0.0) — the global is present without a flag. `Temporal.Instant` support in
  `fs.Stats` and `fs.BigIntStats` arrived in 26.2.0.
- **V8 14.6 language surface** — `Map.prototype.getOrInsert` and `getOrInsertComputed` (and the `WeakMap` forms),
  `Iterator.concat`.
- **`node:ffi`** (26.1.0, Experimental) — behind `--experimental-ffi`, and `--allow-ffi` under the Permission Model.
  Loading a dynamic library and calling a native symbol from JavaScript. An invalid pointer or a wrong signature crashes
  or corrupts the process.
- **`crypto.randomUUIDv7()`** (26.1.0) — time-ordered UUIDs. The generator is not monotonic within a millisecond, so two
  values generated back to back are not guaranteed to sort in creation order.
- **`permission.drop(scope[, reference])`** (26.3.0, Active development) — irreversibly gives up a granted permission.
  It only affects future checks: file descriptors, sockets, child processes, and workers already open stay open.
- **`Buffer.poolSize` default raised from 8192 to 65536** (26.3.0, backported to 24.18.0) — `Buffer.allocUnsafe`,
  `Buffer.from(string)`, `Buffer.from(array)`, and `Buffer.concat` slice from one pre-allocated buffer below
  `Buffer.poolSize >>> 1`, so the pooling threshold moves from 4 KiB to 32 KiB. More small buffers alias the same
  `ArrayBuffer`, and retaining one retains the whole slab.
- **Package maps** (26.4.0, Experimental) — behind `--experimental-package-map`. A JSON table resolves bare specifiers
  without walking `node_modules`, which removes phantom-dependency resolution in a monorepo.
- **`node:vfs`** (26.4.0, Experimental) — mounts an in-process virtual file system that `node:fs/promises` dispatches
  to.
- **`--experimental-import-text`** (26.5.0, Early development) — `import s from './x.txt' with { type: 'text' }`.
- **`--build-sea=config`** (from 25.5.0, Active development) — builds a single executable in one step, replacing the
  `--experimental-sea-config` plus `postject` sequence.
- **`--allow-openssl-store`** (26.7.0, Active development) — the Permission Model denies OpenSSL STORE loaders without
  it. A loader granted this way is not constrained by the `fs` or `net` scopes.
- **`readOnly` option on `module.enableCompileCache()`** (26.8.0) — consumes a cache shipped with the application and
  never writes.
- **`zlib.ZipEntry`, `ZipFile`, `ZipBuffer`** (26.8.0) — ZIP reading in the standard library.

## Behavior changes

- **`module.register()` runtime-deprecated** (26.0.0, DEP0205) — every registration prints a warning. Move asynchronous,
  off-thread hooks to `module.registerHooks()`, which is synchronous and in-thread.
- **`--experimental-transform-types` removed** (26.0.0) — enums, `namespace` with runtime code, and parameter properties
  have no runtime path on this major. Compile them ahead of time or stop using them.
- **`TracingChannel` marked Stable** (26.8.0) — the tracing subscriber API is committed.
- **`stream.compose` marked Stable** (26.2.0).
- **`--disable-warning` marked Stable** (26.7.0); **`--experimental-config-file` marked Release candidate** (26.7.0).
- **Removed** — `node:_stream_*` (DEP0193), `http.Server.prototype.writeHeader()`, short GCM authentication tags without
  an explicit `authTagLength` (DEP0182).
- **Runtime-deprecated** — passing `options.type` to `Duplex.toWeb()` (DEP0201), passing a `CryptoKey` to `node:crypto`
  APIs (DEP0203), `KeyObject.from()` with a non-extractable `CryptoKey` (DEP0204).
- **`localStorage` returns `undefined` without a backing file** (26.0.0) rather than throwing.
- **`Readable` reads one buffer at a time** (26.0.0) — a consumer that assumed a `read()` returned everything buffered
  gets a different chunking pattern.
- **Corepack is not distributed** — the binary stopped shipping with Node 25. A `packageManager` field that depended on
  the bundled `corepack` needs it installed from the registry.

## Traps

- **`--permission` gained a network scope, so an allow-list that worked on 24 denies traffic here.** `--allow-net` is
  enforced from 25.0.0 onward. A process migrated from Node 24 with the same flags loses every outbound connection.
- **`--permission-audit` is not a sandbox.** It runs the checks and publishes violations to
  `node:permission-model:{fs,net,child,worker,inspector,wasi,addon,ffi}`, but denies nothing. `--permission` wins when
  both are passed.
- **`process._debugProcess(pid)` is not gated by any permission scope.** A process under `--permission` with no grants
  can force any other Node process running as the same OS user to open its V8 inspector. Separate OS users or an OS
  sandbox is the only fix.
- **A native addon built for Node 24 will not load.** `NODE_MODULE_VERSION` moved 137 → 147.
- **`module.register()` still works while warning.** Silencing the warning with `--disable-warning=DEP0205` leaves the
  removal ahead; the migration is `module.registerHooks()`.
