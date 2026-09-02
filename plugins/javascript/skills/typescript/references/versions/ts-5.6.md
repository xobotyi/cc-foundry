# TypeScript 5.6

Released September 2024. A syntactic check that catches a family of always-true conditions, and the first options that
separate checking from emit.

## Type system

- **A syntactically always-truthy or always-nullish check is an error.** The check fires on the expression form, before
  any type is consulted, so it catches a forgotten `.test(...)` on a regex literal, `=>` typed where `>=` was meant, and
  `a < b ?? c` mis-parsed as `(a < b) ?? c`.

  ```ts
  if (/0x[0-9a-f]/) {
  //  ~~~~~~~~~~~~ error: This kind of expression is always truthy.
  }

  return value < options.max ?? 100;
  //     ~~~~~~~~~~~~~~~~~~~ error: Right operand of ?? is unreachable because the left operand is never nullish.
  ```

- **`IteratorObject` and its subtypes** — `ArrayIterator`, `MapIterator`, `SetIterator`, `StringIterator` — model the
  native iterator objects that carry the iterator-helper methods (`map`, `filter`, `take`, `drop`, `flatMap`). A
  hand-written iterable that only implements `[Symbol.iterator]` is an `Iterable`, not an `IteratorObject`, and does not
  get the helpers.

## Compiler options

- **`--strictBuiltinIteratorReturn`** types `TReturn` on built-in iterators as `undefined` instead of `any`. It joins
  the `strict` family, so `strict: true` turns it on.
- **`--noUncheckedSideEffectImports`** errors on `import "some-module"` that resolves to nothing. Declare
  `declare module "*.css" {}` for the asset imports a bundler resolves and the compiler cannot.
- **`--noCheck`** emits without type-checking. It pairs with `--isolatedDeclarations` to split a build into a fast emit
  pass and a separate checking pass.
- **`--build` continues past an error in a dependency project.** `--stopOnBuildErrors` restores the previous behavior.

## Behavior changes

- **Module format is resolved in every `module` mode except `amd`, `umd`, and `system`.** A `.mts` file never emits
  CommonJS and a `.cts` file never emits ESM, so `main.mts` emits ESM into `main.mjs` even under `--module commonjs`.
  Extension handling landed in pre-release 5.5; what 5.6 adds is consulting the `package.json` `"type"` field inside
  `node_modules`, which is what closes the unsafe `import dep from "dep"` against an ESM-only dependency under
  `--module esnext`.
- **`.tsbuildinfo` is always written** for a project under `--build`, whether or not `--incremental` is set.
- **`override` is checked on computed property names** against the base class member.

## Traps

- **The always-truthy check has no type escape hatch.** It is syntactic, so a value that is genuinely a function or a
  regex in a boolean position must be called or compared explicitly.
- **`--noCheck` emits declaration files from unchecked input.** Any `.d.ts` it produces is only as sound as the separate
  checking pass that follows it.
