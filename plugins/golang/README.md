# golang

Go language discipline plugin for Claude Code with built-in `gopls` LSP support.

## The Problem

Go has strong idioms and conventions that differ significantly from other languages. Common pitfalls include premature
abstraction, incorrect error handling, misuse of interfaces, context mismanagement, and concurrency bugs. The templ
templating library adds another layer of conventions for type-safe HTML rendering that requires understanding both Go
and templ-specific patterns.

Beyond conventions, Claude Code's default approach to code navigation — Grep and Glob — misses Go's semantic structure.
Text search can't resolve imports, distinguish shadowed names, find interface implementations, or trace call
hierarchies. Without LSP-powered navigation, exploration is imprecise and error-prone.

## The Solution

This plugin provides language and library skills plus a `gopls` LSP server that together give Claude deep Go fluency.
The `golang` skill covers core Go conventions (naming, error handling, interfaces, concurrency, testing, project
structure) and enforces LSP-first code navigation — agents must use `goToDefinition`, `findReferences`, `hover`, and
other LSP tools instead of text search for semantic navigation tasks. The `templ` skill extends those conventions to
type-safe HTML templating, `charm-tui` covers the Charmbracelet v2 terminal UI stack, and `zog` covers schema
validation. Skills include anti-pattern references and route to detailed topic-specific guides.

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

Enforces the Go conventions a model gets wrong on its own, and leaves out the ones it already follows. Covers the traps
(shadowed `err`, deferred argument evaluation, `append` aliasing, typed nil interfaces, copied mutexes), error
discipline (handle once — log or return, never both; wrap without a "failed to" prefix; `%w` versus `%v`), goroutine
lifecycles (every goroutine joined, channel buffers of zero or one, the `fmt.Errorf` deadlock), and the project
conventions that diverge from vanilla Go — kebab-case file names, `give`/`want` table fields, `Test_TypeName`, test
doubles in a `<subject>test` package. Topic guides for errors, concurrency, testing, idioms, gotchas, and structure live
under `references/conventions/` and load only when the situation calls for one.

The skill also enforces LSP-first navigation: use `goToDefinition` instead of grepping for function names,
`findReferences` instead of text-searching for usages, `goToImplementation` instead of pattern-matching interface types,
and `workspaceSymbol` instead of globbing for symbols. Grep/Glob remain appropriate for non-semantic searches (comments,
string literals, config values).

The skill teaches idioms without version gates and keeps a floor-version index for the features that have one, so it
writes code the module's `go` directive actually permits. Per-version references under `references/versions/` (`go1.21`
through `go1.27`) cover what each release added, which behavior changes its `go` directive gates, and the traps it
introduced.

**Use when:** writing, reviewing, refactoring, debugging, or exploring any Go code, or raising a module's Go version.

### templ

Enforces templ templating conventions for type-safe HTML rendering. Covers syntax (expressions, control flow, element
closing), attributes (constant, dynamic, boolean, spread), component patterns (definition, composition, children,
render-once), styling (class/style expressions, CSS components), JavaScript integration (script tags, data passing), and
testing (expectation vs snapshot). Includes anti-pattern reference and detailed topic guides for syntax, attributes,
components, styling, JavaScript, and patterns. **Use when:** writing or reviewing `.templ` files, creating components,
composing templates, or testing rendered output.

### charm-tui

Covers the Charmbracelet v2 stack for terminal UIs — Bubble Tea (Elm-architecture framework), Bubbles (components), Lip
Gloss (styling and layout), Huh (forms), Glamour (markdown rendering), fang (CLI entry), and log. The skill is strictly
v2-focused (`charm.land/*/v2` imports): it encodes the declarative `tea.View` model, command/message discipline,
explicit light/dark color handling, component lifecycle rules, the stack authors' own production architecture patterns
(from crush), and testing with golden files and teatest.

**Use when:** building, reviewing, debugging, or testing terminal UIs, bubbletea programs, terminal styling,
keybindings, forms, or interactive terminal output in Go.

### zog

Covers the Zog schema validation library — a Zod-inspired declarative schema builder for Go. The skill provides the
complete API reference inline: all schema types (String, Int, Float, Bool, Time, Struct, Slice, Ptr, Boxed), generic
methods (Required, Default, Catch, Transform, Test), Parse vs Validate semantics, error handling (ZogIssueList,
formatting strategies), HTTP/JSON/env integration packages (zhttp, zjson, zenv), custom tests, transforms,
preprocessing, i18n, and global configuration. Includes common patterns for HTTP handlers, struct validation methods,
and environment config parsing.

**Use when:** writing schemas, parsing HTTP/JSON/env input, validating structs, handling Zog errors, or integrating Zog
into Go services.

## LSP Integration

This plugin bundles a `gopls` LSP server configuration. Once installed, Claude Code automatically starts `gopls` for
`.go` files, enabling precise code intelligence:

| LSP Operation        | What It Does                          |
| -------------------- | ------------------------------------- |
| `goToDefinition`     | Jump to where a symbol is defined     |
| `findReferences`     | Find all usages of a symbol           |
| `hover`              | Get type signature and documentation  |
| `documentSymbol`     | List all symbols in a file            |
| `workspaceSymbol`    | Search for symbols across the project |
| `goToImplementation` | Find types implementing an interface  |
| `incomingCalls`      | Find what calls a function            |
| `outgoingCalls`      | Find what a function calls            |

## Related Plugins

- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)
- **backend** — Backend platform concerns (observability, API design, data persistence)
- **cli** — CLI platform concerns (argument parsing, output formatting, configuration)

## License

MIT
