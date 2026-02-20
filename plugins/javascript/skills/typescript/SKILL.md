---
name: typescript
description: >-
  TypeScript type system, strict mode, and TS-specific patterns beyond JavaScript fundamentals.
  Invoke whenever task involves any interaction with TypeScript code — writing, reviewing,
  refactoring, debugging .ts/.tsx files, type definitions, generics, narrowing, tsconfig, or
  type-level programming.
---

# TypeScript

<prerequisite>
**Requires: `javascript` skill.**
This skill extends the JavaScript skill and cannot operate without it. If the `javascript`
skill is not yet loaded, invoke it now before reading further. Do not proceed with any
TypeScript work until the JavaScript skill is active — its conventions are the foundation
that this skill builds on.
</prerequisite>

**Types encode intent. Let the compiler prove the rest.**

TypeScript's value is in catching bugs at compile time. Write types that express your
domain; let inference handle the obvious. Never fight the type system — if you need `as`
or `any`, the types are wrong.

### References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Generics, utility types, type-level programming | `references/generics.md` | Utility type tables, conditional/mapped type examples, infer, template literals |
| Narrowing, type guards, discriminated unions | `references/narrowing.md` | typeof/instanceof/in examples, exhaustive switch, type predicates, assertion fns |
| tsconfig options, module resolution, project setup | `references/configuration.md` | Base/strict/module configs, library setup, compiler directives, project structure |
| Branded types, overloads, class patterns, enums | `references/patterns.md` | Interface vs type examples, assertion patterns, enum anti-patterns, callback types |

## Type Safety

- **`strict: true` always.** No exceptions. It enables `strictNullChecks`,
  `noImplicitAny`, `strictFunctionTypes`, and other critical checks.
- **`unknown` over `any`.** Use `unknown` and narrow with type guards. `any` disables
  type checking entirely. Reserve `any` for migration or test mocks only — document why.
- **No non-null assertions (`!`) without justification.** Prefer narrowing. If `!` is
  truly needed, add a comment explaining why the value cannot be null.
- **No type assertions (`as`) for object literals.** Use type annotations (`: Foo`)
  instead — assertions hide missing/extra property errors.

### `unknown` vs `any` Decision

| Situation | Use |
|-----------|-----|
| Value from external source (API, JSON.parse, user input) | `unknown` |
| Function accepts anything, passes through without touching | `unknown` |
| Migrating JS to TS incrementally | `any` (temporary, with comment) |
| Test mock that intentionally bypasses type checking | `any` (with comment) |

### The `{}` Type

`{}` means "any non-nullish value" — almost never what you want.

| Type | Allows |
|------|--------|
| `unknown` | Everything (null, undefined, primitives, objects) |
| `object` | Non-primitive, non-null values |
| `{}` | Any non-nullish value (primitives included) |
| `Record<string, unknown>` | Objects with string keys |

Prefer `unknown` for opaque values, `Record<string, unknown>` for dict-like objects,
`object` when you need "any non-primitive".

## Type Annotations

- **Omit trivially inferred types.** Don't annotate `const x: number = 5` or
  `const s: string = "hello"`. The compiler infers these correctly.
- **Annotate complex return types.** When inference produces opaque or wide types,
  annotate explicitly for readability.
- **Annotate function signatures at API boundaries.** Exported functions and public
  methods should have explicit parameter and return types.
- **Use `import type` for type-only imports.** Enforced by `verbatimModuleSyntax`.
  Use `export type` for type re-exports — required for `isolatedModules`.
- **Annotate for precision with structural types.** Annotate at declaration so errors
  appear where the bug is, not at distant call sites.

## Interfaces and Types

- **`interface` for object shapes.** Better error messages, IDE support, and performance.
- **`type` for everything else** — unions, intersections, tuples, function types,
  mapped/conditional types.
- **Decision rule:** Object shape with known properties? `interface`. Everything else?
  `type`. Pick one pattern per kind and stay consistent within a project.
- **No empty interfaces.** Use a branded type or discriminated union as a marker.
- **No `namespace`.** Use ES modules. `namespace` is legacy.
- **No wrapper types.** `string` not `String`, `number` not `Number`.
- **Use interfaces for data shapes, not classes.** A class used purely as a data shape
  adds unnecessary overhead.

## Null Handling

- **Prefer optional `?` over `| undefined`** for fields and parameters. `| undefined`
  forces callers to pass `undefined` explicitly.
- **Don't include `null`/`undefined` in type aliases.** Keep nullability at the use site:
  `function getUser(): User | null` not `type MaybeUser = User | null`.
- **Null narrowing:** `!= null` checks both null and undefined (the one valid `==` use).
  `?.` for optional access. `??` for defaults.

## Generics

- **Name type parameters descriptively** when meaning is non-obvious. `T` is fine for
  single-parameter generics; use `TKey`, `TValue`, `TItem` for multiple parameters.
- **Constrain generics** with `extends` when possible. `<T extends string>` is better
  than `<T>` if `T` must be a string.
- **Keep generic constraints tight** — `<T extends Record<string, unknown>>` is better
  than `<T extends object>` when you need string keys.
- **Don't add unused type parameters.** Every generic must appear in the signature.
- **Avoid return-type-only generics.** If a generic appears only in the return type, it
  cannot be inferred and forces callers to guess.
- **Let inference work.** Don't specify type arguments when the compiler can infer them:
  `identity("hello")` not `identity<string>("hello")`.
- **Use type parameters in constraints:** `<T, K extends keyof T>` to relate parameters.
- **Generic parameter defaults:** `interface Container<T, U = T[]>` — omitted type args
  fall back to the default.
- **`NoInfer<T>`** (TS 5.4+) prevents a parameter from being an inference site — use when
  a parameter should be constrained by other params, not drive inference.

### Utility Types

Prefer built-in utility types over hand-rolling equivalents. Key types: `Partial`,
`Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `ReturnType`, `Parameters`, `Awaited`,
`NoInfer`. Use explicit interfaces when the type represents a distinct domain concept.
See `references/generics.md` for the full catalog and usage guidance.

Conditional types (`T extends U ? X : Y`), mapped types (`{ [P in keyof T]: ... }`),
and template literal types (`` `${T}Changed` ``) are advanced tools — use for library
code and framework types. See `references/generics.md` for distributive behavior,
`infer`, modifier removal, and key remapping.

### Complexity Budget

| Tier | Tools | Use When |
|------|-------|----------|
| Simple | `interface`, `type` alias, union | Always — default choice |
| Moderate | `Partial`, `Pick`, `Omit`, `Record` | Well-known transformations |
| Advanced | Conditional, mapped, template literal | Library code, framework types |
| Expert | Recursive types, complex `infer` chains | Rarely — last resort |

Stay at the lowest tier that solves your problem. If you can't explain what a type does
in one sentence, it's too complex — split it, simplify it, or use explicit interfaces.

## Narrowing

- **Prefer discriminated unions** for variant types. Add a `kind` or `type` literal
  field to each variant.
- **Use exhaustive switches.** Add `default: { const _exhaustive: never = value;
  return _exhaustive; }` to catch unhandled variants at compile time.
- **Type predicates for reusable guards:** `function isFish(pet: Animal): pet is Fish`.
  Use when filtering arrays or in multiple call sites.
- **Assertion functions:** `function assertIsError(value: unknown): asserts value is
  Error` — use for validation at boundaries.
- **`typeof`, `instanceof`, `in`** — use JavaScript narrowing constructs; TypeScript
  understands them natively.
- **`typeof null === "object"` pitfall.** Always check for `null` separately before
  `typeof` object checks.
- **`in` operator and optional properties:** if `Human` has `swim?`, `"swim" in animal`
  narrows to `Fish | Human`, not just `Fish`.
- **Truthiness narrowing pitfall:** fails on `""`, `0`, `NaN`, `false`. Prefer explicit
  null checks over truthiness when these values are valid.
- **Equality narrowing:** `x === y` narrows both to their common type. `!= null` checks
  both null and undefined.

## Enums

- **Prefer union types** over enums when values are simple string literals:
  `type Status = "active" | "inactive"` is simpler than `enum Status`.
- **Prefer string enums** over numeric enums when an enum is needed. String enums have
  meaningful runtime values and readable debug output.
- **Never use numeric enums with implicit values** — always assign explicit values.
- **Never coerce enums to booleans.** Compare explicitly: `level !== Level.NONE`, not
  `!!level`. Numeric enum value `0` is falsy.
- **Never mix numeric and string members** in the same enum.
- **Use enums over unions when** you need a runtime object (iteration, lookup), a
  namespace for related constants, or reverse mapping.

## Type Assertions

- **Prefer annotations over assertions.** `: Foo` catches errors; `as Foo` hides them.
- **Always use `as` syntax**, never angle brackets (`<Foo>value`) — angle brackets
  conflict with JSX.
- **Assertions are justified when** you genuinely know more than the compiler: values
  from `JSON.parse`, DOM API returning wider types, trusted external sources.
- **Double assertions through `unknown`:** `value as unknown as Foo`. Never use `any`
  as the intermediate type.

## Overloads

- **Prefer union types over overloads** when parameter types differ but logic is shared.
- **Prefer optional parameters over overloads** when signatures differ only in trailing
  params.
- **When overloads are necessary**, put specific signatures before general ones —
  TypeScript picks the first matching overload.

## Class Patterns

- **Omit `public`** — it's the default. Only use `public` on non-readonly constructor
  parameter properties.
- **Use `private`** for internal state, `protected` for subclass access.
- **Use `readonly`** on properties never reassigned after construction.
- **Use constructor parameter properties** to avoid boilerplate:
  `constructor(private readonly db: Database) {}`.
- **Initialize fields where declared** when possible: `private count = 0`.
- **Require `override` keyword** on overridden methods (`noImplicitOverride`).

## Callback Types

- **Use `void` return** for callbacks whose return value is ignored.
- **Don't use optional parameters in callbacks** — callers can always ignore extra args.
  `(data: unknown, elapsed: number) => void` not `(data: unknown, elapsed?: number) => any`.

## Branded Types

Use branded types for nominal-like safety when structural typing is too permissive:
domain IDs (`UserId` vs `OrderId`), validated strings (`Email`), units (`Meters` vs
`Kilometers`). Pattern: `type UserId = string & { readonly __brand: unique symbol }`.
Keep the branding mechanism consistent across the project — `unique symbol` is most
robust.

## Array Type Syntax

Use `T[]` for simple element types (`string[]`, `User[]`). Use `Array<T>` for complex
element types (`Array<string | number>`). Same rule applies to readonly variants.

## Configuration (tsconfig.json)

- **`strict: true` always.** Non-negotiable. Also enable `noUncheckedIndexedAccess`
  and `noImplicitOverride`.
- **Module resolution:** `module: "NodeNext"` when transpiling with tsc;
  `module: "preserve"` with external bundlers (Vite, esbuild, Bun). Use
  `verbatimModuleSyntax: true` in both cases.
- **Target:** `es2022` (stable). Set `lib` to include `dom` for browser projects.
- **Never `@ts-ignore`.** Use `@ts-expect-error` in tests only, with a comment.
  Never `@ts-nocheck` in production.
- **Keep `tsconfig.json` minimal.** Use `extends` for shared configs. Separate
  `tsconfig.build.json` for builds (excludes tests, scripts).

See `references/configuration.md` for the full options catalog, library project setup,
and project structure guidance.

## Application

When **writing** TypeScript code:
- Apply all conventions silently — don't narrate each rule being followed.
- Match the project's existing patterns (interface vs type preference, enum style).
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once.

When **reviewing** TypeScript code:
- Cite the specific issue and show the fix inline.
- Don't lecture — state what's wrong and how to fix it.

## Integration

The **javascript** skill is a hard prerequisite. The JavaScript skill governs code
patterns; this skill governs type-level choices.
