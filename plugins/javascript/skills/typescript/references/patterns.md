# TypeScript Patterns and Declarations

## Interfaces vs Type Aliases

### When to Use `interface`

Use `interface` for object shapes — it has better error messages, IDE support,
and compiler performance:

```ts
interface User {
  name: string;
  email: string;
  age: number;
}

// Extension is explicit and readable:
interface Admin extends User {
  permissions: string[];
}
```

### When to Use `type`

Use `type` for everything that isn't an object shape:

```ts
// Unions:
type Status = "active" | "inactive" | "pending";

// Intersections:
type WithTimestamps = User & { createdAt: Date; updatedAt: Date };

// Tuples:
type Coordinate = [number, number];

// Function types:
type Handler = (event: Event) => void;

// Mapped/conditional types:
type Optional<T> = { [K in keyof T]?: T[K] };
```

### Decision Rule

Object shape with known properties? `interface`.
Everything else? `type`.

Do not mix arbitrarily — pick one pattern per kind and stay consistent within
a project.

## Type Assertions

### Prefer Annotations Over Assertions

```ts
// Bad: assertion hides missing/extra property errors
const user = { name: "Alice", emal: "a@b.com" } as User;

// Good: annotation catches the typo immediately
const user: User = { name: "Alice", emal: "a@b.com" };
// Error: 'emal' does not exist on type 'User'
```

### When Assertions Are Justified

Sometimes you genuinely know more than the compiler:

```ts
// OK: value comes from trusted external source
const config = JSON.parse(rawConfig) as AppConfig;

// OK: DOM API returns wider type
const input = document.getElementById("email") as HTMLInputElement;
```

Always use `as` syntax, never angle brackets:

```ts
// Bad:
const x = (<Foo>value).method();

// Good:
const x = (value as Foo).method();
```

### Double Assertions

When TypeScript rejects a direct assertion, cast through `unknown`:

```ts
// value is Foo because [specific reason]
const result = (value as unknown as Foo).method();
```

Use `unknown` as the intermediate type, never `any`.

## Null Handling

### Prefer Optional (`?`) Over `| undefined`

```ts
// Good: optional field
interface Config {
  debug?: boolean;
  timeout?: number;
}

// Good: optional parameter
function connect(host: string, port?: number) { ... }

// Avoid: explicit undefined in the type
interface Config {
  debug: boolean | undefined; // Forces callers to pass undefined explicitly
}
```

### Nullable Type Aliases

Do not include `null` or `undefined` in type aliases:

```ts
// Bad: null baked into the alias
type MaybeUser = User | null;

// Good: nullability at the use site
function getUser(id: string): User | null { ... }
```

This keeps nullability visible where it matters and prevents it from spreading
through the codebase.

### Null Narrowing

```ts
// Loose equality checks both null and undefined:
if (value != null) {
  // value is neither null nor undefined
}

// Optional chaining for access:
const name = user?.profile?.name;

// Nullish coalescing for defaults:
const timeout = config.timeout ?? 3000;
```

## Enums

### Prefer String Enums

```ts
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}
```

String enums have meaningful runtime values, predictable behavior, and readable
debug output.

### Prefer Union Types for Simple Cases

```ts
// Simpler than an enum:
type Direction = "up" | "down" | "left" | "right";

// Use enum when you need:
// - Runtime object (iteration, lookup)
// - Namespace for related constants
// - Reverse mapping (numeric enums only)
```

### Enum Anti-Patterns

```ts
// Bad: numeric enums with implicit values
enum Status { Active, Inactive } // Active = 0, Inactive = 1

// Bad: boolean coercion of enums
if (status) { ... } // Active (0) is falsy!

// Good: explicit comparison
if (status !== Status.Inactive) { ... }

// Bad: mixed numeric and string members
enum Mixed { A = 0, B = "b" } // Never do this
```

## Class Patterns

### Visibility

- Omit `public` — it's the default. Only use `public` on non-readonly
  constructor parameter properties.
- Use `private` for internal state, `protected` for subclass access.
- Use `readonly` on properties that are never reassigned after construction.

```ts
class UserService {
  // No "public" needed — it's the default
  readonly name: string;

  constructor(
    private readonly db: Database,
    public apiKey: string, // public needed for parameter property
  ) {
    this.name = "UserService";
  }
}
```

### Parameter Properties

Use constructor parameter properties to avoid boilerplate:

```ts
// Bad: manual assignment
class Service {
  private readonly db: Database;
  constructor(db: Database) {
    this.db = db;
  }
}

// Good: parameter property
class Service {
  constructor(private readonly db: Database) {}
}
```

### Field Initialization

Initialize where declared when possible:

```ts
class Counter {
  private count = 0; // No constructor needed
  private readonly items: string[] = [];
}
```

## Structural Typing

TypeScript is structural, not nominal. A value matches a type if it has the
required properties — the name of the type doesn't matter.

### Annotate for Precision

```ts
interface Animal { sound: string; name: string }

// Bad: inferred type, error shows at call site far away
const cat = { sound: "meow" };
makeSound(cat); // Error here, but the bug is above

// Good: annotated type, error shows at declaration
const horse: Animal = { sound: "neigh" };
// Error: Property 'name' is missing
```

### Use Structural Types, Not Classes

When defining data shapes, use interfaces:

```ts
// Bad: class used as data shape
class Foo {
  readonly a: number;
  readonly b: string;
}

// Good: interface for structure
interface Foo {
  a: number;
  b: string;
}
```

## Overload Patterns

### Prefer Union Types Over Overloads

```ts
// Bad: separate overloads for each type
function format(x: string): string;
function format(x: number): string;
function format(x: string | number): string { ... }

// Good: union parameter
function format(x: string | number): string { ... }
```

### Prefer Optional Parameters Over Overloads

```ts
// Bad: overloads differing in trailing params
interface Example {
  diff(one: string): number;
  diff(one: string, two: string): number;
}

// Good: optional parameter
interface Example {
  diff(one: string, two?: string): number;
}
```

### Overload Ordering

When overloads are necessary, put specific signatures before general ones:

```ts
function handle(x: HTMLDivElement): string;
function handle(x: HTMLElement): number;
function handle(x: unknown): unknown;
function handle(x: unknown): unknown { ... }
```

TypeScript picks the first matching overload. General-before-specific hides
the specific overloads.

## Branded Types

TypeScript's structural typing means any `string` is assignable to any other
`string`-typed variable. Branded types add nominal-like safety:

```ts
type UserId = string & { readonly __brand: unique symbol };
type OrderId = string & { readonly __brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}

function getUser(id: UserId): User { ... }

const userId = createUserId("usr_123");
const orderId = "ord_456" as OrderId;

getUser(userId);  // OK
getUser(orderId); // Error: OrderId is not assignable to UserId
getUser("raw");   // Error: string is not assignable to UserId
```

Use branded types when:
- Domain IDs should not be interchangeable (UserId vs OrderId)
- Validated strings need type-level tracking (Email, URL)
- Units must not be mixed (Meters vs Kilometers)

Keep the branding mechanism consistent across the project. The `unique symbol`
pattern is the most robust — `__brand: "UserId"` also works but allows
cross-assignment between brands with the same string.

## `unknown` vs `any`

### Decision Table

| Situation | Use |
|-----------|-----|
| Value from external source (API, JSON.parse, user input) | `unknown` |
| Function accepts anything, passes through without touching | `unknown` |
| Migrating JS to TS incrementally | `any` (temporary, with comment) |
| Test mock that intentionally bypasses type checking | `any` (with comment) |
| You're too lazy to type it properly | Fix the types |

### Using `unknown` Safely

`unknown` requires narrowing before use:

```ts
function processValue(value: unknown): string {
  // Bad: value.toString() — Error, unknown has no methods

  // Good: narrow first
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value instanceof Error) return value.message;
  return JSON.stringify(value);
}
```

### `{}` Type

`{}` means "any non-nullish value" — it's almost never what you want:

| Type | Allows |
|------|--------|
| `unknown` | Everything (null, undefined, primitives, objects) |
| `object` | Non-primitive, non-null values |
| `{}` | Any non-nullish value (primitives included) |
| `Record<string, unknown>` | Objects with string keys |

Prefer `unknown` for opaque values, `Record<string, unknown>` for dict-like
objects, `object` when you need "any non-primitive".

## Callback Types

- Use `void` return for callbacks whose return value is ignored.
- Don't use optional parameters in callbacks — callers can always ignore
  extra arguments.

```ts
// Bad:
type Callback = (data: unknown, elapsed?: number) => any;

// Good:
type Callback = (data: unknown, elapsed: number) => void;
```
