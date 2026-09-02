# HTTP and WebSocket Server

Depth on `Bun.serve`: route value shapes, directory serving, server lifecycle, and WebSockets.

## Route values

A route key maps to one of five value shapes. Each has different caching, `404`, and range behavior.

- **Handler function** — `(req: BunRequest) => Response | Promise<Response>`. Receives `BunRequest`, which extends
  `Request` with `params` and `cookies`. Second argument is the `Server`.
- **Per-method object** — `{ GET: handler, POST: handler }`. A `HEAD` request falls to the `GET` handler when no `HEAD`
  key exists (from 1.4.0; before that it fell through to the next route or `404`).
- **`Response` instance** — dispatched with zero allocation after startup and cached for the server's lifetime.
  `server.reload()` is the only way to change it.
- **`Bun.file(path)` or `new Response(Bun.file(path))`** — read per request. Sends `Last-Modified`, honors
  `If-Modified-Since` and `If-None-Match` with `304`, honors `Range` with `206`, and answers `404` when the file is
  gone.
- **`{ dir: "./public" }`** (from 1.4.0) — serves a directory tree. The route key must end in `/*`. Below 1.4.0 the
  object is read as a framework config and `Bun.serve` throws at startup asking for React packages, which names nothing
  about the route.

`new Response(await Bun.file(p).bytes())` and `new Response(Bun.file(p))` are not the same route. The first buffers the
bytes at startup: no filesystem I/O per request, automatic `ETag`, but a missing file is a startup error rather than a
runtime `404`, and the whole file sits in RAM. The second streams from disk through `sendfile(2)`.

## Directory routes (from 1.4.0)

Bun percent-decodes the path once after the prefix and opens it relative to `dir`. A non-canonical path — one containing
`.`, `..`, an empty segment, `%2F`, or a `%XX` encoding a character legal in a path segment — is rejected with `404`. On
Linux the open uses `openat2(RESOLVE_IN_ROOT)`, so the kernel clamps symlinks that would escape.

Routing is case-sensitive while macOS and Windows filesystems are not. A case-varied URL (`/static/Admin/secret.txt`)
therefore matches the directory wildcard rather than a sibling `/static/admin/*` handler, and still opens
`admin/secret.txt`. Keep access-controlled content outside `dir` rather than gating it with an overlapping route.

Directory responses set `Content-Type` from the extension, send `Last-Modified` and a weak `ETag`
(`W/"<size>-<mtime>"`), honor conditional and range requests, serve `index.html` for a directory with a trailing slash,
and `301`-redirect a directory URL without one. `statCache: false` disables the per-path `Last-Modified` cache and saves
roughly 20 KB per route.

## Cookies

`req.cookies` is a `CookieMap`. Under `routes`, `Bun.serve` tracks `set()` and `delete()` calls and emits the
`Set-Cookie` headers on the response by itself. Under the bare `fetch` handler nothing is tracked — build the header
yourself, or construct `new Bun.CookieMap(req.headers.get("cookie"))` for reading.

`delete()` emits a `Set-Cookie` with an empty value and an `Expires` in the past. Pass the same `path` the cookie was
set with, or the deletion does not match.

## Server lifecycle

- **`server.reload({ routes, fetch, error, websocket })`** — replaces handlers on a running server. Only those four
  keys. This is how a static `Response` route changes without a restart.
- **`await server.stop()`** — closes idle keep-alive connections at once, closes busy ones after their response is sent,
  and resolves when the last connection closes. A connection that sent a partial request and stopped keeps the promise
  pending; `server.stop(true)` closes those too and works after a graceful `stop()` has already started.
- **`server.closeIdleConnections()`** — closes keep-alive connections that are not serving a request and returns the
  count. In-flight requests and open WebSockets are untouched, and the server keeps accepting.
- **`server.ref()` / `server.unref()`** — whether the server keeps the process alive.
- **`server.fetch(request)`** — dispatches a request against the running server in-process. Useful in tests without a
  socket.

## Metrics and per-request controls

- `server.pendingRequests`, `server.pendingWebSockets` — live counters.
- `server.subscriberCount(topic)` — subscribers on a pub/sub topic.
- `server.requestIP(req)` — `{ address, port }`, or `null` for a closed request or a Unix socket.
- `server.timeout(req, seconds)` — per-request idle timeout override; `0` disables it. Over HTTP/2 the timeout belongs
  to the connection, so the most permissive value among its open requests wins.

## Ports and sockets

`port` defaults to `$BUN_PORT`, then `$PORT`, then `$NODE_PORT`, then `3000`. `port: 0` binds a random port readable
from `server.port`. A non-integer, negative, or out-of-range `port` throws `RangeError` from 1.4.0; before that Bun
clamped silently, so `65536` bound `65535` and `-1` bound a random port.

`unix: "/tmp/app.sock"` listens on a Unix domain socket. On Linux a path prefixed with a null byte
(`unix: "\0my-socket"`) is an abstract-namespace socket, which is not bound to the filesystem and disappears when the
last reference closes.

## HTTP/2 and HTTP/3

Both are experimental in `Bun.serve` through 1.4.0, whose release notes say not to ship `http3: true` to production.

- **`http2: true`** — serves HTTP/2 on the same port with the same routes. With `tls`, ALPN picks the protocol per
  connection. Without `tls`, connections opening with the HTTP/2 preface get HTTP/2 and the rest get HTTP/1.1.
- **`http3: true`** (from 1.3.14) — requires `tls` and listens on UDP on the same port. HTTP/1.1 responses carry an
  `Alt-Svc` header so browsers upgrade on their own. Zero-round-trip resumption is disabled, `server.upgrade()` returns
  `false` over H3, and `unix:` sockets get no H3 listener.
- **`http1: false`** — refuses HTTP/1.x. Requires `http2` or `http3`. WebSockets stop working, because
  `server.upgrade()` is HTTP/1.1 only.

Server push and response trailers are absent, so gRPC does not serve over `Bun.serve`'s HTTP/2.

## WebSockets

The `websocket` handler object is declared once per server, not per socket — this is why `ServerWebSocket` is not an
`EventTarget`. Its handlers are `open`, `message`, `close`, and `drain`, plus a `data` property that types `ws.data`.
`server.upgrade(req, { data, headers })` seeds that data and sets handshake response headers.

- **Type `ws.data` through the `data` property** on the handler object, never through a type parameter on `Bun.serve`.
- **A successful `upgrade()` must return `undefined`**, not a `Response`.
- **`ws.publish(topic, msg)` excludes the publishing socket**; `server.publish(topic, msg)` reaches every subscriber.
  `publishToSelf: true` changes the first.
- **Return values encode backpressure.** `ws.send()` returns the byte count, `0` when the message was dropped, and `-1`
  under backpressure. From 1.4.0 `server.publish()`, `ws.publish()`, `ws.publishText()`, and `ws.publishBinary()` return
  `0` when the message was dropped for any subscriber or the topic had none, `-1` when any subscriber has backpressure,
  and the byte count otherwise. Comparing the return against the payload length is not a success check.
- **`ws.cork(cb)`** batches several sends into one syscall.

Defaults worth knowing: `idleTimeout` is 120 seconds, `maxPayloadLength` and `backpressureLimit` are 16 MB, `sendPings`
is on, `closeOnBackpressureLimit` and `publishToSelf` are off. `perMessageDeflate: true` enables compression;
`ws.send(msg, true)` compresses one message.

The client `WebSocket` accepts a Bun-only `headers` option in its constructor, and Bun-only `pause()`, `resume()`, and
`isPaused` for backpressure the browser API cannot express. From 1.4.0 `close()` validates its code and reason,
`ping()`/`pong()` reject a payload over 125 bytes, a requested subprotocol the server does not echo fails the handshake
with code `1002`, and `close()` queues the `close` event instead of firing it before returning — `readyState` reads
`CLOSING`, not `CLOSED`, on the next line.

## HTML imports and the full-stack server

`import page from "./index.html"` gives `Bun.serve` a route value that runs Bun's bundler, transpiler, and CSS parser.

- Under `bun --hot` the assets are bundled on demand with hot module replacement.
- Under `bun build --target=bun` the import resolves to a prebuilt manifest, and the server does no bundling at runtime.

From 1.4.0, HTML-route sourcemaps follow the same `development` switch that decides the error page, and that switch
defaults to `process.env.NODE_ENV !== "production"` — so one unset variable exposes both your original sources and your
error internals. `[serve.static] sourcemap` in `bunfig.toml` overrides the sourcemap half on its own.
