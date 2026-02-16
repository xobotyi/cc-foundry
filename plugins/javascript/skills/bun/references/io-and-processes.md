# File I/O, Shell, and Processes

## File I/O

### Reading Files — `Bun.file()`

Creates a lazy `BunFile` reference (conforms to `Blob`). No disk read until content
is accessed.

```ts
const file = Bun.file("data.json");
file.size;                    // number of bytes
file.type;                    // MIME type
await file.exists();          // boolean

await file.text();            // string
await file.json();            // parsed JSON
await file.bytes();           // Uint8Array
await file.arrayBuffer();     // ArrayBuffer
file.stream();                // ReadableStream
```

Create from file descriptor or URL:

```ts
Bun.file(1234);                          // fd
Bun.file(new URL(import.meta.url));      // current file
```

Built-in stdio references:

```ts
Bun.stdin;   // readonly BunFile
Bun.stdout;  // BunFile
Bun.stderr;  // BunFile
```

Delete a file:

```ts
await Bun.file("logs.json").delete();
```

### Writing Files — `Bun.write()`

Multi-tool for writing. Accepts string, Blob, ArrayBuffer, TypedArray, Response.
Uses fastest syscall per platform (`copy_file_range`, `sendfile`, `clonefile`).

```ts
await Bun.write("output.txt", "hello");                    // string
await Bun.write("copy.txt", Bun.file("original.txt"));    // file-to-file
await Bun.write("index.html", await fetch("https://x.com")); // Response
await Bun.write(Bun.stdout, Bun.file("data.txt"));        // to stdout
```

### Incremental Writing — `FileSink`

```ts
const writer = Bun.file("output.txt").writer();
writer.write("chunk 1\n");
writer.write("chunk 2\n");
writer.flush();    // flush buffer to disk
writer.end();      // flush + close (required to let process exit)
```

Configure buffer size: `file.writer({ highWaterMark: 1024 * 1024 })`.

Call `writer.unref()` to avoid keeping the process alive.

### Directory Operations

No Bun-specific API — use `node:fs`:

```ts
import { readdir, mkdir } from "node:fs/promises";

const files = await readdir(".", { recursive: true });
await mkdir("path/to/dir", { recursive: true });
```

`import.meta.dir` gives the directory of the current file.

## Shell API — `Bun.$`

Cross-platform bash-like shell with JavaScript interop. Runs in-process (not
`/bin/sh`). Interpolated values are auto-escaped — injection-safe by default.

### Basic Usage

```ts
import { $ } from "bun";

await $`echo "Hello"`;                            // prints to stdout
const result = await $`echo "Hello"`.text();       // capture as string
const data = await $`echo '{"a":1}'`.json();       // capture as JSON
const { stdout, stderr } = await $`cmd`.quiet();   // suppress output
```

### Reading Output

| Method | Returns |
|--------|---------|
| `.text()` | `string` (auto-quiets) |
| `.json()` | Parsed JSON |
| `.lines()` | Async iterator of lines |
| `.blob()` | `Blob` |
| `await $\`...\`` | `{ stdout: Buffer, stderr: Buffer }` |

### Error Handling

Non-zero exit codes throw `ShellError` by default:

```ts
try {
  await $`failing-command`.text();
} catch (err) {
  console.log(err.exitCode, err.stderr.toString());
}
```

Disable throwing: `.nothrow()` — then check `exitCode` manually.

Configure globally: `$.nothrow()` or `$.throws(false)`.

### Piping and Redirection

```ts
await $`echo "hello" | wc -w`;           // piping
await $`echo "data" > output.txt`;        // redirect stdout to file
await $`cmd 2>&1`;                        // stderr to stdout
await $`cat < ${Bun.file("input.txt")}`;  // file as stdin
await $`cat < ${response}`;               // Response body as stdin
```

JavaScript objects as redirect targets: `Buffer`, `Uint8Array`, `Bun.file()`,
`Response`.

### Environment and Working Directory

```ts
await $`echo $FOO`.env({ ...process.env, FOO: "bar" });
await $`pwd`.cwd("/tmp");

// Global defaults
$.env({ FOO: "bar" });
$.cwd("/tmp");
```

### Built-in Commands

Cross-platform: `cd`, `ls`, `rm`, `echo`, `pwd`, `cat`, `touch`, `mkdir`, `which`,
`mv`, `exit`, `true`, `false`, `yes`, `seq`, `dirname`, `basename`.

### Security

- Interpolated variables are escaped — no command injection
- Argument injection is still possible (external commands interpret their own flags)
- Spawning a new shell (`bash -c`) bypasses Bun's protections

## Child Processes — `Bun.spawn()`

### Async API

```ts
const proc = Bun.spawn(["bun", "--version"], {
  cwd: "./subdir",
  env: { ...process.env, FOO: "bar" },
  onExit(proc, exitCode, signalCode, error) { /* ... */ },
});

proc.pid;                          // process ID
const output = await proc.stdout.text(); // read stdout
await proc.exited;                 // wait for exit
proc.exitCode;                     // number | null
proc.kill();                       // SIGTERM
proc.kill("SIGKILL");              // specific signal
proc.unref();                      // detach from parent
```

### stdin Options

| Value | Description |
|-------|-------------|
| `null` | No input (default) |
| `"pipe"` | Returns `FileSink` for writing |
| `"inherit"` | Inherit parent stdin |
| `Bun.file()` | Read from file |
| `ReadableStream` | Pipe stream |
| `Response` | Use response body |

### stdout/stderr Options

| Value | Description |
|-------|-------------|
| `"pipe"` | Default stdout — `ReadableStream` |
| `"inherit"` | Default stderr — inherit parent |
| `"ignore"` | Discard |
| `Bun.file()` | Write to file |

### AbortSignal and Timeout

```ts
const controller = new AbortController();
const proc = Bun.spawn({ cmd: ["sleep", "100"], signal: controller.signal });
controller.abort();

// Auto-kill after timeout
Bun.spawn({ cmd: ["sleep", "10"], timeout: 5000, killSignal: "SIGKILL" });
```

### IPC Between Bun Processes

```ts
// parent.ts
const child = Bun.spawn(["bun", "child.ts"], {
  ipc(message, child) { child.send("reply"); },
});
child.send("hello");

// child.ts
process.on("message", msg => console.log(msg));
process.send("from child");
```

For Bun-Node IPC, use `serialization: "json"`.

### Sync API — `Bun.spawnSync()`

Blocking. Returns `{ stdout: Buffer, stderr: Buffer, exitCode, success }`.

```ts
const { stdout, success } = Bun.spawnSync(["echo", "hello"]);
```

Rule of thumb: `spawnSync` for CLI tools, `spawn` for servers.

## Workers

```ts
const worker = new Worker(new URL("worker.ts", import.meta.url));
worker.postMessage("ping");
worker.onmessage = (event) => console.log(event.data);
```

Workers run in separate threads. Use `postMessage` / `onmessage` for communication.
Supports `structuredClone` for data transfer.
