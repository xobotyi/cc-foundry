# golang Plugin

Go language discipline: conventions, idioms, error handling, concurrency, testing, toolchain
practices, and LSP-powered code intelligence via `gopls`.

## Skills

| Skill | Purpose |
|-------|---------|
| `golang` | Go language conventions, idioms, error handling, concurrency patterns, project structure, testing, toolchain (go mod, golangci-lint), and LSP navigation rules |
| `templ` | templ (a-h/templ) type-safe HTML templating: syntax, components, attributes, styling, CSS/JS integration, and testing |

## LSP Integration

This plugin ships a `gopls` LSP server configuration (`.lsp.json`). When installed, Claude Code
automatically connects to `gopls` for `.go` files, enabling LSP tools (`goToDefinition`,
`findReferences`, `hover`, `workspaceSymbol`, etc.).

The `golang` skill enforces LSP-first navigation: agents must use LSP tools for semantic code
navigation (finding definitions, references, implementations, call hierarchies) instead of
falling back to Grep/Glob pattern matching. Text search tools remain appropriate for non-semantic
searches (comments, string literals, config values).

**Prerequisite:** Users must have `gopls` installed and available in PATH.

## Skill Dependencies

The `golang` skill provides language-specific conventions. The `templ` skill extends those
conventions to `.templ` files and references `golang` error handling and naming rules.

Both skills assume the `the-coder` plugin for language-agnostic coding discipline (discovery,
planning, verification).

## Plugin Scope

This plugin covers Go language specifics and Go-specific tooling like templ and gopls.
Language-agnostic coding practices (discovery, planning, verification) are provided by the
`the-coder` plugin. Platform-specific concerns (backend, CLI) are provided by their respective
platform plugins.

## Conventions

- Go code prioritizes simplicity and explicitness over abstraction
- Error handling is mandatory — never discard errors with `_`
- Interfaces are defined consumer-side, not producer-side
- LSP tools are required for code navigation — Grep/Glob only for non-semantic text search
- All `.templ` files must be compiled with `templ generate` before building
- Generated `*_templ.go` files must be committed to version control
