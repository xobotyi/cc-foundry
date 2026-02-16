# SDK Components

The OpenTelemetry SDK implements the tracing API and provides the pipeline for
processing and exporting spans. Understanding the SDK architecture is essential for
configuring tracing in applications.

## Architecture Overview

```
Application Code
       │
       ▼
   TracerProvider ──► Tracer ──► Span
       │
       ▼
   SpanProcessor(s)
       │
       ▼
   SpanExporter(s) ──► Backend (Jaeger, OTLP Collector, etc.)
```

## TracerProvider

The entry point for tracing. Holds all configuration and creates Tracers.

**Responsibilities:**
- Factory for `Tracer` instances
- Owns `SpanProcessor`s, `Sampler`, `IdGenerator`, and `SpanLimits`
- Manages lifecycle (initialization, shutdown, flush)

**Configuration:**

```
// Pseudocode
provider = TracerProvider(
    sampler: ParentBased(root: TraceIdRatioBased(0.1)),
    spanProcessors: [BatchSpanProcessor(OTLPExporter())],
    resource: Resource(service.name: "my-service", service.version: "1.0"),
    spanLimits: SpanLimits(attributeCountLimit: 128)
)

// Set as global
setGlobalTracerProvider(provider)
```

**Lifecycle:**
1. Create and configure at application startup
2. Register as global provider
3. Call `shutdown()` at application exit — flushes remaining spans
4. After shutdown, returns no-op Tracers

**Rules:**
1. Initialize once, early in application startup
2. One provider per application (unless testing)
3. Always call `shutdown()` on exit — losing final spans is common
4. Configure `Resource` with `service.name` — this identifies your service in backends

## Tracer

Created by `TracerProvider`. Responsible for creating spans.

```
tracer = provider.getTracer("com.example.my-library", "1.0.0")
span = tracer.startSpan("operation-name")
```

**Rules:**
1. Name the tracer after the instrumentation scope (library/package name)
2. Include the version
3. Tracers are lightweight — don't cache aggressively, but don't create per-request
4. Configuration changes on the provider apply to all existing Tracers

## SpanProcessor

Hooks into span lifecycle for processing. Receives spans at creation (`OnStart`)
and completion (`OnEnd`).

### Simple Span Processor

Exports each span synchronously when it ends. **Development/testing only.**

```
SimpleSpanProcessor(exporter)
```

- Blocks the application thread during export
- No batching — one export call per span
- Useful for debugging: spans appear immediately

### Batch Span Processor

Buffers spans and exports in batches. **Use in production.**

```
BatchSpanProcessor(
    exporter: OTLPExporter(),
    maxQueueSize: 2048,          // buffer capacity
    scheduledDelayMillis: 5000,  // max delay between exports
    maxExportBatchSize: 512,     // spans per batch
    exportTimeoutMillis: 30000   // export timeout
)
```

**Behavior:**
- Exports when batch reaches `maxExportBatchSize` OR `scheduledDelayMillis` elapses
- Drops spans when queue is full (`maxQueueSize`)
- Exports remaining spans on `shutdown()` and `forceFlush()`

**Tuning guidance:**

| Symptom | Adjustment |
|---------|-----------|
| Spans dropped (queue full) | Increase `maxQueueSize` |
| High memory usage | Decrease `maxQueueSize` |
| Spans arrive late at backend | Decrease `scheduledDelayMillis` |
| Too many export calls | Increase `maxExportBatchSize` |
| Exports timing out | Increase `exportTimeoutMillis` or fix network |

### Multiple Processors

Register multiple processors for different purposes:

```
provider = TracerProvider(
    spanProcessors: [
        BatchSpanProcessor(OTLPExporter()),        // export to backend
        SimpleSpanProcessor(ConsoleExporter())      // debug output
    ]
)
```

Processors are invoked in registration order.

## SpanExporter

Serializes and transmits spans to a backend. The exporter is the end of the
processing pipeline.

### Common Exporters

| Exporter | Use Case |
|----------|----------|
| OTLP (gRPC/HTTP) | Standard — send to OTel Collector or OTLP-compatible backends |
| Console/Stdout | Development — print spans to terminal |
| Jaeger | Direct export to Jaeger (deprecated; use OTLP) |
| Zipkin | Direct export to Zipkin |
| In-Memory | Testing — capture spans for assertions |

**OTLP is the recommended exporter** for production. Send to an OpenTelemetry
Collector which then routes to your backend(s).

### Exporter Interface

```
interface SpanExporter {
    export(batch: Span[]) → Success | Failure
    shutdown()
    forceFlush()
}
```

- `export()` must not block indefinitely — has a timeout
- Retry logic is the exporter's responsibility
- After `shutdown()`, `export()` returns `Failure`

## Resource

A `Resource` describes the entity producing telemetry. Attached to all spans from
the provider.

**Essential resource attributes:**

| Attribute | Description | Example |
|-----------|-------------|---------|
| `service.name` | Logical service name | `"payment-service"` |
| `service.version` | Service version | `"2.1.0"` |
| `deployment.environment.name` | Environment | `"production"` |
| `host.name` | Hostname | `"web-01"` |

**Rules:**
1. Always set `service.name` — backends use it to group traces
2. Set `service.version` for version-aware debugging
3. Resource is immutable after provider creation

## Configuration Patterns

### Minimal Production Setup

```
resource = Resource(
    service.name: "my-service",
    service.version: "1.0.0",
    deployment.environment.name: "production"
)

exporter = OTLPExporter(endpoint: "http://collector:4317")
processor = BatchSpanProcessor(exporter)
sampler = ParentBased(root: TraceIdRatioBased(0.1))

provider = TracerProvider(
    resource: resource,
    sampler: sampler,
    spanProcessors: [processor]
)
setGlobalTracerProvider(provider)
```

### Development Setup

```
provider = TracerProvider(
    resource: Resource(service.name: "my-service"),
    sampler: AlwaysOn,
    spanProcessors: [SimpleSpanProcessor(ConsoleExporter())]
)
```

### Environment Variable Configuration

Many SDKs support configuration via environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `OTEL_SERVICE_NAME` | Service name resource attribute | `"my-service"` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP exporter endpoint | `"http://collector:4317"` |
| `OTEL_TRACES_SAMPLER` | Sampler type | `"parentbased_traceidratio"` |
| `OTEL_TRACES_SAMPLER_ARG` | Sampler argument | `"0.1"` |
| `OTEL_TRACES_EXPORTER` | Exporter type | `"otlp"` |

## OpenTelemetry Collector

A standalone process that receives, processes, and exports telemetry. Decouples
applications from backends.

**Benefits:**
- Central configuration for sampling, filtering, and routing
- Backend changes don't require application redeployment
- Supports tail sampling, attribute processing, and enrichment
- Can fan-out to multiple backends simultaneously

**Typical deployment:**

```
┌─────────┐     ┌───────────┐     ┌─────────┐
│ App      │────►│ Collector │────►│ Backend │
│ (SDK)    │OTLP │           │OTLP │ (Jaeger)│
└─────────┘     │ - sampling│     └─────────┘
                │ - filtering│────►│ Metrics │
                │ - routing  │     └─────────┘
                └───────────┘
```

**Collector deployment patterns:**
- **Sidecar** — one collector per application instance (agent mode)
- **Gateway** — shared collector(s) for multiple services
- **Agent + Gateway** — local agents forward to central gateway
