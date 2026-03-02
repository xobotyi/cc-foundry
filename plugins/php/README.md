# php

PHP language discipline plugin for Claude Code targeting PHP 8.5+, with LSP-powered code
intelligence via Intelephense.

## The Problem

PHP has evolved dramatically — union types, enums, readonly classes, property hooks, Fibers,
the pipe operator — but Claude's defaults often lag behind the current state of the language.
Without explicit guidance, Claude may produce code using outdated patterns (no `strict_types`,
`switch` instead of `match`, string constants instead of enums, getter/setter methods instead
of property hooks), miss modern features (asymmetric visibility, `#[Override]`, typed
constants, `#[NoDiscard]`), or use inconsistent conventions across a codebase.

PHP's OOP model is rich but easy to misuse — inheritance where composition fits, traits as
interface substitutes, magic methods where typed properties work. Testing has its own pitfalls:
PHPUnit 11 dropped annotations for attributes, deprecated `createMock` for stubs-only use
cases, and requires static data providers.

Beyond conventions, Claude defaults to text-based code search (Grep/Glob) even when a language
server can provide precise, namespace-aware navigation. This leads to false positives in large
codebases and missed references across namespace boundaries.

## The Solution

This plugin provides two skills and an Intelephense LSP configuration that give Claude deep
PHP fluency targeting 8.5+. The `php` skill covers core language conventions (naming, type
declarations, enums, OOP, closures, error handling), modern features (pipe operator, property
hooks, asymmetric visibility, lazy objects, `#[NoDiscard]`), project structure (Composer,
PSR-4, PER-CS formatting), and LSP-first code navigation rules. The `phpunit` skill covers
testing conventions (test structure, data providers, assertions, mocking/stubs, attributes,
configuration). Both skills include reference guides for extended patterns.

The bundled Intelephense LSP configuration enables semantic code intelligence — go to
definition, find references, hover for type info, workspace symbol search — directly in
Claude Code for `.php` files.

## Prerequisites

Install Intelephense (the PHP language server) and ensure it's available in PATH:

```bash
npm install -g intelephense
```

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install php
```

## Skills

### php

Enforces modern PHP conventions and idioms across all PHP code. Covers naming (PSR-1/PER-CS
conventions), type declarations (union, intersection, DNF types, typed properties, typed
constants), enumerations (backed enums, interface implementation, dynamic case access),
classes (readonly, constructor promotion, property hooks, asymmetric visibility, `#[Override]`,
lazy objects), functions (match expressions, pipe operator, first-class callables, arrow
functions, named arguments), error handling (specific catches, exception chaining,
`#[Deprecated]`, `#[NoDiscard]`), strings and arrays (modern API functions from 8.4/8.5),
formatting (PER-CS baseline), packaging (Composer, PSR-4 autoloading, project structure),
and LSP-first code navigation.

Includes reference guides for the type system (variance, coercion, strict mode), OOP patterns
(traits, interfaces, property hooks, enums, magic methods), concurrency (Fibers, generators),
and packaging (composer.json schema, PSR-4 mapping, file header conventions).

**Use when:** writing, reviewing, refactoring, debugging, or exploring any PHP code.

### phpunit

Enforces PHPUnit 11+ testing conventions using PHP 8 attributes exclusively (annotations
deprecated in 11, removed in 12). Covers test structure (naming, arrange-act-assert,
granularity), fixtures (setUp/tearDown lifecycle, `#[Before]`/`#[After]` attributes),
data providers (`#[DataProvider]`, `#[TestWith]`, generators, named datasets), assertions
(assertSame over assertEquals, exception testing, string/float assertions), mocking (stubs
vs mocks distinction, createStub for returns-only, createMock for expectations, MockBuilder),
attributes (test metadata, skip/conditional, coverage, fixture, behavior), test organization
(unit/integration split, directory structure, test suites), and configuration (phpunit.xml
strict settings, source element, coverage).

**Use when:** writing or reviewing PHP tests with PHPUnit.

## LSP Integration

This plugin bundles an Intelephense LSP server configuration. Once installed, Claude Code
automatically starts Intelephense for `.php` files, enabling precise code intelligence:

| LSP Operation | What It Does |
|---------------|-------------|
| `goToDefinition` | Jump to where a symbol is defined |
| `findReferences` | Find all usages of a symbol |
| `hover` | Get type signature and documentation |
| `documentSymbol` | List all symbols in a file |
| `workspaceSymbol` | Search for symbols across the project |
| `goToImplementation` | Find classes implementing an interface |
| `incomingCalls` | Find what calls a function |
| `outgoingCalls` | Find what a function calls |

## Related Plugins

- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)
- **backend** — Backend platform concerns (observability, API design, data persistence)
- **cli** — CLI platform concerns (argument parsing, output formatting, configuration)

## License

MIT
