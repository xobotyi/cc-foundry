# Arrays, Iteration, and Generators

## Choosing the loop

- **`for...of`** — side effects over any iterable; supports `break`, `continue`, and `await` in the body.
- **Array methods** (`map`, `filter`, `flatMap`, `find`, `some`, `every`, `reduce`) — building a new value from an
  existing one. They cannot be exited early except `find`, `some`, and `every`.
- **Iterator helpers** (`.map`, `.filter`, `.take`, `.drop`, `.flatMap` on an iterator) — a pipeline over a stream that
  is infinite, expensive, or larger than memory. Lazy: `g().map(f).take(3).toArray()` calls `f` three times.
- **`for` with an index** — only when the index itself is used, or when iterating backwards while mutating.
- **`for...in`** — never on an array, and rarely on an object. It walks inherited enumerable string keys, so it sees
  every property someone added to a prototype.

`forEach` earns a loop only when the callback is already a named function. It cannot `break`, cannot `await`, and
returns nothing.

## Holes

An array has "empty slots" — distinct from slots holding `undefined` — after `Array(5)`, `[1, , 3]`, an assignment past
`length`, a `length` increase, or `delete arr[i]`.

Which operations see a hole is not consistent, and this is the source of the bug:

- **Skipped**: `map` (which preserves the hole in the output), `forEach`, `filter`, `some`, `every`, `reduce`,
  `Object.keys`, `for...in`, object spread.
- **Treated as `undefined`**: indexed access, `for...of`, array spread, `Array.from`, `includes`, `join`, and every
  ES2023 copying method (`toSorted`, `toReversed`, `toSpliced`, `with`).
- **`sort` does neither.** It skips holes and compacts them past every value, `undefined` included, so `[1, , 3].sort()`
  keeps its hole at index 2 while the values move down.

`Array(3).map(() => 1)` returns three empty slots and calls the callback zero times. `[...Array(3)]` and
`Array.from({ length: 3 })` both produce `[undefined, undefined, undefined]` and are the correct way to build a dense
array of a known length. **Never use `delete` on an array element** — it makes a hole and leaves `length` unchanged;
`splice` or `filter` instead.

## Sorting

- **The default comparator is lexicographic on the string form.** `[1, 5, 10, 2].sort()` is `[1, 10, 2, 5]`. Always pass
  a comparator for numbers.
- **A comparator must return a number, and a boolean comparator diverges by engine.** `sort((a, b) => a > b)` yields
  `true`/`false`, which coerce to `1` and `0` and never to a negative, so the comparator is not a total order and the
  result is implementation-defined. `[3, 1, 2].sort((a, b) => a > b)` comes back `[3, 1, 2]` under V8 and `[1, 2, 3]`
  under JavaScriptCore. This is the worst class of sorting bug: it passes the test suite on one runtime and reorders
  data on another.
- **`sort` is stable** and specified as such from ES2019.
- **`sort` and `reverse` mutate.** Use `toSorted` and `toReversed` where the engine baseline allows, otherwise
  `[...arr].sort(cmp)`.
- **`localeCompare` and `<` disagree.** `["ä", "z"].sort((a, b) => (a < b ? -1 : 1))` is `["z", "ä"]` because `<`
  compares UTF-16 code units. Sort user-visible text with `Intl.Collator`.

## Strings

- **`.length` counts UTF-16 code units, iteration yields code points.** `"👍".length` is `2` while `[..."👍"].length` is
  `1`. Neither is what a user calls a character: a flag or a family emoji is several code points in one grapheme.
- **`Intl.Segmenter` with `granularity: "grapheme"` gives user-perceived characters**, `"word"` gives words in languages
  that do not use spaces, and `"sentence"` gives sentences. `str.split(/\s+/)` is not a word count.
- **Never index into a string to slice text.** A slice at an odd offset splits a surrogate pair and produces a lone
  surrogate; `isWellFormed()` detects one and `toWellFormed()` repairs it.

## Iterator protocol

- **An iterator that returns `this` from `[Symbol.iterator]()` is single-pass.** Generators do this, and so do iterator
  helpers. An iterable meant to be traversed more than once returns a fresh iterator each call.
- **Draining an iterator helper drains its source.** `it.toArray()` twice gives the full array and then `[]`.
- **`for...of` calls `return()` on early exit.** `break`, `throw`, and a `return` inside the loop all close the
  iterator, so a generator's `finally` block runs. `[...gen()]` and `Array.from` also close it. A hand-written `while`
  loop over `next()` does not — that is a resource leak in an iterator that holds a handle.
- **A value passed to the first `next()` is discarded**, because there is no suspended `yield` to receive it.

## Async iteration

- **`for await...of` over an array of promises is sequential.** The promises already started when the array was built,
  but the loop awaits them in order, so a slow first element delays a fast second.
- **A rejection in `for await` orphans the rest.** When the first element rejects, the loop throws and the remaining
  promises are never awaited — each becomes an unhandled rejection. Use `Promise.allSettled` when every input must be
  observed.
- **`Array.fromAsync` drains an async iterable in sequence**, awaiting each value before requesting the next.

## Map and Set

- **Use a `Map` when keys are not strings, come from outside the program, or when insertion order matters.** Object keys
  are stringified and reordered; `Map` keys are compared by SameValueZero and stay in insertion order.
- **`Map.prototype.getOrInsertComputed(key, fn)`** replaces the has/get/set triple lookup where the engine baseline
  allows it.
- **Mutating a `Map` or `Set` during iteration is defined, not forbidden.** Entries added during a traversal are
  visited; entries deleted before they are reached are not. Snapshot with `[...map]` when the body mutates.
- **`Set` methods need a set-like argument** — `size`, `has`, and `keys`. Passing an array throws `TypeError`.

## Generators

- **`yield*` delegates**, forwarding `next`, `throw`, and `return` to the inner iterable.
- **A generator's `finally` runs on `return()`**, which is what makes `try`/`finally` inside a generator a working
  cleanup mechanism.
- **`gen.throw(err)` raises at the suspended `yield`.** Uncaught inside, it propagates out of the `throw()` call and
  leaves the generator done.
- **An async generator queues its requests.** Concurrent `next()` calls do not interleave; they run in order.
