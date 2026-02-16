# Styling Reference

## Class Attribute

### Static Classes

```templ
<button class="button is-primary">Click</button>
```

### Dynamic Classes

Pass Go expressions:

```templ
<button class={ className }>Click</button>
<button class={ "button", className }>Click</button>
```

The class expression accepts multiple values — all are added to output.

### Conditional Classes with `templ.KV`

Toggle classes based on booleans:

```templ
<button class={
    "button",
    templ.KV("is-primary", isPrimary),
    templ.KV("is-disabled", isDisabled),
}>Click</button>
```

`templ.KV` adds the class only when the boolean is true.

### Conditional Classes with Maps

```templ
<div class={ map[string]bool{
    "tab":        true,
    "tab-active": isActive,
} }></div>
```

### Conditional Classes with Raw Go

Use `{{ }}` blocks for complex class logic:

```templ
templ Tab(label string, active bool) {
    {{
        class := "tab"
        if active {
            class += " tab-active"
        }
    }}
    <div class={ class }>{ label }</div>
}
```

### Conditional Classes with Conditional Attributes

Use `if` inside element open tags:

```templ
templ Tab(label string, active bool) {
    <div
        class="tab"
        if active {
            class="tab tab-active"
        }
    >
        { label }
    </div>
}
```

Note: the conditional attribute replaces the previous value entirely — include base classes
in both branches.

### CSS Component Classes

CSS components (see below) can be used in class expressions:

```templ
css red() {
    background-color: #ff0000;
}

<button class={ "button", templ.KV(red(), isPrimary) }>Click</button>
```

## Style Attribute

### Static Styles

```templ
<button style="background-color: red">Click</button>
```

### Dynamic Styles

Multiple values are combined in output:

```templ
<button style={ style1, style2 }>Click</button>
```

Supported types for style values:

| Type | Example |
|------|---------|
| `string` | `"background-color: red"` |
| `templ.SafeCSS` | Bypasses sanitization |
| `map[string]string` | `map[string]string{"color": "red"}` |
| `map[string]templ.SafeCSSProperty` | Map with unsanitized values |
| `templ.KeyValue[string, bool]` | Conditional: include CSS if true |
| `templ.KeyValue[templ.SafeCSS, bool]` | Conditional unsanitized CSS |
| Functions returning any above | Single function may return `(T, error)` |

### Map Pattern

Useful for computed style sets:

```go
func getProgressStyle(percent int) map[string]string {
    return map[string]string{
        "width":      fmt.Sprintf("%d%%", percent),
        "transition": "width 0.3s ease",
    }
}
```

```templ
<div style={ getProgressStyle(75) } class="progress-bar"></div>
```

### KeyValue Pattern

Conditional style toggling:

```templ
<input
    type="text"
    style={
        templ.KV("border-color: #ff3860", hasError),
        templ.KV("background-color: #fff5f7", hasError),
        "padding: 0.5em 1em;",
    }
/>
```

### Bypassing Style Sanitization

Dynamic CSS values are sanitized by default. Bypass with `templ.SafeCSS`:

```go
func positionStyles(x, y int) templ.SafeCSS {
    return templ.SafeCSS(fmt.Sprintf(
        "transform: translate(%dpx, %dpx);", x*2, y*2,
    ))
}
```

```templ
<div style={ positionStyles(10, 20) }>Drag me</div>
```

Sanitized dangerous values become `zTemplUnsafeCSSPropertyValue`.

## CSS Components

Define scoped CSS with auto-generated class names:

```templ
css primaryButton() {
    background-color: #ffffff;
    color: { red };
}

css secondaryButton() {
    background-color: #ffffff;
    color: { blue };
}

templ Button(text string, isPrimary bool) {
    <button class={
        "button",
        secondaryButton(),
        templ.KV(primaryButton(), isPrimary),
    }>{ text }</button>
}
```

Output:

```html
<style type="text/css">.primaryButton_f179{background-color:#ffffff;color:#ff0000;}</style>
<button class="button primaryButton_f179">Click</button>
```

**Key behaviors:**
- Class names are auto-generated (hash-based) — don't rely on them being stable.
- CSS is rendered as `<style>` tags, once per HTTP request per unique class.
- Dynamic values inside `css` blocks use `{ expr }` syntax.

### CSS Components with Arguments

```templ
css loading(percent int) {
    width: { fmt.Sprintf("%d%%", percent) };
}

templ ProgressBar() {
    <div class={ loading(50) }></div>
    <div class={ loading(100) }></div>
}
```

Each unique argument combination generates a separate class.

### CSS Sanitization

Dynamic property names and values in `css` blocks are sanitized:

- Unsafe property names → `zTemplUnsafeCSSPropertyName`
- Unsafe property values → `zTemplUnsafeCSSPropertyValue`

Bypass with `templ.SafeCSSProperty`:

```templ
css rotation(degrees float64) {
    transform: { templ.SafeCSSProperty(fmt.Sprintf("rotate(%ddeg)", int(degrees))) };
}
```

## `<style>` Elements

Raw `<style>` tags render without modification:

```templ
templ page() {
    <style type="text/css">
        p { font-family: sans-serif; }
        .button { background-color: black; }
    </style>
    <p>Content</p>
}
```

Use CSS components instead if you need once-per-request deduplication.

## CSS Middleware

templ can serve a global stylesheet instead of inline `<style>` tags:

```go
c1 := primaryButton()
handler := templ.NewCSSMiddleware(httpRoutes, c1)
```

This adds a `/styles/templ.css` route. Include via
`<link rel="stylesheet" href="/styles/templ.css">` in your HTML.

Saves bandwidth by serving CSS once instead of per-request `<style>` tags.

## Pattern Summary

| Pattern | Best For |
|---------|----------|
| Static string | Simple, unchanging classes/styles |
| `templ.KV` | Conditional toggling of single class/style |
| `map[string]bool` | Multiple conditional classes |
| Raw Go `{{ }}` block | Complex class logic with intermediate variables |
| Conditional attribute | Replacing full attribute value based on condition |
| `map[string]string` | Computed style sets |
| `css` blocks | Component-scoped CSS with deduplication |
| `templ.SafeCSS` | Trusted dynamic CSS bypassing sanitization |
