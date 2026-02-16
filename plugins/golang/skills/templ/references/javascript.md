# JavaScript Reference

## Script Tags

Standard `<script>` tags for client-side JavaScript:

```templ
templ page() {
    <script>
        function handleClick(event) {
            alert(event + ' clicked');
        }
    </script>
    <button onclick="handleClick(this)">Click me</button>
}
```

To render a `<script>` tag only once per response, use `templ.OnceHandle`
(see components reference for render-once details).

## Passing Go Data to JavaScript

### `templ.JSFuncCall` — Call Client Functions

Call a client-side function with server-side data. Arguments are JSON-encoded:

```templ
templ Alert(data CustomType) {
    <button onclick={ templ.JSFuncCall("alert", data.Message) }>Show</button>
}
```

Output:

```html
<button onclick="alert('Hello, from Go')">Show</button>
```

Invalid function names (containing `</script>` or expressions) are sanitized to
`__templ_invalid_function_name`.

Render as a standalone `<script>` element:

```templ
@templ.JSFuncCall("initApp", config.Name, config.Version)
```

Output:

```html
<script>initApp("MyApp", 42);</script>
```

### `templ.JSExpression` — Raw JS Expressions

Bypass JSON encoding for `event`, `this`, or other JS expressions:

```templ
<button onclick={
    templ.JSFuncCall("handler", templ.JSExpression("event"), "message")
}>Click</button>
```

Output:

```html
<button onclick="handler(event, 'message')">Click</button>
```

**Security warning**: `templ.JSExpression` outputs directly to HTML without
encoding. Only use with trusted compile-time constants.

### `templ.JSONString` — Data in Attributes

Encode Go data as a JSON string for HTML attributes:

```templ
<div x-data={ templ.JSONString(data) }>Content</div>
<button alert-data={ templ.JSONString(payload) }>Show</button>
```

Client-side access:

```javascript
const data = JSON.parse(button.getAttribute('alert-data'));
```

### `templ.JSONScript` — Data in Script Elements

Create a `<script type="application/json">` element with JSON data:

```templ
@templ.JSONScript("app-config", config)
```

Output:

```html
<script id="app-config" type="application/json">{"key":"value"}</script>
```

Client-side access:

```javascript
const config = JSON.parse(document.getElementById('app-config').textContent);
```

### Inline `{{ }}` Interpolation in Scripts

Interpolate Go data directly within `<script>` tags:

```templ
templ greeting(name string) {
    <script>
        // Inside JS strings — string-escaped
        const message = "Hello, {{ name }}";

        // Outside strings — JSON-encoded
        const data = {{ name }};
    </script>
}
```

Behavior differs by context:
- **Inside JS strings**: value is string-escaped
- **Outside JS strings**: value is JSON-encoded (quoted string, number, etc.)

templ auto-escapes to prevent XSS in both cases.

**Prefer `templ.JSONString` or `templ.JSONScript`** over inline interpolation —
separating data from code is easier to maintain and debug.

## IIFE Pattern for Scope Isolation

Prevent variables from leaking into global scope:

```templ
templ Interactive() {
    <div id="widget">...</div>
    <script>
        (() => {
            const widget = document.getElementById('widget');
            // Private scope — variables don't leak
        })();
    </script>
}
```

## Avoiding Inline Event Handlers

Best practice: separate behavior from markup using `templ.OnceHandle` + `data-*`
attributes + IIFE:

```templ
var helloHandle = templ.NewOnceHandle()

templ hello(label, name string) {
    @helloHandle.Once() {
        <script>
            function hello(name) {
                alert('Hello, ' + name + '!');
            }
        </script>
    }
    <div>
        <input type="button" value={ label } data-name={ name }/>
        <script>
            (() => {
                let el = document.currentScript.closest('div');
                let btn = el.querySelector('input[data-name]');
                btn.addEventListener('click', function() {
                    hello(btn.getAttribute('data-name'));
                });
            })()
        </script>
    </div>
}
```

This pattern:
1. Loads the shared function once via `templ.OnceHandle`
2. Passes server data via `data-*` attributes
3. Isolates initialization in an IIFE
4. Uses `document.currentScript` for DOM traversal relative to the script

## `templ.JSUnsafeFuncCall` — Bypass Sanitization

Identical to `templ.JSFuncCall` but skips function name sanitization. Arguments are still
JSON-encoded. Use only when the sanitizer incorrectly rejects a valid function name.

**Never use with user-provided input.** The function name is written directly to HTML output.

## Importing External Scripts

```templ
templ head() {
    <head>
        <script src="https://cdn.example.com/lib.js"></script>
        <script src="/assets/js/app.js"></script>
    </head>
}
```

For TypeScript/NPM projects, use `esbuild` to bundle into a single JS file,
then reference via `<script src="...">`.

## Method Summary

| Method | Purpose | Encoding |
|--------|---------|----------|
| `templ.JSFuncCall` | Call JS function with Go data | JSON-encoded args |
| `templ.JSExpression` | Raw JS expression (event, this) | None — raw output |
| `templ.JSONString` | Go data → JSON string for attributes | JSON + HTML-encoded |
| `templ.JSONScript` | Go data → `<script type="application/json">` | JSON |
| `{{ value }}` in scripts | Inline interpolation | Context-dependent |
| `templ.JSUnsafeFuncCall` | Bypass function name sanitization | None — **security risk** |
