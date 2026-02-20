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

## References

Extended examples and detailed patterns for the rules below:

| Topic | Reference | Contents |
|-------|-----------|----------|
| Template syntax, expressions, control flow, raw Go blocks | [syntax.md](references/syntax.md) | File structure, expression types, error propagation, auto-escaping, control flow examples |
| Component definition, composition, children, fragments | [components.md](references/components.md) | Component interface, `@` composition, children context API, render-once, fragment rendering |
| Boolean, conditional, spread attributes, key expressions | [attributes.md](references/attributes.md) | Attribute types with code examples, spread value table, URL/JS/JSON attribute patterns |
| View models, layouts, context, html/template interop | [patterns.md](references/patterns.md) | Props struct pattern, nested layouts, context helpers with middleware, Go template interop |
| Script/style tags, inline events, data passing to JS | [javascript.md](references/javascript.md) | JSFuncCall/JSExpression/JSONString/JSONScript API, IIFE pattern, method summary table |
| Class patterns, CSS components, style attributes | [styling.md](references/styling.md) | Class toggling approaches (KV, maps, raw Go), CSS component scoping, style sanitization |

## Syntax

### Expressions `{ }`

Output Go values inside templ blocks. Content is automatically HTML-escaped for XSS safety.

Supported types: `string`, numbers (`int`, `uint`, `float32`, `complex64`, etc.), booleans,
and any type based on these (e.g. `type Name string`).

Use variables, field access, and function calls: `{ name }`, `{ p.Name }`,
`{ strings.ToUpper(name) }`, `{ fmt.Sprintf("%d items", count) }`.

Functions returning `(T, error)` propagate errors to `Render()` with source location info.

### Elements

All tags must close. Write `<br/>` not `<br>`. templ is aware of void elements and strips
`/` in output HTML, but source must always include it.

templ automatically minifies HTML output.

### Control Flow

Use bare Go keywords — `if`/`else`, `switch`/`case`, `for`/`range`. No special syntax.

Text starting with `if`, `for`, or `switch` triggers the parser. Two solutions:
- Wrap as expression: `{ "if you need this text" }`
- Capitalize the keyword: `If you need this text`

### Raw Go `{{ }}`

Scoped Go statements inside templ blocks for intermediate variables.

```templ
{{ total := calculateTotal(items) }}
<p>Total: { fmt.Sprintf("%d", total) }</p>
```

Use `{{ }}` to avoid calling expensive functions twice — cache results in a variable.

### Comments

- **Inside templ blocks**: use HTML comments `<!-- -->` (rendered to output). No nesting.
- **Outside templ blocks**: use Go comments `//` (not rendered).

### Implicit Variables

Every component has two implicit variables:
- **`ctx`** — `context.Context` from the `Render` call. Available in all components.
- **`children`** — content passed via `@component() { ... }`. Access with `{ children... }`.

## Components

### Definition and Visibility

Components compile to Go functions returning `templ.Component`. Follow Go visibility rules:
uppercase name = exported, lowercase = unexported.

The `templ.Component` interface: `Render(ctx context.Context, w io.Writer) error`.

**Partial output warning**: a component may write partial output to `io.Writer` before
returning an error. To guarantee all-or-nothing, render to a buffer first.

### Composition

Call components with `@` prefix: `@header()`, `@components.Header()`, `@nav.Item("Home", "/")`.

### Children

Pass content to a component with `@layout() { <p>children</p> }`. Receive with
`{ children... }` in the component body.

In code-only components, manage children via context: `templ.WithChildren`,
`templ.GetChildren`, `templ.ClearChildren`.

### Components as Parameters

Pass components as values via `templ.Component` type parameters, render with `@param`.

### Joining Components

Aggregate multiple components into one with `@templ.Join(header(), nav(), footer())`.

### Method Components

Attach components to types when a component has many configuration options — struct fields
are self-documenting and can have defaults. Call inline:
`@Button{Text: "Submit", Variant: "primary"}.Render()`.

### Code-Only Components

Implement `templ.Component` in pure Go using `templ.ComponentFunc`:

```go
func button(text string) templ.Component {
    return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
        _, err := io.WriteString(w, "<button>"+templ.EscapeString(text)+"</button>")
        return err
    })
}
```

**In code-only components, you must escape HTML yourself** with `templ.EscapeString`. Auto-
escaping only applies inside `.templ` files.

### Render-Once

Ensure content renders once per HTTP response (or per context). Common use: shared `<script>`,
`<style>`, or `<link>` tags.

1. Declare handles at **package level**: `var h = templ.NewOnceHandle()`.
2. Use in component: `@h.Once() { <script src="..."></script> }`.
3. **Never inline** `@templ.NewOnceHandle().Once()` — creates a new handle each call, content
   renders every time, defeating the purpose.

For cross-package shared dependencies, export render-once components — wrap the handle and
`Once()` call in an exported templ function, then call from any package.

### Fragments

Render subsections of templates, discarding all other output. The full template still executes
(all logic runs), but only the fragment's output is written.

- Define: `@templ.Fragment("content") { <div>fragment</div> }`
- Render via HTTP: `templ.Handler(Page(), templ.WithFragments("content"))`
- Render without HTTP: `templ.RenderFragments(ctx, w, Page(), "content")`

**Custom fragment keys**: use typed keys (`type contentKey struct{}`) to avoid name clashes.

**Nested fragments**: selecting outer includes inner. Useful for partial page updates
(e.g. with htmx).

## Attributes

### Constant Attributes

Standard HTML attributes with double quotes: `<p class="container" data-testid="p">`.

### Dynamic String Attributes

Set to Go expressions with `{ }`: `<div class={ className }>`,
`<div data-id={ fmt.Sprintf("item-%d", id) }>`.

String values are automatically HTML-attribute-encoded. Functions returning `(string, error)`
propagate errors to `Render()`.

### Boolean Attributes `?=`

Presence/absence based on Go boolean: `<input disabled?={ isDisabled }/>`,
`<button hidden?={ !showButton }/>`. Static booleans: `<hr noshade/>`.

### Conditional Attributes

Use `if` inside element open tags to conditionally add attributes. The conditional attribute
**replaces** the earlier one of the same name — include base classes in both branches.

### Attribute Key Expressions

Dynamically set the attribute key: `<p { "data-" + suffix }="value">`.

**Warning**: key expressions don't get type-specific handling. URL attributes (`href`) and
event handlers (`on*`) defined via key expressions are treated as plain strings without
special sanitization.

### Spread Attributes

Append a dynamic map with `{ attrs... }` where `attrs` is `templ.Attributes`
(`map[string]any`).

| Value Type | Rendering |
|------------|-----------|
| `string` | `name="value"` |
| `bool` | `name` (if true) or omitted (if false) |
| `templ.KeyValue[string, bool]` | `name="value"` if bool is true |
| `templ.KeyValue[bool, bool]` | `name` if both bools are true |

Spread attributes can be conditional using `if` inside element open tags.

**Never mutate a global `templ.Attributes` var** — create fresh `templ.Attributes{}` per
render call.

## Security

### HTML Auto-Escaping

All expressions `{ }` are HTML-escaped. Use `@templ.Raw()` **only** for trusted content.

### URL Sanitization

`href`, `src`, `action` auto-sanitize dynamic values — `javascript:` schemes become
`about:invalid#TemplFailedSanitizationURL`. Bypass with `templ.SafeURL()` for trusted URLs.

**Constant URL values are NOT sanitized**: `<a href="javascript:...">` renders as-is.

For non-standard URL attributes (e.g. htmx `hx-get`), use `templ.URL()` which sanitizes
without the special `href`/`src`/`action` behavior.

### CSS Sanitization

Dynamic CSS values are sanitized by default. Unsafe property names become
`zTemplUnsafeCSSPropertyName`, unsafe values become `zTemplUnsafeCSSPropertyValue`.
Bypass with `templ.SafeCSS` (full declaration) or `templ.SafeCSSProperty` (single value).

### JS Sanitization

Function names in `templ.JSFuncCall` are sanitized — invalid names become
`__templ_invalid_function_name`. `templ.JSExpression` bypasses encoding entirely — only use
with trusted compile-time constants like `"event"` or `"this"`. `templ.JSUnsafeFuncCall`
skips function name sanitization — **never** use with user-provided input.

## Styling

### Class Attribute

Multiple approaches for conditional classes, ordered by simplicity:

| Pattern | Syntax | Best For |
|---------|--------|----------|
| Static string | `class="button primary"` | Unchanging classes |
| Dynamic expression | `class={ className }` | Single dynamic class |
| Multiple values | `class={ "button", className }` | Combining static + dynamic |
| `templ.KV` | `class={ "btn", templ.KV("active", isActive) }` | Conditional single class |
| `map[string]bool` | `class={ map[string]bool{"tab": true, "active": isActive} }` | Multiple conditional |
| Raw Go `{{ }}` | Compute class string in `{{ }}`, use in `class={ computed }` | Complex logic |
| Conditional attribute | `if cond { class="full-set" }` in open tag | Replacing full value |

CSS component functions (from `css` blocks) can be used in class expressions:
`class={ "button", templ.KV(primaryButton(), isPrimary) }`.

### Style Attribute

Dynamic styles accept multiple values combined in output: `style={ style1, style2 }`.

| Type | Example |
|------|---------|
| `string` | `"background-color: red"` |
| `templ.SafeCSS` | Bypasses sanitization |
| `map[string]string` | `map[string]string{"color": "red"}` |
| `map[string]templ.SafeCSSProperty` | Map with unsanitized values |
| `templ.KeyValue[string, bool]` | Conditional: include CSS string if true |
| `templ.KeyValue[templ.SafeCSS, bool]` | Conditional unsanitized CSS |
| Functions returning any above | Single function may return `(T, error)` |

Use `templ.KV("border-color: red", hasError)` for conditional style toggling.

Use `map[string]string` for computed style sets from Go functions.

### CSS Components

Define scoped CSS with auto-generated hash-based class names:

```templ
css primaryButton() {
    background-color: #ffffff;
    color: { red };
}
```

Key behaviors:
- Class names are auto-generated (hash-based) — don't rely on them being stable
- CSS is rendered as `<style>` tags, once per HTTP request per unique class
- Dynamic values inside `css` blocks use `{ expr }` syntax
- CSS components accept arguments — each unique argument combination generates a separate class
- Dynamic property names/values are sanitized; bypass with `templ.SafeCSSProperty`

### Raw `<style>` Elements

Raw `<style>` tags render without modification. Use CSS components instead if you need
once-per-request deduplication.

### CSS Middleware

`templ.NewCSSMiddleware` serves a global stylesheet instead of inline `<style>` tags.
See [styling.md](references/styling.md).

## JavaScript Integration

### Script Tags

Standard `<script>` tags for client-side JavaScript. Use `templ.OnceHandle` to render a
script only once per response.

### Passing Data: Go to JavaScript

Three approaches, ordered by preference:

| Approach | API | Best For |
|----------|-----|----------|
| Data attributes | `data-config={ templ.JSONString(data) }` | Component-scoped data |
| Script elements | `@templ.JSONScript("id", data)` | Page-level configuration |
| Inline interpolation | `{{ value }}` in `<script>` | Least preferred — mixing data/code |

### `templ.JSFuncCall`

Call a client-side function with server-side data. Arguments are JSON-encoded.

Use in attributes: `<button onclick={ templ.JSFuncCall("alert", msg) }>`.
Use as standalone script: `@templ.JSFuncCall("initApp", config.Name)` renders
`<script>initApp("MyApp");</script>`.

### `templ.JSExpression`

Bypass JSON encoding for raw JS expressions: `templ.JSExpression("event")`,
`templ.JSExpression("this")`. **Only use with trusted compile-time constants** — output
goes directly to HTML without encoding.

### `templ.JSONString`

Encode Go data as JSON string for HTML attributes:
`<div x-data={ templ.JSONString(data) }>`. Client reads with
`JSON.parse(el.getAttribute('attr'))`.

### `templ.JSONScript`

Create `<script type="application/json">` element: `@templ.JSONScript("id", data)`.
Client reads with `JSON.parse(document.getElementById('id').textContent)`.

### Inline `{{ }}` Interpolation in Scripts

Inside JS strings: value is string-escaped. Outside JS strings: value is JSON-encoded.
templ auto-escapes both. **Prefer `templ.JSONString` or `templ.JSONScript`** over inline
interpolation — separating data from code is easier to maintain.

### `templ.JSUnsafeFuncCall`

Identical to `templ.JSFuncCall` but skips function name sanitization. Arguments still
JSON-encoded. **Never use with user-provided input.**

### IIFE Pattern

Prevent variable leaking into global scope by wrapping in `(() => { ... })()`.
Use `document.currentScript` for DOM traversal relative to the script element.

### Best Practice: Avoiding Inline Event Handlers

Separate behavior from markup: load shared functions via `templ.OnceHandle`, pass data via
`data-*` attributes, isolate in IIFEs. See [javascript.md](references/javascript.md).

### External Scripts

Import via `<script src="...">`. For TypeScript/NPM projects, bundle with `esbuild` into
a single JS file, then reference via script tag.

## Patterns

### View Models

Create a props struct with a `NewProps(domain)` constructor in Go. Templates receive only
pre-transformed data — no I/O, no complex logic. Test view models as pure Go functions.

### Layout Pattern

Use children for content injection: define a layout component that renders `{ children... }`,
then wrap page content with `@BaseLayout("title") { ... }`. Compose by nesting layouts.

For multiple content slots, pass `templ.Component` as parameters alongside children:
`templ TwoColumnLayout(sidebar templ.Component)` uses `@sidebar` and `{ children... }`.

### Context for Cross-Cutting Data

For auth, theme, locale — use Go `context` with private key types and type-safe
`With*(ctx, value)` / `Get*(ctx) (T, bool)` helpers. Set in HTTP middleware, access via
implicit `ctx` in templates. Prefer prop drilling for direct parent-child data. Always use
type-safe getters — direct `ctx.Value(key).(Type)` panics on missing keys.

### Interop with `html/template`

`@templ.FromGoHTML(goTemplate, data)` embeds Go templates in templ.
`templ.ToGoHTML(ctx, component)` embeds templ in Go templates. Useful for gradual migration.

## Toolchain

```bash
templ generate                # compile all .templ -> Go
templ generate -f file.templ  # single file
templ generate -watch         # watch mode (dev only, not optimized for production)
templ fmt .                   # format all .templ files
```

The `-watch` flag regenerates on file change. Combine with `-cmd` and `-proxy` for
live-reload during development.

Run `templ generate` after every `.templ` change. Generated `*_templ.go` files must
be committed.

## Testing

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

Compare rendered output against expected HTML using `//go:embed expected.html` and
`htmldiff.Diff(component, expected)`.

### Testing Principles

- **Component-level tests**: verify data renders correctly using `data-testid` selectors
- **Page-level tests**: verify components are present (by `data-testid`), don't re-test
  component internals
- **Test view models in pure Go** — no rendering needed for data transformation logic

## Application

When **writing** templ code:
- Apply all conventions silently — don't narrate each rule being followed
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once
- Keep templates focused on rendering. Move data transformation, validation, and business
  logic to Go code
- Run `templ generate` after every `.templ` change before attempting to build or test

When **reviewing** templ code:
- Cite the specific violation and show the fix inline
- Don't lecture or quote the rule — state what's wrong and how to fix it

## Integration

The **golang** skill governs Go implementation; this skill governs `.templ` file authoring.

**Templates are renderers, not processors. When in doubt, move logic to Go.**
