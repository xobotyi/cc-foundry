# javascript

JavaScript and TypeScript discipline for Claude Code, with a bundled `typescript-language-server` configuration.

## The Problem

A model writes JavaScript from everything it has read, and that spans twenty years of the language. Without a stated
baseline it reaches for a pattern that was right in 2019, a runtime API that has since moved, or a compiler option whose
default changed two releases ago. None of it fails loudly — JavaScript coerces, Node warns, and the test passes.

The toolchain moves faster than the language. Node's support windows shift twice a year and its APIs carry a stability
index that decides whether they can appear in a published package at all. Bun adds APIs continuously. Vitest has renamed
configuration across majors, so a key recalled from an older one is silently ignored. TypeScript's compiler was
rewritten in Go, and the release that ships it exposes no programmatic API, which breaks every tool that embeds it.

Code navigation has a separate gap. Grep and Glob cannot resolve a re-export, distinguish a shadowed name, or follow a
call across files, so text search is imprecise on any project large enough to need it.

## The Solution

Five skills, each gated on the version axis that actually decides what a project may write — the ECMAScript edition, the
pinned TypeScript release, the Node major named by `engines.node` — plus an LSP configuration and the navigation rules
that use it.

The rules are proscriptive rather than tutorial: the gotcha that defies a reasonable assumption, the default that fails
silently, the API that reads as committed and is not. Each skill states its version floors inline and routes to a
per-version reference for detail. Each ships the source list it was written from in `.dev/reference-inventory.json`, so
the corpus behind it can be refetched and rechecked.

## Prerequisites

Install `typescript-language-server` and make sure it is on `PATH`:

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

The language itself: declarations and scope, equality and coercion, functions and closures, objects and copying, arrays
and iteration, classes, async and promise semantics, ES module syntax, errors, regular expressions, `Intl` and the
built-in globals, and JSDoc typing for plain-JS projects. Gates every feature on the project's declared engine baseline
rather than on the edition a feature belongs to, because engines ship features before ratification and lag on others.

Also carries the LSP-first navigation rules for every JS and TS extension.

**Use when:** touching any JavaScript, and alongside `typescript` on any TypeScript.

### typescript

The type system and everything downstream of it: strictness configuration, narrowing and control-flow analysis,
generics, conditional and mapped types, branded types, declaration files and emit, module resolution and `tsconfig`, and
the erasable-syntax constraint that runtime type-stripping imposes. Covers the compiler releases including the native
port, whose defaults changed in ways that break silently on upgrade.

Extends `javascript` and does not restate it.

**Use when:** touching `.ts` or `.tsx`, designing types, or editing a `tsconfig.json`.

### nodejs

The Node runtime: module resolution, the `package.json` fields Node itself reads, native TypeScript execution, blocking
and the event loop, streams, errors and process lifecycle, `AsyncLocalStorage` and diagnostics channels, the built-in
HTTP client, workers, the permission model, `node:test`, npm and supply-chain hardening, and the CLI. Every rule carries
the major it applies from and the stability index of the API behind it.

**Use when:** writing a server, a CLI, a script, or a `package.json`.

### bun

The Bun runtime and its toolchain: which `Bun.*` API replaces which dependency and from which release, the HTTP and
WebSocket server, file and process I/O, the shell, `bun:test`, the package manager and its linker behavior, the bundler
and single-file executables, the bundled SQLite, SQL, Redis and S3 clients, and the concrete edges of Node
compatibility.

**Use when:** writing or configuring anything that runs on Bun.

### vitest

Vitest: test structure, assertions, test context and fixtures, lifecycle and hook ordering, the mocking surface and its
hoisting rules, fake timers, snapshots, configuration and projects, pools and isolation, coverage, type testing, browser
mode, and migration from Jest. Carries the cross-major rename inventory, so a config written against an older major can
be reconciled rather than guessed at.

**Use when:** writing, running, or debugging a Vitest suite.

## LSP Integration

The bundled `typescript-language-server` configuration starts automatically for every supported file type.

- `goToDefinition` — where a symbol is defined
- `findReferences` — every use of a symbol
- `hover` — type, signature, and documentation
- `documentSymbol` — symbols in one file
- `workspaceSymbol` — symbols across the project
- `goToImplementation` — types implementing an interface
- `incomingCalls` and `outgoingCalls` — the call graph in either direction

Supported extensions: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts`, `.cts`.

Grep and Glob stay correct for comments, string literals, log messages, environment variable names, config values, and
file-name patterns.

## Skill Dependencies

`typescript` requires `javascript` — activate both on TypeScript code.

The rest divide by ownership. `javascript` wins on how the language reads; the runtime skills own their own APIs and
resolution behavior; `vitest` owns Vitest. Each runtime skill owns the test runner it ships, so `node:test` belongs to
`nodejs` and `bun:test` to `bun`.

## Related Plugins

- **the-coder** — language-agnostic coding discipline: discovery, decomposition, verification
- **frontend** — CSS, accessibility, and the browser frameworks
- **backend** — observability and service concerns
- **cli** — CLI design and shell scripting

## License

MIT
