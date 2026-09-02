# Bundler, Executables, Plugins, and Macros

Depth on the bundler, single-file executables, plugins, and macros.

## Failure semantics

`Bun.build()` takes `throw`, which defaults to `true`: a failed build **rejects with an `AggregateError`** whose
`errors` array holds `BuildMessage` and `ResolveMessage` instances. `result.success` is only meaningful when you pass
`throw: false`. A `try`/`catch` around the call, or a top-level `await` and Bun's own uncaught-exception printing, is
the normal handling. On success, `result.logs` still holds warnings.

`ResolveMessage` extends `BuildMessage` with `code`, `referrer`, `specifier`, and `importKind`, which is what a
resolution failure needs to be reported usefully.

## Targets and formats

`target` is `"browser"` by default, and selects both the export conditions and the available APIs.

- **`browser`** — prioritizes the `browser` export condition. `node:` imports resolve, but some functions do not work.
  From 1.4.0 a package's `browser` field entry for a Node builtin (`"crypto": false` or a remap) is honored rather than
  bundling the polyfill.
- **`bun`** — for the Bun runtime. Output carries a `// @bun` pragma so the runtime skips re-transpiling. An entrypoint
  with a `#!/usr/bin/env bun` shebang selects this target by itself. `target: "bun"` plus `format: "cjs"` adds
  `// @bun @bun-cjs`, and that CommonJS wrapper does not run under Node.
- **`node`** — prioritizes the `node` condition. Bun does not polyfill the `Bun` global or `bun:*` modules.

`format` is `"esm"` by default, with experimental `"cjs"` and `"iife"`. Choosing `"cjs"` moves the default target from
`"browser"` to `"node"`.

## Options that change output

- **`entrypoints`** (required) and **`outdir`**. Without `outdir` the JS API writes nothing and returns `BuildArtifact`
  objects, which are `Blob`s carrying `path`, `loader`, `hash`, `kind`, and `sourcemap`.
- **`splitting`** — off by default. Shared code between entrypoints becomes a content-hashed chunk. Each `import()` of a
  bundled module also becomes its own chunk, and tree shaking removes a chunk nothing live imports — unlike esbuild,
  which emits one per reachable `import()`. `treeShaking: false` keeps them all.
- **`splitRequire`** — under `target: "bun"`, a `require()` of a bundled ES module becomes its own chunk emitted as
  `import.meta.require("./chunk-<hash>.js")` and stays synchronous, so a `require()` in a function that never runs keeps
  its module out of the startup working set. A `require()` cycle between such chunks sees the partially initialized
  CommonJS placeholder (`{}`), as Bun's runtime `require()` of an ES module does. `splitRequire: false`
  (`--no-split-require`) inlines behind a lazy wrapper instead.
- **`sourcemap`** — `"none"` (default), `"linked"` (a `.js.map` plus a `sourceMappingURL` comment, requires `outdir`),
  `"external"` (a `.js.map` with a `debugId` comment and no URL), `"inline"` (base64 payload appended).
- **`minify`** — `true`, or `{ whitespace, identifiers, syntax }`. From 1.4.0, `--minify` no longer emits a bare `$`
  identifier, which used to shadow jQuery's `$` in a classic script.
- **`external`** — leave these specifiers as runtime imports. **`packages: "external"`** does the same for every
  specifier not starting with `.`, `..`, or `/`.
- **`define`** — replace an identifier with a literal at build time. **`drop`** removes calls entirely, arguments and
  their side effects included (`drop: ["console", "debugger"]`).
- **`naming`** — defaults to `[dir]/[name].[ext]`. **`root`**, **`publicPath`**, **`banner`**, **`footer`**,
  **`loader`**, **`tsconfig`**.
- **`metafile: true`** (from 1.3.6) — esbuild-format build metadata in `result.metafile`, readable by
  `esbuild.github.io/analyze`. From 1.4.0 a bundled import's `path` is the imported file's `inputs` key rather than the
  raw specifier, so `metafile.inputs[path]` resolves.
- **`--metafile-md`** (from 1.3.8) — the module graph as a Markdown report: summary, largest inputs, per-entrypoint
  breakdown, dependency chains.
- **`files`** (from 1.3.6) — a map of path to string, `Blob`, or `TypedArray`. Bundle entirely from memory, or mix
  virtual modules with real ones; virtual paths win.
- **`reactCompiler: true`** / `--react-compiler` (from 1.4.0) — runs React's auto-memoization compiler inside Bun's own
  parser, with no Babel or SWC round-trip.

### `optimizeImports`

A barrel import (`import { Button } from "antd"`) normally parses every file the index re-exports.
`optimizeImports: ["antd", "@mui/material"]` (from 1.3.10) parses only the submodules actually used.

It works on **pure** barrel files, where every named export is a re-export. A local export (`export const foo = ...`) in
the barrel, or any importer using `import *`, loads everything. `export *` re-exports are always loaded; only named
re-exports are deferred. A package declaring `"sideEffects": false` gets the optimization automatically.

### Compile-time feature flags

```ts
import { feature } from "bun:bundle";
if (feature("PREMIUM")) initPremium();
```

`feature("FLAG")` becomes `true` or `false` at build time and the dead branch is removed. Set flags with
`--feature=FLAG` or `features: [...]`. They work in `bun build`, `bun run`, and `bun test` (from 1.3.5).

## Bytecode

`bytecode: true` requires `target: "bun"` and a matching Bun version.

- **CommonJS** works with or without `compile`, emitting a `.jsc` beside each entrypoint.
- **ES modules** require `compile: true`. `--bytecode --format=esm --compile` (from 1.3.9) supports top-level await,
  `import.meta`, dynamic imports, and code splitting; before that `--bytecode` forced CommonJS output.

Without an explicit `format`, bytecode defaults to CommonJS. `bytecodeDepth: N` caps how many levels of nested functions
compile ahead of time; `0` is top-level module code only.

## Single-file executables

`bun build ./cli.ts --compile --outfile mycli`, or `compile: { outfile }` in `Bun.build()`. Production build:
`--compile --minify --sourcemap --bytecode`. The sourcemap is embedded zstd-compressed and resolved automatically when
an error is thrown.

### Cross-compilation

`--target bun-<os>-<arch>[-musl]`, segments in any order: `bun-linux-x64`, `bun-linux-arm64`, `bun-linux-x64-musl`,
`bun-linux-arm64-musl`, `bun-windows-x64`, `bun-windows-arm64`, `bun-darwin-x64`, `bun-darwin-arm64`.

From 1.4.0 x64 ships one binary that targets Nehalem (SSE4.2) and picks AVX2/AVX-512 paths at runtime. The `-baseline`
and `-modern` suffixes still parse and resolve to the same binary, so there is no CPU to choose for.

`--compile` rejects `--outdir` (use `outfile`), `--public-path`, `--target=node`, `--target=browser` without an HTML
entrypoint, and `--no-bundle`.

### Runtime configuration of a compiled binary

Config auto-loading defaults differ by file, and this is where a binary picks up files it should not:

- **`tsconfig.json` and `package.json` — disabled** (from 1.3.4). Before that a binary could read unrelated config from
  whatever directory it ran in. Opt back in with `--compile-autoload-tsconfig` and `--compile-autoload-package-json`.
- **`.env` and `bunfig.toml` — enabled.** Turn them off with `--no-compile-autoload-dotenv` and
  `--no-compile-autoload-bunfig` for deterministic execution.

`--compile-exec-argv="--smol --user-agent=MyBot"` bakes runtime flags in, readable as `process.execArgv`. `BUN_OPTIONS`
passes flags to a built binary without recompiling. `BUN_BE_BUN=1` (from 1.2.16) makes the executable ignore its
entrypoint and act as the `bun` CLI, so a Bun-based tool can install packages or run files without shipping a second
binary.

### Embedded files

`import icon from "./icon.png" with { type: "file" }` embeds the file and yields a path string — the real path during
development, and `/$bunfs/root/icon-<hash>.png` after compilation. Read it with `Bun.file(icon)` or `node:fs`.

`--asset <path>` (from 1.4.0) embeds a file or a whole directory keeping the original filenames, so
`path.join(import.meta.dir, ...)` finds them exactly as on disk. From 1.4.0 `node:fs` treats `/$bunfs/` as a real
directory tree — `existsSync`, `statSync`, `lstatSync`, `accessSync`, `readdirSync`, and `fs.promises.readdir` with
`withFileTypes` and `recursive` all work — so a static-file server that enumerates a directory at startup runs unchanged
inside a binary.

`Bun.isStandaloneExecutable` reports whether the process came from `--compile`. Prefer it over
`Bun.embeddedFiles.length > 0`, which allocates a `Blob` per embedded file.

A `bun:sqlite` database imported with `with { type: "sqlite" }` is resolved relative to the **process working
directory**, not the binary. A binary at `/usr/bin/hello` run from `/home/me` opens `/home/me/my.db`.

### Windows and macOS packaging

`--windows-icon=<ico>` and `--windows-hide-console`, or `compile.windows` with `icon`, `hideConsole`, `title`,
`publisher`, `version`, `description`, and `copyright`. Except for `hideConsole`, these need Windows APIs and do not
work when cross-compiling.

On macOS, `codesign --deep --force -vvvv --sign "<identity>" ./myapp` with an `entitlements.plist` granting
`com.apple.security.cs.allow-jit`.

### Standalone HTML

`bun build ./index.html --compile --target=browser --outdir=dist` (from 1.3.10) produces one HTML file with every
script, stylesheet, and asset inlined, openable from `file://` with no server.

## Plugins

A plugin is `{ name, setup(build) }`, passed in `plugins: []` to `Bun.build()` or registered for the runtime with
`Bun.plugin()`. `preload` in `bunfig.toml` registers a runtime plugin before anything else loads. The API is the same
for the runtime and the bundler.

- **`onStart(cb)`** — once per bundle.
- **`onResolve({ filter, namespace }, cb)`** — `cb({ path, importer })` returns `{ path, namespace }` to redirect.
- **`onLoad({ filter, namespace }, cb)`** — `cb({ path, loader, namespace, defer })` returns `{ contents, loader }` or
  `{ exports }`.
- **`onBeforeParse`** — a zero-copy native addon running in the parser thread before parsing.

Every module has a namespace, which prefixes the specifier in transpiled code. `"file"` is the default and implicit;
`"bun"` covers `bun:test` and `bun:sqlite`, `"node"` covers `node:fs` and friends. A loader with
`filter: /\.yaml$/, namespace: "yaml:"` turns `./x.yaml` into `yaml:./x.yaml`.

Loaders: `js`, `jsx`, `ts`, `tsx`, `json`, `jsonc`, `toml`, `yaml`, `text`, `file`, `napi`, `wasm`, `css`, `html`.

Plugins compose with `optimizeImports`: a deferred submodule still goes through the plugin pipeline when it is finally
loaded.

## Macros

`import { fn } from "./m.ts" with { type: "macro" }` runs `fn` during bundling and inlines its return value. The macro's
source never reaches the bundle, so it may do privileged work — read a database, run `git rev-parse`, `fetch` a URL.

Constraints that decide whether a macro is usable at all:

- **The return value must be serializable into an AST node.** JSON-compatible structures work. Functions and instances
  of most classes do not. `Response` and `Blob` are serialized by their `Content-Type` — `application/json` parses into
  an object, `text/plain` inlines as a string, anything unrecognized is base64-encoded. A macro may therefore return
  `fetch(url)` directly.
- **Arguments must be statically known.** A value from another macro or a constant works; `Math.random() ? "a" : "b"`
  does not.
- **`node_modules` code cannot invoke a macro.** Your own code may import one from a package and call it. `--no-macros`
  disables macros entirely and turns any call into a build error.
- **Macros run synchronously in the transpiler's visiting phase**, in source order, and a returned Promise is awaited.
  Bun's bundler is multi-threaded, so macros run in parallel across worker threads.

Dead code elimination runs after macro inlining, so a macro returning `false` deletes the branch it guards when
`minify.syntax` is on.

A library shipping a macro declares a `"macro"` export condition so one specifier serves both environments:

```json
{ "exports": { "default": "./index.js", "macro": "./index.macro.js" } }
```
