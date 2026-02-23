# JSDoc for JavaScript

Type annotations for pure JavaScript projects using JSDoc comments. These
annotations are understood by TypeScript's `checkJs` mode, VS Code IntelliSense,
and other tooling without requiring a TypeScript compilation step.

For TypeScript projects, use native TS syntax instead — this reference is for
`.js` files only.

## Core Tags

### `@type` — Annotate Variables

```js
/** @type {string} */
let name;

/** @type {number[]} */
const scores = [];

/** @type {Map<string, User>} */
const cache = new Map();

/** @type {string | null} */
let result = null;
```

Use full TypeScript type syntax inside JSDoc types — unions, generics, tuples,
and utility types all work.

### `@param` and `@returns` — Annotate Functions

```js
/**
 * Fetches a user by ID.
 * @param {string} id - The user's unique identifier.
 * @param {{ cache?: boolean }} [options] - Fetch options.
 * @returns {Promise<User>} The resolved user.
 */
async function getUser(id, options) { ... }
```

Optional parameters use square brackets: `@param {string} [name]` or
`@param {string} [name="default"]`.

Nested object properties use dot notation:

```js
/**
 * @param {Object} config
 * @param {string} config.host
 * @param {number} config.port
 * @param {boolean} [config.ssl=false]
 */
function connect(config) { ... }
```

### `@typedef` — Define Reusable Types

```js
/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {boolean} [active]
 */

/** @type {User} */
const user = { id: "1", name: "Alice", email: "a@b.com" };
```

Inline form for simpler types:

```js
/** @typedef {{ id: string, name: string }} UserSummary */
```

### `@callback` — Define Function Types

```js
/**
 * @callback Predicate
 * @param {string} value
 * @param {number} index
 * @returns {boolean}
 */

/** @type {Predicate} */
const isLong = (value) => value.length > 10;
```

## Generics with `@template`

```js
/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => boolean} predicate
 * @returns {T | undefined}
 */
function find(items, predicate) {
  for (const item of items) {
    if (predicate(item)) return item;
  }
}

/**
 * @template {string} K
 * @template V
 * @param {K} key
 * @param {V} value
 * @returns {Record<K, V>}
 */
function createEntry(key, value) {
  return /** @type {Record<K, V>} */ ({ [key]: value });
}
```

Constrained generics: `@template {string} K` means K must extend string.

## Type Assertions (Casts)

```js
const el = /** @type {HTMLInputElement} */ (document.getElementById("email"));
el.value = "test";

// const assertion
const config = /** @type {const} */ ({ retries: 3 });
```

Always wrap the expression in parentheses after the `@type` cast.

## Importing Types

Use `@import` to bring types from other files (TypeScript 5.5+):

```js
/** @import { User } from "./types.js" */

/** @type {User} */
const user = getUser();
```

Inline import (works in all TypeScript versions):

```js
/** @type {import("./types.js").User} */
const user = getUser();
```

## Classes

```js
class UserService {
  /** @type {Map<string, User>} */
  #cache = new Map();

  /**
   * @param {import("./db.js").Database} db
   */
  constructor(db) {
    /** @private */
    this.db = db;
  }

  /**
   * @param {string} id
   * @returns {Promise<User>}
   */
  async getUser(id) { ... }
}
```

### Property Modifiers

- `@private` — only accessible within the class
- `@protected` — accessible in class and subclasses
- `@readonly` — set only during initialization
- `@override` — marks method as overriding a base class method

### Extends with Generics

```js
/**
 * @template T
 * @extends {Set<T>}
 */
class UniqueList extends Set {
  /** @param {T[]} items */
  constructor(items) {
    super(items);
  }
}
```

## Enums

```js
/** @enum {number} */
const Status = {
  Active: 0,
  Inactive: 1,
  Suspended: 2,
};
```

JSDoc enums are object literals with typed values — simpler than TypeScript
enums but sufficient for many use cases.

## Documentation Tags

These work in both `.js` and `.ts` files:

```js
/** @deprecated Use newFunction() instead. */
function oldFunction() { ... }

/** @see UserService for the full implementation. */

/** Returns a {@link User} object. */
```

## Best Practices

- **Annotate public API boundaries** — exported functions, classes, and
  module-level variables. Internal/private code often needs fewer annotations
  because types flow from context.
- **Prefer inline TypeScript syntax** in JSDoc types: `{string | number}`
  over `{(string|number)}`.
- **Use `@typedef` for shared shapes** — define once near the top of the file
  or in a dedicated `types.js` file, then reference with `@type`.
- **Enable `// @ts-check`** at the top of files (or `checkJs` in
  `jsconfig.json`) to get type errors in your editor.
- **Don't annotate the obvious** — if `const x = 5` is clearly a number,
  skip the `@type`. Annotate when types are ambiguous or at API boundaries.
