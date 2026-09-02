# Regular Expressions

## Statefulness

`lastIndex` is the source of most regular-expression bugs that only appear on the second call.

- **A `g` or `y` regex mutates `lastIndex` on every `test` and `exec`.** A module-level `const pattern = /a/g` used by
  two calls alternates `true` and `false` on the same input, because the second call resumes from where the first
  stopped.
- **The fix is scope, not `lastIndex = 0`.** Build the regex inside the function, or drop `g` where you only need a
  boolean.
- **A literal in an expression position is a new object each evaluation.** `/x/g.exec(s)` and a later `/x/g.lastIndex`
  read two different regexes, so the second is always `0`.
- **`String.prototype.match` without `g` returns a match object with groups; with `g` it returns bare strings** and no
  index. `matchAll` always yields full match objects and **throws `TypeError` without `g`**.
- **`replace` with a string pattern replaces the first occurrence only.** Use `replaceAll`, which itself throws
  `TypeError` on a non-global regex.

## The `v` flag

`v` (`unicodeSets`) is a stricter superset of `u`, not a drop-in upgrade:

- Adds set difference `[[a-z]--[aeiou]]`, intersection `[[a-z]&&\p{ASCII}]`, nested classes, string literals in a class
  `[\q{ab|cd}]`, and properties of strings such as `\p{RGI_Emoji}`.
- **Properties of strings exist only under `v`.** `/\p{RGI_Emoji}/u` is a `SyntaxError`.
- **`v` forbids characters `u` allows raw inside a class.** `( ) [ ] { } / - \ |` must be escaped, so `[a{]` is valid
  under `u` and a `SyntaxError` under `v`.

Use `v` for anything that matches user text; use `u` only where a pattern already relies on the looser class syntax.

## Groups and flags

- **Named groups over positional.** `/(?<year>\d{4})-(?<month>\d{2})/` reads at the call site as `m.groups.year`, and
  the replacement form is `"$<month>/$<year>"`. A positional `$1` breaks silently when a group is inserted.
- **Duplicate named groups are legal across alternatives that cannot both match**: `/(?<v>a)|(?<v>b)/`.
- **Modifiers scope a flag to part of a pattern**: `(?i:abc)def` matches `ABCdef` and not `ABCDEF`. They are not flags
  on the literal and do not change `re.ignoreCase`.
- **The `d` flag adds `result.indices`** and `result.indices.groups`, giving the offsets of each capture.
- **`split` with a capturing group keeps the separator**: `"a1b".split(/(\d)/)` is `["a", "1", "b"]`. Use a
  non-capturing group when the separator is not wanted.

## Building a pattern from data

- **`RegExp.escape(str)`** escapes a string for literal use inside a pattern. Its output is not human-readable — it
  escapes leading identifier characters as hex, so `RegExp.escape("a.b")` is `"\\x61\\.b"`. Never show it to a user.
- **Never interpolate unescaped input into `new RegExp`.** A user-supplied `(` is a `SyntaxError` and a user-supplied
  `(a+)+$` is a denial-of-service.

## Backtracking

A pattern with nested unbounded quantifiers over an overlapping character set — `(a+)+`, `(\s*\w)*$`, `^(\w+\s?)*$` —
takes exponential time on a non-matching input. Any regex whose input comes from outside the program needs either a
bounded quantifier, an anchored and unambiguous structure, or a real parser. This is a security bug, not a performance
one: the fix is the pattern, not a timeout.

## When not to use a regex

A regular expression cannot parse a nested structure. Reach for a parser for HTML, JSON, and source code. Reach for
`URL`, `Intl.Segmenter`, or a date library rather than a pattern for URLs, word boundaries in non-Latin scripts, and
timestamps.
