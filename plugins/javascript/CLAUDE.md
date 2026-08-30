# javascript Plugin

JavaScript and TypeScript language discipline: conventions, patterns, runtime practices, testing frameworks, and
LSP-powered code intelligence via `typescript-language-server`.

## Skills

- **`javascript`** — core JavaScript conventions, idioms, modern practices (ESM, async/await, closures, JSDoc), and the
  LSP navigation rules
- **`typescript`** — TypeScript type system, strict mode, TS-specific patterns
- **`nodejs`** — Node.js runtime conventions, APIs, ecosystem practices (event loop, streams, modules)
- **`bun`** — Bun runtime conventions, APIs, toolchain (native APIs, HTTP server, file I/O, testing)
- **`vitest`** — Vitest conventions (mocking, assertions, configuration)

## LSP Integration

The plugin ships `.lsp.json`, binding `typescript-language-server` to every JS/TS extension. The LSP-first navigation
rules live in the `javascript` skill, not here.

## Skill Dependencies

`typescript` is a hard prerequisite on `javascript` — fundamentals stated in `javascript` are not duplicated in
`typescript`.

## Plugin Scope

Language and runtime specifics only. Language-agnostic coding practice belongs to `the-coder`; platform concerns belong
to `frontend`, `backend`, and `cli`.
