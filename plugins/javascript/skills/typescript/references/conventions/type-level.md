# Type-Level Programming

The type level is a pure functional language with no debugger, no stack trace, and a hard recursion ceiling. Everything
in it is worth writing only where the alternative — an explicit type, a code generator, a runtime check — costs more.

## Complexity tiers

Stay at the lowest tier that solves the problem. Moving up a tier trades away readability, error-message quality, and
check time.

- **Interfaces, type aliases, unions, intersections** — the default. Almost every domain model stops here.
- **`Partial`, `Pick`, `Omit`, `Record`, `Readonly`, `Exclude`, `Extract`, `ReturnType`, `Parameters`, `Awaited`,
  `NonNullable`, `NoInfer`** — named transformations a reader recognises without tracing.
- **Conditional, mapped, and template-literal types** — a library or framework boundary where the shape genuinely
  depends on the input type.
- **Recursive conditional types, `infer` chains, type-level arithmetic** — a last resort, and usually the wrong tool.
  The error message a user sees is the fully expanded intermediate type.

A type whose purpose cannot be stated in one sentence is over budget. Split it into named aliases, each of which can be
hovered.

## Conditional types

- **A naked type parameter distributes over a union.** `T extends string ? "s" : "o"` applied to `string | number` is
  `"s" | "o"`, evaluated per member. This is what makes `Exclude` and `Extract` work.
- **Wrap both sides in a tuple to stop distribution**: `[T] extends [string] ? "s" : "o"` applied to `string | number`
  is `"o"`, evaluated once against the whole union. Reach for this whenever the question is about the union as a unit —
  "is this exactly `never`", "does this union contain only strings".
- **`infer` binds inside the extends clause**, and takes a constraint since 4.7: `T extends `${infer N extends
  number}` ? N : never`.
- **`never` is the empty union.** A distributive conditional over `never` produces `never` without evaluating the
  branch, which is a common source of a rule that silently does nothing.

## Mapped types

- **Key remapping with `as` filters and renames in one clause**:

  ```ts
  type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
  type OnlyStrings<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] };
  ```

  Producing `never` for a key removes it, which is how a mapped type filters.

- **`+` and `-` add and remove modifiers**: `{ -readonly [K in keyof T]-?: T[K] }` produces the mutable, fully required
  form. `-?` removes optionality; without it, `Required` cannot be expressed.
- **A homomorphic mapped type — one written `[K in keyof T]` — preserves `readonly`, optionality, and array and tuple
  shape.** Introducing a key remapping or mapping over a computed key set drops all of that, which is why a hand-rolled
  `Partial` sometimes turns an array into an object.

## Template-literal types

- **They are for a naming contract, not for string manipulation.** `` `on${Capitalize<K>}` `` to derive event-handler
  names, `` `${Method} ${Path}` `` to type a route table. Parsing a string into structure at the type level costs
  recursion depth and produces an unreadable error on failure.
- **From TypeScript 7.0, inference consumes one Unicode code point at a time**, so a supplementary-plane character stays
  whole. Any utility that counted UTF-16 code units gives different answers.

## Recursion limits

- **A non-tail-recursive conditional type stops at 100 instantiations** and reports
  `TS2589: Type instantiation is excessively deep and possibly infinite`.
- **A tail-recursive conditional type stops at 1000.** A conditional qualifies when its recursive instantiation is the
  final operation:

  ```ts
  // Tail position — qualifies, ceiling 1000.
  type BuildTuple<N extends number, A extends unknown[] = []> = A["length"] extends N
      ? A
      : BuildTuple<N, [...A, unknown]>;

  // Result is wrapped before it returns — does not qualify, ceiling 100.
  type Deep<N extends number, A extends unknown[] = []> = A["length"] extends N ? A : [...Deep<N, [...A, unknown]>];
  ```

- **The fix for `TS2589` is an accumulator.** Rewrite so the recursive call is in tail position and the work accumulates
  in a second type parameter. Where that does not fit, cap the depth explicitly with a counter parameter.
- **A large union multiplies against everything it touches.** A conditional distributed over a 200-member union that
  itself produces a union produces 200 results; two such in sequence produce 40,000. Union size, not nesting depth, is
  what usually makes a build slow.

## Nominal typing

Structural typing means `UserId` and `OrderId` are the same type if both are `string`. Branding adds a phantom property
so they are not.

```ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

type UserId = Brand<string, "UserId">;
type Email = Brand<string, "Email">;

const asUserId = (s: string): UserId => s as UserId;
```

- **Brand what a wrong value would corrupt** — an identifier that could be swapped with another identifier, a validated
  string, a unit-bearing number. Brand nothing else; every brand adds a construction function and a cast.
- **A `unique symbol` key survives declaration emit and does not collide across packages**, where a string-literal key
  such as `__brand` can be produced accidentally by an unrelated object and shows in every hover and error message.
- **The cast at the boundary is the whole design.** One function per brand performs the validation and the single `as`;
  no other code in the program constructs the branded type.
- **A branded type is erased at runtime.** It constrains the code that compiles, and nothing else.
