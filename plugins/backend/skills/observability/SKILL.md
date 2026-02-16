---
name: observability
description: >-
  The three pillars of observable systems: logs reveal events, metrics quantify health,
  traces map request flow. Invoke whenever task involves any interaction with observability
  concerns — adding logging, designing metrics, instrumenting traces, correlating signals,
  reviewing instrumentation, or understanding when to use which pillar.
---

# Observability

**If you cannot ask arbitrary questions about your system's behavior from the outside,
your system is not observable — it is merely monitored.**

Observability is the ability to understand internal system state from its external outputs.
Three complementary signals make this possible: **logs** (discrete events), **metrics**
(aggregate measurements), and **traces** (request-scoped causal chains). Each pillar
answers different questions. Using the wrong pillar for a question wastes resources and
hides the answer.

This skill covers high-level observability discipline — purposes, interconnection, and
good practices for all three pillars. It is technology-agnostic: specific tools
(Prometheus, StatsD, OpenTelemetry) have their own dedicated skills.

---

## The Three Pillars

<pillars>

### Logs — What Happened

Logs are timestamped, discrete event records. They capture **what happened** at a specific
moment: an error thrown, a user action, a configuration loaded, a connection refused.

**Use logs when you need:**
- Rich diagnostic context for a specific event
- Debugging information with full error details and stack traces
- Audit trails of who did what and when
- Record of discrete state transitions

**Logs are poor at:**
- Showing aggregate system health (use metrics)
- Tracing request flow across services (use traces)
- High-frequency numeric trends (too expensive at volume)

### Metrics — How Is It Doing

Metrics are numeric measurements aggregated over time. They capture **how the system is
performing** as quantitative time series: request rates, error percentages, latencies,
queue depths, resource utilization.

**Use metrics when you need:**
- Real-time health signals and alerting
- Trend analysis over hours, days, weeks
- Capacity planning and saturation monitoring
- Pre-aggregated data that scales cheaply regardless of traffic

**Metrics are poor at:**
- Explaining *why* something is broken (use logs)
- Showing the path of a single request (use traces)
- Storing per-event detail (cardinality explosion)

### Traces — How Did It Flow

Traces record the causal chain of operations that make up a single request as it
propagates through distributed components. A trace is a tree of **spans**, where each
span represents one unit of work (an HTTP call, a database query, a queue publish).

**Use traces when you need:**
- End-to-end latency breakdown across services
- Dependency mapping and bottleneck identification
- Understanding the path a failing request took
- Correlating work across process and network boundaries

**Traces are poor at:**
- Aggregate health monitoring (use metrics)
- Detailed per-event diagnostics on a single node (use logs)
- Cheap, long-term trend storage (traces are expensive at 100% sampling)

</pillars>

### Choosing the Right Signal

| Question | Signal |
|----------|--------|
| "Is the system healthy right now?" | Metrics |
| "Why did this specific request fail?" | Traces + Logs |
| "What happened at 03:14 on node-7?" | Logs |
| "Where is the bottleneck in checkout flow?" | Traces |
| "Are error rates increasing over the last hour?" | Metrics |
| "What was the full stack trace of that exception?" | Logs |
| "Which downstream service is slow?" | Traces |
| "How much headroom does the database have?" | Metrics |

---

## Structured Logging

<structured-logging>

### Always Structured

Emit logs as structured records (JSON or equivalent key-value format) with a consistent
schema. Unstructured string logs are acceptable only in local development. Structured
logs are machine-parseable, indexable, and filterable at scale.

### Log Levels

Use levels consistently. Every team member must agree on what each level means.

| Level | Purpose | Alerting |
|-------|---------|----------|
| **FATAL/CRITICAL** | Process cannot continue; about to crash | Page immediately |
| **ERROR** | Operation failed; requires investigation | Alert / ticket |
| **WARN** | Unexpected condition; system compensated | Monitor trend |
| **INFO** | Significant business or lifecycle event | Dashboard |
| **DEBUG** | Diagnostic detail for developers | Never in production by default |
| **TRACE** | Extremely verbose step-by-step flow | Never in production |

Rules:
1. Production defaults to INFO or above. DEBUG/TRACE are off unless explicitly enabled
   for a bounded investigation window.
2. WARN is not a dumping ground. If it never leads to action, it is noise — downgrade
   to DEBUG or remove it.
3. ERROR means something is broken. Expected conditions (404 for missing resources,
   validation failures from bad input) are not errors — they are INFO with a status field.
4. Make log level configurable at runtime without restarts.

### Structured Fields

Every log record should include these baseline fields:

| Field | Purpose |
|-------|---------|
| `timestamp` | ISO 8601, UTC |
| `level` | Severity (ERROR, WARN, INFO, ...) |
| `message` | Human-readable summary of the event |
| `service` | Service name emitting the log |
| `version` | Service version / build / commit SHA |
| `trace_id` | Distributed trace ID (if in request context) |
| `span_id` | Current span ID (if in request context) |

Add contextual fields relevant to the event:

| Field | When |
|-------|------|
| `user_id` | User-initiated actions |
| `request_id` | Per-request correlation |
| `duration_ms` | Timed operations |
| `error.type` | Error class/name |
| `error.message` | Error description |
| `error.stack` | Stack trace (ERROR level only) |
| `http.method`, `http.path`, `http.status` | HTTP request/response |
| `db.operation`, `db.duration_ms` | Database calls |

### Sensitive Data

Never log:
- Passwords, tokens, API keys, secrets
- Full credit card numbers, SSNs, or equivalent PII
- Session tokens or authentication cookies
- Request/response bodies containing user-submitted personal data

When user identifiers are needed, log opaque IDs (user_id), not email addresses or
names. If regulations (GDPR, HIPAA) apply, verify that logged fields comply. When in
doubt, omit the field.

### Logging at Boundaries

**At application startup:**
- INFO: service name, version, loaded configuration (without secrets), listen address
- WARN: degraded mode (e.g., fallback to local cache because Redis is unreachable)
- ERROR/FATAL: unrecoverable startup failures

**Per incoming request:**
- INFO: method, path (scrubbed of PII), status code, duration, request dimensions
  (tenant, region)
- WARN/ERROR: only for unexpected exceptions; catch at the top-level handler

**Per outgoing dependency call:**
- INFO or DEBUG: target service, operation, status, duration
- ERROR: failures in dependent services (Redis, database, queue, etc.)

### Log Once, at the Right Level

Log a raised exception **once**. Do not catch-log-rethrow at every layer. Let exceptions
propagate to the top-level handler, which logs with full context. If you must log and
rethrow, do it only when adding context that would otherwise be lost.

</structured-logging>

---

## Metrics

<metrics>

### Metric Types

| Type | Behavior | Use For |
|------|----------|---------|
| **Counter** | Monotonically increasing; resets on restart | Totals: requests, errors, bytes sent |
| **Gauge** | Arbitrary value; goes up and down | Snapshots: queue depth, memory usage, connections |
| **Histogram** | Client-side aggregation into buckets | Distributions: request latency, payload size |
| **Summary** | Client-side quantile calculation | Pre-computed percentiles (less flexible than histogram) |

Rules:
1. Use counters for events that accumulate. Derive rates from counters (`rate()`,
   `increase()`), never store pre-computed rates.
2. Use gauges for current-state snapshots. Never `rate()` a gauge.
3. Use histograms for latency and size distributions. Histograms enable percentile
   calculation across instances; summaries do not aggregate.
4. Export timestamps as Unix epoch seconds, not "time since" values.
5. Initialize all metrics with a zero value at startup to avoid missing-metric problems.

### What to Measure

#### The Four Golden Signals (Google SRE)

For every user-facing service, measure these four:

| Signal | What It Measures | Example |
|--------|-----------------|---------|
| **Latency** | Time to serve a request | `http_request_duration_seconds` histogram |
| **Traffic** | Demand on the system | `http_requests_total` counter by method/path |
| **Errors** | Rate of failed requests | `http_requests_total{status=~"5.."}` |
| **Saturation** | How "full" the service is | CPU usage, memory, queue depth, thread pool |

Distinguish **successful latency from error latency**. A fast 500 is not good latency.
A slow error is worse than a fast error. Track both.

#### RED Method (Request-Centric)

For every microservice:
- **R**ate — requests per second
- **E**rrors — failed requests per second
- **D**uration — distribution of request latency

RED is a focused subset of the golden signals, optimized for request-driven services.

#### USE Method (Resource-Centric)

For every resource (CPU, memory, disk, network, thread pool):
- **U**tilization — percentage of capacity in use
- **S**aturation — backlog / queue depth
- **E**rrors — resource-level error count

RED tells you *what* is degraded from the user's perspective. USE tells you *why* at the
infrastructure level. Use both together.

#### Service-Type Instrumentation

| Service Type | Key Metrics |
|--------------|-------------|
| **Online-serving** (HTTP, gRPC) | Request rate, error rate, latency (p50/p90/p99), in-flight requests |
| **Offline-processing** (workers, pipelines) | Items in/out per stage, processing duration, last-processed timestamp, queue depth |
| **Batch jobs** | Last successful completion time, job duration, records processed, exit status |
| **Caches** | Hit rate, miss rate, eviction count, latency to backend on miss |
| **Thread/connection pools** | Pool size, active count, queue length, wait time |

### Metric Naming

Metric names should be self-documenting. Follow these conventions:

1. **Prefix with namespace.** `myapp_http_requests_total`, not `requests_total`.
2. **Use base units.** Seconds (not milliseconds), bytes (not megabytes),
   ratio 0-1 (not percentage 0-100).
3. **Suffix with unit.** `_seconds`, `_bytes`, `_total` (for unit-less counters).
4. **One metric, one unit, one quantity.** Never mix request size with request duration
   in the same metric.
5. **snake_case.** `http_request_duration_seconds`, not `httpRequestDurationSeconds`.

| Good | Bad |
|------|-----|
| `http_request_duration_seconds` | `request_latency` (no unit, ambiguous) |
| `http_requests_total` | `http_responses_500_total` (use labels) |
| `node_memory_usage_bytes` | `memory_mb` (not base unit) |
| `process_cpu_seconds_total` | `cpu_percent` (use ratio 0-1) |

### Labels and Cardinality

Labels add dimensions to a metric. Every unique combination of label values creates a
separate time series.

**Good labels** (bounded, low cardinality):
- `method` (GET, POST, PUT, DELETE)
- `status_code` (200, 404, 500 — or class: 2xx, 4xx, 5xx)
- `service`, `region`, `version`

**Dangerous labels** (unbounded, high cardinality):
- `user_id`, `email`, `session_id`
- `request_path` with dynamic segments (`/users/12345`)
- `error_message` (arbitrary strings)

Rules:
1. Keep label cardinality below 10 values per label for most metrics.
2. If a label can grow unbounded, it does not belong on a metric. Log it instead.
3. Use labels instead of encoding dimensions in the metric name.
   `http_requests_total{method="GET"}`, not `http_get_requests_total`.
4. Ensure `sum()` or `avg()` across all label values is meaningful. If not,
   split into separate metrics.

### Percentiles and Tail Latency

Averages hide outliers. A service with 100ms average latency may have 1% of requests
taking 5 seconds. That 1% tail can dominate user experience when users hit multiple
services per page load.

1. Always track **p50, p90, p99** latency at minimum.
2. Use histograms with exponentially distributed bucket boundaries
   (e.g., 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s).
3. Alert on p99, not mean. Mean latency alerts miss tail degradation.

</metrics>

---

## Distributed Tracing

<tracing>

### Core Concepts

| Concept | Definition |
|---------|------------|
| **Trace** | End-to-end record of a single request across all services |
| **Span** | One unit of work within a trace (HTTP call, DB query, function) |
| **Root span** | First span in a trace; has no parent |
| **Child span** | Span nested under a parent; represents a sub-operation |
| **Span context** | Immutable bag of `trace_id` + `span_id` + flags, propagated across boundaries |
| **Span attributes** | Key-value metadata on a span (http.method, db.statement) |
| **Span events** | Timestamped annotations within a span's lifetime |
| **Span links** | Causal references between spans in different traces |

### Span Kinds

| Kind | Direction | Example |
|------|-----------|---------|
| **Client** | Outgoing synchronous call | HTTP request to another service |
| **Server** | Incoming synchronous call | Handling an HTTP request |
| **Producer** | Creates async work | Publishing to a message queue |
| **Consumer** | Processes async work | Consuming from a message queue |
| **Internal** | No network boundary | In-process function instrumentation |

### Context Propagation

Context propagation is the mechanism that connects spans across process boundaries into a
single trace. Without it, you get disconnected spans, not traces.

Rules:
1. **Propagate context on every outgoing call.** HTTP headers (W3C Trace Context or
   B3), message metadata, gRPC metadata — every cross-process boundary must carry
   trace context.
2. **Extract context on every incoming call.** The receiving service must extract
   trace context and create a child span under the propagated parent.
3. **Use W3C Trace Context (`traceparent`/`tracestate`)** as the default propagation
   format unless the ecosystem requires otherwise (e.g., legacy B3).
4. **Never generate a new trace ID** when you should be continuing an existing trace.
   A new trace ID means a broken trace.

### What to Trace

Instrument at meaningful boundaries:

| Boundary | Instrument? |
|----------|-------------|
| Incoming HTTP/gRPC requests | Always — auto-instrument |
| Outgoing HTTP/gRPC calls | Always — auto-instrument |
| Database queries | Always — auto-instrument or manual |
| Cache operations | Yes — hit/miss as attribute |
| Queue publish/consume | Yes — link producer and consumer spans |
| Significant business operations | Yes — manual spans for key logic |
| Tight loops / trivial functions | No — noise, performance cost |

### Span Attributes

Attach attributes that enable filtering and analysis:

| Attribute | When |
|-----------|------|
| `http.method`, `http.route`, `http.status_code` | HTTP spans |
| `db.system`, `db.operation`, `db.statement` | Database spans |
| `messaging.system`, `messaging.operation` | Queue spans |
| `rpc.system`, `rpc.method` | RPC spans |
| `error` (boolean), `error.type`, `error.message` | Error conditions |
| `service.name`, `service.version` | All spans (set on resource) |

Use [semantic conventions](https://opentelemetry.io/docs/specs/semconv/) for attribute
names rather than inventing custom ones. Consistent naming enables cross-service analysis.

### Span Status

| Status | Meaning | When |
|--------|---------|------|
| `Unset` | Completed without error (default) | Most successful operations |
| `Error` | Operation failed | Server errors, exceptions |
| `Ok` | Explicitly marked successful | Only when you need to override ambiguity |

Leave status as `Unset` for normal success. Set `Error` only for actual failures. Do not
set `Error` for client errors like 404 on a server span — the server operated correctly.

### Sampling

At high traffic volumes, tracing 100% of requests is expensive. Sampling reduces cost
while preserving signal.

| Strategy | How It Works | Trade-off |
|----------|--------------|-----------|
| **Head-based** | Decide at trace start whether to sample | Simple; may miss rare errors |
| **Tail-based** | Decide after trace completes based on content | Catches errors; needs buffering infrastructure |
| **Always-on for errors** | Sample 100% of error traces, probabilistic for success | Good default balance |

Rules:
1. Never drop error traces. If cost is a concern, sample successful traces at a lower
   rate but keep 100% of error and high-latency traces.
2. Sample at the entry point (head) and propagate the decision. Do not let each
   service decide independently — this creates partial traces.
3. Start with a low sampling rate (1-10%) and increase based on need, not the reverse.

</tracing>

---

## Connecting the Pillars

<interconnection>

The three pillars become powerful when correlated. An alert fires on a metric → you find
the offending trace → the trace points to a span → the span's logs reveal the root cause.

### Correlation Keys

| Key | Purpose | Where |
|-----|---------|-------|
| `trace_id` | Links logs and spans to the same trace | Logs, span context |
| `span_id` | Links a log to the exact span that produced it | Logs, span context |
| `request_id` | Correlates all work for one inbound request | Logs, HTTP headers |
| `service.name` + `service.version` | Groups telemetry by source | All signals |

Rules:
1. **Embed trace_id and span_id in every log record** emitted within a request context.
   This is the primary bridge between logs and traces.
2. **Use a correlation/request ID** that is assigned at the edge (API gateway, load
   balancer) and propagated to all downstream services.
3. **Attach exemplars to metrics.** An exemplar is a trace_id attached to a specific
   metric observation, enabling drill-down from a metric spike to a representative trace.

### The Correlation Workflow

```
Metrics dashboard shows error rate spike
  → Filter by service + time window
  → Find exemplar trace_id on the error counter
  → Open trace in tracing UI
  → Identify the failing span (database timeout)
  → Search logs by trace_id for full error details
  → Root cause: connection pool exhausted
```

### Metric-to-Trace Exemplars

Exemplars attach a `trace_id` sample to a metric data point. When you see a latency
spike on a histogram, the exemplar gives you a concrete trace to investigate rather
than guessing.

- Attach exemplars to histogram observations for latency metrics.
- Attach exemplars to counter increments for error metrics.
- Not every metric point needs an exemplar — one per scrape interval is sufficient.

### Trace-to-Log Linking

When viewing a trace, each span should link to its logs. When viewing a log, the
`trace_id` should link back to the full trace. This bidirectional linking is the
backbone of incident investigation.

</interconnection>

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Logging everything at DEBUG in production | Disk/cost explosion, noise buries signal | Default to INFO; enable DEBUG temporarily per-component |
| `catch (err) { log(err); throw err; }` at every layer | Same error logged N times across the call stack | Log once at the top-level handler |
| Metrics with unbounded label cardinality | Time series explosion; monitoring system degrades | Use bounded labels; move high-cardinality data to logs |
| Encoding dimensions in metric names | Cannot aggregate; proliferates metrics | Use labels: `requests_total{method="GET"}` |
| Averaging latency for alerting | Hides tail latency; misses degradation for minority of users | Alert on p99 from histograms |
| Missing trace context propagation | Broken traces; spans from different services are disconnected | Propagate context on every cross-process call |
| Sampling each service independently | Partial traces — some spans sampled, some dropped | Decide at head, propagate sampling decision |
| Logging PII / secrets | Compliance violations, security risk | Audit log fields; log opaque IDs, never raw PII |
| Alert on every metric wiggle | Alert fatigue; team ignores pages | Alert on symptoms (golden signals), not causes; require actionability |
| Treating WARN as a soft ERROR | WARN becomes noise nobody reads | WARN = system compensated but situation is unusual; ERROR = broken |
| Storing pre-computed rates instead of counters | Cannot re-aggregate over different windows | Store raw counters; derive rates at query time |
| No baseline metrics for new services | Cannot tell if behavior is normal or degraded | Instrument golden signals from day one, before first deploy |

---

## Application

<application>

### When Writing Code

1. **Instrument from the start.** Add golden signal metrics, structured logging, and
   trace context propagation before the first production deploy — not after the first
   incident.
2. **Follow the conventions silently.** Apply structured logging, metric naming, and
   tracing patterns without narrating each rule.
3. **If the codebase has existing patterns, follow them.** Consistency within a codebase
   beats theoretical correctness. Flag divergences from this skill's guidance once, then
   move on.
4. **Choose the right pillar.** Before adding instrumentation, ask: "Is this a metric,
   a log, or a span?" Use the decision table above.
5. **Connect the signals.** Every log in a request context must carry `trace_id` and
   `span_id`. Every error metric should have an exemplar.

### When Reviewing Code

1. **Check that new endpoints/operations have golden signal coverage.** Missing metrics
   on a new endpoint is a review blocker.
2. **Verify structured logging.** Unstructured `log.Print("something happened")` in
   production code should be flagged with the fix inline.
3. **Check log levels.** Expected client errors logged as ERROR, or debug noise left
   on at INFO, are common mistakes.
4. **Verify trace context propagation.** Any new outgoing HTTP/gRPC/queue call must
   propagate trace context. Missing propagation breaks traces.
5. **Check label cardinality.** New metric labels must be bounded. Flag unbounded labels
   (user IDs, free-text) immediately.
6. **No sensitive data in logs or span attributes.** Passwords, tokens, PII in telemetry
   is a security and compliance defect.

```
Bad review comment:
  "According to observability best practices, you should consider
   adding structured logging with appropriate fields..."

Good review comment:
  "Missing trace_id in log context — requests through this handler
   won't correlate to traces. Add ctx.TraceID() to the logger fields."
```

</application>

---

## Integration

This skill provides observability discipline alongside other skills:

1. **Coding skill** — Discovery, planning, verification workflow
2. **Observability** (this skill) — What to log, measure, and trace
3. **Tool-specific skills** (Prometheus, StatsD, OTel) — How to implement with a
   specific technology

The coding skill governs workflow. This skill governs observability design decisions.
Tool-specific skills govern implementation details for their respective technologies.

**Observability is not an afterthought. Instrument from day one. If you cannot observe
it, you cannot operate it.**
