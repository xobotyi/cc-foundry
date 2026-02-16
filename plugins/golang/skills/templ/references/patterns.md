# Patterns Reference

## View Models

Separate display data from domain models. Keep template logic minimal:

```go
// Go file — data transformation
type CardProps struct {
    Title       string
    Description string
    ImageURL    string
    Actions     []Action
}

func NewCardProps(product Product) CardProps {
    return CardProps{
        Title:       product.Name,
        Description: truncate(product.Desc, 100),
        ImageURL:    product.PrimaryImage(),
        Actions:     productActions(product),
    }
}
```

```templ
// Template — pure rendering, no business logic
templ Card(props CardProps) {
    <div class="card">
        <img src={ props.ImageURL }/>
        <h3>{ props.Title }</h3>
        <p>{ props.Description }</p>
        for _, action := range props.Actions {
            @ActionButton(action)
        }
    </div>
}
```

Benefits:
- Template logic stays minimal — no database calls or complex transformations
- Easy to test — just test `NewCardProps` in pure Go
- Props struct documents what the template needs

## Layout Pattern

Use children for content injection:

```templ
templ BaseLayout(title string) {
    <!DOCTYPE html>
    <html>
        <head>
            <title>{ title }</title>
        </head>
        <body>
            { children... }
        </body>
    </html>
}

templ Page() {
    @BaseLayout("Home") {
        <main>
            <h1>Welcome</h1>
        </main>
    }
}
```

### Nested Layouts

Compose layouts by nesting:

```templ
templ AppLayout() {
    @BaseLayout("App") {
        @NavBar()
        <div class="content">
            { children... }
        </div>
        @Footer()
    }
}

templ DashboardPage() {
    @AppLayout() {
        <h1>Dashboard</h1>
    }
}
```

### Multiple Slots

Pass components as parameters for multiple content areas:

```templ
templ TwoColumnLayout(sidebar templ.Component) {
    <div class="layout">
        <aside>@sidebar</aside>
        <main>{ children... }</main>
    </div>
}
```

## Context for Cross-Cutting Data

Avoid prop drilling for auth, theme, locale. Use Go's `context` package.

### Define Context Helpers

```go
type contextKey string
var userKey = contextKey("user")

func WithUser(ctx context.Context, u User) context.Context {
    return context.WithValue(ctx, userKey, u)
}

func GetUser(ctx context.Context) (User, bool) {
    u, ok := ctx.Value(userKey).(User)
    return u, ok
}
```

### Use in Templates

templ components have an implicit `ctx` variable:

```templ
templ NavBar() {
    {{ user, ok := GetUser(ctx) }}
    <nav>
        if ok {
            <span>{ user.Name }</span>
        } else {
            <a href="/login">Login</a>
        }
    </nav>
}
```

### Set via Middleware

```go
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        user := getUserFromSession(r)
        ctx := WithUser(r.Context(), user)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### Context Guidelines

- **Prefer prop drilling** for direct parent-child data — it's simpler and type-safe.
- **Use context** for cross-cutting concerns (auth, theme, locale) that many components need.
- **Always use type-safe getters** — direct `ctx.Value(key).(Type)` panics on missing keys.
- **Private key types** — use `type contextKey string` to avoid collisions.
- Context is not strongly typed; errors only show at runtime, not compile time.

## Conditional Classes

See [styling.md](styling.md) for all class toggling approaches: `templ.KV`, maps, raw Go
blocks, and conditional attributes.

## Passing Data to JavaScript

Three approaches, ordered by preference:

1. **Data attributes** — `data-config={ templ.JSONString(data) }`. Preferred for
   component-scoped data.
2. **Script elements** — `@templ.JSONScript("id", data)`. Best for page-level configuration.
3. **Inline interpolation** — `{{ value }}` inside `<script>`. Least preferred — mixing
   data and code is harder to maintain.

See [javascript.md](javascript.md) for API details and examples.

## Interop with `html/template`

### Use Go Templates in templ

Embed existing `html/template` in templ components:

```templ
import "html/template"

var goTemplate = template.Must(template.New("ex").Parse("<div>{{ . }}</div>"))

templ Page() {
    <body>
        @templ.FromGoHTML(goTemplate, "Hello, World!")
    </body>
}
```

### Use templ in Go Templates

Convert templ component to `template.HTML`:

```go
templComponent := greeting()
html, err := templ.ToGoHTML(context.Background(), templComponent)
// Use html in text/html template
err = goTemplate.Execute(os.Stdout, html)
```

Useful for gradual migration from `html/template` to templ.

## Method Components Pattern

Use method components when a component has many configuration options — struct fields are
self-documenting and can have defaults. See [components.md](components.md) for definition
syntax and examples.
