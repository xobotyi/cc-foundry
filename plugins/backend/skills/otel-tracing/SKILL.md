---
name: otel-tracing
description: >-
  OpenTelemetry tracing discipline: correct spans, propagation, and semantic conventions
  produce useful traces. Invoke whenever task involves any interaction with distributed
  tracing — span creation, context propagation, instrumentation, sampling configuration,
  or OpenTelemetry SDK setup.
---

# OTel Tracing

**A span that cannot be found is a span that was never created. A span with no context
is noise.**

OpenTelemetry tracing instruments distributed systems by creating spans that represent
units of work, propagating context across service boundaries, and exporting traces to
observability backends. Every tracing decision — span granularity, attribute selection,
sampling strategy — trades off cost against visibility.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Creating spans, naming, span kinds, status, lifetime | [spans.md](references/spans.md) |
| Attributes, events, links on spans | [span-data.md](references/span-data.md) |
| W3C Trace Context, baggage, inject/extract | [context-propagation.md](references/context-propagation.md) |
| Manual vs automatic instrumentation patterns | [instrumentation.md](references/instrumentation.md) |
| Head sampling, tail sampling, probability sampling | [sampling.md](references/sampling.md) |
| HTTP, DB, messaging span conventions | [semantic-conventions.md](references/semantic-conventions.md) |
| TracerProvider, SpanProcessor, SpanExporter setup | [sdk-components.md](references/sdk-components.md) |

Read the relevant reference before writing or reviewing tracing code.

## Core Rules

These apply to ALL OpenTelemetry tracing code. No exceptions.

### Span Creation

1. **One span per logical operation.** A span represents a unit of work — an HTTP
   request handler, a database query, a message publish. Not every function call.
2. **Set SpanKind correctly.** `SERVER` for incoming requests, `CLIENT` for outgoing
   calls, `PRODUCER` for async dispatch, `CONSUMER` for async processing, `INTERNAL`
   for in-process operations. Wrong kind breaks trace assembly.
3. **Name spans for the class of operation, not the instance.** `GET /users/{id}` not
   `GET /users/42`. Low cardinality names enable aggregation; high cardinality names
   destroy it.
4. **Always end spans.** Unended spans leak memory and produce incomplete traces. Use
   language-idiomatic patterns (try/finally, defer, context managers).
5. **Add key attributes at span creation time.** Samplers can only see attributes
   present at creation. Attributes added later cannot influence sampling decisions.

### Context Propagation

1. **Propagate context on every outbound call.** Inject context into HTTP headers,
   message metadata, or RPC metadata. Broken propagation = broken traces.
2. **Extract context from every inbound request.** Use the propagator API to extract
   trace context from incoming carriers. Set extracted context as parent of server span.
3. **Use W3C Trace Context as the default propagator.** The `traceparent` and
   `tracestate` headers are the standard. Use B3 only for Zipkin interop.
4. **Make spans active/current.** Active spans enable automatic correlation with logs
   and nested auto-instrumentation.

### Error Handling

1. **Record exceptions on spans.** Call `RecordException` and set status to `Error`
   when operations fail. Both are required — one without the other loses information.
2. **Leave status `Unset` on success.** Do not set `Ok` unless explicitly overriding
   a previous `Error` status. `Unset` means "completed without error."
3. **Never swallow errors in instrumentation.** Instrumentation must not alter
   application behavior. Catch instrumentation errors, log them, but always rethrow
   application exceptions.

### Performance

1. **Check `IsRecording` before expensive attribute computation.** Sampled-out spans
   discard all data — avoid computing attributes they will never use.
2. **Prefer batch span processors in production.** Simple processors export
   synchronously on every span end — use only for development and testing.
3. **Libraries depend on API only, never SDK.** The API is a no-op without SDK
   installed. Libraries that depend on SDK force configuration choices on users.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `span.setName("GET /users/" + userId)` | `span.setName("GET /users/{userId}")` |
| Create a span for every function call | Create spans for logical operations with I/O |
| Forget to end spans | Use try/finally, defer, or context managers |
| Set `SpanKind.INTERNAL` for HTTP handlers | Set `SpanKind.SERVER` for incoming requests |
| Set `SpanKind.INTERNAL` for DB calls | Set `SpanKind.CLIENT` for outgoing calls |
| `span.setStatus(OK)` on every success | Leave status `Unset` — it means success |
| Add all attributes after span creation | Add sampling-relevant attributes at creation |
| Catch and swallow application exceptions | `recordException(e); setStatus(ERROR); throw e` |
| Depend on SDK in library code | Depend on API only; SDK is for applications |
| Use `SimpleSpanProcessor` in production | Use `BatchSpanProcessor` for production |
| Put PII in span attributes | Use generic identifiers; redact sensitive data |
| Create spans without context propagation | Always inject/extract context on boundaries |
| Sample at 100% in high-volume production | Use head or tail sampling to control costs |
| Invent custom attribute names | Use semantic conventions (`http.request.method`) |
| Set `Error` status without `RecordException` | Always pair `RecordException` + `setStatus(Error)` |

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

```
Bad review comment:
  "You should follow OpenTelemetry best practices for span naming
   to ensure proper trace aggregation."

Good review comment:
  "Span name includes user ID → high cardinality.
   `GET /users/{userId}` instead of `GET /users/42`."
```

## Integration

This skill provides OpenTelemetry tracing conventions alongside other skills:

1. **Coding** — Discovery, planning, verification discipline
2. **OTel Tracing** — Span creation, propagation, instrumentation patterns
3. **Language skill** — Language-specific OTel SDK idioms
4. **Coding** — Final verification

The coding skill governs workflow; this skill governs tracing implementation choices.
Language-specific skills handle SDK API differences (Go vs Java vs JS vs Python).
