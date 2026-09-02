---
name: typescript
description: >-
  Write and review TypeScript: the type system, strictness configuration, narrowing, generics, type-level patterns,
  declaration files, module resolution and `tsconfig`, and the release a project's compiler pins.
when_to_use: >-
  Invoke whenever TypeScript is touched at all — writing, reviewing, refactoring, or debugging `.ts` and `.tsx` files,
  designing types, editing a `tsconfig.json`, or raising the compiler version. Also invoke on the symptoms: `any`
  spreading through a call chain, a narrowing that does not hold, a generic that refuses to infer, a `.d.ts` that will
  not emit, `TS2589`, a config change that breaks the build, or a compiler upgrade that surfaces errors in code nobody
  edited. Covers the type system and the compiler; JavaScript semantics belong to the javascript skill, the runtime
  stripping switches to nodejs and bun, and test authoring to vitest.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

<prerequisite>
Load the `javascript` skill first. Declarations, equality, closures, iteration, promise semantics, and ES module syntax
are stated there and are not repeated here. Skipping it produces TypeScript that is type-correct and idiomatically wrong.
</prerequisite>

A type earns its place by making a wrong program fail to compile. Three biases decide most calls:

- **Make the invalid state unrepresentable, then let inference carry the rest.** An annotation that restates what the
  compiler already infers is noise; a type that admits a state the domain forbids is a defect that will be found at
  runtime.
- **Every escape hatch is a defect report against a type.** `any`, `as`, `!`, and `@ts-ignore` each move a failure from
  the compiler to production. Reaching for one means the declaration is wrong, and that is where the fix belongs.
- **The `tsconfig.json` decides what the compiler catches; the pinned release decides what may be written.** Read both
  before writing code.

## Compiler Release

The `typescript` entry in the project's `package.json` sets the release. Read it before writing code and never reach for
a feature or an option above it. Releases below 5.5 are not indexed here; a rule naming a feature older than 5.5 carries
its version where it is named.

- **5.5** — inferred type predicates; `isolatedDeclarations`; `${configDir}`; regex literal syntax checking
- **5.6** — `noUncheckedSideEffectImports`; `noCheck`; `strictBuiltinIteratorReturn`; always-truthy and always-nullish
  checks become errors; `package.json` `"type"` inside `node_modules` is respected in every `module` mode
- **5.7** — `rewriteRelativeImportExtensions`; never-initialized variable checks; a JSON import into an ES module under
  `nodenext` requires `with { type: "json" }`; every TypedArray takes a buffer type parameter
- **5.8** — `erasableSyntaxOnly`; `module node18`; `libReplacement`; `require()` of ESM under `nodenext`; each branch of
  a conditional in a `return` checked separately
- **5.9** — `import defer`; `module node20`; the prescriptive `tsc --init` template; `ArrayBuffer` stops being a
  supertype of the TypedArray types
- **6.0** — `strict`, `module: esnext`, `target: es2025`, `noUncheckedSideEffectImports: true`, `libReplacement: false`,
  `rootDir: "."`, and `types: []` become the defaults; `outFile`, `moduleResolution: classic`/`node10`, `target: es5`,
  `downlevelIteration`, `module: amd`/`umd`/`systemjs`/`none`, `baseUrl`, `esModuleInterop: false`, and
  `alwaysStrict: false` are deprecated, each silenceable for one release with `"ignoreDeprecations": "6.0"`; the
  `module` keyword for a namespace and the `assert` import attribute are hard errors `ignoreDeprecations` does not
  reach; `stableTypeOrdering`; subpath imports starting `#/`
- **7.0** — the compiler is a native Go binary; every 6.0 deprecation becomes a removal; the 6.0 programmatic API is
  gone; `stableTypeOrdering` is fixed on; `--checkers`, `--builders`, `--singleThreaded`; template-literal inference
  consumes whole Unicode code points

Read [`${CLAUDE_SKILL_DIR}/references/versions/ts-N.N.md`] — one file per release, `ts-5.5.md` through `ts-7.0.md` —
when writing against a feature near the pinned release, and whenever raising it. Each carries what its release added,
which existing behavior it changed, and the traps it introduced.

**A 6.0 or 7.0 upgrade is a configuration change before it is a code change.** Set `rootDir` and `types` explicitly
before anything else. A `rootDir` left to the new default moves output into `dist/src/` when the config sits above the
sources, and reports `TS5011` naming the directory it wants. `types` is the one that fails silently: its `[]` default
drops every global declaration until the packages are listed, and the symptom is a burst of `Cannot find name` errors
that say nothing about the option that caused them.

## Configuration

`strict: true` is the floor, not the target. It leaves off the two checks that catch the most remaining runtime
failures.

- **Set `noUncheckedIndexedAccess`.** Without it an index read of an array or a record is typed as present, and the most
  common runtime `undefined` in a typed codebase is invisible.
- **Set `exactOptionalPropertyTypes`.** Without it `{ a?: string }` accepts an explicit `a: undefined`, so "absent" and
  "present and undefined" are the same type — which they are not for a spread merge, a `JSON.stringify`, or a partial
  update.
- **Set `verbatimModuleSyntax`, `isolatedModules`, and `moduleDetection: "force"`** in any project a bundler or a
  stripping runtime consumes.
- **Never turn a strict-family flag off to make an error go away.** Fix the type or suppress the single line.
- **`skipLibCheck` is a build-availability decision, not a correctness one.** It hides genuine conflicts between two
  versions of the same `@types` package.
- **One `tsconfig.json` describes one environment.** Server, DOM, worker, and test code each need their own, joined by
  project references. A single config covering several is wrong about the globals in at least one of them.
- **Adopt one flag per change, each landing green.** Turning on several at once produces an error count nobody triages.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/strictness.md`] when choosing which checks a project runs, when
planning an adoption order for an existing codebase, or when deciding whether a suppression is justified — it carries
every flag in and outside the `strict` family with the defect class each one catches and what it costs.

## Modules

The compiler models what the runtime or the bundler does to the **output** files, then maps back to source for types.
Every rule here follows from that.

- **`module: "preserve"` for anything a bundler or Bun consumes**; it implies `moduleResolution: bundler`.
  **`module: "nodenext"` for output that Node.js runs.** Pin to `node18` or `node20` where the Node.js major is fixed.
- **`module: "node18"` for a library published to npm**, with `target` set to the **lowest** ECMAScript version
  supported. Node.js resolution is the strictest host; satisfying it satisfies the bundlers.
- **`moduleResolution: "bundler"` is infectious.** It accepts `export * from "./utils"`, and the emitted JavaScript then
  fails in Node.js with `ERR_MODULE_NOT_FOUND`. Never publish from it unless the declarations are bundled too.
- **A relative specifier carries the output extension**, so `./math.js` resolves to `math.ts`. Writing `./math.ts`
  requires `allowImportingTsExtensions`, which requires `noEmit` or `emitDeclarationOnly`.
- **`import type` and `export type` for every type-only binding.** `verbatimModuleSyntax` makes this mandatory and
  removes the guesswork of import elision.
- **`paths` entries carry their own prefix.** `baseUrl` is gone from 6.0.
- **An import attribute uses `with`, never `assert`.**

Read [`${CLAUDE_SKILL_DIR}/references/conventions/modules.md`] when setting up a project, choosing `module` and
`moduleResolution` for a given shape, or debugging a resolution failure — it carries the per-shape configurations, the
format-detection rules, and the `exports`-condition layout for publishing types.

## Erasable Syntax

Where the source runs unbuilt — Node.js type-stripping, Bun, tsx, esbuild — TypeScript syntax with runtime behavior is
not erasable and fails at load. `erasableSyntaxOnly` moves the failure to compile time under `TS1294`.

- **No `enum` or `const enum`** — use a union of string literals, or a `const` object with `satisfies`.
- **No `namespace` or `module` block containing runtime code** — use ES modules.
- **No parameter properties** — `constructor(private readonly db: Database)` becomes an explicit field and assignment.
- **No `import =` or `export =`** — use ES module syntax.
- **No angle-bracket assertions** — `as` only, which is also the rule in `.tsx` files.

The ambient forms stay legal: `declare enum` and a `declare namespace` holding only declarations emit nothing.

## Annotations

- **Annotate every exported signature — parameters and return type.** It pins the contract, stops a body edit from
  silently widening the public API, produces the error at the definition rather than at a distant call, and is what
  `isolatedDeclarations` requires.
- **Never annotate what is trivially inferred.** `const n: number = 5` and `const s: string = "x"` add nothing.
- **Annotate a local where inference produces a wide or opaque type** and the value flows somewhere that matters.
- **`satisfies` where the specific type must survive.** `const config = {...} satisfies Config` checks the value against
  `Config` and keeps the literal keys and value types; `const config: Config = {...}` widens them away.
- **`interface` for an object shape, `type` for everything else** — unions, intersections, tuples, function types,
  mapped and conditional types. An `interface` merges across declarations, which is what makes a public surface
  augmentable and what makes an accidental redeclaration silent.

## Escape Hatches

- **`unknown` at every boundary, never `any`.** A response body, `JSON.parse`, a message payload, an environment
  variable, a caught error — each is `unknown` until it is narrowed. `any` disables checking for every value downstream
  of it, which is why one `any` in a call chain hides a class of bugs rather than one.
- **`as` proves nothing.** Use an annotation, which checks; use `satisfies`, which checks and preserves. Reserve `as`
  for a fact the compiler cannot know, on one line, with the reason beside it. Never `as` an object literal — it hides
  missing and misspelled properties that an annotation catches.
- **Never double-assert through `any`.** Where a double assertion is genuinely needed, go through `unknown`.
- **`!` only where the invariant is stated in the same function.** Otherwise narrow, or make the type honest.
- **`@ts-expect-error` over `@ts-ignore`**, with the reason on the same line. The first fails once the error it
  suppresses is gone, so it cannot outlive its cause.
- **Three suppressions of the same shape is a declaration defect.** Fix the type.

## Narrowing

- **Discriminated unions over optional-property bags.** `{ ok: true; data: T } | { ok: false; error: E }` makes the two
  impossible states unrepresentable; `{ ok: boolean; data?: T; error?: E }` permits both and forces a check at every
  read.
- **Close every exhaustive switch with a `never` assignment**, so adding a union member breaks the build at each site
  rather than falling through at runtime:

  ```ts
  default: {
      const unhandled: never = shape;
      return unhandled;
  }
  ```

- **Write the type predicate explicitly on an exported guard.** Inference (5.5) covers a one-`return` function that does
  not mutate its parameter, and stops covering it after an ordinary edit.
- **A truthiness check never infers a predicate**, and correctly so — `!!score` returns `false` for a valid `0`. Write
  `score !== undefined`.
- **`in` widens when the property is optional.** If `Human` declares `swim?()`, then `"swim" in animal` narrows to
  `Fish | Human`. Discriminate on a required literal property.
- **`typeof x === "object"` admits `null`.** Check `x !== null` first.
- **A narrowing does not survive a call, an `await`, or a re-read of a mutable property.** Copy the narrowed value into
  a `const`.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/narrowing.md`] when a narrowing does not hold and the obvious fix does
not work, or when designing a union that several call sites will discriminate — it carries the control-flow rules, the
predicate and assertion-function contracts, and each gotcha with its mechanism.

## Enums

- **A union of string literals replaces an enum.** `type Status = "active" | "inactive"` is erasable, needs no import at
  the use site, and narrows without a runtime object.
- **Where a runtime object is genuinely needed** — iteration, reverse lookup, a namespace for related constants — use a
  `const` object with `satisfies` and derive the type:

  ```ts
  const Status = { Active: "active", Inactive: "inactive" } as const satisfies Record<string, string>;
  type Status = (typeof Status)[keyof typeof Status];
  ```

- **Never a numeric enum.** The member with value `0` is falsy, so `if (level)` skips it. Reverse mapping puts the
  numbers on the runtime object, so `Object.keys(Direction)` returns `["0", "1", "A", "B"]`. And the emitted value
  carries no meaning in a log or a serialized payload.

## Generics

- **A type parameter that appears once in a signature is a wider type in disguise.** Delete it.
- **A type parameter that appears only in the return type cannot be inferred**, so the caller guesses and the function
  performs an unchecked assertion on their behalf. Return `unknown`, or take an argument that carries the type.
- **Constrain by what the body uses**, and relate parameters through the constraint: `<T, K extends keyof T>`.
- **`const T` (5.0) instead of asking callers to write `as const`** — with a `readonly` constraint, because a mutable
  constraint makes inference fall back to it silently.
- **`NoInfer<T>` (5.4) where one argument is the source of truth** and another must be validated against it.
- **Prefer a union parameter to overloads** where the logic is one path, and optional parameters to overloads where the
  signatures differ only in trailing arguments. Where overloads are unavoidable, order specific before general — the
  first match wins.
- **A callback parameter is never optional, and a discarded callback result is `void`, never `any`.**

Read [`${CLAUDE_SKILL_DIR}/references/conventions/generics.md`] when a call refuses to infer what it obviously should,
or when designing a generic API surface — it carries the inference-control tools with their failure modes and the
`satisfies`-versus-annotation-versus-assertion split.

## Type-Level Programming

- **Stay at the lowest tier that solves the problem**: named types, then the built-in utility types, then conditional
  and mapped types, and only then recursion. Each tier up costs readability, error-message quality, and check time.
- **A type whose purpose does not fit in one sentence is over budget.** Split it into named aliases a reader can hover.
- **A naked type parameter distributes over a union.** Wrap both sides in a tuple — `[T] extends [U]` — where the
  question is about the union as a whole.
- **`TS2589` is the instantiation ceiling, not a diagnosis.** A tail-recursive conditional reaches 1000 instantiations
  and reports it past that; one that wraps its recursive call stops far earlier, under 50 where the accumulator is a
  tuple spread. Large unions and deep object types reach the same error by another route. Where recursion is the cause,
  rewrite with an accumulator so the recursive call is the final operation.
- **Brand a type only where a wrong value of the same primitive would corrupt something** — an identifier that could be
  swapped with another identifier, a validated string, a unit-bearing number. One `unique symbol` brand, one constructor
  function performing the single `as`, and no other construction site.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/type-level.md`] when writing a conditional, mapped, or
template-literal type, or when a type-level construct is slow or hits a depth limit — it carries distributivity, key
remapping, the modifier operators, the recursion ceilings, and the branding mechanisms with their tradeoffs.

## Declarations

- **Emit declarations, never hand-write them for TypeScript source.** A hand-written `.d.ts` beside compiled output
  drifts with no error anywhere, because the compiler treats a declaration file as proof rather than as a claim to
  check.
- **A "has or is using private name" error is a missing export or a missing annotation**, not a compiler limitation.
  Annotate the exported signature so the emitted declaration does not depend on what the body infers.
- **Every emitted `.js` needs a sibling declaration with the matching extension** — `.d.ts`/`.js`, `.d.mts`/`.mjs`,
  `.d.cts`/`.cjs`. A dual-format package shipping one declaration tree produces errors only in consumers.
- **Augment a module from inside a module file.** A `declare module "x"` in a file with no top-level `import` or
  `export` replaces the module instead of extending it.
- **Compile a published library with `strict`**, because a declaration emitted without `strictNullChecks` can be an
  error in a consumer's strict project.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/declarations.md`] when declaration emit fails, when adopting
`isolatedDeclarations`, or when preparing a package for publication — it carries the emit blockers with their fixes, the
`.d.ts` authoring rules, and the publishing checklist.

## Classes

- **Omit `public`; it is the default.** Write it only on a non-`readonly` constructor parameter property, and only where
  parameter properties are permitted at all.
- **`readonly` on every property not reassigned after construction**, and `#private` over `private` where runtime
  privacy matters — `private` is erased.
- **`override` on every overriding member**, enforced with `noImplicitOverride`.
- **`name!: string` for a field a framework assigns**, and nowhere else. It is a promise the compiler cannot check.
- **Use an interface for a data shape.** A class used only to carry data adds a constructor, a prototype, and an
  `instanceof` check that nothing needs.

## Gotchas

- **Excess-property checking applies only to a fresh object literal.** Assigning the same object through a variable
  passes silently. This is why `satisfies` or a direct annotation catches a typo that a two-step assignment does not.
- **Method syntax is bivariant; property syntax is not.** `{ fn(x: string | number): void }` accepts an implementation
  taking `string`; `{ fn: (x: string | number) => void }` rejects it under `strictFunctionTypes`. Declare a callback as
  a property when the parameter type must be checked.
- **An empty interface and `{}` accept almost everything.** `{}` is every non-nullish value, primitives included. Use
  `unknown` for opaque, `object` for non-primitive, `Record<string, unknown>` for a dictionary.
- **A type predicate is unchecked.** The compiler verifies the returned type is assignable to the parameter type, not
  that the body proves it. A wrong predicate lies to every caller.
- **`filter(Boolean)` does not narrow.** `Boolean` is typed as returning `boolean`, not as a predicate, so
  `xs.filter(Boolean)` on `(string | undefined)[]` stays `(string | undefined)[]`. Write
  `xs.filter(x => x !== undefined)`, which infers the predicate.
- **Optional chaining carries `undefined` into the result type.** `a?.b.c` is `T | undefined` even where `b.c` cannot be
  undefined.
- **A resolution that finds a `.js` file with no declaration beside it succeeds and types every import from it as
  `any`.** A silently untyped dependency looks exactly like a working one until `noImplicitAny` reports it.
- **`declare` erases.** A declaration file never emits, so a `declare const` for a value nothing defines compiles and
  fails at runtime.

## Toolchain

- **`tsc --noEmit` is the check.** Wire it into CI separately from the bundler, which type-checks nothing.
- **7.0 drops the API a tool calls.** `require("typescript")` returns `{ version, versionMajorMinor }` and nothing else;
  `createProgram` and its neighbors are gone. A `typescript/unstable/*` family ships beside it, and the compiler team
  states the expectation that 7.1 carries a stable replacement. Anything that embeds the compiler — typescript-eslint,
  Volar for Vue, Svelte, Astro and MDX, Angular template checking — needs the 6.0 API until then. Install both, with
  `typescript` aliased to `@typescript/typescript6` and `typescript@7` under a second name, and let the tool resolve the
  one it needs. typescript-eslint 8.69.0 declares a peer range of `>=4.8.4 <6.1.0`, which excludes 7.0.
- **`--checkers N` trades memory for speed** in 7.0 and defaults to 4. Pin one value across CI and local runs, because
  varying it can surface order-dependent results.
- **`tsc --init` generates the baseline the compiler team recommends for the installed release.** Start from its output
  rather than from a remembered template.

## Application

When **writing** TypeScript, apply these conventions silently — do not narrate a rule while following it. Where existing
code contradicts one, follow the codebase and flag the divergence once.

When **reviewing** TypeScript, cite the violation and show the fix inline. Do not lecture.

```
Bad:  "TypeScript best practices recommend avoiding type assertions here because..."
Good: const u = res.data as User  ->  const u: User = parseUser(res.data)
```

## Integration

The **javascript** skill is a hard prerequisite and states everything a type does not change — declarations, equality,
closures, iteration, promise semantics, ES module syntax, and LSP navigation. This skill never restates it.

This skill owns which TypeScript syntax is erasable and what each compiler option does. The **nodejs** and **bun**
skills own their own stripping switches and the syntax their runtimes refuse. The **vitest** skill owns `expectTypeOf`
and the `typecheck` options, which are its API and its config keys. The **coding** skill governs workflow.

**When in doubt, make the type narrower and the escape hatch smaller.**
