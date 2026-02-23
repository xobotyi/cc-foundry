# TypeScript Configuration

## tsconfig.json Essentials

### Base Options (All Projects)

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "es2022",
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

| Option | Why |
|--------|-----|
| `esModuleInterop` | Fixes CJS/ESM interop issues |
| `skipLibCheck` | Skips `.d.ts` checking for performance |
| `target: "es2022"` | Stable target; prefer over `esnext` |
| `allowJs` | Allows `.js` imports in TS projects |
| `resolveJsonModule` | Enables JSON imports with type safety |
| `moduleDetection: "force"` | Treats all files as modules (avoids block-scope errors) |
| `isolatedModules` | Prevents features unsafe in single-file transpilation |
| `verbatimModuleSyntax` | Forces `import type`/`export type` for type-only imports |

### Strictness (All Projects)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

| Option | Why |
|--------|-----|
| `strict` | Enables all strict checks. Non-negotiable. |
| `noUncheckedIndexedAccess` | Array/object index access returns `T \| undefined` |
| `noImplicitOverride` | Requires `override` keyword on overridden methods |

**Optional strictness** (add per project preference):
- `noImplicitReturns` — all code paths must return
- `noFallthroughCasesInSwitch` — prevent switch fallthrough
- `noUnusedLocals` / `noUnusedParameters` — flag unused code (can be noisy)

### Module System

**Transpiling with `tsc` (Node.js):**
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "outDir": "dist",
    "sourceMap": true
  }
}
```

`module: "NodeNext"` implies `moduleResolution: "NodeNext"` — supports both
ESM and CJS based on `package.json` `"type"` field.

**Using an external bundler (Vite, esbuild, webpack, Bun):**
```json
{
  "compilerOptions": {
    "module": "preserve",
    "noEmit": true
  }
}
```

`module: "preserve"` implies `moduleResolution: "Bundler"` — lets the bundler
handle module resolution while TS focuses on type checking.

### Library Projects

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

For monorepo libraries, also add `"composite": true` to enable project references
and incremental builds.

### Runtime Environment

**DOM (browser):**
```json
{ "compilerOptions": { "lib": ["es2022", "dom", "dom.iterable"] } }
```

**Server-only (Node.js/Bun):**
```json
{ "compilerOptions": { "lib": ["es2022"] } }
```

## Import Conventions

### Use `import type` for Types

```ts
import type { User } from "./types";
import { createUser } from "./users";

// Inline form:
import { type User, createUser } from "./users";
```

`verbatimModuleSyntax` enforces this. Type imports are erased at compile time
and produce no runtime code.

### Use `export type` for Type Re-exports

```ts
export type { User } from "./types";
```

Required for correct behavior with `isolatedModules` and file-by-file
transpilation.

### No `namespace`, No `require`

```ts
// Bad:
namespace Foo { ... }
import x = require("foo");

// Good:
export function foo() { ... }
import { foo } from "./foo";
```

ES modules are the only supported module system. `namespace` is legacy.

## Array Type Syntax

| Element type | Syntax | Example |
|-------------|--------|---------|
| Simple (alphanumeric) | `T[]` | `string[]`, `number[]`, `User[]` |
| Complex (union, object) | `Array<T>` | `Array<string \| number>` |
| Readonly simple | `readonly T[]` | `readonly string[]` |
| Readonly complex | `ReadonlyArray<T>` | `ReadonlyArray<string \| number>` |
| Nested simple | `T[][]` | `string[][]` |

## Compiler Directives

### `@ts-ignore` and `@ts-expect-error`

**Do not use `@ts-ignore`.** It suppresses all errors on the next line, making
future type errors invisible.

**`@ts-expect-error` is acceptable in tests** when deliberately testing invalid
usage. It errors when the suppressed line has no error, so it won't silently
mask changes.

```ts
// Bad: hides all errors forever
// @ts-ignore
const x: string = 42;

// Acceptable in tests: documents expected failure
// @ts-expect-error — testing invalid input handling
const result = processString(42);
```

**Prefer narrowing or explicit casts** over suppression. If you must suppress,
use `@ts-expect-error` with a comment explaining why.

### `@ts-nocheck`

Never use `@ts-nocheck` in production code. It disables all type checking for
the entire file.

## Project Structure Tips

- **Use `paths` sparingly.** Prefer relative imports. Deep `../../../` chains
  suggest the module structure needs refactoring, not aliases.
- **Keep `tsconfig.json` minimal.** Use `extends` for shared base configs.
- **`include` explicitly.** Don't rely on defaults — specify which directories
  to compile.
- **Separate `tsconfig.build.json`** for builds (excludes tests, scripts).
