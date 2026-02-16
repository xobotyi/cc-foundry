---
name: prometheus
description: >-
  Prometheus instrumentation discipline: right metric type, right name, right labels.
  Invoke whenever task involves any interaction with Prometheus metrics — instrumenting
  application code, writing PromQL queries, defining alerting or recording rules, choosing
  metric types, managing label cardinality, building exporters, or reviewing monitoring
  configuration.
---

# Prometheus

**Instrument what matters, name it clearly, label it sparingly.**

Prometheus is a pull-based monitoring system built on a dimensional data model. Every
metric is a time series identified by a name and key-value label pairs. Getting the
metric type, naming, and label design right at instrumentation time prevents expensive
rework later.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Choosing counter vs gauge vs histogram vs summary | [metric-types.md](references/metric-types.md) |
| Naming metrics and labels, unit suffixes, base units | [naming.md](references/naming.md) |
| Instrumenting services, libraries, caches, threadpools | [instrumentation.md](references/instrumentation.md) |
| Writing or reviewing PromQL queries | [promql.md](references/promql.md) |
| Defining alerting rules or recording rules | [alerting-and-rules.md](references/alerting-and-rules.md) |
| Building a custom exporter or collector | [exporters.md](references/exporters.md) |

Read the relevant reference before writing or reviewing code in that area.

## Core Rules

These apply to ALL Prometheus instrumentation. No exceptions.

### Metric Type Selection

1. **Counter** for monotonically increasing values — requests served, errors,
   bytes sent. Never decreases (except on restart).
2. **Gauge** for values that go up and down — in-progress requests, temperature,
   memory usage, queue depth.
3. **Histogram** for observations you want to aggregate across instances —
   request latencies, response sizes. Prefer over summary in almost all cases.
4. **Summary** only when you need accurate quantiles from a single instance and
   will never aggregate across instances.

### Naming

1. **Prefix with application or domain** — `http_`, `myapp_`, `process_`.
2. **Suffix with base unit** in plural — `_seconds`, `_bytes`, `_meters`.
3. **Suffix counters with `_total`** — `http_requests_total`.
4. **Use base units** — seconds not milliseconds, bytes not megabytes.
5. **Use `snake_case`** — lowercase with underscores, matching `[a-zA-Z_:][a-zA-Z0-9_:]*`.
6. **Colons are reserved** for recording rules — never use in direct instrumentation.

### Labels

1. **Use labels for dimensions you will filter or aggregate by.**
   `http_requests_total{method="GET", status="200"}` — not separate metrics per status.
2. **Keep cardinality below 10 per metric** as a guideline. Never use unbounded
   values (user IDs, email addresses, full URLs) as label values.
3. **Do not put label names in metric names** — `http_requests_total` with a
   `method` label, not `http_get_requests_total`.
4. **Every unique label combination is a new time series.** Each costs RAM, CPU,
   disk, and network. Design conservatively.
5. **Initialize all label combinations** you know upfront to avoid missing metrics.

### Counter and Rate

1. **Always use `rate()` or `increase()` on counters.** Raw counter values are
   rarely useful — they only go up.
2. **`rate()` first, then aggregate.** `sum(rate(x[5m]))`, never `rate(sum(x)[5m])`.
   Rate must see individual counter resets.
3. **Never `rate()` a gauge.** Use `deriv()` or `delta()` for gauges.

### Timestamps

1. **Export Unix timestamps, not durations.** For "time since last success", expose
   the timestamp and compute `time() - my_timestamp_metric` in PromQL.
2. **Never set timestamps on exposed metrics.** Let Prometheus assign them at
   scrape time.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `http_get_requests_total` | `http_requests_total{method="GET"}` |
| `request_duration_milliseconds` | `request_duration_seconds` (base units) |
| `errors` (no suffix) | `errors_total` (counter suffix) |
| `user_id` as a label | Aggregate by bounded dimensions (endpoint, status) |
| `rate(sum(requests_total)[5m])` | `sum(rate(requests_total[5m]))` |
| `avg(http_duration{quantile="0.95"})` | `histogram_quantile(0.95, sum(rate(..._bucket[5m])) by (le))` |
| `my_app:request_count` (colon in instrumentation) | `my_app_request_count_total` (colons only in recording rules) |
| `time_since_last_run_seconds` (gauge tracking elapsed) | `last_run_timestamp_seconds` (gauge with Unix timestamp) |
| Summary for multi-instance aggregation | Histogram — aggregatable with `histogram_quantile()` |
| Labels with 1000+ unique values | Reduce cardinality or move analysis out of Prometheus |

## Application

When **writing** Prometheus instrumentation:
- Apply all conventions silently — don't narrate each rule being followed.
- Choose metric types based on the decision rules above. When uncertain, read
  [metric-types.md](references/metric-types.md).
- If an existing codebase contradicts a convention, follow the codebase and flag
  the divergence once.

When **writing** PromQL queries:
- Read [promql.md](references/promql.md) for operator precedence, aggregation,
  and vector matching rules.
- Always wrap counters in `rate()` or `increase()` before further operations.

When **writing** alerting or recording rules:
- Read [alerting-and-rules.md](references/alerting-and-rules.md) for naming
  format (`level:metric:operations`) and aggregation discipline.
- Alert on symptoms (user-visible impact), not causes.

When **reviewing** Prometheus code:
- Cite the specific violation and show the fix inline.
- Don't lecture — state what's wrong and how to fix it.

```
Bad review:
  "According to Prometheus best practices, you should use base units
   such as seconds instead of milliseconds for time metrics."

Good review:
  "`_milliseconds` -> `_seconds` — Prometheus requires base units.
   Divide existing values by 1000."
```

## Integration

This skill provides Prometheus-specific conventions alongside the **coding** skill:

1. **Coding** — Discovery, planning, verification discipline
2. **Prometheus** — Metric design, PromQL, alerting conventions
3. **Coding** — Final verification

The coding skill governs workflow; this skill governs Prometheus implementation choices.
