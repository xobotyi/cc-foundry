# TypeScript 5.7

Released November 2024. The release that makes one source tree runnable in place and shippable as JavaScript, plus a
`lib.d.ts` change that reaches every project holding a binary buffer.

## Type system

- **A variable never assigned at all is reported when read from a nested function.** Straight-line flow already caught
  "used before being assigned"; a read inside a nested function took an optimistic view, because the checker does not
  know when that function runs. 5.7 keeps the leniency for a _possibly_ initialized variable and drops it for one that
  is never assigned anywhere.
- **A function with no return-type annotation that returns only `null` or `undefined`** reports an implicit `any` under
  `noImplicitAny`.
- **A method with a computed property name contributes an index signature** to its containing class or object type.

## Compiler options

- **`--rewriteRelativeImportExtensions`** rewrites a relative specifier ending in `.ts`, `.tsx`, `.mts`, or `.cts` to
  the matching JavaScript extension in emit. It turns on `allowImportingTsExtensions` by default. The rewrite is naive
  and applies only to relative, non-declaration paths:

  ```ts
  import * as foo from "./foo.ts"; // rewritten to "./foo.js"
  import * as a from "./foo"; // untouched
  import * as b from "some-package/file.ts"; // untouched
  import * as d from "#/file.ts"; // untouched
  ```

- **`--target es2024` and `--lib es2024`** cover `Object.groupBy`, `Map.groupBy`, `Promise.withResolvers`, and the
  `ArrayBuffer`/`SharedArrayBuffer` APIs. `Atomics.waitAsync` moves from `lib es2022` to `lib es2024`.

## Behavior changes

- **A JSON import into an ES module under `--module nodenext` requires the `with { type: "json" }` attribute**
  (`TS1543`), and exposes only a default export (`TS1544` on a named import). A file that emits as CommonJS needs
  neither.
- **Every TypedArray takes a buffer type parameter**:
  `interface Uint8Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>`. Assignments between a TypedArray and
  an `ArrayBuffer` that passed under 5.6 may need `Uint8Array<ArrayBuffer>` written out.

## Traps

- **A `paths` alias is never rewritten.** `import * as u from "@/utilities.ts"` under `rewriteRelativeImportExtensions`
  emits unchanged and fails at runtime. Only `./` and `../` specifiers are rewritten.
- **A dynamic `import()` with a computed specifier is never rewritten** — the value is not known at emit time.
- **The TypedArray change surfaces through `@types/node`.** A `Buffer` that stops being assignable to `Uint8Array` is
  usually an out-of-date `@types/node`, not a defect in the code.
