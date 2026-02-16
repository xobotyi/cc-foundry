# Context Propagation

Context propagation is the mechanism that correlates spans across service boundaries.
Without it, each service produces isolated spans — no distributed trace.

## How It Works

1. **Sender** creates a span, makes it current, and **injects** context into the
   outgoing carrier (HTTP headers, message metadata)
2. **Carrier** transports the serialized context across the network
3. **Receiver** **extracts** context from the incoming carrier and uses it as the
   parent for new spans

```
Service A                    Network               Service B
─────────                    ───────               ─────────
Create span
  │
  ├─ inject(context, headers)
  │        ────────────────────►
  │         traceparent: 00-{traceId}-{spanId}-01
  │                                          extract(context, headers)
  │                                                 │
  │                                          Create child span
  │                                          (parent = extracted context)
```

## W3C Trace Context

The default propagation format. Uses two HTTP headers:

### traceparent

```
{version}-{trace-id}-{parent-id}-{trace-flags}
00-a0892f3577b34da6a3ce929d0e0e4736-f03067aa0ba902b7-01
```

| Field | Size | Description |
|-------|------|-------------|
| version | 2 hex | Always `00` for current spec |
| trace-id | 32 hex | 16-byte globally unique trace identifier |
| parent-id | 16 hex | 8-byte span identifier of the caller |
| trace-flags | 2 hex | Bit flags; `01` = sampled |

### tracestate

Vendor-specific key-value pairs. Carried alongside `traceparent` for multi-vendor
interoperability. OpenTelemetry uses `ot=` prefix for its own entries (e.g.,
sampling threshold).

## Propagator API

### Inject

Serialize context into a carrier for outgoing requests.

```
// Pseudocode
propagator.inject(context, carrier, setter)
```

- Call inject AFTER creating the outgoing CLIENT or PRODUCER span
- The span must be current/active so the propagator can read its SpanContext
- The setter writes key-value pairs into the carrier (e.g., HTTP headers)

### Extract

Deserialize context from an incoming carrier.

```
// Pseudocode
extractedContext = propagator.extract(context, carrier, getter)
```

- Call extract BEFORE creating the server/consumer span
- Use the extracted context as parent for the new span
- The getter reads key-value pairs from the carrier

### Composite Propagator

Combine multiple propagators (e.g., W3C Trace Context + Baggage):

```
propagator = CompositeTextMapPropagator([
    TraceContextPropagator(),
    BaggagePropagator()
])
```

## In-Process Propagation

Within a single process, context flows through the "current" or "active" span:

1. **Make spans active/current** — this enables:
   - Automatic log correlation (trace ID in log entries)
   - Nested auto-instrumentation picking up the correct parent
   - Context propagation to child operations

2. **Capture context early on public APIs** — active context may change during
   callbacks or async operations. Capture it at the API boundary.

3. **Pass context explicitly in async code** — automatic context propagation may
   break across thread boundaries, goroutines, or async callbacks. Pass the context
   object explicitly when starting background work.

## Baggage

Baggage propagates arbitrary key-value pairs across service boundaries alongside
trace context. Unlike span attributes, baggage crosses process boundaries.

**Use cases:**
- Propagate tenant ID, request priority, feature flags
- Share sampling decisions or routing hints

**Security rules:**
- NEVER put PII, credentials, or API keys in baggage
- Baggage is visible to all downstream services
- Baggage is often logged and may be sent to untrusted services

## Security Considerations

### Incoming Context from External Sources

- Malicious actors can send forged trace headers
- Consider ignoring or sanitizing context from untrusted sources
- Validate that trace IDs and span IDs are well-formed

### Outgoing Context to External Services

- Internal trace IDs may reveal architectural information
- Configure propagators to suppress context to external/public endpoints
- Review what baggage values are being sent downstream

## Propagator Selection

| Propagator | When to Use |
|-----------|-------------|
| W3C TraceContext | Default — use everywhere |
| W3C Baggage | When you need cross-service key-value propagation |
| B3 (Zipkin) | Interop with Zipkin-based systems only |
| Jaeger | Legacy — deprecated, migrate to W3C TraceContext |
| Composite | When you need multiple propagators active |
