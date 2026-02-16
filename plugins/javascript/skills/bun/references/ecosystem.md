# Bun Ecosystem APIs

SQLite, WebSockets, bundler, plugins, and utilities.

## SQLite — `bun:sqlite`

Native high-performance SQLite3 driver. Synchronous API. 3-6x faster than
`better-sqlite3`.

### Database

```ts
import { Database } from "bun:sqlite";

const db = new Database("mydb.sqlite");             // file-based
const db = new Database(":memory:");                 // in-memory
const db = new Database("mydb.sqlite", { readonly: true });
const db = new Database("mydb.sqlite", { create: true });
const db = new Database("mydb.sqlite", { strict: true }); // throw on missing params
```

### Queries

```ts
// Prepared statements (preferred — cached and reusable)
const query = db.query("SELECT * FROM users WHERE id = $id");
query.get({ $id: 1 });         // single row or null
query.all({ $id: 1 });         // array of rows
query.run({ $id: 1 });         // execute, return changes info
query.values({ $id: 1 });      // array of arrays (no column names)

// Map results to class instances (no ORM needed)
class User { id!: number; name!: string; }
query.as(User).get({ $id: 1 }); // returns User instance
```

### Exec and Run

```ts
db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
db.run("INSERT INTO users (name) VALUES (?)", ["Alice"]);

// Multi-statement in single call
db.run("INSERT INTO t VALUES (1); INSERT INTO t VALUES (2);");
```

### Transactions

```ts
const insert = db.prepare("INSERT INTO users (name) VALUES ($name)");

const insertMany = db.transaction((users: { name: string }[]) => {
  for (const user of users) insert.run(user);
});

insertMany([{ name: "Alice" }, { name: "Bob" }]);
```

Transactions auto-rollback on exception. Nest transactions for savepoints.

### Parameters

Named (`$name`, `:name`, `@name`) and positional (`?`):

```ts
db.query("SELECT * FROM users WHERE id = ?").get(1);
db.query("SELECT * FROM users WHERE id = $id").get({ $id: 1 });
```

With `strict: true`, parameter prefix is optional and missing params throw.

### Features

- `BLOB` → `Uint8Array` automatic conversion
- `bigint` support via `{ safeIntegers: true }` on statements
- WAL mode: `db.exec("PRAGMA journal_mode = WAL")`
- Close: `db.close()` — also supports `using` / `Symbol.dispose`

## Bundler — `Bun.build()`

```ts
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun",           // "bun" | "browser" | "node"
  format: "esm",           // "esm" | "cjs" | "iife"
  minify: true,            // or { whitespace, identifiers, syntax }
  splitting: true,          // code splitting
  sourcemap: "external",   // "none" | "inline" | "external" | "linked"
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  external: ["express"],    // don't bundle these
  naming: "[dir]/[name]-[hash].[ext]",
});

if (!result.success) {
  for (const msg of result.logs) console.error(msg);
}
```

### Targets

| Target | Use case |
|--------|----------|
| `"bun"` | Bun server apps. Inlines `bun:*` imports. |
| `"browser"` | Client-side. Standard web APIs only. |
| `"node"` | Node.js apps. Preserves `node:*` imports. |

### HTML Entrypoints

```ts
await Bun.build({
  entrypoints: ["./index.html"],
  outdir: "./dist",
});
```

Processes `<script>`, `<link>`, and `<img>` tags. Supports CSS, TypeScript,
Tailwind.

## Plugins — `Bun.plugin()`

Extend Bun's module resolver and loader:

```ts
import { plugin } from "bun";

plugin({
  name: "yaml-loader",
  setup(build) {
    build.onLoad({ filter: /\.yaml$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      return { contents: `export default ${JSON.stringify(parse(text))}` };
    });
  },
});
```

Register plugins via `bunfig.toml`:

```toml
preload = ["./plugins/yaml.ts"]
```

## Macros

Compile-time code execution. Functions imported with `{ type: "macro" }` run at
bundle time and their return value is inlined:

```ts
// macro.ts
export function getVersion() {
  return "1.0.0";
}

// app.ts
import { getVersion } from "./macro" with { type: "macro" };
const version = getVersion(); // inlined as "1.0.0" at build time
```

Macros can only return serializable values (JSON-compatible, `Response`, `Blob`).

## Hashing & Passwords

### Password Hashing

```ts
const hash = await Bun.password.hash("password");       // argon2id default
const hash = await Bun.password.hash("password", "bcrypt");
const valid = await Bun.password.verify("password", hash);
```

### General Hashing

```ts
Bun.hash("data");                          // fast non-crypto hash (Wyhash)
const hasher = new Bun.CryptoHasher("sha256");
hasher.update("data");
hasher.digest("hex");                      // crypto hash
```

## Utilities

### Sleep & Timing

```ts
await Bun.sleep(1000);           // async sleep (ms)
Bun.sleepSync(1000);             // blocking sleep (ms)
Bun.nanoseconds();               // high-resolution timer
```

### UUID

```ts
Bun.randomUUIDv7();              // time-ordered UUID v7
crypto.randomUUID();             // standard UUID v4
```

### Comparison & Inspection

```ts
Bun.deepEquals(a, b);            // deep equality check
Bun.deepMatch(subset, obj);      // partial deep match
Bun.inspect(obj);                // like console.log format, returns string
Bun.peek(promise);               // read promise value without awaiting
```

### String & HTML

```ts
Bun.escapeHTML("<script>");      // &lt;script&gt;
Bun.stringWidth("hello");        // terminal column width
```

### Compression

```ts
Bun.gzipSync(data);             // gzip compress
Bun.gunzipSync(data);           // gzip decompress
Bun.deflateSync(data);          // deflate compress
Bun.inflateSync(data);          // deflate decompress
Bun.zstdCompressSync(data);     // zstd compress
Bun.zstdDecompressSync(data);   // zstd decompress
```

### Paths & URLs

```ts
Bun.fileURLToPath(url);          // file:// URL to path
Bun.pathToFileURL(path);         // path to file:// URL
Bun.which("node");               // resolve executable in PATH
Bun.resolveSync("./mod", dir);   // resolve module specifier
```

### Stream Helpers

```ts
await Bun.readableStreamToText(stream);
await Bun.readableStreamToJSON(stream);
await Bun.readableStreamToBytes(stream);
await Bun.readableStreamToBlob(stream);
await Bun.readableStreamToArray(stream);
await Bun.readableStreamToArrayBuffer(stream);
```

### Environment & Metadata

```ts
Bun.version;                     // Bun version string
Bun.revision;                    // Git commit hash
Bun.env;                         // alias for process.env
Bun.main;                        // path to entrypoint file
import.meta.dir;                 // directory of current file
import.meta.file;                // filename of current file
import.meta.path;                // full path of current file
```

## HTMLRewriter

Cloudflare-compatible HTML streaming transformer:

```ts
const rewriter = new HTMLRewriter()
  .on("a", {
    element(el) {
      el.setAttribute("target", "_blank");
    },
  })
  .transform(response);
```

Works on `Response` objects and strings. Useful for HTML post-processing.
