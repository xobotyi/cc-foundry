# javascript Plugin

JavaScript and TypeScript language discipline: conventions, patterns, runtime practices,
and testing frameworks.

## Skills

| Skill | Purpose |
|-------|---------|
| `javascript` | Core JavaScript language conventions, idioms, and modern practices (ESM, async/await, closures, JSDoc) |
| `typescript` | TypeScript type system, strict mode, and TS-specific patterns (extends `javascript`) |
| `nodejs` | Node.js runtime conventions, APIs, and ecosystem practices (event loop, streams, modules) |
| `bun` | Bun runtime conventions, APIs, and toolchain (native APIs, HTTP server, file I/O, testing) |
| `vitest` | Vitest testing framework conventions and practices (mocking, assertions, configuration) |

## Skill Dependencies

**`typescript` extends `javascript`** — both must be active when working with TypeScript code.
The `javascript` skill provides language fundamentals; `typescript` adds type system
conventions. For pure JavaScript projects, activate only `javascript`.

## Plugin Scope

This plugin covers JavaScript and TypeScript language specifics plus their runtimes (Node.js,
Bun) and testing frameworks (Vitest). Language-agnostic coding practices (discovery, planning,
verification) are provided by `the-coder` plugin. Platform-specific concerns (frontend,
backend, CLI) are provided by their respective platform plugins.
