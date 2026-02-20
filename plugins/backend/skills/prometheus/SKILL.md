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

Choose the right metric type, name it clearly, label it sparingly. Prometheus is a pull-based
monitoring system built on a dimensional data model — every metric is a time series identified
by a name and key-value label pairs. Getting this right at instrumentation time prevents
expensive rework later.

## References

| Reference | Contains |
|-----------|----------|
| `references/metric-types.md` | Extended type comparison, histogram bucket tuning, summary configuration |
| `references/naming.md` | Full naming examples, base units table, recording rule naming |
| `references/instrumentation.md` | Code patterns per system type, library instrumentation, performance tuning |
| `references/promql.md` | Full operator catalog, vector matching, over-time aggregation, operator precedence |
| `references/alerting-and-rules.md` | Alert design, recording rule naming, anti-patterns, when to record |
| `references/exporters.md` | Exporter architecture, collectors, help strings, push-based sources |

## Metric Type Selection

Choose correctly at instrumentation time — changing later requires migration of dashboards,
alerts, and recording rules.

| Question | Answer | Type |
|----------|--------|------|
| Can the value decrease? | No | Counter |
| Is it a snapshot of current state? | Yes | Gauge |
| Observing a distribution needing cross-instance aggregation? | Yes | Histogram |
| Need accurate quantiles from a single instance, known at instrumentation time? | Yes | Summary |
| None of the above | — | Gauge |

### Counter

Monotonically increasing value — resets to zero only on restart.

- Use for: requests served, errors occurred, bytes transferred, tasks completed
- API: `inc()`, `inc(v)` where v >= 0
- Always suffix with `_total`: `http_requests_total`
- Always apply `rate()` or `increase()` in queries — raw values are meaningless
- Prometheus handles counter resets automatically in `rate()`
- Never use a counter for values that can decrease — that is a gauge

### Gauge

Value that goes up and down arbitrarily.

- Use for: temperature, memory usage, in-progress requests, queue depth, timestamps
- API: `inc()`, `dec()`, `set(v)`, `set_to_current_time()`
- No `_total` suffix
- Never apply `rate()` to a gauge — use `deriv()` or `delta()`
- **Timestamp pattern:** store Unix epoch seconds as `myapp_last_success_timestamp_seconds`;
  compute elapsed time with `time() - metric` in PromQL
- **Info metric pattern:** `myapp_build_info{version="1.2.3", commit="abc"} 1` — metadata
  as labels with constant value 1

### Histogram

Samples observations into configurable buckets. Produces `_bucket{le="..."}`, `_sum`,
`_count`.

- Use for: request latencies, response sizes, any distribution needing percentiles or
  cross-instance aggregation
- API: `observe(v)`
- Buckets are cumulative — `le="0.5"` includes all observations <= 0.5
- Must include `+Inf` bucket (equal to `_count`)
- Choose buckets matching expected value range; place more buckets near SLO boundaries
- Buckets cannot be changed after metric creation
- Use `histogram_quantile()` in PromQL to calculate percentiles
- Aggregatable across instances — the primary advantage over summary

### Summary

Calculates streaming quantiles on the client side. Produces `{quantile="..."}`, `_sum`,
`_count`.

- **Cannot be aggregated across instances** — `avg(x{quantile="0.95"})` is statistically
  invalid
- `_sum` and `_count` without quantiles is a valid and useful configuration

**Use summary over histogram only when ALL of these are true:**
1. You need accurate quantiles (not approximate)
2. From a single instance (no cross-instance aggregation)
3. You know the exact quantiles at instrumentation time
4. You accept that adding new quantiles requires code changes

**Default choice: histogram.** See `references/metric-types.md` for detailed comparison.

## Naming

Format: `<namespace>_<subsystem>_<name>_<unit>_<suffix>`. Not all parts required — minimum
is namespace + meaningful name + unit/suffix.

### Naming Rules

1. Use `snake_case` — lowercase with underscores, matching `[a-zA-Z_:][a-zA-Z0-9_:]*`
2. Colons (`:`) are reserved for recording rules — never use in direct instrumentation
3. Double underscore prefix (`__`) is reserved for Prometheus internals
4. Every metric MUST have a namespace prefix identifying its origin
5. Always use base units — seconds not milliseconds, bytes not megabytes. Let visualization
   tools handle conversion.
6. Append unit to metric name in plural form: `http_request_duration_seconds`
7. Suffix counters with `_total`, counter-with-unit as `_<unit>_total`
   (e.g., `process_cpu_seconds_total`)
8. Suffix info metrics with `_info`, timestamps with `_timestamp_seconds`
9. A metric MUST represent the same logical thing across all its label dimensions —
   `sum()` or `avg()` across all dimensions should be meaningful. If nonsensical, split
   into separate metrics.

See `references/naming.md` for base units table, component ordering, and full examples.

## Labels

Use labels for dimensions you will filter or aggregate by:
`http_requests_total{method="GET", status="200"}` — not separate metrics per status.
Do not put label names in metric names.

### When NOT to Use Labels

- Unbounded values — user IDs, email addresses, full URLs, query strings
- High cardinality — anything above ~100 unique values per metric

### Cardinality

Every unique label combination is a new time series. Each costs RAM, CPU, disk, and
network. **Cardinality math:** total series = metric cardinality x number of targets.

| Range | Guidance |
|-------|----------|
| < 10 | Safe for most metrics |
| 10-100 | Acceptable, monitor growth |
| 100-1000 | Investigate alternatives |
| > 1000 | Move analysis out of Prometheus |

### Label Best Practices

1. Start with no labels. Add as concrete use cases emerge.
2. Keep cardinality below 10 per metric as a default target.
3. Initialize all label combinations you know upfront to avoid missing metrics — export 0
   for known label sets.
4. Use stable label values. Avoid labels that change frequently.
5. Never include a "total" label value — rely on Prometheus `sum()`.

## Instrumentation Patterns

### Online-Serving Systems (HTTP servers, APIs, databases)

Key metrics: request rate (`_total`), error rate, latency (histogram), in-progress (gauge).

- Count requests at completion (not start) — aligns with error and latency stats
- Always have a total requests counter alongside error counters (for ratio calculation)

### Offline Processing (queues, pipelines, ETL)

Key metrics per stage: items in (`_total`), items out (`_total`), in progress (gauge),
last processed timestamp (gauge), processing duration (histogram).

- Export heartbeat timestamps to detect stalled processing

### Batch Jobs (cron, scheduled tasks)

Key metrics (push to Pushgateway): last success timestamp (gauge), last completion
timestamp (gauge), duration (gauge — single run, not distribution).

- Batch job durations are gauges (single event), not histograms
- Jobs running more often than every 15 minutes should be converted to daemons

### Libraries

Instrument transparently — users get metrics without configuration. Minimum for external
resource access: request count (counter), error count (counter), latency (histogram).

### Subsystem Patterns

- **Logging:** maintain `log_messages_total{level="..."}` counter per log level
- **Failures:** always pair failure counter with total attempts counter for ratio calculation
- **Caches:** `cache_requests_total{result="hit|miss"}`, evictions (counter), size (gauge),
  lookup latency (histogram). Also instrument the downstream system.

See `references/instrumentation.md` for threadpool patterns, custom collectors, and
performance tuning in hot paths.

## PromQL

### Rate and Increase (Counters Only)

- `rate(counter[5m])` — per-second rate. Use for alerts and dashboards.
- `increase(counter[5m])` — total increase. Sugar for `rate() * range_seconds`.
- `irate(counter[5m])` — instant rate from last two samples. Only for graphing volatile
  counters.
- **`rate()` first, then aggregate:** `sum(rate(x[5m]))`, never `rate(sum(x)[5m])`. Rate
  must see individual counter resets.
- Never `rate()` a gauge — use `deriv()` or `delta()`.

### Histogram Quantiles

- `histogram_quantile(0.95, rate(metric_bucket[5m]))` — single histogram
- When aggregating histogram buckets, always preserve `le` in the `by` clause:
  `histogram_quantile(0.95, sum by (job, le) (rate(metric_bucket[5m])))`
- Average duration: `rate(metric_sum[5m]) / rate(metric_count[5m])`

### PromQL Gotchas

- **Staleness:** most recent sample within lookback period (default 5 min). Series
  disappears if not scraped within that window.
- **Rate window size:** `rate()` needs at least 2 samples. Range should be at least 4x
  scrape interval. With 15s scrape, use `rate(x[5m])` or wider.
- **Expensive queries:** bare metric names can expand to thousands of series. Always filter
  or aggregate before graphing. Use recording rules for expensive expressions.

See `references/promql.md` for data types, selectors, aggregation operators, vector
matching, over-time aggregation, binary operators, and operator precedence.

## Alerting Rules

Alert on **symptoms** (user-visible impact), not causes. Use dashboards to pinpoint
causes after an alert fires.

| System Type | Alert On |
|-------------|----------|
| Online-serving | High latency, high error rate (user-facing, high in the stack) |
| Offline processing | Data taking too long to get through the system |
| Batch jobs | Job has not succeeded recently enough (>= 2x normal cycle) |
| Capacity | Approaching resource limits that will cause outage without intervention |

Only page on latency at one point in the stack — if overall user latency is fine, don't
page on a slow sub-component. Avoid noisy alerts — if an alert fires and there's nothing
to do, remove it.

See `references/alerting-and-rules.md` for alert design, naming conventions, and
recording rule details.

## Recording Rules

Pre-compute frequently used or expensive expressions. Format:
`level:metric:operations`.

- Aggregate ratios correctly — aggregate numerator and denominator separately, then divide.
  Never average a ratio or average an average.
- Use `without` for aggregation — preserves all labels except those being removed. Prefer
  over `by`.
- Use recording rules for dashboard queries that are expensive and queried frequently,
  expressions used in multiple alerts, or complex multi-step aggregations.

See `references/alerting-and-rules.md` for full naming convention and recording rule
anti-patterns.

## Exporters

Write an exporter when the target system does not expose Prometheus metrics natively.
For your own code, use a client library directly.

- Prefix all metrics with exporter name: `haproxy_up`, `mysql_global_status_threads_connected`
- Create fresh metric instances per scrape — do NOT use global metric variables updated
  each scrape (race conditions, stale labels)
- Drop pre-computed rates, min/max since start, stddev from source systems — export raw
  counters and current values; let Prometheus `rate()` handle the rest

See `references/exporters.md` for architecture, collectors, help strings, label rules,
and push-based sources.

## Application

When **writing** Prometheus instrumentation:
- Apply all conventions silently — don't narrate each rule being followed.
- Choose metric types based on the decision criteria above.
- If an existing codebase contradicts a convention, follow the codebase and flag the
  divergence once.

When **writing** PromQL queries:
- Always wrap counters in `rate()` or `increase()` before further operations.
- Prefer `without` over `by` for aggregation.

When **writing** alerting or recording rules:
- Follow `level:metric:operations` naming.
- Alert on symptoms, not causes.
- Aggregate ratios correctly (numerator and denominator separately).

When **reviewing** Prometheus code:
- Cite the specific violation and show the fix inline.
- Don't lecture — state what's wrong and how to fix it.

## Integration

The coding skill governs workflow; this skill governs Prometheus implementation choices.
