---
name: javascript
description: >-
  Core JavaScript language conventions, idioms, and modern practices. Invoke when task
  involves any interaction with JavaScript code — writing, reviewing, refactoring, or
  debugging .js/.jsx files. For TypeScript projects, invoke the typescript skill alongside
  this one — it extends JavaScript with type system conventions.
---

# JavaScript

**Clarity is the highest JavaScript virtue. If your code requires a comment to explain
its control flow, rewrite it.**

JavaScript rewards explicit, readable code. Prefer boring patterns that are easy to
understand over clever tricks that save characters.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Variables, naming, equality, nullish coalescing, modern syntax | [idioms.md](references/idioms.md) |
| Arrow functions, closures, parameters, early return, composition | [functions.md](references/functions.md) |
| Promises, async/await, error handling, concurrency utilities | [async.md](references/async.md) |
| ES modules, imports/exports, file organization, barrel files | [modules.md](references/modules.md) |
| Objects, arrays, destructuring, classes, iteration, generators | [objects-and-arrays.md](references/objects-and-arrays.md) |
| JSDoc type annotations for pure JS projects | [jsdoc.md](references/jsdoc.md) |

Read the relevant reference before writing code in that area.

## Core Rules

These apply to ALL JavaScript code. No exceptions.

### Variables and Declarations

1. **`const` by default.** Use `let` only when reassignment is required. Never `var`.
2. **Block scope only.** `let`/`const` are block-scoped; `var` is function-scoped and
   hoists — this causes bugs.
3. **One declaration per line.** Never chain `const a = 1, b = 2`.
4. **Group declarations.** `const` first, then `let`.

### Naming

1. **camelCase** for variables and functions. **PascalCase** for classes.
2. **SCREAMING_SNAKE_CASE** for true compile-time constants only.
3. **Descriptive names.** `userCount` not `n`. Short names (`i`, `x`) only in tiny scopes.
4. **Boolean prefix.** `isValid`, `hasAccess`, `canEdit`.
5. **No redundant context.** `car.make` not `car.carMake`.

### Equality and Safety

1. **Always `===` and `!==`.** Never `==` except for `value == null`.
2. **`??` over `||`** for defaults — `||` treats `0`, `""`, `false` as falsy.
3. **`?.` for optional access.** Don't overuse — missing data you expect should throw.

### Functions

1. **Arrow functions** for callbacks and anonymous functions.
2. **Destructured options** for 3+ parameters.
3. **Default parameters** over `||` or manual checks.
4. **Rest parameters** over `arguments` object.
5. **Early return.** Guard clauses first, happy path flat.
6. **One function, one job.** If the name contains "and", split it.

### Async

1. **`async`/`await` over `.then()` chains** for sequential operations.
2. **Always `await` promises.** Missing `await` = floating promise = silent failures.
3. **`Promise.all`** for independent parallel work.
4. **Throw `Error` objects**, never strings or plain objects.
5. **Never swallow errors.** Every `catch` must handle, rethrow, or report.

### Modules

1. **Named exports** over default exports.
2. **Imports at the top**, grouped: built-in, external, internal.
3. **No circular dependencies.** Extract shared code to a third module.
4. **No wildcard re-exports.** Explicit re-exports only.

### Objects and Arrays

1. **Literal syntax.** `{}` and `[]`, never `new Object()` / `new Array()`.
2. **Spread for copies.** `{ ...obj }` and `[...arr]`, never `Object.assign`.
3. **Destructure** to extract properties. Prefer parameter destructuring.
4. **Functional array methods** (`map`, `filter`, `find`) over imperative loops.
5. **Don't mutate inputs.** Return new objects/arrays.
6. **`for...of`** for side-effect loops. Never `for...in` on arrays.

### Classes

1. **ES `class` syntax** only. No function constructors or prototype manipulation.
2. **`#private` fields** for encapsulation. Not `_` convention.
3. **Composition over inheritance.** Use `extends` only for true "is-a" relationships.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `var x = 1` | `const x = 1` or `let x = 1` |
| `x == null` (for strict check) | `x === null \|\| x === undefined` |
| `value \|\| "default"` (when 0/"" valid) | `value ?? "default"` |
| `function(a, b, c, d, e)` | `function({ a, b, c, d, e })` — options object |
| `arguments[0]` | `...args` — rest parameters |
| `arr.forEach(async (x) => await ...)` | `for (const x of arr) { await ... }` |
| `new Promise((r) => r(existing))` | Return the existing promise directly |
| `.then().then().catch()` for sequential | `async`/`await` with `try`/`catch` |
| `export default class Foo` | `export class Foo` — named export |
| `import * from "./barrel.js"` | `import { Foo, Bar } from "./barrel.js"` |
| `Object.assign({}, a, b)` | `{ ...a, ...b }` |
| `arr.push(item)` — mutating | `[...arr, item]` — new array |
| `for (const key in arr)` | `for (const item of arr)` |
| `obj.hasOwnProperty(k)` | `Object.hasOwn(obj, k)` |
| `throw "error"` | `throw new Error("error")` |
| `catch (err) {}` — empty | `catch (err) { reportError(err); throw err; }` |
| `this._private = x` | `this.#private = x` — real private field |
| `Array.prototype.foo = ...` | Utility function or subclass |

## JSDoc Typing

For pure JavaScript projects that don't use TypeScript, use JSDoc annotations
to provide type safety through editor tooling:

```js
/**
 * @param {string} id
 * @param {{ cache?: boolean }} [options]
 * @returns {Promise<User>}
 */
async function getUser(id, options) { ... }
```

Enable `// @ts-check` or `checkJs` in `jsconfig.json` for editor-level type
checking. See [jsdoc.md](references/jsdoc.md) for full syntax.

## Application

When **writing** JavaScript code:
- Apply all conventions silently — don't narrate each rule being followed.
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once.

When **reviewing** JavaScript code:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule — state what's wrong and how to fix it.

```
Bad review comment:
  "According to best practices, you should use const instead of let
   when the variable is never reassigned."

Good review comment:
  "`let` → `const` — `config` is never reassigned."
```

## Integration

This skill provides JavaScript-specific conventions alongside the **coding** skill:

1. **Coding** — Discovery, planning, verification discipline
2. **JavaScript** — Language-specific idioms and conventions
3. **Coding** — Final verification

The coding skill governs workflow; this skill governs JavaScript implementation choices.

For TypeScript projects, the **typescript** skill extends this one — both should be
active simultaneously. This skill covers the JavaScript foundation; the TypeScript
skill adds type system conventions on top.

**Clarity is the highest JavaScript virtue. When in doubt, write boring code.**
