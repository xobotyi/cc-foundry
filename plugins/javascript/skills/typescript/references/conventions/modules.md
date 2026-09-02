# Modules and tsconfig

The compiler does not resolve modules against the input tree. It models what the **host** — the runtime or the bundler —
will do to the **output** tree, then maps the resolved output file back to a source file for its types. Every surprising
rule in this area follows from that: a relative import carries the output extension, a `.d.ts` implies a sibling `.js`,
and `moduleResolution` names a host algorithm rather than a search strategy.

## Choosing `module` and `moduleResolution`

One `tsconfig.json` describes one environment. Server code, DOM code, worker code, and test code each need their own
config, joined by project references.

- **Application, consumed by a bundler (Vite, esbuild, Rollup, webpack)** — `"module": "preserve"`, which implies
  `moduleResolution: bundler`, `esModuleInterop`, and `resolveJsonModule`. Add `"noEmit": true`,
  `"allowImportingTsExtensions": true`, `"verbatimModuleSyntax": true`. Do not set `"type": "module"` or use `.mts` in a
  bundler project — some bundlers change their interop behavior on it in ways `moduleResolution: bundler` does not
  model.
- **Application, compiled by `tsc` and run by Node.js** — `"module": "nodenext"`. It implies
  `moduleResolution: nodenext`, `esModuleInterop`, and a floating `target: esnext`. Set `"type": "module"` in
  `package.json`, or use `.mts`, to emit ESM. Add `"verbatimModuleSyntax": true`.
- **Application pinned to one Node.js major** — `"module": "node18"` or `"node20"` instead of `nodenext`. Neither takes
  future behavior. `node18` forbids `require()` of ESM and permits the `assert` import syntax; `node20` permits
  `require()` of ESM. `node20` implied `target: es2023` on 5.9 and a 6.0 compiler resolves the release default target
  instead, so set `target` explicitly rather than relying on either.
- **Library published to npm** — `"module": "node18"` with `"declaration": true`, `"verbatimModuleSyntax": true`,
  `"rootDir": "src"`, `"outDir": "dist"`, and `target` set to the **lowest** ECMAScript version the library supports,
  ES2015 being the floor from 6.0. Set `"type": "module"` in `package.json` or write `.mts` sources: without one of the
  two the files emit as CommonJS and `verbatimModuleSyntax` rejects every `import` in the tree (`TS1295`, `TS1287`).
  Node.js resolution is the strictest of the hosts, so satisfying it satisfies the bundlers too.
- **Library bundled before publishing** — `"module": "esnext"` with `moduleResolution: bundler` is acceptable only if
  the declaration files are bundled by the same tool. A bundled `.js` plus per-file `.d.ts` emits declaration imports
  with extensionless specifiers that fail under a consumer's `nodenext`.
- **Bun, or a transpiling loader (tsx)** — the bundler configuration. Bun's resolver follows the bundler rules, not the
  Node.js ESM rules.

`moduleResolution: bundler` is infectious. It accepts `export * from "./utils"` because a bundler accepts it, and the
emitted JavaScript then fails in Node.js with `ERR_MODULE_NOT_FOUND`. A library compiled this way ships code that only
works behind a bundler.

## Module format detection

Under `module` `node16`, `node18`, `node20`, and `nodenext`, the compiler applies the Node.js rules to the input files
to decide the format of each output file.

- **`.mts` emits `.mjs` as ESM; `.cts` emits `.cjs` as CommonJS**, regardless of anything else. From 5.6 this holds
  under every `module` mode, so a `main.mts` emits ESM even under `--module commonjs`.
- **`.ts` emits `.js`**, whose format comes from the nearest `package.json`: `"type": "module"` makes it ESM, anything
  else — including an absent field or an absent `package.json` — makes it CommonJS.
- **The same rules apply to declaration files in dependencies.** A `.d.ts` under a package with `"type": "module"` is
  ESM; a `.d.cts` is CommonJS whatever the package says.

## Import syntax rules

- **A relative specifier carries the output extension.** In a `nodenext` project, `import { add } from "./math.mjs"`
  resolves to `src/math.mts`, because `dist/main.mjs` will load `dist/math.mjs`. Writing `./math.ts` is an error unless
  `allowImportingTsExtensions` is set, which requires one of `noEmit`, `emitDeclarationOnly`, or
  `rewriteRelativeImportExtensions` (`TS5096`).
- **`rewriteRelativeImportExtensions` (5.7) lets one tree do both.** Source is written with `.ts` extensions so a
  stripping runtime can execute it directly, and emit rewrites those to `.js`. Only relative, non-declaration specifiers
  are rewritten — a `paths` alias, a bare package specifier, a `#`-prefixed subpath import, and a computed `import()`
  specifier are all left as written and break at runtime.
- **`verbatimModuleSyntax` forces the intent to be written.** A type-only import must say `import type`, and a re-export
  of a type must say `export type`. It also blocks ES module syntax in a file that will emit as CommonJS (`TS1295`,
  `TS1287`), because the flag forbids the very rewrite into `require` and `exports` that would make such a file work.
- **An import attribute uses `with`, never `assert`.** Under `nodenext`, a JSON import into an ES module requires
  `with { type: "json" }` and exposes only the default export; a file that emits as CommonJS needs neither.

## tsconfig structure

- **`extends` carries the shared base; `${configDir}` (5.5) makes its paths resolve per project.** A base config with
  `"outDir": "${configDir}/dist"` puts each extending project's output beside that project rather than beside the base.
- **Set `rootDir` explicitly whenever `tsconfig.json` sits above the sources.** From 6.0 the default is the config
  directory, so a project relying on inference emits into `dist/src/` instead of `dist/`.
- **Set `types` explicitly.** From 6.0 the default is `[]`. List exactly the global-declaring packages the project needs
  — `["node"]`, `["node", "jest"]` — rather than restoring `["*"]`, which reloads every `@types` package in the tree.
- **`paths` entries carry their own prefix.** `baseUrl` is gone from 6.0, so a `paths` value is relative to the config
  file: `"@app/*": ["./src/app/*"]`.
- **Keep a separate `tsconfig.build.json`** where the build must exclude tests, fixtures, and scripts that the editor
  should still check.

## Publishing types

- **Every `.js` file needs a sibling declaration file with the matching extension.** The compiler treats a `.d.ts` as
  proof that a `.js` exists and is exactly described by it; a mismatch produces false errors for consumers, not for the
  author.
- **`exports` conditions are matched in declaration order**, so `types` goes first inside each condition object:

  ```json
  {
    "exports": {
      "./subpath": {
        "import": { "types": "./types/subpath/index.d.mts", "default": "./es/subpath/index.mjs" },
        "require": { "types": "./types/subpath/index.d.cts", "default": "./cjs/subpath/index.cjs" }
      }
    }
  }
  ```

  Where a matched path has no TypeScript extension, resolution substitutes extensions in order — `.cts`, then `.d.cts`,
  then `.cjs` for a `.cjs` target. A package that resolves to the JavaScript file with no declaration beside it counts
  as resolved, and every import from it is `any`.

- **Verify the published shape with `@arethetypeswrong/cli`** before release. It reports the mismatches — a CJS build
  described by an ESM declaration, a missing condition, a `types` entry pointing at the wrong extension — that produce
  errors only in a consumer's project.
- **`typesVersions` selects a declaration tree by the consumer's TypeScript version**, and applies only to a package's
  external entry points, not to imports inside the package. DefinitelyTyped tests packages only against TypeScript
  releases less than two years old, which sets a practical floor for anything published there.
