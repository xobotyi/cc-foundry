# php Plugin

PHP language discipline: conventions, modern idioms, type system, OOP patterns, testing
practices, and LSP-powered code intelligence via Intelephense.

## Skills

| Skill | Purpose |
|-------|---------|
| `php` | PHP 8.5+ language conventions, type declarations (union, intersection, DNF), enums, readonly classes, property hooks, closures, Fibers, error handling, Composer, project structure, and LSP navigation rules |
| `phpunit` | PHPUnit 11+ testing conventions (test structure, data providers, assertions, mocking/stubs, attributes, configuration, code coverage) |

## LSP Integration

This plugin ships an Intelephense LSP server configuration (`.lsp.json`). When installed,
Claude Code automatically connects to Intelephense for `.php` and `.phtml` files, enabling
LSP tools (`goToDefinition`, `findReferences`, `hover`, `workspaceSymbol`, etc.).

The `php` skill enforces LSP-first navigation: agents must use LSP tools for semantic code
navigation (finding definitions, references, implementations, call hierarchies) instead of
falling back to Grep/Glob pattern matching. Text search tools remain appropriate for
non-semantic searches (comments, string literals, config values).

**Prerequisite:** Users must have `intelephense` installed and available in PATH.
Install via `npm install -g intelephense`.

## Skill Dependencies

The `php` skill provides language-specific conventions and covers the full PHP language
surface — from type declarations and enums through OOP patterns and Composer packaging.
The `phpunit` skill extends those conventions to the testing domain and references PHP
naming, exception, and typing rules from the `php` skill.

Both skills assume the `the-coder` plugin for language-agnostic coding discipline (discovery,
planning, verification).

## Plugin Scope

This plugin covers PHP language specifics and the modern PHP ecosystem (Composer, PSR
standards, PER-CS formatting). Language-agnostic coding practices (discovery, planning,
verification) are provided by the `the-coder` plugin. Platform-specific concerns (backend,
CLI, frontend) are provided by their respective platform plugins.

Framework-specific conventions (Laravel, Symfony) are outside this plugin's scope — the
skills are framework-agnostic by design.

## Conventions

- PHP 8.5+ is the baseline — use modern syntax unconditionally (pipe operator, property
  hooks, asymmetric visibility, typed constants, `#[NoDiscard]`, closures in constants)
- `declare(strict_types=1)` in every PHP file, no exceptions
- Type declarations are mandatory on all public API boundaries
- PER Coding Style (PER-CS) is the formatting baseline
- PSR-4 autoloading via Composer for all project code
- `readonly class` for value objects and DTOs by default
- `match` over `switch`, enums over string/int constants
- LSP tools are required for code navigation — Grep/Glob only for non-semantic text search
- No static analysis tool opinions (PHPStan/Psalm) — projects choose their own
- No code style tool opinions (PHP-CS-Fixer/PHPCS) — PSR conventions inline
