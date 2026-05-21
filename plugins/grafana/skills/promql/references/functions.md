# Functions

Full PromQL function catalog by category. `rate()` and `histogram_quantile()` alone account for the majority of
production queries.

## Contents

- [Counter Family — `rate`, `irate`, `increase`](#counter-family--rate-irate-increase)
- [Gauge Functions — `delta`, `idelta`, `deriv`, `predict_linear`](#gauge-functions--delta-idelta-deriv-predict_linear)
- [Classic Histogram — `histogram_quantile`, `histogram_quantiles`](#classic-histogram--histogram_quantile-histogram_quantiles)
- [Native Histogram — `histogram_*`](#native-histogram--histogram_)
- [Aggregation Over Time — `*_over_time`](#aggregation-over-time--_over_time)
- [Existence and Counter Reset — `absent`, `present`, `resets`, `changes`](#existence-and-counter-reset--absent-present-resets-changes)
- [Label Manipulation — `label_replace`, `label_join`, `info`](#label-manipulation--label_replace-label_join-info)
- [Math — `abs`, `ceil`, `floor`, `round`, `clamp`, `exp`, `ln`, `log2`, `log10`, `sqrt`, `sgn`](#math--abs-ceil-floor-round-clamp-exp-ln-log2-log10-sqrt-sgn)
- [Type Conversion — `scalar`, `vector`](#type-conversion--scalar-vector)
- [Time — `time`, `timestamp`, `year`, `month`, `day_of_*`, `hour`, `minute`](#time--time-timestamp-year-month-day_of_-hour-minute)
- [Sorting — `sort`, `sort_desc`, `sort_by_label`](#sorting--sort-sort_desc-sort_by_label)
- [Smoothing — `double_exponential_smoothing`](#smoothing--double_exponential_smoothing)
- [Trigonometric — `sin`, `cos`, `tan`, `pi`, `deg`, `rad`, ...](#trigonometric--sin-cos-tan-pi-deg-rad-)

---

## Counter Family — `rate`, `irate`, `increase`

Turn monotonically-increasing counters into something meaningful. All take a range vector, return an instant vector,
handle counter resets automatically (decreases interpreted as restarts).

### `rate(v range-vector)`

Per-second average rate of increase over the range, with extrapolation to the range boundaries.

```promql
rate(http_requests_total[5m])                          # per-second rate over 5m
rate(http_requests_total{job="api-server"}[5m])
```

- **Use for:** alerts, dashboards, slow-moving counters.
- **Range:** ≥4× scrape interval. `[5m]` is the standard default with 15s scrapes.
- **Aggregation order:** `sum(rate(x[5m]))` is correct; `rate(sum(x)[5m])` is wrong — rate must see individual counter
  resets per series before aggregation.

### `irate(v range-vector)`

Per-second rate from the **last two samples** in the range. Reacts quickly; volatile.

```promql
irate(http_requests_total[1m])                         # instant rate from last 2 points
```

- **Use for:** graphing volatile, fast-moving counters where spikes matter.
- **Avoid for alerts:** brief spikes flap the `for:` clause.
- **Aggregation order:** `irate()` first, then `sum()`.

### `increase(v range-vector)`

Total increase over the range. Syntactic sugar for `rate(v) * range_seconds`.

```promql
increase(http_requests_total[1h])                      # total requests in last hour
```

- **Use for:** human-readable "how many in the last hour" dashboards, business reports.
- **Use `rate()` in recording rules** for consistent per-second tracking; `increase()` rescales when the range changes.
- Result may be non-integer even for integer counters — extrapolation aligns to range boundaries.

### Counter Function Rules

- Only make sense on counters. Applying to a gauge produces nonsense — PromQL does not warn (except gauge native
  histograms).
- Need ≥2 samples in the range. Rule of thumb: 4× scrape interval, minimum 1m.
- **Always `rate()` first, then aggregate.** Counter resets are per-series; summing across restarting instances drops
  the sum, and `rate()` interprets that as a reset.

## Gauge Functions — `delta`, `idelta`, `deriv`, `predict_linear`

For metrics that go up and down, not for counters.

### `delta(v range-vector)`

Difference between first and last sample in the range, extrapolated.

```promql
delta(cpu_temp_celsius[2h])                            # temperature change over 2 hours
```

For gauges only.

### `idelta(v range-vector)`

Difference between the **last two** samples. Like `delta` but without extrapolation.

### `deriv(v range-vector)`

Per-second derivative via simple linear regression. Smooths noise.

```promql
deriv(node_memory_MemAvailable_bytes[5m])              # how fast available memory is changing
```

For gauges only. Returns `NaN` if the range contains `+Inf` or `-Inf`.

### `predict_linear(v range-vector, t scalar)`

Predicts the gauge value `t` seconds from now via linear regression on the range.

```promql
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600) < 0
# "Will the / filesystem be full in the next 4 hours?"
```

Classic disk-space alerting pattern. Requires ≥2 float samples in the range.

## Classic Histogram — `histogram_quantile`, `histogram_quantiles`

Classic histograms expose `_bucket{le="..."}`, `_sum`, and `_count` series.

### `histogram_quantile(φ, b)`

φ-quantile (0 ≤ φ ≤ 1) from classic histogram bucket series.

```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Aggregation rule:** the `le` label **must** be preserved when aggregating buckets across instances.

```promql
histogram_quantile(0.95, sum by (job, le) (rate(http_request_duration_seconds_bucket[5m])))
histogram_quantile(0.95, sum without (instance, pod) (rate(http_request_duration_seconds_bucket[5m])))
```

**Edge cases:**

- 0 observations → `NaN`
- φ < 0 → `-Inf`; φ > 1 → `+Inf`
- Fewer than 2 buckets → `NaN`
- Highest bucket must be `+Inf`, else `NaN`
- Quantile in the highest bucket returns the upper bound of the second-highest bucket
- Non-monotonic bucket counts are silently fixed with an info annotation

**Interpretation tip:** `histogram_quantile(0, x)` ≈ minimum observed value; `histogram_quantile(1, x)` ≈ maximum.

### `histogram_quantiles(v, label, φ1, φ2, ...)`

Experimental — multiple quantiles in one pass, one series per quantile with the configured label.

```promql
histogram_quantiles(sum(rate(http_request_duration_seconds_bucket[5m])), "quantile", 0.5, 0.9, 0.99)
# => {quantile="0.5"} ...
#    {quantile="0.9"} ...
#    {quantile="0.99"} ...
```

Requires `--enable-feature=promql-experimental-functions`.

### Average from Classic Histogram

The `_sum` / `_count` series let you compute the mean directly:

```promql
rate(http_request_duration_seconds_sum[5m])
  /
rate(http_request_duration_seconds_count[5m])
```

## Native Histogram — `histogram_*`

Single time series per histogram with composite samples. Functions work directly on the histogram metric (no `_bucket`
suffix).

- **`histogram_quantile(φ, v)`** — same function as classic; works without `le` aggregation.

  ```promql
  histogram_quantile(0.9, sum(rate(http_request_duration_seconds[5m])))
  ```

- **`histogram_fraction(lower, upper, v)`** — estimated fraction of observations between bounds.

  ```promql
  histogram_fraction(0, 0.2, rate(http_request_duration_seconds[1h]))   # fraction ≤ 200ms over 1h
  ```

  Boundaries can be `-Inf` / `+Inf`. Used for SLO-style "X% of requests under Y ms" queries.

- **`histogram_avg(v)`** — average of observed values. Equivalent to `histogram_sum(v) / histogram_count(v)`.
- **`histogram_count(v)`** — count of observations.
- **`histogram_sum(v)`** — sum of observed values.
- **`histogram_stddev(v)`** / **`histogram_stdvar(v)`** — estimated standard deviation / variance.

**Migration note:** for metrics ingested as Native Histograms with Custom Buckets (NHCB), the function set is identical
to native histograms — `histogram_quantile`, `histogram_fraction`, etc. all apply.

## Aggregation Over Time — `*_over_time`

Aggregate each series across the time dimension. Range vector → instant vector (one sample per series).

- **`avg_over_time(range-vector)`** — average value over the range
- **`min_over_time(range-vector)`** — minimum (float samples only)
- **`max_over_time(range-vector)`** — maximum (float samples only)
- **`sum_over_time(range-vector)`** — sum
- **`count_over_time(range-vector)`** — number of samples (useful for sample density checks)
- **`last_over_time(range-vector)`** — most recent sample
- **`present_over_time(range-vector)`** — value `1` for every series that has any sample in the range
- **`quantile_over_time(φ, range-vector)`** — quantile across the time dimension
- **`stddev_over_time(range-vector)`** / **`stdvar_over_time(range-vector)`**

**Experimental** (require `--enable-feature=promql-experimental-functions`):

- `mad_over_time` — median absolute deviation
- `first_over_time` — oldest sample in the range
- `ts_of_min_over_time` / `ts_of_max_over_time` / `ts_of_last_over_time` / `ts_of_first_over_time` — timestamps of the
  corresponding samples

**Use cases:**

```promql
avg_over_time(node_memory_MemAvailable_bytes[1h])                  # 1h smoothed memory
max_over_time(rate(http_requests_total[1m])[1h:])                  # peak RPS in last hour (subquery)
quantile_over_time(0.99, rate(latency_seconds_count[5m])[1d:])     # P99 of rates over the day
```

**Caveat:** sample weighting is uniform — uneven spacing biases the result toward periods with more samples.

`first_over_time(m[1m])` differs from `m offset 1m`: the former picks the first sample **within** the 1m window; the
latter picks the latest sample **before** the 1m offset (within the lookback window).

## Existence and Counter Reset — `absent`, `present`, `resets`, `changes`

### `absent(v instant-vector)`

Returns a 1-element vector with value `1` if the input is empty, otherwise empty. Derives labels from the input selector
when possible.

```promql
absent(up{job="critical-service"})           # alert when "up" series disappears for the job
absent(nonexistent{job="myjob"})             # => {job="myjob"} 1
absent(sum(nonexistent{job="myjob"}))        # => {} 1   (no derivable labels)
```

### `absent_over_time(v range-vector)`

Same idea, but checks a time range:

```promql
absent_over_time(up{job="critical-service"}[5m])     # missing for the entire 5-minute window
```

### `resets(v range-vector)`

Counter reset count in the range. Each decrease between consecutive samples is one reset.

```promql
resets(http_requests_total[1h])              # how many target restarts in the last hour
```

For counters only — gauges yield nonsense.

### `changes(v range-vector)`

Number of times the value changed in the range. Any metric type.

```promql
changes(up[1h])                              # restart count: up flips between 0 and 1
```

## Label Manipulation — `label_replace`, `label_join`, `info`

### `label_replace(v, dst, replacement, src, regex)`

For each series in `v`, run `regex` against `src`'s value. On match, set `dst` to the expansion of `replacement` (`$1`,
`$2`, or `$name` for named groups).

```promql
label_replace(up{instance="host:9100"}, "host", "$1", "instance", "(.+):.*")
# Adds host="host" label
```

No match → original series passes through unchanged.

### `label_join(v, dst, separator, src1, src2, ...)`

Concatenate the values of multiple source labels into a new label.

```promql
label_join(rate(http_requests_total[5m]), "endpoint", " ", "method", "path")
# Adds endpoint="GET /api/widgets"
```

### `info(v, [data-label-selector])`

Experimental — automatic join with info metrics (`target_info`, `*_build_info`, etc.).

```promql
info(rate(http_server_request_duration_seconds_count[2m]))
# Adds all data labels from matching target_info series

info(rate(http_server_request_duration_seconds_count[2m]), {k8s_cluster_name=~".+"})
# Adds only the k8s_cluster_name label
```

Equivalent to `<expr> * on (job, instance) group_left (<labels>) target_info`, but handles staleness correctly when
target_info data labels change.

Requires `--enable-feature=promql-experimental-functions`. Currently locked to `target_info` matching by
`(job, instance)`.

## Math — `abs`, `ceil`, `floor`, `round`, `clamp`, `exp`, `ln`, `log2`, `log10`, `sqrt`, `sgn`

Standard scalar math, element-wise on instant vectors. Silently ignore histogram samples.

- **`abs(v)`** — absolute value
- **`ceil(v)`** — round up
- **`floor(v)`** — round down
- **`round(v, to_nearest=1)`** — round to nearest; `to_nearest` is the granularity (can be fractional)
- **`clamp(v, min, max)`** — clamp into `[min, max]`; returns empty vector if `min > max`
- **`clamp_min(v, min)`** / **`clamp_max(v, max)`** — one-sided
- **`exp(v)`** — `e^v`
- **`ln(v)`** — natural log
- **`log2(v)`** — base-2 log
- **`log10(v)`** — base-10 log
- **`sqrt(v)`** — square root
- **`sgn(v)`** — sign function: `-1`, `0`, or `1`

Edge cases follow IEEE 754: `ln(0) = -Inf`, `ln(-1) = NaN`, etc.

## Type Conversion — `scalar`, `vector`

- **`scalar(v instant-vector)`** — if `v` has exactly one element with a float sample, return its value as a scalar.
  Otherwise return `NaN`. Histogram samples in the input are silently ignored.

  ```promql
  scalar(sum(up == 1))                  # collapse to a number for use as a divisor
  ```

- **`vector(s scalar)`** — convert a scalar to a single-element instant vector with no labels.

  ```promql
  vector(0)                             # produces a "{} 0" series — useful for alerts/dashboards needing a baseline
  ```

## Time — `time`, `timestamp`, `year`, `month`, `day_of_*`, `hour`, `minute`

- **`time()`** — Unix timestamp at query evaluation time (not real wall-clock time).
- **`timestamp(v instant-vector)`** — Unix timestamp of each sample in `v`.

  ```promql
  time() - my_last_success_timestamp_seconds > 3600    # batch hasn't succeeded in an hour
  ```

- **`year(v)`** / **`month(v)`** / **`day_of_month(v)`** / **`day_of_week(v)`** / **`day_of_year(v)`** /
  **`days_in_month(v)`** / **`hour(v)`** / **`minute(v)`** — interpret samples as Unix timestamps; return the
  corresponding field in UTC. Without an argument, default to `vector(time())` for the current time.

```promql
hour() == 9 and day_of_week() == 1                     # 9am on Monday — useful for business-hours alerts
```

## Sorting — `sort`, `sort_desc`, `sort_by_label`

- **`sort(v)`** — ascending by sample value
- **`sort_desc(v)`** — descending by sample value
- **`sort_by_label(v, label, ...)`** — ascending by label values (experimental, natural sort)
- **`sort_by_label_desc(v, label, ...)`** — descending (experimental)

**Sort functions affect instant queries only.** Range queries return series in a fixed order regardless. For dashboard
ordering, use Grafana's panel sort options.

## Smoothing — `double_exponential_smoothing`

Experimental — formerly `holt_winters`.

```promql
double_exponential_smoothing(node_load1[1h], 0.5, 0.1)
```

Args: `sf` (smoothing factor) and `tf` (trend factor), both in `[0, 1]`. Lower `sf` → more weight on old data; higher
`tf` → trends weighted more. Gauges only.

## Trigonometric — `sin`, `cos`, `tan`, `pi`, `deg`, `rad`, ...

Radians. Ignore histogram samples.

- Direct: `sin`, `cos`, `tan`, `sinh`, `cosh`, `tanh`
- Inverse: `asin`, `acos`, `atan`, `asinh`, `acosh`, `atanh`
- Helpers: `pi()`, `deg(v)` (radians → degrees), `rad(v)` (degrees → radians)

Use `atan2(y, x)` as a **binary operator** for vector matching — see [`operators.md`](operators.md).

Niche for monitoring — angular sensor data, geospatial, scientific measurements.
