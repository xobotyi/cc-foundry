# Metric Types

StatsD supports several metric types, each with distinct aggregation semantics.
Choosing the wrong type produces silently incorrect data.

## Wire Format

All metrics use UTF-8 text over UDP:

```
<metric_name>:<value>|<type>[|@<sample_rate>][|#<tags>]
```

Multiple metrics can share a single UDP packet, separated by newlines.
Keep total payload under the network MTU (Fast Ethernet: 1432 bytes,
Gigabit/jumbo: 8932 bytes, Internet: ~512 bytes).

## Counter (`|c`)

**What it measures:** Rate of events over time.

**Wire format:** `metric.name:<value>|c[|@<sample_rate>]`

**Server behavior:**
- Sums all values received during the flush interval
- Resets to 0 after each flush
- Reports both the raw count and the per-second rate
- Sample rate correction: value multiplied by `1/rate`

**When to use:**
- Request counts
- Error counts
- Event occurrences (cache hits, logins, purchases)
- Any "how many times did X happen?"

**Examples:**
```
requests.total:1|c                    # increment by 1
requests.total:5|c                    # increment by 5
requests.total:1|c|@0.1              # sampled: server multiplies by 10
page.views:1|c|#page:/home,method:GET # DogStatsD tagged counter
```

**Aggregation at flush:**
- `stats.counters.<name>.count` = sum of all received values (rate-corrected)
- `stats.counters.<name>.rate` = count / flush_interval

## Gauge (`|g`)

**What it measures:** Instantaneous value at a point in time.

**Wire format:** `metric.name:<value>|g`

**Server behavior:**
- Stores the last value received
- Retains value between flushes (persists until next update)
- Signed values (`+N`, `-N`) modify the current value incrementally

**When to use:**
- Queue depth
- Active connections
- Memory/CPU usage
- Thread pool size
- Any "what is the current value of X?"

**Examples:**
```
queue.depth:42|g                # set to 42
temperature.celsius:21.5|g      # set to 21.5
queue.depth:+5|g                # increment current value by 5
queue.depth:-3|g                # decrement current value by 3
```

**Important:** You cannot set a gauge to a negative number directly.
Set to zero first, then decrement:
```
gauge.value:0|g
gauge.value:-10|g
```

**Sampling:** Do not sample gauges. The server cannot correct for
sampling on point-in-time values.

## Timer (`|ms`)

**What it measures:** Duration of an operation in milliseconds.

**Wire format:** `metric.name:<value>|ms[|@<sample_rate>]`

**Server behavior:** Computes statistical aggregates per flush interval:
- `count` — number of timing values received
- `mean` / `mean_<pct>` — average (overall and per-percentile)
- `upper` / `upper_<pct>` — maximum value (overall and per-percentile)
- `lower` — minimum value
- `sum` / `sum_<pct>` — total (overall and per-percentile)
- `stddev` — standard deviation
- `median` — 50th percentile
- Configurable percentile thresholds (e.g., p90, p95, p99)

**When to use:**
- HTTP request latency
- Database query duration
- External API call time
- Function execution time
- Any "how long did X take?"

**Examples:**
```
api.request.duration:320|ms             # 320ms request
db.query.time:45|ms                     # 45ms query
api.request.duration:120|ms|@0.5        # sampled at 50%
render.time:85|ms|#template:homepage    # DogStatsD tagged
```

## Histogram (`|h`)

**What it measures:** Distribution of values over time.

**Wire format:** `metric.name:<value>|h[|@<sample_rate>]`

**Server behavior:** Identical to timer in most implementations.
DogStatsD treats histograms as the native distribution type, producing:
- `.count` — number of values received
- `.avg` — average value
- `.median` — 50th percentile
- `.max` — maximum value
- `.95percentile` — 95th percentile (configurable)

**When to use:**
- Request payload sizes
- Response body sizes
- Batch sizes
- Any distribution measurement that isn't strictly a duration

**Difference from timer:** Conceptually, timers measure duration;
histograms measure arbitrary distributions. Most StatsD servers treat
them identically. DogStatsD uses `|h` as the canonical histogram type
and treats `|ms` as a histogram that happens to record durations.

## Set (`|s`)

**What it measures:** Count of unique values per flush interval.

**Wire format:** `metric.name:<value>|s`

**Server behavior:**
- Tracks unique values in a set data structure
- Reports the cardinality (count of distinct values) at each flush
- Resets the set after each flush

**When to use:**
- Unique users per interval
- Unique IP addresses
- Unique error codes
- Any "how many distinct X occurred?"

**Examples:**
```
users.unique:user123|s           # track user123
users.unique:user456|s           # track user456
users.unique:user123|s           # duplicate, ignored
# At flush: count = 2
```

**Sampling:** Do not sample sets. Sampling breaks uniqueness tracking.

## Distribution (`|d`) — DogStatsD Only

**What it measures:** Global distribution across all hosts.

**Wire format:** `metric.name:<value>|d[|@<sample_rate>][|#<tags>]`

**Server behavior:**
- Raw values sent to Datadog servers (not aggregated locally)
- Computes percentiles globally across all reporting hosts
- Produces: sum, count, avg, min, max, p50, p75, p90, p95, p99

**When to use:**
- Latency when you need global percentiles (not per-host)
- Request sizes across a fleet
- Any metric where per-host aggregation would lose meaning

**Difference from histogram:** Histograms aggregate locally per agent,
then send summary statistics. Distributions send raw data points for
global aggregation. Distributions are more accurate for fleet-wide
percentiles but cost more in data transfer and Datadog custom metric
billing.

## Decision Matrix

| Question | Type |
|----------|------|
| How many times did X happen? | Counter (`c`) |
| What is X right now? | Gauge (`g`) |
| How long did X take? | Timer (`ms`) |
| What is the distribution of X? | Histogram (`h`) |
| How many unique X occurred? | Set (`s`) |
| What is the global distribution of X? | Distribution (`d`) |
| Is X incrementing or decrementing? | Counter (`c`) |
| Does X persist between flushes? | Gauge (`g`) |
| Does X need percentiles? | Timer/Histogram (`ms`/`h`) |

## Multi-Metric Packets

Pack multiple metrics into a single UDP datagram separated by `\n`:

```
requests.total:1|c\nresponse.time:42|ms\nqueue.depth:10|g
```

This reduces syscall overhead. Most client libraries handle this
automatically when buffering is enabled.
