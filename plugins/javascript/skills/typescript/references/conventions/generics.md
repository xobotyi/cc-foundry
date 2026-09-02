# Generics, Inference, and Signatures

A type parameter earns its place by **relating** two positions in a signature. Where it appears once, it is a wider type
wearing a variable's name.

## When a type parameter is wrong

- **It appears once in the signature.** `function log<T>(x: T): void` is `function log(x: unknown): void` with extra
  ceremony. The parameter relates nothing.
- **It appears only in the return type.** `function parse<T>(s: string): T` cannot be inferred, so the caller supplies
  it, so the function is `parse(s: string): unknown` with a mandatory unchecked assertion attached. Return `unknown` and
  let the caller narrow, or take a validator argument that carries the type.
- **The constraint lists members the body never touches.** `<T extends Record<string, unknown>>` on a function that only
  passes the value through rejects valid callers for nothing.

## Constraints

- **Constrain by what the body uses.** `<T extends { id: string }>` where the body reads `id`; `<T>` where it only moves
  the value.
- **Relate parameters through constraints** rather than through a second unrelated parameter: `<T, K extends keyof T>`
  makes the key position depend on the object position, so `get(user, "nmae")` fails at the call.
- **A default makes a parameter optional at the use site**: `interface Container<T, U = T[]>`. It does not affect
  inference from arguments.

## Controlling inference

- **`const T` (5.0)** makes an argument infer as if written with `as const`, so a literal array or object keeps its
  literal type without the caller adding the assertion.

  ```ts
  declare function pick<const T extends readonly string[]>(keys: T): T[number];
  pick(["a", "b"]); // "a" | "b"
  ```

  Two traps. The constraint must be `readonly`, because a `readonly` tuple is not assignable to a mutable `string[]`,
  and when the constraint rejects the const-inferred candidate the compiler falls back to the constraint silently — the
  call still succeeds, with the wide type. And `const` applies only to a literal written inside the call: a variable
  passed in keeps the type it already had.

- **`NoInfer<T>` (5.4)** removes a position from inference so another position decides the type.

  ```ts
  function createStreetLight<C extends string>(colors: C[], defaultColor?: NoInfer<C>) {}
  createStreetLight(["red", "yellow", "green"], "blue");
  //                                            ~~~~~~ error, where without NoInfer C widens to include "blue"
  ```

  Reach for it wherever one argument is the source of truth and another must be validated against it. It replaces the
  older workaround of a second type parameter `D extends C` used once.

- **Variance annotations (4.7)** — `interface Producer<out T>`, `interface Consumer<in T>` — state the variance instead
  of letting the checker compute it. They are a compile-time performance instrument for a large generic type, and a
  correctness statement when structural comparison would infer the wrong variance. They are not needed on ordinary
  types.

- **An explicit type argument suppresses inference entirely.** Where an inference change surfaces a new error after a
  compiler upgrade, one explicit type argument at the call is the intended fix.

## `satisfies` versus annotation versus assertion

Three ways to relate an expression to a type, with different results.

- **`const x: T = expr`** checks the expression against `T` and gives `x` the type `T`. Excess properties are caught,
  literal types are widened to `T`'s members. Use for a value whose consumers only need `T`.
- **`const x = expr satisfies T`** checks the expression against `T` and gives `x` the **inferred** type of `expr`.
  Excess properties are caught, literal types survive. Use for a config, a lookup table, a route map — anything where
  the specific keys and values are read back.
- **`const x = expr as T`** checks nothing beyond assignability in one direction and gives `x` the type `T`. It is the
  only one of the three that can be wrong.

```ts
const palette = {
    red: [255, 0, 0],
    green: "#00ff00",
    bleu: [0, 0, 255],
    // ~~~ caught: "bleu" is not in Colors
} satisfies Record<Colors, string | RGB>;

palette.green.toUpperCase(); // still string, not string | RGB
```

## Signatures

- **Prefer a union parameter to overloads** where the argument types differ but the logic is one path. Overloads that
  differ in one argument position force a pass-through caller to write their own overloads.
- **Prefer optional parameters to overloads** where the signatures differ only in trailing arguments and share a return
  type. Overloads make an explicit `undefined` in a trailing position an error, which optional parameters accept.
- **Order overloads specific before general.** Resolution takes the first match, so a general signature placed first
  hides every signature after it.
- **A callback parameter is never optional.** A caller may always pass a function that ignores trailing arguments, so
  `(data: unknown, elapsed?: number) => void` states something different — and wrong — from what the author meant.
- **A callback whose return value is ignored returns `void`, never `any`.** `void` stops the call site from using the
  result; `any` lets a mistake through unchecked.
- **Annotate the return type of every exported function.** It pins the contract, keeps a body change from silently
  widening the API, and is required under `isolatedDeclarations`.
