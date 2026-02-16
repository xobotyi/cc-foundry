# Aggregation and Flush

StatsD is an aggregation daemon. Understanding flush intervals and
aggregation rules is essential — misconfigured aggregation silently
corrupts metric data, especially after downsampling.

## The Flush Cycle

```
   App sends metrics (UDP)
          |
          v
   StatsD server buffers
          |
          v  (every flush interval, default 10s)
   Aggregate per metric type
          |
          v
   Forward to backend (Graphite, Datadog, etc.)
          |
          v
   Reset counters, sets; retain gauges
```

### Flush Interval

**Default:** 10 seconds.

The flush interval determines:
1. **Resolution** — the finest granularity of your metric data
2. **Backend alignment** — must match the backend's storage schema
3. **Network overhead** — shorter intervals = more flushes = more traffic

**Rule:** Flush interval must be >= the backend's highest-resolution
retention period. If Graphite stores 10-second data, flushing every
5 seconds means only the last value per 10-second window survives.

## Aggregation Rules by Type

| Type | Aggregation | At Flush |
|------|-------------|----------|
| Counter | Sum all received values | Send count + rate, reset to 0 |
| Gauge | Keep last value | Send current value, retain for next flush |
| Timer | Compute statistics | Send min, max, mean, percentiles, count, sum; reset |
| Set | Track unique values | Send cardinality (count of uniques); reset |
| Histogram | Same as timer | Same as timer |

### Counters at Flush

The server sends two values:
- **count**: Sum of all values received (corrected for sample rate)
- **rate**: count / flush_interval (per-second rate)

If no values received during a flush, behavior depends on
`deleteCounters` config (default: send 0).

### Gauges at Flush

The server sends the last value received. If no update occurred
during the flush interval, it resends the previous value (sticky).

**Exception:** `deleteGauges: true` sends nothing if no update
occurred. Use this for gauges that should disappear when a source
stops reporting.

### Timers at Flush

The server computes and sends multiple derived metrics:
```
stats.timers.<name>.count          # number of values received
stats.timers.<name>.mean           # average
stats.timers.<name>.upper          # maximum
stats.timers.<name>.lower          # minimum
stats.timers.<name>.sum            # sum of all values
stats.timers.<name>.stddev         # standard deviation
stats.timers.<name>.median         # 50th percentile
stats.timers.<name>.mean_90        # mean of values in 90th percentile
stats.timers.<name>.upper_90       # 90th percentile value
stats.timers.<name>.sum_90         # sum of values in 90th percentile
```

Percentile thresholds are configurable via `percentThreshold`.

## Graphite Downsampling

Graphite stores data at multiple resolutions. As data ages, it is
downsampled (rolled up) from high to low resolution. The aggregation
method used during downsampling determines whether your data is correct.

### Storage Schema Example

```ini
[stats]
pattern = ^stats.*
retentions = 10s:6h,1min:6d,10min:1800d
```

This means:
- 6 hours of 10-second resolution
- 6 days of 1-minute resolution
- ~5 years of 10-minute resolution

### Storage Aggregation Rules

Different metric suffixes require different downsampling methods:

```ini
[min]
pattern = \.lower$
xFilesFactor = 0.1
aggregationMethod = min

[max]
pattern = \.upper(_\d+)?$
xFilesFactor = 0.1
aggregationMethod = max

[sum]
pattern = \.sum$
xFilesFactor = 0
aggregationMethod = sum

[count]
pattern = \.count$
xFilesFactor = 0
aggregationMethod = sum

[count_legacy]
pattern = ^stats_counts.*
xFilesFactor = 0
aggregationMethod = sum

[default_average]
pattern = .*
xFilesFactor = 0.3
aggregationMethod = average
```

### Why This Matters

Consider a counter reporting `count = 10` every 10 seconds.
At 1-minute downsampling:

| Method | Result | Correct? |
|--------|--------|----------|
| `average` | 10 | No — should be 60 (sum of six 10-second windows) |
| `sum` | 60 | Yes |

Consider a timer reporting `upper = 500ms`:

| Method | Result | Correct? |
|--------|--------|----------|
| `average` | ~350ms | No — you want the worst case |
| `max` | 500ms | Yes |

**If your downsampling is wrong, you won't notice until you look
at graphs for data older than your highest-resolution retention.**

### xFilesFactor

The minimum fraction of data points that must be non-null for a
downsampled value to be stored (vs. stored as null).

- `0.0` — store a value even if only one data point exists
- `0.3` — require 30% of data points to be non-null
- `1.0` — require all data points to be non-null

For counts and sums: use `0` (every event matters).
For averages: use `0.1-0.3` (a single sample is likely unrepresentative).

## DogStatsD Aggregation

DogStatsD follows the same 10-second flush interval but aggregates
differently depending on the metric type:

| Type | Aggregation Rule |
|------|-----------------|
| COUNT | Sum all values, send as RATE (count/interval) |
| GAUGE | Send last value received |
| HISTOGRAM | Compute avg, count, median, max, p95; send each |
| SET | Count unique values |
| DISTRIBUTION | Forward raw values to Datadog for global aggregation |

**Key difference from plain StatsD:** DogStatsD COUNTs are stored
as RATE in Datadog. To see raw counts, apply `cumulative_sum()` or
`integral()` functions in dashboards.

## Client-Side Aggregation

Modern DogStatsD clients (Go v5.0+, Java v3.0+, .NET v7.0+) can
aggregate metrics before sending to the Agent, reducing network
traffic and Agent CPU load.

**What gets aggregated client-side:**
- Counters: summed
- Gauges: last value kept
- Sets: unique values tracked

**What is NOT aggregated client-side:**
- Histograms and distributions: raw values forwarded

Enable client-side aggregation for high-throughput applications
that emit thousands of metrics per second.

## Timestamps and No-Aggregation

DogStatsD v1.3+ supports sending pre-aggregated metrics with explicit
timestamps. When a timestamp is present, the Agent forwards the value
without aggregation.

```
page.views:150|c|#env:prod|T1656581400
```

**Use case:** When your application already performs its own aggregation
(e.g., collecting metrics in-memory and flushing periodically), send
pre-aggregated values with timestamps to avoid double-aggregation.
