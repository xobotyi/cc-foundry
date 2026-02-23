# Narrowing and Type Guards

Narrowing is TypeScript's ability to refine types within conditional branches.
Write code that narrows naturally — the compiler follows your control flow.

## Built-in Narrowing Constructs

### `typeof` Guards

TypeScript understands `typeof` checks and narrows accordingly:

```ts
function process(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase(); // value: string
  }
  return value.toFixed(2); // value: number
}
```

`typeof` returns: `"string"`, `"number"`, `"bigint"`, `"boolean"`, `"symbol"`,
`"undefined"`, `"object"`, `"function"`.

**Pitfall:** `typeof null === "object"`. Always check for `null` separately.

### `instanceof` Guards

```ts
function logValue(x: Date | string) {
  if (x instanceof Date) {
    console.log(x.toUTCString()); // x: Date
  } else {
    console.log(x.toUpperCase()); // x: string
  }
}
```

### `in` Operator

```ts
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    return animal.swim(); // animal: Fish
  }
  return animal.fly(); // animal: Bird
}
```

**Note:** Optional properties appear in both branches. If `Human` has `swim?`,
`"swim" in animal` will narrow to `Fish | Human`, not just `Fish`.

### Equality Narrowing

```ts
function example(x: string | number, y: string | boolean) {
  if (x === y) {
    // x and y are both string (the only common type)
    x.toUpperCase();
  }
}
```

`== null` checks both `null` and `undefined` — this is the one valid use of `==`:

```ts
function handle(value: string | null | undefined) {
  if (value != null) {
    // value: string (neither null nor undefined)
  }
}
```

### Truthiness Narrowing

```ts
function printAll(strs: string | string[] | null) {
  if (strs && typeof strs === "object") {
    for (const s of strs) { console.log(s); }
  } else if (typeof strs === "string") {
    console.log(strs);
  }
}
```

**Pitfall:** Truthiness checks fail on `""`, `0`, `NaN`, `false`. Prefer explicit
null checks over truthiness when these values are valid.

## Discriminated Unions

The most important narrowing pattern. Add a literal `kind` field to each variant:

```ts
interface Circle {
  kind: "circle";
  radius: number;
}

interface Square {
  kind: "square";
  sideLength: number;
}

type Shape = Circle | Square;

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
  }
}
```

### Exhaustiveness Checking

Add a `default` branch that assigns to `never` — the compiler will error if you
add a new variant without handling it:

```ts
function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
    default:
      const _exhaustive: never = shape;
      return _exhaustive;
  }
}
```

If you add `Triangle` to `Shape` without a case, TypeScript errors:
`Type 'Triangle' is not assignable to type 'never'`.

## User-Defined Type Guards (Type Predicates)

Define reusable guards with `param is Type` return annotation:

```ts
function isFish(pet: Fish | Bird): pet is Fish {
  return (pet as Fish).swim !== undefined;
}

// Use in conditionals
if (isFish(pet)) {
  pet.swim(); // pet: Fish
} else {
  pet.fly(); // pet: Bird
}

// Use with filter
const fishes: Fish[] = zoo.filter(isFish);
```

### Assertion Functions

```ts
function assertIsError(value: unknown): asserts value is Error {
  if (!(value instanceof Error)) {
    throw new Error("Expected an Error instance");
  }
}

try {
  doSomething();
} catch (e: unknown) {
  assertIsError(e);
  console.log(e.message); // e: Error
}
```

## Control Flow Analysis

TypeScript tracks types across assignments and early returns:

```ts
function padLeft(padding: number | string, input: string) {
  if (typeof padding === "number") {
    return " ".repeat(padding) + input;
  }
  // TypeScript knows padding is string here (number case returned)
  return padding + input;
}
```

## Rules Summary

- **Prefer discriminated unions** over optional properties for variant types
- **Use exhaustive switches** with `never` default to catch missing cases
- **Use `!= null`** (loose equality) to check both null and undefined
- **Write type predicates** for reusable, complex guards
- **Avoid non-null assertions (`!`)** — narrow instead
- **Use assertion functions** (`asserts x is T`) for validation at boundaries
