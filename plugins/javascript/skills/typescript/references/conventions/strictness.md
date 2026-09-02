# Strictness Options

`strict` is a family, not a switch. Everything it turns on is listed below; everything it leaves off has to be written
out.

## The `strict` family

`strict: true` enables all nine, and each can be turned off individually beside it. From TypeScript 6.0 the family is on
by default, so a project that wants any of them off has to say so.

- **`noImplicitAny`** — an implicitly `any` parameter or member is an error (`TS7006` and neighbors). The single largest
  source of value in the family: without it, an unannotated parameter silently disables checking through every path the
  value takes.
- **`strictNullChecks`** — `null` and `undefined` are distinct types rather than members of every type. Turning this off
  makes every other null-related rule decorative.
- **`strictFunctionTypes`** — function parameter positions are checked contravariantly. It does not apply to method
  declarations, which stay bivariant for compatibility with the array and DOM types.
- **`strictBindCallApply`** — `call`, `bind`, and `apply` check their arguments against the target signature.
- **`strictPropertyInitialization`** — a class property with a non-optional type must be assigned in the constructor or
  at declaration. Requires `strictNullChecks`. The escape hatch for a field a framework assigns is the
  definite-assignment modifier, `name!: string`.
- **`strictBuiltinIteratorReturn`** — built-in iterators carry `TReturn` of `undefined` rather than `any`.
- **`noImplicitThis`** — `this` with an inferred `any` type is an error.
- **`alwaysStrict`** — parse as strict-mode JavaScript and emit `"use strict"`. From 6.0 it cannot be turned off.
- **`useUnknownInCatchVariables`** — a `catch` binding is `unknown`. This is what forces `err instanceof Error` before a
  `.message` read, and it is the reason a `catch` block that logs `err.message` fails to compile.

## Outside `strict`

Each catches a defect class the family does not. All are off by default except `noUncheckedSideEffectImports`, which
defaults to `true` from 6.0. The `tsc --init` template sets `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`, `isolatedModules`, `noUncheckedSideEffectImports`, and `skipLibCheck`.

- **`noUncheckedIndexedAccess`** — an index read yields `T | undefined`. It catches the off-by-one and the missing-key
  read, which is the most common runtime `undefined` in a typed codebase. It costs a guard at every array and record
  access, and it is the flag most likely to produce hundreds of errors in an existing project. Adopt it per package.
- **`exactOptionalPropertyTypes`** — `{ a?: string }` rejects an explicit `a: undefined` (`TS2375` on an object literal,
  `TS2412` on a property assignment). This is what separates "the property is absent" from "the property is present and
  undefined", which matters for anything that round-trips through `JSON.stringify`, a spread merge, or a partial-update
  API. Where both states are meaningful, write `a?: string | undefined` deliberately.
- **`noImplicitOverride`** — a method that overrides a base member must carry `override`. It catches the rename in the
  base class that silently turns an override into a new method.
- **`noPropertyAccessFromIndexSignature`** — a property reached only through an index signature must use bracket
  notation. It keeps declared properties visually distinct from dynamic ones, which matters most for `process.env` and
  config objects.
- **`noFallthroughCasesInSwitch`** — a non-empty `case` with no terminator is an error.
- **`noImplicitReturns`** — a function with a value-returning path must return on every path.
- **`noUnusedLocals` and `noUnusedParameters`** — dead bindings are errors. These duplicate a linter rule and turn a
  work-in-progress edit into a build failure; prefer the linter unless there is no linter.
- **`noUncheckedSideEffectImports`** — an unresolvable `import "x"` is an error. Introduced in 5.6, default `true` from
  6.0. Assets a bundler resolves need an ambient declaration: `declare module "*.css" {}`.
- **`verbatimModuleSyntax`** — an import or export is emitted exactly as written, so a type-only import must say
  `import type`. It removes the ambiguity of import elision and is required for a file that will be type-stripped rather
  than compiled. It cannot be used with any setup that emits both an ESM and a CJS build from one source file.
- **`isolatedModules`** — each file must be transpilable alone. Default `true` when `verbatimModuleSyntax` is set.
- **`erasableSyntaxOnly`** — rejects the constructs that carry runtime semantics, so the source can be type-stripped
  rather than compiled.
- **`isolatedDeclarations`** — every export must be annotated well enough for a tool to emit `.d.ts` without a
  cross-file checker. Requires `declaration` or `composite`.
- **`skipLibCheck`** — skips checking of `.d.ts` files. It is in the `tsc --init` template because a broken dependency
  type should not block a build, but it also hides real conflicts between two versions of the same `@types` package.
  From 7.0 a conflicting declaration errors at every contributing site, so a project can see errors appear in its own
  files that `skipLibCheck` used to absorb.

## Adoption order

Turning on several flags at once produces an error count nobody triages. One flag per change, each landing green.

1. `strict` — the floor. Nothing below it is worth tuning.
2. `noUncheckedIndexedAccess` — the largest remaining defect class.
3. `exactOptionalPropertyTypes` — needed before any optional-property semantics are relied on.
4. `verbatimModuleSyntax` plus `isolatedModules` — needed before a bundler or a stripping runtime consumes the source.
5. `erasableSyntaxOnly` — only where the source runs unbuilt.
6. `isolatedDeclarations` — only where declaration emit is on the critical path of build time.

## Suppression

- **`@ts-expect-error` over `@ts-ignore`.** The first fails when the error it suppresses goes away, so it cannot outlive
  its cause. `@ts-ignore` is silent forever. Every suppression carries the reason on the same line.
- **`@ts-nocheck` disables a whole file.** It belongs in a generated file or a file mid-migration, and nowhere a human
  edits regularly.
- **A suppression is a report against the types.** Where the same suppression appears three times, the declaration is
  wrong and the fix belongs there.
