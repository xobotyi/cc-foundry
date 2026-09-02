# Node 22 (Jod)

Released 2024-04-24. Active LTS from 2024-10-29, maintenance from 2025-10-21, end of life 2027-04-30. Ships V8 12.4 and
npm 10.

Maintenance means security and critical fixes only — no new capability lands on this line. A feature listed below under
a 22.x version reached the line by backport and is absent from earlier 22 patch releases, so a floor of `>=22` is not
the same promise as `>=22.18`.

## Added

- **`node --run <script>`** (22.0.0) — runs a `package.json` script without a package manager. It does not run `pre` and
  `post` scripts, sets `NODE_RUN_SCRIPT_NAME` and `NODE_RUN_PACKAGE_JSON_PATH` (both 22.3.0), and ignores variables
  loaded by `--env-file`.
- **`fs.glob` and `fs.globSync`** (22.0.0) — removes the `glob` dependency for path matching.
- **`WebSocket` global** (22.0.0) — the client, on by default. There is no built-in server.
- **Module compile cache** (22.1.0) — `NODE_COMPILE_CACHE=dir` persists the V8 code cache across runs.
  `module.enableCompileCache()` arrived in 22.8.0.
- **`node:sqlite`** (22.5.0, Experimental) — behind `--experimental-sqlite`; unflagged in 22.13.0. The session extension
  arrived in 22.12.0.
- **Type stripping** (22.6.0, Experimental) — behind `--experimental-strip-types`. Enabled by default in 22.18.0.
  `--experimental-transform-types`, which also rewrites enums and parameter properties, arrived in 22.7.0.
- **`--env-file-if-exists`** (22.9.0) — the tolerant form of `--env-file`. Both reached Stable in 22.21.0.
- **`module.stripTypeScriptTypes(code)`** (22.13.0) — the programmatic form of type stripping.
- **`module.registerHooks(options)`** (22.15.0) — synchronous, in-thread loader hooks. This is the replacement for
  `module.register()`, which was runtime-deprecated in 26.0.0.
- **`--experimental-config-file` and `node.config.json`** (22.16.0) — flags declared in a file rather than on the
  command line.
- **`--test-isolation=mode`** (22.8.0 as `--experimental-test-isolation`) — `process` (the default) or `none`.

## Behavior changes

- **`require(esm)` unflagged** (22.12.0) — `require()` of an ES module graph without top-level `await` returns the
  namespace object. A graph containing top-level `await` throws `ERR_REQUIRE_ASYNC_MODULE`.
- **Type stripping on by default** (22.18.0) — `node file.ts` executes without a flag. Disable it with
  `--no-experimental-strip-types` on this line; the flag was renamed `--no-strip-types` in 24.12.0 and 25.2.0, and both
  names work on 26.2.0.
- **Syntax detection on by default** (22.7.0) — an ambiguous `.js` or extensionless file is retried as an ES module
  after a CommonJS parse failure.
- **Import assertions removed** (22.0.0) — `assert { type: 'json' }` throws. Only `with { type: 'json' }` parses.
- **Permission Model marked Stable** (22.13.0) — and the flag `--permission` accepted alongside
  `--experimental-permission`.
- **JSON modules marked Stable** (22.12.0).
- **Watch mode marked Stable** (22.0.0).
- **Default byte-stream `highWaterMark` raised to 64 KiB** (22.0.0) — a `Transform` sized against the old 16 KiB default
  buffers four times as much before applying backpressure.
- **Maglev enabled** (22.0.0) — V8's mid-tier compiler, which changes warm-up timing in benchmarks written against
  Node 20.

## Traps

- **The 22 line has no `--allow-net`.** `--permission` on this major restricts the file system, child processes, worker
  threads, native addons, WASI, and the inspector. Network access is not restricted at all — a confined process can
  still open any socket. Network confinement arrived with `--allow-net` in 25.0.0.
- **npm 10 ships with this major.** `min-release-age` needs npm 11.10.0 or later, and npm trusted publishing needs npm
  11.5.1 with Node 22.14.0 or later. A Node 22 CI image without an npm upgrade silently has neither.
- **Type stripping is a patch-version gate, not a major-version gate.** `node file.ts` fails on 22.17 and succeeds on
  22.18. Pinning `engines.node` to `>=22` and running `.ts` entrypoints is a broken contract.
- **`module.registerHooks` did not exist before 22.15.0**, so a loader that targets a `>=22` floor has to keep the
  `module.register` path as a fallback, which 26.0.0 warns on.
