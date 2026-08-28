# Messages and i18n

Zog fills `ZogIssue.Message` through a formatter. Four layers can supply the text, and a narrower layer wins: a message
already set on the issue, then the per-execution formatter, then the global formatter, then the built-in message map.

## Per test

```go
z.String().Min(5, z.Message("must be at least 5 characters"))
z.String().Required(z.Message("name is required"))

z.String().Min(5, z.MessageFunc(func(e *z.ZogIssue, ctx z.Ctx) {
	e.SetMessage(fmt.Sprintf("needs %v characters, got %v", e.Params["min"], e.Value))
}))
```

`z.MessageFunc` receives the issue with `Code`, `Value`, `Dtype`, and `Params` already set. This is the layer to reach
for first, because it changes one message and nothing else.

## Per execution

```go
errs := schema.Parse(data, &dest, z.WithIssueFormatter(func(e *z.ZogIssue, ctx z.Ctx) {
	e.SetMessage("override")
}))
```

The formatter runs for every issue in that call, so a partial implementation blanks the messages it does not handle.
Delegate the rest:

```go
z.WithIssueFormatter(func(e *z.ZogIssue, ctx z.Ctx) {
	if e.Code == zconst.IssueCodeRequired {
		e.SetMessage("this field is required")
		return
	}
	conf.DefaultIssueFormatter(e, ctx)
})
```

## Globally

`github.com/Oudwins/zog/conf` holds the global state. The message map is `zconst.LangMap`, which is
`map[ZogType]map[ZogIssueCode]string`.

**Mutate the map in place; never reassign the variable.**

```go
// Works: the formatter holds a reference to this map.
conf.DefaultIssueMessageMap[zconst.TypeString][zconst.IssueCodeRequired] = "this field is required"

// Silently does nothing: the formatter was built from the old map at package initialization.
conf.DefaultIssueMessageMap = es.Map
conf.DefaultErrMsgMap = es.Map
```

`conf.DefaultIssueFormatter` is built once, at initialization, by
`conf.NewDefaultFormatter(conf.DefaultIssueMessageMap)`, and `conf.IssueFormatter` is set to it. Replacing the map
variable leaves both pointing at the original map. To swap the whole map, build a formatter from it:

```go
conf.IssueFormatter = conf.NewDefaultFormatter(es.Map)
```

`conf.DefaultErrMsgMap` is a deprecated second variable that nothing reads. Assigning it has no effect at all, including
the assignment the upstream i18n page shows.

To replace the formatter wholesale rather than the map:

```go
conf.IssueFormatter = func(e *z.ZogIssue, ctx z.Ctx) {
	// handle the codes this program cares about, then:
	conf.DefaultIssueFormatter(e, ctx)
}
```

## Message templates

A message drawn from the map expands `{{value}}` to the offending input and `{{<param>}}` to each entry of the issue's
`Params` map. `z.Params(map[string]any{"min": 3})` supplies params to a custom test, so its message can carry `{{min}}`.

## i18n

`github.com/Oudwins/zog/i18n` ships `en` and `es` as first-party maps and `az` and `ja` as community maps. Each is a
package exposing `Map`.

```go
import (
	"github.com/Oudwins/zog/i18n"
	"github.com/Oudwins/zog/i18n/en"
	"github.com/Oudwins/zog/i18n/es"
)

func init() {
	i18n.SetLanguagesErrsMap(map[string]i18n.LangMap{
		"en": en.Map,
		"es": es.Map,
	}, "en", i18n.WithLangKey("lang"))
}

errs := schema.Parse(data, &dest, z.WithCtxValue(i18n.LangKey, "es"))
```

- `SetLanguagesErrsMap(m, defaultLang, opts...)` replaces `conf.IssueFormatter`. Anything assigned to that variable
  earlier is lost, so call it before any other global message configuration.
- The language key defaults to `"lang"`, exported as `i18n.LangKey`. `i18n.WithLangKey` changes it.
- A call with no language, and a call naming a language absent from the map, both fall back to `defaultLang` without an
  issue.
- `i18n.LangMap` and `zconst.LangMap` are the same type, so a custom language is a literal of that shape. Copy `i18n/en`
  and translate every entry: a code with no entry falls back to the type's `fallback` message, and a type with no entry
  produces an empty message.
