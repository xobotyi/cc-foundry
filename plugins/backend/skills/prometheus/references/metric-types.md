# Metric Types

Four core metric types. Choose correctly at instrumentation time — changing later
requires migration of dashboards, alerts, and recording rules.

## Decision Tree

```
Can the value decrease?
├── No  → Counter
└── Yes → Is it a snapshot of current state?
    ├── Yes → Gauge
    └── No  → Are you observing a distribution (latency, size)?
        ├── Yes → Do you need to aggregate across instances?
        │   ├── Yes → Histogram
        │   └── No  → Summary (but histogram still preferred)
        └── No  → Gauge
```

## Counter

A monotonically increasing value that can only go up or reset to zero on restart.

**Use for:** requests served, errors occurred, bytes transferred, tasks completed.

**API:** `inc()`, `inc(v)` where v >= 0.

**Rules:**
- Always suffix with `_total`: `http_requests_total`
- Always apply `rate()` or `increase()` in queries — raw values are meaningless
- Starts at 0, never decreases
- Prometheus handles counter resets (process restarts) automatically in `rate()`

**Common mistake:** Using a counter for values that can decrease (e.g., current
connections). Use a gauge instead.

```
# Good: counter for cumulative events
http_requests_total{method="GET", status="200"} 14832

# In PromQL: per-second rate over 5 minutes
rate(http_requests_total[5m])
```

## Gauge

A value that can go up and down arbitrarily.

**Use for:** temperature, memory usage, in-progress requests, queue depth,
configuration values, timestamps.

**API:** `inc()`, `dec()`, `set(v)`, `set_to_current_time()`.

**Rules:**
- No `_total` suffix
- Never apply `rate()` to a gauge — use `deriv()` or `delta()` if needed
- Use for "what is the current state?" questions
- For timestamps, store Unix epoch seconds: `last_success_timestamp_seconds`

**Two special gauge patterns:**
1. **Timestamps** — `myapp_last_success_timestamp_seconds` with Unix epoch.
   Query elapsed time with `time() - myapp_last_success_timestamp_seconds`.
2. **Info metrics** — `myapp_build_info{version="1.2.3", commit="abc"} 1`.
   Pseudo-metric exposing metadata as labels with value 1.

```
# Good: gauge for current state
node_memory_MemAvailable_bytes 4.123e+09

# Good: timestamp gauge
batch_job_last_success_timestamp_seconds 1.7e+09
```

## Histogram

Samples observations into configurable buckets. Produces multiple time series:
`_bucket{le="..."}`, `_sum`, and `_count`.

**Use for:** request latencies, response sizes, any distribution where you need
percentiles or aggregation across instances.

**API:** `observe(v)`.

**Rules:**
- Buckets are cumulative — `le="0.5"` includes all observations <= 0.5
- Must include `+Inf` bucket (equal to `_count`)
- Choose buckets matching expected value range (e.g., `0.005, 0.01, 0.025, 0.05,
  0.1, 0.25, 0.5, 1, 2.5, 5, 10` for HTTP latency in seconds)
- Use `histogram_quantile()` in PromQL to calculate percentiles
- Aggregatable across instances — the primary advantage over summary

**Choosing buckets:**
- Cover the expected range of values
- Place more buckets near your SLO boundaries for higher accuracy
- Default buckets work for many HTTP latency use cases
- Buckets cannot be changed after metric creation

```
# Histogram exposes multiple series:
http_request_duration_seconds_bucket{le="0.1"}  24054
http_request_duration_seconds_bucket{le="0.25"} 33342
http_request_duration_seconds_bucket{le="0.5"}  100392
http_request_duration_seconds_bucket{le="1"}    129389
http_request_duration_seconds_bucket{le="+Inf"} 133988
http_request_duration_seconds_sum               53423
http_request_duration_seconds_count             133988

# PromQL: 95th percentile across all instances
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# PromQL: average request duration
rate(http_request_duration_seconds_sum[5m])
/
rate(http_request_duration_seconds_count[5m])

# PromQL: Apdex score (target 300ms, tolerable 1.2s)
(
  sum(rate(http_request_duration_seconds_bucket{le="0.3"}[5m])) by (job)
+
  sum(rate(http_request_duration_seconds_bucket{le="1.2"}[5m])) by (job)
) / 2 / sum(rate(http_request_duration_seconds_count[5m])) by (job)
```

## Summary

Calculates streaming quantiles on the client side. Produces `{quantile="..."}`,
`_sum`, and `_count`.

**Use for:** accurate quantiles from a single instance when you know the exact
quantiles needed at instrumentation time.

**API:** `observe(v)`.

**Rules:**
- Quantiles are pre-configured and cannot be changed at query time
- **Cannot be aggregated across instances** — `avg(x{quantile="0.95"})` is
  statistically invalid
- Client-side computation is more expensive than histogram
- `_sum` and `_count` without quantiles is a valid and useful configuration

**When to use summary over histogram:**
Almost never. Use histogram unless ALL of these are true:
1. You need accurate quantiles (not just approximate)
2. From a single instance (no cross-instance aggregation needed)
3. You know the exact quantiles at instrumentation time
4. You accept that you cannot add new quantiles later without code changes

## Histogram vs Summary Comparison

| Aspect | Histogram | Summary |
|--------|-----------|---------|
| Configuration | Bucket boundaries | Quantile targets + time window |
| Client cost | Cheap (increment counters) | Expensive (streaming calculation) |
| Server cost | `histogram_quantile()` computation | Low (pre-computed) |
| Aggregation | Full support via `histogram_quantile()` | Not aggregatable |
| Quantile flexibility | Any quantile at query time | Only pre-configured quantiles |
| Accuracy | Depends on bucket layout | Configurable error in phi dimension |
| Time window | Any range selector in PromQL | Pre-configured sliding window |

**Default choice: histogram.** Switch to summary only with a specific, justified reason.
