# The Built-in HTTP Client

`fetch` is a global, Stable from 21.0.0, and it is undici underneath. `process.versions.undici` reports which undici the
running Node embeds: 6 on the 22 line, 7 on 24, 8 on 26. Its behavior therefore changes across Node majors even though
the `fetch` surface does not.

The related globals — `Headers`, `Request`, `Response`, `FormData`, `File`, `Blob` — come from the same implementation.

## Rules that are not obvious from the browser API

- **Consume or cancel every response body.** undici's own documentation states that leaving a body to the garbage
  collector leads to excessive connection use, degraded performance, and stalls or deadlocks when the pool runs out.
  Call `await res.json()`, `await res.text()`, `res.body.cancel()`, or read to completion — on the error path too. A
  `if (!res.ok) throw ...` that never touches the body leaks a connection per failure.
- **A non-2xx status does not reject.** `fetch` rejects on transport failure only. Check `res.ok` or `res.status`.
- **There is no total request timeout.** The dispatcher's `bodyTimeout` (300000 ms) measures the gap between consecutive
  body chunks, not elapsed time, so a response that drips one byte inside every window never times out. `headersTimeout`
  is 300000 ms and `connectTimeout` is 10000 ms. Bound the whole call yourself with `signal: AbortSignal.timeout(ms)`,
  combined with the caller's signal through `AbortSignal.any([callerSignal, AbortSignal.timeout(ms)])`.
- **A response body is a web `ReadableStream`.** Cross to a Node stream with `Readable.fromWeb(res.body)`, or read it
  with `for await`.
- **Redirects are followed by default**, including across origins, up to the fetch specification's limit. Pass
  `redirect: 'manual'` where the target is untrusted, because an open redirect otherwise becomes a request Node makes on
  the attacker's behalf.
- **`fetch` does not read proxy environment variables by default.** Set `NODE_USE_ENV_PROXY=1` or pass `--use-env-proxy`
  (24.5.0 and 22.21.0, Active development) to honor `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`. The flag wins when both
  are set.

## Connection pooling

`fetch` uses a global dispatcher with its own connection pool. It is not `http.globalAgent`, so `http.Agent` options
have no effect on it.

- **Per-request:** `fetch(url, { dispatcher })`.
- **Process-wide:** install `undici` from the registry and call `setGlobalDispatcher(agent)`, which changes both `fetch`
  and undici's own API.
- The dispatcher is where connection limits, keep-alive, per-origin pooling, and retry live. A service making a high
  volume of calls to one origin needs an explicit dispatcher; the default is tuned for general use.
- **`keepAliveTimeout` defaults to 4000 ms** and the server's keep-alive hint can raise it as far as
  `keepAliveMaxTimeout` (600000 ms). A socket held open this way keeps the process alive, which is why a script can
  finish its work and refuse to exit.

## When to use `node:http` instead

`fetch` buffers and abstracts. Reach for `node:http` or `node:https` when the code needs the socket: streaming upload
with backpressure control, HTTP upgrade and `CONNECT`, per-request agent tuning, precise header ordering, or trailers.

- **`http.request` with an `Agent` that has `keepAlive: true`** is the outbound-connection default for a service; a new
  agent per request creates a connection per request.
- **`node:http2` for HTTP/2**, which `fetch` does not speak.
- **`server.closeIdleConnections()`** exists on the server side; on the client side an agent holds sockets open until
  `agent.destroy()`, which is why a process can refuse to exit after its last request.
