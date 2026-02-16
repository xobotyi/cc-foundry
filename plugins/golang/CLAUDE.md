# golang Plugin

Go language discipline: conventions, idioms, error handling, concurrency, testing, and toolchain
practices.

## Skills

| Skill | Purpose |
|-------|---------|
| `golang` | Go language conventions, idioms, error handling, concurrency patterns, project structure, testing, and toolchain (go mod, golangci-lint) |
| `templ` | templ (a-h/templ) type-safe HTML templating: syntax, components, attributes, styling, CSS/JS integration, and testing |

## Skill Dependencies

The `golang` skill provides language-specific conventions. The `templ` skill extends those
conventions to `.templ` files and references `golang` error handling and naming rules.

Both skills assume the `the-coder` plugin for language-agnostic coding discipline (discovery,
planning, verification).

## Plugin Scope

This plugin covers Go language specifics and Go-specific tooling like templ. Language-agnostic
coding practices (discovery, planning, verification) are provided by the `the-coder` plugin.
Platform-specific concerns (backend, CLI) are provided by their respective platform plugins.

## Conventions

- Go code prioritizes simplicity and explicitness over abstraction
- Error handling is mandatory — never discard errors with `_`
- Interfaces are defined consumer-side, not producer-side
- All `.templ` files must be compiled with `templ generate` before building
- Generated `*_templ.go` files must be committed to version control
