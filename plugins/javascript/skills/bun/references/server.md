# Bun HTTP Server

`Bun.serve()` — high-performance HTTP server built on uWebSockets.

## Basic Setup

```ts
const server = Bun.serve({
  routes: {
    "/api/status": new Response("OK"),                    // static (zero-alloc)
    "/users/:id": req => new Response(`User ${req.params.id}`),
    "/api/posts": {
      GET: () => Response.json({ posts: [] }),
      POST: async req => Response.json(await req.json(), { status: 201 }),
    },
    "/api/*": Response.json({ error: "Not found" }, { status: 404 }),
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 });   // fallback
  },
  error(error) {
    return new Response("Internal Server Error", { status: 500 });
  },
});
```

## Route Types

### Declarative `routes` (v1.2.3+)

Preferred over `fetch`-based routing. Supports:

- **Exact**: `"/users/all"` — highest priority
- **Parameterized**: `"/users/:id"` — `req.params.id`
- **Wildcard**: `"/api/*"` — catch-all within prefix
- **Per-method**: `{ GET: handler, POST: handler }`

Precedence: exact > parameterized > wildcard > global catch-all.

### Static Responses

Zero-allocation after init. Use for health checks, redirects, fixed JSON:

```ts
routes: {
  "/health": new Response("OK"),
  "/redirect": Response.redirect("https://example.com"),
  "/config": Response.json({ version: "1.0.0" }),
}
```

Cached for server lifetime. Call `server.reload()` to update.

### File Responses

Two modes with different tradeoffs:

| Pattern | Behavior | Best for |
|---------|----------|----------|
| `new Response(await file.bytes())` | Buffered in memory, ETag support, zero I/O | Small static assets |
| `new Response(Bun.file(path))` | Per-request read, 404 handling, Range support | Large/dynamic files |

Bun uses `sendfile(2)` for zero-copy file transfers when possible.

### HTML Imports (Fullstack)

```ts
import app from "./index.html";
Bun.serve({ routes: { "/": app } });
```

- **Dev** (`bun --hot`): On-demand bundling with HMR
- **Prod** (`bun build --target=bun`): Pre-built manifest, zero runtime bundling

Supports React, TypeScript, Tailwind CSS out of the box.

## Request Object

Route handlers receive `BunRequest` (extends `Request`):

```ts
interface BunRequest extends Request {
  params: Record<string, string>;   // route parameters (auto URL-decoded)
  readonly cookies: CookieMap;       // cookie access
}
```

Type-safe params when route is a string literal — TypeScript infers param shape.

## Cookies

`Bun.serve()` with `routes` auto-tracks cookie changes:

```ts
"/login": req => {
  req.cookies.set("session", token, { httpOnly: true, secure: true, maxAge: 86400 });
  return new Response("OK");  // Set-Cookie header added automatically
},
"/logout": req => {
  req.cookies.delete("session");
  return new Response("OK");  // maxAge=0 cookie sent automatically
},
```

## WebSocket Upgrade

```ts
Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req, { data: { userId: "123" } })) return;
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    open(ws) { ws.subscribe("chat"); },
    message(ws, msg) { ws.publish("chat", `${ws.data.userId}: ${msg}`); },
    close(ws) { ws.unsubscribe("chat"); },
  },
});
```

Type `ws.data` with the `data` property on the `websocket` handler:

```ts
websocket: {
  data: {} as { userId: string },  // types ws.data across all hooks
  message(ws, msg) { /* ws.data.userId is string */ },
},
```

### WebSocket Config

| Option | Default | Description |
|--------|---------|-------------|
| `maxPayloadLength` | 16 MB | Max message size |
| `idleTimeout` | 120s | Idle disconnect time |
| `backpressureLimit` | 1 MB | Queue limit before backpressure |
| `perMessageDeflate` | false | Per-message compression |
| `publishToSelf` | false | Receive own published messages |

### Pub/Sub

Native topic-based broadcasting:

```ts
ws.subscribe("topic");
ws.publish("topic", data);     // to all except sender
server.publish("topic", data); // to all subscribers
ws.unsubscribe("topic");
server.subscriberCount("topic");
```

## Server Configuration

```ts
Bun.serve({
  port: 3000,          // default: $BUN_PORT, $PORT, $NODE_PORT, or 3000
  hostname: "0.0.0.0", // default
  idleTimeout: 10,     // seconds, connection idle limit
  development: true,   // built-in error pages
  tls: { key: Bun.file("key.pem"), cert: Bun.file("cert.pem") },
  unix: "/tmp/my.sock", // Unix domain socket (instead of port)
});
```

Port `0` selects a random available port — read `server.port` after.

### Export Default Syntax

```ts
export default {
  fetch(req) { return new Response("OK"); },
} satisfies Serve.Options;
```

Bun auto-wraps in `Bun.serve()` when file has default export with `fetch`.

## Server Lifecycle

```ts
server.reload({ routes: { ... } });  // hot-swap routes (fetch, error, routes only)
await server.stop();                   // graceful shutdown
await server.stop(true);               // force-close all connections
server.unref();                        // don't keep process alive
server.ref();                          // keep process alive (default)
```

### Per-Request Controls

```ts
server.timeout(req, 60);     // custom timeout (seconds), 0 to disable
server.requestIP(req);       // { address, port } or null
```

### Metrics

```ts
server.pendingRequests;       // in-flight HTTP requests
server.pendingWebSockets;     // active WebSocket connections
server.subscriberCount(topic); // subscribers for a topic
```
