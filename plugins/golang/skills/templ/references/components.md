# Components Reference

## Component Definition

Components compile to Go functions returning `templ.Component`:

```templ
templ headerTemplate(name string) {
    <header data-testid="headerTemplate">
        <h1>{ name }</h1>
    </header>
}
```

Generated Go:

```go
func headerTemplate(name string) templ.Component {
    // Generated contents
}
```

## The `templ.Component` Interface

```go
type Component interface {
    Render(ctx context.Context, w io.Writer) error
}
```

Components follow Go visibility rules: uppercase name = exported (public),
lowercase = unexported (private). Share components across packages by exporting them.

**Partial output warning**: A component may write partial output to `io.Writer`
before returning an error. To guarantee all-or-nothing, render to a buffer first.

## Composition with `@`

Call components with the `@` prefix:

```templ
@header()                    // same package
@components.Header()         // imported package
@nav.Item("Home", "/")       // with args
```

## Children

Pass content to a component:

```templ
@layout() {
    <p>This becomes children</p>
}
```

Receive children with `{ children... }`:

```templ
templ layout() {
    <main>
        { children... }
    </main>
}
```

### Children in Code-Only Components

Children are passed via context:

```go
// Pass children
ctx := templ.WithChildren(context.Background(), childComponent)
wrapChildren().Render(ctx, os.Stdout)

// Get children
children := templ.GetChildren(ctx)

// Prevent passing children further down
ctx = templ.ClearChildren(ctx)
```

## Components as Parameters

Pass components as values:

```templ
templ wrapper(content templ.Component) {
    <div class="wrapper">
        @content
    </div>
}

// Usage in templates:
@wrapper(someComponent())

// Usage in Go:
c := paragraph("Dynamic contents")
layout(c).Render(ctx, os.Stdout)
```

## Joining Components

Aggregate multiple components into one:

```templ
@templ.Join(header(), nav(), footer())
```

## Method Components

Attach components to types:

```templ
type Button struct {
    Text     string
    Variant  string
    Disabled bool
}

templ (b Button) Render() {
    <button
        class={ "btn btn-" + b.Variant }
        disabled?={ b.Disabled }
    >
        { b.Text }
    </button>
}
```

Call inline:

```templ
@Button{Text: "Submit", Variant: "primary"}.Render()
```

## Code-Only Components

Implement `templ.Component` in pure Go using `templ.ComponentFunc`:

```go
func button(text string) templ.Component {
    return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
        _, err := io.WriteString(w, "<button>"+templ.EscapeString(text)+"</button>")
        return err
    })
}
```

**Warning**: In code-only components, you must escape HTML yourself using
`templ.EscapeString`. The automatic escaping only applies to `.templ` files.

## Sharing Components

Components follow Go package rules:

- **Same package**: all components in the same directory are accessible to each other.
- **Cross-package**: export by capitalizing name, then import the package.

```templ
// components/header.templ — exported
package components

templ Header() {
    <header>Header</header>
}
```

```templ
// pages/home.templ — importing
package pages

import "myapp/components"

templ Home() {
    @components.Header()
}
```

Cross-module: `go get <module>` first, then import.

## Render-Once

Ensure content renders once per HTTP response (or per context):

```templ
var chartHandle = templ.NewOnceHandle()

templ Chart(data []Point) {
    @chartHandle.Once() {
        <script src="/js/charts.js"></script>
    }
    <div class="chart" data-points={ templ.JSONString(data) }></div>
}
```

**Critical**: Declare the handle at **package level**. Never inline:

```templ
// WRONG — new handle each time, content renders every time
@templ.NewOnceHandle().Once() { ... }

// CORRECT — reuses same handle
var handle = templ.NewOnceHandle()
@handle.Once() { ... }
```

### Cross-Package Dependencies

Export render-once components for shared dependencies:

```templ
// pkg/deps/deps.templ
package deps

var jqueryHandle = templ.NewOnceHandle()

templ JQuery() {
    @jqueryHandle.Once() {
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    }
}
```

```templ
// pkg/widget/widget.templ — jQuery included once regardless of how many widgets
package widget

import "myapp/pkg/deps"

templ Slider() {
    @deps.JQuery()
    <div class="slider">...</div>
}
```

Common use cases: shared `<script>`, `<style>`, or `<link>` tags.

## Fragments

Render subsections of templates, discarding all other output:

```templ
templ Page() {
    <div>Page Header</div>
    @templ.Fragment("content") {
        <div>Only this part can be rendered separately</div>
    }
}
```

### Rendering Fragments

With HTTP handler:

```go
handler := templ.Handler(Page(), templ.WithFragments("content"))
```

Without HTTP handler (e.g. static generation):

```go
w := new(bytes.Buffer)
err := templ.RenderFragments(ctx, w, Page(), "content")
```

The full template is still executed (all logic runs), but only the fragment's
output is written.

### Custom Fragment Keys

Avoid name clashes with typed keys:

```templ
type contentKey struct{}
var Content = contentKey{}

templ Page() {
    @templ.Fragment(Content) {
        <div>Fragment content</div>
    }
}
```

### Nested Fragments

Fragments can nest. Selecting the outer fragment includes inner fragments:

```templ
templ Page() {
    @templ.Fragment("outer") {
        <div>Outer Start</div>
        @templ.Fragment("inner") {
            <div>Inner Content</div>
        }
        <div>Outer End</div>
    }
}
```

Fragments are particularly useful for partial page updates (e.g. with htmx).
