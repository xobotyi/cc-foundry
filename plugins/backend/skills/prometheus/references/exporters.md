# Exporters

Exporters bridge third-party systems into the Prometheus ecosystem. When
instrumenting your own code, use a client library directly instead.

## When to Write an Exporter

- The system you need to monitor does not expose Prometheus metrics natively
- You need to transform metrics from another monitoring system into Prometheus format
- The system is a black box (hardware, closed-source software)

## Architecture

### One Exporter Per Instance

Each exporter monitors exactly one application instance, deployed beside it on
the same machine. Service discovery happens in Prometheus, not in exporters.

**Exceptions:**
1. **Black-box monitoring** (SNMP, IPMI) — can't run on the target device.
   Prometheus passes the target via URL parameter.
2. **Random instance queries** — pulling aggregate stats from a load-balanced
   pool where you don't care which instance answers.

### Pull, Don't Push

Metrics are collected synchronously on scrape. Do not run scrapes on internal
timers. Let Prometheus control the timing.

- Do not set timestamps on exposed metrics
- If collection takes > 10s (default scrape timeout), document this
- If collection is expensive (> 1 minute), cache results and note this in `HELP`

## Naming Metrics

Follow all [naming conventions](naming.md) plus:

1. **Prefix with exporter name** — `haproxy_up`, `mysql_global_status_threads_connected`
2. **Use base units** — seconds, bytes. Let grafana convert.
3. **Don't include label names in metric names** — `http_requests_total{method="GET"}`
   not `http_get_requests_total`
4. **Colons reserved for recording rules** — never in exporter metrics
5. **`_total` for counters** — always
6. **Don't use `_sum`, `_count`, `_bucket` suffixes** unless producing a
   histogram or summary

## Labels

1. **Avoid `type` as a label** — too generic. Use specific names.
2. **Avoid target-like labels** — `region`, `cluster`, `env` belong in Prometheus
   scrape configuration, not in the exporter.
3. **Don't include a "total" label value** — rely on Prometheus `sum()`.
4. **Separate read/write** into different metrics — users typically care about
   one at a time.
5. **Minimal labels** — every label is a dimension users must handle in PromQL.

## Metric Types

Match source metric behavior to Prometheus types:

- Source value only goes up → **Counter**
- Source value goes up and down → **Gauge**
- Source provides distribution data → **Histogram** or **Summary**
- Unknown or ambiguous → **Untyped** (safe default)

If a source counter can be decremented (e.g., Dropwizard metrics), it's actually
a gauge. Use `UNTYPED` rather than misleading with `GAUGE`.

## Collectors

### Create New Metrics per Scrape

Do NOT use global metric variables that you update on each scrape. This causes
race conditions between concurrent scrapes and stale label values.

Instead, create fresh metric instances each scrape:
- **Go:** `MustNewConstMetric` in `Collect()` method
- **Python:** Custom collector returning new metrics
- **Java:** Return `List<MetricFamilySamples>` in `collect()`

### Scrape Meta-Metrics

```
myexporter_scrape_duration_seconds   (gauge — per-scrape duration)
myexporter_scrape_errors_total       (counter — collection failures)
```

Scrape duration is a gauge (single event measurement), not a histogram.

### Up Metric

Expose `myexporter_up` (0 or 1) to indicate whether the target is reachable.
This is preferred over returning 5xx when the target is down, because it allows
partial metric export even when the target is unhealthy.

## Help Strings

Include the original metric name, collector/exporter name, and any transformation
rules in the `HELP` string. This helps users trace metrics back to their source.

```
# HELP haproxy_server_bytes_in_total Total bytes received from server.
# Derived from HAProxy stat: bin
```

## Drop Unnecessary Stats

Source systems often expose pre-computed rates (1m, 5m, 15m averages), min/max
since start, and standard deviations. Drop all of these:

- Prometheus computes rates more accurately via `rate()`
- Min/max have unknown time windows
- Standard deviation is statistically useless without context

Export raw counters and current values. Let Prometheus do the math.

## Push-Based Sources

For systems that push metrics (StatsD, Graphite, collectd):

1. **Expiry:** Set a TTL for pushed metrics. Collectd includes expiry time;
   Graphite needs a flag.
2. **Counters:** Prefer raw counters over deltas — matches the Prometheus model.
3. **Batch jobs:** Push to Pushgateway and exit. Don't manage state in the exporter.
