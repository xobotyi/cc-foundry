# javascript

JavaScript and TypeScript language discipline plugin for Claude Code with built-in
`typescript-language-server` LSP support.

## The Problem

Claude knows JavaScript and TypeScript syntax, but without explicit guidance it may use
outdated patterns (`var`, `==`, prototype chains), mix module systems (CJS vs ESM), ignore
runtime-specific APIs (Bun vs Node.js), or write tests that fight the test framework's
idioms. Each project ends up teaching the same conventions from scratch.

Beyond conventions, Claude Code's default approach to code navigation — Grep and Glob — misses
JS/TS semantic structure. Text search can't resolve module re-exports, distinguish shadowed
names, understand type inference, or trace call hierarchies across files. Without LSP-powered
navigation, exploration is imprecise and error-prone.

## The Solution

This plugin provides discipline-specific skills, a `typescript-language-server` LSP
configuration, and explicit navigation rules. The `javascript` skill covers core conventions
and enforces LSP-first code navigation — agents must use `goToDefinition`, `findReferences`,
`hover`, and other LSP tools instead of text search for semantic navigation tasks. The
`typescript` skill extends those conventions with type system patterns. Runtime skills
(`nodejs`, `bun`) and testing (`vitest`) cover their respective domains. Skills activate
automatically when Claude works with JS/TS code.

## Prerequisites

Install `typescript-language-server` and ensure it's available in PATH:

```bash
npm install -g typescript-language-server typescript
```

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install javascript
```

## Skills

### javascript

Core JavaScript language conventions and idioms. Enforces modern syntax (`const`/`let`,
`===`, arrow functions, `async`/`await`, ES modules), functional array methods, proper error
handling, and JSDoc typing for pure JS projects.

The skill also enforces LSP-first navigation: use `goToDefinition` instead of grepping for
function names, `findReferences` instead of text-searching for usages,
`goToImplementation` instead of pattern-matching interface types, and `workspaceSymbol`
instead of globbing for symbols. Grep/Glob remain appropriate for non-semantic searches
(comments, string literals, config values).

**Use when:** working with any `.js` or `.jsx` files.

### typescript

TypeScript type system conventions. Enforces strict mode, `unknown` over `any`, interface
vs type patterns, discriminated unions, exhaustive narrowing, and inference-first
annotations. Extends the `javascript` skill. **Use when:** working with `.ts` or `.tsx`
files — activate both `javascript` and `typescript`.

### nodejs

Node.js runtime conventions. Enforces ESM with `node:` prefix imports, async-first patterns,
stream pipelines, graceful shutdown, structured logging, and proper error handling
(operational vs programmer errors). **Use when:** writing Node.js server code, CLI tools, or
scripts.

### bun

Bun runtime conventions. Enforces Bun-native APIs (`Bun.serve`, `Bun.file`, `Bun.$`,
`bun:sqlite`, `bun:test`) over Node.js equivalents, declarative HTTP routing, and zero-copy
I/O patterns. **Use when:** writing code that runs on Bun runtime.

### vitest

Vitest testing framework conventions. Enforces explicit imports, boundary mocking (not
internals), `vi.mock` hoisting rules, async assertion patterns, and proper configuration
(coverage includes, multi-project setups). **Use when:** writing or reviewing Vitest tests.

## LSP Integration

This plugin bundles a `typescript-language-server` LSP configuration. Once installed, Claude
Code automatically starts the language server for all JS/TS file types, enabling precise code
intelligence:

| LSP Operation | What It Does |
|---------------|-------------|
| `goToDefinition` | Jump to where a symbol is defined |
| `findReferences` | Find all usages of a symbol |
| `hover` | Get type signature and documentation |
| `documentSymbol` | List all symbols in a file |
| `workspaceSymbol` | Search for symbols across the project |
| `goToImplementation` | Find types implementing an interface |
| `incomingCalls` | Find what calls a function |
| `outgoingCalls` | Find what a function calls |

### Supported File Types

`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts`, `.cts`

## Skill Dependencies

The `typescript` skill extends `javascript` — both must be active when working with
TypeScript code. All other skills are independent and activate based on runtime or testing
context.

## Related Plugins

- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)
- **frontend** — Frontend platform concerns (CSS, accessibility, performance)
- **backend** — Backend platform concerns (observability, API design, security)
- **cli** — CLI platform concerns (argument parsing, terminal output)

## License

MIT
