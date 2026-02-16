# golang

Go language discipline plugin for Claude Code.

## The Problem

Go has strong idioms and conventions that differ significantly from other languages. Common
pitfalls include premature abstraction, incorrect error handling, misuse of interfaces, context
mismanagement, and concurrency bugs. The templ templating library adds another layer of
conventions for type-safe HTML rendering that requires understanding both Go and templ-specific
patterns.

## The Solution

This plugin provides two skills that encode Go and templ best practices as executable
instructions. The `golang` skill covers core Go conventions: naming, error handling, interfaces,
concurrency, testing, and project structure. The `templ` skill extends those conventions to
type-safe HTML templating with component composition, attribute handling, styling, and JavaScript
integration. Both skills include anti-pattern references and route to detailed topic-specific
guides.

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
structure. **Use when:** writing, reviewing, refactoring, or debugging any Go code.

### templ

Enforces templ templating conventions for type-safe HTML rendering. Covers syntax (expressions,
control flow, element closing), attributes (constant, dynamic, boolean, spread), component
patterns (definition, composition, children, render-once), styling (class/style expressions, CSS
components), JavaScript integration (script tags, data passing), and testing (expectation vs
snapshot). Includes anti-pattern reference and detailed topic guides for syntax, attributes,
components, styling, JavaScript, and patterns. **Use when:** writing or reviewing `.templ` files,
creating components, composing templates, or testing rendered output.

## Related Plugins

- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)
- **backend** — Backend platform concerns (observability, API design, data persistence)
- **cli** — CLI platform concerns (argument parsing, output formatting, configuration)

## License

MIT
