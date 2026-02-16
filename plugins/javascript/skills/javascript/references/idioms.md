# JavaScript Idioms

Variables, naming, declarations, equality, type coercion, and modern syntax patterns.

## Variables

### `const` by Default

Use `const` for all bindings. Switch to `let` only when reassignment is required.
Never use `var`.

```js
// Good
const maxRetries = 3;
let attempts = 0;

// Bad — var is function-scoped, not block-scoped
var count = 0;
```

`const` does not make values immutable — it prevents reassignment of the binding.
Objects and arrays declared with `const` can still be mutated.

### Block Scoping

`let` and `const` are block-scoped. `var` is function-scoped and hoisted to the
function top, which causes bugs in loops and conditionals:

```js
// Bug — var is shared across all iterations
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // prints 3, 3, 3
}

// Fix — let creates a new binding per iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // prints 0, 1, 2
}
```

### One Declaration Per Line

Declare each variable on its own line. Never chain declarations.

```js
// Bad
const a = 1, b = 2, c = 3;

// Good
const a = 1;
const b = 2;
const c = 3;
```

Group `const` declarations first, then `let` declarations.

## Naming

### Conventions

| Entity | Style | Examples |
|--------|-------|----------|
| Variables, functions | camelCase | `userName`, `fetchData` |
| Classes, constructors | PascalCase | `UserService`, `HttpClient` |
| Constants (true constants) | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| Private fields/methods | `#` prefix (class) | `#count`, `#validate()` |
| Boolean variables | `is`/`has`/`can`/`should` prefix | `isValid`, `hasAccess` |
| File names | kebab-case or camelCase | `user-service.js`, `userService.js` |

**True constants** are values known at compile time and never computed at runtime.
A variable that holds a value returned from a function is not a constant — use
camelCase for those:

```js
// SCREAMING_SNAKE — known at compile time
const MAX_RETRIES = 3;
const API_BASE_URL = "https://api.example.com";

// camelCase — computed or runtime-dependent
const currentUser = await getUser();
const defaultTimeout = config.timeout ?? 5000;
```

### Descriptive Names

Names should reveal intent. Avoid abbreviations unless universally understood
(`url`, `id`, `err`, `ctx`, `req`, `res`).

```js
// Bad
const d = new Date();
const cb = (x) => x * 2;

// Good
const now = new Date();
const double = (value) => value * 2;
```

Short names are acceptable in short scopes: loop indices (`i`, `j`), arrow
function params in simple callbacks (`x => x.id`).

### Avoid Redundant Context

Don't repeat the containing object/class name in property names:

```js
// Bad
const car = { carMake: "Honda", carModel: "Accord" };

// Good
const car = { make: "Honda", model: "Accord" };
```

### Consistent Vocabulary

Use the same word for the same concept throughout a codebase:

```js
// Bad — three names for the same concept
getUserInfo();
getClientData();
getCustomerRecord();

// Good
getUser();
```

## Equality and Comparisons

### Always Use `===` and `!==`

Abstract equality (`==`) performs type coercion and produces surprising results:

```js
0 == ""      // true
0 == "0"     // true
"" == "0"    // false
false == "0" // true
null == undefined // true
```

Use strict equality (`===`) everywhere. The only acceptable use of `==` is
checking for `null` or `undefined` together:

```js
// Acceptable — checks both null and undefined
if (value == null) { ... }

// Equivalent explicit version
if (value === null || value === undefined) { ... }
```

### Falsy Values

These are falsy in JavaScript: `false`, `0`, `-0`, `0n`, `""`, `null`,
`undefined`, `NaN`.

Everything else is truthy, including `[]`, `{}`, and `"0"`.

### Nullish Coalescing Over `||`

Use `??` when you want to default only on `null`/`undefined`. Use `||` only when
you want to default on all falsy values:

```js
// Bug — || treats 0 and "" as falsy
const port = config.port || 3000; // 0 becomes 3000

// Fix — ?? only defaults on null/undefined
const port = config.port ?? 3000; // 0 stays 0
```

### Optional Chaining

Use `?.` for safe property access on potentially nullish values:

```js
const city = user?.address?.city;
const result = callback?.();
const item = arr?.[index];
```

Don't overuse — if a value should always exist, accessing it directly is better
because it surfaces bugs rather than hiding them.

## Modern Syntax

### Template Literals

Use template literals for string interpolation and multiline strings:

```js
// Bad
const msg = "Hello, " + name + "! You have " + count + " items.";

// Good
const msg = `Hello, ${name}! You have ${count} items.`;
```

Don't use template literals for strings without interpolation — use plain quotes.

### Spread and Rest

```js
// Spread — shallow copy
const copy = { ...original, newProp: true };
const merged = [...arr1, ...arr2];

// Rest — collect remaining
const { id, ...rest } = user;
function log(message, ...args) { ... }
```

Prefer spread `{ ...obj }` over `Object.assign({}, obj)`.

### Shorthand Properties

```js
const name = "Alice";
const age = 30;

// Bad
const user = { name: name, age: age };

// Good
const user = { name, age };
```

Group shorthand properties at the top of object literals for readability.

### Computed Property Names

```js
const key = "status";
const obj = {
  [key]: "active",
  [`${key}Date`]: new Date(),
};
```

### Logical Assignment

```js
// Assign only if nullish
options.timeout ??= 5000;

// Assign only if falsy
options.name ||= "default";

// Assign only if truthy
options.handler &&= wrapHandler(options.handler);
```
