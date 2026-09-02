# TypeScript 5.8

Released February 2025. The release that makes the type system aware of runtime type-stripping, and the one that lets a
CommonJS file `require()` an ES module.

## Type system

- **Each branch of a conditional expression in a `return` statement is checked against the declared return type.**
  Before this, the branches were unioned first, so an `any` branch absorbed the other and the mismatch went unreported.

  ```ts
  function getUrlObject(urlString: string): URL {
      return untypedCache.has(urlString) ?
          untypedCache.get(urlString) : // any
          urlString;
      //  ~~~~~~~~~ error: Type 'string' is not assignable to type 'URL'.
  }
  ```

- **Declaration emit preserves entity names in computed property names.** `[propName] = 42` in a class emits as
  `[propName]: number` instead of collapsing to `[x: string]: number`. The emitted property is still effectively an
  index signature at runtime — a statically named property needs a literal type or a `unique symbol`.

## Compiler options

- **`--erasableSyntaxOnly`** rejects every TypeScript construct that carries runtime behavior, so the file survives
  type-stripping by Node.js `--experimental-strip-types`, Amaro, ts-blank-space, esbuild, or Bun. It rejects `enum` and
  `const enum` declarations, `namespace` and `module` blocks containing runtime code, class parameter properties,
  `import =` / `export =` assignments, and angle-bracket type assertions (`<number>x`), all under `TS1294`. Pair it with
  `--verbatimModuleSyntax` so import elision does not run either.

  ```ts
  class Point {
      constructor(public x: number, public y: number) {}
      //          ~~~~~~~~~~~~~~~~
      // error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
  }
  ```

- **`--module node18`** is a fixed point of reference for Node.js 18: it forbids `require()` of ESM and permits the
  `assert` import-assertion syntax, which is the opposite of `nodenext` on both counts.
- **`--libReplacement`** controls the lookup for `@typescript/lib-*` packages that substitute the default `lib` files.
  Setting it to `false` removes a failed module resolution and a watch target from every run.

## Behavior changes

- **`require()` of an ES module is permitted under `--module nodenext`**, matching Node.js 22. A module with a top-level
  `await` is still not requirable, and the compiler does not enforce that rule because a declaration file does not say
  whether the corresponding JavaScript has one.
- **An import assertion (`assert { type: "json" }`) is an error under `--module nodenext`.** Use the import attribute
  form, `with { type: "json" }`.

## Traps

- **`erasableSyntaxOnly` permits the ambient forms.** `declare enum E {}` and a `declare namespace` holding only
  declarations emit nothing and stay legal, so the flag does not stop a `.d.ts` from describing an external `enum`. The
  value forms, `enum` and `const enum`, are rejected.
- **A declaration file emitted by 5.8 may not parse under 5.7 or earlier**, because of the preserved computed property
  names.
