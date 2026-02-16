# Node.js Module System

ESM/CJS configuration, `package.json` fields, exports, imports, and module resolution.

## ESM Is the Default

All new Node.js projects should use ESM. Set the package type explicitly:

```json
{
  "type": "module"
}
```

This makes all `.js` files in the package parse as ES modules. Without this field,
`.js` files default to CommonJS (legacy behavior).

### File Extensions

| Extension | Always parsed as | Regardless of `"type"` |
|-----------|-----------------|----------------------|
| `.mjs` | ES module | Yes |
| `.cjs` | CommonJS | Yes |
| `.js` | Depends on `"type"` | No |

Use `.mjs`/`.cjs` only when you need to mix module systems within a single package.

## `node:` Protocol

Always prefix built-in module imports with `node:`:

```js
// Correct
import fs from 'node:fs/promises';
import { createServer } from 'node:http';
import { pipeline } from 'node:stream/promises';

// Wrong — ambiguous, could collide with npm packages
import fs from 'fs';
```

Benefits:
- Unambiguous — clearly a built-in, not an npm package
- Prevents package name collision attacks
- Required for some newer built-in modules

## `package.json` Fields

### `"type"`

Controls how `.js` files are interpreted:

| Value | `.js` parsed as |
|-------|----------------|
| `"module"` | ES module |
| `"commonjs"` (or absent) | CommonJS |

Always set this field explicitly, even in CommonJS packages — future-proofs the
package and helps tooling.

### `"exports"` (Recommended for Libraries)

Defines the public API surface. Prevents consumers from importing internal files.

```json
{
  "name": "my-lib",
  "type": "module",
  "exports": {
    ".": "./src/index.js",
    "./utils": "./src/utils.js"
  }
}
```

Key behaviors:
- **Encapsulation**: only paths listed in `"exports"` are importable
- **Supersedes `"main"`**: when both exist, `"exports"` wins
- **Targets must start with `./`**: relative URLs only

#### Conditional Exports

Serve different code depending on how the package is loaded:

```json
{
  "exports": {
    ".": {
      "import": "./src/index.js",
      "require": "./src/index.cjs",
      "default": "./src/index.js"
    }
  }
}
```

Condition priority (most specific first): `node-addons` > `node` > `import` > `require`
> `module-sync` > `default`.

Always include `"default"` as a fallback.

#### TypeScript Types Condition

When publishing TypeScript declarations, place `"types"` first:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

### `"imports"` (Private Mappings)

Package-internal import aliases. Must start with `#`:

```json
{
  "imports": {
    "#db": {
      "node": "./src/db-node.js",
      "default": "./src/db-polyfill.js"
    },
    "#utils/*": "./src/utils/*.js"
  }
}
```

Usage:
```js
import { connect } from '#db';
import { slugify } from '#utils/string';
```

Benefits:
- Clean internal paths without `../../../`
- Conditional resolution (platform-specific implementations)
- No package self-reference needed

### `"main"` (Legacy)

Single entry point, no encapsulation. Use `"exports"` instead for new packages.
Keep `"main"` alongside `"exports"` only for backward compatibility with old Node.js
or bundlers:

```json
{
  "main": "./src/index.js",
  "exports": "./src/index.js"
}
```

## ESM vs CommonJS Differences

| Feature | ESM | CommonJS |
|---------|-----|----------|
| Syntax | `import`/`export` | `require()`/`module.exports` |
| Loading | Async | Sync |
| `__dirname` | Not available | Available |
| `__filename` | Not available | Available |
| `import.meta.dirname` | Available (Node 21.2+) | Not available |
| `import.meta.filename` | Available (Node 21.2+) | Not available |
| `require.main` | Not available | Available |
| `import.meta.main` | Available (Node 24.2+) | Not available |
| JSON import | Needs `with { type: 'json' }` | `require('./data.json')` |
| Top-level await | Supported | Not supported |
| Live bindings | Yes | No (value copies) |

### Replacing CJS Patterns in ESM

```js
// __dirname / __filename replacement
import.meta.dirname   // '/Users/me/project/src'
import.meta.filename  // '/Users/me/project/src/index.js'

// require.resolve replacement
import.meta.resolve('some-package')  // 'file:///path/to/some-package/index.js'

// require() in ESM (when absolutely needed)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const nativeAddon = require('./addon.node');

// JSON import
import config from './config.json' with { type: 'json' };

// Dynamic import (works in both ESM and CJS)
const module = await import('./dynamic-module.js');
```

## Interoperability

### Importing CJS from ESM

```js
// Default import always works
import lodash from 'lodash';

// Named imports work if CJS module uses static export patterns
import { readFile } from 'node:fs';

// When named imports fail, destructure the default
import pkg from 'some-cjs-package';
const { helper } = pkg;
```

### Using ESM from CJS

`require()` can load synchronous ESM (no top-level `await`):

```cjs
// Works if the ESM module has no top-level await
const { something } = require('esm-package');
```

For ESM with top-level `await`, use dynamic `import()`:

```cjs
async function main() {
  const { something } = await import('esm-package');
}
```

## Self-Referencing

A package can import its own exports by name:

```json
{
  "name": "my-package",
  "exports": {
    ".": "./src/index.js",
    "./utils": "./src/utils.js"
  }
}
```

```js
// Inside my-package itself
import { helper } from 'my-package/utils';
```

Requires `"exports"` to be defined.
