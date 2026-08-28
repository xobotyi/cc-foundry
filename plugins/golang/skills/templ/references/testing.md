# Testing Reference

Rendering a component under test, asserting on parsed HTML, snapshot comparison, and fragment rendering.

## Render and Parse

Render the component into a pipe and hand the reader to `goquery`:

```go
func TestHeader(t *testing.T) {
    r, w := io.Pipe()
    go func() {
        _ = Header("Posts").Render(t.Context(), w)
        _ = w.Close()
    }()

    doc, err := goquery.NewDocumentFromReader(r)
    require.NoError(t, err)

    assert.Equal(t, "Posts", doc.Find(`[data-testid="header-title"]`).Text())
}
```

A `bytes.Buffer` works the same way and needs no goroutine:

```go
var buf bytes.Buffer
require.NoError(t, Header("Posts").Render(t.Context(), &buf))

doc, err := goquery.NewDocumentFromReader(&buf)
require.NoError(t, err)
```

Use the pipe form for a large page, where the buffer form holds the whole document in memory.

## Selecting

Mark every element a test asserts on with `data-testid`:

```templ
templ Header(title string) {
    <header data-testid="header">
        <h1 data-testid="header-title">{ title }</h1>
    </header>
}
```

- `doc.Find(sel).Length()` — presence and count
- `doc.Find(sel).Text()` — text content
- `doc.Find(sel).AttrOr("href", "")` — an attribute value

A class name is a styling decision and changes without notice. A CSS component class name is hash-suffixed and changes
whenever the block changes. Neither is a stable selector.

## Snapshot Comparison

Compare a whole page against an embedded fixture with `github.com/a-h/templ/generator/htmldiff`. It compares parsed
documents, so minification and attribute order do not produce a false failure.

`Diff` and `DiffCtx` both return three values — the rendered output, the diff, and an error. An empty diff means the
output matched. `Diff` renders with `context.Background()`, so use `DiffCtx` to pass the test context:

```go
//go:embed testdata/hello.html
var helloHTML string

func TestHello(t *testing.T) {
    _, diff, err := htmldiff.DiffCtx(t.Context(), Hello("Jane"), helloHTML)
    require.NoError(t, err)
    assert.Empty(t, diff)
}
```

Capture the first return value instead of discarding it when the test writes a new fixture.

Snapshot a page. Do not snapshot a component that a page test already covers — the fixture then fails on every unrelated
edit to that component.

## Rendering a Fragment

`templ.RenderFragments` writes only the named fragment, without an HTTP handler:

```go
var buf bytes.Buffer
require.NoError(t, templ.RenderFragments(t.Context(), &buf, Page(items), "results"))
```

Assert on the handler path with `templ.Handler` and `httptest`:

```go
h := templ.Handler(Page(items), templ.WithFragments("results"))

rec := httptest.NewRecorder()
h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

require.Equal(t, http.StatusOK, rec.Code)
```

The whole template still executes. A test proving a fragment is cheap to serve is proving nothing.

## What to Assert at Each Level

- **View model** — test the constructor as ordinary Go. No rendering, no HTML.
- **Component** — assert that each input field reaches the output, that a conditional branch renders both ways, and that
  a loop renders one element per item.
- **Page** — assert that each child component is present by its `data-testid`. Do not re-assert what the component test
  already covers.

## Context-Dependent Rendering

A component reading a context value needs that value in the test context:

```go
ctx := WithUser(t.Context(), User{Name: "Jane"})

var buf bytes.Buffer
require.NoError(t, NavBar().Render(ctx, &buf))
```

A missing context value renders the logged-out branch instead of failing, so assert on the branch that proves the value
arrived.
