# TypeScript 5.5

Released June 2024. Two inference features that remove hand-written annotations, and the first compiler option written
for external tooling rather than for the checker.

## Type system

- **Type predicates are inferred.** A function gets an implicit `x is T` return type when four conditions hold at once:
  it carries no explicit return type or predicate annotation, it has one `return` statement and no implicit return, it
  does not mutate its parameter, and it returns a boolean expression tied to a refinement on that parameter. This is
  what makes `.filter(x => x !== undefined)` produce `T[]` instead of `(T | undefined)[]`.

  ```ts
  // const isNumber: (x: unknown) => x is number
  const isNumber = (x: unknown) => typeof x === "number";

  // const isNonNullish: <T>(x: T) => x is NonNullable<T>
  const isNonNullish = <T,>(x: T) => x != null;
  ```

- **Control-flow narrowing applies to constant indexed accesses.** `obj[key]` narrows when both `obj` and `key` are
  effectively constant, so a `typeof obj[key] === "string"` check refines later reads of the same expression.

- **Regular-expression literals are syntax-checked.** The checker reports invalid escapes, unmatched parentheses,
  non-existent backreferences, missing named groups, and syntax above the configured `target`. Only literals are
  checked; a `new RegExp(someString)` call is not.

## Compiler options

- **`--isolatedDeclarations`** reports an error wherever a module's exports are annotated too thinly for a tool to emit
  `.d.ts` without a cross-file type-checker. Locals are exempt, and trivially computable export types
  (`export let x = 10`, a function whose return expression is a literal, an expression closed by `as`) pass without
  annotation. It requires `declaration` or `composite`.

- **`${configDir}`** substitutes the directory of the config file that declares a path, so a shared base config can
  carry `"outDir": "${configDir}/dist"` and resolve per extending project instead of relative to the base.

## Traps

- **The predicate is inferred only for an "if and only if" refinement.** `.filter(score => !!score)` infers `boolean`,
  not a predicate, because a `false` result does not prove the value is absent — `0` and `""` are falsy and in-type.
  Write the explicit comparison (`score !== undefined`) when the filtered type matters.
- **`isolatedDeclarations` does not cover computed property declarations** in classes or object literals.
- **Options deprecated in 5.0 stop working**: `charset`, `target: ES3`, `importsNotUsedAsValues`, `noImplicitUseStrict`,
  `noStrictGenericChecks`, `keyofStringsOnly`, `suppressExcessPropertyErrors`, `suppressImplicitAnyIndexErrors`, `out`,
  `preserveValueImports`, `prepend`, and an implicitly OS-specific `newLine`.
- **`undefined` joins the built-in type names a type alias may not shadow.** `type null = any` and `type number = any`
  were always errors; a bug exempted `undefined`, and `type undefined = any` is an error from 5.5.
