# JavaScript Functions

Function declarations, arrow functions, closures, scope, and parameter patterns.

## Function Style

### Arrow Functions by Default

Use arrow functions for anonymous functions and callbacks. Use function
declarations only when hoisting or `this` binding is needed.

```js
// Callbacks — always arrow
const doubled = items.map((x) => x * 2);
setTimeout(() => cleanup(), 1000);

// Named functions — declaration or const, pick one per codebase
function processOrder(order) { ... }
// or
const processOrder = (order) => { ... };
```

### Arrow Function Syntax Rules

```js
// Single param — parens optional but prefer them for consistency
const square = (x) => x * x;

// No params — parens required
const greet = () => "hello";

// Single expression — implicit return (no braces)
const add = (a, b) => a + b;

// Multi-statement — explicit return (braces required)
const transform = (data) => {
  const normalized = normalize(data);
  return validate(normalized);
};
```

Prefer parentheses around arrow function parameters even when there is only
one — it makes adding/removing parameters a smaller diff.

### Arrow Functions and `this`

Arrow functions capture `this` from the enclosing lexical scope. They do NOT
have their own `this`.

```js
// Good — arrow preserves `this` from class method
class Timer {
  start() {
    this.id = setInterval(() => this.tick(), 1000);
  }
}

// Bad — regular function has its own `this` (undefined in strict mode)
class Timer {
  start() {
    this.id = setInterval(function () {
      this.tick(); // TypeError: this.tick is not a function
    }, 1000);
  }
}
```

Never use arrow functions as methods on objects or prototypes — they won't
have the correct `this`:

```js
// Bad — arrow captures module-level this, not the object
const obj = {
  name: "test",
  greet: () => `Hello, ${this.name}`, // this.name is undefined
};

// Good
const obj = {
  name: "test",
  greet() { return `Hello, ${this.name}`; },
};
```

## Parameters

### Default Parameters

Use default parameter syntax. Never mutate arguments or use `||` for defaults:

```js
// Bad — || fails on falsy values like 0, ""
function create(name, timeout) {
  timeout = timeout || 5000;
}

// Good
function create(name, timeout = 5000) { ... }
```

Default parameters are evaluated left to right and can reference earlier params:

```js
function createElement(tag, className = `${tag}-default`) { ... }
```

### Destructured Options

For functions with 3+ parameters, use a destructured options object:

```js
// Bad — positional args are hard to remember
function createUser(name, email, role, active) { ... }
createUser("Alice", "a@b.com", "admin", true);

// Good — self-documenting, order-independent
function createUser({ name, email, role = "user", active = true }) { ... }
createUser({ name: "Alice", email: "a@b.com", role: "admin" });
```

### Rest Parameters Over `arguments`

Never use the `arguments` object. Use rest parameters instead:

```js
// Bad — arguments is array-like, not a real Array
function sum() {
  return Array.prototype.slice.call(arguments).reduce((a, b) => a + b, 0);
}

// Good
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
```

## Closures

A closure is a function that captures variables from its enclosing scope. Every
function in JavaScript forms a closure.

### Factory Pattern

```js
function createCounter(initial = 0) {
  let count = initial;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}
```

### Loop Closure Pitfall

The classic `var`-in-loop bug is caused by function-scoped `var`. Use `let` or
`const` in loops to avoid it:

```js
// Bug — var is shared across all closures
for (var i = 0; i < 5; i++) {
  buttons[i].onclick = () => console.log(i); // always 5
}

// Fix — let creates block scope per iteration
for (let i = 0; i < 5; i++) {
  buttons[i].onclick = () => console.log(i); // 0, 1, 2, 3, 4
}
```

### Memory Consideration

Closures retain references to outer variables, not copies. Be cautious with
large objects captured unintentionally — they won't be garbage collected until
the closure is released.

## Pure Functions

Prefer pure functions (same input = same output, no side effects):

```js
// Impure — mutates input
const addItem = (cart, item) => {
  cart.push(item);
  return cart;
};

// Pure — returns new array
const addItem = (cart, item) => [...cart, item];
```

Side effects (DOM manipulation, network calls, logging) should be isolated
and explicit, not hidden inside data transformation functions.

## Function Size and Composition

Functions should do one thing. If a function name contains "and", it should
probably be two functions.

```js
// Bad — does two things
function validateAndSave(user) { ... }

// Good — separate concerns
function validate(user) { ... }
function save(user) { ... }
```

Keep functions short. If a function exceeds ~30 lines, consider extracting
helpers. Use composition over complex branching:

```js
const process = pipe(normalize, validate, transform, persist);
```

## Early Return

Return early to reduce nesting and keep the happy path flat:

```js
// Bad — deep nesting
function getUser(id) {
  if (id) {
    const user = db.find(id);
    if (user) {
      if (user.active) {
        return user;
      }
    }
  }
  return null;
}

// Good — flat and readable
function getUser(id) {
  if (!id) return null;

  const user = db.find(id);
  if (!user) return null;
  if (!user.active) return null;

  return user;
}
```
