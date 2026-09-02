# Native TypeScript Execution

Node runs `.ts` files by erasing type syntax and replacing it with whitespace. It does not compile, does not type-check,
and does not read `tsconfig.json`.

Type stripping arrived in 22.6.0 behind `--experimental-strip-types`, became the default in 22.18.0 and 23.6.0, stopped
warning in 22.18.0 and 24.3.0, and was marked Stable in 24.12.0 and 25.2.0. Disable it with `--no-strip-types`, which
was named `--no-experimental-strip-types` before 24.12.0 and 25.2.0.

## What it refuses

Anything that requires emitting JavaScript rather than deleting characters raises `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`:

- `enum` declarations
- `namespace` containing runtime code — a `namespace` exporting only types is erasable and works
- parameter properties (`constructor(private readonly x: string)`)
- import aliases (`import X = require('y')`)
- decorators, which are a TC39 Stage 3 proposal and are not transformed

`--experimental-transform-types` (22.7.0) did handle enums and parameter properties. It was **removed in 26.0.0**. On
that major there is no runtime path for those constructs; compile them ahead of time or stop writing them.

## Rules that follow from erasure, not from TypeScript

- **`import type` is mandatory for type-only imports.** Erasure is syntactic: without the `type` keyword Node keeps the
  import as a value import and fails at run time on a binding that does not exist. Set `verbatimModuleSyntax: true` so
  `tsc` enforces the same shape.
- **File extensions are mandatory, and they are `.ts`.** `import './file.ts'`, and in CommonJS `require('./file.ts')`.
  Node resolves the file that is on disk; it does not rewrite `.js` to `.ts`. Set `allowImportingTsExtensions: true` so
  `tsc` accepts the specifier, and `rewriteRelativeImportExtensions: true` when the same source is also compiled for
  distribution.
- **`tsconfig` `paths` do not work.** Nothing reads `tsconfig.json`. The nearest equivalent is `"imports"` in
  `package.json`, whose keys must start with `#`.
- **`.tsx` is not supported.**
- **No source maps are produced or needed** — erasure preserves line and column positions, so stack traces already point
  at the original source.
- **`.ts` under `node_modules` is refused outright** with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. This is
  deliberate, to stop packages publishing TypeScript sources. A dependency that ships `.ts` entry points cannot be
  loaded by type stripping at any Node version.
- **The two module systems report a missing extension under different codes.** An ESM `import './x'` throws
  `ERR_MODULE_NOT_FOUND`; a CommonJS `require('./x')` throws `MODULE_NOT_FOUND`, with no `ERR_` prefix. Code that
  matches on the ESM code alone misses the CommonJS case.
- **The REPL, `--check`, and `inspect` reject TypeScript syntax.** `--eval` and stdin accept it, with `--input-type`
  deciding the module system.

## Module system for `.ts` files

`.ts` follows the same rule as `.js`: the nearest `package.json` `"type"` field. `.mts` is always an ES module, `.cts`
always CommonJS. Node never converts between the two, so a `.ts` file using `import` in a package without
`"type": "module"` fails as CommonJS rather than being adapted.

## The `tsconfig.json` that matches the runtime

```json
{
	"compilerOptions": {
		"noEmit": true,
		"target": "esnext",
		"module": "nodenext",
		"rewriteRelativeImportExtensions": true,
		"erasableSyntaxOnly": true,
		"verbatimModuleSyntax": true
	}
}
```

`erasableSyntaxOnly` makes `tsc` reject exactly the constructs Node refuses, which moves the failure from run time to
type-check time. Drop `noEmit` when the same sources are also compiled for distribution.

## When to reach for a compiler instead

Type stripping gives no type checking and no downlevelling. Keep `tsc --noEmit` in the verification path regardless.
Reach for a full toolchain (`tsc`, `tsx`, `swc`, `esbuild`) when the project needs decorators, enums, path aliases, or
output for a runtime older than the one it is developed on.

## Programmatic form

`module.stripTypeScriptTypes(code[, options])` (22.13.0 and 23.2.0, Release candidate) performs the same erasure on a
string. Use it in a loader hook rather than reimplementing erasure.
