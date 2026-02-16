# Syntax Reference

## File Structure

templ files use `.templ` extension. They start with a package name and imports, like Go.

```templ
package main

import "fmt"
import "strings"

// Ordinary Go code outside components
var greeting = "Welcome!"

templ MyComponent(name string) {
    <div>{ name }</div>
}
```

Outside `templ` blocks = ordinary Go. Inside = templ syntax.

## Expressions `{ }`

Output Go values inside templ blocks. Content is automatically HTML-escaped.

Supported types: `string`, numbers (`int`, `uint`, `float32`, `complex64`, etc.),
booleans, and any type based on these (e.g. `type Name string`).

```templ
// Literals
<div>{ "print this" }</div>
<div>{ `backtick string` }</div>
<div>Number: { 42 }</div>

// Variables
<div>{ name }</div>
<div>{ p.Name }</div>

// Function calls
<div>{ strings.ToUpper(name) }</div>
<div>{ fmt.Sprintf("%d items", count) }</div>
```

### Error Propagation

Functions returning `(T, error)` propagate errors to `Render()`:

```templ
// If getString() returns an error, Render() returns that error
// with source location information
<div>{ getString() }</div>
```

### Auto-Escaping

All expressions are HTML-escaped. Dangerous content is neutralized:

```templ
// Input: `</div><script>alert('xss')</script>`
// Output: &lt;/div&gt;&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;
<div>{ userInput }</div>
```

## Elements

templ elements render HTML. All tags must be closed.

```templ
<div>Content</div>       // standard element
<img src="test.png"/>    // self-closing (void element)
<br/>                    // void — templ outputs <br> without /
```

templ is aware of void elements (`br`, `hr`, `img`, `input`, etc.) and strips the
closing `/` in output HTML. But the source must always include it.

templ automatically minifies HTML output.

## Control Flow

Bare Go keywords — no special syntax required.

### if/else

```templ
if user.IsAdmin {
    <span class="badge">Admin</span>
} else if user.IsMod {
    <span class="badge">Mod</span>
} else {
    <span>User</span>
}
```

### switch

```templ
switch user.Role {
    case "admin":
        <span>Admin</span>
    case "mod":
        <span>Moderator</span>
    default:
        <span>User</span>
}
```

### for loops

```templ
for i, item := range items {
    <li>{ fmt.Sprintf("%d", i) }: { item.Name }</li>
}
```

### Text Starting with Keywords

Text that starts with `if`, `for`, or `switch` triggers the parser. Two solutions:

```templ
// Wrap as expression
<p>{ "if you need this text" }</p>
<p>{ "for a rainy day" }</p>

// Capitalize the keyword
<p>If you need this text</p>
<p>For a rainy day</p>
```

If the parser finds these keywords without an opening `{`, it returns an error.

## Raw Go `{{ }}`

Scoped Go statements inside templ blocks. Use for intermediate variables:

```templ
{{ first := items[0] }}
{{ total := calculateTotal(items) }}
<p>{ first.Name } - total: { fmt.Sprintf("%d", total) }</p>
```

Avoid calling expensive functions twice — cache in a variable with `{{ }}`.

## Comments

**Inside templ blocks** — use HTML comments (rendered to output):

```templ
templ example() {
    <!-- This appears in the HTML output -->
    <!--
        Multiline HTML comment.
    -->
}
```

**Outside templ blocks** — use Go comments (not rendered):

```templ
package main

// Standard Go comment — not in output
var greeting = "Hello!"

templ hello(name string) {
    <p>{ name }</p>
}
```

Nested HTML comments are not supported.
