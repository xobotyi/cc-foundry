# LogsQL Stats

Stats pipe shape, grouping patterns, all stats functions, `running_stats`/`total_stats`, and `math` operations.

## Contents

- [Stats Pipe Shape](#stats-pipe-shape)
- [Grouping](#grouping)
- [Per-Aggregate Filters](#per-aggregate-filters)
- [Stats Functions](#stats-functions)
- [Running Stats](#running-stats)
- [Total Stats](#total-stats)
- [Math Pipe](#math-pipe)
- [Combining Patterns](#combining-patterns)

---

## Stats Pipe Shape

```
| stats <func1>(...) as <name1>, <func2>(...) as <name2>, ...
```

- `stats` keyword usually optional: `| count() as total` works.
- `as` optional: `| count() total` works.
- Without `as`, result named after function call: `count()`, `count_uniq(_stream)`.

Minimal:

```
_time:5m | stats count() as logs_total
```

Multi-function:

```
_time:5m | stats
    count() as total,
    count_uniq(_stream) as streams,
    quantile(0.95, duration_ms) as p95
```

---

## Grouping

### By Fields

```
| stats by (field1, field2, ...) <func>(...) as <name>
| stats (field1, field2) <func>(...) as <name>     # 'by' optional
```

Independent aggregation per unique field combination.

```
_time:5m | stats by (host, path) count() as logs, count_uniq(client_ip) as ips
```

### By Time Buckets

```
| stats by (_time:1m) <func>(...) as <name>
| stats by (_time:5m, host) count() as per_5m_per_host
```

`_time:<step>` buckets timestamps into windows. Step = any duration.

Named steps for variable-length buckets:

- `_time:nanosecond`, `_time:microsecond`, `_time:millisecond`.
- `_time:second`, `_time:minute`, `_time:hour`.
- `_time:day`, `_time:week`.
- `_time:month`, `_time:year` (variable lengths).

### Time Buckets with Timezone

```
| stats by (_time:1d offset 'America/New_York') count() as per_day_ny
| stats by (_time:1w offset 'Europe/London') count() as per_week_uk
```

Aligned to named timezone, not UTC. For daily/weekly stats matching business hours.

### By Field Buckets

```
| stats by (duration_ms:100) count() as histogram
| stats by (response_bytes:1Ki) count() as size_histogram
```

Buckets numeric field into ranges. `duration_ms:100` → `[0,100)`, `[100,200)`, etc. Row contains bucket lower bound.

Fast distribution overview when full `histogram(...)` is overkill.

### By IPv4 Buckets

```
| stats by (client_ip:/24) count() as per_subnet
| stats by (client_ip:/16) count() as per_class_b
```

Buckets IPv4s by CIDR prefix. Result = network address.

---

## Per-Aggregate Filters

```
| stats
    count() as total,
    count() if (level:error) as errors,
    count() if (level:warn) as warnings,
    avg(duration_ms) if (status:>=500) as avg_5xx_duration
```

`if (...)` filters rows per-aggregate. Same filter syntax as main query.

One pass for all aggregates beats one pass per query — major perf win.

---

## Stats Functions

### Counting

- **`count()`** — total rows in group.
- **`count(field)`** — rows where `field` is non-empty.
- **`count(field1, field2, ...)`** — rows where any listed field is non-empty.
- **`count_empty(field)`** — rows where field is empty/missing.
- **`count_uniq(field1, ...)`** — distinct combinations. **Memory scales linearly with cardinality.**
- **`count_uniq_hash(field1, ...)`** — approximate via hashing. ~constant memory, ±1%.

Prefer `count_uniq_hash` for high-cardinality fields.

### Arithmetic

- **`sum(field)`** — sum.
- **`avg(field)`** — arithmetic mean.
- **`min(field)`**, **`max(field)`** — extrema.
- **`stddev(field)`** — standard deviation.
- **`sum_len(field)`** — sum of string byte lengths.

### Median and Quantile

- **`median(field)`** — 50th percentile.
- **`quantile(phi, field)`** — phi in `[0..1]`.

```
| stats by (host) quantile(0.5, duration_ms) p50, quantile(0.95, duration_ms) p95, quantile(0.99, duration_ms) p99
```

### Value Lists

- **`uniq_values(field)`** — distinct values as JSON array. Memory-bounded; large groups may truncate.
- **`values(field)`** — all values including duplicates.

Use `uniq_values(_stream)` to enumerate contributing streams.

### Field-of-Row Selection

- **`field_min(target, sort)`** — `target` value at smallest `sort`.
- **`field_max(target, sort)`** — `target` value at largest `sort`.

Slowest request_id per endpoint:

```
| stats by (path) field_max(request_id, duration_ms) as slowest_req_id, max(duration_ms) as slowest_duration
```

### Whole-Row Selection

- **`row_min(sort_field)`** — entire row at min sort_field.
- **`row_max(sort_field)`** — entire row at max sort_field.
- **`row_any()`** — arbitrary row per group.

For when you want every field of the extremal row.

### Histogram

```
| stats by (host) histogram(duration_ms) as duration_dist
```

JSON object: `{"<bucket_lower>": <count>, ...}`. Auto-determines bucket boundaries.

### JSON Values

- **`json_values(field)`** — values as JSON array, preserves structure.

### Rate

- **`rate()`** — per-second rate of matching rows in group.
- **`rate_sum(field)`** — per-second rate of summed values.

Compute rates over query time range — for non-time-bucketed "events per second" totals.

---

## Running Stats

```
_time:5m
  | stats by (_time:1m) count() as hits
  | running_stats sum(hits) as cumulative_hits
```

Accumulates over previously-bucketed data. Functions: `count`, `sum`, `min`, `max`, `last`.

For cumulative growth curves, running max, "errors so far today."

---

## Total Stats

```
_time:5m
  | stats by (_time:1m) count() as hits
  | total_stats sum(hits) as total_hits
  | math (hits / total_hits) * 100 as percent
```

Global aggregate broadcast to every row. Functions: `count`, `sum`, `min`, `max`, `first`, `last`.

For percentage-of-total, normalizing per-bucket values.

---

## Math Pipe

`math` (alias: `eval`) — row-wise numeric calculations:

```
| math <expr1> as <name1>, <expr2> as <name2>, ...
```

### Operators

- **Arithmetic:** `+`, `-`, `*`, `/`, `%`, `^`.
- **Bitwise:** `&` (and), `or` (or), `xor` — args in `[0..2^53-1]`.
- **NaN fallback:** `expr1 default expr2` — `expr2` if `expr1` is NaN or non-numeric.

### Functions

- `abs(x)`, `ceil(x)`, `floor(x)`.
- `round(x, nearest?)` — `round(x, 0.1)` to one decimal.
- `exp(x)`, `ln(x)`.
- `max(x1, ..., xN)`, `min(x1, ..., xN)`.
- `now()` — current Unix timestamp in ns.
- `rand()` — `[0..1)`.

### Operands

- Field names — parsed as numbers, RFC3339 (→ ns), IPv4 (→ uint32).
- Numeric literals with suffix: `1Mi`, `1.5K`, `1ns`, `1m`.
- Quoted RFC3339 or IPv4: `"2024-05-15T10:20:30Z"`, `"12.34.56.78"`.
- Parenthesized subexpressions.

### Sequential References

Later expressions reference earlier results in the same pipe:

```
| math
    x = duration_ms / 1000,
    y = round(x, 0.1) as duration_sec,
    z = y * 1000 as duration_ms_rounded
```

Order matters within one `math` pipe.

---

## Combining Patterns

### Top-K by Composite Metric

```
{app="api"} _time:1h
  | unpack_json from _msg
  | stats by (endpoint)
      count() as hits,
      quantile(0.95, duration_ms) as p95,
      count() if (status:>=500) as errors
  | math (errors / hits) * 100 as error_pct
  | sort by (p95 desc)
  | limit 10
```

### Percentage Across Time

```
{app="api"} _time:1h
  | stats by (_time:1m) count() as hits
  | total_stats sum(hits) as total
  | math hits / total * 100 as pct_of_hour
```

### Distinct Counts with Memory Safety

```
_time:1d
  | stats
      count_uniq(client_ip) as ips_exact,
      count_uniq_hash(client_ip) as ips_approx
```

`_hash` variant is constant memory; exact may OOM on high cardinality. Compare on small ranges before relying on
`_hash`.

### Multi-Aggregate in One Pass

```
_time:5m
  | stats
      count() as total,
      count() if (level:error) as errors,
      count() if (level:warn) as warns,
      count() if (level:info) as infos,
      avg(duration_ms) as avg_dur,
      avg(duration_ms) if (level:error) as avg_dur_err
```

One pass, six aggregates. `if (...)` filters have near-zero cost beyond the base scan.

### Per-Stream Quantiles

```
_time:1h
  | unpack_json from _msg fields (duration_ms)
  | stats by (_stream)
      quantile(0.5, duration_ms) p50,
      quantile(0.95, duration_ms) p95,
      quantile(0.99, duration_ms) p99,
      count() as samples
  | filter samples:>=100      # filter out low-sample groups
  | sort by (p99 desc)
```

Filter low-sample groups before ranking quantiles — 5 samples gives misleading p99.
