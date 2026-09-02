# Node 20 (Iron)

Released 2023-04-18. Active LTS from 2023-10-24, maintenance from 2024-10-22, end of life 2026-04-30. Ships V8 11.3.
Receives no further releases, security or otherwise.

A project whose `engines.node` floor is `>=20` still runs on Node 22, 24, and 26, so the floor decides what may be
written; the end-of-life date decides whether the floor itself is defensible. Raise it.

## Added

- **Permission Model** (20.0.0, Experimental) — behind `--experimental-permission`. The flag was renamed to
  `--permission` in 24.0.0, so a script written against Node 20 uses a flag name that Node 24 and later do not accept.
- **`--env-file=file`** (20.6.0, Experimental) — loads `KEY=value` pairs into `process.env`. Multi-line values arrived
  in 20.12.0. Stability rose to Stable in 22.21.0 and 24.10.0.
- **`module.register(specifier)`** (20.6.0) — registers asynchronous loader hooks on a dedicated thread. Runtime-
  deprecated as DEP0205 in 26.0.0.
- **`import.meta.dirname` and `import.meta.filename`** (20.11.0, Experimental) — stability rose to Stable in 22.16.0 and
  24.0.0.
- **Synchronous `import.meta.resolve()`** (20.0.0) — returns a string rather than a promise. Code written against Node
  18 that awaits it still works, but the await is meaningless.
- **Test runner marked Stable** (20.0.0) — `node:test` and `node --test` left experimental status here.
- **Single-executable applications take a blob** (20.0.0) — the injected artifact is a blob prepared from a JSON config,
  not a raw JavaScript file. `useSnapshot` and `useCodeCache` arrived in 20.6.0.

## Behavior changes

- **`require(esm)` unflagged** (20.19.0) — `require()` of an ES module graph without top-level `await` returns the
  namespace object instead of throwing `ERR_REQUIRE_ESM`. A graph containing top-level `await` throws
  `ERR_REQUIRE_ASYNC_MODULE`. Disable with `--no-experimental-require-module`; detect with
  `process.features.require_module`.
- **Syntax detection unflagged** (20.19.0) — a `.js` or extensionless file with no `"type"` in the nearest
  `package.json` is parsed as CommonJS first and re-parsed as an ES module if that fails. The retry costs startup time
  on every ES module; declaring `"type": "module"` removes it.
- **`process.exit(code)` validates its argument** (20.0.0) — only a number, or a string holding an integer, is accepted.
- **`new WASI()` requires `version`** (20.0.0) — the default was removed.
- **ESM loader hooks run on a dedicated thread** (20.0.0) — hooks do not share scope with application code, which breaks
  any hook that reached into the main thread's module registry.

## Traps

- **The permission flag name differs from every later major.** `--experimental-permission` on 20, `--permission` from
  24.0.0 (and on 22.13.0 and 23.5.0, where the model was marked Stable). A Dockerfile or process manager unit that
  hardcodes one name fails silently on the other: an unrecognized `--allow-*` flag makes Node exit, but a wrapper that
  drops unknown flags leaves the process unconfined.
- **`--experimental-require-module` before 20.19.0.** On 20.17.0 through 20.18.x the feature exists only behind the
  flag, so `require()` of an ES module in a library published as CommonJS fails on part of the 20 line and works on the
  rest.
