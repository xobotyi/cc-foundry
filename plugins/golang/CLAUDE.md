# golang Plugin

Go language discipline: conventions, idioms, error handling, concurrency, testing, toolchain practices, and LSP-powered
code intelligence via `gopls`.

## Skills

- **`golang`** — Go language conventions, idioms, error handling, concurrency patterns, generics, project structure,
  testing, toolchain (go mod, golangci-lint, go fix, go vet), language-version gating, and LSP navigation rules
- **`templ`** — templ (a-h/templ) type-safe HTML templating: syntax, components, attributes, styling, CSS/JS
  integration, and testing
- **`charm-tui`** — Charmbracelet v2 TUI stack (`charm.land/*/v2`): Bubble Tea Elm architecture, Bubbles components, Lip
  Gloss styling/layout, Huh forms, Glamour markdown, fang/log, at-scale architecture (crush patterns), golden-file and
  teatest testing
- **`zog`** — Zog schema validation library: schema definition, parsing, validation, error handling, HTTP/JSON/env
  integration, custom tests, and transforms

## LSP Integration

This plugin ships a `gopls` LSP server configuration (`.lsp.json`). When installed, Claude Code automatically connects
to `gopls` for `.go` files, enabling LSP tools (`goToDefinition`, `findReferences`, `hover`, `workspaceSymbol`, etc.).

The `golang` skill enforces LSP-first navigation: agents must use LSP tools for semantic code navigation (finding
definitions, references, implementations, call hierarchies) instead of falling back to Grep/Glob pattern matching. Text
search tools remain appropriate for non-semantic searches (comments, string literals, config values).

**Prerequisite:** Users must have `gopls` installed and available in PATH.

## Skill Dependencies

The `golang` skill provides language-specific conventions. The `templ` skill extends those conventions to `.templ` files
and references `golang` error handling and naming rules. The `zog` and `charm-tui` skills are standalone — they cover
their library stacks (Zog validation; Charmbracelet v2 TUI), deferring to `golang` for general Go conventions.

All skills assume the `the-coder` plugin for language-agnostic coding discipline (discovery, planning, verification).

## Plugin Scope

This plugin covers Go language specifics and Go-specific tooling like templ and gopls. Language-agnostic coding
practices (discovery, planning, verification) are provided by the `the-coder` plugin. Platform-specific concerns
(backend, CLI) are provided by their respective platform plugins.

## Language Version References

- The floor-version index lives in the `Language Version` section of `skills/golang/SKILL.md` — it decides what the
  model may write, so it stays inline rather than in a reference the model can skip
- `skills/golang/references/versions/go1.NN.md` holds one version each: its additions, the behavior changes its `go`
  directive gates, and its traps
- Body rules and the topic references carry no version gates — the index is the only place a floor version appears
- When a Go version ships: add `references/versions/go1.NN.md` from
  `https://raw.githubusercontent.com/golang/website/master/_content/doc/go1.NN.md`, add one index line naming only the
  features the skill's own rules reference, extend the route-list version range, update `.dev/reference-inventory.json`,
  and drop any gate the new floor makes obsolete

## Conventions

- Go code prioritizes simplicity and explicitness over abstraction
- Error handling is mandatory — never discard errors with `_`
- Interfaces are defined consumer-side, not producer-side
- LSP tools are required for code navigation — Grep/Glob only for non-semantic text search
- `golang` skill references split by kind: `references/conventions/` for topic depth, `references/versions/` for
  per-release notes. Both are linked directly from SKILL.md — a reference never routes to another reference
- The `go` directive in `go.mod`, not the installed toolchain, decides which language features and stdlib symbols apply
- All `.templ` files must be compiled with `templ generate` before building
- Generated `*_templ.go` files must be committed to version control
