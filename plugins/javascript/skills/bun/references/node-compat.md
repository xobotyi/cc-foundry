# Node Compatibility Boundary

Where `node:` code stops behaving as it does under Node. From 1.4.0 Bun targets Node 26 and reports itself as such;
1.3.x reports Node 24. This file carries only the modules with a gap that changes what gets written.

## No Bun implementation

- **`node:sea`** — not implemented. `bun build --compile` is the replacement, and it is a different API, not a drop-in
  one.

## Partial, in a way that decides your design

- **`node:test`** — the in-process API works when the file runs under `bun test`: tests, suites, subtests, hooks,
  `t.plan()`, `t.assert`, `t.waitFor()`, `t.mock`. `run()` needs an explicit `files` list and spawns a `bun test` child
  per file; most of its options (`globPatterns`, `watch`, `coverage`, `shard`, `only`, `testNamePatterns`) throw
  `ERR_NOT_IMPLEMENTED`. Absent: `node:test/reporters`, snapshot testing, `mock.module()`, `t.runOnly()`, coverage,
  `--test-only`, test-level `signal`, and Node's `--test` runner mode. `test.only()` and `{ only: true }` parse but do
  not filter, and `concurrency` is validated but subtests always run serially. Write `bun:test` instead.
- **`node:async_hooks`** — `AsyncLocalStorage` and `AsyncResource` work. `createHook`, `executionAsyncId`,
  `triggerAsyncId`, and `executionAsyncResource` are stubs: hooks are not invoked apart from `init` for
  `process.nextTick`, and async ids are always `0`. `AsyncLocalStorage` context does **not** propagate into
  `MessagePort`, `BroadcastChannel`, or `Worker` events, so a request-scoped store does not survive a hop to a worker.
- **`node:crypto`** — backed by BoringSSL, which is missing key types `ed448`, `x448`, `rsa-pss`, `dsa`, and `dh`; every
  EC curve except P-224/256/384/521 (so no `secp256k1`); and the CCM, OCB, XTS, and `chacha20-poly1305` ciphers.
  `argon2()` and `setEngine()` throw, `setFips()` is a no-op, `secureHeapUsed()` returns `undefined`, and
  `encapsulate`/`decapsulate` are absent (ML-KEM keys work through `crypto.subtle`). A package that signs with
  `secp256k1` or `ed448` does not run.
- **`node:tls`** — no `pskCallback`, no OCSP stapling, no server `'newSession'`/`'resumeSession'` events, and
  `ticketKeys` is ignored, so **session resumption does not work across processes**. `tlsSocket.renegotiate()` always
  fails and `getEphemeralKeyInfo()`/`getSharedSigalgs()` return nothing, both because of BoringSSL.
- **`node:https`** — `request`, `get`, `Agent`, and `globalAgent` work with connection pooling. `https.Server` is an
  `http.Server` with TLS options rather than a `tls.Server`, and request sockets are not `tls.TLSSocket`s: `encrypted`,
  `authorized`, and `servername` work, but `getPeerCertificate()` and `getCipher()` are missing, as are
  `setSecureContext()`, `addContext()`, `SNICallback`, and `handshakeTimeout`. Per-host certificates and client-cert
  inspection need a different design.
- **`node:cluster`** — `net` and `dgram` servers in workers are shared through the primary as in Node (`SCHED_RR`,
  `SCHED_NONE`) and handles pass through `worker.send()`. `node:http` and `node:https` servers in workers each bind
  their own socket instead, so **load-balancing HTTP across processes works only on Linux**, through `SO_REUSEPORT`.
- **`node:child_process`** — IPC carries `net.Socket`, `net.Server`, and `dgram.Socket` handles, including to and from
  Node processes, but not `http` server sockets. `serialization: "advanced"` works only between two Bun processes, so
  Bun-to-Node IPC needs JSON serialization. `subprocess.channel.ref()`/`unref()` are missing, a child's `stdout` cannot
  be another child's `stdio`, and `spawnSync` does not return extra `stdio` pipes in `output`. From 1.4.0
  `options.encoding` is ignored as in Node; `stdout` and `stderr` always emit `Buffer`, so call
  `child.stdout.setEncoding()` for strings.
- **`node:module`** — `module.register` is a no-op, as are `syncBuiltinESMExports`, `module._load`, and
  `module._pathCache`. Loader hooks belong to `Bun.plugin`. Overriding `require.cache`, `require.extensions`, and
  `module._resolveFilename` does work. Missing `Module#load()`, `registerHooks`, `findPackageJSON`,
  `stripTypeScriptTypes`, and the source-maps accessors; `findSourceMap` always returns `undefined`.
- **`node:v8`** — `serialize` and `deserialize` use JavaScriptCore's wire format, **not V8's**, so a buffer does not
  travel between Bun and Node. Heap statistics describe JavaScriptCore's single heap and `setFlagsFromString` ignores
  its argument. Missing `queryObjects`, `startCpuProfile`, `startHeapProfile`, `Serializer`/`Deserializer`,
  `takeCoverage`/`stopCoverage`, and `promiseHooks`. Use `bun:jsc` for profiling.
- **`node:perf_hooks`** — `monitorEventLoopDelay()`, `createHistogram()`, `timerify()`, and `PerformanceObserver` for
  `mark`, `measure`, `function`, `net`, `http`, and `http2` entries work. `gc`, `dns`, and `resource` entries are never
  emitted, `eventLoopUtilization()` always returns zeros, and `performance.nodeTiming` holds placeholders. The
  Node-specific additions to the global `performance` appear only after `node:perf_hooks` is imported.
- **`node:worker_threads`** — `Worker` ignores `trackUnmanagedFds`, `execArgv` only sets `process.execArgv` inside the
  worker, `worker.performance.eventLoopUtilization()` is a stub, and `moveMessagePortToContext` and `locks` are missing.
- **`node:inspector`** — `Session` covers the `Profiler` domain including precise coverage, `Runtime.enable`, and
  `NodeTracing`. `Runtime.evaluate`, the `HeapProfiler` domain, and `Network` are not implemented. `open()` serves
  `Debugger` and `Runtime` and throws inside a worker.
- **`node:vm`** — core plus ES modules: `Script`, `createContext`, `runInContext`, `runInNewContext`,
  `runInThisContext`, `compileFunction`, `isContext`, `Module`, `SourceTextModule`, `SyntheticModule` (exported without
  `--experimental-vm-modules`), and `importModuleDynamically`. An `importModuleDynamically` callback returning a promise
  for a `vm.Module` resolves `import()` to the module object rather than its namespace. `measureMemory()` reports
  whole-heap figures for every context.
- **`node:wasi`** — `args`, `env`, `preopens`, `wasiImport`, and `start()` work, and `bun ./program.wasm` runs a WASI
  command. Missing `getImportObject()` (use `wasiImport`), `initialize()`, and the `sock_accept` import. `version`,
  `returnOnExit`, `stdin`, `stdout`, and `stderr` are ignored, so `proc_exit` exits the Bun process.
- **`node:diagnostics_channel`** — `channel()`, `subscribe()`, `tracingChannel()`, and the `http` client, `http2`, and
  `dgram` built-in channels work. Missing `boundedChannel()` and the `http.server.*`, `net`, `module`, `console`,
  `child_process`, and `worker_threads` channels. A subscriber does not keep a `Channel` alive — hold a reference.
- **`node:domain`** — catches only what is thrown synchronously inside `run()`/`bind()` or emitted by an emitter passed
  to `add()`. Errors from timers, `process.nextTick`, and promises are not routed to the domain.
- **`node:repl`** — `bun --interactive` starts a Node-compatible REPL with no result previews (they need V8's
  side-effect-free eval). Tab completion skips `let`, `const`, and `class` bindings.

## Implemented, with behavior that differs

- **`node:http`** — `http.Server` does not extend `net.Server`. `listen(handle)` and the `fd`, `ipv6Only`, and `signal`
  options of `listen()` are ignored, and `keepAlive`/`keepAliveInitialDelay` on the server are no-ops.
- **`node:net`** — `new net.Socket({ fd })` cannot read from an existing descriptor; only write-only wrapping works.
  `server.listen(handle)` accepts `{ fd }` only. Missing `blockList.toJSON()`/`fromJSON()`.
- **`node:console`** — output goes straight to the stdout and stderr descriptors, so **replacing `process.stdout.write`
  does not capture it**. Object layout differs from `util.inspect`. `console.trace()` writes to stdout and
  `console.time*()` to stderr.
- **`node:os`** — `userInfo()` reads `username`, `shell`, and `homedir` from `USER`, `SHELL`, and `HOME` rather than the
  passwd database. `machine()` returns `"arm64"` on Linux arm64 where Node returns `"aarch64"`.
- **`node:path`** — `matchesGlob()` uses `Bun.Glob` semantics, not minimatch: `*` matches dotfiles and there are no
  extglobs.
- **`node:assert`** — legacy `deepEqual` uses `Bun.deepEquals` semantics rather than Node's loose `==`, and a
  function-valued or `printf`-style `message` is not formatted.
- **`node:stream`** — `isReadable`, `isWritable`, `isErrored`, and `Readable.isDisturbed` understand Node streams only,
  not web streams.
- **`node:tty`** — `ReadStream` and `WriteStream` extend the `fs` streams rather than `net.Socket`, and constructing one
  on a non-TTY descriptor returns a stream with `isTTY` false instead of throwing.
- **`node:sqlite`** — `backup()` runs synchronously and blocks the event loop; Node runs it on a worker thread. A
  `Buffer` database path must be valid UTF-8. On macOS Bun uses the system `libsqlite3.dylib`, so `loadExtension()` and
  `createSession()`/`applyChangeset()` on older releases need a full SQLite build via
  `require("bun:sqlite").Database.setCustomSQLite(path)`.
- **`node:dns`** — from 1.4.0, `dns.lookup()`, `dns.promises.lookup()`, and hostname resolution in `net.connect()` go
  through `getaddrinfo()` on Linux as in Node, so names known only to `systemd-resolved` or a split-DNS VPN resolve
  where they used to fail with `EREFUSED`. `dns.setServers()` no longer affects those calls. `dns.resolve*()` and
  `Bun.dns.lookup()` still use c-ares; `Bun.dns.lookup(name, { backend: "c-ares" })` restores the old path. Missing
  `resolveTlsa`; the `Resolver` `maxTimeout` option is ignored and the callback-style `Resolver` cannot be subclassed.
- **`node:events`** — `EventEmitterAsyncResource` sits on `AsyncResource`, so its `asyncId` is always `0`.
- **`node:fs`** — `Stats` objects have no `Temporal.Instant` getters. From 1.4.0 `fs.rmdir` rejects
  `{ recursive: true }` with `ERR_INVALID_ARG_VALUE` as Node does — use `fs.rm`. `fs.appendFile` with `{ flag: "w" }`
  truncates instead of appending, and an exception thrown in a `node:fs`, `node:dns`, or `crypto.pbkdf2` callback now
  reaches `uncaughtException` rather than `unhandledRejection`.
- **`process`** — `process.binding` covers `buffer`, `config`, `constants`, `fs`, `natives`, `tty_wrap`, `util`, and
  `uv`; the rest throw. Setting `process.title` is a no-op on macOS and Linux. `getActiveResourcesInfo()`,
  `_getActiveHandles()`, and `_getActiveRequests()` return empty arrays, `setSourceMapsEnabled()` is a no-op, and
  `process.report.writeReport()` writes nothing. Missing `sourceMapsEnabled` and `addUncaughtExceptionCaptureCallback`.
  From 1.4.0 `process.title` defaults to `argv[0]` as invoked rather than `"bun"`, and `process.reallyExit()` no longer
  emits `'exit'`.
- **`Buffer`** — capped at 4 GiB (`buffer.constants.MAX_LENGTH` is `2**32`).
- **`Request`** — missing `keepalive` and `duplex`; `credentials`, `integrity`, `referrer`, and `referrerPolicy` are
  accepted and ignored. `fetch()` ignores `integrity` as well, so subresource integrity is not enforced.
- **`Response`** — one constructed from a string does not expose the default `content-type` in `headers`, though
  `Bun.serve()` still sends it.
- **Web streams** — `ReadableStream`, `WritableStream`, and `TransformStream` cannot be transferred with `postMessage()`
  or `structuredClone()`. `structuredClone()` transfers only `ArrayBuffer` and `MessagePort`, and a cloned `Error` loses
  its `cause`.
- **`SubtleCrypto`** — includes `supports()`, `getPublicKey()`, the encapsulation methods, `ML-DSA`,
  `ML-KEM-768`/`ML-KEM-1024`, `SHA3-*`, and `ChaCha20-Poly1305`. Missing `Ed448`, `X448`, `AES-OCB`, `Argon2*`,
  `cSHAKE*`, `KMAC*`, `KT128`/`KT256`, `TurboSHAKE*`, and `ML-KEM-512`, all experimental in Node.
- **`DOMException`** — instances are not native errors, so `Error.isError()` returns `false`.
- **`WebAssembly`** — Memory64 is off by default; `BUN_JSC_useWasmMemory64=1` enables it.

## Node 26 semantics in Bun 1.4.0

Bun 1.4.0 adopts Node 26's own behavior changes; the **nodejs** skill carries what they are. Two of them are Bun facts
rather than Node ones:

- `process.versions.modules` is `147`. A package selecting a prebuilt native addon by `NODE_MODULE_VERSION` needs a
  build for `147`.
- `assert.deepStrictEqual()` and `util.isDeepStrictEqual()` compare prototypes, while `Bun.deepEquals()` and `expect()`
  do not. The same comparison therefore gives two answers depending on which one is called.

## Fetch and Web API changes in 1.4.0 that break working code

- Duplicate response headers combine with `", "` per the Fetch spec instead of keeping only the last value, and a header
  sent with no value reads `""` rather than `null`. `getSetCookie()` still returns `Set-Cookie` separately.
- `Request#clone()` and `Response#clone()` throw `TypeError: Body is disturbed or locked` once the body has been read.
  Clone before reading. This includes the request passed to a `Bun.serve` route handler.
- A `fetch()` network error rejects with `TypeError` rather than `Error`; `.code` is still set. After a failed body
  read, `bodyUsed` is `true` and a second read rejects with `ERR_BODY_ALREADY_USED` rather than the socket error — issue
  a new `fetch()` to retry.
- `fetch()` returns a rejected promise when reading its options throws, instead of throwing synchronously, so a
  synchronous `try`/`catch` around an unawaited call no longer catches it.
- `fetch()` with `redirect: "error"` rejects only on `301`, `302`, `303`, `307`, and `308`; other `3xx` such as `304`
  resolve.
- `fetch()` sends Latin-1 header values byte-for-byte per the spec rather than UTF-8 encoding them.
- The `fetch()` idle timeout (300 seconds) is one deadline for the whole response header block, so a server trickling
  header bytes times out where each byte used to reset the timer.
- `new URL(bad)` throws Node's `TypeError: Invalid URL` with `code` and `input` set.

## Module resolution changes in 1.4.0

- `import "."` and `import ".."` resolve as directories, matching Node. `"."` inside `lib/run.ts` now loads
  `lib/index.ts` where it used to load a sibling `lib.ts`.
- A `.css` import at runtime exports `{}` rather than the file's absolute path. `bun build` already did.
- A `.xml` import returns the parsed document rather than the path; `--loader .xml:file` restores the path.
- `"jsx": "react-jsx"` emits `jsx`/`jsxs` from `<pkg>/jsx-runtime` rather than `jsxDEV`. Use `"jsx": "react-jsxdev"` for
  the development runtime.
- `useDefineForClassFields: false` in `tsconfig.json` is honored, matching `tsc`: instance field initializers move into
  the constructor after parameter-property assignments, and declaration-only fields are dropped.
- A wildcard `exports` or `imports` target that names no existing file is retried with each known extension, and with
  `.ts` in place of `.js`, so a subpath such as `@modelcontextprotocol/sdk/server/stdio` resolves.
- An ESM import of a builtin no longer evaluates every lazy export at import time. A property that throws when
  constructed — `Bun.redis` with an invalid `REDIS_URL` — now throws at the binding that uses it rather than failing the
  whole module.
