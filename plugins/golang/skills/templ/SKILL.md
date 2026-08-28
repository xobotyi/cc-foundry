---
name: templ
description: >-
  Write and review templ templates: syntax, components, attributes, styling, JavaScript data passing, escaping and
  sanitization, code generation, and testing.
when_to_use: >-
  Invoke whenever a `.templ` file is touched at all — writing, reviewing, refactoring, or debugging a template, a
  component, or a layout, and whenever Go code renders one. Also invoke on the symptoms: `templ generate` reports a
  parse error, markup arrives escaped in the browser, a class disappears when a condition flips, a `<script>` tag
  repeats per item, a URL renders as `about:invalid`, or an edited template renders its previous output. Covers
  `.templ` source and the templ runtime API; Go language conventions belong to the golang skill, and language-agnostic
  workflow to the coding skill.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

A templ template is a rendering function, not a program. Three biases decide most calls:

- **Compute in Go, render in templ.** Every transformation, validation, and I/O call belongs in a Go function that hands
  the template a finished value.
- **Escaping is automatic inside `.templ` source and nowhere else.** Every bypass carries a named API, and reaching for
  one is a decision to emit unchecked output.
- **`.templ` source and the generated `*_templ.go` are one artifact.** Neither is correct without the other.

## Syntax

- **`{ }` writes a value; `{{ }}` runs Go statements.** `html/template` gives `{{ }}` the opposite job, and that habit
  carries over silently.
- **`{ }` accepts `string`, the numeric types, `bool`, and any type defined on them.** Convert anything else with
  `fmt.Sprintf` first.
- **An expression returning `(T, error)` propagates its error out of `Render`**, with the source location attached.
- **Close every tag in the source, void elements included** — `<br/>`, `<img src="x"/>`. templ strips the `/` from void
  elements in the output, so the source form and the rendered form differ by design.
- **Text starting with `if`, `for`, or `switch` parses as a statement.** Wrap it as an expression — `{ "if you must" }`
  — or capitalize the keyword.
- **A comment inside a `templ` block is an HTML comment and reaches the output.** `//` and `/* */` work only outside a
  `templ` block, and HTML comments do not nest.
- **Bind an expensive call to a `{{ }}` variable** rather than repeating it across two `{ }` expressions.

Read [`${CLAUDE_SKILL_DIR}/references/syntax.md`] when `templ generate` reports a parse error, or when writing the first
template in a package — it carries the file layout, every control-flow form, and the escaping behavior with rendered
output.

## Components

- **A component can write part of its output before it returns an error.** Render into a `bytes.Buffer` and copy on
  success where the response must be all-or-nothing.
- **A code-only component escapes nothing on its own.** Wrap every interpolated value in `templ.EscapeString`, because
  `templ.ComponentFunc` writes exactly the bytes handed to it.
- **Declare every `templ.NewOnceHandle()` at package level.** `@templ.NewOnceHandle().Once()` written inline builds a
  fresh handle per call, so the guarded content renders every time.
- **Wrap a once-guarded asset shared across packages in an exported component.** The handle is package state and cannot
  be shared any other way.
- **A fragment suppresses output, not work.** `templ.WithFragments` and `templ.RenderFragments` execute the whole
  template and write only the named fragment.
- **`{ children... }` renders the block a caller passed as `@component() { ... }`.** A code-only component reads the
  same block from the context with `templ.GetChildren`.

Read [`${CLAUDE_SKILL_DIR}/references/components.md`] when composing components, passing one as a parameter, or
rendering a fragment — it carries the composition forms, the method-component and code-only shapes, the children context
API, and the fragment API.

## Attributes

- **A conditional attribute replaces the earlier attribute of the same name.** Values do not merge, so every branch
  repeats the base value.
- **`?=` renders a boolean attribute from a Go `bool`**: `<input disabled?={ locked }/>` emits the attribute or omits
  it.
- **Spread a `templ.Attributes` map with `{ attrs... }`.** A `bool` value renders the bare name or nothing, and
  `templ.KeyValue[string, bool]` renders `name="value"` only when the bool is true.
- **An attribute whose key comes from an expression is handled as a plain string.** An `href` or an `on*` handler built
  that way gets no URL sanitization and no JavaScript handling.
- **Never mutate a package-level `templ.Attributes` value.** It is one map shared by every concurrent render. Build a
  fresh `templ.Attributes{}` per call, or copy the package-level one with `maps.Clone` before changing it.

Read [`${CLAUDE_SKILL_DIR}/references/attributes.md`] when an attribute value or key is computed, or when a spread map
renders in an unexpected shape — it carries every attribute form with its rendered output.

## Escaping and Sanitization

- **`{ }` HTML-escapes its value; `@templ.Raw()` does not.** Pass `templ.Raw` only markup the program itself produced.
- **Only `href`, `src`, and `action` sanitize a dynamic URL.** Wrap a URL bound to any other attribute — an htmx
  `hx-get`, for example — in `templ.URL()`.
- **A constant URL is never sanitized.** `<a href="javascript:alert(1)">` written literally reaches the output
  unchanged.
- **`templ.SafeURL`, `templ.SafeCSS`, `templ.SafeCSSProperty`, and `templ.JSExpression` each switch a sanitizer off.**
  Pass them a compile-time constant, or a value the program built from data it owns.
- **`templ.JSUnsafeFuncCall` skips function-name sanitization.** Never build its function name from request data.
- **A sanitizer substitutes a fixed marker instead of failing.** `about:invalid#TemplFailedSanitizationURL` for a URL,
  `zTemplUnsafeCSSPropertyName` and `zTemplUnsafeCSSPropertyValue` for CSS, `__templ_invalid_function_name` for a
  JavaScript function name. A marker in the output names the sanitizer that fired.

## Styling

- **`class` takes a list of values**: `class={ "btn", templ.KV("btn-active", active) }`. `templ.KV` contributes its
  class when the bool is true.
- **Compute a class string in a `{{ }}` block only where the logic exceeds a set of independent toggles.**
- **A `css` block generates a hash-suffixed class name.** Pass the function result — `class={ primaryButton() }` — and
  never write the generated name into a stylesheet, a test selector, or client JavaScript.
- **A `css` block renders its `<style>` tag once per unique class per request; a raw `<style>` element renders every
  time.**
- **A `css` block taking arguments generates one class per distinct argument set.** Never call one with a value drawn
  from an unbounded range.

Read [`${CLAUDE_SKILL_DIR}/references/styling.md`] when a conditional class needs a form other than `templ.KV`, when the
`style` attribute takes a computed value, or when serving templ CSS as one stylesheet — it carries every class and style
value type, the CSS-component argument forms, and the `templ.NewCSSMiddleware` setup.

## JavaScript

- **Pass data as an attribute or a JSON script, never as interpolated code.** `data-config={ templ.JSONString(cfg) }`
  carries component-scoped data; `@templ.JSONScript("id", cfg)` carries page-level data.
- **`templ.JSFuncCall("fn", args...)` JSON-encodes its arguments.** It renders as an `on*` attribute value, or as a
  standalone `<script>` element when called with `@`.
- **`templ.JSExpression` passes `event` or `this` into `templ.JSFuncCall`** and emits its string verbatim.
- **Load a shared function once through a package-level `templ.OnceHandle`, bind per-instance data through `data-*`
  attributes, and wrap the setup in an IIFE** that finds its own element through `document.currentScript`.

Read [`${CLAUDE_SKILL_DIR}/references/javascript.md`] when wiring client behavior to a component — it carries the
rendered output of each API, the once-handle plus `data-*` plus IIFE pattern in full, and the bundling route for
TypeScript.

## View Models and Context

- **Give each template a view model built by a constructor in Go.** The template reads fields and ranges over slices; it
  opens no database, calls no service, and formats nothing Go could have formatted.
- **Test the constructor as ordinary Go.** A view model needs no rendering to be verified.
- **`ctx` is implicit in every component** and carries whatever the `Render` call carried.
- **Reserve the context for cross-cutting values** — the authenticated user, the locale, the theme — set by HTTP
  middleware and read through a getter returning `(T, bool)`. Pass everything else as a parameter, because a missing
  context value fails at render time and a missing parameter fails at compile time.

Read [`${CLAUDE_SKILL_DIR}/references/patterns.md`] when building a layout, wiring a context value through middleware,
or embedding `html/template` output — it carries the view-model, nested-layout, multi-slot, context-helper, and interop
shapes.

## Toolchain

- **Run `templ generate` after every `.templ` edit, before building, testing, or linting.** A stale `*_templ.go`
  compiles cleanly and renders the previous markup.
- **Commit every generated `*_templ.go`.** The Go build reads it and never runs templ.
- **`templ fmt` formats `.templ` files.** `gofmt` and `golangci-lint fmt` do not read them.
- **`templ generate -watch` is a development loop.** Run a plain `templ generate` before building a release artifact.

## Testing

- **Parse the rendered HTML; never assert on the string.** templ minifies its output, so whitespace and attribute order
  are not a contract.
- **Select with `data-testid`**, never with a class name or the document structure.
- **Compare a whole page with `htmldiff.Diff`** against an embedded fixture rather than with string equality.
- **Test a page for the presence of its child components**, and test each component's own rendering in its own test.

Read [`${CLAUDE_SKILL_DIR}/references/testing.md`] when writing the first test for a component or a page — it carries
the render-and-parse harness, the `htmldiff` snapshot form, and how to render a fragment under test.

## Application

When **writing** templ, apply these conventions silently — do not narrate a rule while following it. Where existing code
contradicts one, follow the codebase and flag the divergence once. Run `templ generate` before reporting that the change
builds.

When **reviewing** templ, cite the violation and show the fix inline. Do not lecture.

```
Bad:  "templ only sanitizes href, src, and action, so htmx attributes should be wrapped..."
Good: hx-get={ path } -> hx-get={ templ.URL(path) }
```

## Integration

The **golang** skill governs every line outside a `templ` block — naming, error handling, testing conventions, and the
Go toolchain — and wins on any question of how the Go code reads. This skill governs `.templ` source and the templ
runtime API. The **coding** skill governs workflow. All are active at once.

**When a template needs to decide something, move the decision into Go.**
