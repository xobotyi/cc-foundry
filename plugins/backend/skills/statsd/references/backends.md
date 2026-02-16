# Backends and Integrations

StatsD is a protocol, not a destination. Metrics flow from the StatsD
daemon to one or more backends for storage, visualization, and alerting.
Each backend has different requirements for metric naming, types, and
aggregation.

## Architecture Overview

```
Application  --UDP-->  StatsD Daemon  --flush-->  Backend
                       (aggregation)              (storage + query)
```

Common topologies:

```
# Classic: StatsD -> Graphite
App -> statsd (Node.js) -> Graphite (Carbon + Whisper)

# Datadog: App -> DogStatsD Agent -> Datadog API
App -> datadog-agent (DogStatsD) -> Datadog cloud

# Prometheus: StatsD -> Exporter -> Prometheus
App -> statsd_exporter -> Prometheus (scrape)

# Telegraf: StatsD -> Telegraf -> InfluxDB/other
App -> Telegraf (StatsD input) -> InfluxDB / Prometheus / etc.
```

## Graphite

The original StatsD backend. Graphite stores time-series data in
Whisper files with configurable retention and downsampling.

### Key Considerations

1. **Dots become folders.** `myapp.api.request.count` creates the
   path `myapp/api/request/count.wsp`. Choose names that form a
   navigable hierarchy.

2. **Retention must align with flush interval.** If Graphite's
   highest-resolution retention is 10 seconds, StatsD must flush
   at least every 10 seconds. Faster flushes cause data loss (only
   last value per interval survives).

3. **Aggregation method must match metric type.** Misconfigured
   downsampling silently corrupts data. See
   [aggregation.md](aggregation.md) for correct configuration.

4. **No native tags.** All dimensions must be encoded in the metric
   name. This is the primary limitation of Graphite-backed StatsD.

### Storage Schema Example

```ini
[stats]
pattern = ^stats.*
retentions = 10s:6h,1min:6d,10min:1800d
```

## Prometheus via statsd_exporter

The `statsd_exporter` translates StatsD push metrics into Prometheus
pull metrics. It is a drop-in replacement for a StatsD server.

### Deployment Pattern

**Recommended:** Run as a sidecar alongside the application pod.

```
+-------------+    +----------+    +------------+
| Application +--->| Exporter |<---+ Prometheus |
+-------------+    +----------+    +------------+
```

**Transitional:** Run alongside existing StatsD with relay mode.

```
+-------------+    +----------+    +--------+
| Application +--->| Exporter +--->| StatsD |
+-------------+    +----------+    +--------+
                        ^
                   +----+-------+
                   | Prometheus |
                   +------------+
```

### Metric Type Mapping

| StatsD Type | Prometheus Type |
|-------------|----------------|
| Counter (`c`) | Counter |
| Gauge (`g`) | Gauge |
| Timer (`ms`) | Summary or Histogram |
| Histogram (`h`) | Summary or Histogram |
| Distribution (`d`) | Summary or Histogram |

**Timer conversion:** StatsD timers report in milliseconds; Prometheus
expects seconds. The exporter converts automatically.

### Mapping Rules

Configure metric name translation via YAML:

```yaml
mappings:
- match: "myapp.api.*.request.duration"
  name: "http_request_duration_seconds"
  labels:
    endpoint: "$1"
  observer_type: histogram
  histogram_options:
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

- match: "myapp.api.*.request.count"
  name: "http_requests_total"
  labels:
    endpoint: "$1"
```

**Glob matching:** `*` matches one dot-separated segment. Use for
extracting labels from metric names.

**Regex matching:** Available for complex patterns but significantly
slower. Glob rules are evaluated first regardless of order.

### Tag Format Support

The exporter parses multiple tag formats:

| Format | Style | Example |
|--------|-------|---------|
| DogStatsD | `\|#key:val` | `metric:1\|c\|#env:prod` |
| InfluxDB | `,key=val` | `metric,env=prod:1\|c` |
| Librato | `#key=val` | `metric#env=prod:1\|c` |
| SignalFX | `[key=val]` | `metric[env=prod]:1\|c` |

Do not mix tag formats on the same metric.

### Unmapped Metrics

Metrics that don't match any mapping rule:
- Non-alphanumeric characters (including dots) become underscores
- No labels are added
- Type is inferred from StatsD type

To drop unmapped metrics:
```yaml
mappings:
- match: "."
  match_type: regex
  action: drop
  name: "dropped"
```

## Telegraf StatsD Input

Telegraf can act as a StatsD server, receiving metrics and forwarding
them to any Telegraf output (InfluxDB, Prometheus, Datadog, etc.).

### Key Configuration

```toml
[[inputs.statsd]]
  protocol = "udp"
  service_address = ":8125"
  percentiles = [50.0, 90.0, 99.0, 99.9, 100.0]
  metric_separator = "_"

  # Enable DogStatsD extensions (tags, events, service checks)
  datadog_extensions = false

  # Enable DogStatsD distribution metrics
  datadog_distributions = false
```

### Metric Output

Telegraf transforms StatsD metrics into its own data model:

- **Counters** — fields: `value`
- **Gauges** — fields: `value`
- **Sets** — fields: `value` (count of uniques)
- **Timers/Histograms** — fields: `lower`, `upper`, `mean`, `median`,
  `stddev`, `sum`, `count`, `percentile_<P>`

All metrics get the tag `metric_type=<gauge|counter|set|timing|histogram>`.

### Template Patterns

Telegraf can transform StatsD bucket names into tagged metrics:

```toml
templates = [
    "cpu.* measurement.measurement.region",
    "mem.* measurement.measurement.host",
]
```

Transforms:
```
cpu.load.us-west:100|g  =>  cpu_load,region=us-west value=100
mem.cached.host01:256|g =>  mem_cached,host=host01 value=256
```

### DogStatsD Compatibility

Enable `datadog_extensions = true` to parse:
- DogStatsD tags (`|#key:val`)
- Events (`_e{...}`)
- Service checks (`_sc|...`)
- Distribution metrics (with `datadog_distributions = true`)

## Backend Selection Guide

| Need | Backend |
|------|---------|
| Simple, self-hosted graphing | Graphite |
| Cloud monitoring + APM | Datadog (DogStatsD) |
| Prometheus ecosystem integration | statsd_exporter |
| Flexible multi-output pipeline | Telegraf |
| InfluxDB time-series storage | Telegraf -> InfluxDB |
| Migrating from StatsD to Prometheus | statsd_exporter with relay |

## Migration Considerations

### StatsD -> Prometheus

1. Deploy statsd_exporter as sidecar
2. Configure mapping rules for clean Prometheus metric names
3. Use relay mode to keep existing StatsD backend during transition
4. Gradually switch dashboards and alerts to Prometheus queries
5. Remove relay once transition is complete

### Plain StatsD -> DogStatsD

1. Replace StatsD server with Datadog Agent
2. Add tags to metric calls (instead of encoding dimensions in names)
3. Switch from `|ms` timers to `|h` histograms or `|d` distributions
4. Set up unified service tagging (env, service, version)
5. Update dashboards to use tag-based queries
