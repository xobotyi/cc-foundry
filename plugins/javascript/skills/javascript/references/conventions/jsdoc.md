# JSDoc Typing for Plain JavaScript

JSDoc types are checked by the TypeScript compiler, so the type language is TypeScript's, not JSDoc's. Enable checking
with `// @ts-check` at the top of a file, or `"checkJs": true` in `jsconfig.json` for the whole project. Without one of
those the annotations are decoration.

## Tags that carry weight

- **`@type {T}`** — annotate a declaration whose type is not inferable. Do not annotate `const count = 5`.
- **`@param {T} name`** and **`@returns {T}`** — a parameter is optional as `@param {T} [name]` and has a default as
  `@param {T} [name=value]`.
- **`@typedef {{ a: string, b?: number }} Name`** — a named object shape. The `@typedef` plus `@property` form is
  equivalent and more verbose; prefer the inline object type.
- **`@callback Name`** with `@param`/`@returns` — a function type worth naming.
- **`@template T`** — a type parameter. `@template {string} T` constrains it.
- **`@import { Pet } from "./types.js"`** — brings a type into scope for annotations without emitting a runtime import.
  This is what to reach for instead of `import("./types.js").Pet` inline.
- **`@satisfies {T}`** — checks a value against a type without widening the value's own inferred type. Use it for a
  config object whose literal keys must stay literal.
- **`@enum {T}`** — types every member of an object literal, unlike a TypeScript `enum`, which has no JSDoc equivalent.
- **`@this {T}`** — for a function whose receiver is not inferable.
- **`@readonly`, `@private`, `@protected`, `@public`, `@override`, `@extends`, `@implements`** — class modifiers,
  enforced by the checker.
- **`@deprecated`** — surfaces as a strikethrough in the editor.

## Syntax that does not work

- **`{ b: number= }` is not an optional property.** Write `{ b?: number }`. The postfix `=` only means optional on a
  `@param`.
- **`{?number}` and `{!number}` are legacy Closure syntax.** Write `{number | null}`. Nullability follows
  `strictNullChecks`; there is no explicit non-nullable form.
- **`Object` and `object` degrade to `any`** unless `noImplicitAny` is on. Write the actual shape, or
  `Record<string, unknown>`.
- **`@memberof`, `@member`, and `@yields` are ignored.** So is every other unrecognized tag — silently.

## What to annotate

- **Annotate the module boundary**: exported functions, exported classes, and exported constants. Inference carries the
  rest.
- **Annotate what inference cannot reach**: an empty array or object literal that gets filled later, a value parsed from
  JSON, a callback parameter with no contextual type.
- **Do not restate an inferred type.** An annotation that repeats what the checker already knows is a second place to
  update and a place for the two to disagree.

## Doc comments against code comments

A doc comment on an exported symbol is API documentation and is expected; the "explain nothing obvious" rule for code
comments does not apply to it. Describe the contract — what it does, what it throws, what it mutates — never the
implementation. Update it in the same edit that changes the signature or the behavior, or delete it.
