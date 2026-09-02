# The `node` CLI and Runtime Flags

## Running scripts

`node --run <script>` (22.0.0) executes a `package.json` script without a package manager, prepending each ancestor's
`node_modules/.bin` to `PATH` and running in the directory holding the `package.json`. It is deliberately narrower than
`npm run`:

- **It does not run `pre` or `post` scripts.** A build that relies on `prebuild` silently skips it.
- **It sets no package-manager environment variables.** `npm_package_*` and friends are absent; `NODE_RUN_SCRIPT_NAME`
  and `NODE_RUN_PACKAGE_JSON_PATH` (22.3.0) are what it does set.
- **Variables loaded by `--env-file` are not passed to the spawned command.**
- **Arguments after `--` go to the script**: `node --run test -- --verbose`.

## Environment files

- **`--env-file=file`** (20.6.0; Stable from 22.21.0 and 24.10.0) loads `KEY=value` lines into `process.env`, throwing
  if the file is missing. **`--env-file-if-exists`** (22.9.0) does not throw.
- **The real environment wins** over the file. Multiple `--env-file` flags apply in order, each overriding the last.
- **Node's own configuration variables are honored from the file**, `NODE_OPTIONS` included — a `.env` file can
  therefore change how the runtime starts.
- **The file is read before the Permission Model initializes**, so `--permission` does not restrict which file is read.
- `#` starts a comment; values may be quoted with `` ` ``, `"`, or `'`.

## Configuration file

`--experimental-config-file[=path]` (22.16.0 and 23.10.0; Release candidate from 26.7.0) reads `node.config.json` and
applies its `nodeOptions` and `permission` sections. `--experimental-default-config-file` is the no-argument alias. The
space-separated `--experimental-config-file path` form is rejected — only `=` works. A `permission` section turns on
`--permission` implicitly.

## Watch mode

`--watch` (Stable from 22.0.0) restarts on changes to the entry point and everything it loads; `--watch-path` sets the
watched set explicitly, and `--watch-preserve-output` keeps the scrollback. `--watch-kill-signal` (24.4.0, Active
development) changes the signal sent on restart.

It cannot combine with `--check`, `--eval`, `--interactive`, or the REPL, and `--run` takes precedence over it. With no
file argument Node exits with status 9.

## `NODE_OPTIONS`

A space-separated flag list applied before command-line flags, so a command-line flag overrides it. Node refuses to
start when it contains a flag that is not permitted in the environment — `-p`, `-e`, or a script path. Quote a value
containing a space: `NODE_OPTIONS='--require "./my path/file.js"'`.

## Test runner surface

`node --test` runs files matching `**/*.test.{cjs,mjs,js}`, `**/*-test.*`, `**/*_test.*`, `**/test-*.*`, `**/test.*`,
and everything under `**/test/**`. The same patterns extend to `.cts`, `.mts`, and `.ts` unless `--no-strip-types` is
passed. Explicit glob arguments replace the defaults and must be quoted so the shell does not expand them.

- **`--test-isolation=process` is the default** — one child process per file, bounded by `--test-concurrency`. A file
  exiting non-zero is a failure whether or not it uses `node:test`.
- **`--test-isolation=none`** imports every file into the runner process and runs top-level tests with concurrency one.
  Global state then leaks between files, which is the trade for the speed.
- **Asynchronous work outliving a test is reported as a failure**, not ignored: a subtest created after its parent
  finished is marked failed immediately, and a late `uncaughtException` or `unhandledRejection` is attributed to the
  completed test as a top-level diagnostic.
- **`--test-force-exit`, `--test-timeout`, `--test-shard`, `--test-randomize`, and `--test-rerun-failures`** cover the
  CI cases that otherwise get scripted by hand.

## Single executable applications

Stability 1.1 - Active development.

- **`--build-sea=config`** (25.5.0) produces the executable in one step.
- **On Node 24 and earlier the path is two steps** — `node --experimental-sea-config sea-config.json` to build the blob,
  then a separate injection tool (`postject`) to put it into a copy of the `node` binary.
- The config selects `main`, `output`, and optionally `useSnapshot` and `useCodeCache` (both 20.6.0).
- One embedded entry script, CommonJS or ES module. Bundle first if the application is more than one file.

## Hardening flags

- **`--disable-proto=throw|delete`** removes or traps `Object.prototype.__proto__`, closing the prototype-pollution path
  that reaches it.
- **`--frozen-intrinsics`** (Stability 1) freezes `Array`, `Object`, and the rest. `--require` and `--import` run before
  the freeze so polyfills can still install. Code that patches a builtin at run time breaks under it.
- **`--secure-heap=n`** allocates an OpenSSL secure heap of `n` bytes (a power of two) for key material, with
  `--secure-heap-min` setting the minimum allocation. It is fixed-size, cannot be resized, and is unavailable on
  Windows.
- **`--disable-sigusr1`** (22.14.0 and 23.7.0; Stable from 22.20.0 and 24.8.0) removes the signal that opens the
  inspector, which is the one remote-debug entry point a process gets without asking.
