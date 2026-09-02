# Declaration Files and Declaration Emit

A declaration file is a claim that a JavaScript file exists and is exactly described by it. The compiler never verifies
that claim — it stops looking as soon as it finds a `.d.ts`. Every consequence in this file follows from that.

## Emit, do not write

- **Generate declarations with `declaration: true` wherever the source is TypeScript.** A hand-written `.d.ts` beside
  compiled output drifts from the implementation with no error anywhere.
- **Hand-write a `.d.ts` only for**: a JavaScript dependency that ships none, an ambient module for a non-JavaScript
  import a bundler resolves, and a global declaration a runtime injects.
- **Add `declarationMap: true` when the package ships its sources.** It makes a consumer's go-to-definition land on the
  `.ts` rather than the `.d.ts`.
- **Set `rootDir` and `outDir` to different directories.** A package that publishes its `.ts` sources beside the output
  makes consumers resolve the `.ts` file instead of the `.d.ts`, through extension substitution, which produces type
  errors and slow checks in their project.

## What blocks declaration emit

Declaration emit fails where the compiler cannot name a type it inferred.

- **A private name in an inferred type.** A function returning an instance of a non-exported class produces "has or is
  using private name". Export the type, or annotate the return with a type that is exported.
- **A type from a package the manifest does not declare.** An inferred type naming a type from a package outside
  `dependencies`, `peerDependencies`, and `optionalDependencies` reports
  `The inferred type of "X" cannot be named without a reference to "Y". This is likely not portable. A type annotation is necessary.`
  From 5.5 the compiler is lenient where the package sits in one of those three fields; otherwise, declare the
  dependency or annotate the export with a locally named type.
- **The fix is an explicit annotation**, in both cases. Annotating the exported signature makes the emitted declaration
  independent of what the body happens to infer.

## `isolatedDeclarations`

Set it where declaration emit is on the critical path — a monorepo where downstream projects wait for upstream `.d.ts`
files, or a build that wants a non-TypeScript tool to produce declarations.

- **Every export needs an annotation the compiler does not have to compute across files.** A function needs an explicit
  return type; a `const` needs an annotation unless its type is trivially readable from the initializer.
- **Locals are exempt.** Only the public surface of the module is constrained.
- **It requires `declaration` or `composite`**, and it does not change what is emitted — only what is reported.
- **It has ergonomic cost.** Adopt per package, where the parallel-build payoff is real, not repository-wide by default.

## Writing a declaration

- **Never use the boxed types.** `string`, `number`, `boolean`, `symbol`, `object` — never `String`, `Number`,
  `Boolean`, `Symbol`, `Object`.
- **Never declare a generic type that does not use its parameter.** It is not a constraint; it is a hole callers fill
  with anything.
- **`unknown`, never `any`, for a value the declaration does not describe.**
- **A callback whose result is discarded returns `void`.** Returning `any` lets the call site consume a value that the
  implementation does not promise.
- **Callback parameters are not optional.** A caller may always supply a function of lower arity.
- **Order overloads specific before general**, since resolution picks the first match.

## Module augmentation

- **Augment inside a module file, never a script file.** A file with no top-level `import` or `export` is a script, and
  a `declare module "x"` in it replaces the module's declaration rather than adding to it.

  ```ts
  import "express";

  declare module "express" {
      interface Request {
          user?: AuthenticatedUser;
      }
  }
  ```

- **Global augmentation needs `declare global`** inside a module file.
- **An interface merges; a type alias does not.** This is the reason a public API surface intended for extension is
  declared with `interface`.
- **Ambient module declarations for assets** satisfy `noUncheckedSideEffectImports` and untyped imports a bundler
  resolves: `declare module "*.css" {}`, `declare module "*.svg" { const url: string; export default url; }`.

## Publishing

- **Every emitted `.js` has a sibling declaration with the matching extension** — `.d.ts` beside `.js`, `.d.mts` beside
  `.mjs`, `.d.cts` beside `.cjs`. A dual-format package that emits both but ships one declaration tree produces errors
  in consumers that no test in the publishing repository catches.
- **Put `types` first inside each `exports` condition object**, because conditions match in declaration order.
- **Run `@arethetypeswrong/cli` against the packed tarball before release.** It is the only check that exercises the
  resolution a consumer will perform.
- **Compile the library with `strict`.** A declaration emitted without `strictNullChecks` can contain an
  `interface Sub extends Super` relationship that is an error in a consumer's strict project — and it is very hard to
  write code that breaks only when `strict` is off.
- **Set `target` to the lowest ECMAScript version the library supports**, because `target` also selects `lib`, and a
  higher `lib` lets the source reference globals an older consumer runtime lacks.
- **`typesVersions` selects a declaration tree by consumer TypeScript version.** It applies only at the package's
  external entry points; imports inside the package ignore it. DefinitelyTyped tests only against releases less than two
  years old, which bounds how far back a published package is worth supporting.
