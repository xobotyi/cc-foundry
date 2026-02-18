# golang

Go language discipline plugin for Claude Code with built-in `gopls` LSP support.

## The Problem

Go has strong idioms and conventions that differ significantly from other languages. Common
pitfalls include premature abstraction, incorrect error handling, misuse of interfaces, context
mismanagement, and concurrency bugs. The templ templating library adds another layer of
conventions for type-safe HTML rendering that requires understanding both Go and templ-specific
patterns.

Beyond conventions, Claude Code's default approach to code navigation — Grep and Glob — misses
Go's semantic structure. Text search can't resolve imports, distinguish shadowed names, find
interface implementations, or trace call hierarchies. Without LSP-powered navigation, exploration
is imprecise and error-prone.

## The Solution

This plugin provides two skills and a `gopls` LSP server that together give Claude deep Go
fluency. The `golang` skill covers core Go conventions (naming, error handling, interfaces,
concurrency, testing, project structure) and enforces LSP-first code navigation — agents must
use `goToDefinition`, `findReferences`, `hover`, and other LSP tools instead of text search for
semantic navigation tasks. The `templ` skill extends those conventions to type-safe HTML
templating. Both skills include anti-pattern references and route to detailed topic-specific
guides.

## Prerequisites

Install `gopls` (the Go language server) and ensure it's available in PATH:

```bash
go install golang.org/x/tools/gopls@latest
```

Make sure `$GOPATH/bin` (or `$HOME/go/bin`) is in your PATH.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install golang
```

## Skills

### golang

Enforces Go language conventions and idioms across all Go code. Covers naming (MixedCaps,
initialisms, receivers), error handling (always check, wrap with context, use errors.Is/As),
interfaces (consumer-side, accept interfaces/return structs), concurrency (goroutines, channels,
context cancellation, errgroup), testing (table tests, subtests, test doubles), and project
structure (package organization, imports, breaking changes). Includes anti-pattern reference for
quick lookups and detailed topic guides for errors, concurrency, testing, idioms, gotchas, and
structure.

The skill also enforces LSP-first navigation: use `goToDefinition` instead of grepping for
function names, `findReferences` instead of text-searching for usages, `goToImplementation`
instead of pattern-matching interface types, and `workspaceSymbol` instead of globbing for
symbols. Grep/Glob remain appropriate for non-semantic searches (comments, string literals,
config values).

**Use when:** writing, reviewing, refactoring, debugging, or exploring any Go code.

### templ

Enforces templ templating conventions for type-safe HTML rendering. Covers syntax (expressions,
control flow, element closing), attributes (constant, dynamic, boolean, spread), component
patterns (definition, composition, children, render-once), styling (class/style expressions, CSS
components), JavaScript integration (script tags, data passing), and testing (expectation vs
snapshot). Includes anti-pattern reference and detailed topic guides for syntax, attributes,
components, styling, JavaScript, and patterns. **Use when:** writing or reviewing `.templ` files,
creating components, composing templates, or testing rendered output.

## LSP Integration

This plugin bundles a `gopls` LSP server configuration. Once installed, Claude Code automatically
starts `gopls` for `.go` files, enabling precise code intelligence:

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

## Related Plugins

- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)
- **backend** — Backend platform concerns (observability, API design, data persistence)
- **cli** — CLI platform concerns (argument parsing, output formatting, configuration)

## License

MIT
