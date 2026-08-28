# Go 1.25

Released August 2025. No language changes. Ships the concurrency-testing package that makes time-dependent tests
deterministic, and teaches the runtime about container CPU limits.

## Language

None. In the specification, core types were removed in favor of dedicated prose — a clarification, not a behavior
change.

## Standard library

- **`testing/synctest`** — `synctest.Test(t, func(t *testing.T) { ... })` runs a test function in a bubble where the
  `time` package uses a fake clock that jumps forward the moment every goroutine in the bubble blocks. `synctest.Wait()`
  blocks until all other goroutines in the bubble are blocked. This is the replacement for sleeping in concurrency
  tests.
- **`sync.WaitGroup.Go`** — `wg.Go(func() { ... })` adds to the counter, starts the goroutine, and calls `Done` on
  return. It removes the `Add(1)`/`defer Done()` pair and the mistakes that come with it.
- **`os.Root` gained the rest of the `os` surface** — `Chmod`, `Chown`, `Chtimes`, `Lchown`, `Link`, `MkdirAll`,
  `ReadFile`, `Readlink`, `RemoveAll`, `Rename`, `Symlink`, `WriteFile`.
- **`io/fs.ReadLinkFS`** — implemented by the filesystems from `os.DirFS` and `os.Root.FS`; `os.CopyFS` preserves
  symlinks for filesystems that implement it.
- **`testing.T.Output`** — an `io.Writer` onto the test's output stream, indented like `TB.Log` but without the file and
  line prefix.
- **`testing.T.Attr`** — emits a key-value attribute to the test log, surfaced as an `attr` action under `-json`.
- **`runtime/trace.FlightRecorder`** — records execution traces into an in-memory ring buffer; `WriteTo` snapshots the
  last few seconds when something interesting happens. Makes tracing viable for rare events.

## Runtime

- **`GOMAXPROCS` is container-aware.** On Linux the runtime honors the cgroup CPU bandwidth limit when it is lower than
  the logical CPU count, and on every OS it re-reads the limit periodically. Setting the `GOMAXPROCS` environment
  variable or calling `runtime.GOMAXPROCS` disables both behaviors, as do
  `GODEBUG=containermaxprocs=0,updatemaxprocs=0`.
- **Repanic output changed** — a recovered-and-repanicked value prints `panic: PANIC [recovered, repanicked]` rather
  than repeating the panic text.

## Toolchain

- **The `ignore` directive in `go.mod`** lists directories the `go` command skips when matching patterns such as `./...`
  or `all`. Their contents still ship in the module zip.
- **New `go vet` analyzers** — `waitgroup` (misplaced `sync.WaitGroup.Add`) and `hostport`
  (`fmt.Sprintf("%s:%d", host, port)` addresses, which break on IPv6 — use `net.JoinHostPort`).
- **Updating the `go` line no longer adds a `toolchain` line.**
- **The distribution ships fewer prebuilt tool binaries** — tools not used by build or test are built on demand by
  `go tool`.
- **Green Tea garbage collector** available under `GOEXPERIMENT=greenteagc`; default from [Go 1.26](go1.26.md).

## Traps

- **A compiler bug that masked nil dereferences was fixed.** Since Go 1.21 the compiler delayed the nil check past the
  error check, so code that used a result before testing `err` ran anyway. Such code now correctly panics. The fix is to
  check the error immediately after the call that produced it.

  ```go
  f, err := os.Open(name)
  name := f.Name() // panics from Go 1.25 when err != nil
  if err != nil {
      return
  }
  ```

- **`testing.AllocsPerRun` panics when parallel tests are running.** Its result was always meaningless in that case.
- **The Go 1.24 `synctest` API is still reachable** under `GOEXPERIMENT=synctest` but was removed in Go 1.26.
