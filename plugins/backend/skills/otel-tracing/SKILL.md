---
name: otel-tracing
description: >-
  OpenTelemetry tracing discipline: correct spans, propagation, and semantic conventions
  produce useful traces. Invoke whenever task involves any interaction with distributed
  tracing — span creation, context propagation, instrumentation, sampling configuration,
  or OpenTelemetry SDK setup.
---

# OTel Tracing

Create spans for logical operations, propagate context across every boundary, use semantic
conventions for attribute names. Every tracing decision — span granularity, attribute
selection, sampling strategy — trades off cost against visibility.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Spans | `references/spans.md` | Span anatomy, root spans, lifetime code patterns |
| Span data | `references/span-data.md` | Events format, links format, SDK limits table |
| Context propagation | `references/context-propagation.md` | W3C header format, propagator selection, baggage details, security |
| Instrumentation | `references/instrumentation.md` | Server/client/async code patterns, library rules, testing guidance |
| Sampling | `references/sampling.md` | Head/tail/combined strategies, decision guide, sampler types |
| Semantic conventions | `references/semantic-conventions.md` | HTTP/DB/messaging attribute lists, status mapping, general conventions |
| SDK components | `references/sdk-components.md` | Resource config, env vars, Collector deployment, exporter types |

## Spans

A span represents a single unit of work in a trace — an HTTP request handler, a database
query, a message publish. Not every function call.

### Span Naming

Name spans for the **class** of operation, not the instance. Low-cardinality names enable
aggregation; high-cardinality names destroy it.

- Use the most general string that identifies a statistically interesting class
- Never embed high-cardinality values (IDs, emails, paths with IDs)
- HTTP span names: `{METHOD} {route}` — server: `GET /users/:id`; client: `GET`
- Database span names: `{operation} {table}` — `SELECT users`, `INSERT orders`

| Name | Verdict |
|------|---------|
| `get` | Too general |
| `get_account/42` | Too specific — ID in name |
| `get_account` | Good |
| `GET /users/{userId}` | Good — route template |
| `POST /api/v2/orders/abc123` | Bad — order ID in name |

### SpanKind

SpanKind tells backends how to assemble the trace tree. Set it correctly.

| Kind | Direction | Use For |
|------|-----------|---------|
| `SERVER` | Incoming | HTTP handler, gRPC server method |
| `CLIENT` | Outgoing | HTTP client call, DB query, gRPC call |
| `PRODUCER` | Outgoing | Enqueue message, schedule job |
| `CONSUMER` | Incoming | Dequeue message, process job |
| `INTERNAL` | Neither | In-process business logic, computation |

- A single span MUST NOT serve more than one purpose
- Create a new span before injecting context for outgoing calls
- `CLIENT` -> `SERVER` for synchronous calls; `PRODUCER` -> `CONSUMER` for async
- Using `INTERNAL` for HTTP handlers or DB calls is wrong — use `SERVER` or `CLIENT`

### Span Status

| Status | Meaning | When to Set |
|--------|---------|-------------|
| `Unset` | No error | Default — do not change on success |
| `Error` | Operation failed | When an error occurs; include description |
| `Ok` | Explicitly successful | Only to override a previous `Error`; rarely needed |

- Leave status `Unset` on success — it already means "no error"
- `Ok` is a "final call" — once set, subsequent `Error` attempts are ignored
- Instrumentation libraries SHOULD NOT set `Ok` — leave to application code

### Span Lifetime

- **Every created span MUST be ended** — leaked spans cause memory issues and
  incomplete traces
- After `end()`, the span becomes non-recording; further mutations are ignored
- Use language-idiomatic patterns: `defer` (Go), try/finally (Java/JS),
  context manager (Python)

## Span Data: Attributes, Events, Links

### Attributes

Key-value pairs annotating a span. Value types: string, boolean, integer, float, or
arrays of these.

- **Use semantic conventions** for attribute names — `http.request.method`, `db.system`,
  not custom names. Consistent naming enables cross-service analysis.
- **Add sampling-relevant attributes at span creation** — samplers can only see attributes
  present at creation time.
- **Keep cardinality low** — attribute values should be from a bounded set.
- **Check `IsRecording` before expensive attribute computation** — sampled-out spans
  discard all data.
- **Never store PII in attributes** — trace data flows to shared backends. Use opaque
  identifiers.
- **Respect attribute limits** — SDK enforces `AttributeCountLimit` (default 128). Excess
  attributes are silently dropped.

### Events

Timestamped annotations — structured log entries attached to a span.

- Use events when the timestamp matters; use attributes for metadata with no meaningful
  timestamp
- Add events for key domain occurrences ("page became interactive", "retry attempted")
- Use events for verbose data instead of additional spans

### Recording Exceptions

- **Always pair `RecordException` with `setStatus(ERROR)`** — RecordException alone does
  not change span status
- Never swallow application exceptions in instrumentation — catch instrumentation errors,
  log them, but always rethrow application exceptions

### Links

Associate a span with spans from other traces without parent-child hierarchy.

- **Batch processing:** link consumer span to each producer span
- **Async follow-up:** job span links back to triggering span
- Add links at span creation when possible — samplers can consider them

See `references/span-data.md` for events format, links format, and SDK limits table.

## Context Propagation

Context propagation correlates spans across service boundaries. Without it, each service
produces isolated spans — no distributed trace.

### Inject / Extract Pattern

1. **Sender** creates a span, makes it current, **injects** context into outgoing carrier
   (HTTP headers, message metadata)
2. **Receiver** **extracts** context from incoming carrier and uses it as parent for new
   spans

- Call inject AFTER creating the outgoing CLIENT or PRODUCER span
- Call extract BEFORE creating the server/consumer span
- Use W3C TraceContext as the default propagation format

### In-Process Propagation

- **Make spans active/current** — enables automatic log correlation, nested
  auto-instrumentation picking up correct parent, context propagation to child ops
- **Pass context explicitly in async code** — automatic propagation may break across
  thread boundaries, goroutines, or async callbacks
- **Never propagate request context to background work** — background tasks should start
  new traces and link back to the triggering span

### Baggage

Propagates arbitrary key-value pairs across service boundaries alongside trace context.

- Use for: tenant ID, request priority, feature flags, sampling hints
- **NEVER put PII, credentials, or API keys in baggage** — visible to all downstream
  services

See `references/context-propagation.md` for W3C header format, propagator selection
table, baggage details, and security considerations.

## Instrumentation

### Approaches

| Approach | When | Trade-off |
|----------|------|-----------|
| Automatic | Supported libraries (HTTP, DB, messaging) | Zero code, no business attrs |
| Manual | Business logic, unsupported libraries | Full control, more code |
| Hybrid (recommended) | Production | Auto for infra + manual for business logic |

### Getting a Tracer

- Name the tracer after your library, package, or module — not the application
- Include a version string matching your library version
- Libraries: accept `TracerProvider` via dependency injection or use the global one
- Applications: configure the SDK and set the global `TracerProvider`

### What to Instrument

**Good candidates:** public API methods with I/O or significant computation, request/message
handlers, outbound calls (HTTP, DB, RPC), background jobs.

**Poor candidates:** every function call (noise), thin wrapper libraries (already
instrumented underneath), pure computation with no I/O and sub-ms duration.

**Decision:** Is it a network call or significant I/O? -> Create span (CLIENT/SERVER). Is it
a meaningful business operation? -> Create span (INTERNAL). Would a span event on parent
suffice? -> Add event. Otherwise -> don't instrument.

### Library Instrumentation Rules

- **Depend on OpenTelemetry API only** — never SDK. The API is a no-op without SDK, so
  zero overhead for users who don't use OTel.
- Follow semantic conventions for your domain
- Set the `schema_url` to record which semantic convention version you use
- Prefer events over spans for verbose internal details
- Support optional `TracerProvider` injection for testability

See `references/instrumentation.md` for server-side, client-side, and async
producer/consumer patterns, plus testing guidance.

## Sampling

Sampling controls which traces are recorded and exported — the primary mechanism for
managing tracing costs.

### Head Sampling

Decision at trace creation time, before any spans complete.

| Sampler | Behavior |
|---------|----------|
| `AlwaysOn` | Record and sample everything |
| `AlwaysOff` | Drop everything |
| `TraceIdRatioBased(ratio)` | Sample based on trace ID hash |
| `ParentBased(root)` | Delegate based on parent sampling decision |

**ParentBased** is the most common production configuration — respects parent decisions,
applies custom root sampling. Default SDK sampler: `ParentBased(root=AlwaysOn)`.

### Tail Sampling

Decision after all spans in a trace complete. Requires collector infrastructure.

- All services export at 100%
- OTel Collector with tail sampling processor buffers spans by trace ID
- **All spans with the same trace ID MUST reach the same collector** — use trace-ID-aware
  load balancing

### Sampling Principles

- Start with no sampling — add only when cost or volume requires it
- Always sample errors — configure tail sampling to keep error traces
- Use `ParentBased` — children follow parent decisions for complete traces
- Provide attributes at span creation — samplers cannot see late-added attributes
- Filter health checks — high volume, low value; sample aggressively or filter entirely

See `references/sampling.md` for combined head+tail strategies, decision guide, and
per-scenario recommendations.

## Semantic Conventions

Use semantic conventions for span names and attributes. Consistent naming enables
cross-service analysis without learning custom attribute names.

- HTTP server spans: kind `SERVER`, name `{METHOD} {http.route}`, never full URI path
- HTTP client spans: kind `CLIENT`, name `{METHOD}`
- Database spans: kind `CLIENT`, name `{operation} {target}`, always sanitize queries
- Messaging producer: kind `PRODUCER`, name `{destination} publish`
- Messaging consumer: kind `CONSUMER`, name `{destination} process`

See `references/semantic-conventions.md` for required/recommended attributes per domain,
status mapping rules, and general conventions.

## SDK Components

### TracerProvider

- Initialize once, early in application startup
- Always call `shutdown()` on exit — flushes remaining spans
- Configure `Resource` with `service.name` — identifies your service in backends
- Use `BatchSpanProcessor` in production — `SimpleSpanProcessor` is for dev/testing only

See `references/sdk-components.md` for Resource attributes, BatchSpanProcessor tuning,
exporter types, environment variable configuration, and Collector deployment patterns.

## Application

When **writing** tracing code:
- Apply all conventions silently — don't narrate each rule being followed.
- Use semantic conventions for attribute names. Check the reference for your domain
  (HTTP, DB, messaging) before inventing names.
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once.

When **reviewing** tracing code:
- Cite the specific violation and show the fix inline.
- Focus on: span naming cardinality, missing context propagation, missing error
  recording, wrong SpanKind, missing `span.end()`.

## Integration

The coding skill governs workflow; this skill governs tracing implementation choices.
Language-specific skills handle SDK API differences.
