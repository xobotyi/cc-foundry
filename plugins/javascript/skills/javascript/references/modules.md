# JavaScript Modules

ES module syntax, import/export patterns, and file organization.

## ES Modules Only

Use ES modules (`import`/`export`) for all new code. CommonJS (`require`/
`module.exports`) is legacy — use it only when the runtime or tooling requires it.

## Exports

### Named Exports by Default

Use named exports. They provide consistent naming across the codebase and enable
tree-shaking:

```js
// Good — named exports
export function createUser(data) { ... }
export const MAX_RETRIES = 3;
export class UserService { ... }

// Also good — export list at bottom
function createUser(data) { ... }
const MAX_RETRIES = 3;

export { createUser, MAX_RETRIES };
```

### Avoid Default Exports

Default exports cause inconsistent naming — each importing module can use any
name, making refactoring harder:

```js
// Bad — default export
export default class UserService { ... }

// Importers pick arbitrary names:
import UserService from "./user-service.js";
import Users from "./user-service.js";      // same thing, different name
import Svc from "./user-service.js";        // even worse

// Good — named export
export class UserService { ... }

// Importers always use the same name:
import { UserService } from "./user-service.js";
```

Exception: default exports are acceptable when required by a framework
convention (e.g., Next.js pages, Remix routes).

### Don't Export Mutables

Don't export `let` bindings that get mutated. Export accessor functions instead:

```js
// Bad — mutation visible across modules, confusing
export let count = 0;
export function increment() { count++; }

// Good — controlled access
let count = 0;
export function getCount() { return count; }
export function increment() { count++; }
```

## Imports

### Always Include File Extensions

Always include file extensions in import paths. Extensionless imports rely on
resolution algorithms that vary across runtimes and bundlers — explicit extensions
are unambiguous and work everywhere:

```js
// Bad — extensionless
import { db } from "./database";
import { validate } from "../utils/validation";

// Good — explicit extension
import { db } from "./database.js";
import { validate } from "../utils/validation.js";
```

This applies to all relative imports. External package imports (`"express"`,
`"zod"`) use the package name as-is.

### No Directory Imports

Don't import from a directory path. Directory imports resolve to `index.js`,
which creates implicit coupling to barrel files and hides the actual source:

```js
// Bad — directory import, resolves to ./services/index.js
import { UserService } from "./services";

// Good — import from the actual file
import { UserService } from "./services/user.js";
```

### Import at the Top

All imports must be at the top of the file, before any other code:

```js
// Good
import { readFile } from "node:fs/promises";
import { UserService } from "./services/user.js";

const config = loadConfig();
```

### Import Ordering

Group imports in this order, separated by blank lines:

1. **Built-in/Node modules** — `node:fs`, `node:path`
2. **External packages** — `express`, `zod`
3. **Internal/project imports** — `./utils`, `../services`

```js
import { readFile } from "node:fs/promises";

import express from "express";
import { z } from "zod";

import { db } from "./database.js";
import { validate } from "../utils/validation.js";
```

### Don't Import the Same File Multiple Times

Merge imports from the same module into a single statement:

```js
// Bad
import { createUser } from "./user.js";
import { deleteUser } from "./user.js";

// Good
import { createUser, deleteUser } from "./user.js";
```

### Namespace Imports for Large Modules

When importing many items from a module, use namespace imports to avoid long
destructuring:

```js
// Cluttered
import { parse, format, add, sub, isValid, isBefore } from "date-fns";

// Cleaner
import * as dateFns from "date-fns";
dateFns.parse(...);
```

Use this sparingly — named imports are preferred when you import fewer than
~5 items.

### Avoid Wildcard Re-exports

Don't re-export everything from a module — it bypasses tree-shaking and creates
opaque APIs:

```js
// Bad — barrel file re-exporting everything
export * from "./user.js";
export * from "./post.js";
export * from "./comment.js";

// Good — explicit re-exports
export { createUser, getUser } from "./user.js";
export { createPost } from "./post.js";
```

## Dynamic Imports

Use `import()` for code splitting and lazy loading:

```js
// Load on demand
const { heavy } = await import("./heavy-module.js");

// Conditional loading
if (needsPolyfill) {
  await import("./polyfill.js");
}
```

Dynamic imports return a promise that resolves to the module namespace. Use
them for:
- Routes/pages loaded on navigation
- Large dependencies used conditionally
- Feature flags

## Module Structure

### One Concern Per Module

Each module should have a clear, single purpose. If a module exports unrelated
functionality, split it.

### No Barrel Files in Subdirectories

Don't create `index.js` files that re-export from sibling modules just to
aggregate a directory's exports. Barrel files add indirection, hurt tree-shaking,
create circular dependency risks, and hide the real source of imports:

```js
// Bad — services/index.js barrel re-exporting siblings
export { UserService } from "./user.js";
export { PostService } from "./post.js";

// Bad — consuming code imports from the barrel
import { UserService } from "./services";          // directory import
import { UserService } from "./services/index.js"; // explicit but still a barrel

// Good — import directly from the source file
import { UserService } from "./services/user.js";
import { PostService } from "./services/post.js";
```

**Exception: standalone package entry points.** A top-level `index.js` that
defines a package's public API is acceptable — it's the package boundary, not
an internal convenience barrel:

```js
// my-lib/index.js — package entry point, this is fine
export { createClient } from "./client.js";
export { parseConfig } from "./config.js";
```

The distinction: a package entry point defines what external consumers see.
A subdirectory barrel is internal convenience that adds indirection without value.

**Why this matters — social contract vs. language contract:**

Barrel exports are unenforceable within a project. Any developer can always import
directly from the source file — there is no mechanism to require they use the barrel
instead. This creates two sources of truth for every export: the barrel and the
source file. IDEs will autocomplete both paths, and over time a codebase accumulates
a mix of `import from "./services"` and `import from "./services/user.js"` with no
way to converge.

Package entry points are different. Node.js `exports` field in `package.json`
restricts which paths external consumers can resolve — the runtime will throw on
unauthorized deep imports. That's a language contract, not a social one, which is
why barrel files at the package boundary work: they can actually be enforced.

### Avoid Circular Dependencies

Circular imports create initialization order bugs. If module A imports B and B
imports A, one of them will see an incomplete module.

**Fix patterns:**
- Extract shared code into a third module
- Merge tightly coupled modules
- Use dependency injection instead of direct imports

## Side-Effect Imports

Import a module purely for its side effects only when necessary, and document
why:

```js
// Registers global polyfill
import "./polyfill.js";

// Initializes monitoring
import "./instrumentation.js";
```

Side-effect imports should be rare. If you find many, reconsider the
architecture.
