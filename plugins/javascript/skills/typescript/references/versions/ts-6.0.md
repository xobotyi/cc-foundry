# TypeScript 6.0

Released March 2026, the last release of the JavaScript-implemented compiler. It exists to move a project onto the
defaults and the option set that TypeScript 7.0 enforces, one release before 7.0 makes them non-negotiable. Every
deprecation below can be silenced for one release with `"ignoreDeprecations": "6.0"`; the errors that follow them
cannot, and 7.0 turns each deprecation into a removal.

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

A `rootDir` regression writes output to `./dist/src/` instead of `./dist/`, and reports `TS5011` naming the common
source directory it wants set. `types` is the one that regresses silently: the symptom is a burst of
`Cannot find name 'process'`, `Cannot find name 'describe'`, or `Cannot find module` errors, none of which name the
option that caused them. The fix is `"types": ["node", "jest"]` or whichever globals the project actually consumes.
Build-time improvements of 20–50% come from setting `types` correctly.

## Deprecations

Each reports `TS5101` for a whole option or `TS5107` for an option value, and each compiles once
`"ignoreDeprecations": "6.0"` is set — `outFile` still emits its bundle. 7.0 removes all of them.

- **`outFile`** and **`moduleResolution: classic`** are deprecated. Bundle with a bundler; resolve with `nodenext` or
  `bundler`.
- **`target: es5`** and **`downlevelIteration`** are deprecated. The lowest target is ES2015. Setting
  `downlevelIteration` at all — even to `false` — is an error.
- **`moduleResolution: node` / `node10`** is deprecated. Move to `nodenext` when the output runs in Node.js, `bundler`
  when a bundler or Bun consumes it.
- **`module: amd`, `umd`, `systemjs`, `none`** are deprecated, and the `amd-module` directive stops having an effect.
- **`baseUrl`** is deprecated and stops being a module-resolution lookup root. Move its prefix into each `paths` entry:
  `"@app/*": ["app/*"]` with `"baseUrl": "./src"` becomes `"@app/*": ["./src/app/*"]`. A project that genuinely used
  `baseUrl` as a lookup root needs an explicit `"*": ["./src/*"]` catch-all.
- **`esModuleInterop: false`** and **`allowSyntheticDefaultImports: false`** are deprecated.
  `import * as express from "express"` becomes `import express from "express"`.
- **`alwaysStrict: false`** is deprecated — all code is strict-mode JavaScript. An identifier named `await`, `static`,
  `private`, or `public` must be renamed.

## Errors

`ignoreDeprecations` does not reach these.

- **The `module` keyword for a namespace** reports `TS1540`; write `namespace`. `declare module "some-module"` is
  untouched.
- **The `assert` import attribute** reports `TS2880`; write `with { type: "json" }`.
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
