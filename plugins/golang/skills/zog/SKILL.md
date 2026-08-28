---
name: zog
description: >-
  Write and review Zog schema validation in Go: schema shape, Parse against Validate, required and default semantics,
  tests and transforms, issue handling, and the zhttp, zjson, and zenv adapters.
when_to_use: >-
  Invoke whenever a Zog schema is touched at all — writing, reviewing, refactoring, or debugging a schema, a Parse or
  Validate call, a custom test, or a validation error response. Also invoke on the symptoms: Zog panics with "Struct is
  missing expected schema key", `Required()` accepts an empty form field, a test never runs on a zero value, an issue
  path does not match the JSON key, `Trim()` runs after the length check, or a global message override has no effect.
  Covers the Zog API; Go language conventions belong to the golang skill, and language-agnostic workflow to the coding
  skill.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

Zog is a Zod-shaped API over Go semantics, and the two disagree in ways that still compile. Import as
`z "github.com/Oudwins/zog"`. Three biases decide most calls:

- **A remembered Zod default is a defect until checked.** Fields are optional by default, `z.Enum` does not exist, and a
  schema key names a Go struct field rather than an input key.
- **`Parse` and `Validate` disagree about what missing means**, and that disagreement decides which tests in a chain run
  at all.
- **Zog panics on a schema its author built wrong, and never on input data.** A panic is a defect in the schema
  definition, fixed there.

## Schema Shape

- **A `z.Shape` key names a Go struct field, never an input key.** The first letter is case-corrected, so `"name"` and
  `"Name"` both bind to `Name`. A key matching no field panics with
  `Struct Schema Definition Error ... missing expected schema key`.
- **Struct tags map input keys and nothing else.** Resolution runs `json`, `form`, `query`, or `env` for the source in
  use, then `zog`, then the schema key as written.
- **`z.Struct(...).Required()` and `.Optional()` compile and do nothing.** An optional nested struct needs
  `z.Ptr(z.Struct(...)).NotNil()`.
- **Wrap the schema in `z.Ptr` wherever the destination field is a pointer.** A `z.Slice(...)` against a `*[]T` field
  panics with a type-cast error.
- **`z.Ptr` carries only `.NotNil()`.** Put `Required`, `Default`, `Catch`, `Test`, and `Transform` on the inner schema.
- **Declare every schema once, at package level.** A schema rebuilt per call costs roughly twice the time and several
  times the memory of a reused one, and the gap widens with the number of fields.
- **`Pick`, `Omit`, `Extend`, and `Merge` return shallow copies and are not type-checked.** A key naming no struct field
  panics at execution rather than failing to compile.

Read [`${CLAUDE_SKILL_DIR}/references/schema-catalog.md`] when reaching for a constructor, a validator, a test option,
or an issue code that is not already in the chain — it carries every schema type with its full method set and
signatures, the three option families, and the issue-code and type constants.

## Missing Values

`Parse` and `Validate` implement "missing" differently, and every rule below follows from that split.

- **`Parse` treats only a nil input as missing.** `z.String().Required().Parse("", &dest)` reports nothing, and an empty
  form field, an empty query parameter, and a JSON `""` all arrive present. Add `.Min(1)` where an empty value must
  fail.
- **`Validate` treats every Go zero value as missing**, so a legitimate `0`, `""`, or `false` fails `.Required()`.
- **A missing value skips every test on an optional schema.** Under `Validate` that means `z.Bool().True()` accepts
  `false`, `z.Int().GT(10)` accepts `0`, `z.Slice(...).Min(1)` accepts an empty slice, and a custom `TestFunc` never
  runs. Wrapping in `z.Ptr(...).NotNil()` does not change it, because the inner schema still short-circuits.
- **To reject a zero value under `Validate`, use `.Required()` and set its message** —
  `z.Bool().Required(z.Message("terms must be accepted"))`. No other test reaches the value.
- **`.Required()` runs before every test and transform, whatever its position in the chain.**
  `z.String().Trim().Required()` accepts `"   "` and then trims it to `""`.
- **`.Default` outranks `.Required` and applies in both modes**, so `Validate` replaces an explicitly set zero value
  with the default. Tests still run on the substituted value.
- **`.Catch` swallows every issue** — coercion failure, required, and each test — writes its value, and stops the chain.
  Keep it off anything whose failure must reach the caller.
- **Structs support neither `.Default` nor `.Catch`; slices support `.Default` but not `.Catch`.**

## Parse and Validate

- **`Parse(data, &dest, opts...)` at an IO boundary, `Validate(&value, opts...)` on an already-typed value.** Parse
  coerces the input; Validate does not, and allocates nothing on the success path.
- **Both destinations are pointers.** A value destination panics rather than reporting an issue.
- **`z.WithCoercer` is a `SchemaOption` and belongs on the constructor** — `z.String(z.WithCoercer(fn))`.
  `z.WithCtxValue` and `z.WithIssueFormatter` are `ExecOption`s and belong on `Parse` or `Validate`.
- **Read a per-execution value inside a test with `ctx.Get(key)`**, paired with `z.WithCtxValue(key, val)` at the call.

## Tests and Transforms

- **Chain position is execution order.** `z.String().Trim().Min(3)` measures the trimmed value; `.Min(3).Trim()`
  measures the raw one.
- **`.TestFunc(fn, opts...)` is Zod's `refine`; `.Test(z.Test[T]{Func: ...})` is `superRefine`**, and the latter adds
  its own issues with `ctx.AddIssue(ctx.Issue().SetMessage(...))`.
- **A primitive test receives a typed pointer; a struct, slice, or map test receives `any`** — assert it to the struct
  pointer inside the function.
- **The package-level `z.TestFunc(code, fn, opts...)` builds a reusable `z.Test[T]` for `.Test(...)`.** It takes an
  issue code as its first argument; the method of the same name does not.
- **`.Not()` negates only the next test** and prefixes that test's issue code with `not_`. The interface it returns
  omits `Min`, `Max`, `Test`, `TestFunc`, and a second `Not`.
- **A transform mutates through its pointer and returns an error to stop the chain.** `.Trim()` is a transform, so it
  runs where it sits rather than before the tests.
- **`z.Preprocess(fn, schema)` receives the raw input under `Parse` but a pointer to the value under `Validate`.** A
  type mismatch there panics rather than reporting an issue.

## Types Without a Built-In Schema

- **A named type over a primitive needs the `Like` constructor** — `z.StringLike[Env]()`, `z.IntLike[Status]()`. A plain
  `z.String()` against a `type Env string` field panics with a type-cast error.
- **A type Zog does not know takes `z.CustomFunc(fn, opts...)`**, which validates through a typed pointer and performs
  no coercion.
- **A wrapper such as `sql.NullString` takes `z.Boxed(schema, unbox, box)`**, added in v0.21.10.

Read [`${CLAUDE_SKILL_DIR}/references/custom-schemas.md`] when a value's Go type has no built-in schema, or its input
shape does not match one — it carries the named-type, `CustomFunc`, `Boxed`, and fully custom `z.Use` forms with working
code, the `Preprocess` contract, the coercion hooks, and the experimental map and recursive constructors.

## Issues

- **Every schema returns `z.ZogIssueList`, which is `[]*z.ZogIssue`; test it with `len(errs) > 0`.**
- **An issue path segment is the input key, not the schema key.** One schema yields `first_name` through `zjson` and
  `first-name` through `Validate`, because each source resolves the field through its own tag. Give a field a `zog` tag
  equal to its `json` tag where the error keys must stay stable across both.
- **A root issue carries a nil path** and flattens under `zconst.ISSUE_KEY_ROOT`, the string `"$root"`.
- **`issue.Message` is the only field safe to return to a user.** `issue.Err` holds the underlying cause and belongs in
  a log.
- **Never read an issue after `z.Issues.Collect`** — it returns the struct to a pool the next parse draws from.

Read [`${CLAUDE_SKILL_DIR}/references/issue-handling.md`] when a validation failure has to be shaped into a response
body, a template, or a log line — it carries the `ZogIssue` fields, the path rules per input source, and the rendered
output of `Flatten`, `GroupByFlattenedPath`, `Treeify`, and `Prettify`.

## Input Adapters

- **`zhttp.Request(r)` routes on method first, then on Content-Type**, and **falls through to query parsing for any
  unrecognized content type** — a JSON body sent as `text/plain` silently yields nothing.
- **Multipart requires `r.ParseMultipartForm` in the handler first.** Without it the parser reports
  `invalid_multipart_form` and the schema never runs.
- **`zhttp` and `zjson` parse into a struct only.** A JSON array, a bare primitive, and `null` each produce one
  `invalid_json` root issue.
- **An adapter failure produces one root issue and stops** — `invalid_json`, `invalid_form`, `invalid_multipart_form`,
  or `invalid_query`.
- **`zenv` trims every value and treats an empty variable as absent**, so `PORT=` triggers `.Required()` and takes a
  `.Default()`.

Read [`${CLAUDE_SKILL_DIR}/references/input-adapters.md`] when the input comes from an HTTP request, a JSON body, or the
environment — it carries the handler and config shapes, the content-type routing table, the query and form value rules
including repeated and `[]`-suffixed keys, and the parser override hook.

## Messages

- **Set a message on the test that produces it** — `z.Message("...")`, or `z.MessageFunc` for one built from `e.Params`
  and `e.Value`.
- **Reassigning `conf.DefaultIssueMessageMap` or `conf.DefaultErrMsgMap` silently does nothing.** The formatter closes
  over the map at package initialization. Mutate entries in place, or install a new formatter with
  `conf.IssueFormatter = conf.NewDefaultFormatter(m)`.

Read [`${CLAUDE_SKILL_DIR}/references/messages-and-i18n.md`] when an issue message must be overridden or served in more
than one language — it carries the four override layers with their precedence, the message template placeholders, and
the `i18n` setup with its language-key and fallback rules.

## Panics

A panic always names a schema definition error, never bad input. Four causes account for every one:

- a `z.Shape` key naming no struct field
- a destination passed by value rather than by pointer
- a schema whose type does not match the destination field
- a coercer returning a value of the wrong Go type

Fix the schema. Never wrap a `Parse` or `Validate` call in `recover`.

## Application

When **writing** Zog, apply these conventions silently — do not narrate a rule while following it. Declare schemas as
package-level variables and check every result with `len(errs) > 0`. Where existing code contradicts a convention,
follow the codebase and flag the divergence once.

When **reviewing** Zog, cite the violation and show the fix inline. Do not lecture. Treat a `.Required()` on a value
arriving from a form, a query string, or JSON as a defect until an emptiness test sits beside it.

```
Bad:  "Required only fires on a nil input, so an empty query parameter passes through..."
Good: z.String().Required() -> z.String().Required().Min(1)
```

## Integration

The **golang** skill governs every Go decision outside the Zog API — naming, error handling, testing conventions, and
the toolchain — and wins on any question of how the Go code reads. This skill governs schema definition and the Zog
runtime API, and its key-naming rule outranks Go naming inside a `z.Shape`. The **coding** skill governs workflow. All
are active at once.

Zog is pre-1.0 and breaks its API across minor versions. Read the version in `go.mod` before writing against anything
this skill anchors to one.

**A schema states what the data must be; the mode decides what missing means.**
