# Spans

A span represents a single unit of work in a trace. Spans are the building blocks of
distributed traces — they carry timing, identity, and causal relationships.

## Span Anatomy

Every span contains:

| Field | Description |
|-------|-------------|
| Name | Low-cardinality identifier for the class of operation |
| SpanContext | Immutable: trace ID, span ID, trace flags, trace state |
| Parent span ID | Empty for root spans; links child to parent |
| SpanKind | `SERVER`, `CLIENT`, `INTERNAL`, `PRODUCER`, `CONSUMER` |
| Start/end timestamps | Wall-clock time of operation boundaries |
| Attributes | Key-value metadata about the operation |
| Events | Timestamped annotations within the span |
| Links | References to spans in other (or same) traces |
| Status | `Unset`, `Error`, or `Ok` |

## Span Naming

The span name identifies the **class** of operation, not the instance. It must be
low-cardinality to enable aggregation in backends.

**Rules:**
1. Use the most general string that identifies a statistically interesting class
2. Prioritize generality over human-readability
3. Never embed high-cardinality values (IDs, emails, paths with IDs)

| Name | Verdict |
|------|---------|
| `get` | Too general |
| `get_account/42` | Too specific — ID in name |
| `get_account` | Good |
| `GET /users/{userId}` | Good — uses route template |
| `SELECT users` | Good — table name, no query params |
| `POST /api/v2/orders` | Good — static path |
| `POST /api/v2/orders/abc123` | Bad — order ID in name |

**HTTP span names** follow the pattern `{METHOD} {route}`:
- Server: `GET /users/:id` (use `http.route`)
- Client: `GET` (if no low-cardinality target available)

**Database span names** follow: `{operation} {table}`:
- `SELECT users`, `INSERT orders`

## SpanKind

SpanKind describes the relationship between spans in a trace. It tells backends how
to assemble the trace tree.

| Kind | Direction | Style | Example |
|------|-----------|-------|---------|
| `SERVER` | Incoming | Request/response | HTTP handler, gRPC server method |
| `CLIENT` | Outgoing | Request/response | HTTP client call, DB query, gRPC call |
| `PRODUCER` | Outgoing | Fire-and-forget | Enqueue message, schedule job |
| `CONSUMER` | Incoming | Deferred processing | Dequeue message, process job |
| `INTERNAL` | Neither | In-process | Business logic, computation |

**Rules:**
1. A single span MUST NOT serve more than one purpose (e.g., don't use a `SERVER`
   span to also describe an outgoing call)
2. Create a new span before injecting context for outgoing calls
3. `CLIENT` → `SERVER` is the typical parent-child pair for synchronous calls
4. `PRODUCER` → `CONSUMER` is the typical pair for async operations
5. Default is `INTERNAL` if not specified

**Common mistakes:**
- Using `INTERNAL` for HTTP handlers → use `SERVER`
- Using `INTERNAL` for database calls → use `CLIENT`
- Using `SERVER` for outgoing HTTP requests → use `CLIENT`

## Span Status

| Status | Meaning | When to set |
|--------|---------|-------------|
| `Unset` | Operation completed without error | Default — don't change on success |
| `Error` | Operation failed | When an error occurs; include description |
| `Ok` | Explicitly marked successful | Only to override a previous `Error`; rarely needed |

**Rules:**
1. Leave status `Unset` on success — it already means "no error"
2. Set `Error` with a description when operations fail
3. `Ok` is a "final call" — once set, subsequent `Error` attempts are ignored
4. Status has total order: `Ok` > `Error` > `Unset`
5. Instrumentation libraries SHOULD NOT set `Ok` — leave that to application code
6. Description is ONLY used with `Error` status

## Span Lifetime

1. Start time is recorded at span creation
2. End time is recorded when `span.end()` is called
3. **Every created span MUST be ended** — leaked spans cause memory issues
4. After `end()`, the span becomes non-recording; further mutations are ignored
5. Ending a parent does NOT end children — children may outlive parents

**Idiomatic patterns for ensuring spans end:**

```
// Go: defer
span := tracer.Start(ctx, "operation")
defer span.End()

// Java: try-with-resources or try/finally
Span span = tracer.spanBuilder("operation").startSpan();
try (Scope scope = span.makeCurrent()) {
    // work
} finally {
    span.end();
}

// Python: context manager
with tracer.start_as_current_span("operation") as span:
    # work

// JavaScript: try/finally
const span = tracer.startSpan("operation");
try {
    // work
} finally {
    span.end();
}
```

## Root Spans

A root span has no parent — it starts a new trace. Root spans:
- Get a new, randomly generated trace ID
- Have an empty parent span ID
- Are typically the entry point of a service (HTTP handler, message consumer)

Child spans inherit:
- The parent's trace ID
- All trace state values
