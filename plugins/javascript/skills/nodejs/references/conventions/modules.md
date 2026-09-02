# Module Resolution and Package Manifests

How Node decides what a file is, how a specifier resolves, and which `package.json` fields change runtime behavior.

## What decides a file's module system

Resolution order, most specific first:

- **`.mjs` and `.mts`** — always an ES module, whatever `package.json` says.
- **`.cjs` and `.cts`** — always CommonJS, whatever `package.json` says.
- **`.js` and `.ts`** — the `"type"` field of the nearest parent `package.json`. `"module"` means ES module,
  `"commonjs"` or an absent field means CommonJS.
- **No extension, or `.js` with no `"type"` field** — syntax detection parses it as CommonJS and re-parses it as an ES
  module if that fails. This is on by default from 20.19.0 and 22.7.0.

The lookup walks up from the file, not from the process working directory, and it stops at the first `package.json` it
finds. A file under `./scripts/` with no `package.json` inherits the repository root's `"type"`; a file under
`node_modules/pkg/` inherits that package's.

**Declare `"type"` explicitly in every `package.json`.** Syntax detection re-parses every ambiguous ES module, which
costs startup time on each one, and the fallback masks a real syntax error as a module-system mismatch.

`--input-type=module|commonjs` decides the module system for `--eval` and stdin, which have no file to look up.

## ES module specifier rules

- **The resolver performs no extension search and no directory-index lookup.** It loads the specifier as written, in
  `import` and `import()` alike, which is why a bundler resolves `./startup` and Node throws `ERR_MODULE_NOT_FOUND`. The
  CommonJS resolver reports the same miss as `MODULE_NOT_FOUND`, with no `ERR_` prefix.
- **Specifiers are URLs.** `#` and `?` must be percent-encoded. A different query or fragment makes a different module
  instance, so `./x.mjs?v=1` and `./x.mjs?v=2` are loaded and evaluated twice.
- **`file:`, `node:`, and `data:` schemes resolve.** `https:` does not without a loader hook.
- **`data:` URLs cannot resolve relative specifiers**, because `data:` is not a special scheme. They resolve bare
  builtin specifiers and absolute specifiers only.
- **The `assert` import-attribute form was removed in 22.0.0 and throws a `SyntaxError`.** Only `with { type: 'json' }`
  parses.
- **`import.meta.dirname` and `import.meta.filename` exist only on `file:` modules.** Neither is defined for a `data:`
  or `https:` module, and neither exists in CommonJS.

## `require()` of an ES module

Unflagged from 20.19.0 and 22.12.0.

- A graph with no top-level `await` returns the module namespace object, or the value of the `"module.exports"` named
  export if the module defines one.
- A graph containing top-level `await` anywhere throws `ERR_REQUIRE_ASYNC_MODULE`. This is a property of the whole
  graph, so a transitive dependency adding top-level `await` breaks a caller that never changed.
- `process.features.require_module` reports whether the runtime supports it.
- **A library cannot rely on it** unless its `engines.node` floor is at or above the version that unflagged it on every
  line it claims to support.

## `"exports"` and `"imports"`

- **`"exports"` seals the package.** Once present, a path not listed is not importable, including by a deep relative
  path. A consumer reaching into `pkg/lib/internal.js` breaks the moment `"exports"` is added, which is the point.
- **Every target must be a relative URL starting with `./`.** Absolute paths, `file:` URLs, and `../` targets are
  rejected. Segments of `.`, `..`, and `node_modules` are rejected anywhere in a target or in the substituted part of a
  pattern.
- **Node's own conditions**, most specific first: `"node-addons"`, `"node"`, `"import"`, `"require"`, `"module-sync"`,
  `"default"`. `"types"` is not Node's — it belongs to type systems and is conventionally written first.
- **`"import"` and `"require"` are mutually exclusive** and describe the calling syntax, not the target's format. A
  `.mjs` file behind `"require"` is legal and loads through `require(esm)`.
- **`"module-sync"` matches under both** `import` and `require()`, and promises the target is an ES module with no
  top-level `await`. It is the way to ship one ES module file to both callers without a dual build.
- **Nested conditions fall through** — a nested object that matches nothing continues with the parent's remaining
  conditions, like nested `if`.
- **Custom conditions come from `--conditions=name` (`-C`)**, repeatable. Unknown conditions are ignored by default.
- **`"imports"` entries must start with `#`** and are private to the package. Unlike `"exports"`, they may map to an
  external package name.
- **Subpath patterns use a single `*`** in key and target; the matched segment is substituted. This is not a glob — one
  `*` per key.

### The dual-package hazard

Shipping the same package as both CommonJS and ES module gives a process two distinct copies of the module: two class
identities, two module-level caches, two sets of singletons. `instanceof` fails across the boundary and any registry
kept at module scope is duplicated.

- Ship one format and let `require(esm)` bridge it, using `"module-sync"` where a CommonJS caller must load it
  synchronously.
- Where a dual build is unavoidable, keep all state in a CommonJS file that both entry points `require`, so there is one
  copy of the state even with two copies of the wrapper.

### Self-reference

A package with `"exports"` can import its own name (`import x from 'my-pkg/feature'`) from inside itself, which resolves
through the same `"exports"` map an external consumer sees. This is the way to test the public contract rather than the
file layout.

## Manifest fields that change runtime behavior

- **`"type"`** — decides `.js` and `.ts` interpretation. See above.
- **`"exports"`** — seals the package and selects entry points by condition.
- **`"imports"`** — `#`-prefixed internal specifiers, conditional, may point at external packages.
- **`"main"`** — the pre-`"exports"` entry point. Keep it only as a fallback for resolvers that do not read `"exports"`;
  `"exports"` wins wherever both are read.
- **`"engines"`** — the floor the project claims. `npm` enforces it only with `engine-strict=true`; Node itself never
  reads it. Its value is the contract, not the enforcement.
- **`"packageManager"`** — read by Corepack, which stopped shipping with Node 25. Absent an installed `corepack`, the
  field is inert.
- **`"imports"` cannot express `tsconfig` path aliases**, and type stripping does not read `tsconfig.json`, so `#`
  imports are the only alias mechanism that survives `node file.ts`.

## Loader hooks

Two APIs, and the older one is on its way out.

- **`module.registerHooks({ resolve, load })`** (22.15.0 and 23.5.0; Release candidate from 24.13.1 and 25.4.0) — runs
  synchronously on the same thread as the application. Returns an object with `deregister()`, so hooks can be scoped;
  `[Symbol.dispose]` was added in 26.7.0. This is the target API.
- **`module.register(specifier)`** (20.6.0) — runs asynchronous hooks on a dedicated thread, communicating through
  `initialize()` and a `MessagePort`. Runtime-deprecated as DEP0205 in 26.0.0. Under the Permission Model it needs
  `--allow-worker`, because the hook thread is a worker.
- **A hook thread cannot call `import.meta.resolve`** — it would deadlock, and the API is unavailable there.
- **Hooks chain in reverse registration order**, each receiving `nextResolve`/`nextLoad`. A hook that does not call the
  next one terminates the chain.

## Package maps

`--experimental-package-map` (26.4.0, Experimental) resolves bare specifiers from a JSON table instead of walking
`node_modules`. The resolution runs without touching the file system, which removes phantom-dependency resolution and
symlink-hoisting differences in a monorepo. Treat it as unstable: the configuration format is not committed.

## Compile cache

`NODE_COMPILE_CACHE=dir`, or `module.enableCompileCache([options])` (22.8.0; Stable from 25.4.0), persists the V8 code
cache across runs and speeds up repeat loads of the same graph.

- The cache is keyed on absolute module paths unless `portable: true` (24.12.0) or `NODE_COMPILE_CACHE_PORTABLE=1`.
- Entries are written when the process is about to exit; `module.flushCompileCache()` forces them out earlier so a child
  process can use them.
- The on-disk layout is not portable across Node versions. Point it at a directory under `os.tmpdir()`.
- `NODE_DISABLE_COMPILE_CACHE=1` turns it off, which matters for coverage runs where cached code reports imprecisely.
