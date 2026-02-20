---
name: javascript
description: >-
  Core JavaScript language conventions, idioms, and modern practices. Invoke whenever task
  involves any interaction with JavaScript code — writing, reviewing, refactoring, debugging,
  or understanding .js/.jsx files and JavaScript projects.
---

# JavaScript

**Clarity is the highest JavaScript virtue. If your code requires a comment to explain
its control flow, rewrite it.**

JavaScript rewards explicit, readable code. Prefer boring patterns that are easy to
understand over clever tricks that save characters.

### References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Functions, closures, composition | `references/functions.md` | Arrow function examples, closure patterns, early return, parameter destructuring |
| Async patterns, error handling, concurrency | `references/async.md` | Promise.all/race/any examples, cancellation, custom error classes, for-await |
| Objects, arrays, iteration, Map/Set | `references/objects-and-arrays.md` | Iteration decision table, destructuring patterns, immutable updates, generators |
| ES modules, imports, barrel files | `references/modules.md` | Import ordering, barrel file rationale, directory import pitfalls, dynamic imports |
| JSDoc typing, full tag catalog | `references/jsdoc.md` | Full tag reference (@callback, @template, @enum), type assertions, class modifiers |
| General JS idioms and edge cases | `references/idioms.md` | Variable/naming examples, equality coercion table, modern syntax patterns |

## Variables and Declarations

- **`const` by default.** Use `let` only when reassignment is required. Never `var`.
- **`const` prevents reassignment, not mutation.** Objects and arrays declared with `const`
  can still be mutated.
- **Block scope only.** `let`/`const` are block-scoped; `var` is function-scoped and
  hoists — this causes bugs in loops and conditionals.
- **One declaration per line.** Never chain `const a = 1, b = 2`.
- **Group declarations.** `const` first, then `let`.

## Naming

| Entity | Style | Examples |
|--------|-------|----------|
| Variables, functions | camelCase | `userName`, `fetchData` |
| Classes, constructors | PascalCase | `UserService`, `HttpClient` |
| True compile-time constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| Private fields/methods | `#` prefix (class) | `#count`, `#validate()` |
| Booleans | `is`/`has`/`can`/`should` prefix | `isValid`, `hasAccess` |
| File names | kebab-case or camelCase | `user-service.js`, `userService.js` |

- **SCREAMING_SNAKE_CASE is for true constants only** — values known at compile time, never
  computed at runtime. A variable holding a function return value uses camelCase.
- **Descriptive names.** `userCount` not `n`. Short names (`i`, `x`) only in tiny scopes
  (loop indices, simple arrow callbacks).
- **Accepted abbreviations:** `url`, `id`, `err`, `ctx`, `req`, `res` — universally
  understood. Avoid all others.
- **No redundant context.** `car.make` not `car.carMake`.
- **Consistent vocabulary.** Use the same word for the same concept throughout a codebase —
  `getUser()` everywhere, not `getUserInfo()` / `getClientData()` / `getCustomerRecord()`.

## Equality and Safety

- **Always `===` and `!==`.** Never `==` except for `value == null` (checks both `null`
  and `undefined`).
- **`??` over `||`** for defaults — `||` treats `0`, `""`, `false` as falsy.
- **`?.` for optional access.** Don't overuse — missing data you expect should throw, not
  silently return `undefined`.
- **Know the falsy values:** `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`.
  Everything else is truthy, including `[]`, `{}`, and `"0"`.

## Modern Syntax

- **Template literals** for string interpolation: `` `Hello, ${name}` ``. Don't use
  template literals for strings without interpolation — use plain quotes.
- **Spread for copies:** `{ ...obj }` and `[...arr]`. Never `Object.assign`.
- **Rest parameters** to collect remaining: `const { id, ...rest } = user`.
- **Shorthand properties:** `{ name, age }` not `{ name: name, age: age }`. Group
  shorthand properties at the top of object literals.
- **Computed property names:** `{ [key]: value, [`${key}Date`]: new Date() }`.
- **Logical assignment operators:** `opts.timeout ??= 5000` (assign if nullish),
  `opts.name ||= "default"` (assign if falsy), `opts.handler &&= wrap(opts.handler)`
  (assign if truthy).

## Functions

- **Arrow functions** for callbacks and anonymous functions. Use function declarations only
  when hoisting or `this` binding is needed.
- **Prefer parentheses** around arrow function parameters even for single params — smaller
  diffs when adding/removing parameters.
- **Implicit return** for single expressions (no braces). Explicit return (braces) for
  multi-statement bodies.
- **Arrow functions capture lexical `this`** — they do NOT have their own `this`. Never
  use arrow functions as object methods or on prototypes.
- **Destructured options** for 3+ parameters. Self-documenting and order-independent.
- **Default parameters** over `||` or manual checks. Defaults are evaluated left-to-right
  and can reference earlier params.
- **Rest parameters** over `arguments` object. `arguments` is array-like, not a real Array.
- **Early return.** Guard clauses first, happy path flat. Reduce nesting.
- **One function, one job.** If the name contains "and", split it.
- **Keep functions under ~30 lines.** Extract helpers. Use composition over complex
  branching.
- **Prefer pure functions** (same input = same output, no side effects). Isolate side
  effects (DOM, network, logging) — don't hide them inside data transformations.
- **Closures retain references to outer variables, not copies.** Be cautious with large
  objects captured unintentionally — they won't be garbage collected until the closure
  is released.

## Async

- **`async`/`await` over `.then()` chains** for sequential operations.
- **Always `await` promises.** Missing `await` = floating promise = silent failures.
- **`return await` only inside `try` blocks** where you need to catch the awaited error.
  Otherwise just `return promise` — no need for `async` wrapper.
- **`Promise.all`** for independent parallel work. Rejects on first rejection.
- **`Promise.allSettled`** when all results matter regardless of individual failures.
- **`Promise.race`** for timeouts. **`Promise.any`** for fallbacks (rejects only when
  ALL reject).
- **Avoid sequential awaits in loops.** Use `Promise.all(items.map(...))` for parallel.
  Use a concurrency limiter (e.g. `p-map`) for large arrays.
- **Throw `Error` objects**, never strings or plain objects — strings lose stack traces.
- **Custom error classes** when callers need to distinguish errors: extend `Error`, set
  `this.name`, add context properties.
- **Never swallow errors.** Every `catch` must handle, rethrow, or report. Empty `catch`
  blocks hide bugs. `console.log(err)` alone is not handling.
- **Let errors propagate** to a top-level handler when possible. Don't wrap every `await`
  in `try`/`catch` — only where you need to handle at that level.
- **Attach `.catch()` to non-awaited promise chains.** Unhandled rejections crash Node.js.
  Fire-and-forget: `fetchData().catch(reportError)`.
- **Only use `new Promise()`** to wrap callback-based APIs. Most async code should compose
  existing promises with `async`/`await`.
- **`AbortController`** for cancellable async operations: pass `{ signal }` to `fetch`
  and other APIs.
- **`for await...of`** for async iterables (streams, async generators).

## Modules

- **ES modules only.** `import`/`export` for all new code. CommonJS (`require`) is
  legacy — use only when runtime requires it.
- **Named exports** over default exports. Default exports cause inconsistent naming across
  importers. Exception: default exports acceptable when required by framework convention
  (Next.js pages, Remix routes).
- **Don't export mutable `let` bindings.** Export accessor functions instead:
  `export function getCount()` not `export let count`.
- **Imports at the top**, grouped with blank lines: built-in (`node:fs`), external
  (`express`), internal (`./utils`).
- **Always include file extensions** in import paths — `"./user.js"`, not `"./user"`.
  Extensionless imports vary across runtimes.
- **No directory imports.** Import from the file directly, not from a folder that resolves
  to `index.js`.
- **No barrel files in subdirectories.** `index.js` re-exports create indirection and hurt
  tree-shaking. Acceptable only as a standalone package entry point where the runtime can
  enforce the boundary via `package.json` `exports`.
- **No circular dependencies.** Extract shared code to a third module, merge tightly coupled
  modules, or use dependency injection.
- **No wildcard re-exports.** Explicit re-exports only — wildcards bypass tree-shaking.
- **Merge imports from the same module** into a single statement.
- **Namespace imports** (`import * as dateFns`) for large modules (5+ items). Prefer named
  imports when importing fewer than ~5 items.
- **Dynamic imports** (`import()`) for code splitting and lazy loading: routes loaded on
  navigation, large conditional dependencies, feature flags.
- **One concern per module.** If a module exports unrelated functionality, split it.
- **Side-effect imports** (`import "./polyfill.js"`) should be rare. Document why.

## Objects and Arrays

- **Literal syntax.** `{}` and `[]`, never `new Object()` / `new Array()`.
- **Use method shorthand** on objects: `greet() { }` not `greet: function() { }`.
- **Spread for copies.** `{ ...obj }` and `[...arr]`. Prefer over `Object.assign`.
- **Destructure** to extract properties. Prefer parameter destructuring.
- **Dot notation** for static properties, brackets for dynamic: `user.name` vs
  `user[dynamicKey]`.
- **`Object.hasOwn(obj, key)`** instead of `obj.hasOwnProperty(key)`.
- **Functional array methods** (`map`, `filter`, `find`, `some`, `every`, `flatMap`,
  `reduce`) over imperative loops for data transformation.
- **Always return** in `map`, `filter`, `reduce` callbacks.
- **`Array.from(arrayLike)`** for array-like objects (not spread).
  `Array.from(iterable, mapFn)` instead of `[...iterable].map(mapFn)` — avoids
  intermediate array.
- **Don't mutate inputs.** Return new objects/arrays. Immutable update patterns:
  add `[...arr, item]`, remove `arr.filter(...)`, update `arr.map(...)`.
- **`for...of`** for side-effect loops. Never `for...in` on arrays.
- **Return objects for multiple values**, not arrays — callers don't depend on order.
- **Never extend built-in prototypes** (`Array.prototype`, `Object.prototype`). Use
  utility functions or subclasses.

Prefer `for...of` for side-effect loops, `Array.prototype` methods (`.map`, `.filter`,
`.reduce`, `.find`, `.some`, `.every`) for data transforms, `for` for index-needed loops.
See `references/objects-and-arrays.md` for the full iteration decision table.

Use `Map` when keys aren't strings or are user-provided (avoids prototype pollution).
Use `Set` for dedup (`[...new Set(items)]`). Use generators (`function*`) for lazy
sequences and deferred computation.

## Classes

- **ES `class` syntax** only. No function constructors or prototype manipulation.
- **`#private` fields** for encapsulation. Not `_` convention.
- **Composition over inheritance.** Use `extends` only for true "is-a" relationships.
- **No empty constructors.** If the constructor only calls `super()`, omit it.
- **Static methods** for operations that don't need instance state.
- **Methods can return `this`** for fluent/chainable APIs.
- **Don't force classes** when plain functions and objects suffice. A class with one method
  is a function in disguise.

## JSDoc Typing

For pure JavaScript projects that don't use TypeScript, use JSDoc annotations to provide
type safety through editor tooling. Enable `// @ts-check` at file top or `checkJs` in
`jsconfig.json`.

Core tags: `@type`, `@param`, `@returns`, `@typedef` (with `@property`), `@template`.
See `references/jsdoc.md` for the full tag catalog including `@callback`, `@enum`,
class modifiers, and type import syntax.

### JSDoc Best Practices

- **Annotate public API boundaries** — exported functions, classes, module-level variables.
  Internal code often needs fewer annotations; types flow from context.
- **Prefer inline TypeScript syntax** in JSDoc types: `{string | number}` over
  `{(string|number)}`.
- **Use `@typedef` for shared shapes** — define once near file top or in `types.js`.
- **Don't annotate the obvious** — if `const x = 5` is clearly a number, skip `@type`.

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
  "`let` -> `const` — `config` is never reassigned."
```

## Code Navigation — LSP Required

This plugin provides a `typescript-language-server` LSP server that covers both JavaScript and
TypeScript files. When working with JS/TS code, **always use LSP tools for code navigation
instead of Grep or Glob**. LSP understands module resolution, type inference, scope rules, and
project boundaries — text search does not.

### Tool Routing

| Task | Tool | Operation | Why |
|------|------|-----------|-----|
| Find where a function/class/variable is defined | LSP | `goToDefinition` | Resolves imports, re-exports, aliases |
| Find all usages of a symbol | LSP | `findReferences` | Scope-aware, no false positives |
| Get type signature, docs, or return types | LSP | `hover` | Instant type info without reading source |
| List all exports/symbols in a file | LSP | `documentSymbol` | Structured output |
| Find a symbol by name across the project | LSP | `workspaceSymbol` | Searches all modules |
| Find implementations of an interface | LSP | `goToImplementation` | Knows the type system |
| Find what calls a function | LSP | `incomingCalls` | Precise call graph |
| Find what a function calls | LSP | `outgoingCalls` | Structured dependency map |

**Still use Grep/Glob for:** text in comments, string literals, log messages, TODO markers,
config values, env vars, CSS classes, file name patterns, URLs, error message text.

When spawning subagents for JS/TS codebase exploration, instruct them to use LSP tools
for navigation. Subagents have access to the same LSP server.

## Integration

The **coding** skill governs workflow; this skill governs JavaScript implementation
choices. For TypeScript projects, the **typescript** skill extends this one.
