---
name: statsd
description: >-
  StatsD metric instrumentation: push metrics over UDP, choose the right metric
  type, name consistently. Invoke whenever task involves any interaction with
  StatsD metrics — emitting counters, gauges, timers, histograms, sets, or
  distributions; configuring DogStatsD tags; tuning sampling rates; or
  integrating with Graphite, Prometheus, or Telegraf backends.
---

# StatsD

Choose the right metric type, name it with dot-delimited hierarchy, tag dimensions instead
of encoding them in names. StatsD is fire-and-forget: UDP means zero latency impact on
your application, but wrong metric types or bad naming corrupt your data silently.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Metric types | `references/metric-types.md` | Wire format details, type comparison, sampling correction |
| Naming | `references/naming.md` | Graphite namespace mapping, character rules, naming examples |
| DogStatsD | `references/dogstatsd.md` | Events format, service checks, protocol versions, distributions vs histograms |
| Aggregation | `references/aggregation.md` | Flush mechanics, Graphite downsampling, DogStatsD aggregation, timestamps |
| Client patterns | `references/client-patterns.md` | High-throughput tuning, error handling, K8s deployment, UDS configuration |
| Backends | `references/backends.md` | statsd_exporter config, Telegraf setup, migration guides |

## Metric Types

Wire format: `<metric_name>:<value>|<type>[|@<sample_rate>][|#<tags>]`

### Decision Matrix

| Question | Type |
|----------|------|
| How many times did X happen? | Counter (`c`) |
| What is X right now? | Gauge (`g`) |
| How long did X take? | Timer (`ms`) |
| What is the distribution of X? | Histogram (`h`) |
| How many unique X occurred? | Set (`s`) |
| What is the global distribution of X? | Distribution (`d`, DogStatsD only) |

Wrong metric type = wrong math at the server. A gauge used as a counter loses data
between flushes. A counter used as a gauge produces meaningless rates.

### Counter (`|c`)

Measures rate of events over time. Server sums all values during flush interval,
resets to 0 after flush, reports both raw count and per-second rate.

- Use for: request counts, error counts, event occurrences (cache hits, logins)
- Sample rate correction: value multiplied by `1/rate`
- Supports sampling (`|@<rate>`)

### Gauge (`|g`)

Instantaneous value at a point in time. Server stores last value received,
retains between flushes (sticky).

- Use for: queue depth, active connections, memory/CPU usage, thread pool size
- Signed values (`+N`, `-N`) modify current value incrementally
- Cannot set to a negative number directly — set to 0 first, then decrement
- **Do not sample gauges** — server cannot correct for sampling on point-in-time values

### Timer (`|ms`)

Duration of an operation in milliseconds. Server computes per flush interval:
count, mean, upper (max), lower (min), sum, stddev, median, configurable
percentiles (p90, p95, p99).

- Use for: HTTP request latency, DB query duration, function execution time
- Supports sampling (`|@<rate>`)

### Histogram (`|h`)

Distribution of values over time. Identical to timer in most implementations.
DogStatsD treats histograms as the native distribution type.

- Use for: request payload sizes, response body sizes, batch sizes
- Conceptually: timers measure duration, histograms measure arbitrary distributions

### Set (`|s`)

Count of unique values per flush interval. Server tracks distinct values, reports
cardinality at flush, resets.

- Use for: unique users, unique IPs, unique error codes per interval
- **Do not sample sets** — sampling breaks uniqueness tracking

### Distribution (`|d`) — DogStatsD Only

Global distribution across all hosts. Raw values sent to Datadog servers (not
aggregated locally). Use when you need accurate fleet-wide percentiles.

See `references/dogstatsd.md` for distributions vs histograms comparison and
protocol version details.

## Naming

Format: `<namespace>.<subsystem>.<target>.<metric>.<unit>`

Example: `myapp.api.request.duration.ms`, `myapp.cache.hit.count.total`

### Naming Rules

1. Always namespace by service name — `myapp.api.requests` not just `requests`
2. Use dot-delimited hierarchy
3. Include the unit: `.ms`, `.bytes`, `.total`, `.items`
4. Dimensions go in tags, not metric names (when tags are available)
5. Use lowercase everywhere — some backends are case-sensitive
6. Use underscores within path segments: `http_request` not `httpRequest`
7. No dashes — they break Graphite navigation

See `references/naming.md` for Graphite namespace mapping, character rules table,
and naming anti-patterns.

## Tags (DogStatsD)

Format: `metric.name:1|c|#key1:value1,key2:value2` — comma-separated, no spaces.

### Tag Rules

1. Use tags for dimensions you will filter or group by — not metric names
2. Keep cardinality bounded — each unique tag combination creates a separate time series
3. No spaces in tag values — use underscores: `region:us_east`

### Unified Service Tagging

Set these as global/constant tags on the client — attach to every metric automatically:

| Tag | Purpose | Example |
|-----|---------|---------|
| `env` | Deployment environment | `env:production` |
| `service` | Service name | `service:payment-api` |
| `version` | Deployed version | `version:2.1.0` |

### Tag Cardinality

Rule of thumb: if a tag can have >1000 distinct values, do not use it. Use logs or
traces for high-cardinality data.

| Tag | Cardinality | Acceptable? |
|-----|-------------|-------------|
| `env:production` | ~3-5 | Yes |
| `method:GET` | ~7 | Yes |
| `status_code:200` | ~20-50 | Yes |
| `endpoint:/api/users` | ~50-200 | Caution |
| `user_id:12345` | Unbounded | No |

## Aggregation and Flush

The flush cycle determines metric resolution. Default: 10 seconds.

- Counters reset to 0 after flush; gauges are sticky (retain last value)
- If no counter values received during flush: behavior depends on `deleteCounters`
  config (default: send 0)
- Enable client-side aggregation for high-throughput applications (Go v5.0+,
  Java v3.0+, .NET v7.0+) — pre-aggregates before sending to Agent

See `references/aggregation.md` for flush mechanics, Graphite downsampling rules,
DogStatsD aggregation details, and pre-aggregated timestamps.

## Client Patterns

### Initialization

1. **One client instance per application** — do not create per-request
2. **Set namespace prefix** — auto-prepends to all metric names
3. **Set global/constant tags** — env, service, version set once
4. **Close/flush on shutdown** — buffered metrics lost otherwise

### Buffering

Enable client-side buffering — packs multiple metrics into single UDP packets.
Reduces syscall overhead in hot paths. Most modern DogStatsD clients buffer by
default. Call `flush()` before shutdown.

### Sampling

Client randomly decides whether to send each metric based on sample rate. Datagram
includes `|@<rate>` so server corrects the count.

| Volume | Recommendation |
|--------|---------------|
| < 1000 metrics/sec | `rate=1.0` (no sampling) |
| 1000-10000/sec | `rate=0.5` to `0.1` for counters/timers |
| > 10000/sec | `rate=0.1` or lower; enable client-side aggregation |

**Never sample gauges or sets** — server cannot correct for these types.

See `references/client-patterns.md` for high-throughput tuning steps, error handling,
and Kubernetes deployment patterns.

## Backends

| Need | Backend |
|------|---------|
| Simple, self-hosted graphing | Graphite |
| Cloud monitoring + APM | Datadog (DogStatsD) |
| Prometheus ecosystem integration | statsd_exporter |
| Flexible multi-output pipeline | Telegraf |
| Migrating StatsD to Prometheus | statsd_exporter with relay |

See `references/backends.md` for statsd_exporter configuration, Telegraf setup,
and migration guides.

## Application

When **writing** StatsD instrumentation:
- Choose the metric type based on what the value represents, not convenience.
- Apply naming conventions silently — don't narrate each rule.
- If an existing codebase contradicts a convention, follow the codebase
  pattern and flag the divergence once.
- Always configure client-side buffering for production use.

When **reviewing** StatsD instrumentation:
- Check metric type correctness first — most common and most damaging mistake.
- Verify tag cardinality is bounded.
- Cite the specific issue and show the fix inline.

## Integration

The coding skill governs workflow; this skill governs StatsD instrumentation choices.
