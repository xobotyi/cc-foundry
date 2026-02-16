# JavaScript Objects and Arrays

Object/array patterns, destructuring, iteration, classes, and immutability.

## Objects

### Literal Syntax

Always use literal syntax. Never use constructors:

```js
// Bad
const obj = new Object();
const arr = new Array();

// Good
const obj = {};
const arr = [];
```

### Shorthand

Use method shorthand, property shorthand, and computed property names:

```js
const name = "Alice";
const key = "role";

const user = {
  name,                        // property shorthand
  [key]: "admin",              // computed property
  greet() { return "hello"; }, // method shorthand
};
```

### Shallow Copy with Spread

Use spread for shallow copies. Never mutate arguments or shared objects:

```js
// Shallow copy
const copy = { ...original };

// Merge
const merged = { ...defaults, ...overrides };

// Omit properties via rest
const { password, ...safeUser } = user;
```

Prefer spread over `Object.assign()`.

### Property Access

Use dot notation for static properties, brackets for dynamic:

```js
user.name;          // static
user[dynamicKey];   // dynamic
```

Use `Object.hasOwn(obj, key)` instead of `obj.hasOwnProperty(key)`:

```js
// Bad — can be shadowed or fail on null-prototype objects
if (obj.hasOwnProperty("key")) { ... }

// Good
if (Object.hasOwn(obj, "key")) { ... }
```

### Don't Mutate Prototypes

Never extend built-in prototypes (`Array.prototype`, `Object.prototype`, etc.).
Use utility functions or subclasses instead.

## Arrays

### Prefer Functional Methods

Use `map`, `filter`, `reduce`, `find`, `some`, `every`, `flatMap` over
manual loops for data transformation:

```js
// Bad — imperative
const active = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].active) active.push(users[i]);
}

// Good — declarative
const active = users.filter((u) => u.active);
```

### Array Method Rules

- **Always return** in `map`, `filter`, `reduce` callbacks.
- Use `Array.from(arrayLike)` for array-like objects (not spread).
- Use `Array.from(iterable, mapFn)` instead of `[...iterable].map(mapFn)` —
  avoids an intermediate array.

### Spread for Copies

```js
const copy = [...original];
const combined = [...arr1, ...arr2];
```

### Immutable Updates

Don't mutate arrays — return new ones:

```js
// Bad
items.push(newItem);
items.splice(index, 1);

// Good
const added = [...items, newItem];
const removed = items.filter((_, i) => i !== index);
const updated = items.map((item) =>
  item.id === target.id ? { ...item, ...changes } : item
);
```

### for...of for Side Effects

When the loop body has side effects (not producing a new array), use `for...of`:

```js
for (const item of items) {
  await process(item);
}
```

Don't use `for...in` on arrays — it iterates string keys including inherited
properties.

## Destructuring

### Object Destructuring

Use destructuring to extract properties from objects:

```js
// Bad
const name = user.name;
const email = user.email;

// Good
const { name, email } = user;

// With rename
const { name: userName, email: userEmail } = user;

// With defaults
const { role = "user", active = true } = options;

// Nested
const { address: { city } } = user;
```

### Parameter Destructuring

Destructure directly in function signatures:

```js
// Good — clear which properties are used
function formatUser({ name, email, role = "user" }) {
  return `${name} <${email}> (${role})`;
}
```

### Array Destructuring

```js
const [first, second, ...rest] = items;
const [, , third] = items; // skip elements

// Swap
[a, b] = [b, a];
```

### Object Over Array for Return Values

When returning multiple values, prefer objects — callers don't depend on order:

```js
// Bad — order-dependent
function getRange() { return [min, max]; }
const [min, max] = getRange();

// Good — order-independent
function getRange() { return { min, max }; }
const { min, max } = getRange();
```

## Classes

### ES Classes Only

Use `class` syntax. Never use function constructors or prototype manipulation:

```js
class Animal {
  #name; // private field

  constructor(name) {
    this.#name = name;
  }

  get name() { return this.#name; }

  speak() {
    return `${this.#name} makes a sound`;
  }
}

class Dog extends Animal {
  speak() {
    return `${this.name} barks`;
  }
}
```

### Class Guidelines

1. **Prefer composition over inheritance.** Use inheritance only for true
   "is-a" relationships.
2. **Use `#private` fields** for encapsulation — not `_` convention.
3. **Methods can return `this`** for fluent/chainable APIs.
4. **No empty constructors.** If the constructor only calls `super()`, omit it.
5. **Static methods** for operations that don't need instance state.

### When Not to Use Classes

Don't force classes when plain functions and objects suffice. A class with one
method is usually a function in disguise:

```js
// Unnecessary class
class Validator {
  validate(data) { return schema.parse(data); }
}

// Just a function
function validate(data) { return schema.parse(data); }
```

## Iteration

### Choosing the Right Loop

| Need | Use |
|------|-----|
| Transform data → new array | `.map()` |
| Filter items | `.filter()` |
| Accumulate to single value | `.reduce()` |
| Find first match | `.find()` / `.findIndex()` |
| Check condition | `.some()` / `.every()` |
| Side effects on each item | `for...of` |
| Async sequential processing | `for...of` with `await` |
| Object keys/values | `Object.entries()` + `for...of` |

### Object Iteration

```js
// Entries — most versatile
for (const [key, value] of Object.entries(obj)) { ... }

// Keys only
for (const key of Object.keys(obj)) { ... }

// Values only
for (const value of Object.values(obj)) { ... }
```

### Map and Set

Use `Map` for key-value collections where keys are not strings, or where
insertion order matters. Use `Set` for unique value collections:

```js
const cache = new Map();
cache.set(objectKey, value);

const unique = new Set(items);
const deduped = [...new Set(items)];
```

Never use plain objects as maps when keys are user-provided — use `Map` to
avoid prototype pollution.

### Generators

Use generators for lazy sequences and custom iterables:

```js
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

for (const n of range(0, 10, 2)) {
  console.log(n); // 0, 2, 4, 6, 8
}
```

`yield*` delegates to another iterable:

```js
function* concat(...iterables) {
  for (const iter of iterables) {
    yield* iter;
  }
}
```
