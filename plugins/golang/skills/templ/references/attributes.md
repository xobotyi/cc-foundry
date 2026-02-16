# Attributes Reference

## Constant Attributes

Standard HTML attributes with double quotes:

```templ
<p data-testid="paragraph" class="container">Text</p>
```

## Dynamic String Attributes

Set attributes to Go expressions using `{ }`:

```templ
<div class={ className }></div>
<div data-id={ fmt.Sprintf("item-%d", id) }></div>
```

String values are automatically HTML-attribute-encoded (`<`, `>`, `&`, quotes become
HTML entities). This doesn't affect behavior.

Functions returning `(string, error)` propagate errors to `Render()`:

```templ
// If testID() returns error, Render() returns it with location
<p data-testid={ testID(true) }>Text</p>
```

## Boolean Attributes `?=`

Presence = true, absence = false. Use `?=` for dynamic booleans:

```templ
// Static boolean
<hr noshade/>

// Dynamic boolean — renders <input disabled> or <input> based on value
<input disabled?={ isDisabled }/>
<button hidden?={ !showButton }/>
```

## Conditional Attributes

Use `if` inside element open tags to conditionally add attributes:

```templ
<div
    class="base"
    if isHighlighted {
        class="highlighted"
    }
></div>
```

Note: the conditional attribute replaces the earlier one of the same name.

## Attribute Key Expressions

Dynamically set the attribute key:

```templ
<p { "data-" + suffix }="value">Text</p>
```

**Warning**: Key expressions don't get type-specific handling. URL attributes
(`href`) and event handlers (`on*`) defined via key expressions are treated
as plain strings without special sanitization.

## Spread Attributes

Append a dynamic map of attributes using `{ attrs... }`:

```templ
templ Button(attrs templ.Attributes) {
    <button { attrs... }>Click</button>
}

// Usage:
@Button(templ.Attributes{
    "class":    "btn-primary",
    "disabled": true,
})
```

`templ.Attributes` is `map[string]any`. Value behavior:

| Value Type | Rendering |
|------------|-----------|
| `string` | `name="value"` |
| `bool` | `name` (if true) or omitted (if false) |
| `templ.KeyValue[string, bool]` | `name="value"` if bool is true |
| `templ.KeyValue[bool, bool]` | `name` if both bools are true |

Spread attributes can be conditional:

```templ
<hr
    if shouldApply {
        { attrs... }
    }
/>
```

## URL Attributes

`href`, `src`, `action` auto-sanitize dynamic values. Dangerous schemes like
`javascript:` are replaced with `about:invalid#TemplFailedSanitizationURL`.

```templ
// Auto-sanitized (safe)
<a href={ userProvidedURL }>Link</a>

// Bypass sanitization — trusted source only
<a href={ templ.SafeURL(trustedURL) }>Link</a>
```

Constant values are NOT sanitized: `<a href="javascript:alert('hi')">` renders as-is.

### Non-Standard URL Attributes

For URL-containing attributes not recognized by templ (e.g. htmx `hx-get`):

```templ
<div hx-get={ templ.URL(fmt.Sprintf("/api/%s", id)) }></div>
```

`templ.URL()` sanitizes the URL without the special behavior of `href`/`src`/`action`.

## JavaScript Attributes

`onClick` and other `on*` handlers accept `templ.JSFuncCall` expressions:

```templ
// Call a client-side function with server data
<button onclick={ templ.JSFuncCall("alert", "Hello") }>Click</button>

// Passing event objects with templ.JSExpression
<button onclick={
    templ.JSFuncCall("handler", templ.JSExpression("event"))
}>Click</button>
```

**Warning**: `templ.JSExpression` bypasses JSON encoding — output goes directly
to HTML. Only use with trusted, compile-time constants like `"event"` or `"this"`.

## JSON Attributes

For attributes expecting JSON data (htmx `hx-vals`, Alpine `x-data`):

```templ
<div x-data={ templ.JSONString(data) }>Content</div>
<button alert-data={ templ.JSONString(payload) }>Show</button>
```

Or serialize manually:

```go
func countriesJSON() string {
    countries := []string{"Czech Republic", "Slovakia"}
    bytes, _ := json.Marshal(countries)
    return string(bytes)
}
```

```templ
<search-component suggestions={ countriesJSON() }/>
```
