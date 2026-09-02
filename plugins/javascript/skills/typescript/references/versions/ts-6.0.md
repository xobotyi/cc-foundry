# TypeScript 6.0

Released March 2026, the last release of the JavaScript-implemented compiler. It exists to move a project onto the
defaults and the option set that TypeScript 7.0 enforces, one release before 7.0 makes them non-negotiable. Every
deprecation here can be silenced with `"ignoreDeprecations": "6.0"`; none of them can be silenced in 7.0.

## Changed defaults

Each of these flips a value that a pre-6.0 project relied on without writing it down. Restoring the old value is a
matter of stating it explicitly, except where the option is also deprecated.

- **`strict`** — `true`
- **`module`** — `esnext`
- **`target`** — the newest supported ECMAScript version, `es2025` in this release, and it floats with each release
- **`noUncheckedSideEffectImports`** — `true`
- **`libReplacement`** — `false`
- **`rootDir`** — `.`, the directory holding `tsconfig.json`, instead of the common directory inferred from the input
  files. It is still inferred for a `tsc` invocation with no config file.
- **`types`** — `[]` instead of every package under `node_modules/@types`. `["*"]` restores the enumeration.

The two that break silently are `rootDir` and `types`. A `rootDir` regression shows up as output written to
`./dist/src/` instead of `./dist/`. A `types` regression shows up as a burst of `Cannot find name 'process'`,
`Cannot find name 'describe'`, or `Cannot find module` errors — the fix is `"types": ["node", "jest"]` or whichever
globals the project actually consumes. Measured build-time improvements of 20–50% come from setting `types` correctly.

## Removals and deprecations

- **`outFile`** and **`moduleResolution: classic`** are removed outright. Bundle with a bundler; resolve with `nodenext`
  or `bundler`.
- **`target: es5`** and **`downlevelIteration`** are deprecated. The lowest target is ES2015. Setting
  `downlevelIteration` at all — even to `false` — is an error.
- **`moduleResolution: node` / `node10`** is deprecated. Move to `nodenext` when the output runs in Node.js, `bundler`
  when a bundler or Bun consumes it.
- **`module: amd`, `umd`, `systemjs`, `none`** are deprecated, and the `amd-module` directive stops having an effect.
- **`baseUrl`** is deprecated and stops being a module-resolution lookup root. Move its prefix into each `paths` entry:
  `"@app/*": ["app/*"]` with `"baseUrl": "./src"` becomes `"@app/*": ["./src/app/*"]`. A project that genuinely used
  `baseUrl` as a lookup root needs an explicit `"*": ["./src/*"]` catch-all.
- **`esModuleInterop: false`** and **`allowSyntheticDefaultImports: false`** are rejected.
  `import * as express from "express"` becomes `import express from "express"`.
- **`alwaysStrict: false`** is rejected — all code is strict-mode JavaScript. An identifier named `await`, `static`,
  `private`, or `public` must be renamed.
- **The `module` keyword for a namespace** is an error; write `namespace`. `declare module "some-module"` is untouched.
- **The `asserts` keyword on an import** is an error; write `with { type: "json" }`.
- **`/// <reference no-default-lib="true"/>`** is unsupported. Use `--noLib` or `--libReplacement`.
- **File arguments alongside a `tsconfig.json`** produce `TS5112`. Pass `--ignoreConfig` to compile with defaults
  instead.

## New

- **A function that never uses `this` is not contextually sensitive.** Method-syntax properties in an object literal are
  inferred in either order, matching the arrow-function behavior that 5.9 already handled.
- **Subpath imports may start with `#/`**, so `"imports": { "#/*": "./dist/*" }` replaces the `#root/` segment that
  Node.js used to require. Supported under `moduleResolution` `nodenext` and `bundler`.
- **`moduleResolution: bundler` combines with `module: commonjs`**, which is the usual migration path off
  `moduleResolution: node10`.
- **`--stableTypeOrdering`** makes 6.0 order types the way 7.0 does, so a 6.0-versus-7.0 output diff carries signal. It
  costs up to 25% of check time and is a migration instrument, not a setting to keep.
- **`target`/`lib` `es2025`** adds `RegExp.escape` and moves `Promise.try`, the iterator helpers, and the Set methods
  out of `esnext`. `Temporal` and `Map.getOrInsert`/`getOrInsertComputed` land in `esnext`.
- **`lib.dom.iterable` and `lib.dom.asynciterable` are folded into `lib.dom`**; the two names remain as empty files.

## Traps

- **`ignoreDeprecations: "6.0"` buys one release.** Code that depends on it does not compile under 7.0 at all.
- **`--stableTypeOrdering` can surface a new error.** The failure is an inference that happened to work under the old
  ordering; the fix is an explicit type argument or an annotation on the argument, not reverting the flag.
- **Type-checking of a function expression in a generic call is stricter**, JSX most visibly. An explicit type argument
  resolves the cases that regress.
