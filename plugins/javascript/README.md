# javascript

JavaScript and TypeScript language discipline plugin for Claude Code.

## The Problem

Claude knows JavaScript and TypeScript syntax, but without explicit guidance it may use
outdated patterns (`var`, `==`, prototype chains), mix module systems (CJS vs ESM), ignore
runtime-specific APIs (Bun vs Node.js), or write tests that fight the test framework's
idioms. Each project ends up teaching the same conventions from scratch.

## The Solution

This plugin provides discipline-specific skills that teach JavaScript and TypeScript
conventions, modern language patterns, runtime-specific APIs (Node.js, Bun), and testing
framework practices (Vitest). Skills activate automatically when Claude works with JS/TS
code, ensuring consistent, idiomatic implementations across projects.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install javascript
```

## Skills

### javascript

Core JavaScript language conventions and idioms. Enforces modern syntax (`const`/`let`,
`===`, arrow functions, `async`/`await`, ES modules), functional array methods, proper error
handling, and JSDoc typing for pure JS projects. **Use when:** working with any `.js` or
`.jsx` files.

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
