# Input adapters

`zhttp`, `zjson`, and `zenv` turn an external source into something `schema.Parse` accepts. Each returns a value that
goes in the first argument of `Parse`; none of them is used with `Validate`.

## zhttp

```go
import (
	z "github.com/Oudwins/zog"
	"github.com/Oudwins/zog/zhttp"
)

var userSchema = z.Struct(z.Shape{
	"Name": z.String().Required().Min(1),
	"Age":  z.Int().Required().GT(18),
})

func handleCreate(w http.ResponseWriter, r *http.Request) {
	var user User
	if errs := userSchema.Parse(zhttp.Request(r), &user); len(errs) > 0 {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(z.Issues.Flatten(errs))
		return
	}
}
```

### Which parser runs

`zhttp.Request(r)` picks a parser from the method first, then from the `Content-Type` header with its parameters cut off
at the first `;`.

- `GET` or `HEAD` — the query parser, whatever the header says
- `application/json` — the JSON parser, which is `zjson.Decode(r.Body)`
- `application/x-www-form-urlencoded` — the form parser, which calls `r.ParseForm` unless `r.Form` is already set
- `multipart/form-data` — the multipart parser, which reads `r.MultipartForm` and never populates it
- everything else, including a missing header — the query parser

The last rule is silent. A `POST` carrying a JSON body under `text/plain` parses the query string, finds nothing, and
reports every field as missing.

### Multipart

The multipart parser requires `r.MultipartForm` to be populated already. Call `r.ParseMultipartForm(maxMemory)` in the
handler first. Without it the parser returns one root issue with code `invalid_multipart_form` and the schema never
runs. Only `r.MultipartForm.Value` is read, so file parts never reach a schema.

### Query and form values

Both the query parser and the form parser wrap `url.Values`.

- A key absent from the request reads as `nil`, which is what `.Required()` reacts to.
- A key present with an empty value reads as `""`. `?name=` and a form field submitted empty both satisfy `.Required()`.
  Add `.Min(1)`.
- A key repeated in the request reads as `[]string`, so it feeds a `z.Slice` schema.
- A key ending in `[]` always reads as `[]string`, even with one occurrence.
- A single occurrence of a plain key reads as a `string`, and Zog coerces it into a one-element slice for a `z.Slice`
  schema.

The form parser resolves a struct field through the `form` tag; the query parser through the `query` tag. Both fall back
to the `zog` tag and then to the schema key.

### Replacing a parser

`zhttp.Config.Parsers` holds the four functions, each of type
`func(r *http.Request) func() (internals.DataProvider, *z.ZogIssue)`. Replacing one is the supported way to plug in a
form decoder that understands `foo[bar]=baz` bracket syntax, which zhttp does not. The `DataProvider` interface lives in
`github.com/Oudwins/zog/pkgs/internals` and carries no compatibility promise.

## zjson

```go
import "github.com/Oudwins/zog/parsers/zjson"

errs := userSchema.Parse(zjson.Decode(bytes.NewReader(body)), &user)
```

- `Decode(r io.Reader)` closes the reader when it also implements `io.Closer`, which is why `zhttp` hands it `r.Body`
  directly.
- The decoder targets `map[string]any`. A JSON array, a bare number, a bare string, and `null` all produce one root
  issue with code `invalid_json`, and the schema never runs.
- An empty body produces the same `invalid_json` issue.
- Struct fields resolve through the `json` tag, with `,omitempty` and any other suffix cut at the first comma. That cut
  arrived in v0.22.2.

## zenv

```go
import "github.com/Oudwins/zog/zenv"

var envSchema = z.Struct(z.Shape{
	"Port":   z.Int().GT(1000).LT(65535).Default(3000),
	"DBHost": z.String().Default("localhost"),
})

type Config struct {
	Port   int    `env:"PORT"`
	DBHost string `env:"DB_HOST"`
}

func Load() Config {
	var c Config
	if errs := envSchema.Parse(zenv.NewDataProvider(), &c); len(errs) > 0 {
		log.Fatal(z.Issues.Prettify(errs))
	}
	return c
}
```

- Every value is read through `os.Getenv` and passed through `strings.TrimSpace`.
- A variable that is unset, and a variable set to an empty or whitespace-only string, both read as `nil`. Both trigger
  `.Required()` and both take a `.Default()`.
- Struct fields resolve through the `env` tag, then the `zog` tag, then the schema key. A nested `z.Struct` reads flat
  environment variables, so give every leaf field its own `env` tag.
- Coercion turns the string into the destination type, so `z.Int()` and `z.Bool()` work without extra handling.

## Parsing a map directly

`Parse` accepts a map keyed by `string` whose value type is `any`, `string`, `int`, `float64`, or `bool`, and it accepts
a struct value or a pointer to one. Any other map value type, and any other kind, produces a coercion issue. With a
plain map or struct there is no source-specific tag, so field lookup uses the `zog` tag and then the schema key.
