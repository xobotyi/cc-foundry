# DogStatsD Extensions

DogStatsD is Datadog's extension of the StatsD protocol. It adds tags,
histograms, distributions, service checks, and events. Any compliant
StatsD client works with DogStatsD for basic metrics, but the extensions
require Datadog client libraries.

## Protocol Format

```
<METRIC_NAME>:<VALUE>|<TYPE>|@<SAMPLE_RATE>|#<TAG_KEY>:<TAG_VALUE>,<TAG2>
```

| Field | Required | Description |
|-------|----------|-------------|
| `<METRIC_NAME>` | Yes | ASCII alphanumerics, underscores, periods |
| `<VALUE>` | Yes | Integer or float |
| `<TYPE>` | Yes | `c`, `g`, `ms`, `h`, `s`, `d` |
| `@<SAMPLE_RATE>` | No | Float 0-1. Works with `c`, `h`, `d`, `ms` |
| `#<TAGS>` | No | Comma-separated `key:value` pairs |

## Tags

Tags are the primary advantage of DogStatsD over plain StatsD.
They allow multi-dimensional queries without encoding dimensions
in the metric name.

### Format

```
metric.name:1|c|#key1:value1,key2:value2,bare_tag
```

- Key-value tags: `env:production`, `method:GET`
- Bare tags (no value): `deprecated`, `canary`
- Comma-separated, no spaces

### Unified Service Tagging

Datadog recommends three global tags on every metric:

| Tag | Purpose | Example |
|-----|---------|---------|
| `env` | Deployment environment | `env:production` |
| `service` | Service name | `service:payment-api` |
| `version` | Deployed version | `version:2.1.0` |

Set these as `constant_tags` / `global_tags` on the client instance
so they attach to every metric automatically.

### Tag Best Practices

1. **Use tags for queryable dimensions.** If you will filter or group
   by a value in dashboards, it should be a tag.
2. **Keep cardinality bounded.** Each unique tag combination creates
   a separate time series. Unbounded tags (user IDs, request IDs)
   explode custom metric counts and backend costs.
3. **Prefer lowercase.** Tags are case-sensitive in Datadog.
   `Method:GET` and `method:GET` are different tags.
4. **No spaces in tag values.** Use underscores: `region:us_east`.

## Histograms (`|h`)

DogStatsD histograms compute aggregates locally in the Agent, then
flush summary statistics to Datadog.

**Produced metrics per histogram:**

| Metric | Type | Description |
|--------|------|-------------|
| `.count` | RATE | Number of values received |
| `.avg` | GAUGE | Mean value |
| `.median` | GAUGE | 50th percentile |
| `.max` | GAUGE | Maximum value |
| `.95percentile` | GAUGE | 95th percentile (configurable) |

Configure aggregates in `datadog.yaml`:
- `histogram_aggregates`: `max`, `median`, `avg`, `count` (default)
- `histogram_percentiles`: `0.95` (default)

## Distributions (`|d`)

Distributions send raw values to Datadog for server-side aggregation.
This provides globally accurate percentiles across all hosts.

```
request.duration:42|d|#service:api,env:prod
```

**Produced metrics:** `sum`, `count`, `avg`, `min`, `max`, `p50`,
`p75`, `p90`, `p95`, `p99`.

### When to Use Distribution vs. Histogram

| Aspect | Histogram (`h`) | Distribution (`d`) |
|--------|-----------------|-------------------|
| Aggregation | Local (per Agent) | Global (Datadog server) |
| Percentiles | Per-host only | Fleet-wide accurate |
| Network cost | Lower (sends summaries) | Higher (sends raw values) |
| Custom metric cost | 5 metrics per name+tags | 5 metrics per name+tags |
| Configuration | Agent-side percentiles | Server-side percentiles |

**Use Distribution when:**
- You need accurate p99 across 100+ hosts
- Per-host percentiles would be misleading (e.g., load-balanced traffic)
- You want to configure percentile thresholds without Agent restart

**Use Histogram when:**
- Per-host aggregation is sufficient
- You want lower network overhead
- You need compatibility with plain StatsD backends

## Events

DogStatsD can send events (not just metrics) to the Datadog event stream.

**Format:**
```
_e{<TITLE_LENGTH>,<TEXT_LENGTH>}:<TITLE>|<TEXT>|d:<TIMESTAMP>|h:<HOSTNAME>|p:<PRIORITY>|t:<ALERT_TYPE>|#<TAGS>
```

**Parameters:**

| Field | Required | Values |
|-------|----------|--------|
| `<TITLE>` | Yes | Event title |
| `<TEXT>` | Yes | Event body (use `\\n` for newlines) |
| `d:<TIMESTAMP>` | No | Unix epoch (default: now) |
| `h:<HOSTNAME>` | No | Hostname override |
| `p:<PRIORITY>` | No | `normal` or `low` (default: `normal`) |
| `t:<ALERT_TYPE>` | No | `error`, `warning`, `info`, `success` |

**Example:**
```
_e{14,21}:Deploy started|v2.1.0 to prod env|t:info|#service:api,env:prod
```

**When to use events:**
- Deployment markers
- Configuration changes
- Significant application events (not per-request)
- Events you want to overlay on dashboards

## Service Checks

Report health status of a service or dependency.

**Format:**
```
_sc|<NAME>|<STATUS>|d:<TIMESTAMP>|h:<HOSTNAME>|#<TAGS>|m:<MESSAGE>
```

**Status codes:**

| Code | Meaning |
|------|---------|
| 0 | OK |
| 1 | WARNING |
| 2 | CRITICAL |
| 3 | UNKNOWN |

**Example:**
```
_sc|redis.connection|0|#env:prod|m:Connection healthy
_sc|redis.connection|2|#env:prod|m:Connection timed out after 10s
```

**When to use service checks:**
- Database connectivity status
- External API reachability
- Health check results
- Circuit breaker state

## DogStatsD Protocol Versions

| Version | Agent Version | Feature |
|---------|---------------|---------|
| v1.0 | All | Base protocol with tags |
| v1.1 | 6.25+ / 7.25+ | Value packing (`val1:val2:val3`) |
| v1.2 | 6.35+ / 7.35+ | Container ID field (`c:`) |
| v1.3 | 6.40+ / 7.40+ | Timestamp field (`T<unix>`) |

**Value packing (v1.1):** Send multiple values for the same metric
in a single datagram, reducing packet count:
```
request.duration:42:38:55:41|d|#service:api
```

**Timestamps (v1.3):** Pre-aggregated metrics can include a Unix
timestamp to skip Agent-side aggregation:
```
page.views:150|c|#env:prod|T1656581400
```
