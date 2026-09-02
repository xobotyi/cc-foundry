# Intl and the Built-in Globals

## The rule that governs every Intl output

**`Intl` output is never a stable string.** The specification permits implementations to differ within the same locale,
and they do — V8, SpiderMonkey, and JavaScriptCore postprocess CLDR data differently, and a stripped-down build supports
fewer locales. The output routinely contains non-breaking spaces (U+00A0), narrow no-break spaces, and bidirectional
control characters that are invisible in a diff.

Consequences that decide how code is written:

- **Never compare an `Intl` result to a literal.** `expect(f.format(n)).toBe("$1,234.56")` fails on a different engine
  or a CLDR update. Snapshot instead, or assert with `formatToParts`.
- **Never parse an `Intl` result back into data.** Formatting is one-way. Keep the source value.
- **Pin the locale in a test.** An unqualified formatter follows the host's default and the test follows the machine.

## Which object

- **`Intl.NumberFormat`** — numbers, currency, percent, and units. Accepts a `string` or a `BigInt` as well as a number,
  which is how a value too large for a double is formatted exactly.
- **`Intl.DateTimeFormat`** — dates, times, and ranges through `formatRange`. Takes a `Date` or a `Temporal` plain type.
  A `Temporal.ZonedDateTime` is rejected because its zone is already fixed; call its own `toLocaleString`.
- **`Intl.RelativeTimeFormat`** — "yesterday", "in 2 days". `{ numeric: "auto" }` enables the special phrases.
- **`Intl.ListFormat`** — joining a list. `arr.join(", ")` is wrong in most languages and wrong in English, which needs
  a conjunction and has a serial-comma convention.
- **`Intl.DurationFormat`** — "3 hours, 4 minutes, 5 seconds", from a `Temporal.Duration` or a plain object with the
  same properties.
- **`Intl.PluralRules`** — selects the plural category (`one`, `few`, `other`, …) for a number. It does not pluralize a
  word; it tells you which of your forms to use. `n === 1 ? "apple" : "apples"` does not generalize past English.
- **`Intl.Collator`** — comparing and sorting text. `<` and the default `sort` comparator order by UTF-16 code unit, so
  `"ä"` sorts after `"z"`.
- **`Intl.Segmenter`** — grapheme, word, and sentence boundaries. This is the only correct way to count user-perceived
  characters or to split words in a language without spaces.
- **`Intl.DisplayNames`** and **`Intl.supportedValuesOf`** — building a locale, currency, or time-zone picker.

## Formatter reuse

Constructing a formatter searches the locale database. `toLocaleString(locale, options)` constructs one per call. Hoist
the formatter out of a loop or a render path and reuse it; the constructor is the expensive part, `format` is not.

## Other built-in globals

- **`structuredClone`** for a deep copy of data.
- **`Object.groupBy` and `Map.groupBy`** over a hand-written `reduce` into an accumulator.
- **`URL` and `URLSearchParams`** for anything resembling a URL. String concatenation and regular expressions both get
  encoding wrong.
- **`crypto.getRandomValues` and `crypto.randomUUID`** where a value must be unpredictable. `Math.random` is never
  suitable for a token, an identifier that must not be guessed, or a nonce.
- **`queueMicrotask`** to defer without allocating a promise, and **`AbortController`** as the cancellation protocol.
- **`globalThis`** rather than a host-specific global name.
