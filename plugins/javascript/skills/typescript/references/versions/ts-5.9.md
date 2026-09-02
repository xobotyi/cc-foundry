# TypeScript 5.9

Released July 2025. The last release on the 5.x line, and the one that fixes the shape of a generated `tsconfig.json`.

## Type system

- **`import defer * as ns from "mod"`** loads a module but defers evaluation of its statements until a property of the
  namespace is read. Only the namespace form is legal — a named or default import defeats the purpose and is rejected.
  It is emitted verbatim, so it works only under `--module preserve` and `--module esnext`.

## Compiler options

- **`--module node20`** is a fixed point of reference for Node.js 20: it permits `require()` of ESM like `nodenext`, but
  it takes no future behavior, and it implies `--target es2023` where `nodenext` implies the floating `esnext`.
- **`tsc --init` generates a small prescriptive config** instead of the annotated catalogue. It sets `module: nodenext`,
  `target: esnext`, `types: []`, `strict`, `verbatimModuleSyntax`, `isolatedModules`, `noUncheckedSideEffectImports`,
  `moduleDetection: force`, `skipLibCheck`, `declaration`, `declarationMap`, `sourceMap`, `jsx: react-jsx`, and — above
  what `strict` covers — `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.

## Behavior changes

- **`ArrayBuffer` stops being a supertype of the TypedArray types**, `Buffer` from `@types/node` included. The errors
  read `TS2345`/`TS2322` on `ArrayBufferLike`, `BufferSource`, and `Buffer`. Update `@types/node` first; where the error
  survives, write the buffer type parameter out (`Uint8Array<ArrayBuffer>`) or pass `.buffer`.
- **Type-variable leaks during inference are fixed**, which can change inferred types and surface new errors. An
  explicit type argument on the generic call resolves it.

## Traps

- **`import defer` is not downleveled.** No `module` mode transforms it, so a runtime or bundler without native support
  fails on the emitted syntax.
- **Deferral is of evaluation, not of loading.** The module is resolved and read at import time; only its statements
  wait.
