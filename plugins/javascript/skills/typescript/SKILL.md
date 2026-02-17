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

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Narrowing, type guards, discriminated unions, exhaustiveness | [narrowing.md](references/narrowing.md) |
| Generics, constraints, inference, utility types, conditional/mapped types | [generics.md](references/generics.md) |
| tsconfig.json, strict mode, module resolution, project setup | [configuration.md](references/configuration.md) |
| Interfaces vs types, type assertions, enums, declaration patterns | [patterns.md](references/patterns.md) |

Read the relevant reference before writing or reviewing TypeScript code.

## Core Rules

### Type Safety

1. **`strict: true` always.** No exceptions. It enables `strictNullChecks`,
   `noImplicitAny`, `strictFunctionTypes`, and other critical checks.
2. **`unknown` over `any`.** Use `unknown` and narrow with type guards. `any`
   disables type checking entirely. Reserve `any` for migration or test mocks only
   — document why with a comment.
3. **No non-null assertions (`!`) without justification.** Prefer narrowing. If `!`
   is truly needed, add a comment explaining why the value cannot be null.
4. **No type assertions (`as`) for object literals.** Use type annotations (`: Foo`)
   instead — assertions hide missing/extra property errors.

### Type Annotations

1. **Omit trivially inferred types.** Don't annotate `const x: number = 5` or
   `const s: string = "hello"`. The compiler infers these correctly.
2. **Annotate complex return types.** When inference produces opaque or wide types,
   annotate explicitly for readability.
3. **Annotate function signatures at API boundaries.** Exported functions and public
   methods should have explicit parameter and return types.
4. **Use `import type` for type-only imports.** Enforced by `verbatimModuleSyntax`.

### Interfaces and Types

1. **`interface` for object shapes.** Better error messages, IDE support, and
   performance. Use `type` for unions, intersections, tuples, and mapped types.
2. **No empty interfaces.** If you need a marker, use a branded type or a
   discriminated union.
3. **No `namespace`.** Use ES modules. `namespace` is legacy.
4. **No wrapper types.** `string` not `String`, `number` not `Number`.

### Generics

1. **Name type parameters descriptively** when meaning is non-obvious.
   `T` is fine for single-parameter generics; use `TKey`, `TValue`, `TItem`
   for multiple parameters.
2. **Constrain generics** with `extends` when possible. `<T extends string>`
   is better than `<T>` if `T` must be a string.
3. **Don't add unused type parameters.** Every generic must appear in the
   signature.
4. **Let inference work.** Don't specify type arguments when the compiler can
   infer them: `identity("hello")` not `identity<string>("hello")`.

### Narrowing

1. **Prefer discriminated unions** for variant types. Add a `kind` or `type`
   literal field to each variant.
2. **Use exhaustive switches.** Add a `default: never` case to catch unhandled
   variants at compile time.
3. **Type predicates for reusable guards.** `function isFish(pet: Animal):
   pet is Fish` — use when filtering arrays or in multiple call sites.
4. **`typeof`, `instanceof`, `in`** — use JavaScript narrowing constructs;
   TypeScript understands them natively.

### Enums

1. **Prefer string enums** over numeric enums. String enums have meaningful
   runtime values and don't suffer from reverse-mapping confusion.
2. **Prefer union types over enums** when values are simple string literals:
   `type Status = "active" | "inactive"` is simpler than `enum Status`.
3. **Never coerce enums to booleans.** Compare explicitly:
   `level !== Level.NONE`, not `!!level`.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `any` | `unknown` + narrowing |
| `value as Foo` on object literals | `const value: Foo = { ... }` |
| `x!.prop` without comment | Narrow first: `if (x) { x.prop }` |
| `String`, `Number`, `Boolean` | `string`, `number`, `boolean` |
| `namespace Foo { }` | ES module exports |
| `<Foo>value` (angle bracket cast) | `value as Foo` (when assertion is justified) |
| `interface Empty {}` | Branded type or discriminated union |
| `type User = { name: string }` | `interface User { name: string }` |
| `enum Status { Active, Inactive }` | `type Status = "active" \| "inactive"` or string enum |
| Unused type parameter `<T>` | Remove it or constrain it |
| `const x: string = "hello"` | `const x = "hello"` — inference handles it |
| `export default class Foo` | `export class Foo` — named exports |
| `Array<string>` for simple types | `string[]` |
| `string[]` for complex element types | `Array<{ id: string; name: string }>` |
| `Record<string, any>` | `Record<string, unknown>` or a specific interface |
| `obj['prop']` to bypass private | Fix visibility or use a proper accessor |

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

The **javascript** skill is a hard prerequisite (see top of this file). The full
activation stack for TypeScript work:

1. **JavaScript** — Language fundamentals, idioms, async patterns (must be loaded first)
2. **TypeScript** — Type system conventions (this skill)
3. **Runtime** (Node.js/Bun) — Runtime-specific APIs
4. **Vitest** — Testing conventions (if testing)

The JavaScript skill governs code patterns; this skill governs type-level choices.

**Types encode intent. When in doubt, make it stricter.**
