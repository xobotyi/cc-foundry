# javascript Plugin

JavaScript and TypeScript language discipline: conventions, patterns, runtime practices,
testing frameworks, and LSP-powered code intelligence via `typescript-language-server`.

## Skills

| Skill | Purpose |
|-------|---------|
| `javascript` | Core JavaScript language conventions, idioms, modern practices (ESM, async/await, closures, JSDoc), and LSP navigation rules |
| `typescript` | TypeScript type system, strict mode, and TS-specific patterns (extends `javascript`) |
| `nodejs` | Node.js runtime conventions, APIs, and ecosystem practices (event loop, streams, modules) |
| `bun` | Bun runtime conventions, APIs, and toolchain (native APIs, HTTP server, file I/O, testing) |
| `vitest` | Vitest testing framework conventions and practices (mocking, assertions, configuration) |

## LSP Integration

This plugin ships a `typescript-language-server` LSP configuration (`.lsp.json`). When
installed, Claude Code automatically connects to the TypeScript language server for all JS/TS
file types (`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts`, `.cts`), enabling LSP tools
(`goToDefinition`, `findReferences`, `hover`, `workspaceSymbol`, etc.).

The `javascript` skill enforces LSP-first navigation: agents must use LSP tools for semantic
code navigation (finding definitions, references, implementations, call hierarchies) instead of
falling back to Grep/Glob pattern matching. Text search tools remain appropriate for
non-semantic searches (comments, string literals, config values).

**Prerequisite:** Users must have `typescript-language-server` installed and available in PATH.

## Skill Dependencies

**`typescript` extends `javascript`** — both must be active when working with TypeScript code.
The `javascript` skill provides language fundamentals and LSP navigation rules; `typescript`
adds type system conventions. For pure JavaScript projects, activate only `javascript`.

## Plugin Scope

This plugin covers JavaScript and TypeScript language specifics plus their runtimes (Node.js,
Bun), testing frameworks (Vitest), and LSP-powered code intelligence. Language-agnostic coding
practices (discovery, planning, verification) are provided by `the-coder` plugin.
Platform-specific concerns (frontend, backend, CLI) are provided by their respective platform
plugins.
