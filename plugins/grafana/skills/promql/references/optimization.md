# Optimization and Pitfalls

Performance patterns, common mistakes, gotchas. The most expensive PromQL queries are usually the simplest-looking ones
— a bare metric name can fan out to millions of series.

## Contents

- [Performance Fundamentals](#performance-fundamentals)
- [Cardinality Awareness](#cardinality-awareness)
- [Common Pitfalls](#common-pitfalls)
- [Counter Reset Handling](#counter-reset-handling)
- [Staleness and Lookback](#staleness-and-lookback)
- [Rate Window Sizing](#rate-window-sizing)
- [`rate` Composition Rule](#rate-composition-rule)
- [Range Selector Window Semantics](#range-selector-window-semantics)
- [Native Histograms](#native-histograms)
- [Diagnostics](#diagnostics)

---

## Performance Fundamentals

Three principles:

1. **Series fetched** — time series read from the TSDB
2. **Samples processed** — series count × samples-per-series in the range
3. **Output cardinality** — series the query emits

Cost grows linearly with each. High output cardinality also slows consumers (Grafana, alert evaluators, recording rule
writers).

**Rules of thumb:**

- Filter as early as possible — push label matchers into the innermost selector
- Aggregate before joining — `sum(rate(x[5m]))` returns one series; joining millions is slow
- Recording rules for expensive expressions consumed by multiple alerts or dashboards
- No bare metric names in dashboards — always include label matchers or wrap in an aggregation

## Cardinality Awareness

A bare metric name like `http_requests_total` can return thousands of series:

```promql
http_requests_total                          # potentially every endpoint × method × status × instance × pod
```

Before graphing or alerting on a metric, check cardinality in the Prometheus expression browser's table view.
Thousand-series results must be filtered or aggregated before becoming a graph.

**Cardinality-reducing patterns:**

```promql
sum by (job) (http_requests_total)                                  # collapse to one series per job
http_requests_total{job="api", method="GET"}                        # restrict to the slice you care about
topk(10, sum by (instance) (rate(http_requests_total[5m])))         # narrow to the top 10
```

**High-cardinality labels to watch:**

- `user_id`, `email`, `session_id` — unbounded user dimensions
- Full URL paths, query strings — variable IDs in paths
- `instance` for very large fleets
- Kubernetes `pod` names — change on every deploy

If a query is slow and the metric has these labels, aggregate them away first.

## Common Pitfalls

### Applying `rate()` to a gauge

```promql
rate(node_memory_MemAvailable_bytes[5m])     # WRONG — gauge can decrease
```

`rate()` assumes monotonic-with-resets. Gauge decreases are interpreted as counter resets — nonsense.

**Fix:** `delta()` or `deriv()` for gauges.

```promql
delta(node_memory_MemAvailable_bytes[5m])    # absolute change
deriv(node_memory_MemAvailable_bytes[5m])    # smoothed per-second change
```

### Aggregating then rating

```promql
rate(sum(http_requests_total)[5m])           # WRONG — rate cannot see per-series resets
```

Aggregation hides individual counter resets — one instance restart drops the sum, and `rate()` sees a reset for the
whole sum.

**Fix:** rate first, then aggregate.

```promql
sum(rate(http_requests_total[5m]))           # CORRECT
```

### Averaging a ratio across instances

```promql
avg(error_rate / request_rate)               # WRONG — statistically invalid
```

The average of per-instance ratios is not the overall ratio. An instance with 100 requests has the same weight as one
with 1,000,000.

**Fix:** aggregate numerator and denominator separately, then divide.

```promql
sum(error_rate) / sum(request_rate)          # CORRECT — weighted by traffic
```

### Averaging summary quantiles

```promql
avg(http_request_duration_seconds{quantile="0.95"})   # WRONG — quantiles are not averageable
```

Summaries calculate quantiles on the client side. Averaging the 95th percentile across instances is statistically
meaningless — "average 95th" says nothing about the actual 95th of the combined population.

**Fix:** use histograms. Buckets CAN be aggregated; quantiles are computed from aggregated buckets.

```promql
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

### Forgetting `le` when aggregating histogram buckets

```promql
histogram_quantile(0.95, sum by (job) (rate(latency_bucket[5m])))      # WRONG — `le` is lost
```

`histogram_quantile()` reads `le` for each bucket's upper bound. Without it, the function cannot compute the quantile.

**Fix:** include `le` in `by`, or use `without` to keep it automatically.

```promql
histogram_quantile(0.95, sum by (job, le) (rate(latency_bucket[5m])))
histogram_quantile(0.95, sum without (instance, pod) (rate(latency_bucket[5m])))
```

### Negative observations in `_sum`

For metrics tracking something that can be negative (positions, deltas, signed values), `_sum` can decrease — `rate()`
interprets the decrease as a counter reset.

**Fix:** split into two histograms (positive observations, negative observations with inverted sign) and combine in
PromQL.

### Comparing metrics with different label sets

```promql
errors_total / requests_total                # may return 0 series if label sets differ
```

If `errors_total` has a `code` label `requests_total` doesn't, default matching fails.

**Fix:** `ignoring()` or `on()` to align label sets.

```promql
errors_total / ignoring(code) requests_total
sum without (code) (errors_total) / requests_total      # also works — pre-aggregate
```

### Using `irate` for alerts

```promql
- alert: HighErrorRate
  expr: irate(errors_total[5m]) > 0.1        # WRONG — flaps on transient spikes
```

`irate()` reacts to single-sample changes — fine for graphs, terrible for alerts. A 5-second blip can fire and clear the
alert before `for:` accumulates.

**Fix:** `rate()` for alerts. `irate()` only for graphing volatile counters.

## Counter Reset Handling

`rate`, `irate`, `increase`, `resets` handle counter resets automatically — assume any decrease was a restart and treat
the metric as monotonic from the post-reset value.

**Works on individual series only.** Once you sum before applying `rate()`, the function cannot distinguish "one
instance restarted" from "real decrease in the aggregate" — both look like a sum drop.

**Native histogram reset detection** is more nuanced — resets detected at bucket, count, and sum level, plus
disappearing buckets and schema changes.

**Counter vs gauge histograms:** native histograms know their flavor. `rate()` on a gauge histogram produces an
info-level annotation.

## Staleness and Lookback

Default lookback: 5 minutes. Instant vector selectors return the most recent sample within this window.

**Behaviors driven by lookback:**

- Series that stop being scraped continue to appear in queries for 5 minutes after the last sample
- Re-deploys with pod-name labels cause old + new pods to coexist for 5 minutes
- `up == 0` correctly reports "down" without the 5-minute lag — the scrape still records the failure

**Staleness markers** (special NaN samples) terminate the 5-minute trail immediately when Prometheus detects a series
ending, fixing the double-count problem on rolling deploys.

**Tuning:** `--query.lookback-delta` globally or `lookback_delta` URL parameter per-query. Lowering it makes queries
more sensitive to scrape gaps but reduces stale-data carryover.

## Rate Window Sizing

`rate()` needs ≥2 samples in the range. With a 15s scrape interval:

- `rate(x[15s])` — only 1 sample on average; usually empty
- `rate(x[30s])` — 2 samples; often NaN due to alignment jitter
- `rate(x[1m])` — 4 samples; minimum viable
- `rate(x[5m])` — 20 samples; standard default
- `rate(x[1h])` — 240 samples; smooth but slow to react

**Rule of thumb:** range = 4× scrape interval, minimum 1m. Scale up for low-frequency metrics.

**Range stability:** keep the same range across an alert's `for:` window. Mixed ranges produce confusing artifacts when
one rate has more smoothing than the other.

## `rate` Composition Rule

**`rate()` first, then aggregate.**

```promql
# WRONG
rate(sum by (job) (http_requests_total)[5m])

# CORRECT
sum by (job) (rate(http_requests_total[5m]))
```

Applies to `irate`, `increase`, `delta`, `idelta`, `deriv`, all `*_over_time` — they must see individual series before
aggregation collapses the data.

**Exception:** the inner expression in a subquery (`<expr>[5m:]`) can be already-aggregated — the subquery re-evaluates
the inner expression at each step. But the outer range-vector function still sees per-step results, not raw counters.

## Range Selector Window Semantics

Range vector windows are **left-open, right-closed**: `[5m]` includes the right boundary, excludes the left.

At the boundary between two rate windows, a sample is counted in exactly one window, never both. Matters for
`increase()` precision at the second.

## Native Histograms

If your environment supports them, native histograms are nearly always better than classic for query performance and
accuracy.

**Advantages:**

- One series per histogram instead of N (where N = bucket count + 2)
- Aggregations are always bucket-compatible (different histograms can be summed without bucket alignment issues)
- `histogram_quantile()` aggregation does not require preserving `le`
- `histogram_fraction()` allows arbitrary range queries ("fraction of requests under X ms") without pre-configured
  buckets
- Lower error margins at the same cost

**Limitations:**

- Currently requires protobuf exposition format (text support coming in OpenMetrics v2)
- Library support uneven — Go and Java well-supported; others lag

**NHCB (Native Histograms with Custom Buckets)** — Prometheus can ingest classic histograms as native histograms with
configured bucket boundaries. Syntax matches native histograms (`histogram_quantile(0.95, rate(metric[5m]))`); quantile
accuracy still depends on bucket layout. Use NHCB as a stepping-stone away from classic histograms.

**Mixing:** a single `histogram_quantile()` instant vector argument can contain both classic and native histograms, as
long as metric names don't collide.

## Diagnostics

### Annotations

Modern Prometheus surfaces info-level and warn-level annotations for many query issues:

- **info** — histogram bucket non-monotonicity (auto-fixed)
- **info** — `rate()` on a gauge native histogram (silently invalid on float gauges)
- **info** — `histogram_quantile` saw NaN observations skewing the result
- **warn** — counter reset detected on a histogram being added to another
- **warn** — incompatible histogram bucket layouts during reconciliation

Check the annotations panel when results look wrong — often pinpoints the issue.

### Slow query log

Set `--query.log-file` in Prometheus to log queries exceeding a duration threshold. Identify consumers (alert rule,
recording rule, dashboard panel) and rewrite or push to a recording rule.

### Cardinality investigation

```promql
count by (__name__) ({__name__=~".+"})              # series count per metric name
topk(20, count by (job) ({__name__=~"http_.*"}))    # top jobs by http_* series count
```

For slow queries, the first question is "how many series does the underlying selector return?" — answer with `count()`
before optimizing.

### Query inspector

Grafana's query inspector and Prometheus's `--enable-feature=promql-explain` (where available) show series and sample
counts at each stage of the query plan — invaluable for complex multi-stage expressions.
