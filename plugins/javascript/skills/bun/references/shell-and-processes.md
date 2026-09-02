# Shell, Processes, and Workers

Depth on `Bun.$`, `Bun.spawn`, `Bun.spawnSync`, `Bun.Terminal`, and `Worker`.

## `Bun.$`

A bash-like interpreter written in Rust and run **in-process**. It never invokes `/bin/sh`, so its semantics are Bun's,
not the host shell's, and they are identical on Windows.

### Reading a result

- `await $\`cmd\``— resolves to`{ stdout, stderr, exitCode }`with`Buffer` bodies, and prints to the terminal unless
  quieted.
- `.text()` — stdout as a string; implies `.quiet()`.
- `.json()`, `.blob()`, `.lines()` (an async iterator), `.arrayBuffer()`.
- `.quiet()` — suppress the passthrough to the terminal.

### Redirection

`<`, `>`, `1>`, `2>`, `&>`, `>>`, `1>>`, `2>>`, `&>>`, `1>&2`, `2>&1`, and `|` all work as in bash. Both directions
accept JavaScript objects:

- **Into a command** — `Buffer` and every `TypedArray`, `ArrayBuffer`, `SharedArrayBuffer`, `Bun.file(path | fd)`, and
  `Response` (its body).
- **Out of a command** — the same buffer types (written through to the underlying storage) and `Bun.file(path | fd)`.

```ts
const buf = Buffer.alloc(100);
await $`echo "hi" > ${buf}`;
await $`cat < ${new Response("body")} | wc -w`;
```

### Configuration

`.env({...})` and `.cwd(path)` per command; `$.env({...})` and `$.cwd(path)` change the default for every command.
`$.env()` with no argument resets to the default. Commands inherit `process.env` unless told otherwise.

`.nothrow()` per command, or `$.nothrow()` / `$.throws(false)` globally, replaces the thrown `ShellError` with an
`exitCode` you check yourself. `ShellError` carries `exitCode`, `stdout`, and `stderr`.

### Builtins

`cd`, `ls` (with `-l`), `rm`, `echo`, `pwd`, `bun`, `cat`, `touch`, `mkdir`, `which`, `mv`, `exit`, `true`, `false`,
`yes`, `seq`, `dirname`, `basename`. Anything else comes from `PATH`. The unimplemented list is tracked in
`oven-sh/bun#9716`.

### Utilities and quirks

- **`$.braces("echo {1,2,3}")`** returns `["echo 1", "echo 2", "echo 3"]`.
- **`$.escape(str)`** exposes the escaping used for interpolation.
- **`${{ raw: str }}`** skips escaping. That is an injection surface — only for strings you built.
- **Backtick command substitution does not work.** Bun reads the template's `raw` property, so `` $`echo \`echo hi\``
  ``prints the literal backticks. Write`$(...)` instead.
- **`.sh` files run through Bun Shell**: `bun ./script.sh` uses the same cross-platform interpreter, not `/bin/sh`.
- **Operations run concurrently**, unlike bash, zsh, and other shells.

## `Bun.spawn`

`Bun.spawn(cmdArray, options)` or `Bun.spawn({ cmd, ...options })` returns a `Subprocess`.

### stdio defaults are asymmetric

- **`stdin`** — defaults to `null`. Also `"pipe"` (a `FileSink`), `"inherit"`, `Bun.file()`, `TypedArray`, `DataView`,
  `Response`, `Request`, `ReadableStream`, `Blob`, or a file descriptor.
- **`stdout`** — defaults to `"pipe"`. Also `"inherit"`, `"ignore"`, `Bun.file()`, or a file descriptor.
- **`stderr`** — defaults to `"inherit"`. Also `"pipe"`, `"ignore"`, `Bun.file()`, or a file descriptor.

`proc.stderr` is `undefined` until you pass `stderr: "pipe"`. With `stdin: "pipe"`, `proc.stdin` is a `FileSink`:
`write()`, `flush()`, `end()`.

`await proc.stdout.text()` reads the whole stream.

### Lifecycle

`proc.pid`, `proc.exited` (a promise), `proc.exitCode`, `proc.signalCode`, `proc.killed`. `proc.kill()`,
`proc.kill(15)`, and `proc.kill("SIGTERM")` all work. `onExit(proc, exitCode, signalCode, error)` fires on exit.

The parent Bun process does not terminate while a child is alive. `proc.unref()` detaches it.

`proc.resourceUsage()` after exit gives `maxRSS` and `cpuTime.user` / `cpuTime.system` in microseconds.

### Termination controls

`timeout: <ms>` kills the child after the duration, with `SIGTERM` by default; `killSignal` changes the signal and also
applies when an `AbortSignal` fires. `signal: controller.signal` aborts the process.

From 1.4.0, `timeout: NaN` throws `ERR_OUT_OF_RANGE` and `killSignal: 0` throws `ERR_UNKNOWN_SIGNAL` rather than
silently meaning "no timeout" and "no-op signal" while the child kept running. A `signal` that is already aborted throws
`AbortError` with `cause` set to `signal.reason` and no process is created; before, `Bun.spawn` started the child and
then killed it, and `Bun.spawnSync` ran it to completion. A NUL byte in `argv0` or `cwd` throws `ERR_INVALID_ARG_VALUE`.

`maxBuffer` (on `Bun.spawnSync`) kills the process once it emits that many bytes. Output can exceed the limit by at most
the single read that crossed it, matching Node.

### Linux cgroups (from 1.4.0)

`cgroup: "/sys/fs/cgroup/build-jobs"` (or an open directory descriptor) puts the child in a control group **before it
begins executing**, so memory, pid, and CPU limits apply from the first instruction and to everything the child spawns
in turn. Exceeding a memory limit OOM-kills a process inside the cgroup rather than reclaiming from the parent. Create
and configure the directory with ordinary file writes. Both cgroup v1 and v2 hierarchies work. The option is ignored on
other platforms; on Linux the spawn fails when the child cannot join.

### IPC

`ipc(message, childProc)` on the parent, `process.send()` and `process.on("message")` on the child — the same API as
`child_process.fork()`. The parent sends with `childProc.send(...)` and tears the channel down with
`childProc.disconnect()`.

`serialization` defaults to `"advanced"`, the JavaScriptCore `serialize` format, which clones everything
`structuredClone` does but transfers ownership of nothing. **Set `serialization: "json"` for IPC with a Node process** —
the two engines have different wire formats.

### `Bun.spawnSync`

Same options. Returns a `SyncSubprocess`: `success` (a zero exit code), `stdout` and `stderr` as `Buffer`, and no
`stdin`.

## `Bun.Terminal` (PTY)

Pass `terminal` to `Bun.spawn` and the child sees a real TTY — colors, cursor movement, interactive prompts — with no
`node-pty` addon. Write to the child through `proc.terminal.write()`.

With `terminal` set, `proc.stdin`, `proc.stdout`, and `proc.stderr` are all `null` — the terminal replaces them.

Options:

- **`cols`** — columns, default `80`.
- **`rows`** — rows, default `24`.
- **`name`** — terminal type for PTY configuration, default `"xterm-256color"`. Set the `TERM` variable separately
  through `env`.
- **`data(terminal, data)`** — called when data arrives from the terminal.
- **`exit(terminal, exitCode)`** — called when the PTY stream closes. `exitCode` is the PTY lifecycle status, `0` for
  EOF and `1` for error, **not** the subprocess exit code. Use `proc.exited` for that.
- **`drain(terminal)`** — called when the terminal is ready for more data.

Methods: `write()`, `resize(cols, rows)`, `setRawMode(bool)`, `ref()`, `unref()`, `close()`.

Construct a `new Bun.Terminal({...})` independently to run several commands through one session. Then `exit` fires when
you call `close()`, not when each subprocess ends, and `await using` disposes it.

### Platform differences

`openpty()` on Linux and macOS, ConPTY on Windows. The core contract holds everywhere; these do not:

- **No termios on Windows.** `inputFlags`, `outputFlags`, `localFlags`, and `controlFlags` read `0` and setting them
  does nothing. `setRawMode()` records the flag but the child controls its own console mode.
- **No echo without a child on Windows.** POSIX's line discipline echoes `write()` input back to `data` even with no
  process attached; ConPTY buffers it for the next reader.
- **ConPTY re-encodes output.** It renders to a virtual screen and emits VT sequences describing the result, so `data`
  receives semantically equivalent but not byte-identical escapes, and a short VT init sequence arrives before any child
  output.
- **Input `\r` is not translated to `\n` on Windows** — there is no `ICRNL`.
- **`SIGWINCH` does not reach the child under ConPTY** unless it reads stdin in raw mode, though
  `process.stdout.columns` and `rows` do update after `resize()`. This is a libuv limitation that affects Node too.
- **Before Windows 11 24H2 (build 26100), `terminal.close()` may not kill a running child promptly**, because
  `ClosePseudoConsole` blocks until conhost flushes. Kill the process first.

## Workers

`new Worker("./worker.ts")` is the Web Workers API with server-side extensions. From 1.4.0 `await worker.terminate()`
resolves only once the thread and every worker it spawned are gone, so a teardown that awaits it is deterministic.

- **No `{ type: "module" }` needed** — ES modules, CommonJS, TypeScript, JSX, and TSX all run with no build step.
- **The specifier resolves relative to the project root**, as if typed after `bun`.
- **A failed resolve emits an `"error"` event** on the `Worker` object rather than throwing.
- **`preload`** takes a specifier or an array of them, loaded before the worker's own code — the place for
  OpenTelemetry, Sentry, or Datadog initialization.
- **`blob:` URLs** create a worker from an in-memory source.
- In the worker file, `declare var self: Worker;` keeps TypeScript quiet about `self.onmessage`.
