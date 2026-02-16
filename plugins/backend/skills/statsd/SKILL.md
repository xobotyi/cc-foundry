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

**Measure everything. StatsD is fire-and-forget: UDP means zero latency impact
on your application, but wrong metric types or bad naming corrupt your data
silently.**

StatsD is a push-based metric collection protocol. Clients send UDP datagrams
to a local aggregation daemon, which flushes aggregated values to a backend
(Graphite, Datadog, Prometheus exporter, Telegraf) on a fixed interval
(default: 10 seconds).

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Choosing between counter, gauge, timer, histogram, set, distribution | [metric-types.md](references/metric-types.md) |
| Naming metrics, hierarchy, tagging conventions | [naming.md](references/naming.md) |
| DogStatsD extensions: tags, events, service checks, distributions | [dogstatsd.md](references/dogstatsd.md) |
| Flush intervals, aggregation rules, downsampling | [aggregation.md](references/aggregation.md) |
| Client library setup, buffering, sampling, high-throughput tuning | [client-patterns.md](references/client-patterns.md) |
| Prometheus statsd_exporter, Telegraf StatsD input, backend mapping | [backends.md](references/backends.md) |

Read the relevant reference before writing or reviewing instrumentation code.

## Core Rules

These apply to ALL StatsD instrumentation. No exceptions.

### Choose the Right Metric Type

1. **Counting occurrences?** Use a **counter** (`|c`). Counters reset each
   flush. The server computes rate and count.
2. **Tracking a current value?** Use a **gauge** (`|g`). Gauges retain their
   last value between flushes.
3. **Measuring duration or size?** Use a **timer** (`|ms`) or **histogram**
   (`|h`). The server computes min, max, mean, percentiles, count.
4. **Counting unique values?** Use a **set** (`|s`). The server counts
   distinct values per flush interval.
5. **Need server-side percentiles across hosts?** Use a **distribution**
   (`|d`) (DogStatsD only). Raw values aggregate globally, not per-host.

Wrong metric type = wrong math at the server. A gauge used as a counter
loses data between flushes. A counter used as a gauge produces meaningless
rates.

### Name Metrics Consistently

1. **Dot-delimited hierarchy:** `<namespace>.<subsystem>.<metric>.<unit>`
2. **Lowercase, alphanumeric + dots + underscores only.** No spaces, no
   dashes in metric names (dashes break Graphite tree navigation).
3. **Include the unit:** `request.duration.ms`, `queue.size.bytes`,
   `cache.hit.total`.
4. **Namespace by service:** `myapp.api.request.duration.ms` not just
   `request.duration.ms`.

### Use Sampling Correctly

1. **Sample only high-volume counters and timers.** Gauges and sets must
   not be sampled — the server cannot correct for sampling on these types.
2. **Always pass the sample rate to the client.** The server multiplies
   counter values by `1/rate` to estimate the true count. Omitting the
   rate means the server underreports.
3. **Start at `1.0` (no sampling).** Only reduce when you have evidence
   of UDP packet drops or excessive agent CPU.

### Tags (DogStatsD)

1. **Use tags for dimensions, not metric names.** `http.request.count` with
   tag `method:GET` — not `http.request.get.count`.
2. **Keep tag cardinality bounded.** Tags like `user_id` or `request_id`
   create unbounded series. Use `endpoint`, `status_code`, `region` instead.
3. **Use Datadog's unified service tagging:** `env`, `service`, `version`
   as global tags on the client.

## Quick Anti-Pattern Reference

| Don't | Do | Why |
|-------|----|-----|
| `gauge("requests", count)` | `counter("requests", 1)` | Gauge overwrites; counter accumulates |
| `counter("cpu.percent", 75)` | `gauge("cpu.percent", 75)` | CPU usage is a point-in-time value |
| `timer("cache.hit", 1)` | `counter("cache.hit", 1)` | Hit/miss is an event count, not a duration |
| `http.request.get.200.count:1\|c` | `http.request.count:1\|c\|#method:GET,status:200` | Tags keep metric names stable |
| `counter("req", 1)` with `@0.1` but no client rate | `counter("req", 1, rate=0.1)` | Server needs rate to correct the count |
| `set("page.views", page_url)` sampled at 0.5 | `set("page.views", page_url)` at rate 1.0 | Sampling breaks set uniqueness |
| `myMetric-Name:1\|c` | `my_metric_name:1\|c` | Dashes break Graphite; uppercase varies by backend |
| One metric per UDP packet in hot loop | Enable client-side buffering | Reduces syscalls and packet overhead |
| `gauge("queue.depth", len(q))` every 10ms | `gauge("queue.depth", len(q))` every 1-10s | Gauge keeps last value; high frequency wastes bandwidth |

## Application

When **writing** StatsD instrumentation:
- Choose the metric type based on what the value represents, not convenience.
- Apply naming conventions silently — don't narrate each rule.
- If an existing codebase contradicts a convention, follow the codebase
  pattern and flag the divergence once.
- Always configure client-side buffering for production use.

When **reviewing** StatsD instrumentation:
- Check metric type correctness first — this is the most common and
  most damaging mistake.
- Verify tag cardinality is bounded.
- Cite the specific issue and show the fix inline.

```
Bad review comment:
  "According to StatsD best practices, you should use a counter
   instead of a gauge for this metric because..."

Good review comment:
  "`gauge` -> `counter` -- `request_count` is an event count,
   not a point-in-time value. Gauge loses data between flushes."
```

## Integration

This skill provides StatsD-specific conventions alongside the **coding**
skill and platform skills:

1. **Coding** — Discovery, planning, verification discipline
2. **StatsD** — Metric type selection, naming, client patterns
3. **Observability** — Broader observability strategy (if active)

The coding skill governs workflow; this skill governs StatsD
instrumentation choices.
