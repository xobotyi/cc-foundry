# ES Modules

## What an import binds

An import is a **live, read-only binding to the exporting module's variable**, not a copy of its value. When the
exporter reassigns, every importer sees the new value at the next read.

```js
// counter.js
export let count = 0;
export function bump() {
	count += 1;
}

// main.js
import { count, bump } from "./counter.js";
bump();
count; // 1 — the binding updated
```

This is the opposite of a CommonJS `require`, which copies the value at the moment of the call, so the same code with
`require` reads `0`. Code ported from CommonJS often depends on that copy without knowing it.

The importer cannot write: assigning to an imported binding is a `TypeError`. Only the exporting module may change it.
That is why **exporting a mutable `let` is a design error** — the importer can read a value it cannot control and cannot
subscribe to. Export a getter function instead.

## The namespace object

`import * as ns from "./m.js"` gives an exotic object that is sealed and non-extensible, whose keys are the export names
sorted by code unit with `default` included, and whose `Symbol.toStringTag` is `"Module"`. Writing to a property throws
`TypeError`. `await import("./m.js")` returns the same object identity as the static namespace for the same module.

## Evaluation order

- **Imports are hoisted.** Every import in a file is resolved and its module evaluated before the first statement of the
  importing module runs, wherever the `import` line sits in the file. Side effects of a dependency therefore happen
  before your own top-level code.
- **A module evaluates once per resolved specifier**, however many modules import it. Two specifiers that resolve to
  different URLs are two module instances with separate state — the cause of a "singleton created twice" bug.
- **A module is always strict mode**, and its top-level `this` is `undefined` rather than the global object.

## Cycles

A cycle does not fail by itself. The binding is resolved at the point of **use**, so:

- Reading a cyclic import **inside a function called later** works, because the binding is initialized by then.
- Reading it **at module top level** throws `ReferenceError: Cannot access 'x' before initialization`, because the
  exporting module has not been evaluated yet.

```js
// config.js (entry)
import { banner } from "./banner.js";
export const title = "app";

// banner.js
import { title } from "./config.js";
console.log(title); // ReferenceError — config.js has not evaluated its body yet
export const banner = "welcome";
```

Break a cycle by merging the two modules, extracting the shared part into a third, or moving the code that reaches
across. Deferring the read into a function hides the cycle rather than removing it.

## Specifiers

**Include the file extension in every relative specifier** — `"./user.js"`, never `"./user"`. Extensionless and
directory specifiers are a bundler and CommonJS convention rather than module semantics. Resolution past that point
belongs to the `nodejs` and `bun` skills.

## Import attributes

`import data from "./d.json" with { type: "json" }`, and dynamically
`await import("./d.json", { with: { type: "json" } })`.

The attribute is **required, not advisory**: a JSON module without it is rejected. A JSON module exposes only a default
export, and that export is a single parsed object shared by every importer — mutating it mutates it for all of them.

## Exports

- **Prefer named exports.** A default export gets a different local name in every importer, which breaks grep, breaks
  automated rename, and hides a typo as `undefined`. Accept a default export only where a framework's convention
  requires one.
- **Never re-export with a wildcard.** `export * from "./x.js"` makes the export set invisible at the call site and
  defeats tree shaking. Name what you re-export.
- **Avoid barrel files inside a package.** An `index.js` that re-exports a directory forces the bundler to load every
  module in it to find one, adds a resolution hop, and creates cycles between siblings. A package's single public entry
  point declared through `exports` in `package.json` is the exception, because the boundary is enforced there.
- **A side-effect import (`import "./polyfill.js"`) needs a comment saying why.** It is the one import whose removal an
  automated tool cannot judge.

## Dynamic import

`import()` returns a promise for the namespace object. Reach for it when the module is genuinely conditional — a route
loaded on navigation, a heavy optional dependency, a feature behind a flag. A dynamic import whose specifier is a
runtime-built string cannot be statically analyzed, so no bundler can find it; keep the specifier a literal with at most
a template segment the tooling documents as supported.
