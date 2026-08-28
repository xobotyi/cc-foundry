# Go 1.23

Released August 2024. Adds iterators to the language, which turns `slices` and `maps` from convenience helpers into a
composable sequence API.

## Language

- **Range over function iterators.** A `for range` expression may be a function of one of these types:

  ```go
  func(func() bool)
  func(func(K) bool)
  func(func(K, V) bool)
  ```

  The loop body becomes the `yield` function; returning `false` from it stops the iteration.

## Standard library

- **`iter`** — `iter.Seq[V]` and `iter.Seq2[K, V]`, the named types every iterator-returning API uses, plus `iter.Pull`
  and `iter.Pull2` to drive a sequence one value at a time.
- **Iterators in `slices`** — `All` (index and value), `Values`, `Backward`, `Collect`, `AppendSeq`, `Sorted`,
  `SortedFunc`, `SortedStableFunc`, `Chunk`. Also `Repeat`.
- **Iterators in `maps`** — `All`, `Keys`, `Values`, `Insert`, `Collect`. From this version, `maps.Keys` returns an
  iterator, not a slice — collect it with `slices.Sorted(maps.Keys(m))` when a slice is needed.
- **`unique`** — `unique.Make[T]` canonicalizes a comparable value and returns a `unique.Handle[T]`. Two handles are
  equal exactly when the values were; comparing them is a pointer comparison.
- **`structs.HostLayout`** — a marker field type declaring that a struct's layout conforms to host-platform
  expectations. Required in types passed to or from host APIs.
- **`sync.Map.Clear`** and the atomic `And`/`Or` operators.

## Toolchain

- **`go vet` runs `stdversion`** — flags references to standard-library symbols newer than the file's effective language
  version, as determined by the `go` directive and any `//go:build` constraints.
- **The `godebug` directive** in `go.mod` and `go.work` declares a GODEBUG setting for the whole module or workspace,
  separating compatibility settings from the language version.
- **`go mod tidy -diff`** prints the changes as a unified diff and exits non-zero instead of writing them.
- **Telemetry** is opt-in via `go telemetry on`; the default collects local counters only.

## Behavior gated by the `go` directive

Timer semantics change only for modules declaring `go 1.23.0` or later:

- **Timers and tickers are collected without `Stop`.** An unreferenced `time.Timer` or `time.Ticker` becomes eligible
  for garbage collection immediately.
- **Timer channels are unbuffered.** After a `Reset` or `Stop` call, no value prepared before that call can still be
  received, which makes both methods usable correctly for the first time.

## Traps

- **`len` and `cap` of a timer channel are now 0.** Code that polled the length to predict whether a receive would
  succeed must use a non-blocking receive instead.
- **The `asynctimerchan=1` GODEBUG escape hatch is gone.** It reverted to buffered timer channels through Go 1.26 and
  was removed in [Go 1.27](go1.27.md).
