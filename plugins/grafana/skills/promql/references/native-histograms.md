# Native Histograms

Prometheus's modern histogram representation — a single composite series per histogram, replacing the classic
`_bucket{le="..."}` / `_count` / `_sum` triple. Stable in Prometheus 3.8+. Nearly always better for query writers: fewer
series, easier aggregation, higher resolution at the same cost, arbitrary-boundary fraction queries.

This reference covers what query authors need to know — schema and storage details are omitted.

## Contents

- [Quick Mental Model](#quick-mental-model)
- [Detecting Classic vs Native at Query Time](#detecting-classic-vs-native-at-query-time)
- [`histogram_quantile` Across Both Forms](#histogram_quantile-across-both-forms)
- [Native-Only Functions](#native-only-functions)
- [Aggregation and `le` — The Critical Difference](#aggregation-and-le--the-critical-difference)
- [Native Histograms with Custom Buckets (NHCB)](#native-histograms-with-custom-buckets-nhcb)
- [Functions That Work on Native Histograms](#functions-that-work-on-native-histograms)
- [Functions That Do NOT Work on Native Histograms](#functions-that-do-not-work-on-native-histograms)
- [Mixed Environments and Migration Patterns](#mixed-environments-and-migration-patterns)
- [Gotchas and Limitations](#gotchas-and-limitations)
- [Annotations as Debugging Signals](#annotations-as-debugging-signals)

---

## Quick Mental Model

A native histogram is **one time series** with a composite sample (count + sum + sparse buckets) at each scrape. A
classic histogram is **N+2 series** (one per bucket plus `_count` and `_sum`).

```
# Classic histogram — three or more series
http_request_duration_seconds_bucket{le="0.1"}    14
http_request_duration_seconds_bucket{le="0.5"}    98
http_request_duration_seconds_bucket{le="1"}     142
http_request_duration_seconds_bucket{le="+Inf"}  150
http_request_duration_seconds_count              150
http_request_duration_seconds_sum                 32.4

# Native histogram — one series, composite sample
http_request_duration_seconds                    {count:150, sum:32.4, [0,0.1]:14, (0.1,0.5]:84, ...}
```

**Query implications:**

- Selectors use the histogram's **bare name** — no `_bucket`, `_count`, `_sum` suffixes.
- Aggregating buckets across instances no longer requires preserving `le`.
- The full function set (`histogram_quantile`, `histogram_fraction`, `histogram_avg`, `histogram_count`,
  `histogram_sum`, `histogram_stddev`, `histogram_stdvar`) operates directly on the histogram series.
- `rate()`, `increase()`, `delta()`, etc. operate on the whole histogram, producing a new (gauge) histogram with rated
  components. Counter reset detection works on the whole sample, including a decreasing `_sum` from negative
  observations — classic histograms break in that case.

## Detecting Classic vs Native at Query Time

Metadata endpoints (`/api/v1/metadata`, `/api/v1/targets/metadata`) return `type: histogram` for both and cannot
distinguish them. Reliable detection via the `series` endpoint or a probing query:

```promql
# Native histogram present?
my_histogram_name

# Classic histogram present?
my_histogram_name_bucket
```

Bare name returns instant-vector elements with histogram samples → native. Returns nothing but `_bucket{le="..."}`
series exist → classic. Both may exist simultaneously during migration.

**Indicators in query results:**

- Native histogram samples render in the Prometheus UI as a bar chart in Table view (vs. plain numbers for floats) and
  as text like `{count:150, sum:32.4, ...}` in template expansion.
- The JSON API uses a `histogram` key (instant) or `histograms` key (matrix) at the same level as `value`/`values`.
- Functions like `histogram_count(metric)` return numeric values for native histograms; silently empty for classics (use
  `metric_count` directly).

## `histogram_quantile` Across Both Forms

`histogram_quantile` is the only function accepting both classic and native histograms in the same input vector — it
dispatches per element by sample type. Signature is identical; the input changes.

### Classic histogram form

Operates on `_bucket{le="..."}` series. Requires `rate()` first, `le` preserved in any aggregation.

```promql
# Single histogram
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Aggregated — `le` MUST be in `by` or preserved via `without`
histogram_quantile(0.95, sum by (job, le) (rate(http_request_duration_seconds_bucket[5m])))
histogram_quantile(0.95, sum without (instance, pod) (rate(http_request_duration_seconds_bucket[5m])))
```

### Native histogram form

Operates on the bare histogram series. No `le` label exists, so no `le` aggregation needed.

```promql
# Single histogram
histogram_quantile(0.95, rate(http_request_duration_seconds[5m]))

# Aggregated — `by` can be anything; the histogram is one series per source label set
histogram_quantile(0.95, sum by (job) (rate(http_request_duration_seconds[5m])))
histogram_quantile(0.95, sum(rate(http_request_duration_seconds[5m])))
```

### Mixed classic + native input

`histogram_quantile` accepts an instant vector containing both classic and native histogram samples and dispatches per
element — provided no metric-name collisions (spec: "As long as no naming collisions arise, `b` may contain a mix of
classic and native histograms"). A query consuming both forms must ensure the selector returns distinguishable series
for each. There is no canonical "works on both" template — migration is handled by parallel ingestion plus
one-query-at-a-time switchover (see
[Mixed Environments and Migration Patterns](#mixed-environments-and-migration-patterns)).

### Quantile edge cases

- `histogram_quantile(0, ...)` returns the estimated minimum. Native histograms cover the full float64 range, much more
  accurate than classic (where the minimum is often the lower bound of the lowest bucket).
- `histogram_quantile(1, ...)` returns the estimated maximum.
- `NaN` observations are treated as `+Inf` for quantile purposes. If the quantile falls above all buckets due to `NaN`
  observations, the result is `NaN` and an info-level annotation is emitted.

## Native-Only Functions

Six functions specifically for native histograms. Silently ignore float samples.

- **`histogram_avg(v)`** — arithmetic mean of the observed values. Equivalent to `histogram_sum(v) / histogram_count(v)`
  but evaluated in one pass.

  ```promql
  histogram_avg(rate(http_request_duration_seconds[5m]))
  ```

- **`histogram_count(v)`** — count of observations in the histogram. **For rates, apply `rate()` first, then
  `histogram_count`** — gives requests per second.

  ```promql
  histogram_count(rate(http_request_duration_seconds[5m]))    # requests/sec
  ```

- **`histogram_sum(v)`** — sum of observed values.

  ```promql
  histogram_sum(rate(http_request_duration_seconds[5m]))      # total observed seconds per second
  ```

- **`histogram_fraction(lower, upper, v)`** — estimated fraction of observations between bounds. `+Inf` and `-Inf` are
  valid. The killer feature: query SLO bounds **without** pre-configured bucket boundaries.

  ```promql
  # Fraction of requests under 300ms
  histogram_fraction(0, 0.3, rate(http_request_duration_seconds[5m]))

  # Fraction of requests over 1 second (tail)
  histogram_fraction(1, +Inf, rate(http_request_duration_seconds[5m]))

  # Apdex score idiom
    histogram_fraction(0, 0.3, rate(http_request_duration_seconds[5m]))
  +
    histogram_fraction(0.3, 1.2, rate(http_request_duration_seconds[5m])) / 2
  ```

- **`histogram_stddev(v)`** / **`histogram_stdvar(v)`** — estimated standard deviation / variance. Bucket midpoints are
  used as observation estimates (geometric mean for exponential buckets, arithmetic mean for NHCB and zero buckets).

  ```promql
  histogram_stddev(rate(http_request_duration_seconds[5m]))
  ```

**`histogram_avg` vs `avg`:** `histogram_avg(v)` returns the arithmetic average of observations within a single
histogram. `avg(v)` aggregates multiple histograms component-wise into a single histogram. Confusing them is common.

## Aggregation and `le` — The Critical Difference

The biggest day-to-day query difference between classic and native histograms is aggregation behavior.

### Classic — `le` must survive

```promql
# WRONG — `le` is stripped, histogram_quantile cannot determine bucket bounds
histogram_quantile(0.95, sum by (job) (rate(http_request_duration_seconds_bucket[5m])))

# CORRECT
histogram_quantile(0.95, sum by (job, le) (rate(http_request_duration_seconds_bucket[5m])))
histogram_quantile(0.95, sum without (instance) (rate(http_request_duration_seconds_bucket[5m])))
```

### Native — aggregation is free

One sample; summing native histograms adds matching buckets component-wise.

```promql
# All of these work — no `le` to track
histogram_quantile(0.95, sum by (job) (rate(http_request_duration_seconds[5m])))
histogram_quantile(0.95, sum(rate(http_request_duration_seconds[5m])))
histogram_quantile(0.95, sum without (pod, instance) (rate(http_request_duration_seconds[5m])))
```

`sum` and `avg` are the only aggregation operators native to histograms. Others (`min`, `max`, `topk`, `bottomk`,
`stddev`, `stdvar`, `quantile`) silently ignore histogram samples and emit an info-level annotation per ignored series.

`group`, `count`, `count_values`, `limitk`, `limit_ratio` work uniformly across floats and histograms — their results
don't depend on sample values.

## Native Histograms with Custom Buckets (NHCB)

Hybrid form: schema -53. Bucket boundaries are explicit (not exponential), storage is single-series like a native
histogram. Two reasons NHCBs exist:

1. **Drop-in migration** — Prometheus can ingest classic histograms as NHCBs, getting native-histogram storage
   efficiency without changing instrumentation.
2. **Domain-specific buckets** — distributions where exponential bucketing is a bad fit and boundaries are known in
   advance (e.g., SLO at exactly 300ms requires a bucket boundary at 0.3).

### Query semantics

- All `histogram_*` functions work the same as for standard native histograms.
- `histogram_quantile` interpolates linearly within an NHCB bucket (matching classic histogram behavior), not
  exponentially.
- NHCBs with **different** custom bucket sets cannot be cleanly aggregated. Prometheus reconciles via shared boundaries;
  with none, all observations collapse into the overflow bucket. Info-level annotation flags this.
- Standard native histograms (any schema -4 to +8) are always reconcilable — buckets merge to the lowest common
  resolution.

### Detection

NHCBs are not distinguishable from standard native histograms via metadata or syntax. The difference shows up in:

- Slightly different interpolation in quantile estimates
- Aggregation behavior when buckets don't align
- Info-level annotations during cross-NHCB operations

**Practical rule:** write queries the same regardless of NHCB vs standard schema. If quantile results from
cross-instance aggregation look surprisingly coarse, NHCB bucket reconciliation may have collapsed buckets.

## Functions That Work on Native Histograms

Checked against the Prometheus 3 spec.

### Histogram in, histogram out

Rate-family and gauge functions process buckets, count, and sum together, returning a new (gauge) histogram:

- `rate(v[range])`
- `irate(v[range])`
- `increase(v[range])`
- `delta(v[range])`
- `idelta(v[range])`

Result is always a gauge histogram. Counter reset detection works on the whole histogram (decreases in any bucket or the
count, schema changes, disappearing buckets).

### Histogram in, floats out

- `histogram_quantile(φ, v)` — quantile
- `histogram_fraction(lower, upper, v)` — fraction in range
- `histogram_avg(v)` — mean
- `histogram_count(v)` — count
- `histogram_sum(v)` — sum
- `histogram_stddev(v)` / `histogram_stdvar(v)` — population stddev / variance

### Aggregate histograms component-wise

- `sum(v)` / `sum by/without ...` — component-wise addition
- `avg(v)` / `avg by/without ...` — component-wise average

### Aggregate over time (range vector → instant vector)

- `avg_over_time(v[range])` — component-wise mean across the range
- `sum_over_time(v[range])` — component-wise sum across the range

Both drop output for series with a mix of float and histogram samples in the range; flagged warn-level.

### Sample-type-agnostic (existence, sorting, label manipulation)

Don't interact with sample values; work identically across floats and histograms:

- `absent(v)`, `absent_over_time(v[range])`
- `count_over_time(v[range])`, `last_over_time(v[range])`, `present_over_time(v[range])`
- `info(v)` (experimental)
- `label_join(v, ...)`, `label_replace(v, ...)`
- `sort_by_label(v, ...)`, `sort_by_label_desc(v, ...)` (experimental)
- `timestamp(v)`
- `changes(v[range])`, `resets(v[range])` — flavor changes and float↔histogram transitions count as changes/resets

### Set and logical operators

- `and`, `or`, `unless` — work uniformly (operate on label-set membership, ignore sample values)

### Arithmetic with scalars / floats

- `histogram * scalar`, `scalar * histogram` — scale all components (negative scalars produce gauge histograms)
- `histogram / scalar` — division by scalar (scalar on RHS only)
- `histogram + histogram`, `histogram - histogram` — between compatible histograms
- Unary `-histogram` — produce negated histogram (gauge only; cannot be persisted)
- `==`, `!=` — comparison between two histograms (compares schema, buckets, count, sum)

### Trim operators (native-histogram-only)

- `histogram </ scalar` — trim observations above threshold
- `histogram >/ scalar` — trim observations below threshold

Return a new histogram with affected buckets clipped. Sum is re-estimated from remaining buckets — can be inaccurate.
Use primarily for quantile/count derivations, not sum reporting.

```promql
# Count of requests between 200ms and 500ms
histogram_count(http_request_duration_seconds >/ 0.2 </ 0.5)
```

## Functions That Do NOT Work on Native Histograms

Spec rule (line 972): "All remaining functions not mentioned [as working] do _not_ work with native histograms.
Histogram elements in the input vector are silently ignored." Mixed float/histogram ranges flag the removal at
info-level. Pure-histogram inputs that are silently dropped get no guaranteed annotation — the silent drop is the
failure mode to watch.

Functions in this catch-all "ignore histograms" set:

- `deriv()`, `predict_linear()`, `double_exponential_smoothing()`
- `min_over_time()`, `max_over_time()`, `quantile_over_time()`, `stddev_over_time()`, `stdvar_over_time()`,
  `mad_over_time()` and all `ts_of_*_over_time` variants
- All math functions on values (`abs`, `ceil`, `floor`, `round`, `clamp`, `exp`, `ln`, `log2`, `log10`, `sqrt`, `sgn`)
- All trigonometric functions
- All time-extraction functions (`year`, `month`, `day_of_*`, `hour`, `minute`)
- `scalar()`, `vector()`
- Aggregations: `min`, `max`, `topk`, `bottomk`, `stddev`, `stdvar`, `quantile`

To use these on a histogram, extract a float first with `histogram_quantile`, `histogram_count`, `histogram_sum`,
`histogram_avg`, etc., then apply the function.

```promql
# WRONG — predict_linear silently ignores histograms
predict_linear(http_request_duration_seconds[1h], 3600)

# CORRECT — extract a float, then predict
predict_linear(histogram_count(rate(http_request_duration_seconds[5m]))[1h:], 3600)
```

## Mixed Environments and Migration Patterns

Spec transition strategy: ingest classic and native histograms in parallel for a period, migrate queries one at a time,
then disable the classic form. There is no canonical PromQL pattern for a single query that transparently works against
both — migration is structural (parallel ingestion + per-query rewrite), not a syntactic trick.

### Side-by-side scraping

When Prometheus scrapes both versions of the same instrumented histogram, both land in the TSDB:

- `http_request_duration_seconds` (native)
- `http_request_duration_seconds_bucket{le="..."}`, `http_request_duration_seconds_count`,
  `http_request_duration_seconds_sum` (classic)

Most dashboards and recording rules can switch over one query at a time. Classic series remain queryable until
explicitly turned off.

### Range queries that span the transition

A range vector crossing the transition (classic → native) is **incomplete** — the classic selector sees no data after
cutover; the native selector sees none before.

```promql
# Crosses the cutover — partial data
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1d]))
```

**Mitigation:**

- Keep both forms ingested for at least the longest range-query window in your dashboards before disabling classic. 30
  day dashboard → keep both for 30+ days.
- For dashboards querying farther back than the parallel period, write a dynamic switchover (complex, brittle) or wait
  out the parallel-ingestion period before migrating.

### Cross-form aggregation does not work

Native and classic histograms cannot be aggregated **with each other** — `sum`ing a native histogram and a `_bucket`
series doesn't combine them meaningfully. The selector either matches both (and `histogram_quantile` dispatches
per-element) or one form at a time.

## Gotchas and Limitations

### Cardinality consideration

A native histogram is **one series** but carries more data per sample than a float. Storage and query cost scale with
bucket count. Limit bucket count via `NativeHistogramBucketFactor` (instrumentation) or scrape-time limits to keep
queries fast.

### Limited exposition format

Native histograms currently require Prometheus protobuf exposition format. OpenMetrics text-format support is in
progress. Only a few instrumentation libraries (Go, Java) have full native histogram support; others lag.
**Instrumentation-side** constraint — query semantics unaffected.

### Recording rules produce float histograms

Recording rule output is always a float histogram (even if input is an integer histogram). TSDB implementations may
convert back to integer storage; invisible at query time.

### Negative observation handling

For classic histograms, negative observations make `_sum` decrease, which `rate()` interprets as a counter reset (silent
bug). Native histograms detect counter resets at the **whole-histogram** level — `_sum` decreasing alone is not a reset,
so `rate()` works correctly on histograms with negative observations.

### `histogram_count` on a sub-query

A sub-query on the result of `histogram_sum()` (or any function extracting a float from a histogram) loses the
specialized counter-reset detection for native histograms. Negative observations can then cause spurious counter resets
in the float output.

**Fix:** apply `rate()` to the histogram first, then extract the float.

```promql
# WRONG
rate(histogram_sum(http_request_duration_seconds)[5m:])

# CORRECT
histogram_sum(rate(http_request_duration_seconds[5m]))
```

### NHCB reconciliation collapse

Aggregating NHCBs with different custom buckets can collapse all observations into the overflow bucket if no boundaries
are shared. The query returns a one-bucket histogram, degrading the quantile estimate. Info-level annotation flags this
— check annotations when NHCB results look wrong.

### `topk` / `min` / `max` / `quantile` cannot rank histograms

`topk(5, http_request_duration_seconds)` doesn't work — native histograms have no comparable sample value. Extract a
float first:

```promql
topk(5, histogram_count(rate(http_request_duration_seconds[5m])))
```

### Unary minus produces a gauge

`-histogram` flips all bucket populations and the count/sum signs. Result is always a gauge histogram; cannot be
persisted by a recording rule (evaluation fails on negative histograms). Valid only as intermediate results within a
single expression.

### Avoid native histograms in alert templates

Alert templates rendering a histogram via `{{ $value }}` produce text like
`{count:..., sum:..., [bound,bound]:pop, ...}` — unreadable in most notification channels. Extract a float in the alert
expression instead.

```yaml
# BAD — template renders raw histogram text
- alert: HighLatency
  expr: my_latency_histogram
  annotations:
    summary: "Latency: {{ $value }}"

# GOOD
- alert: HighLatencyP95
  expr: histogram_quantile(0.95, rate(my_latency_histogram[5m])) > 0.5
  annotations:
    summary: "P95 latency is {{ $value }}s"
```

## Annotations as Debugging Signals

PromQL emits info-level and warn-level annotations for many native-histogram operations. Check the Prometheus UI
annotations panel when a histogram query returns surprising results.

**Common annotations:**

- **warn** — counter reset hint conflict between two histograms being summed
- **warn** — operation removed elements due to mixed float/histogram samples in a range vector
- **warn** — incompatible histogram bucket layouts that could not be reconciled
- **info** — NHCB reconciliation collapsed buckets to find common boundaries
- **info** — `histogram_quantile` saw `NaN` observations, skewing the result toward higher values
- **info** — function silently dropped histogram samples it cannot process
- **info** — counter-reset detection forced on a gauge histogram

Annotations are the primary debugging surface for native-histogram issues. No annotations → usually label-matching or
rate-window problem. Annotations present → sample-type or compatibility issue.
