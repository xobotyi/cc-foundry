# Configuration and Node.js Compatibility

## bunfig.toml

Optional Bun-specific configuration. Bun works without it — uses `package.json` and
`tsconfig.json` by default. Place in project root alongside `package.json`.

### Runtime Config

```toml
# Scripts to run before any file execution
preload = ["./preload.ts"]

# JSX config (also configurable in tsconfig.json)
jsx = "react"
jsxImportSource = "react"

# Reduce memory at cost of performance
smol = true

# Log level
logLevel = "debug"  # "debug" | "warn" | "error"

# Replace globals at compile time
[define]
"process.env.NODE_ENV" = "'production'"

# Custom file extension loaders
[loader]
".yaml" = "text"

# Disable automatic .env file loading
[env]
file = false
```

### Test Config

```toml
[test]
preload = ["./setup.ts"]
root = "./__tests__"
coverage = true
coverageThreshold = { line = 0.8, function = 0.8 }
coverageReporter = ["text", "lcov"]
coverageDir = "coverage"
coverageSkipTestFiles = false
retry = 3
timeout = 10000
randomize = false

[test.reporter]
dots = false
junit = "test-results.xml"
```

### Package Manager Config

```toml
[install]
exact = false              # use caret ranges by default
production = false         # install devDependencies
frozenLockfile = false     # allow lockfile updates
saveTextLockfile = true    # text bun.lock (default since v1.2)
auto = "auto"              # auto-install when no node_modules
linker = "hoisted"         # "hoisted" | "isolated"

registry = "https://registry.npmjs.org"

[install.scopes]
myorg = { token = "$NPM_TOKEN", url = "https://registry.myorg.com/" }

[install.cache]
dir = "~/.bun/install/cache"
disable = false
```

### Run Config

```toml
[run]
shell = "bun"     # "bun" | "system" — Bun shell or OS shell for scripts
bun = true        # auto-alias `node` to `bun` in scripts
silent = true     # suppress "Running..." messages
```

### Global Config

Global config at `$HOME/.bunfig.toml` or `$XDG_CONFIG_HOME/.bunfig.toml`.
Local overrides global (shallow merge). CLI flags override both.

## Package Manager — `bun install`

Drop-in replacement for npm/yarn/pnpm. ~25x faster.

### Commands

```sh
bun install                     # install all dependencies
bun install react               # add dependency
bun install -d typescript       # add dev dependency
bun install --production        # skip devDependencies
bun add react                   # alias for bun install
bun remove react                # remove dependency
bun update                      # update dependencies
bun pm ls                       # list installed packages
```

### Key Behaviors

- **Lockfile**: `bun.lock` (text, default since v1.2) or `bun.lockb` (binary)
- **Lifecycle scripts**: Does NOT run `postinstall` of dependencies by default
  (security). Add to `trustedDependencies` in `package.json` to allow.
- **Workspaces**: Supported via `package.json` `workspaces` field
- **Auto-install**: When no `node_modules` found, Bun resolves packages on the fly
- **`bunx`**: Execute package binaries without installing (like `npx`)

### trustedDependencies

```json
{
  "trustedDependencies": ["esbuild", "sharp"]
}
```

Required for packages with `postinstall` scripts.

## Environment Variables

Bun auto-loads `.env` files in this order:

1. `.env.local` (always, unless `NODE_ENV=test`)
2. `.env.development` / `.env.production` / `.env.test` (per `NODE_ENV`)
3. `.env`

Access via `process.env` or `Bun.env`:

```ts
process.env.API_KEY;    // standard Node.js way
Bun.env.API_KEY;        // Bun alias (same object)
```

Disable auto-loading: `bunfig.toml` `env = false` or `--env-file=""`.

Explicitly load specific files: `--env-file=.env.staging`.

## Node.js Compatibility

Bun aims for 100% Node.js API compatibility. If a Node.js package doesn't work in
Bun, it's considered a bug.

### Fully Compatible (use freely)

`node:assert`, `node:buffer`, `node:console`, `node:dgram`, `node:dns`,
`node:events`, `node:fs`, `node:http`, `node:net`, `node:os`, `node:path`,
`node:querystring`, `node:readline`, `node:stream`, `node:string_decoder`,
`node:timers`, `node:tty`, `node:url`, `node:zlib`

### Mostly Compatible (minor gaps)

| Module | Notes |
|--------|-------|
| `node:async_hooks` | `AsyncLocalStorage` works. `executionAsyncId` is a stub. |
| `node:child_process` | Missing `proc.gid`/`proc.uid`. No socket handle IPC. |
| `node:crypto` | Missing `secureHeapUsed`, `setEngine`, `setFips` |
| `node:http2` | Client & server work. Missing `allowHTTP1`, `pushStream`. |
| `node:https` | APIs work, `Agent` not always used. |
| `node:tls` | Missing `tls.createSecurePair` |
| `node:vm` | Core works. Missing `vm.measureMemory`. |
| `node:worker_threads` | Missing some `Worker` options (`stdin`, `stdout`). |
| `process` | `process.binding` partially. `process.title` is no-op on macOS/Linux. |

### Not Implemented

`node:repl`, `node:sqlite`, `node:trace_events`

### Web APIs

All standard Web APIs are available globally: `fetch`, `Request`, `Response`,
`Headers`, `URL`, `URLSearchParams`, `WebSocket`, `Crypto`, `TextEncoder`,
`TextDecoder`, `ReadableStream`, `WritableStream`, `AbortController`,
`structuredClone`, `FormData`, `Blob`, `Event`, `EventTarget`, `BroadcastChannel`,
`MessageChannel`, `MessagePort`, etc.

### Globals Available

- `__dirname`, `__filename` — work in ESM (Bun extension)
- `require()` — works in ESM (Bun extension)
- `import.meta.dir`, `import.meta.file`, `import.meta.path` — Bun-specific
- `import.meta.require()` — require from ESM context

### When to Use Node.js APIs vs Bun APIs

| Task | Prefer | Reason |
|------|--------|--------|
| HTTP server | `Bun.serve()` | Faster, declarative routing |
| File read/write | `Bun.file()` / `Bun.write()` | Optimized syscalls |
| Shell commands | `Bun.$` | Cross-platform, injection-safe |
| Process spawn | `Bun.spawn()` | Better API, faster |
| SQLite | `bun:sqlite` | Native, 3-6x faster |
| Testing | `bun:test` | Built-in, Jest-compatible |
| Password hashing | `Bun.password` | Built-in argon2id/bcrypt |
| Directory ops | `node:fs` | No Bun API yet |
| TCP/UDP sockets | `Bun.listen` / `Bun.connect` | Native, faster |
| Streams | Web Streams API | Standard, Bun-optimized |
| Crypto (general) | `node:crypto` / Web Crypto | Both work |

Rule: if `Bun.*` or `bun:*` has it, use it. Fall back to `node:*` only when
there's no Bun-native alternative or when portability to Node.js is required.
