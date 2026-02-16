---
name: templ
description: >-
  templ templating: syntax, components, attributes, styling, and JavaScript integration.
  Invoke when task involves any interaction with templ — writing .templ files, creating
  components, composing templates, testing rendered output, or understanding templ syntax.
---

# templ

Type-safe Go HTML templating. Components defined in `.templ` files compile to Go functions
returning `templ.Component` via `templ generate`. Outside `templ` blocks = ordinary Go.
Inside = templ syntax.

**Templates are renderers, not processors. Transform data in Go, render results in templ.**

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Expressions, elements, control flow, raw Go, comments | [syntax.md](references/syntax.md) |
| Constant, dynamic, boolean, conditional, spread, URL attributes | [attributes.md](references/attributes.md) |
| Definition, composition, children, method/code-only, render-once, fragments | [components.md](references/components.md) |
| Class/style expressions, CSS components, sanitization | [styling.md](references/styling.md) |
| Script tags, JSFuncCall, JSONString, data passing, IIFE | [javascript.md](references/javascript.md) |
| View models, layouts, context, html/template interop | [patterns.md](references/patterns.md) |

Read the relevant reference before writing code in that area.

## Core Rules

These apply to ALL templ code. No exceptions.

### Syntax

1. **All tags must close.** `<br/>` not `<br>`. templ strips `/` for void elements in output.
2. **Expressions `{ }`** output strings, numbers, booleans. Auto-escaped for XSS safety.
3. **Functions returning `(T, error)`** propagate errors to `Render()`.
4. **Text starting with `if`, `for`, `switch`** triggers parser. Wrap literal text:
   `{ "if you need this text" }` or capitalize: `If you need this text`.
5. **Run `templ generate`** after every `.templ` change. Generated `*_templ.go` files must
   be committed.

### Implicit Variables

1. **`ctx`** — `context.Context` from `Render` call. Available in all components.
2. **`children`** — content passed via `@component() { ... }`. Access: `{ children... }`.

### Security

1. **HTML auto-escaped.** Use `@templ.Raw()` only for trusted content.
2. **URL attrs auto-sanitize.** `href`, `src`, `action` block `javascript:` schemes.
   Bypass: `templ.SafeURL()`. Non-standard URL attrs: `templ.URL()`.
3. **CSS auto-sanitized.** Dynamic values checked. Bypass: `templ.SafeCSS`,
   `templ.SafeCSSProperty`.
4. **JS function names sanitized.** Invalid names become `__templ_invalid_function_name`.

### Render-Once

1. **Declare handles at package level.** `var h = templ.NewOnceHandle()`.
2. **Never inline.** `@templ.NewOnceHandle().Once()` creates a new handle each call —
   content renders every time, defeating the purpose.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|-----|
| `<br>` | `<br/>` — all tags must close |
| `if this text...` in template body | `{ "if this text..." }` — wrap as expression |
| `@templ.NewOnceHandle().Once() { ... }` | `var h = templ.NewOnceHandle()` then `@h.Once() { ... }` |
| Unescaped HTML via expressions | `@templ.Raw(trusted)` — only trusted sources |
| String concat for URL attrs | `templ.SafeURL()` or `templ.URL()` for non-standard attrs |
| Prop drilling auth/theme through every component | Context with type-safe getter: `GetUser(ctx)` |
| Direct `ctx.Value(key).(Type)` in templates | Type-safe function: `func GetTheme(ctx) string` |
| Complex logic in `.templ` files | View model struct — transform data in Go |
| `func Read(path string)` as component param | Pass pre-loaded data — no I/O in templates |
| Global `var` for `templ.Attributes` mutation | Fresh `templ.Attributes{}` per render call |

## Toolchain

```bash
templ generate              # compile all .templ → Go
templ generate -f file.templ  # single file
templ generate -watch       # watch mode (dev only, not optimized for production)
templ fmt .                 # format all .templ files
```

The `-watch` flag regenerates on file change. Combine with `-cmd` and `-proxy` for
live-reload during development.

## Testing

Two strategies for testing templ components:

### Expectation Testing

Render to pipe, parse with `goquery`, assert with CSS selectors:

```go
r, w := io.Pipe()
go func() {
    _ = myComponent(data).Render(context.Background(), w)
    _ = w.Close()
}()
doc, err := goquery.NewDocumentFromReader(r)
// Assert with doc.Find(`[data-testid="myComponent"]`)
```

Use `data-testid` attributes for reliable test selectors.

### Snapshot Testing

Compare rendered output against expected HTML:

```go
//go:embed expected.html
var expected string

diff, err := htmldiff.Diff(component, expected)
if diff != "" {
    t.Error(diff)
}
```

### Testing Principles

- **Component-level tests**: verify data renders correctly using `data-testid` selectors.
- **Page-level tests**: verify components are present (by `data-testid`), don't re-test
  component internals.
- **Test view models in pure Go** — no rendering needed for data transformation logic.

## Application

When **writing** templ code:
- Apply all conventions silently — don't narrate each rule being followed.
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once.
- Keep templates focused on rendering. Move data transformation, validation, and business
  logic to Go code.
- Run `templ generate` after every `.templ` change before attempting to build or test.

When **reviewing** templ code:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule — state what's wrong and how to fix it.

## Integration

This skill provides templ-specific conventions alongside the **golang** skill:

1. **Go** — Language idioms, error handling, naming
2. **templ** — Template syntax, component patterns, data flow
3. **Coding** — Discovery and verification discipline

The golang skill governs Go implementation choices; this skill governs `.templ` file authoring.

**Templates are renderers, not processors. When in doubt, move logic to Go.**
