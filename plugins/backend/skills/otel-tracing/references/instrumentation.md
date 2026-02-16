# Instrumentation

Instrumentation is how you add tracing to your code. OpenTelemetry supports three
approaches: automatic, manual (code-based), and hybrid.

## Instrumentation Approaches

### Automatic Instrumentation

Library hooks or monkey-patching that intercept calls to known libraries (HTTP
clients, database drivers, messaging systems) and create spans automatically.

**Advantages:**
- Zero code changes for supported libraries
- Consistent span naming and attribute population
- Automatic context propagation

**Limitations:**
- Only covers supported libraries
- Cannot add business-specific attributes
- May not work in all environments (e.g., some serverless runtimes)

### Manual (Code-Based) Instrumentation

Explicit span creation using the OpenTelemetry SDK.

**When to use:**
- Business-critical operations with custom attributes
- Libraries not covered by auto-instrumentation
- Fine-grained control over span boundaries and attributes

### Hybrid (Recommended for Production)

Combine automatic instrumentation for infrastructure spans with manual
instrumentation for business logic. This provides:
- Automatic context propagation and correlation
- Infrastructure visibility without code changes
- Business-specific spans where they matter

## Getting a Tracer

```
// Pseudocode — pattern is the same across languages
tracer = tracerProvider.getTracer(
    "com.example.my-service",  // instrumentation scope name
    "1.0.0"                     // version
)
```

**Rules:**
1. Name the tracer after your library, package, or module — not the application
2. Include a version string matching your library version
3. The tracer name appears in telemetry and helps debug instrumentation issues
4. Libraries: accept `TracerProvider` via dependency injection or use the global one
5. Applications: configure the SDK and set the global `TracerProvider`

## What to Instrument

### Good Candidates for Spans

1. **Public API methods** that do I/O or significant computation
2. **Request/message handlers** — the entry point for external work
3. **Outbound calls** — HTTP requests, database queries, RPC calls
4. **Background jobs** — scheduled tasks, queue consumers

### Poor Candidates for Spans

1. **Every function call** — creates excessive noise and overhead
2. **Thin wrapper libraries** — if the underlying call is already instrumented
3. **Pure computation** with no I/O and sub-millisecond duration
4. **Getters/setters** — trivial accessors add no observability value

### Decision Guide

```
Is this a network call or significant I/O?
  └─ Yes → Create a span (CLIENT or SERVER kind)
  └─ No
      Is this a meaningful business operation?
        └─ Yes → Create a span (INTERNAL kind)
        └─ No
            Would a span event on the parent suffice?
              └─ Yes → Add an event instead
              └─ No → Don't instrument
```

## Instrumentation Patterns

### Server-Side (Incoming Request)

```
// 1. Extract context from incoming request
extractedContext = propagator.extract(context, request, getter)

// 2. Create server span with extracted context as parent
span = tracer.startSpan("GET /users/{id}",
    kind: SERVER,
    parent: extractedContext,
    attributes: { "http.request.method": "GET", "url.path": path }
)

// 3. Make span active for nested instrumentation
try (scope = span.makeCurrent()) {
    result = handleRequest(request)
    span.setAttribute("http.response.status_code", result.status)
} catch (error) {
    span.recordException(error)
    span.setStatus(ERROR, error.message)
    throw error
} finally {
    span.end()
}
```

### Client-Side (Outgoing Request)

```
// 1. Create client span
span = tracer.startSpan("GET",
    kind: CLIENT,
    attributes: { "http.request.method": "GET", "server.address": host }
)

// 2. Inject context into outgoing request
try (scope = span.makeCurrent()) {
    propagator.inject(context, request, setter)
    response = httpClient.send(request)
    span.setAttribute("http.response.status_code", response.status)
} catch (error) {
    span.recordException(error)
    span.setStatus(ERROR, error.message)
    throw error
} finally {
    span.end()
}
```

### Async Producer/Consumer

```
// Producer: create span and inject context into message
span = tracer.startSpan("send",
    kind: PRODUCER,
    attributes: { "messaging.destination.name": queue }
)
try (scope = span.makeCurrent()) {
    propagator.inject(context, message.headers, setter)
    queue.send(message)
} finally {
    span.end()
}

// Consumer: extract context and link or parent
extractedContext = propagator.extract(context, message.headers, getter)
span = tracer.startSpan("process",
    kind: CONSUMER,
    links: [Link(extractedContext)],  // or parent: extractedContext
    attributes: { "messaging.destination.name": queue }
)
```

### Batch Processing with Links

When a consumer processes multiple messages at once, link to each producer:

```
links = messages.map(msg =>
    Link(propagator.extract(context, msg.headers, getter))
)
span = tracer.startSpan("process_batch",
    kind: CONSUMER,
    links: links
)
```

## Library Instrumentation Rules

When adding tracing to a **library** (not an application):

1. **Depend on OpenTelemetry API only** — never the SDK. The API is a no-op without
   SDK, so your library has zero overhead for users who don't use OTel.
2. **Use the earliest stable API version** (1.0.*) to minimize dependency conflicts
3. **Follow semantic conventions** for your domain (HTTP, DB, messaging)
4. **Set the `schema_url`** to record which semantic convention version you use
5. **Don't create spans for thin wrappers** — instrument at the logical level, not
   the network level
6. **Prefer events over spans** for verbose internal details
7. **Support optional TracerProvider injection** for testability

## Testing Instrumentation

1. Use a mock or in-memory `SpanExporter` to capture spans in tests
2. Verify: span names, kinds, attributes, status, parent-child relationships
3. Test with auto-instrumentation enabled to check for span duplication
4. Verify context propagation across service boundaries in integration tests
