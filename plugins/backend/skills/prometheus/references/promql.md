# PromQL

Prometheus Query Language — a functional language for selecting and aggregating
time series data. Understanding PromQL's data types, operators, and functions is
essential for dashboards, alerts, and recording rules.

## Data Types

| Type | Description | Example |
|------|-------------|---------|
| Instant vector | Set of time series, one sample each, same timestamp | `http_requests_total` |
| Range vector | Set of time series, range of samples over time | `http_requests_total[5m]` |
| Scalar | Single numeric float | `3.14` |
| String | Single string value (currently unused) | `"hello"` |

Range vectors cannot be graphed directly — they must be passed through a function
like `rate()` that returns an instant vector.

## Selectors

### Instant Vector

```promql
http_requests_total                                    # by name
http_requests_total{job="api", method="GET"}           # with label matchers
http_requests_total{status=~"5.."}                     # regex match
http_requests_total{method!="OPTIONS"}                 # negative match
```

**Label matchers:**
- `=`  exact match
- `!=` not equal
- `=~` regex match (fully anchored: `"foo"` becomes `"^foo$"`)
- `!~` negative regex match

### Range Vector

Append `[duration]` to select a time range:

```promql
http_requests_total{job="api"}[5m]      # last 5 minutes
http_requests_total[1h]                 # last 1 hour
```

**Duration units:** `ms`, `s`, `m`, `h`, `d`, `w`, `y`

Combine: `1h30m`, `12h34m56s`

### Modifiers

```promql
http_requests_total offset 5m           # 5 minutes ago
http_requests_total @ 1609746000        # at specific Unix timestamp
rate(http_requests_total[5m] offset 1w) # rate one week ago
```

## Key Functions

### Rate and Increase (Counters)

```promql
# Per-second rate over 5 minutes — use for alerts, dashboards
rate(http_requests_total[5m])

# Total increase over 5 minutes — use for human-readable counts
increase(http_requests_total[5m])

# Instant rate from last two samples — use for volatile, fast-moving counters only
irate(http_requests_total[5m])
```

**Rules:**
- `rate()` first, then aggregate: `sum(rate(x[5m]))` not `rate(sum(x)[5m])`
- `rate()` for alerts and slow counters; `irate()` only for graphing volatile counters
- `increase()` is syntactic sugar for `rate() * range_seconds`
- Use `rate()` in recording rules for consistent per-second tracking

### Histogram Quantiles

```promql
# 95th percentile from a single histogram
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 95th percentile aggregated across instances, by job
histogram_quantile(0.95, sum by (job, le) (rate(http_request_duration_seconds_bucket[5m])))

# Average request duration
rate(http_request_duration_seconds_sum[5m])
/
rate(http_request_duration_seconds_count[5m])
```

**Critical:** When aggregating histogram buckets, always preserve `le` in the
`by` clause — `histogram_quantile()` requires it.

### Gauges

```promql
# Current value
node_memory_MemAvailable_bytes

# Change over time (not rate — gauges are not counters)
delta(cpu_temp_celsius[2h])

# Derivative (per-second change)
deriv(node_memory_MemAvailable_bytes[5m])

# Predict future value
predict_linear(node_filesystem_avail_bytes[1h], 4*3600)  # 4 hours from now
```

### Existence Checks

```promql
# Returns 1 if metric is absent — useful for alerting on missing metrics
absent(up{job="myservice"})

# Same but over a time range
absent_over_time(up{job="myservice"}[5m])
```

### Aggregation Over Time

```promql
avg_over_time(metric[1h])       # average over last hour
max_over_time(metric[1h])       # max over last hour
min_over_time(metric[1h])       # min over last hour
count_over_time(metric[1h])     # number of samples
quantile_over_time(0.95, metric[1h])  # 95th percentile over time
```

## Aggregation Operators

All aggregation operators take an instant vector and return a new vector with
fewer elements.

```promql
sum(v)              # sum across dimensions
avg(v)              # average
min(v) / max(v)     # extremes
count(v)            # count of series
topk(k, v)          # top k by value
bottomk(k, v)       # bottom k by value
quantile(0.95, v)   # quantile across series
stddev(v)           # standard deviation
group(v)            # returns 1 for each group (existence check)
count_values("label", v)  # count unique values
```

### Dimension Control

```promql
# Keep only specified labels
sum by (job, method) (rate(http_requests_total[5m]))

# Remove specified labels (keep everything else)
sum without (instance) (rate(http_requests_total[5m]))
```

Prefer `without` when aggregating away a few labels — it preserves all other
labels including `job`, avoiding conflicts.

## Binary Operators

### Arithmetic

`+`, `-`, `*`, `/`, `%`, `^`

```promql
# Unused memory in MiB
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / 1024 / 1024
```

### Comparison (filtering)

`==`, `!=`, `>`, `<`, `>=`, `<=`

```promql
# Only series where value > 100
http_requests_total > 100

# Returns 0 or 1 with bool modifier
http_requests_total > bool 100
```

### Logical/Set

```promql
vector1 and vector2       # intersection
vector1 or vector2        # union
vector1 unless vector2    # complement (in v1 but not v2)
```

### Vector Matching

```promql
# One-to-one: match on specific labels
method_code:http_errors:rate5m{code="500"} / ignoring(code) method:http_requests:rate5m

# Many-to-one with group_left
method_code:http_errors:rate5m / ignoring(code) group_left method:http_requests:rate5m
```

**`on(labels)`** — match only on listed labels.
**`ignoring(labels)`** — match on all labels except listed.
**`group_left` / `group_right`** — enable many-to-one matching.

## Operator Precedence (highest to lowest)

1. `^`
2. `*`, `/`, `%`, `atan2`
3. `+`, `-`
4. `==`, `!=`, `<=`, `<`, `>=`, `>`
5. `and`, `unless`
6. `or`

All left-associative except `^` (right-associative).

## Common Query Patterns

```promql
# Request rate by job
sum by (job) (rate(http_requests_total[5m]))

# Error ratio
sum(rate(http_request_errors_total[5m])) / sum(rate(http_requests_total[5m]))

# P99 latency by handler
histogram_quantile(0.99, sum by (handler, le) (rate(http_request_duration_seconds_bucket[5m])))

# Top 5 CPU consumers
topk(5, sum by (app) (rate(process_cpu_seconds_total[5m])))

# Disk space prediction — time until full
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 24*3600) < 0

# Alert on missing scrape target
absent(up{job="critical-service"} == 1)
```

## Gotchas

### Staleness

Prometheus returns the most recent sample within the lookback period (default 5
minutes). If a series stops being scraped, it goes stale and disappears from queries.

### Rate Window Size

`rate()` needs at least two samples in the range. With a 15s scrape interval,
`rate(x[30s])` may have only 2 points. Use `rate(x[5m])` or wider for reliability.

Rule of thumb: range should be at least 4x the scrape interval.

### Avoid Expensive Queries

- Bare metric names like `http_requests_total` can expand to thousands of series
- Always filter or aggregate before graphing
- Use recording rules to pre-compute expensive expressions
