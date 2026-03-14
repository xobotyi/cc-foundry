# Semantic Conventions

Semantic conventions standardize span names, attributes, and status across languages and libraries. Using conventions
enables cross-service analysis without learning each library's custom attribute names.

## Why Conventions Matter

- **Consistency** — all HTTP spans use the same attribute names regardless of language
- **Tooling** — backends build dashboards and alerts on well-known attribute names
- **Correlation** — standardized names allow joining spans from different services
- **Vendor neutrality** — no proprietary attribute schemas

## HTTP Spans

### HTTP Server Spans

**Span kind:** `SERVER`

**Span name:** `{METHOD} {http.route}` (e.g., `GET /users/:id`)

- If no route available: `{METHOD}` (e.g., `GET`)
- Never use the full URI path as span name

**Required attributes:**

- `http.request.method` — e.g., `"GET"`, `"POST"`
- `url.path` — e.g., `"/users/42"`
- `url.scheme` — e.g., `"https"`

**Conditionally required:**

- `http.route` (if available) — e.g., `"/users/:id"`
- `http.response.status_code` (if response sent) — e.g., `200`
- `error.type` (if error occurred) — e.g., `"500"`, `"timeout"`

**Recommended:**

- `server.address` — e.g., `"api.example.com"`
- `server.port` — e.g., `8080`
- `client.address` — e.g., `"192.168.1.100"`
- `user_agent.original` — e.g., `"Mozilla/5.0..."`
- `network.protocol.version` — e.g., `"1.1"`, `"2"`

**Status rules:**

- 1xx, 2xx, 3xx → leave `Unset` (unless other error like network failure)
- 4xx → leave `Unset` for server spans (client's problem)
- 5xx → set `Error`
- Don't set status description if `http.response.status_code` explains it

### HTTP Client Spans

**Span kind:** `CLIENT`

**Span name:** `{METHOD}` (e.g., `GET`)

- Add `{url.template}` if available: `GET /users/{id}`

**Required attributes:**

- `http.request.method` — e.g., `"GET"`
- `server.address` — e.g., `"api.example.com"`
- `server.port` — e.g., `443`
- `url.full` — e.g., `"https://api.example.com/users/42"`

**Status rules:**

- 4xx → set `Error` for client spans (server rejected our request)
- 5xx → set `Error`

### HTTP Span Example

Client span:

```
name: "GET"
kind: CLIENT
attributes:
  http.request.method: "GET"
  url.full: "https://example.com:8080/webshop/articles/4?s=1"
  server.address: "example.com"
  server.port: 8080
  http.response.status_code: 200
  network.protocol.version: "1.1"
```

Corresponding server span:

```
name: "GET /webshop/articles/:article_id"
kind: SERVER
attributes:
  http.request.method: "GET"
  url.path: "/webshop/articles/4"
  url.query: "s=1"
  url.scheme: "https"
  http.route: "/webshop/articles/:article_id"
  server.address: "example.com"
  server.port: 8080
  http.response.status_code: 200
  client.address: "192.0.2.4"
```

## Database Spans

**Span kind:** `CLIENT`

**Span name:** `{operation} {target}` (e.g., `SELECT users`)

**Key attributes:**

- `db.system` — Database product identifier (e.g., `"postgresql"`, `"redis"`)
- `db.namespace` — Database name / schema (e.g., `"mydb"`)
- `db.operation.name` — Operation name (e.g., `"SELECT"`, `"INSERT"`)
- `db.query.text` — Sanitized query, opt-in (e.g., `"SELECT * FROM users WHERE id = ?"`)
- `server.address` — Database server host (e.g., `"db.example.com"`)
- `server.port` — Database server port (e.g., `5432`)

**Rules:**

- Always sanitize queries — replace parameter values with `?` or `$N`
- `db.query.text` is opt-in due to potential sensitivity
- Use `db.operation.name` even when the full query is not recorded

## Messaging Spans

### Producer Spans

**Span kind:** `PRODUCER`

**Span name:** `{destination} publish` (e.g., `orders publish`)

- `messaging.system` — e.g., `"kafka"`, `"rabbitmq"`
- `messaging.destination.name` — e.g., `"orders"`
- `messaging.operation.type` — e.g., `"publish"`

### Consumer Spans

**Span kind:** `CONSUMER`

**Span name:** `{destination} process` (e.g., `orders process`)

- `messaging.system` — e.g., `"kafka"`
- `messaging.destination.name` — e.g., `"orders"`
- `messaging.operation.type` — e.g., `"process"`

**For batch consumers:** Create one span per batch with links to each producer span.

## General Conventions

### Error Reporting

- `error.type` — Low-cardinality error class (e.g., `"timeout"`, `"500"`, `"java.net.UnknownHostException"`)

Set `error.type` when the operation ends with an error. The value should be predictable and low-cardinality.

### Network Attributes

- `network.transport` — Transport protocol (e.g., `"tcp"`, `"udp"`)
- `network.protocol.name` — Application protocol (e.g., `"http"`, `"grpc"`)
- `network.protocol.version` — Protocol version (e.g., `"1.1"`, `"2"`)
- `network.peer.address` — Remote peer IP (e.g., `"10.0.0.1"`)
- `network.peer.port` — Remote peer port (e.g., `8080`)

### Server/Client Attributes

- `server.address` (both) — Hostname or IP of the server
- `server.port` (both) — Port of the server
- `client.address` (server only) — IP of the client
- `client.port` (server only) — Port of the client

## Sampling-Critical Attributes

These attributes SHOULD be provided at span creation time because samplers can only see attributes present at creation:

**HTTP server:** `http.request.method`, `url.path`, `url.scheme`, `server.address`, `server.port`, `client.address`,
`user_agent.original`

**HTTP client:** `http.request.method`, `url.full`, `server.address`, `server.port`
