# Narrowing and Control-Flow Analysis

Control-flow analysis is the part of the type system that catches the most defects per line of type annotation written.
It is also the part that fails silently: when a narrowing does not happen, the type stays wide and the code still
compiles.

## Discriminated unions

A union of object types with a shared literal-typed property is the shape every narrowing construct works best against.

- **The discriminant must be a literal type on every member** — `kind: "circle"`, not `kind: string`. A `string`-typed
  discriminant narrows nothing.
- **Never model a variant with optional properties.** `{ ok: boolean; data?: T; error?: E }` requires a check at every
  read and permits the impossible states `{ ok: true, error: e }` and `{ ok: false, data: d }`. Two members with a `ok`
  discriminant make both impossible.
- **Discriminate on more than one property where the domain has more than one axis.** The checker narrows against every
  literal-typed property, not only a conventionally named `kind` or `type`.

## Exhaustiveness

Assigning the narrowed value to `never` in the default branch turns a new union member into a compile error at every
site that switches on it.

```ts
function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle": return Math.PI * shape.r ** 2;
        case "square": return shape.s ** 2;
        default: {
            const unhandled: never = shape;
            return unhandled;
        }
    }
}
```

The value of this pattern is entirely in the compile error it produces when the union grows. A `default` that throws
without the `never` assignment reports the same case at runtime instead, one deployment later.

## Type predicates

- **A predicate is inferred (5.5) only under four conditions**: no explicit return type or predicate annotation, exactly
  one `return` and no implicit return, no mutation of the parameter, and a boolean expression tied to a refinement on
  that parameter. This is what makes `arr.filter(x => x !== undefined)` produce `T[]`.
- **A truthiness check does not infer a predicate**, and the reason is not a limitation. `x is T` carries "if and only
  if" semantics: a `false` result must prove the value is not `T`. `!!score` returns `false` for `0`, which is a
  perfectly good `number`, so no predicate is sound. Write the comparison the domain actually means.
- **Write the predicate explicitly where the function is exported or reused.**
  `function isFish(pet: Animal): pet is Fish` states the contract in the signature rather than leaving it to the
  inference conditions holding after the next edit.
- **A predicate is unchecked.** The compiler verifies that the returned type is assignable to the parameter type, not
  that the body actually proves it. A wrong predicate is a silent lie for every caller.
- **An assertion function narrows the caller's binding**: `function assertIsError(v: unknown): asserts v is Error`.
  Declare it with `function`. An arrow function assigned to a `const` fails at the call site with `TS2775` — assertions
  require every name in the call target to carry an explicit type annotation, which an inferred `const` does not.

## Narrowing gotchas

- **`in` widens with optional properties.** If `Human` declares `swim?(): void`, then `"swim" in animal` narrows to
  `Fish | Human`, not `Fish`, because a `Human` may carry the property. Discriminate on a required literal property
  instead.
- **`typeof null === "object"`.** A `typeof x === "object"` check admits `null`. Check `x !== null` first, or use a
  discriminant.
- **Truthiness narrowing drops `""`, `0`, `NaN`, and `false`.** `if (count)` skips a legitimate zero. Use
  `if (count !== undefined)`.
- **`!= null` is the one correct loose comparison.** It tests `null` and `undefined` together and nothing else.
- **A narrowing is lost at any function boundary that could re-run** — a property read, a call the checker cannot prove
  pure, an `await`. Copy the narrowed value into a `const` and use that.
- **A closure keeps the narrowing that held after the last assignment to the captured variable** (5.4). This works for a
  `let` reassigned before the closure is created and never after it; a variable assigned inside a callback goes back to
  its declared type.
- **`filter(Boolean)` does not narrow.** `Boolean` is declared as returning `boolean`, not as a predicate, so
  `xs.filter(Boolean)` on `(string | undefined)[]` stays `(string | undefined)[]`. `filter` and `find` both consume a
  real predicate — `xs.filter(x => x !== undefined)` gives `string[]` and `xs.find(isFish)` gives `Fish | undefined`.
- **Optional chaining short-circuits to `undefined`, not to the property type.** `a?.b.c` is `undefined` when `a` is
  nullish, which means the result type carries `undefined` even where `b.c` cannot.

## `unknown` at the boundary

Every value crossing into the program from outside — a response body, `JSON.parse`, a message payload, an environment
variable, a caught error — is `unknown` until it is checked.

- **Narrow with a schema validator, not with a hand-written predicate**, wherever the shape is more than two fields
  deep. A hand-written predicate is unchecked; a validator that emits its own type is not.
- **`catch` bindings are `unknown` under `strict`.** `err instanceof Error` is the guard; a thrown non-`Error` is
  ordinary in JavaScript and the branch that handles it is not dead code.
- **`unknown` is the only safe top type.** `{}` admits every non-nullish value including primitives, `object` admits
  every non-primitive, and `any` admits everything and stops checking everything downstream of it.
