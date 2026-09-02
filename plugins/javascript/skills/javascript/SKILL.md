---
name: javascript
description: >-
  Write and review JavaScript: declarations, equality and coercion, functions, objects, iteration, classes, async and
  promise semantics, ES modules, regular expressions, JSDoc typing, and the ECMAScript features a project's engine
  baseline permits.
when_to_use: >-
  Invoke whenever JavaScript is touched at all — writing, reviewing, refactoring, debugging, or exploring a `.js`,
  `.mjs`, `.cjs`, or `.jsx` file, or raising a project's engine baseline. Also invoke on the symptoms: a comparison
  succeeds that should not, a promise rejects with nobody listening, `sort` returns the wrong order, an import reads
  `undefined` at module top level, a regex matches once and then fails, a class field is `undefined` inside a
  constructor, or a feature that runs in Node fails in a browser. Covers the language and its built-in globals; types
  belong to the typescript skill, runtime APIs to nodejs and bun, test authoring to vitest, and language-agnostic
  workflow to the coding skill.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**JavaScript fails by continuing.** A mismatched type is coerced, a missing property is `undefined`, a rejected promise
nobody watched is a warning. None of it reports itself, so the discipline is to make a failure loud at the earliest
point it can be seen. Three biases decide most calls:

- **Prefer the construct that refuses over the one that converts** — `===` over `==`, `??` over `||`, `Number(s)` over
  `parseInt(s)`, a thrown error over a silent `undefined`.
- **The declared engine baseline decides what may be written**, not the ECMAScript edition a feature belongs to.
- **Reach for the built-in globals first.** A dependency earns its place by doing what `Intl`, `URL`, `structuredClone`,
  `AbortController`, and the iterator helpers do not.

## Language Edition

Read the project's engine baseline before writing code: `engines` in `package.json`, `browserslist`, `target` and `lib`
in `tsconfig.json` or `jsconfig.json`, `.nvmrc`, and the CI matrix. Where a transpiler stands between source and
runtime, its target governs the output and the source may run ahead; where none does, the engine baseline's oldest
engine governs the source.

**An edition number is not an availability claim.** Engines ship features years before ratification and lag on others,
and the gap runs both ways inside a single edition: `Array.fromAsync` and `Math.sumPrecise` are both ES2026, yet the
first shipped in Chrome 121 and reached Baseline widely available on 2026-07-25, while the second reached Baseline newly
available on 2026-04-10 and is absent from Node.js 26. Check the feature, never the edition.

Floor edition per feature this skill's rules reference. Anything from ES2019 or earlier is available in every engine a
project can realistically target.

- **ES2020** — `?.`, `??`, `globalThis`, `BigInt`, `Promise.allSettled`, `String.prototype.matchAll`, dynamic
  `import()`, `import.meta`, specified `for...in` order
- **ES2021** — `??=`, `||=`, `&&=`, `String.prototype.replaceAll`, `Promise.any`, `AggregateError`, numeric separators
- **ES2022** — class fields, `#private` fields and methods, `#x in obj`, `static {}` blocks, top-level `await`,
  `Object.hasOwn`, `.at()`, `Error` `cause`, RegExp `d` flag
- **ES2023** — `toSorted`, `toReversed`, `toSpliced`, `with`, `findLast`, `findLastIndex`
- **ES2024** — `Object.groupBy`, `Map.groupBy`, `Promise.withResolvers`, RegExp `v` flag,
  `String.prototype.isWellFormed`
- **ES2025** — iterator helpers, `Set` methods (`union`, `intersection`, `difference`, …), `Promise.try`,
  `RegExp.escape`, RegExp modifiers `(?i:)`, duplicate named capture groups, import attributes, JSON modules
- **ES2026** — `Map.prototype.getOrInsert` and `getOrInsertComputed`, `Iterator.concat`, `Array.fromAsync`,
  `Error.isError`, `Math.sumPrecise`, `Uint8Array` base64 and hex, `JSON.rawJSON`
- **Stage 4, unratified** — `using` and `await using` with `Symbol.dispose` and `DisposableStack`; `Temporal`;
  `Iterator.zip`. No Safari 26.x release implements any of them, so none is safe for an engine baseline that includes
  Safari 26. `using` requires Chrome 134, Firefox 141, or Node.js 24; `Temporal` requires Chrome 144, Firefox 139, or
  Node.js 26. `Atomics.pause` is the exception, reaching Chrome 133, Firefox 137, and Safari 18.4.
- **Not shippable** — decorators are Stage 2.7 and no engine implements them. A project using them runs TypeScript or
  Babel, and TypeScript's `experimentalDecorators` is the older, incompatible design.

Read [`${CLAUDE_SKILL_DIR}/references/versions/es20NN.md`] — one file per ratified edition, `es2020.md` through
`es2026.md`, plus [`${CLAUDE_SKILL_DIR}/references/versions/stage4-queue.md`] for the unratified set — when writing
against a feature near the engine baseline, and whenever raising it. Each carries what its edition added, what behavior
it changed, and the traps it introduced.

## Naming

- **One word per concept across the codebase.** `getUser` everywhere, never `getUser` beside `fetchUserInfo` and
  `loadCustomerRecord`.
- **`url`, `id`, `err`, `ctx`, `req`, `res`, `db`, `fn` are the accepted abbreviations.** Spell out everything else in
  code. A signature written to describe an API rather than to run — `Object.groupBy(items, cb)` — takes the placeholder
  name the documentation uses.
- **No redundant context**: `car.make`, never `car.carMake`.
- **File names are kebab-case**: `user-service.js`. Match the surrounding directory when it already differs.
- **A single-letter name is legal in a scope of one or two lines** — a loop index, a comparator parameter — and nowhere
  else.

## Declarations and Scope

- **Never `var`.** It is function-scoped and hoists to `undefined`, which is why it survives only in code that predates
  block scoping.
- **`const` freezes the binding, not the value.** A `const` object is still mutable.
- **One declaration per statement.** `const a = 1, b = 2` breaks under a debugger and under `git blame`.
- **Declare at first use, not at the top of the function.** The distance between declaration and use is the variable's
  real scope.
- **A `let` that is assigned exactly once in every branch wants a ternary or a helper function returning `const`.**

## Equality and Coercion

- **`===` and `!==` always, with one exception:** `value == null` tests `null` and `undefined` together, and the strict
  alternative is longer without being clearer.
- **`??` for defaults, `||` only when `0`, `""`, and `false` genuinely mean "absent".** Every configuration default is
  `??`.
- **`?.` where the absence is expected, never to silence a bug.** Data that must be present throws at the access rather
  than surfacing as `undefined` three frames later. `obj?.method()` still throws when `method` is missing; write
  `obj?.method?.()` when both are optional.
- **`??` cannot be mixed with `||` or `&&` without parentheses** — it is a `SyntaxError`.
- **The falsy set is `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`.** `[]`, `{}`, and `"0"` are truthy.
- **`Number.isNaN`, never the global `isNaN`**, which coerces first: `isNaN("abc")` is `true`.
- **`Number(s)` over `parseInt(s)` for a whole-string conversion.** `parseInt` stops at the first invalid character, so
  `parseInt("1e3")` is `1`. Never pass `parseInt` as a bare callback — `map` supplies the index as the radix, and
  `["1","7","11"].map(parseInt)` is `[1, NaN, 3]`.
- **Never compute money in a double.** `(1.005).toFixed(2)` is `"1.00"`. Hold integer minor units, and format with
  `Intl.NumberFormat`.
- **`Object.is` only for `NaN` and `-0`.** Everywhere else it is `===` with extra ceremony.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/coercion.md`] when a comparison behaves inconsistently between two
built-ins, when a number loses precision, or when a copy shares state it should not — it carries the four equality
algorithms and which built-in uses each, the `-0` sources, BigInt mixing rules, property-order rules, and the
prototype-pollution boundary.

## Functions

- **Arrow functions for callbacks, `function` declarations for named module-level functions.** A `function` declaration
  hoists, which lets helpers sit below the code that reads them.
- **Never an arrow function as an object method or on a prototype.** It has no `this` of its own.
- **Guard clauses first, happy path unindented.** A function whose body is one `if` wrapping everything wants an early
  return.
- **Destructure the parameter object at three or more parameters.** Positional arguments past two are unreadable at the
  call site and impossible to extend.
- **Default parameters over `||` inside the body.** They are evaluated left to right and may reference earlier
  parameters.
- **Rest parameters, never `arguments`** — `arguments` is array-like, absent in arrow functions, and defeats
  optimization.
- **Return an object when returning several values.** A tuple binds callers to positional order.
- **A closure keeps the whole scope alive, not the values it reads.** A callback that captures one field of a large
  object retains the object.

## Objects and Copying

- **Spread over `Object.assign` for a copy**, because it does not fire setters on the target. Both are shallow and both
  drop the prototype.
- **`structuredClone` for a deep copy of data.** It throws `DataCloneError` on functions and symbols, and discards the
  prototype, so a class instance clones to a plain object.
- **`Object.hasOwn(obj, key)`, never `obj.hasOwnProperty(key)`** — the latter breaks on a null-prototype object.
- **Dot notation for a known key, brackets only for a computed one.**
- **`Object.freeze` is shallow.** Freezing a tree means freezing every level, or not claiming immutability.
- **Never mutate a parameter.** Return a new value; the caller decides whether to keep the old one.
- **Never extend a built-in prototype.** It is visible to every dependency in the process.

## Arrays and Iteration

- **`for...of` for side effects, array methods for transformation, `for` only when the index is used.** `forEach` cannot
  `break` and does not await; reach for it only when the callback is already a named function.
- **Never `for...in` on an array**, and rarely on an object — it walks inherited enumerable keys.
- **Always pass a comparator to `sort` for numbers.** The default is lexicographic: `[1, 5, 10, 2].sort()` is
  `[1, 10, 2, 5]`. The comparator must return a number; `(a, b) => a > b` returns booleans, which makes the order
  implementation-defined and the bug engine-dependent.
- **`sort` and `reverse` mutate.** Prefer `toSorted` and `toReversed` where the engine baseline allows.
- **Never `delete` an array element.** It leaves a hole and does not change `length`. Use `splice` or `filter`.
- **Build a dense array with `Array.from({ length: n })` or `[...Array(n)]`.** `Array(n).map(f)` calls `f` zero times,
  because array methods skip holes while spread and `for...of` treat them as `undefined`.
- **`Map` when keys are not strings, come from outside the program, or must keep insertion order.** Object keys are
  stringified, and integer-like keys reorder themselves ahead of the rest.
- **`Set` for membership and deduplication** — `[...new Set(items)]`.
- **Iterator helpers for a stream that is infinite, expensive, or larger than memory.** They are lazy and single-pass:
  draining a helper drains its source.
- **Sort user-visible text with `Intl.Collator`.** `<` compares UTF-16 code units, so `"ä"` sorts after `"z"`.
- **Count characters with `Intl.Segmenter`, not `.length`.** `.length` counts code units and `[...str]` counts code
  points; neither is a user-perceived character.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/iteration.md`] when a loop produces the wrong count, when an array
method skips elements, or when a generator's cleanup does not run — it carries the full hole-behavior split, the
iterator-closing rules, and the `Map`/`Set` mutation-during-iteration semantics.

## Classes

- **Reach for a class when a type has invariants, several methods over shared state, or a lifecycle.** A class with one
  method and no state is a function.
- **`#private` fields, never a leading underscore.** `#x in obj` is the only reliable same-class test; `instanceof` is
  forgeable and fails across realms.
- **Never call an overridable method from a constructor.** The base constructor completes before any derived field
  initializer runs, so the method sees `undefined`.
- **A method belongs on the prototype; an arrow-function field is an own property per instance.** Use the field form
  only where the function is detached from its receiver.
- **Composition over `extends`.** Inherit only for a real "is-a" with a shared contract.
- **Omit a constructor that only calls `super(...args)`.**
- **Never rely on a built-in method to return your subclass.** Array methods honor `Symbol.species` and the `Set`
  methods do not; `structuredClone` discards the prototype either way.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/classes.md`] when a field reads `undefined`, when `instanceof` gives
the wrong answer, or when designing a class hierarchy — it carries the full initialization order, the private-field
semantics, and the prototype-pollution rules.

## Async

- **Every promise is awaited or has a handler.** `send().catch(reportError)` for fire-and-forget, which is the one place
  a `.then` belongs. A floating promise is a failure nobody will see.
- **`.map(async …)` needs a `Promise.all` around it, and `forEach(async …)` is always wrong** — `forEach` discards the
  returned promise and finishes before any callback body does.
- **Start independent work together, await together**: `const [a, b] = await Promise.all([f(), g()])`. Two sequential
  awaits with no dependency between them double the latency.
- **Bound a large fan-out.** `Promise.all` over ten thousand items opens ten thousand operations.
- **Pick the combinator by failure mode** — `all` when every result is required, `allSettled` when every outcome must be
  observed, `any` for the first success, `race` only with an `AbortController`, because the losers keep running.
- **`return await` inside a `try`, plain `return` outside it.** `return promise` inside a `try` returns before the
  promise settles, so the `catch` never fires.
- **Never `return`, `break`, or `continue` out of a `finally`** — it discards a pending throw.
- **`AbortController` is the cancellation protocol.** Thread `{ signal }` through; use `AbortSignal.timeout(ms)` for a
  deadline and `AbortSignal.any([...])` to combine. Distinguish an abort from a real failure before retrying.
- **`new Promise(...)` only to wrap a callback API.** Where a resolver must escape, `Promise.withResolvers()` returns
  `{ promise, resolve, reject }`.
- **Sequential `await` in a loop is correct when each step depends on the last** and a defect otherwise.
- **`using` and `await using` release a resource on every exit path** where the engine baseline allows them;
  `try`/`finally` with one nested block per resource is the equivalent elsewhere.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/async.md`] when ordering between promises and timers matters, when a
rejection surfaces in the wrong place, or when cancellation has to propagate — it carries microtask ordering, the tick
cost of `await`, the floating-promise catalog, and the abort-reason semantics.

## Modules

- **An import is a live read-only binding, not a copy.** The importer sees a reassignment by the exporter and cannot
  write to the binding itself. Code ported from `require` often depends on the copy without knowing it.
- **Never export a mutable `let`.** Export a function that returns the value.
- **Named exports over default.** A default export takes a different name in every importer, so a typo becomes
  `undefined` rather than an error. Accept one only where a framework requires it.
- **Include the file extension in every relative specifier** — `"./user.js"`. Extensionless and directory imports are
  bundler conventions, not module semantics.
- **Imports at the top, grouped by origin** — built-in, external, internal — even though the language hoists them
  regardless of position.
- **No wildcard re-exports and no barrel files inside a package.** Both hide the export set and defeat tree shaking. A
  package's single public entry point declared through `exports` is the exception.
- **Break a cycle rather than deferring the read.** A cyclic binding read at module top level throws `ReferenceError`;
  reading it inside a function hides the cycle instead of removing it.
- **Import attributes are required, not advisory**: `import data from "./d.json" with { type: "json" }`.
- **`import()` for genuinely conditional loading** — a route, a heavy optional dependency, a flagged feature. Keep the
  specifier a literal so tooling can find it.
- **A side-effect import needs a comment saying why.**

Read [`${CLAUDE_SKILL_DIR}/references/conventions/modules.md`] when a binding is `undefined` at module top level, when a
module appears to run twice, or when converting between CommonJS and ESM — it carries live-binding semantics, the
namespace object, evaluation order, and cycle resolution.

## Errors

- **Handle an error once: recover from it, or let it propagate.** A `catch` that logs and rethrows reports one failure
  at every frame.
- **Add context the underlying error does not carry, with `cause`**: `new Error("load config", { cause: err })`. Never
  concatenate the inner message into the outer one.
- **Subclass `Error` and set `this.name` when a caller must branch on the failure.** Match on the class, never on the
  message text.
- **`Error.isError(v)` over `v instanceof Error`** where the engine baseline allows: `instanceof` is `false` across
  realms and `true` for a forged prototype.
- **An empty `catch` and a `catch` that only logs are the same defect.**
- **Let a programmer error crash.** A `TypeError` from a bug is not something to recover from at the call site.

## Regular Expressions

- **Never share a `g` or `y` regex across calls.** `lastIndex` persists, so the same test alternates true and false.
  Build it inside the function, or drop `g` when a boolean is all you need.
- **Named capture groups over positional.** `m.groups.year` survives inserting a group; `$1` does not.
- **`matchAll` requires `g` and throws `TypeError` without it.** `replaceAll` throws on a regex without `g`.
- **Use the `v` flag for anything matching user text.** It is a stricter superset of `u`: it adds set operations and
  properties of strings, and it requires escaping characters `u` allows raw, so the switch is not mechanical.
- **`RegExp.escape` before interpolating data into a pattern.** An unescaped `(` from user input is a `SyntaxError` and
  an unescaped `(a+)+` is a denial of service.
- **Nested unbounded quantifiers over overlapping sets are a security bug**, not a performance one. A pattern applied to
  external input needs bounded quantifiers or a parser.
- **A regex cannot parse a nested structure.** Reach for `URL`, `Intl.Segmenter`, or a real parser.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/regexp.md`] when a pattern matches inconsistently across calls or when
migrating a pattern from `u` to `v` — it carries the statefulness rules, the `v` differences, and the backtracking
shapes.

## Intl and Built-in Globals

- **Never compare an `Intl` result to a literal and never parse one back.** Output is permitted to differ between
  engines and CLDR releases, and it contains non-breaking and narrow-no-break spaces that are invisible in a diff.
  Assert with `formatToParts`, or snapshot.
- **Pin the locale in a test.** An unqualified formatter follows the host default.
- **Hoist a formatter out of a loop.** Construction searches the locale database; `format` does not.
- **`Intl.ListFormat` for joining a list, `Intl.PluralRules` for plural selection, `Intl.Collator` for sorting.**
  `arr.join(", ")` and `n === 1 ? "x" : "xs"` are English-only and wrong even there.
- **`URL` and `URLSearchParams` for anything URL-shaped.** String concatenation gets encoding wrong.
- **`crypto.randomUUID` and `crypto.getRandomValues` where a value must be unpredictable.** `Math.random` is never
  suitable for a token or an identifier.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/intl.md`] when formatting anything a user reads, or when a formatted
string has to be tested — it carries the per-object routing, the reuse rules, and the built-in globals worth reaching
for.

## JSDoc and Documentation

- **JSDoc types are checked only with `// @ts-check` or `checkJs`.** Without one, the annotations are decoration.
- **Annotate the module boundary and what inference cannot reach** — exported symbols, an empty literal filled later, a
  value parsed from JSON. Never restate a type the checker already infers.
- **`{ b?: number }` for an optional property**, not `{ b: number= }`, which is only valid on a `@param`.
- **Write `{number | null}`, not `{?number}`.** Closure nullability syntax is legacy; `Object` and `object` degrade to
  `any`.
- **A doc comment on an exported symbol is API documentation** and is expected even where code comments are not.
  Describe the contract, never the implementation, and update it in the edit that changes the signature.

Read [`${CLAUDE_SKILL_DIR}/references/conventions/jsdoc.md`] when typing a plain-JavaScript project or when a JSDoc type
is silently ignored — it carries the supported tag set, `@import` and `@satisfies`, and the syntax that does not work.

## Style Guides

The two style guides most often cited for JavaScript are frozen. Citing either as authority produces outdated advice.

- **The Google JavaScript Style Guide opens with "This guide is no longer being updated. Google recommends migrating to
  TypeScript."** It targets ES6, mentions `goog.module` sixty-two times, requires all fields to be declared in the
  constructor, and contains no occurrence of `#private`, optional chaining, or nullish coalescing.
- **`eslint-config-airbnb` last released 19.0.4 in December 2021**, and the last substantive change to the shared config
  was July 2022. Its rules predate class fields being universally available, iterator helpers, `Set` methods, `.at()`,
  `structuredClone`, and `Object.groupBy`.

Follow the rules in this skill and the project's own lint configuration. When a project's ESLint config extends one of
these, follow the project and say once that the base config is frozen.

## Code Navigation

`typescript-language-server` is configured for `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, and `.cts`. Use LSP
tools rather than Grep or Glob for anything that is a JavaScript identifier — they resolve module specifiers,
re-exports, aliases, and inferred types, which text search cannot.

- **Where a symbol is defined** — `goToDefinition`
- **Every use of a symbol** — `findReferences`
- **Type, signature, or doc of a symbol** — `hover`
- **Symbols in one file** — `documentSymbol`; **across the project** — `workspaceSymbol`
- **Types implementing an interface** — `goToImplementation`
- **Call graph in either direction** — `incomingCalls`, `outgoingCalls`

Grep and Glob stay correct for comments, string literals, log messages, environment variable names, CSS class names,
config values, and file-name patterns. Subagents exploring JavaScript reach the same LSP server — instruct them to use
it.

## Application

When **writing** JavaScript, apply these conventions silently — do not narrate a rule while following it. Where existing
code contradicts one, follow the codebase and flag the divergence once.

When **reviewing** JavaScript, cite the violation and show the fix inline. Do not lecture.

```
Bad:  "Best practice is to use nullish coalescing rather than logical OR for default values."
Good: options.retries || 3 -> options.retries ?? 3 — 0 is a valid retry count
```

## Integration

The **coding** skill governs workflow — discovery, decomposition, verification. This skill governs JavaScript
implementation choices and wins on any question of how JavaScript reads. Both are active at once.

The **typescript** skill extends this one and does not restate it. The **nodejs** and **bun** skills own their runtimes,
and the split with this skill is the same in both directions: this skill owns module syntax and live-binding semantics,
they own resolution; this skill owns the cancellation protocol and the globals that behave the same everywhere, they own
which of their own APIs accept a signal and how their own `fetch` behaves. The **vitest** skill owns test authoring in
Vitest, and each runtime skill owns the test runner it ships. Browser platform and framework concerns belong to the
frontend plugin.

**When in doubt, make the failure loud.**
