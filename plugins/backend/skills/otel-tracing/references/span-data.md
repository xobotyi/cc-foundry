# Span Data: Attributes, Events, and Links

Spans carry three kinds of additional data: attributes for metadata, events for
timestamped annotations, and links for cross-trace references.

## Attributes

Attributes are key-value pairs that annotate a span with metadata about the operation.

**Value types:** string, boolean, integer, float, or arrays of these types.
Keys must be non-null strings.

### When to Add Attributes

1. **At span creation** — preferred. Samplers can only see attributes present at
   creation time. Add sampling-relevant attributes here.
2. **After creation** — for attributes only available after the operation starts
   (e.g., response status code).

### Attribute Best Practices

1. **Use semantic conventions.** `http.request.method`, `db.system`, not custom names.
   Consistent naming enables cross-service analysis.
2. **Keep cardinality low.** Attribute values should be from a bounded set.
   `http.request.method = "GET"` is good; `user.email = "john@example.com"` creates
   unbounded cardinality.
3. **Check `IsRecording` before expensive computation.** If the span is not recording
   (sampled out), attribute computation is wasted work:
   ```
   if span.IsRecording() {
       span.SetAttribute("db.statement", sanitize(query))
   }
   ```
4. **Never store PII in attributes.** Trace data often flows to shared backends.
   Use opaque identifiers instead of names, emails, or addresses.
5. **Respect attribute limits.** SDKs enforce `AttributeCountLimit` (default 128).
   Excess attributes are silently dropped.

### Common Attribute Patterns

| Domain | Key Attributes |
|--------|---------------|
| HTTP server | `http.request.method`, `url.path`, `url.scheme`, `http.route`, `http.response.status_code` |
| HTTP client | `http.request.method`, `url.full`, `server.address`, `server.port`, `http.response.status_code` |
| Database | `db.system`, `db.namespace`, `db.operation.name`, `db.query.text` |
| Messaging | `messaging.system`, `messaging.operation.type`, `messaging.destination.name` |
| General | `error.type`, `server.address`, `server.port`, `network.protocol.version` |

## Events

Span events are timestamped annotations — structured log entries attached to a span.
They represent meaningful, singular points in time during a span's duration.

### When to Use Events vs Attributes

| If... | Use |
|-------|-----|
| The timestamp matters (e.g., "page became interactive") | Event |
| It's a point-in-time occurrence | Event |
| It's metadata about the operation (e.g., response size) | Attribute |
| No meaningful timestamp | Attribute |

### Event Best Practices

1. Events have a name, timestamp, and optional attributes
2. Attach events to the span your instrumentation created, not the active span
3. Events preserve insertion order
4. Use events for verbose data instead of additional spans
5. The `exception` event is a special semantic convention (see RecordException below)

### Recording Exceptions

`RecordException` is a specialized event for recording exceptions:

```
span.recordException(error)
span.setStatus(StatusCode.ERROR, error.message)
```

This creates an event with semantic convention attributes:
- `exception.type` — the exception class name
- `exception.message` — the error message
- `exception.stacktrace` — the stack trace string

**Always pair `RecordException` with `setStatus(ERROR)`.** RecordException alone does
not change the span status.

## Links

Links associate a span with one or more spans from the same or different traces,
implying a causal relationship without a parent-child hierarchy.

### When to Use Links

1. **Batch processing** — A consumer span processes multiple messages; link to each
   producer span
2. **Async follow-up** — An operation triggers a deferred job; the job span links
   back to the triggering span
3. **Fan-in** — A span aggregates results from multiple upstream spans

### Link Best Practices

1. Add links at span creation when possible — samplers can consider them
2. Links added after creation may not influence sampling decisions
3. Links carry a SpanContext and optional attributes
4. SDK enforces `LinkCountLimit` (default 128)

### Links vs Parent-Child

| Relationship | Use |
|-------------|-----|
| Synchronous caller → callee | Parent-child (automatic via context) |
| Async trigger → deferred job | Link (different trace lifecycle) |
| Multiple inputs → single processor | Links to each input |
| Single operation, one causal parent | Parent-child |

## SDK Limits

The SDK enforces limits to prevent unbounded memory growth:

| Limit | Default | Configuration |
|-------|---------|---------------|
| Attribute count per span | 128 | `AttributeCountLimit` |
| Event count per span | 128 | `EventCountLimit` |
| Link count per span | 128 | `LinkCountLimit` |
| Attributes per event | 128 | `AttributePerEventCountLimit` |
| Attributes per link | 128 | `AttributePerLinkCountLimit` |

Excess items are silently dropped. The SDK logs a warning once per span when limits
are hit.
