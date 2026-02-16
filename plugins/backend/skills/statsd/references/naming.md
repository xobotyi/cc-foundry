# Naming Conventions

Metric names are the primary axis of organization in StatsD. In Graphite,
dots become folder separators. In Datadog, dots become hierarchical
groupings. Poor naming makes metrics undiscoverable and dashboards
unmaintainable.

## Hierarchy Structure

```
<namespace>.<subsystem>.<target>.<metric>.<unit>
```

**Examples:**
```
myapp.api.request.duration.ms
myapp.api.request.count.total
myapp.db.query.duration.ms
myapp.cache.hit.count.total
myapp.queue.depth.items
myapp.worker.job.processed.total
```

### Namespace

Top-level identifier, typically the service or application name.
Prevents metric collisions across services sharing a StatsD server.

```
payment-service.checkout.amount.usd     # good: namespaced
checkout.amount.usd                      # bad: collides with other services
```

### Subsystem

Functional area within the service: `api`, `db`, `cache`, `queue`,
`worker`, `auth`, `email`.

### Target

The specific thing being measured: `request`, `query`, `hit`, `miss`,
`job`, `connection`.

### Metric + Unit

What is being measured and its unit: `duration.ms`, `count.total`,
`size.bytes`, `depth.items`, `rate.per_second`.

## Character Rules

| Allowed | Not Allowed |
|---------|-------------|
| Lowercase `a-z` | Uppercase (varies by backend) |
| Digits `0-9` | Spaces |
| Dots `.` (hierarchy separator) | Dashes `-` (break Graphite navigation) |
| Underscores `_` (word separator) | Special characters `@#$%&` |

**Consistent case:** Use lowercase everywhere. Some backends are
case-sensitive; mixing cases creates distinct metric paths.

**Word separation:** Use underscores within path segments:
`http_request` not `httpRequest` or `http-request`.

## Graphite Namespace Mapping

StatsD automatically namespaces metrics under `stats.<type>`:

| Metric Type | Graphite Path (legacy) | Graphite Path (modern) |
|-------------|----------------------|----------------------|
| Counter rate | `stats.<name>` | `stats.counters.<name>.rate` |
| Counter count | `stats_counts.<name>` | `stats.counters.<name>.count` |
| Timer | `stats.timers.<name>.*` | `stats.timers.<name>.*` |
| Gauge | `stats.gauges.<name>` | `stats.gauges.<name>` |
| Set | `stats.sets.<name>.count` | `stats.sets.<name>.count` |

The modern namespace (enabled with `legacyNamespace: false`) is cleaner
and groups counters under `stats.counters.*` instead of splitting them.

## Tags vs. Metric Name Encoding

### With Tags (DogStatsD, InfluxDB, Telegraf)

Use tags for dimensions. Keep metric names stable:

```
http.request.duration:42|ms|#method:GET,status:200,endpoint:/api/users
http.request.duration:15|ms|#method:POST,status:201,endpoint:/api/users
```

**One metric name, many tag combinations.** Dashboards can filter and
group by any tag dimension.

### Without Tags (Plain StatsD + Graphite)

Encode dimensions in the metric name:

```
http.request.get.200.api_users.duration:42|ms
http.request.post.201.api_users.duration:15|ms
```

**Problem:** Every new dimension creates new metric paths. This
explodes Graphite file count and makes dashboards rigid.

**Recommendation:** Use DogStatsD tags or Telegraf InfluxDB-style
tags when possible. Fall back to name encoding only for plain
StatsD + Graphite setups.

## Tag Cardinality

Tags with unbounded values create unbounded metric series, which
consumes backend resources (disk, memory, query time, billing).

| Tag | Cardinality | Acceptable? |
|-----|-------------|-------------|
| `env:production` | ~3-5 | Yes |
| `method:GET` | ~7 | Yes |
| `status_code:200` | ~20-50 | Yes |
| `endpoint:/api/users` | ~50-200 | Caution |
| `user_id:12345` | Unbounded | No |
| `request_id:abc-123` | Unbounded | No |
| `timestamp:1234567890` | Unbounded | No |

**Rule of thumb:** If a tag can have more than ~1000 distinct values,
do not use it. Use logs or traces for high-cardinality data.

## Naming Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `MyApp.HTTP.Requests` | Uppercase, inconsistent | `myapp.http.requests` |
| `my-app.http-requests` | Dashes break Graphite | `my_app.http_requests` |
| `requests` | No namespace, will collide | `myapp.api.requests` |
| `myapp.requests.get.200` | Dimension in name | Tags: `#method:GET,status:200` |
| `myapp.latency` | No unit | `myapp.request.duration.ms` |
| `myapp.data` | Too vague | `myapp.cache.hit.count.total` |
| `myapp.requestDurationMilliseconds` | camelCase, verbose | `myapp.request.duration.ms` |

## Checklist for New Metrics

- [ ] Namespaced by service name
- [ ] Dot-delimited hierarchy with subsystem
- [ ] Lowercase with underscores for word separation
- [ ] Unit suffix included (`.ms`, `.bytes`, `.total`, `.items`)
- [ ] Dimensions expressed as tags, not metric name segments
- [ ] Tag cardinality is bounded (< 1000 distinct values per tag)
- [ ] Name is discoverable: someone searching for "request latency"
      would find `myapp.api.request.duration.ms`
