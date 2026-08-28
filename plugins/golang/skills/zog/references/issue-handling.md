# Issue handling

Every `Parse` and `Validate` call returns `z.ZogIssueList`, which is `[]*z.ZogIssue`. The list is `nil` when nothing
failed.

## The ZogIssue

```go
type ZogIssue struct {
	Code    zconst.ZogIssueCode // the test that produced the issue, "required", "min", "email"
	Path    []string            // location in the data, nil at the root
	Value   any                 // the input value that failed
	Dtype   string              // the zconst.ZogType of the destination
	Params  map[string]any      // the test parameters, nil where a test has none
	Message string              // human readable and safe to show a user
	Err     error               // the underlying error, nil where there is none
}
```

- `issue.Message` is the only field written for an end user. `issue.Err` holds the raw cause — a JSON syntax error, a
  `strconv` failure — and belongs in a log, never in a response body.
- `issue.Error()` and `issue.String()` render the whole struct including `Err`.
- `issue.Unwrap()` returns `Err`, so `errors.Is` and `errors.As` reach through an issue.
- Every setter chains: `ctx.Issue().SetMessage("...").SetCode("...").SetPath([]string{"a"})`.

## Paths

`Path` is a slice of segments. Slice elements appear as `"[0]"`. A root issue on a primitive schema, and any issue the
input adapters raise before the schema runs, carries a `nil` path.

`issue.PathString()` and `z.Issues.FlattenPath(issue.Path)` produce the same string: segments joined with `.`, with an
index segment appended without a separator — `users[0].name`.

**A path segment is the input key, not the schema key and not the struct field name.** The same schema over the same
struct produces different paths per source, because each source resolves the field through its own tag:

```go
type T struct {
	FirstName string `json:"first_name" zog:"first-name"`
}
schema := z.Struct(z.Shape{"FirstName": z.String().Required().Min(5)})
```

- `schema.Parse(zjson.Decode(body), &t)` — path `first_name`, from the `json` tag
- `schema.Parse(map[string]any{...}, &t)` — path `first-name`, from the `zog` tag
- `schema.Validate(&t)` — path `first-name`, from the `zog` tag

A response contract that pins error keys to JSON field names therefore breaks when the same schema moves from `Parse` to
`Validate`. Where the keys must be stable, give every field a `zog` tag equal to its `json` tag.

## Formatting

### Flatten

`z.Issues.Flatten(errs) map[string][]string` — one entry per path, holding the messages in order. Root issues collect
under `zconst.ISSUE_KEY_ROOT`, the string `"$root"`.

```json
{
  "$root": ["slice must contain at least 3 items"],
  "user.name": ["string must be at least 3 characters"],
  "users[0].email": ["invalid email format"]
}
```

This is the default shape for a JSON error response.

### GroupByFlattenedPath

`z.Issues.GroupByFlattenedPath(errs) map[string]z.ZogIssueList` — the same keying as `Flatten`, holding whole issues
rather than messages. Reach for it when the response needs the code or the params, and as the migration path for code
written against the `ZogIssueMap` that schemas returned before v0.22.0.

### Treeify

`z.Issues.Treeify(errs) map[string]any` — a tree mirroring the data. Every node carries an `errors` array, even when
empty. Child objects sit under `properties`; slice elements sit under `items`. The `items` array runs to the last
failing index and holds `null` at every clean index before it, so its length does not match the input slice.

```json
{
  "errors": [],
  "properties": {
    "user": {
      "errors": [],
      "name": { "errors": ["string must be at least 3 characters"] }
    },
    "users": {
      "errors": [],
      "items": [{ "errors": [], "name": { "errors": ["string is required"] } }, null]
    }
  }
}
```

Reach for it where a client renders errors beside a nested form.

### Prettify

`z.Issues.Prettify(errs) string` — one line per issue prefixed `✖ `, with a second indented line `  → at <path>` where
the path is not empty. Built for a console or a fatal log line, not for a response body.

```
✖ string must be at least 3 characters
  → at user.name
✖ string is required
  → at users[0].name
```

## Pooling

Issues come out of a `sync.Pool`. Handing them back cuts allocations on a hot path.

- `z.Issues.Collect(errs)` returns every issue in the list to the pool.
- `z.Issues.CollectOne(issue)` returns one.
- `z.Issues.FlattenAndCollect(errs)` flattens and then collects, which is the safe combination — the map it returns
  holds copied strings and no pointers into the pool.

**An issue read after it is collected is a use-after-free.** The next `Parse` on any goroutine can hand the same struct
out and overwrite every field. Collect only at the point where the last read has already happened, and never collect a
list a caller still holds.

`z.Issues.Sanitize`, `SanitizeList`, `SanitizeAndCollect`, `SanitizeListAndCollect`, and `CollectList` are deprecated
spellings kept for callers written before v0.22.0.
