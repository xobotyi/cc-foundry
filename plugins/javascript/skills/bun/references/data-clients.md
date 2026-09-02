# Bundled Data Clients

Depth on the data clients Bun bundles: `bun:sqlite`, `Bun.sql`, `Bun.redis`, and `Bun.S3Client`.

## `bun:sqlite`

```ts
import { Database } from "bun:sqlite";
const db = new Database("app.db", { create: true, strict: true });
```

Constructor options: `readonly`, `create`, `strict`, `safeIntegers`. `":memory:"`, `""`, and no argument all open an
in-memory database. `import db from "./app.db" with { type: "sqlite" }` is equivalent to `new Database("./app.db")`.

### `strict` changes parameter binding, and silence is the default

Without `strict: true`, a bound parameter must carry its `$`, `:`, or `@` prefix, and a **missing parameter is not an
error**. A typo binds nothing and the query runs with a null:

```ts
notStrict.query("SELECT $message;").all({ messag: "Hello" }); // no error, wrong result
strict.query("SELECT $message;").all({ messag: "Hello" }); // throws
```

`strict: true` also allows binding without the prefix.

### `query()` caches, `prepare()` does not

`db.query(sql)` compiles the statement and caches it on the `Database`, keyed by the SQL string, holding the
`Database.MAX_QUERY_CACHE_SIZE` (default 20) most recent. Reusing a cached statement with different parameter values is
safe — parameters are bound fresh each call.

`db.prepare(sql)` returns an uncached statement. Use it for SQL generated at runtime; otherwise one-off queries evict
the statements that actually repeat.

Statement methods: `.all()`, `.get()`, `.run()`, `.values()` (arrays instead of objects), `.iterate()` (also the
`@@iterator`), `.as(Class)` to map rows onto a class, `.finalize()`, `.toString()`, and `.columnNames`.

### Integers past 2^53

SQLite integers are 64-bit and JavaScript numbers are not. By default `bun:sqlite` returns `number` and silently rounds
anything past 53 bits. `new Database(path, { safeIntegers: true })` returns `bigint` instead and validates that bound
`bigint` values fit in 64 bits, throwing `BigInt value '...' is out of range` when they do not.

### Transactions

```ts
const insert = db.prepare("INSERT INTO cats (name) VALUES ($name)");
const insertMany = db.transaction(cats => {
  for (const cat of cats) insert.run(cat);
});
```

The returned function runs the body inside a transaction and rolls back on a throw.

### Closing

`db.close(false)` (the default) finalizes statements created with `.query()` — the `Database` owns those — and lets
`.prepare()` statements keep working until they are finalized or collected. The underlying connection is released when
the last one goes.

`db.close(true)` finalizes every outstanding statement, releases the connection immediately, and throws if SQLite
reports an error. `using db = new Database(...)` calls `close(true)`.

A statement that `close()` finalized throws `Database has closed` on use; `toString()` returns an empty string and
`finalize()` stays safe. From 1.4.0 `close()` finalizes `db.query()` statements that were evicted from the cache too,
instead of throwing `database is locked`.

### WAL and its sidecar files

`db.run("PRAGMA journal_mode = WAL;")` is the right default for most applications.

WAL creates `-wal` and `-shm` files beside the database, and whether they survive `close()` depends on the platform. On
macOS, Bun uses the system SQLite, which Apple builds with persistent WAL, so both files **persist**. On Linux and
Windows, Bun links its own build following upstream defaults, and SQLite typically removes them. To get one behavior
everywhere:

```ts
import { Database, constants } from "bun:sqlite";
db.fileControl(constants.SQLITE_FCNTL_PERSIST_WAL, 0);
db.run("PRAGMA wal_checkpoint(TRUNCATE);");
db.close();
```

`db.serialize()` returns a `Uint8Array` of the whole database and `Database.deserialize(bytes)` reads one back.
`db.loadExtension(path)` needs a full SQLite build; `Database.setCustomSQLite(path)` selects one before the first open.

## `Bun.sql`

One tagged-template API over PostgreSQL, MySQL, MariaDB, and SQLite. `import { sql } from "bun"` is the default client
configured from the environment; `new SQL(url | options)` makes an explicit one.

The adapter is chosen from the connection string: `mysql://` or `mysql2://` for MySQL, `sqlite://` for SQLite, and
PostgreSQL as the fallback for everything else including `postgres://` and `postgresql://`. An options object takes
`adapter` explicitly. `DATABASE_URL` configures the default client.

Interpolated values are always parameters, never string-concatenated, so a tagged template is injection-safe.

### Building dynamic SQL safely

`sql()` is the escaping helper for the parts a parameter cannot express:

```ts
await sql`SELECT * FROM ${sql("public.users")}`; // identifier
await sql`UPDATE users SET ${sql(user, "name", "email")} WHERE id = ${user.id}`; // column subset
await sql`SELECT * FROM users WHERE id IN ${sql([1, 2, 3])}`; // value list
await sql`SELECT * FROM users WHERE id IN ${sql(users, "id")}`; // list from a key
await sql`SELECT * ${cond ? sql`AND age > ${min}` : sql``}`; // conditional fragment
```

`sql(object)` with no column names uses every key. `sql.array([...])` builds a PostgreSQL array literal
(`ARRAY['a','b']`) and is PostgreSQL-only.

### Query modes

- **Extended (default)** — parameterized, one statement per query.
- **``sql`...`.simple()``** — PostgreSQL's simple protocol: several statements in one query, **no parameters**. This is
  what migrations and setup scripts need.
- **`sql.file(path, params?)`** — runs a query from a file. With no parameters the file may hold several commands.
- **`sql.unsafe(string, params?)`** — raw SQL with no escaping. With no parameters it accepts several commands.

Under the SQLite adapter, `sql.file` and `sql.unsafe` also take an object of named parameters using `:name`, `$name`, or
`@name`. Keys keep their prefix (`{ ":id": 1 }`) unless the connection sets `strict: true`.

### Laziness and cancellation

A query does not start until it is awaited or `.execute()` is called. `.cancel()` on the query object stops a running
one.

```ts
const query = sql`SELECT * FROM users`.execute();
setTimeout(() => query.cancel(), 100);
```

### Pooling and reserved connections

The client pools connections and opens none until the first query. Options: `max`, `idleTimeout`, `maxLifetime`,
`connectionTimeout`.

`await sql.close()` drains outstanding queries and closes everything; `close({ timeout: 5 })` waits five seconds and
`close({ timeout: 0 })` closes at once.

`sql.reserve()` takes one connection out of the pool for work that must stay on a single session. **Release it** or the
pool leaks:

```ts
using reserved = await sql.reserve({ signal: AbortSignal.timeout(5000) });
await reserved`SELECT 1`;
```

`reserve()` waits when every connection is busy. An `AbortSignal` makes it give up without taking a connection; a signal
aborted after the promise resolved does nothing, so a connection already received still needs releasing.

### Prepared statements and PgBouncer

Bun creates named prepared statements for queries it infers are static. `prepare: false` keeps the extended protocol but
switches to unnamed prepared statements: still injection-safe, no pipelining, one command per query, and the server
plans each execution afresh. Set it for PgBouncer in transaction mode (PgBouncer 1.21.0 and later support protocol-level
named statements when configured for it), or when query plans must be regenerated. It costs throughput on queries that
repeat with different parameters.

### LISTEN / NOTIFY

`sql.listen(channel, handler)` and `sql.notify(channel, payload)` on PostgreSQL — a lightweight message bus for cache
invalidation or waking workers from a trigger calling `pg_notify`.

### Type decoding changes in 1.4.0

- MySQL `DATETIME` and `TIMESTAMP` decode as UTC, matching how `Bun.sql` encodes them, so a `Date` round-trips. Before,
  they came back shifted by the host's UTC offset on any machine not running in UTC. PostgreSQL `timestamp` read through
  `.simple()` decodes as UTC too; `timestamptz` is unaffected. Remove any offset correction.
- MariaDB 10.5+ `JSON` columns and JSON function results parse into objects instead of returning the JSON text. Remove
  the `JSON.parse()`.

## `Bun.redis`

`import { redis } from "bun"` is the default client; `new RedisClient(url)` makes an explicit one. Connection info comes
from `REDIS_URL`, then `VALKEY_URL`, then `redis://localhost:6379`. Redis 7.2 and later.

The connection opens on the first command, not at construction, and stays open afterwards. From 1.3.14 a `rediss://`
client verifies the server certificate against the host in the URL and rejects the first command with
`ERR_TLS_CERT_ALTNAME_INVALID` on a mismatch — reaching Redis by IP or through a `localhost` port-forward needs the
certificate's name or `tls: { rejectUnauthorized: false }`.

From 1.4.0, `new Bun.RedisClient("redis://host/notadb")` throws rather than silently connecting to database `0`.

## `Bun.S3Client`

`Bun.s3` is `new Bun.S3Client()` configured from the environment. Explicit credentials go to the constructor:
`accessKeyId`, `secretAccessKey`, `sessionToken`, `bucket`, `acl`, `endpoint`. Setting `endpoint` targets Cloudflare R2,
DigitalOcean Spaces, MinIO, Backblaze B2, or any other S3-compatible service.

`client.file(key)` returns a lazy `S3File` shaped like `BunFile`, so the same code reads a local file or an object:
`.text()`, `.json()`, `.bytes()`, `.stream()`, `.exists()`, `.delete()`, and `Bun.write(s3file, data)` to upload.
`.presign({ acl, expiresIn })` is synchronous and makes no network request. `Bun.s3.file(key).image()` feeds an object
straight into `Bun.Image`.

From 1.4.0 `S3Client.list()` entries expose `checksumAlgorithm`; the misspelled `checksumAlgorithme` still resolves but
is non-enumerable, so it no longer appears in `Object.keys()` or `JSON.stringify()`.
