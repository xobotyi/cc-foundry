# golang Plugin

Go language discipline: conventions, idioms, error handling, concurrency, testing, toolchain practices, and LSP-powered
code intelligence via `gopls`.

## Skills

- **`golang`** — the language: idioms, errors, concurrency, generics, testing, project structure, toolchain,
  language-version gating, LSP-first navigation
- **`templ`** — templ (a-h/templ) type-safe HTML templating: syntax, components, attributes, escaping and sanitization,
  styling, JavaScript data passing, code generation, testing
- **`charm-tui`** — Charmbracelet v2 TUI stack (`charm.land/*/v2`): Bubble Tea, Bubbles, Lip Gloss, Huh, Glamour,
  fang/log, at-scale architecture, golden-file and teatest testing
- **`zog`** — Zog schema validation: schema shape, Parse against Validate, required and default semantics, tests and
  transforms, issue handling, the zhttp/zjson/zenv adapters

## LSP Integration

Ships a `gopls` LSP server config (`.lsp.json`); Claude Code binds it to `.go` files on install. The `golang` skill's
LSP-first navigation rules assume that config ships — the two change together.

## Skill Dependencies

- `golang` wins on any question of how Go code reads; `templ`, `zog`, and `charm-tui` each own one library stack and
  defer to it. All four Integration sections state that boundary — moving it means editing four files
- One boundary inverts: the `zog` key-naming rule outranks Go naming inside a `z.Shape`, because a shape key names a
  struct field rather than reading as Go code

## Plugin Scope

Go language specifics and Go-specific tooling (gopls, templ, Charm, Zog). Language-agnostic workflow belongs to
`the-coder`; platform concerns to `backend` and `cli`.

## Language Version References

- The floor-version index lives in the `Language Version` section of `skills/golang/SKILL.md` — it decides what the
  model may write, so it stays inline rather than in a reference the model can skip
- `skills/golang/references/versions/go1.NN.md` holds one version each: its additions, the behavior changes its `go`
  directive gates, and its traps
- Body rules and the topic references carry no version gates — the index is the only place a floor version appears
- When a Go version ships: add `references/versions/go1.NN.md` from
  `https://raw.githubusercontent.com/golang/website/master/_content/doc/go1.NN.md`, add one index line naming only the
  features the skill's own rules reference, extend the route-list version range, update
  `skills/golang/.dev/reference-inventory.json`, and drop any gate the new floor makes obsolete

## Conventions

- Library API claims are verified against the module source in the Go module cache, never against memory or upstream
  prose. A module missing from the cache is resolved through `proxy.golang.org` — absence from the cache is not evidence
  it does not exist
- Every skill in this plugin splits its references by load condition, and every pointer states the condition that loads
  it at the point of need. A catalog block listing the reference set is the anti-pattern
- A reference is one hop from SKILL.md — a reference never routes to another reference, nor back to SKILL.md
- `golang` splits its references by kind: `references/conventions/` for topic depth, `references/versions/` for
  per-release notes
