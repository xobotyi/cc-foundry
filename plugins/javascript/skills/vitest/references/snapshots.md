# Snapshots

Depth on snapshot forms, serialization, updating, and the ways a snapshot silently stops testing anything.

## The four forms

- **`toMatchSnapshot()`** — writes to `__snapshots__/<file>.snap` beside the test. The header reads
  `// Vitest Snapshot v1`.
- **`toMatchInlineSnapshot()`** — Vitest writes the serialized value into the call site as a template literal argument.
  Reviewable in the diff without opening a second file, which is why it is the default choice for small values.
- **`toMatchFileSnapshot('./out.html')`** — an arbitrary file with its own extension, so the content keeps its syntax
  highlighting and needs no escaping of `"` or backticks. Must be awaited.
- **`toMatchScreenshot('name')`** — pixel comparison against a reference image. Browser mode only, and stable only when
  the reference and the comparison run in the same rendering environment.

`toThrowErrorMatchingSnapshot()` and `toThrowErrorMatchingInlineSnapshot()` snapshot a thrown error.

## Updating

`vitest -u` or `--update` rewrites every failing snapshot. In watch mode, `u` updates the one that just failed.

In CI (`process.env.CI` truthy), Vitest never writes: a mismatch fails, a **missing** snapshot fails, and an
**obsolete** snapshot fails. An obsolete snapshot is an entry whose test no longer exists — the usual cause is a renamed
test, and the usual mistake is deleting the assertion without deleting the entry.

`-u` on a red suite is how a broken behavior gets committed as expected. Read the diff first; update only when the
change is the intended one.

## Volatile values

A snapshot containing a timestamp, a generated id, a duration or a path fails on the next run and trains everyone to run
`-u`. Replace the volatile field with a property matcher, which asserts its shape and ignores its value.

```js
expect(user).toMatchSnapshot({
  id: expect.any(String),
  createdAt: expect.any(Date),
})
```

## Concurrent tests

Use the context-bound `expect` in a `concurrent` test. The global `expect` cannot tell overlapping tests apart, so it
attributes snapshots to the wrong test.

```js
test.concurrent('serializes', async ({ expect }) => {
  expect(value).toMatchInlineSnapshot()
})
```

## Serialization

Rendering goes through `@vitest/pretty-format`. `snapshotFormat` sets the global options; `snapshotSerializers` adds
serializer modules; `expect.addSnapshotSerializer` registers one at runtime.

A custom serializer implements `test(value)` and `serialize(value, config, indentation, depth, refs, printer)`. Call the
supplied `printer` for nested values rather than stringifying them, so nested serializers still apply.

`resolveSnapshotPath` moves where `.snap` files land; it is root-only and ignored in a project config.

## Custom snapshot matchers

Wrapping a snapshot matcher needs `Snapshots` from `vitest` (experimental, Vitest 4.1.3), not `jest-snapshot`.

```ts
import { Snapshots } from 'vitest'
const { toMatchSnapshot } = Snapshots

expect.extend({
  toMatchTrimmedSnapshot(received: string, length: number) {
    return toMatchSnapshot.call(this, received.slice(0, length))
  },
})
```

`.call(this, ...)` is required — the underlying matcher reads snapshot state from `this`.

## ARIA snapshots

`toMatchAriaSnapshot` and `toMatchAriaInlineSnapshot` (experimental, Vitest 4.1.4) capture an element's accessibility
tree in Playwright's YAML shape. They assert structure and meaning rather than pixels, which makes them stable under
styling changes that break a screenshot.

## Divergences from Jest

Four differences change committed content when a suite migrates:

- The header comment differs, so every `.snap` file shows a diff on the first run.
- `printBasicPrototype` defaults to `false`, so Vitest prints `[{ "foo": "bar" }]` where Jest below 29 prints
  `Array [ Object { "foo": "bar" } ]`. Set `snapshotFormat: { printBasicPrototype: true }` to keep the old output.
- A custom hint is separated with `>` instead of `: ` — `toThrowErrorMatchingSnapshot > hint 1`.
- `toThrowErrorMatchingSnapshot` records the full error, `[Error: error]`, where Jest records only `"error"`.
- Vitest 4 prints the contents of a custom element's shadow root. `snapshotFormat: { printShadowRoot: false }` restores
  the previous output.

Vue projects migrating from a jest-cli preset need `jest-serializer-vue` in `snapshotSerializers`, or every snapshot
fills with escaped quotes.
